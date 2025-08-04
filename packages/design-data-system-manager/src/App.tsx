import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Spinner,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useColorMode
} from '@chakra-ui/react';
import type { 
  TokenCollection, 
  Mode, 
  Dimension, 
  Platform, 
  Taxonomy, 
  Theme, 
  ResolvedValueType,
  ComponentProperty,
  ComponentCategory,
  Component
} from '@token-model/data-model';
import { StorageService } from './services/storage';
import { Algorithm } from './types/algorithm';
import './App.css';
import { AppLayout, DATA_CHANGE_EVENT } from './components/AppLayout';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSchema } from './hooks/useSchema';
import { GitHubCallback } from './components/GitHubCallback';
import { Homepage } from './views/Homepage';
import { GitHubAuthService } from './services/githubAuth';
import { GitHubApiService } from './services/githubApi';
import type { GitHubUser } from './config/github';
import type { ExtendedToken } from './components/TokenEditorDialog';
import { ChangeLog } from './components/ChangeLog';
import { useViewState } from './hooks/useViewState';
import { ViewRenderer } from './components/ViewRenderer';
import { ChangeTrackingService } from './services/changeTrackingService';
import { DataManager, type DataSnapshot, type URLConfig } from './services/dataManager';
import { MultiRepositoryManager } from './services/multiRepositoryManager';
import { DataSourceManager, type DataSourceContext } from './services/dataSourceManager';
import { GitHubCacheService } from './services/githubCache';
import { PermissionManager } from './services/permissionManager';
import { exampleData, algorithmData, mergeData } from '@token-model/data-model';
import { isMainBranch } from './utils/BranchValidationUtils';

const App = () => {
  console.log('🔍 [App] App component rendering');
  
  const { colorMode } = useColorMode();
  const { schema } = useSchema();
  const [dataSource, setDataSource] = useState<string>('minimal');
  
  console.log('🔍 [App] Current color mode:', colorMode);
  
  const [collections, setCollections] = useState<TokenCollection[]>([]);
  const [modes, setModes] = useState<Mode[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [resolvedValueTypes, setResolvedValueTypes] = useState<ResolvedValueType[]>([]);
  const [tokens, setTokens] = useState<ExtendedToken[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [componentProperties, setComponentProperties] = useState<ComponentProperty[]>([]);
  const [componentCategories, setComponentCategories] = useState<ComponentCategory[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [algorithms, setAlgorithms] = useState<Algorithm[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataOptions, setDataOptions] = useState<{ label: string; value: string; hasAlgorithms: boolean }[]>([]);
  const [taxonomyOrder, setTaxonomyOrder] = useState<string[]>([]);
  const [dimensionOrder, setDimensionOrder] = useState<string[]>(() => {
    const storedOrder = StorageService.getDimensionOrder();
    if (storedOrder && Array.isArray(storedOrder) && storedOrder.length > 0) {
      return storedOrder;
    }
    return dimensions.map(d => d.id);
  });
  const [selectedToken, setSelectedToken] = useState<ExtendedToken | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isGitHubConnected, setIsGitHubConnected] = useState(false);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [selectedRepoInfo, setSelectedRepoInfo] = useState<{
    fullName: string;
    branch: string;
    filePath: string;
    fileType: 'schema' | 'theme-override' | 'platform-extension';
  } | null>(null);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
  const [hasEditPermissions, setHasEditPermissions] = useState(false);
  const [dataSourceContext, setDataSourceContext] = useState<DataSourceContext | undefined>(undefined);
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  // Branch-based governance state
  const [isEditMode, setIsEditMode] = useState(() => {
    // Try to restore edit mode state from localStorage
    const saved = localStorage.getItem('token-model-edit-mode');
    if (saved) {
      try {
        const { isEditMode: savedEditMode, branch: savedBranch } = JSON.parse(saved);
        return savedEditMode && savedBranch === currentBranch;
      } catch (error) {
        console.warn('Failed to parse saved edit mode state:', error);
      }
    }
    return false;
  });
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [editModeBranch, setEditModeBranch] = useState<string | null>(() => {
    // Try to restore edit mode branch from localStorage
    const saved = localStorage.getItem('token-model-edit-mode');
    if (saved) {
      try {
        const { branch: savedBranch } = JSON.parse(saved);
        return savedBranch === currentBranch ? savedBranch : null;
      } catch (error) {
        console.warn('Failed to parse saved edit mode branch:', error);
      }
    }
    return null;
  });
  const toast = useToast();

  const [changeLogData, setChangeLogData] = useState<{ currentData: Record<string, unknown>; baselineData: Record<string, unknown> | null }>({ currentData: {}, baselineData: null });

  // NEW: Pending overrides tracking
  const [pendingOverrides, setPendingOverrides] = useState<Array<{
    tokenId: string;
    tokenName: string;
    overrideType: 'platform' | 'theme';
    overrideSource: string;
  }>>([]);

  // Use refs to track previous GitHub state to prevent unnecessary re-renders
  const previousGitHubState = useRef<{ isConnected: boolean; user: GitHubUser | null }>({ isConnected: false, user: null });

  const [isOpen, setIsOpen] = useState(false);
  const { currentView, navigateToView } = useViewState();

  // NEW: Update pending overrides when data changes
  useEffect(() => {
    if (isEditMode && dataSourceContext) {
      const dataManager = DataManager.getInstance();
      const overrides = dataManager.getPendingOverrides();
      
      // Convert to UI format
      const uiOverrides = overrides.map(override => {
        const token = tokens.find(t => t.id === override.tokenId);
        const sourceType = dataSourceContext.editMode.sourceType;
        
        return {
          tokenId: override.tokenId,
          tokenName: token?.displayName || override.tokenId,
          overrideType: (sourceType === 'platform-extension' ? 'platform' : 'theme') as 'platform' | 'theme',
          overrideSource: dataSourceContext.editMode.sourceId || 'unknown'
        };
      });
      
      setPendingOverrides(uiOverrides);
    } else {
      setPendingOverrides([]);
    }
  }, [isEditMode, dataSourceContext, tokens]);

  // Determine if we should show the homepage
  const shouldShowHomepage = () => {
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hasUrlParams = urlParams.get('repo') !== null;
    
    // Check if we have stored data
    const dataManager = DataManager.getInstance();
    const hasStoredData = dataManager.hasExistingData();
    
    // Check if we have GitHub repository info
    const hasGitHubData = GitHubApiService.hasSelectedRepository();
    
    // Show homepage if no URL parameters, no stored data, and no GitHub data
    return !hasUrlParams && !hasStoredData && !hasGitHubData;
  };

  // Helper function to create a data snapshot for change tracking
  const createDataSnapshot = useCallback(() => {
    // Get platform extensions from MultiRepositoryManager
    const multiRepoManager = MultiRepositoryManager.getInstance();
    const multiRepoData = multiRepoManager.getCurrentData();
    
    // Convert Map to plain object for serialization
    const platformExtensions: Record<string, unknown> = {};
    multiRepoData.platformExtensions.forEach((extension, platformId) => {
      platformExtensions[platformId] = extension;
    });

    return {
      collections: StorageService.getCollections(),
      modes: StorageService.getModes(),
      dimensions: StorageService.getDimensions(),
      resolvedValueTypes: StorageService.getValueTypes(),
      platforms: StorageService.getPlatforms(),
      themes: StorageService.getThemes(),
      tokens: StorageService.getTokens(),
      taxonomies: StorageService.getTaxonomies(),
      componentProperties: StorageService.getComponentProperties(),
      componentCategories: StorageService.getComponentCategories(),
      components: StorageService.getComponents(),
      algorithms: StorageService.getAlgorithms(),
      taxonomyOrder: StorageService.getTaxonomyOrder(),
      dimensionOrder: StorageService.getDimensionOrder(),
      algorithmFile: StorageService.getAlgorithmFile(),
      platformExtensions,
    };
  }, []);

  // Helper function to update change log data
  const updateChangeLogData = useCallback(() => {
    const currentSnapshot = createDataSnapshot();
    // Get the current baseline data from ChangeTrackingService to ensure we have the latest
    const baselineSnapshot = ChangeTrackingService.getBaselineDataSnapshot();
    
    // If no baseline exists, use current data as baseline (this should only happen on initial load)
    const effectiveBaseline = baselineSnapshot || currentSnapshot;
    
    setChangeLogData({
      currentData: currentSnapshot,
      baselineData: effectiveBaseline
    });
  }, [createDataSnapshot]);

  // Initialize data manager and load initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        const dataManager = DataManager.getInstance();
        
        // Set up callbacks for data changes
        const callbacks = {
          onDataLoaded: (snapshot: DataSnapshot) => {
            console.log('[App] Data loaded via DataManager:', {
              tokens: snapshot.tokens.length,
              collections: snapshot.collections.length,
              dimensions: snapshot.dimensions.length
            });
            
            // Update React state
            setCollections(snapshot.collections);
            setModes(snapshot.modes);
            setDimensions(snapshot.dimensions);
            setResolvedValueTypes(snapshot.resolvedValueTypes);
            setPlatforms(snapshot.platforms);
            setThemes(snapshot.themes);
            setTokens(snapshot.tokens);
            setTaxonomies(snapshot.taxonomies);
            setComponentProperties(snapshot.componentProperties);
            setComponentCategories(snapshot.componentCategories);
            setComponents(snapshot.components);
            setAlgorithms(snapshot.algorithms);
            setTaxonomyOrder(snapshot.taxonomyOrder);
            setDimensionOrder(snapshot.dimensionOrder);
            
            // Update change log data - use the baseline that was set by DataManager
            updateChangeLogData();
            
            setLoading(false);
            setIsAppLoading(false); // End app loading state
          },
          onDataChanged: (snapshot: DataSnapshot) => {
            // Update React state when data changes
            setCollections(snapshot.collections);
            setModes(snapshot.modes);
            setDimensions(snapshot.dimensions);
            setResolvedValueTypes(snapshot.resolvedValueTypes);
            setPlatforms(snapshot.platforms);
            setThemes(snapshot.themes);
            setTokens(snapshot.tokens);
            setTaxonomies(snapshot.taxonomies);
            setComponentProperties(snapshot.componentProperties);
            setComponentCategories(snapshot.componentCategories);
            setComponents(snapshot.components);
            setAlgorithms(snapshot.algorithms);
            setTaxonomyOrder(snapshot.taxonomyOrder);
            setDimensionOrder(snapshot.dimensionOrder);
          },
          onBaselineUpdated: (snapshot: DataSnapshot) => {
            // When baseline is updated (new data source loaded), set both current and baseline to the same data
            // This ensures the ChangeLog shows no changes
            const snapshotData = snapshot as unknown as Record<string, unknown>;
            setChangeLogData({
              currentData: snapshotData,
              baselineData: snapshotData
            });
          }
        };
        
        // Initialize DataSourceManager
        const dataSourceManager = DataSourceManager.getInstance();
        dataSourceManager.initializeFromURL();
        
        setDataSourceContext(dataSourceManager.getCurrentContext());
        
        // Check for URL parameters first
        const urlParams = new URLSearchParams(window.location.search);
        const repo = urlParams.get('repo');
        const path = urlParams.get('path') || 'schema.json';
        const branch = urlParams.get('branch') || 'main';
        const platform = urlParams.get('platform');
        const theme = urlParams.get('theme');
        
        // Update branch state from URL
        setCurrentBranch(branch);
        
        // Manual URL changes should reset to view mode (not edit mode)
        // This ensures users can't accidentally stay in edit mode when navigating via URL
        setIsEditMode(false);
        setEditModeBranch(null);
        clearEditModeState();
        
        if (repo) {
          // Load from URL parameters
          console.log('[App] Loading from URL parameters:', { repo, path, branch });
          setIsAppLoading(true); // Start app loading state
          const urlConfig: URLConfig = { repo, path, branch };
          
          try {
            // Clear all caches before loading from URL to ensure fresh data
            console.log('[App] Clearing caches before loading from URL');
            StorageService.clearAll();
            GitHubCacheService.clearAll();
            
            // Clear DataSourceManager state
            const dataSourceManager = DataSourceManager.getInstance();
            dataSourceManager.clear();
            
            // Clear permission cache
            const permissionManager = PermissionManager.getInstance();
            permissionManager.clearCache();
            
            console.log('[App] Attempting to load from URL config...');
            const snapshot = await dataManager.loadFromURLConfig(urlConfig);
            console.log('[App] Successfully loaded from URL config:', {
              tokens: snapshot.tokens.length,
              collections: snapshot.collections.length,
              dimensions: snapshot.dimensions.length
            });
            
            // Update DataSourceManager with repository information
            dataSourceManager.updateRepositoryInfo('core', {
              fullName: repo,
              branch: branch,
              filePath: path,
              fileType: 'schema' as const
            });
            
            // Set selectedRepoInfo for branch creation and other operations
            setSelectedRepoInfo({
              fullName: repo,
              branch: branch,
              filePath: path,
              fileType: 'schema'
            });
            
            // Update available sources after data is loaded
            dataSourceManager.updateAvailableSources();
            
            // Initialize platform/theme selection from URL parameters
            if (platform) {
              dataSourceManager.initializeFromURL();
              // Switch to the specified platform
              await dataSourceManager.switchToPlatform(platform === 'none' ? null : platform);
            }
            
            if (theme) {
              // If platform wasn't set, initialize from URL now
              if (!platform) {
                dataSourceManager.initializeFromURL();
              }
              // Switch to the specified theme
              await dataSourceManager.switchToTheme(theme === 'none' ? null : theme);
            }
            
            // Check if user is authenticated and has permissions
            const currentUser = GitHubAuthService.getCurrentUser();
            if (currentUser) {
              // User is authenticated, check permissions
              const hasWriteAccess = await GitHubApiService.hasWriteAccessToRepository(repo);
              
              // Branch-based governance: Show edit button if user has write access
              // But only allow actual editing on non-main branches
              const isOnMainBranch = isMainBranch(branch);
              const canShowEditButton = hasWriteAccess; // Show button if user has write access
              const canActuallyEdit = hasWriteAccess && !isOnMainBranch; // Only edit on non-main branches
              
              setHasEditPermissions(canShowEditButton); // Controls Edit button visibility
              setIsViewOnlyMode(!canActuallyEdit); // Controls actual editing capability
              
              // Update DataSourceManager permissions for all sources
              await dataSourceManager.updatePermissions();
            } else {
              // User is not authenticated, set view-only mode
              setIsViewOnlyMode(true);
              setHasEditPermissions(false);
            }
            
            // Update data source context
            setDataSourceContext(dataSourceManager.getCurrentContext());
            
            // Manually update React state since callbacks should have been called
            // but let's ensure the state is updated
            setCollections(snapshot.collections);
            setModes(snapshot.modes);
            setDimensions(snapshot.dimensions);
            setResolvedValueTypes(snapshot.resolvedValueTypes);
            setPlatforms(snapshot.platforms);
            setThemes(snapshot.themes);
            setTokens(snapshot.tokens);
            setTaxonomies(snapshot.taxonomies);
            setComponentProperties(snapshot.componentProperties);
            setComponentCategories(snapshot.componentCategories);
            setComponents(snapshot.components);
            setAlgorithms(snapshot.algorithms);
            setTaxonomyOrder(snapshot.taxonomyOrder);
            setDimensionOrder(snapshot.dimensionOrder);
            
            setLoading(false);
            setIsAppLoading(false); // End app loading state for URL loading
          } catch (urlError) {
            console.warn('[App] Failed to load from URL, falling back to default initialization:', urlError);
            
            // Show user-friendly error message
            const errorMessage = urlError instanceof Error ? urlError.message : 'Unknown error';
            console.log('[App] Showing error toast for:', errorMessage);
            
            if (errorMessage.includes('Repository not found')) {
              console.log('[App] Showing "Repository not found" toast');
              toast({
                title: 'Repository Not Found',
                description: `The repository ${repo} does not exist. Loading default data instead.`,
                status: 'warning',
                duration: 5000,
                isClosable: true,
              });
            } else if (errorMessage.includes('File not found')) {
              console.log('[App] Showing "File not found" toast');
              toast({
                title: 'Repository File Not Found',
                description: `The file "${path}" was not found in ${repo}. Loading default data instead.`,
                status: 'warning',
                duration: 5000,
                isClosable: true,
              });
            } else if (errorMessage.includes('Repository is private')) {
              console.log('[App] Showing "Private repository" toast');
              toast({
                title: 'Private Repository',
                description: `The repository ${repo} is private. Please connect to GitHub to access private repositories. Loading default data instead.`,
                status: 'warning',
                duration: 5000,
                isClosable: true,
              });
            } else {
              console.log('[App] Showing "General error" toast');
              toast({
                title: 'URL Loading Failed',
                description: `Failed to load data from ${repo}. Loading default data instead.`,
                status: 'warning',
                duration: 5000,
                isClosable: true,
              });
            }
            
            // Fall back to default initialization if URL loading fails
            await dataManager.initialize(callbacks);
            
            // Update DataSourceManager after data is loaded
            const dataSourceManager = DataSourceManager.getInstance();
            dataSourceManager.updateAvailableSources();
            
            setIsViewOnlyMode(false);
            setIsAppLoading(false); // End app loading state for URL error fallback
          }
        } else {
          // No URL parameters - check if we should clear cache for fresh start
          const urlParams = new URLSearchParams(window.location.search);
          const shouldClearCache = urlParams.toString() === ''; // No URL parameters
          
          if (shouldClearCache) {
            console.log('[App] No URL parameters detected - clearing cache for fresh start');
            
            // Clear all caches
            StorageService.clearAll();
            GitHubCacheService.clearAll();
            
            // Clear DataSourceManager state
            const dataSourceManager = DataSourceManager.getInstance();
            dataSourceManager.clear();
            
            // Clear permission cache
            const permissionManager = PermissionManager.getInstance();
            permissionManager.clearCache();
            
            console.log('[App] Cache cleared - loading fresh example data');
          }
          
          // Use existing initialization logic
          await dataManager.initialize(callbacks);
          
          // Update DataSourceManager after data is loaded
          const dataSourceManager = DataSourceManager.getInstance();
          dataSourceManager.updateAvailableSources();
          
          setIsViewOnlyMode(false);
          setIsAppLoading(false); // End app loading state for default initialization
        }
        
        // Initialize GitHub state
        const currentUser = GitHubAuthService.getCurrentUser();
        const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
        setGithubUser(currentUser);
        setSelectedRepoInfo(repoInfo);
        
      } catch (error) {
        console.error('[App] Error initializing data manager:', error);
        setLoading(false);
        setIsAppLoading(false); // End app loading state for initialization error
      }
    };
    
    initializeData();
  }, []);

  // Check GitHub connection status
  useEffect(() => {
    const checkGitHubConnection = () => {
      const isConnected = GitHubAuthService.isAuthenticated();
      const currentUser = GitHubAuthService.getCurrentUser();
      const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
      
      console.log('[App] Checking GitHub connection:', { isConnected, currentUser, repoInfo });
      
      setIsGitHubConnected(isConnected);
      setGithubUser(currentUser);
      setSelectedRepoInfo(repoInfo);
    };

    // Check immediately on mount
    checkGitHubConnection();
    
    // Set up periodic check for GitHub connection state
    const intervalId = setInterval(() => {
      const isConnected = GitHubAuthService.isAuthenticated();
      const currentUser = GitHubAuthService.getCurrentUser();
      
      // Compare actual values, not object references
      const isConnectedChanged = isConnected !== previousGitHubState.current.isConnected;
      const userChanged = JSON.stringify(currentUser) !== JSON.stringify(previousGitHubState.current.user);
      
      // Only update if state has actually changed
      if (isConnectedChanged || userChanged) {
        console.log('[App] Periodic check: GitHub state changed, updating');
        previousGitHubState.current = { isConnected, user: currentUser };
        checkGitHubConnection();
      }
    }, 10000); // Check every 10 seconds
    
    // Listen for storage changes to detect GitHub data updates
    const handleStorageChange = () => {
      console.log('[App] Storage change detected, rechecking GitHub connection');
      checkGitHubConnection();
    };

    // Listen for GitHub file loaded events from GitHubCallback
    const handleGitHubFileLoaded = () => {
      console.log('[App] GitHub file loaded event received');
      checkGitHubConnection();
      // Refresh App component state from storage to reflect the new GitHub data
      refreshDataFromStorage();
    };

    // Listen for permissions checked events from GitHubCallback
    const handlePermissionsChecked = (event: CustomEvent) => {
      const { hasWriteAccess, repoInfo } = event.detail;
      
      console.log('[App] Permissions checked:', { hasWriteAccess, repoInfo });
      
      // Branch-based governance: Show edit button if user has write access
      // But only allow actual editing on non-main branches
      const isOnMainBranch = isMainBranch(currentBranch);
      const canShowEditButton = hasWriteAccess; // Show button if user has write access
      const canActuallyEdit = hasWriteAccess && !isOnMainBranch; // Only edit on non-main branches
      
      // Update state based on permissions and branch status
      setHasEditPermissions(canShowEditButton); // Controls Edit button visibility
      setIsViewOnlyMode(!canActuallyEdit); // Controls actual editing capability
      setSelectedRepoInfo(repoInfo);
      setIsGitHubConnected(true);
      
      // Also check for current user
      const currentUser = GitHubAuthService.getCurrentUser();
      setGithubUser(currentUser);
      
      // Refresh App component state from storage
      refreshDataFromStorage();
    };

    // Listen for OAuth completion events
    const handleOAuthComplete = () => {
      console.log('[App] OAuth completion event received');
      checkGitHubConnection();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('github:file-loaded', handleGitHubFileLoaded);
    window.addEventListener('github:permissions-checked', handlePermissionsChecked as EventListener);
    window.addEventListener('github:oauth-complete', handleOAuthComplete);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('github:file-loaded', handleGitHubFileLoaded);
      window.removeEventListener('github:permissions-checked', handlePermissionsChecked as EventListener);
      window.removeEventListener('github:oauth-complete', handleOAuthComplete);
      clearInterval(intervalId); // Clear the interval on unmount
    };
  }, []); // Empty dependency array

  useEffect(() => {
    // Create data options from the package exports
    const options = [
      { label: 'Example Minimal (with algorithms)', value: 'minimal', hasAlgorithms: true },
      { label: 'Core Data (with algorithms)', value: 'core', hasAlgorithms: true },
      { label: 'Brand A Overrides', value: 'brandAOverrides', hasAlgorithms: false },
      { label: 'Brand B Overrides', value: 'brandBOverrides', hasAlgorithms: false }
    ];
    setDataOptions(options);
  }, []);

  const loadDataFromSource = useCallback(async (dataSourceKey: string) => {
    try {
      console.log('[App] Loading data from package source:', dataSourceKey);
      
      const dataManager = DataManager.getInstance();
      
      // Load core data from package
      const coreDataModule = await exampleData[dataSourceKey as keyof typeof exampleData]();
      const coreData = coreDataModule.default || coreDataModule;
      
      // Load algorithm data if available
      let algorithmDataModule: Record<string, unknown> | undefined;
      try {
        const algorithmModule = await algorithmData[dataSourceKey as keyof typeof algorithmData]();
        if (algorithmModule && algorithmModule.default) {
          algorithmDataModule = algorithmModule.default as Record<string, unknown>;
        }
      } catch (algorithmError) {
        console.log('[App] No algorithm data available for:', dataSourceKey);
      }
      
      // Load data via DataManager
      await dataManager.loadFromExampleSource(dataSourceKey, coreData, algorithmDataModule);
      
    } catch (error) {
      let message = 'Error loading data:';
      if (error instanceof SyntaxError) {
        message += ' The selected file is not valid JSON.';
      } else if (error instanceof Error) {
        message += ' ' + error.message;
      }
      console.error(message, error);
      alert(message);
      setLoading(false);
    }
  }, []); // Empty dependency array since it doesn't depend on any state

  useEffect(() => {
    // Only load example data if:
    // 1. We have a dataSource set
    // 2. We're not connected to GitHub
    // 3. We don't have any stored data
    // 4. We don't have GitHub repository info stored
    // 5. We haven't already initialized
    // 6. We shouldn't show the homepage
    if (hasInitialized || shouldShowHomepage()) return;
    
    const dataManager = DataManager.getInstance();
    const hasStoredData = dataManager.hasExistingData();
    const hasGitHubData = GitHubApiService.hasSelectedRepository();
    
    if (dataSource && !isGitHubConnected && !hasStoredData && !hasGitHubData) {
      console.log('[App] Loading example data - no existing data found');
      setHasInitialized(true);
      loadDataFromSource(dataSource);
    } else if (hasStoredData || hasGitHubData) {
      console.log('[App] Found existing data, not loading example data');
      setHasInitialized(true);
      
      // Even with existing data, we need to ensure DataSourceManager is properly initialized
      // This is especially important for theme permissions when no URL parameters are present
      const dataSourceManager = DataSourceManager.getInstance();
      dataSourceManager.updateAvailableSources();
      
      // Check if user is authenticated and update permissions
      const authenticatedUser = GitHubAuthService.getCurrentUser();
      if (authenticatedUser) {
        dataSourceManager.updatePermissions().catch(error => {
          console.error('[App] Failed to update permissions:', error);
        });
      }
      
      setDataSourceContext(dataSourceManager.getCurrentContext());
      setLoading(false);
    }
  }, [dataSource, isGitHubConnected, hasInitialized]); // Added hasInitialized to dependencies

  // Function to refresh data from storage (called when GitHub data is loaded)
  const refreshDataFromStorage = useCallback(() => {
    const storedCollections = StorageService.getCollections();
    const storedModes = StorageService.getModes();
    const storedDimensions = StorageService.getDimensions();
    const storedResolvedValueTypes = StorageService.getValueTypes();
    const storedPlatforms = StorageService.getPlatforms();
    const storedThemes = StorageService.getThemes();
    const storedTokens = StorageService.getTokens();
    const storedTaxonomies = StorageService.getTaxonomies();
    const storedComponentProperties = StorageService.getComponentProperties();
    const storedComponentCategories = StorageService.getComponentCategories();
    const storedComponents = StorageService.getComponents();
    const storedAlgorithms = StorageService.getAlgorithms();
    const storedTaxonomyOrder = StorageService.getTaxonomyOrder();

    setCollections(storedCollections);
    setModes(storedModes);
    setDimensions(storedDimensions);
    setResolvedValueTypes(storedResolvedValueTypes);
    setPlatforms(storedPlatforms);
    setThemes(storedThemes);
    setTokens(storedTokens);
    setTaxonomies(storedTaxonomies);
    setComponentProperties(storedComponentProperties);
    setComponentCategories(storedComponentCategories);
    setComponents(storedComponents);
    setAlgorithms(storedAlgorithms);
    setTaxonomyOrder(storedTaxonomyOrder);

    // Reset change tracking baseline for new data source
    const newBaselineData = {
      collections: storedCollections,
      modes: storedModes,
      dimensions: storedDimensions,
      resolvedValueTypes: storedResolvedValueTypes,
      platforms: storedPlatforms,
      themes: storedThemes,
      tokens: storedTokens,
      taxonomies: storedTaxonomies,
      componentProperties: storedComponentProperties,
      componentCategories: storedComponentCategories,
      components: storedComponents,
      algorithms: storedAlgorithms,
      taxonomyOrder: storedTaxonomyOrder,
    };

    // Set baseline data in ChangeTrackingService
    ChangeTrackingService.setBaselineData(newBaselineData);

    // Update change log data with new baseline
    setChangeLogData({
      currentData: newBaselineData,
      baselineData: newBaselineData
    });

    // Dispatch event to notify change detection that new data has been loaded
    // This will reset the change tracking baseline in AppLayout
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  }, []);

  // Expose refresh function globally for GitHub components to call
  useEffect(() => {
    (window as Window & { refreshAppData?: () => void }).refreshAppData = refreshDataFromStorage;
    return () => {
      delete (window as Window & { refreshAppData?: () => void }).refreshAppData;
    };
  }, [refreshDataFromStorage]);

  // Listen for data change events to update change log data
  useEffect(() => {
    const handleDataChange = () => {
      // Update change log data when data changes
      updateChangeLogData();
    };

    window.addEventListener(DATA_CHANGE_EVENT, handleDataChange);
    return () => {
      window.removeEventListener(DATA_CHANGE_EVENT, handleDataChange);
    };
  }, [updateChangeLogData]);



  const handleResetData = () => {
    const dataManager = DataManager.getInstance();
    
    // Clear all data via DataManager
    dataManager.clearAllData();
    
    // Clear caches
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Reload the page
    window.location.reload();
  };

  // GitHub state management handlers
  const handleGitHubConnect = async () => {
    try {
      // Check for URL parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const repo = urlParams.get('repo');
      const path = urlParams.get('path');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const branch = urlParams.get('branch') || 'main';

      if (repo && path) {
        // URL parameters present - skip repository selection dialog
        console.log('[App] URL parameters detected, proceeding with direct authentication');
        
        // Only clear OAuth state if user is already authenticated
        if (GitHubAuthService.isAuthenticated()) {
          console.log('User already authenticated, clearing OAuth state before new auth');
          GitHubAuthService.clearOAuthState();
        }
        
        // Initiate the OAuth flow
        await GitHubAuthService.initiateAuth();
        
        // Note: initiateAuth() redirects to GitHub, so code after this won't execute
        // The state will be updated when the user returns from GitHub
      } else {
        // No URL parameters - show repository selection dialog (current behavior)
        console.log('[App] No URL parameters, showing repository selection dialog');
        
        // Only clear OAuth state if user is already authenticated
        if (GitHubAuthService.isAuthenticated()) {
          console.log('User already authenticated, clearing OAuth state before new auth');
          GitHubAuthService.clearOAuthState();
        }
        
        // Initiate the OAuth flow
        await GitHubAuthService.initiateAuth();
        
        // Note: initiateAuth() redirects to GitHub, so code after this won't execute
        // The state will be updated when the user returns from GitHub
      }
      
    } catch (error) {
      console.error('GitHub connection error:', error);
      toast({
        title: 'GitHub Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to GitHub. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleGitHubDisconnect = () => {
    GitHubAuthService.logout();
    
    // Clear all GitHub-related state
    setGithubUser(null);
    setSelectedRepoInfo(null);
    setIsGitHubConnected(false);
    
    // Clear any stored repository info
    localStorage.removeItem('github_selected_repo');
    
    toast({
      title: 'Signed out',
      description: 'Successfully signed out.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleFileSelected = async (fileContent: Record<string, unknown>, fileType: 'schema' | 'theme-override' | 'platform-extension') => {
    console.log('[App] handleFileSelected called with:', { fileType, fileContent });
    
    setIsAppLoading(true); // Start app loading state
    
    try {
      // Clear all caches before loading new source to ensure fresh data
      console.log('[App] Clearing caches before loading new source');
      StorageService.clearSchemaData(); // Use clearSchemaData to preserve GitHub auth
      GitHubCacheService.clearAll();
      
      // Clear DataSourceManager state
      const dataSourceManager = DataSourceManager.getInstance();
      dataSourceManager.clear();
      
      // Clear permission cache
      const permissionManager = PermissionManager.getInstance();
      permissionManager.clearCache();
      
      const dataManager = DataManager.getInstance();
      
      // Load data via DataManager
      await dataManager.loadFromGitHub(fileContent, fileType);
      
      // Refresh App component state from storage to reflect the new GitHub data
      refreshDataFromStorage();
      
      toast({
        title: 'Data Loaded',
        description: `Successfully loaded ${fileType === 'schema' ? 'core data' : 'theme override'} from GitHub`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('[App] Error loading file data:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load data from GitHub. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsAppLoading(false); // End app loading state
    }
  };

  const handleRefreshCurrentData = async () => {
    console.log('[App] handleRefreshCurrentData called');
    
    setIsAppLoading(true); // Start app loading state
    
    try {
      // Get current data source context BEFORE clearing cache
      const dataSourceManager = DataSourceManager.getInstance();
      const currentContext = dataSourceManager.getCurrentContext();
      
      // Determine target repository based on current context
      let targetRepository = currentContext.repositories.core;
      if (currentContext.currentPlatform && currentContext.currentPlatform !== 'none') {
        targetRepository = currentContext.repositories.platforms[currentContext.currentPlatform];
      } else if (currentContext.currentTheme && currentContext.currentTheme !== 'none') {
        targetRepository = currentContext.repositories.themes[currentContext.currentTheme];
      }
      
      if (!targetRepository) {
        console.warn('[App] No target repository found for refresh');
        toast({
          title: 'Refresh Failed',
          description: 'No repository information available for refresh.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      
      console.log('[App] Found target repository for refresh:', targetRepository);
      
      // Clear schema data cache but preserve DataSourceManager state
      console.log('[App] Clearing schema data cache before refresh');
      StorageService.clearSchemaData(); // Use clearSchemaData to preserve GitHub auth
      GitHubCacheService.clearAll();
      
      // Clear permission cache
      const permissionManager = PermissionManager.getInstance();
      permissionManager.clearCache();
      
      console.log('[App] Refreshing from target repository:', targetRepository);
      
      // Load updated data from the target repository
      const fileContent = await GitHubApiService.getFileContent(
        targetRepository.fullName,
        targetRepository.filePath,
        targetRepository.branch
      );
      
      if (!fileContent || !fileContent.content) {
        throw new Error('Failed to load file content from GitHub');
      }
      
      const parsedData = JSON.parse(fileContent.content);
      
      // Load the updated data via DataManager with correct file type
      const dataManager = DataManager.getInstance();
      await dataManager.loadFromGitHub(parsedData, targetRepository.fileType);
      
      // Re-merge data with current platform/theme context
      await mergeDataForCurrentContext(currentContext);
      
      toast({
        title: 'Data Refreshed',
        description: 'Successfully refreshed data from GitHub',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
    } catch (error) {
      console.error('[App] Error refreshing data:', error);
      toast({
        title: 'Refresh Failed',
        description: error instanceof Error ? error.message : 'Failed to refresh data from GitHub',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsAppLoading(false); // End app loading state
    }
  };

  const handleAddToken = () => {
    setSelectedToken({
      id: '',
      displayName: '',
      description: '',
      tokenCollectionId: '',
      resolvedValueTypeId: 'color',
      propertyTypes: [],
      private: false,
      themeable: false,
      status: 'experimental',
      tokenTier: 'PRIMITIVE',
      generatedByAlgorithm: false,
      taxonomies: [],
      codeSyntax: [],
      valuesByMode: []
    });
    setIsEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setSelectedToken(null);
  };

  const handleSaveToken = (token: ExtendedToken) => {
    console.log('[App] handleSaveToken called with token:', token);
    
    setTokens((prevTokens: ExtendedToken[]) => {
      console.log('[App] Previous tokens:', prevTokens);
      
      let updatedTokens;
      // Check if this is an existing token by looking for it in the current tokens array
      const existingTokenIndex = prevTokens.findIndex((t: ExtendedToken) => t.id === token.id);
      
      if (existingTokenIndex !== -1) {
        // Update existing token
        console.log('[App] Updating existing token at index:', existingTokenIndex);
        updatedTokens = prevTokens.map((t: ExtendedToken) => t.id === token.id ? token : t);
      } else {
        // Add new token
        console.log('[App] Adding new token with ID:', token.id);
        updatedTokens = [...prevTokens, token];
      }
      
      console.log('[App] Updated tokens:', updatedTokens);
      StorageService.setTokens(updatedTokens);
      // Update change log data
      updateChangeLogData();
      // Dispatch event to notify change detection
      window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
      return updatedTokens;
    });
    
    toast({
      title: "Token saved",
      description: `Token "${token.displayName}" has been saved successfully`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    
    handleCloseEditor();
  };

  const handleDeleteToken = (tokenId: string) => {
    const tokenToDelete = tokens.find(t => t.id === tokenId);
    setTokens(prevTokens => {
      const updatedTokens = prevTokens.filter(t => t.id !== tokenId);
      StorageService.setTokens(updatedTokens);
      // Update change log data
      updateChangeLogData();
      // Dispatch event to notify change detection
      window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
      return updatedTokens;
    });
    
    if (tokenToDelete) {
      toast({
        title: "Token deleted",
        description: `Token "${tokenToDelete.displayName}" has been deleted`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Centralized update handlers for all data types
  const handleUpdateTokens = (updatedTokens: ExtendedToken[]) => {
    setTokens(updatedTokens);
    StorageService.setTokens(updatedTokens);
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateCollections = (updatedCollections: TokenCollection[]) => {
    setCollections(updatedCollections);
    StorageService.setCollections(updatedCollections);
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateDimensions = (updatedDimensions: Dimension[]) => {
    setDimensions(updatedDimensions);
    StorageService.setDimensions(updatedDimensions);
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateResolvedValueTypes = (updatedResolvedValueTypes: ResolvedValueType[]) => {
    setResolvedValueTypes(updatedResolvedValueTypes);
    StorageService.setValueTypes(updatedResolvedValueTypes);
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdatePlatforms = (updatedPlatforms: Platform[]) => {
    setPlatforms(updatedPlatforms);
    StorageService.setPlatforms(updatedPlatforms);
    
    // Update DataSourceManager with new platform data
    const dataSourceManager = DataSourceManager.getInstance();
    dataSourceManager.updateAvailableSources();
    if (GitHubAuthService.getCurrentUser()) {
      dataSourceManager.updatePermissions();
    }
    
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateThemes = (updatedThemes: Theme[]) => {
    setThemes(updatedThemes);
    StorageService.setThemes(updatedThemes);
    
    // Update DataSourceManager with new theme data
    const dataSourceManager = DataSourceManager.getInstance();
    dataSourceManager.updateAvailableSources();
    if (GitHubAuthService.getCurrentUser()) {
      dataSourceManager.updatePermissions();
    }
    
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateTaxonomies = (updatedTaxonomies: Taxonomy[]) => {
    setTaxonomies(updatedTaxonomies);
    StorageService.setTaxonomies(updatedTaxonomies);
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateComponentProperties = (updatedComponentProperties: ComponentProperty[]) => {
    setComponentProperties(updatedComponentProperties);
    StorageService.setComponentProperties(updatedComponentProperties);
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateComponentCategories = (updatedComponentCategories: ComponentCategory[]) => {
    setComponentCategories(updatedComponentCategories);
    StorageService.setComponentCategories(updatedComponentCategories);
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateComponents = (updatedComponents: Component[]) => {
    setComponents(updatedComponents);
    StorageService.setComponents(updatedComponents);
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateAlgorithms = (updatedAlgorithms: Algorithm[]) => {
    setAlgorithms(updatedAlgorithms);
    StorageService.setAlgorithms(updatedAlgorithms);
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  // Data merging function - simplified version
  const mergeDataForCurrentContext = async (context: DataSourceContext) => {
    try {
      console.log('[App] Merging data for context:', context);
      
      // Get base data from storage (core data)
      const rootData = StorageService.getRootData();
      const coreData = {
        systemName: rootData.systemName || 'Design System',
        systemId: rootData.systemId || 'design-system',
        version: rootData.version || '1.0.0',
        versionHistory: (rootData.versionHistory || []).map(vh => ({
          date: vh.date,
          version: vh.version,
          dimensions: vh.dimensions,
          migrationStrategy: vh.migrationStrategy ? {
            emptyModeIds: vh.migrationStrategy.emptyModeIds as 'mapToDefaults' | 'preserveEmpty' | 'requireExplicit',
            preserveOriginalValues: vh.migrationStrategy.preserveOriginalValues
          } : undefined
        })),
        tokens: StorageService.getTokens(),
        tokenCollections: StorageService.getCollections(),
        dimensions: StorageService.getDimensions(),
        platforms: StorageService.getPlatforms(),
        themes: StorageService.getThemes(),
        taxonomies: StorageService.getTaxonomies(),
        componentProperties: StorageService.getComponentProperties(),
        componentCategories: StorageService.getComponentCategories(),
        components: StorageService.getComponents(),
        resolvedValueTypes: StorageService.getValueTypes(),
        algorithms: StorageService.getAlgorithms(),
        taxonomyOrder: StorageService.getTaxonomyOrder() || [],
        dimensionOrder: StorageService.getDimensionOrder() || [],
        propertyTypes: [],
        standardPropertyTypes: [],
        figmaConfiguration: StorageService.getFigmaConfiguration() || { fileKey: '' }
      };

      // Prepare platform extensions array
      const platformExtensions = [];
      
      // Load platform extension data if a platform is selected
      if (context.currentPlatform && context.currentPlatform !== 'none') {
        try {
          const platformRepo = context.repositories.platforms[context.currentPlatform];
          if (platformRepo) {
            console.log(`[App] Loading platform extension from ${platformRepo.fullName}/${platformRepo.filePath}`);
            
            const fileContent = await GitHubApiService.getFileContent(
              platformRepo.fullName,
              platformRepo.filePath,
              platformRepo.branch
            );
            
            if (fileContent && fileContent.content) {
              const platformData = JSON.parse(fileContent.content);
              console.log('[App] Platform extension data:', platformData);
              platformExtensions.push(platformData);
            }
          }
        } catch (error) {
          console.warn(`[App] Failed to load platform extension for ${context.currentPlatform}:`, error);
        }
      }

      // Prepare theme overrides object
      let themeOverrides = undefined;
      
      // Load theme override data if a theme is selected
      if (context.currentTheme && context.currentTheme !== 'none') {
        try {
          const themeRepo = context.repositories.themes[context.currentTheme];
          if (themeRepo) {
            console.log(`[App] Loading theme override from ${themeRepo.fullName}/${themeRepo.filePath}`);
            
            const fileContent = await GitHubApiService.getFileContent(
              themeRepo.fullName,
              themeRepo.filePath,
              themeRepo.branch
            );
            
            if (fileContent && fileContent.content) {
              const themeData = JSON.parse(fileContent.content);
              console.log('[App] Theme override data:', themeData);
              
              // Extract theme overrides from the theme data
              if (themeData.themeId && themeData.tokenOverrides) {
                // Transform the theme override file structure to match ThemeOverride type
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const transformedOverrides = themeData.tokenOverrides.map((tokenOverride: any) => {
                  // Take the first valueByMode entry as the main override value
                  const firstValueByMode = tokenOverride.valuesByMode?.[0];
                  if (!firstValueByMode) {
                    console.warn(`[App] Token override ${tokenOverride.tokenId} has no valuesByMode`);
                    return null;
                  }

                  // Transform platform overrides to match ThemePlatformOverride structure
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const transformedPlatformOverrides = firstValueByMode.platformOverrides?.map((platformOverride: any) => ({
                    platformId: platformOverride.platformId,
                    value: {
                      value: platformOverride.value,
                      tokenId: platformOverride.value?.tokenId
                    }
                  }));

                  return {
                    tokenId: tokenOverride.tokenId,
                    value: {
                      value: firstValueByMode.value?.value || firstValueByMode.value,
                      tokenId: firstValueByMode.value?.tokenId
                    },
                    platformOverrides: transformedPlatformOverrides
                  };
                }).filter(Boolean); // Remove null entries

                // Validate theme ID consistency between core data and theme override file
                const coreThemeId = context.currentTheme;
                const themeOverrideFileId = themeData.themeId;
                
                if (coreThemeId !== themeOverrideFileId) {
                  const errorMessage = `Theme ID mismatch: Core data theme "${coreThemeId}" does not match theme override file "${themeOverrideFileId}". Theme overrides cannot be applied.`;
                  console.error('[App] Theme ID mismatch:', {
                    coreThemeId,
                    themeOverrideFileId,
                    contextCurrentTheme: context.currentTheme
                  });
                  
                  toast({
                    title: 'Theme Override Error',
                    description: errorMessage,
                    status: 'error',
                    duration: 8000,
                    isClosable: true,
                  });
                  
                  // Don't apply theme overrides if IDs don't match
                  themeOverrides = undefined;
                } else {
                  // IDs match - apply theme overrides
                  themeOverrides = {
                    [coreThemeId]: transformedOverrides
                  };
                  
                  console.log('[App] Theme ID mapping (valid):', {
                    themeOverrideFileId,
                    coreThemeId,
                    contextCurrentTheme: context.currentTheme
                  });
                }
                console.log('[App] Transformed theme overrides:', themeOverrides);
                console.log('[App] Transformed overrides array:', transformedOverrides);
                console.log('[App] Is transformedOverrides an array?', Array.isArray(transformedOverrides));
                console.log('[App] Transformed overrides length:', transformedOverrides?.length);
              }
            }
          }
        } catch (error) {
          console.warn(`[App] Failed to load theme override for ${context.currentTheme}:`, error);
        }
      }

      // Use the proper mergeData function from data-model with correct merge order
      const mergeOptions = {
        targetPlatformId: context.currentPlatform && context.currentPlatform !== 'none' ? context.currentPlatform : undefined,
        targetThemeId: context.currentTheme && context.currentTheme !== 'none' ? context.currentTheme : undefined,
        includeOmitted: false
      };

      console.log('[App] Calling mergeData with options:', mergeOptions);
      const mergedResult = mergeData(coreData, platformExtensions, themeOverrides, mergeOptions);
      
      console.log('[App] Merge result analytics:', mergedResult.analytics);

      // Update UI state with merged data
      setTokens(mergedResult.mergedTokens);
      setCollections(coreData.tokenCollections); // Collections don't change in merging
      setDimensions(coreData.dimensions); // Dimensions don't change in merging
      setPlatforms(mergedResult.mergedPlatforms);
      setThemes(coreData.themes); // Themes don't change in merging
      setTaxonomies(coreData.taxonomies); // Taxonomies don't change in merging
      setComponentProperties(coreData.componentProperties); // Component properties don't change in merging
      setComponentCategories(coreData.componentCategories); // Component categories don't change in merging
      setComponents(coreData.components); // Components don't change in merging
      setResolvedValueTypes(coreData.resolvedValueTypes); // Value types don't change in merging

      // Update change tracking baseline
      const newBaselineData = {
        collections: coreData.tokenCollections,
        modes: StorageService.getModes(), // Modes don't change in merging
        dimensions: coreData.dimensions,
        resolvedValueTypes: coreData.resolvedValueTypes,
        platforms: mergedResult.mergedPlatforms,
        themes: coreData.themes,
        tokens: mergedResult.mergedTokens,
        taxonomies: coreData.taxonomies,
        componentProperties: coreData.componentProperties,
        componentCategories: coreData.componentCategories,
        components: coreData.components,
        algorithms: coreData.algorithms,
        taxonomyOrder: coreData.taxonomyOrder,
      };

      ChangeTrackingService.setBaselineData(newBaselineData);
      setChangeLogData({
        currentData: newBaselineData,
        baselineData: newBaselineData
      });

      // Dispatch event to notify change detection
      window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
      
      console.log('[App] Data merging completed. Tokens:', mergedResult.mergedTokens.length);
      console.log('[App] Excluded theme overrides:', mergedResult.analytics.excludedThemeOverrides);
      console.log('[App] Valid theme overrides:', mergedResult.analytics.validThemeOverrides);
      
    } catch (error) {
      console.error('Error merging data:', error);
      toast({
        title: 'Error merging data',
        description: error instanceof Error ? error.message : 'Failed to merge data sources',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Data source change handlers
  const handlePlatformChange = async (platformId: string | null) => {
    setIsAppLoading(true); // Start app loading state
    try {
      const dataSourceManager = DataSourceManager.getInstance();
      await dataSourceManager.switchToPlatform(platformId);
      const newContext = dataSourceManager.getCurrentContext();
      setDataSourceContext(newContext);
      
      // Update URL parameters
      const url = new URL(window.location.href);
      if (platformId) {
        url.searchParams.set('platform', platformId);
      } else {
        url.searchParams.delete('platform');
      }
      window.history.replaceState({}, '', url.toString());
      
      // Merge data for the new context
      await mergeDataForCurrentContext(newContext);
    } catch (error) {
      toast({
        title: 'Error switching platform',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsAppLoading(false); // End app loading state
    }
  };

  const handleThemeChange = async (themeId: string | null) => {
    setIsAppLoading(true); // Start app loading state
    try {
      const dataSourceManager = DataSourceManager.getInstance();
      await dataSourceManager.switchToTheme(themeId);
      const newContext = dataSourceManager.getCurrentContext();
      setDataSourceContext(newContext);
      
      // Update URL parameters
      const url = new URL(window.location.href);
      if (themeId) {
        url.searchParams.set('theme', themeId);
      } else {
        url.searchParams.delete('theme');
      }
      window.history.replaceState({}, '', url.toString());
      
      // Merge data for the new context
      await mergeDataForCurrentContext(newContext);
    } catch (error) {
      toast({
        title: 'Error switching theme',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsAppLoading(false); // End app loading state
    }
  };

  // Branch-based governance handlers
  const handleBranchCreated = async (newBranchName: string) => {
    try {
      console.log('[App] handleBranchCreated called with:', newBranchName);
      
      // Get current data source context to determine target repository
      const dataSourceManager = DataSourceManager.getInstance();
      const currentContext = dataSourceManager.getCurrentContext();
      
      // Determine target repository based on current context
      let targetRepository = currentContext.repositories.core;
      if (currentContext.currentPlatform && currentContext.currentPlatform !== 'none') {
        targetRepository = currentContext.repositories.platforms[currentContext.currentPlatform];
      } else if (currentContext.currentTheme && currentContext.currentTheme !== 'none') {
        targetRepository = currentContext.repositories.themes[currentContext.currentTheme];
      }
      
      // Update URL parameters with new branch for the target repository
      const url = new URL(window.location.href);
      
      if (targetRepository && targetRepository !== currentContext.repositories.core) {
        // If editing a platform or theme, update the core repository branch
        // (since the URL tracks the core repository)
        url.searchParams.set('branch', newBranchName);
      } else {
        // If editing core data, update the branch
        url.searchParams.set('branch', newBranchName);
      }
      
      // Ensure platform/theme parameters are preserved
      if (currentContext.currentPlatform) {
        url.searchParams.set('platform', currentContext.currentPlatform);
      }
      if (currentContext.currentTheme) {
        url.searchParams.set('theme', currentContext.currentTheme);
      }
      
      window.history.replaceState({}, '', url.toString());
      
      // Update branch state
      setCurrentBranch(newBranchName);
      setEditModeBranch(newBranchName);
      setIsEditMode(true);
      
      // Enter edit mode in DataSourceManager
      const dsManager = DataSourceManager.getInstance();
      dsManager.enterEditMode();
      
      console.log('[App] Target repository for branch creation:', targetRepository);
      
      // Update edit permissions based on new branch
      const isOnMainBranch = isMainBranch(newBranchName);
      const currentUser = GitHubAuthService.getCurrentUser();
      if (currentUser && targetRepository) {
        // Re-check permissions for the target repository
        const hasWriteAccess = await GitHubApiService.hasWriteAccessToRepository(targetRepository.fullName);
        const canShowEditButton = hasWriteAccess; // Show button if user has write access
        const canActuallyEdit = hasWriteAccess && !isOnMainBranch; // Only edit on non-main branches
        
        console.log('[App] Permission check results:', {
          hasWriteAccess,
          isOnMainBranch,
          canShowEditButton,
          canActuallyEdit
        });
        
        setHasEditPermissions(canShowEditButton); // Controls Edit button visibility
        setIsViewOnlyMode(!canActuallyEdit); // Controls actual editing capability
      }
      
      // Save edit mode state
      saveEditModeState(true, newBranchName);
      
      // Update the target repository's branch in DataSourceManager
      if (targetRepository) {
        dataSourceManager.updateRepositoryInfo(
          currentContext.currentPlatform && currentContext.currentPlatform !== 'none' ? 'platform-extension' :
          currentContext.currentTheme && currentContext.currentTheme !== 'none' ? 'theme-override' : 'core',
          {
            ...targetRepository,
            branch: newBranchName
          },
          currentContext.currentPlatform && currentContext.currentPlatform !== 'none' ? currentContext.currentPlatform :
          currentContext.currentTheme && currentContext.currentTheme !== 'none' ? currentContext.currentTheme : undefined
        );
      }
      
      // Refresh data from the new branch (but preserve data source context)
      await handleRefreshCurrentData();
      
      toast({
        title: 'Branch Switched',
        description: `Now editing on branch "${newBranchName}"`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to switch to new branch:', error);
      toast({
        title: 'Branch Switch Failed',
        description: error instanceof Error ? error.message : 'Failed to switch to new branch',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleEnterEditMode = () => {
    // Check if we're on a main branch
    if (isMainBranch(currentBranch)) {
      // Will be handled by Header component opening branch creation dialog
      return;
    } else {
      // Non-main branch - enter edit mode directly
      setEditModeBranch(currentBranch);
      setIsEditMode(true);
      
      // Enter edit mode in DataSourceManager
      const dsManager = DataSourceManager.getInstance();
      dsManager.enterEditMode();
      
      // Save edit mode state
      saveEditModeState(true, currentBranch);
    }
  };

  // Helper functions for edit mode persistence
  const saveEditModeState = (isEdit: boolean, branch: string | null) => {
    try {
      localStorage.setItem('token-model-edit-mode', JSON.stringify({
        isEditMode: isEdit,
        branch: branch
      }));
    } catch (error) {
      console.warn('Failed to save edit mode state:', error);
    }
  };

  const clearEditModeState = () => {
    try {
      localStorage.removeItem('token-model-edit-mode');
    } catch (error) {
      console.warn('Failed to clear edit mode state:', error);
    }
  };

  const handleExitEditMode = async () => {
    try {
      console.log('[App] handleExitEditMode called');
      
      // Clear edit mode state
      setIsEditMode(false);
      setEditModeBranch(null);
      
      // Exit edit mode in DataSourceManager
      const dsManager = DataSourceManager.getInstance();
      dsManager.exitEditMode();
      
      clearEditModeState();
      
      // Reset to main branch if we're on a feature branch
      if (currentBranch !== 'main') {
        const url = new URL(window.location.href);
        url.searchParams.set('branch', 'main');
        window.history.replaceState({}, '', url.toString());
        setCurrentBranch('main');
      }
      
      // Refresh data to ensure we're viewing the latest state
      await handleRefreshCurrentData();
      
      toast({
        title: 'Edit Mode Exited',
        description: 'Returned to view mode',
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Failed to exit edit mode:', error);
      toast({
        title: 'Error Exiting Edit Mode',
        description: error instanceof Error ? error.message : 'Failed to exit edit mode',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // NEW: Enhanced discard changes handler
  const handleDiscardChanges = async () => {
    try {
      // Refresh data to discard changes
      await handleRefreshCurrentData();
      
      // Automatically exit edit mode
      await handleExitEditMode();
      
    } catch (error) {
      console.error('Failed to discard changes:', error);
      toast({
        title: 'Discard Failed',
        description: error instanceof Error ? error.message : 'Failed to discard changes',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const onClose = () => {
    setIsOpen(false);
  };

  const handleEditToken = (token: ExtendedToken) => {
    setSelectedToken(token);
    setIsEditorOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Spinner />
      </Box>
    );
  }

  return (
    <BrowserRouter>
      <Box h="100vh" display="flex" flexDirection="column">
        <Box flex="1" position="relative">
          {shouldShowHomepage() ? (
            <Homepage
              isGitHubConnected={isGitHubConnected}
              githubUser={githubUser}
              onGitHubConnect={handleGitHubConnect}
              onGitHubDisconnect={handleGitHubDisconnect}
            />
          ) : (
            <AppLayout
              dataSource={dataSource}
              setDataSource={setDataSource}
              dataOptions={dataOptions}
              onResetData={handleResetData}
              onExportData={() => {}}
              isGitHubConnected={isGitHubConnected}
              githubUser={githubUser}
              selectedRepoInfo={selectedRepoInfo}
              onGitHubConnect={handleGitHubConnect}
              onGitHubDisconnect={handleGitHubDisconnect}
              onFileSelected={handleFileSelected}
              onRefreshData={handleRefreshCurrentData}
              currentView={currentView}
              onNavigate={navigateToView}
              isViewOnlyMode={isViewOnlyMode}
              urlRepoInfo={isViewOnlyMode ? (() => {
                const urlParams = new URLSearchParams(window.location.search);
                const repo = urlParams.get('repo');
                const path = urlParams.get('path');
                const branch = urlParams.get('branch');
                return repo && path && branch ? { repo, path, branch } : null;
              })() : null}
              hasEditPermissions={hasEditPermissions}
              dataSourceContext={dataSourceContext}
              onPlatformChange={handlePlatformChange}
              onThemeChange={handleThemeChange}
              isEditMode={isEditMode}
              currentBranch={currentBranch}
              editModeBranch={editModeBranch}
              onBranchCreated={handleBranchCreated}
              onEnterEditMode={handleEnterEditMode}
              onExitEditMode={handleExitEditMode}
              // NEW: Edit context props
              editContext={isEditMode ? (() => {
                if (!dataSourceContext) return undefined;
                
                const { currentPlatform, currentTheme, availablePlatforms, availableThemes } = dataSourceContext;
                
                // Find platform name if platform is selected
                const platformName = currentPlatform && currentPlatform !== 'none' 
                  ? availablePlatforms.find(p => p.id === currentPlatform)?.displayName || currentPlatform
                  : undefined;
                
                // Find theme name if theme is selected
                const themeName = currentTheme && currentTheme !== 'none'
                  ? availableThemes.find(t => t.id === currentTheme)?.displayName || currentTheme
                  : undefined;
                
                // Determine source type and name
                let sourceType: 'core' | 'platform-extension' | 'theme-override' = 'core';
                let sourceName = 'Core Design System';
                
                if (currentPlatform && currentPlatform !== 'none') {
                  sourceType = 'platform-extension';
                  sourceName = platformName || currentPlatform;
                } else if (currentTheme && currentTheme !== 'none') {
                  sourceType = 'theme-override';
                  sourceName = themeName || currentTheme;
                }
                
                return {
                  isEditMode: true,
                  sourceType,
                  sourceId: currentPlatform !== 'none' ? currentPlatform : currentTheme !== 'none' ? currentTheme : null,
                  sourceName,
                };
              })() : undefined}
                             onSaveChanges={undefined} // Let Header use its own save workflow
               onDiscardChanges={handleDiscardChanges}
              pendingOverrides={pendingOverrides}
            >
              <Routes>
                <Route path="/auth/github/callback" element={<GitHubCallback />} />
                <Route path="/" element={<div />} />
                <Route path="*" element={<div />} />
              </Routes>
              
              <ViewRenderer
                currentView={currentView}
                tokens={tokens}
                collections={collections}
                modes={modes}
                dimensions={dimensions}
                resolvedValueTypes={resolvedValueTypes}
                platforms={platforms}
                themes={themes}
                taxonomies={taxonomies}
                componentProperties={componentProperties}
                componentCategories={componentCategories}
                components={components}
                algorithms={algorithms}
                dimensionOrder={dimensionOrder}
                taxonomyOrder={taxonomyOrder}
                schema={schema}
                githubUser={githubUser}
                isViewOnlyMode={isViewOnlyMode}
                hasEditPermissions={hasEditPermissions}
                dataSourceContext={dataSourceContext}
                isAppLoading={isAppLoading}
                canEdit={hasEditPermissions && isEditMode}
                onUpdateTokens={handleUpdateTokens}
                onUpdateCollections={handleUpdateCollections}
                onUpdateDimensions={handleUpdateDimensions}
                onUpdateResolvedValueTypes={handleUpdateResolvedValueTypes}
                onUpdatePlatforms={handleUpdatePlatforms}
                onUpdateThemes={handleUpdateThemes}
                onUpdateTaxonomies={handleUpdateTaxonomies}
                onUpdateComponentProperties={handleUpdateComponentProperties}
                onUpdateComponentCategories={handleUpdateComponentCategories}
                onUpdateComponents={handleUpdateComponents}
                onUpdateAlgorithms={handleUpdateAlgorithms}
                setDimensionOrder={setDimensionOrder}
                setTaxonomyOrder={setTaxonomyOrder}
                selectedToken={selectedToken}
                isEditorOpen={isEditorOpen}
                onAddToken={handleAddToken}
                onEditToken={handleEditToken}
                onCloseEditor={handleCloseEditor}
                onSaveToken={handleSaveToken}
                onDeleteToken={handleDeleteToken}
              />
            </AppLayout>
          )}
        </Box>

        {/* Change Log Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="6xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Change Log</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <ChangeLog
                previousData={changeLogData.baselineData}
                currentData={changeLogData.currentData}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </Box>
    </BrowserRouter>
  );
};export default App; 

