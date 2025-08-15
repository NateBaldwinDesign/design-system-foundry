import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useColorMode,
  useToast,
} from '@chakra-ui/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import { DataManager } from './services/dataManager';
import { DataSourceManager } from './services/dataSourceManager';
import { GitHubApiService } from './services/githubApi';
import { GitHubAuthService } from './services/githubAuth';
import { ChangeTrackingService } from './services/changeTrackingService';
import { OverrideTrackingService } from './services/overrideTrackingService';
import { PlatformSyntaxPatternService } from './services/platformSyntaxPatternService';
import { MultiRepositoryManager } from './services/multiRepositoryManager';
import { PermissionManager } from './services/permissionManager';
import { DataLoaderService } from './services/dataLoaderService';
import { DataMergerService } from './services/dataMergerService';
import { StatePersistenceManager } from './services/statePersistenceManager';
import { RefreshManager } from './services/refreshManager';
import { BranchManager } from './services/branchManager';
import { EditModeManager } from './services/editModeManager';
import { URLStateManager } from './services/urlStateManager';
import { SourceManagerService } from './services/sourceManagerService';
import { useSchema } from './hooks/useSchema';
import { useViewState } from './hooks/useViewState';
import { AppLayout, DATA_CHANGE_EVENT } from './components/AppLayout';
import { Homepage } from './views/Homepage';
import { SourceSelectionDialog } from './components/SourceSelectionDialog';
import { GitHubCallback } from './components/GitHubCallback';
import { ViewRenderer } from './components/ViewRenderer';
import { ChangeLog } from './components/ChangeLog';
import type { GitHubUser } from './config/github';
import type { DataSnapshot } from './services/dataManager';
import type { DataSourceContext } from './services/dataSourceManager';
import type { ExtendedToken } from './components/TokenEditorDialog';
import { Algorithm } from './types/algorithm';
import { isMainBranch } from './utils/BranchValidationUtils';
import { SourceContextManager } from './services/sourceContextManager';
import { SchemaTransformer } from './services/schemaTransformer';
import { GitHubSaveService } from './services/githubSave';

const App = () => {
  console.log('🔍 [App] App component rendering');
  
  const { colorMode } = useColorMode();
  const { schema } = useSchema();
  
  console.log('🔍 [App] Current color mode:', colorMode);
  
  const [collections, setCollections] = useState<any[]>([]);
  const [modes, setModes] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState<any[]>([]);
  const [resolvedValueTypes, setResolvedValueTypes] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [platforms, setPlatforms] = useState<any[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [taxonomies, setTaxonomies] = useState<any[]>([]);
  const [componentProperties, setComponentProperties] = useState<any[]>([]);
  const [componentCategories, setComponentCategories] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [algorithms, setAlgorithms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taxonomyOrder, setTaxonomyOrder] = useState<string[]>([]);
  const [dimensionOrder, setDimensionOrder] = useState<string[]>(() => {
    const storedOrder = StorageService.getDimensionOrder();
    if (storedOrder && Array.isArray(storedOrder) && storedOrder.length > 0) {
      return storedOrder;
    }
    return dimensions.map(d => d.id);
  });
  const [selectedToken, setSelectedToken] = useState<any | null>(null);
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
  const [dataSourceContext, setDataSourceContext] = useState<DataSourceContext | undefined>(undefined);
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  // Branch-based governance state
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editModeBranch, setEditModeBranch] = useState<string | null>(null);
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

  // Restore edit mode state when currentBranch changes
  useEffect(() => {
    const saved = localStorage.getItem('token-model-edit-mode');
    if (saved) {
      try {
        const { isEditMode: savedEditMode, branch: savedBranch } = JSON.parse(saved);
        if (savedEditMode && savedBranch === currentBranch) {
          setIsEditMode(true);
          setEditModeBranch(savedBranch);
        } else {
          setIsEditMode(false);
          setEditModeBranch(null);
        }
      } catch (error) {
        console.warn('Failed to parse saved edit mode state:', error);
        setIsEditMode(false);
        setEditModeBranch(null);
      }
    } else {
      setIsEditMode(false);
      setEditModeBranch(null);
    }
  }, [currentBranch]);

  // NEW: Update pending overrides when data changes
  useEffect(() => {
    if (isEditMode && dataSourceContext) {
      const pendingOverrides = OverrideTrackingService.getPendingOverrides();
      
      // Convert to UI format
      const uiOverrides = pendingOverrides.map(override => {
        const token = tokens.find(t => t.id === override.tokenId);
        
        return {
          tokenId: override.tokenId,
          tokenName: token?.displayName || override.tokenId,
          overrideType: (override.sourceType === 'platform-extension' ? 'platform' : 'theme') as 'platform' | 'theme',
          overrideSource: override.sourceId
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
            
            // Collect platform syntax patterns after data is loaded
            console.log('[App] Calling collectAndStoreSyntaxPatterns after data loaded');
            PlatformSyntaxPatternService.getInstance().collectAndStoreSyntaxPatterns()
              .then(() => {
                console.log('[App] ✅ Successfully collected syntax patterns at app load');
              })
              .catch(error => {
                console.error('[App] ❌ Error collecting syntax patterns at app load:', error);
              });
            
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
        
        // Set up DataSourceManager callbacks to update UI state when data source changes
        dataSourceManager.setCallbacks({
          onDataSourceChanged: async (context: DataSourceContext) => {
            console.log('[App] Data source changed, updating UI state:', context);
            
            // CRITICAL: Preserve edit mode state before updating UI
            const currentEditMode = isEditMode;
            const currentEditModeBranch = editModeBranch;
            
            setDataSourceContext(context);
            
            // Update UI state with merged data from storage
            const mergedData = StorageService.getMergedData();
            if (mergedData) {
              console.log('[App] Updating UI state with merged data:', {
                tokens: mergedData.tokens?.length || 0,
                collections: mergedData.tokenCollections?.length || 0
              });
              
              setTokens(mergedData.tokens || []);
              setCollections(mergedData.tokenCollections || []);
              setModes(StorageService.getModes()); // Modes don't change in merging
              setDimensions(mergedData.dimensions || []);
              setResolvedValueTypes(mergedData.resolvedValueTypes || []);
              setPlatforms(mergedData.platforms || []);
              setThemes(mergedData.themes || []);
              setTaxonomies(mergedData.taxonomies || []);
              setComponentProperties(mergedData.componentProperties || []);
              setComponentCategories(mergedData.componentCategories || []);
              setComponents(mergedData.components || []);
              // Algorithms are stored separately, not in TokenSystem
              setAlgorithms([]);
              setTaxonomyOrder(mergedData.taxonomyOrder || []);
              setDimensionOrder(mergedData.dimensionOrder || []);
              
              // Update change tracking baseline
              const newBaselineData = {
                collections: mergedData.tokenCollections || [],
                modes: StorageService.getModes(),
                dimensions: mergedData.dimensions || [],
                resolvedValueTypes: mergedData.resolvedValueTypes || [],
                platforms: mergedData.platforms || [],
                themes: mergedData.themes || [],
                tokens: mergedData.tokens || [],
                taxonomies: mergedData.taxonomies || [],
                componentProperties: mergedData.componentProperties || [],
                componentCategories: mergedData.componentCategories || [],
                components: mergedData.components || [],
                algorithms: [], // Algorithms are stored separately, not in TokenSystem
                taxonomyOrder: mergedData.taxonomyOrder || [],
              };

              ChangeTrackingService.setBaselineData(newBaselineData);
              setChangeLogData({
                currentData: newBaselineData,
                baselineData: newBaselineData
              });

              // Dispatch event to notify change detection
              window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
            }
            
            // CRITICAL: Restore edit mode state after UI update
            if (currentEditMode) {
              console.log('[App] Restoring edit mode state after data source change');
              setIsEditMode(currentEditMode);
              setEditModeBranch(currentEditModeBranch);
            }
          },
          onPermissionsChanged: (permissions) => {
            console.log('[App] Permissions changed:', permissions);
            // Handle permission changes if needed
          },
          onError: (error) => {
            console.error('[App] DataSourceManager error:', error);
            toast({
              title: 'Data Source Error',
              description: error,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          }
        });
        
        dataSourceManager.initializeFromURL();
        
        // DO NOT set dataSourceContext here - it will be set after platform/theme switching
        
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
          // Prevent double loading if already in progress
          if (isAppLoading) {
            console.log('[App] Already loading data from URL, skipping duplicate request');
            return;
          }
          
          // Load from URL parameters using new DataLoaderService
          console.log('[App] Loading from URL parameters using DataLoaderService:', { repo, path, branch, platform, theme });
          setIsAppLoading(true); // Start app loading state
          
          try {
            // Clear all caches before loading from URL to ensure fresh data
            console.log('[App] Clearing caches before loading from URL');
            StorageService.clearAll();
            // GitHubCacheService.clearAll(); // Removed as per edit hint
            
            // Clear DataSourceManager state
            const dataSourceManager = DataSourceManager.getInstance();
            dataSourceManager.clear();
            
            // Clear permission cache
            const permissionManager = PermissionManager.getInstance();
            permissionManager.clearCache();
            
            // Initialize new data management services
            const dataLoader = DataLoaderService.getInstance();
            const dataMerger = DataMergerService.getInstance();
            
            // Migrate existing data if needed
            StorageService.migrateExistingData();
            
            console.log('[App] Attempting to load from URL using DataLoaderService...');
            const loadResult = await dataLoader.loadFromURL(urlParams);
            
            if (!loadResult.success) {
              throw new Error(loadResult.error || 'Failed to load data from URL');
            }
            
            // Compute merged data for UI display
            const mergedData = await dataMerger.computeMergedData();
            if (!mergedData) {
              throw new Error('Failed to compute merged data');
            }
            
            console.log('[App] Successfully loaded from URL using DataLoaderService:', {
              tokens: mergedData.tokens?.length || 0,
              collections: mergedData.tokenCollections?.length || 0,
              dimensions: mergedData.dimensions?.length || 0
            });
            
            // Update DataSourceManager with repository information
            dataSourceManager.updateRepositoryInfo('core', {
              fullName: repo,
              branch: branch,
              filePath: path,
              fileType: 'schema' as const
            });
            
            // Update StatePersistenceManager with repository context
            const stateManager = StatePersistenceManager.getInstance();
            stateManager.updateRepositoryContext({
              fullName: repo,
              branch: branch,
              filePath: path,
              fileType: 'schema'
            });
            
            // Set selectedRepoInfo for branch creation and other operations
            const repoInfo = {
              fullName: repo,
              branch: branch,
              filePath: path,
              fileType: 'schema' as const
            };
            setSelectedRepoInfo(repoInfo);
            
            // Save repository info to localStorage so other services can access it
            localStorage.setItem('github_selected_repo', JSON.stringify(repoInfo));
            
            // CRITICAL: Always initialize DataSourceManager from URL parameters
            // This ensures core repository information is properly set up
            dataSourceManager.initializeFromURL();
            
            // Initialize platform/theme selection from URL parameters
            if (platform) {
              // Switch to the specified platform
              await dataSourceManager.switchToPlatform(platform === 'none' ? null : platform);
            }
            
            if (theme) {
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
              const canActuallyEdit = hasWriteAccess && !isOnMainBranch; // Only edit on non-main branches
              
              // setHasEditPermissions(canShowEditButton); // Controls Edit button visibility
              setIsViewOnlyMode(!canActuallyEdit); // Controls actual editing capability
              
              // Update DataSourceManager permissions for all sources
              await dataSourceManager.updatePermissions();
            } else {
              // User is not authenticated, set view-only mode
              setIsViewOnlyMode(true);
              // setHasEditPermissions(false); // Controls Edit button visibility
            }
            
            // Update data source context AFTER platform/theme switching is complete
            const finalContext = dataSourceManager.getCurrentContext();
            console.log('[App] Setting final dataSourceContext after platform/theme switching:', {
              currentPlatform: finalContext.currentPlatform,
              currentTheme: finalContext.currentTheme,
              availablePlatforms: finalContext.availablePlatforms.length,
              availableThemes: finalContext.availableThemes.length,
              repositories: {
                core: finalContext.repositories.core?.fullName,
                platforms: Object.keys(finalContext.repositories.platforms),
                themes: Object.keys(finalContext.repositories.themes)
              }
            });
            setDataSourceContext(finalContext);
            
            // Update React state with merged data
            setCollections(mergedData.tokenCollections || []);
            // Extract modes from dimensions
            const allModes = mergedData.dimensions?.flatMap(d => d.modes || []) || [];
            setModes(allModes);
            setDimensions(mergedData.dimensions || []);
            setResolvedValueTypes(mergedData.resolvedValueTypes || []);
            setPlatforms(mergedData.platforms || []);
            setThemes(mergedData.themes || []);
            setTokens(mergedData.tokens || []);
            setTaxonomies(mergedData.taxonomies || []);
            setComponentProperties(mergedData.componentProperties || []);
            setComponentCategories(mergedData.componentCategories || []);
            setComponents(mergedData.components || []);
            // Algorithms are not part of TokenSystem, so we'll set empty array for now
            setAlgorithms([]);
            setTaxonomyOrder(mergedData.taxonomyOrder || []);
            setDimensionOrder(mergedData.dimensionOrder || []);
            
            // Update available sources after React state is updated with new data
            await dataSourceManager.updateAvailableSources();
            
            setLoading(false);
            setIsAppLoading(false); // End app loading state for URL loading
          } catch (urlError) {
            console.warn('[App] Failed to load from URL, falling back to default initialization:', urlError);
            
            // Ensure loading state is reset on error
            setLoading(false);
            setIsAppLoading(false);
            
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
            await dataSourceManager.updateAvailableSources();
            
            // Set dataSourceContext for fallback case
            const fallbackContext = dataSourceManager.getCurrentContext();
            console.log('[App] Setting fallback dataSourceContext:', {
              currentPlatform: fallbackContext.currentPlatform,
              currentTheme: fallbackContext.currentTheme,
              availablePlatforms: fallbackContext.availablePlatforms.length,
              availableThemes: fallbackContext.availableThemes.length
            });
            setDataSourceContext(fallbackContext);
            
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
            // GitHubCacheService.clearAll(); // Removed as per edit hint
            
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
          await dataSourceManager.updateAvailableSources();
          
          // Set dataSourceContext for default initialization
          const defaultContext = dataSourceManager.getCurrentContext();
          console.log('[App] Setting default dataSourceContext:', {
            currentPlatform: defaultContext.currentPlatform,
            currentTheme: defaultContext.currentTheme,
            availablePlatforms: defaultContext.availablePlatforms.length,
            availableThemes: defaultContext.availableThemes.length
          });
          setDataSourceContext(defaultContext);
          
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
      
      // Only update state if it has actually changed
      if (isConnected !== isGitHubConnected) {
        setIsGitHubConnected(isConnected);
      }
      
      if (JSON.stringify(currentUser) !== JSON.stringify(githubUser)) {
        setGithubUser(currentUser);
      }
      
      if (JSON.stringify(repoInfo) !== JSON.stringify(selectedRepoInfo)) {
        setSelectedRepoInfo(repoInfo);
      }
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
      // setHasEditPermissions(canShowEditButton); // Controls Edit button visibility
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
      
      // Ensure we're not in view-only mode after successful authentication
      // unless we're on a main branch
      const isOnMainBranch = isMainBranch(currentBranch);
      if (!isOnMainBranch) {
        setIsViewOnlyMode(false);
      }
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
  }, [currentBranch]); // Add currentBranch to dependencies

  useEffect(() => {
    // Create data options from the package exports
    const options = [
      { label: 'Example Minimal (with algorithms)', value: 'minimal', hasAlgorithms: true },
      { label: 'Core Data (with algorithms)', value: 'core', hasAlgorithms: true },
      { label: 'Brand A Overrides', value: 'brandAOverrides', hasAlgorithms: false },
      { label: 'Brand B Overrides', value: 'brandBOverrides', hasAlgorithms: false }
    ];
    // setDataOptions(options); // Removed as per edit hint
  }, []);

  // Removed loadDataFromSource function

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
    
    if (hasStoredData || hasGitHubData) {
      console.log('[App] Found existing data, not loading example data');
      setHasInitialized(true);
      
      // Even with existing data, we need to ensure DataSourceManager is properly initialized
      // This is especially important for theme permissions when no URL parameters are present
      const dataSourceManager = DataSourceManager.getInstance();
      dataSourceManager.updateAvailableSources().catch(error => {
        console.error('[App] Failed to update available sources:', error);
      });
      
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
  }, [hasInitialized]); // Removed dataSource, isGitHubConnected, hasInitialized from dependencies

  // Function to refresh data from storage (called when GitHub data is loaded)
  const refreshDataFromStorage = useCallback(() => {
    // Use DataManager to get merged data instead of direct storage access
    const dataManager = DataManager.getInstance();
    const presentationSnapshot = dataManager.getPresentationSnapshot();
    
    // Use merged data from presentation snapshot
    setCollections(presentationSnapshot.collections);
    setModes(presentationSnapshot.modes);
    setDimensions(presentationSnapshot.dimensions);
    setResolvedValueTypes(presentationSnapshot.resolvedValueTypes);
    setPlatforms(presentationSnapshot.platforms);
    setThemes(presentationSnapshot.themes);
    setTokens(presentationSnapshot.tokens);
    setTaxonomies(presentationSnapshot.taxonomies);
    setComponentProperties(presentationSnapshot.componentProperties);
    setComponentCategories(presentationSnapshot.componentCategories);
    setComponents(presentationSnapshot.components);
    setAlgorithms(presentationSnapshot.algorithms);
    setTaxonomyOrder(presentationSnapshot.taxonomyOrder);
    setDimensionOrder(presentationSnapshot.dimensionOrder);

    // Reset change tracking baseline for new data source
    const newBaselineData = {
      collections: presentationSnapshot.collections,
      modes: presentationSnapshot.modes,
      dimensions: presentationSnapshot.dimensions,
      resolvedValueTypes: presentationSnapshot.resolvedValueTypes,
      platforms: presentationSnapshot.platforms,
      themes: presentationSnapshot.themes,
      tokens: presentationSnapshot.tokens,
      taxonomies: presentationSnapshot.taxonomies,
      componentProperties: presentationSnapshot.componentProperties,
      componentCategories: presentationSnapshot.componentCategories,
      components: presentationSnapshot.components,
      algorithms: presentationSnapshot.algorithms,
      taxonomyOrder: presentationSnapshot.taxonomyOrder,
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
      console.log('[App] Initiating GitHub authentication');
      
      // Only clear OAuth state if user is already authenticated
      if (GitHubAuthService.isAuthenticated()) {
        console.log('[App] User already authenticated, clearing OAuth state before new auth');
        GitHubAuthService.clearOAuthState();
      }
      
      // Initiate the OAuth flow - this will store the current URL for return
      await GitHubAuthService.initiateAuth();
      
      // Note: initiateAuth() redirects to GitHub, so code after this won't execute
      // The state will be updated when the user returns from GitHub
    } catch (error) {
      console.error('[App] GitHub connection error:', error);
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
      // GitHubCacheService.clearAll(); // Removed as per edit hint
      
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

  const handleRefreshCurrentData = async (suppressToast = false) => {
    console.log('[App] handleRefreshCurrentData called');
    
    setIsAppLoading(true); // Start app loading state
    
    try {
      // Use the new RefreshManager for context-aware refresh
      await RefreshManager.refreshForManualRefresh();
      
      // Only show toast if not suppressed
      if (!suppressToast) {
        toast({
          title: 'Data Refreshed',
          description: 'Successfully refreshed data from GitHub',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
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
      
      // Save to local edits instead of old storage
      StorageService.updateLocalEditsTokens(updatedTokens);
      
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
      
      // Save to local edits instead of old storage
      StorageService.updateLocalEditsTokens(updatedTokens);
      
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
    
    // Save to local edits instead of old storage
    StorageService.updateLocalEditsTokens(updatedTokens);
    
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateCollections = (updatedCollections: TokenCollection[]) => {
    setCollections(updatedCollections);
    
    // Save to local edits instead of old storage
    StorageService.updateLocalEditsCollections(updatedCollections);
    
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateDimensions = (updatedDimensions: Dimension[]) => {
    setDimensions(updatedDimensions);
    
    // Save to local edits instead of old storage
    StorageService.updateLocalEditsDimensions(updatedDimensions);
    
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateResolvedValueTypes = (updatedResolvedValueTypes: ResolvedValueType[]) => {
    setResolvedValueTypes(updatedResolvedValueTypes);
    
    // Save to local edits instead of old storage
    StorageService.updateLocalEditsValueTypes(updatedResolvedValueTypes);
    
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
    dataSourceManager.updateAvailableSources().catch(error => {
      console.error('[App] Failed to update available sources:', error);
    });
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
    dataSourceManager.updateAvailableSources().catch(error => {
      console.error('[App] Failed to update available sources:', error);
    });
    if (GitHubAuthService.getCurrentUser()) {
      dataSourceManager.updatePermissions();
    }
    
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateTaxonomies = (updatedTaxonomies: Taxonomy[]) => {
    console.log('[App] handleUpdateTaxonomies called with:', {
      updatedTaxonomiesCount: updatedTaxonomies.length,
      updatedTaxonomies: updatedTaxonomies.map(t => ({ id: t.id, name: t.name })),
      currentTaxonomiesCount: taxonomies.length,
      currentTaxonomies: taxonomies.map(t => ({ id: t.id, name: t.name }))
    });
    
    setTaxonomies(updatedTaxonomies);
    StorageService.setTaxonomies(updatedTaxonomies);
    
    console.log('[App] State updated and saved to StorageService');
    
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



  // Helper function to intelligently select branch when switching sources
  const selectBranchForSourceSwitch = async (targetRepositoryFullName: string, currentBranchName: string): Promise<string> => {
    // If we're on main branch, always use main for the new repository
    if (isMainBranch(currentBranchName)) {
      return 'main';
    }
    
    try {
      // Check if the current branch exists in the target repository
      const branches = await BranchManager.loadBranchesForRepository(targetRepositoryFullName, true); // Force refresh
      
      // Look for a branch with the same name as the current branch
      const matchingBranch = branches.find((branchName: string) => branchName === currentBranchName);
      
      if (matchingBranch) {
        console.log(`[App] Found matching branch "${currentBranchName}" in repository "${targetRepositoryFullName}", using it`);
        return currentBranchName;
      } else {
        console.log(`[App] Branch "${currentBranchName}" not found in repository "${targetRepositoryFullName}", falling back to main`);
        return 'main';
      }
    } catch (error) {
      console.warn(`[App] Error checking branches for repository "${targetRepositoryFullName}", falling back to main:`, error);
      return 'main';
    }
  };

  // Data source change handlers
  const handlePlatformChange = async (platformId: string | null) => {
    setIsAppLoading(true); // Start app loading state
    try {
      // CRITICAL: Update URL FIRST before any data operations
      const url = new URL(window.location.href);
      if (platformId) {
        url.searchParams.set('platform', platformId);
      } else {
        url.searchParams.delete('platform');
      }
      window.history.replaceState({}, '', url.toString());
      
      // ENHANCED: Intelligent branch selection when switching sources
      let targetBranch = currentBranch; // Default to current branch
      
      if (platformId && !isMainBranch(currentBranch)) {
        // Switching TO a platform - check if current branch exists in platform repository
        const coreData = StorageService.getCoreData();
        const platform = coreData?.platforms?.find(p => p.id === platformId);
        const targetRepository = platform?.extensionSource?.repositoryUri;
        
        if (targetRepository) {
          // Intelligently select branch for the new repository
          targetBranch = await selectBranchForSourceSwitch(targetRepository, currentBranch);
          
          // Update URL with the selected branch
          const branchUrl = new URL(window.location.href);
          branchUrl.searchParams.set('branch', targetBranch);
          window.history.replaceState({}, '', branchUrl.toString());
          
          console.log(`[App] Platform switch: Selected branch "${targetBranch}" for repository "${targetRepository}"`);
        }
      } else if (!platformId && !isMainBranch(currentBranch)) {
        // Switching FROM a platform TO core data - check if current branch exists in core repository
        const urlParams = new URLSearchParams(window.location.search);
        const coreRepo = urlParams.get('repo');
        
        if (coreRepo) {
          // Intelligently select branch for the core repository
          targetBranch = await selectBranchForSourceSwitch(coreRepo, currentBranch);
          
          // Update URL with the selected branch
          const branchUrl = new URL(window.location.href);
          branchUrl.searchParams.set('branch', targetBranch);
          window.history.replaceState({}, '', branchUrl.toString());
          
          console.log(`[App] Platform switch to core: Selected branch "${targetBranch}" for repository "${coreRepo}"`);
        }
      }
      
      // Now proceed with data source switching (URL is already updated)
      const dataSourceManager = DataSourceManager.getInstance();
      await dataSourceManager.switchToPlatform(platformId);
      const newContext = dataSourceManager.getCurrentContext();
      setDataSourceContext(newContext);
      
      // CRITICAL FIX: Update UI data state with new merged data
      const dataMerger = DataMergerService.getInstance();
      const mergedData = await dataMerger.computeMergedData();
      
      if (mergedData) {
        // Update React state with new merged data
        setCollections(mergedData.tokenCollections || []);
        const allModes = mergedData.dimensions?.flatMap(d => d.modes || []) || [];
        setModes(allModes);
        setDimensions(mergedData.dimensions || []);
        setResolvedValueTypes(mergedData.resolvedValueTypes || []);
        setPlatforms(mergedData.platforms || []);
        setThemes(mergedData.themes || []);
        setTokens(mergedData.tokens || []);
        setTaxonomies(mergedData.taxonomies || []);
        setComponentProperties(mergedData.componentProperties || []);
        setComponentCategories(mergedData.componentCategories || []);
        setComponents(mergedData.components || []);
        setAlgorithms([]); // Algorithms are not part of TokenSystem
        setTaxonomyOrder(mergedData.taxonomyOrder || []);
        setDimensionOrder(mergedData.dimensionOrder || []);
        
              // CRITICAL: Store platforms and themes in StorageService so DataSourceManager can access them
      StorageService.setPlatforms(mergedData.platforms || []);
      StorageService.setThemes(mergedData.themes || []);
      
      // ENHANCED: Update current branch state if branch was changed during source switch
      if (targetBranch !== currentBranch) {
        setCurrentBranch(targetBranch);
        console.log(`[App] Platform switch: Updated current branch from "${currentBranch}" to "${targetBranch}"`);
        
        // CRITICAL: Refresh data to load from the new branch
        console.log('[App] Platform switch: Refreshing data to load from new branch');
        refreshDataFromStorage();
      }
      
      console.log('[App] Platform change completed - UI data updated:', {
        tokens: mergedData.tokens?.length || 0,
        collections: mergedData.tokenCollections?.length || 0,
        dimensions: mergedData.dimensions?.length || 0,
        selectedBranch: targetBranch
      });
      }
      
      // CRITICAL: Update permissions for the new data source context
      if (githubUser) {
        // Force refresh permissions after source switch to ensure accuracy
        await dataSourceManager.forceRefreshPermissions();
        const updatedContext = dataSourceManager.getCurrentContext();
        
        // Determine edit permissions based on current data source
        let hasWriteAccess = false;
        
        if (platformId) {
          // Platform extension selected - check platform permissions
          hasWriteAccess = updatedContext.permissions?.platforms?.[platformId] || false;
        } else if (updatedContext.currentTheme && updatedContext.currentTheme !== 'none') {
          // Theme override selected - check theme permissions
          hasWriteAccess = updatedContext.permissions?.themes?.[updatedContext.currentTheme] || false;
        } else {
          // Core data selected - check core permissions
          hasWriteAccess = updatedContext.permissions?.core || false;
        }
        
        // Branch-based governance: Show edit button if user has write access
        // But only allow actual editing on non-main branches
        const isOnMainBranch = isMainBranch(currentBranch);
        const canShowEditButton = hasWriteAccess; // Show button if user has write access
        const canActuallyEdit = hasWriteAccess && !isOnMainBranch; // Only edit on non-main branches
        
        // setHasEditPermissions(canShowEditButton); // Controls Edit button visibility
        setIsViewOnlyMode(!canActuallyEdit); // Controls actual editing capability
      }
      
      // Update change log data
      updateChangeLogData();
      
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
      // CRITICAL: Update URL FIRST before any data operations
      const url = new URL(window.location.href);
      if (themeId) {
        url.searchParams.set('theme', themeId);
      } else {
        url.searchParams.delete('theme');
      }
      window.history.replaceState({}, '', url.toString());
      
      // ENHANCED: Intelligent branch selection when switching sources
      let targetBranch = currentBranch; // Default to current branch
      
      if (themeId && !isMainBranch(currentBranch)) {
        // Switching TO a theme - check if current branch exists in theme repository
        const coreData = StorageService.getCoreData();
        const theme = coreData?.themes?.find(t => t.id === themeId);
        const targetRepository = theme?.overrideSource?.repositoryUri;
        
        if (targetRepository) {
          // Intelligently select branch for the new repository
          targetBranch = await selectBranchForSourceSwitch(targetRepository, currentBranch);
          
          // Update URL with the selected branch
          const branchUrl = new URL(window.location.href);
          branchUrl.searchParams.set('branch', targetBranch);
          window.history.replaceState({}, '', branchUrl.toString());
          
          console.log(`[App] Theme switch: Selected branch "${targetBranch}" for repository "${targetRepository}"`);
        }
      } else if (!themeId && !isMainBranch(currentBranch)) {
        // Switching FROM a theme TO core data - check if current branch exists in core repository
        const urlParams = new URLSearchParams(window.location.search);
        const coreRepo = urlParams.get('repo');
        
        if (coreRepo) {
          // Intelligently select branch for the core repository
          targetBranch = await selectBranchForSourceSwitch(coreRepo, currentBranch);
          
          // Update URL with the selected branch
          const branchUrl = new URL(window.location.href);
          branchUrl.searchParams.set('branch', targetBranch);
          window.history.replaceState({}, '', branchUrl.toString());
          
          console.log(`[App] Theme switch to core: Selected branch "${targetBranch}" for repository "${coreRepo}"`);
        }
      }
      
      // Now proceed with data source switching (URL is already updated)
      const dataSourceManager = DataSourceManager.getInstance();
      await dataSourceManager.switchToTheme(themeId);
      const newContext = dataSourceManager.getCurrentContext();
      setDataSourceContext(newContext);
      
      // CRITICAL FIX: Update UI data state with new merged data
      const dataMerger = DataMergerService.getInstance();
      const mergedData = await dataMerger.computeMergedData();
      
      if (mergedData) {
        // Update React state with new merged data
        setCollections(mergedData.tokenCollections || []);
        const allModes = mergedData.dimensions?.flatMap(d => d.modes || []) || [];
        setModes(allModes);
        setDimensions(mergedData.dimensions || []);
        setResolvedValueTypes(mergedData.resolvedValueTypes || []);
        setPlatforms(mergedData.platforms || []);
        setThemes(mergedData.themes || []);
        setTokens(mergedData.tokens || []);
        setTaxonomies(mergedData.taxonomies || []);
        setComponentProperties(mergedData.componentProperties || []);
        setComponentCategories(mergedData.componentCategories || []);
        setComponents(mergedData.components || []);
        setAlgorithms([]); // Algorithms are not part of TokenSystem
        setTaxonomyOrder(mergedData.taxonomyOrder || []);
        setDimensionOrder(mergedData.dimensionOrder || []);
        
              // CRITICAL: Store platforms and themes in StorageService so DataSourceManager can access them
      StorageService.setPlatforms(mergedData.platforms || []);
      StorageService.setThemes(mergedData.themes || []);
      
      // ENHANCED: Update current branch state if branch was changed during source switch
      if (targetBranch !== currentBranch) {
        setCurrentBranch(targetBranch);
        console.log(`[App] Theme switch: Updated current branch from "${currentBranch}" to "${targetBranch}"`);
        
        // CRITICAL: Refresh data to load from the new branch
        console.log('[App] Theme switch: Refreshing data to load from new branch');
        refreshDataFromStorage();
      }
      
      console.log('[App] Theme change completed - UI data updated:', {
        tokens: mergedData.tokens?.length || 0,
        collections: mergedData.tokenCollections?.length || 0,
        dimensions: mergedData.dimensions?.length || 0,
        selectedBranch: targetBranch
      });
      }
      
      // CRITICAL: Update permissions for the new data source context
      if (githubUser) {
        // Force refresh permissions after source switch to ensure accuracy
        await dataSourceManager.forceRefreshPermissions();
        const updatedContext = dataSourceManager.getCurrentContext();
        
        // Determine edit permissions based on current data source
        let hasWriteAccess = false;
        
        if (themeId) {
          // Theme override selected - check theme permissions
          hasWriteAccess = updatedContext.permissions?.themes?.[themeId] || false;
        } else if (updatedContext.currentPlatform && updatedContext.currentPlatform !== 'none') {
          // Platform extension selected - check platform permissions
          hasWriteAccess = updatedContext.permissions?.platforms?.[updatedContext.currentPlatform] || false;
        } else {
          // Core data selected - check core permissions
          hasWriteAccess = updatedContext.permissions?.core || false;
        }
        
        // Branch-based governance: Show edit button if user has write access
        // But only allow actual editing on non-main branches
        const isOnMainBranch = isMainBranch(currentBranch);
        const canShowEditButton = hasWriteAccess; // Show button if user has write access
        const canActuallyEdit = hasWriteAccess && !isOnMainBranch; // Only edit on non-main branches
        
        // setHasEditPermissions(canShowEditButton); // Controls Edit button visibility
        setIsViewOnlyMode(!canActuallyEdit); // Controls actual editing capability
      }
      
      // Update change log data
      updateChangeLogData();
      
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
  const handleBranchCreated = async (newBranchName: string, editMode?: boolean, repositoryInfo?: { fullName: string; filePath: string; fileType: string }) => {
    try {
      console.log('[App] handleBranchCreated called with:', newBranchName, 'editMode:', editMode, 'repositoryInfo:', repositoryInfo);
      
      // Get current source context
      const sourceContextManager = SourceContextManager.getInstance();
      const currentContext = sourceContextManager.getContext();
      
      console.log('[App] DataSourceManager current context:', DataSourceManager.getInstance().getCurrentContext());
      
      // Determine repository context for branch switching
      let repositoryContext: { fullName: string; branch: string; filePath: string; fileType: 'schema' | 'theme-override' | 'platform-extension' };
      
      if (repositoryInfo && repositoryInfo.fullName) {
        // Use repository info from BranchCreationDialog if available
        console.log('[App] Using repository info from BranchCreationDialog:', repositoryInfo);
        repositoryContext = {
          fullName: repositoryInfo.fullName,
          branch: 'main', // Start from main branch
          filePath: repositoryInfo.filePath,
          fileType: repositoryInfo.fileType as 'schema' | 'theme-override' | 'platform-extension'
        };
      } else if (currentContext?.repositoryInfo) {
        // Use current source context
        console.log('[App] Using current source context repository:', currentContext.repositoryInfo);
        repositoryContext = {
          fullName: currentContext.repositoryInfo.fullName,
          branch: currentContext.repositoryInfo.branch,
          filePath: currentContext.repositoryInfo.filePath,
          fileType: currentContext.repositoryInfo.fileType as 'schema' | 'theme-override' | 'platform-extension'
        };
      } else {
        // Fall back to core repository
        const dataSourceContext = DataSourceManager.getInstance().getCurrentContext();
        const coreRepo = dataSourceContext.repositories.core;
        console.log('[App] Using core repository:', coreRepo);
        
        if (!coreRepo) {
          throw new Error('No repository context available for branch switching');
        }
        
        repositoryContext = {
          fullName: coreRepo.fullName,
          branch: 'main',
          filePath: coreRepo.filePath,
          fileType: coreRepo.fileType as 'schema' | 'theme-override' | 'platform-extension'
        };
      }
      
      console.log('[App] Final repository context for branch switching:', repositoryContext);
      
      // Update state persistence with new repository context
      const statePersistenceManager = StatePersistenceManager.getInstance();
      statePersistenceManager.updateRepositoryContext(repositoryContext);
      
      // Switch to the new branch
      await BranchManager.switchToBranch(
        repositoryContext.fullName,
        newBranchName,
        true, // preserve context
        {
          ...repositoryContext,
          fileType: repositoryContext.fileType as 'schema' | 'theme-override' | 'platform-extension'
        }
      );
      
      // Update source context with new branch information
      if (currentContext) {
        const updatedContext = {
          ...currentContext,
          repositoryInfo: {
            ...currentContext.repositoryInfo,
            branch: newBranchName
          },
          editMode: {
            isActive: editMode || false,
            branchName: newBranchName
          }
        };
        sourceContextManager.setContext(updatedContext);
      }
      
      // Also update the SourceManagerService's source context with new branch information
      const sourceManager = SourceManagerService.getInstance();
      const sourceContext = sourceManager.getCurrentSourceContext();
      if (sourceContext) {
        const updatedSourceContext = {
          ...sourceContext,
          sourceRepository: {
            ...sourceContext.sourceRepository,
            branch: newBranchName
          },
          coreRepository: {
            ...sourceContext.coreRepository,
            branch: newBranchName
          }
        };
        StorageService.setSourceContext(updatedSourceContext);
      }
      
      // Enter edit mode if requested
      if (editMode) {
        // Map fileType to sourceType for EditModeManager
        const sourceType = repositoryContext.fileType === 'schema' ? 'core' : repositoryContext.fileType;
        EditModeManager.enterEditMode(newBranchName, sourceType);
        
        // CRITICAL: Update React state to enter edit mode
        setIsEditMode(true);
        setEditModeBranch(newBranchName);
        
        console.log(`[App] Entered edit mode on branch "${newBranchName}"`);
      }
      
      // CRITICAL: Update URL with the new branch name
      const url = new URL(window.location.href);
      url.searchParams.set('branch', newBranchName);
      window.history.replaceState({}, '', url.toString());
      
      console.log(`[App] Updated URL with new branch: ${newBranchName}`);
      
      // Update current branch state to reflect the new branch
      setCurrentBranch(newBranchName);
      
      // NOTE: BranchManager.switchToBranch() already calls RefreshManager.refreshForBranchSwitch()
      // No need for a second refresh call here
      
      console.log('[App] Branch creation and switching completed successfully');
      
    } catch (error) {
      console.error('[App] Error in handleBranchCreated:', error);
      toast({
        title: 'Error',
        description: `Failed to switch to new branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      
      // Ensure edit permissions are set correctly for non-main branches
      // if (hasEditPermissions) { // Controls Edit button visibility
      //   // User already has edit permissions, keep them
      //   console.log('[App] Entering edit mode on non-main branch with existing edit permissions');
      // } else {
        // Re-check permissions for the current branch
        console.log('[App] Re-checking edit permissions for non-main branch');
        // This will be handled by the permission check in the useEffect
      // }
      
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
      
      // Use the new EditModeManager for proper state management
      await EditModeManager.exitEditMode(true); // preserve repository context
      
      // Update local state - preserve current branch, just exit edit mode
      setIsEditMode(false);
      setEditModeBranch(null);
      
      // DO NOT change the branch - user should remain on current branch
      // URLStateManager.resetURLToMainBranch(); // REMOVED
      // setCurrentBranch('main'); // REMOVED
      
      toast({
        title: 'Edit Mode Exited',
        description: 'Changes discarded and returned to view mode',
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
      // Clear override tracking session
      OverrideTrackingService.clearSession();
      
      // Refresh data to discard changes
      await handleRefreshCurrentData(true); // Suppress "Data Refreshed" toast since we show "Discard Failed" toast on error
      
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

  // NEW: Unified edit permissions logic (same as Header.tsx)
  const hasDataSourceEditPermissions = useCallback(() => {
    // Check if user is authenticated
    if (!githubUser) {
      return false;
    }
    
    // Check if we have a valid source context with repository information
    const sourceManager = SourceManagerService.getInstance();
    const sourceContext = sourceManager.getCurrentSourceContext();
    if (!sourceContext) {
      return false;
    }
    
    // If already in edit mode, user has permissions
    if (sourceContext.editMode?.isActive) {
      return true;
    }
    
    // Check actual permissions from the data source manager
    const dataSourceManager = DataSourceManager.getInstance();
    return dataSourceManager.getCurrentEditPermissions();
  }, [githubUser]);

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
        {/* Routes must be outside conditional rendering to handle callback URLs */}
        <Routes>
          <Route path="/auth/github/callback" element={<GitHubCallback />} />
          <Route path="/callback" element={<GitHubCallback />} />
          <Route path="/" element={
            <Box flex="1" position="relative">
              {shouldShowHomepage() ? (
                <Homepage
                  isGitHubConnected={isGitHubConnected}
                  githubUser={githubUser}
                  selectedRepoInfo={selectedRepoInfo}
                  onGitHubConnect={handleGitHubConnect}
                  onGitHubDisconnect={handleGitHubDisconnect}
                />
              ) : (
                <AppLayout
                  // dataSource={dataSource} // Removed as per edit hint
                  // setDataSource={setDataSource} // Removed as per edit hint
                  // dataOptions={dataOptions} // Removed as per edit hint
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
                  hasEditPermissions={hasDataSourceEditPermissions} // Pass the new function
                >
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
                    dataSourceContext={dataSourceContext}
                    isAppLoading={isAppLoading}
                    canEdit={isEditMode} // Controls Edit button visibility
                    hasEditPermissions={hasDataSourceEditPermissions} // Pass the unified function
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
          } />
          <Route path="*" element={<div />} />
        </Routes>

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

