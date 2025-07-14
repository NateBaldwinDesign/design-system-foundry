import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  ChakraProvider,
  Spinner,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody
} from '@chakra-ui/react';
import {
  TokenCollection,
  Mode,
  Dimension,
  Platform,
  Taxonomy,
  Theme,
  ResolvedValueType,
  exampleData,
  algorithmData
} from '@token-model/data-model';
import { StorageService } from './services/storage';
import { Algorithm } from './types/algorithm';
import './App.css';
import { AppLayout, DATA_CHANGE_EVENT } from './components/AppLayout';
import theme from './theme';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useSchema } from './hooks/useSchema';
import { GitHubCallback } from './components/GitHubCallback';
import { GitHubAuthService } from './services/githubAuth';
import { GitHubApiService } from './services/githubApi';
import type { GitHubUser } from './config/github';
import type { ExtendedToken } from './components/TokenEditorDialog';
import { ChangeLog } from './components/ChangeLog';
import { useViewState } from './hooks/useViewState';
import { ViewRenderer } from './components/ViewRenderer';
import { ChangeTrackingService } from './services/changeTrackingService';
import { DataManager, type DataSnapshot } from './services/dataManager';

const App = () => {
  const { schema } = useSchema();
  const [dataSource, setDataSource] = useState<string>('minimal');
  const [collections, setCollections] = useState<TokenCollection[]>([]);
  const [modes, setModes] = useState<Mode[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [resolvedValueTypes, setResolvedValueTypes] = useState<ResolvedValueType[]>([]);
  const [tokens, setTokens] = useState<ExtendedToken[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
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
    fileType: 'schema' | 'theme-override';
  } | null>(null);
  const toast = useToast();

  const [changeLogData, setChangeLogData] = useState<{ currentData: Record<string, unknown>; baselineData: Record<string, unknown> | null }>({ currentData: {}, baselineData: null });
  const [isOpen, setIsOpen] = useState(false);
  const { currentView, navigateToView } = useViewState();

  // Helper function to create a data snapshot for change tracking
  const createDataSnapshot = useCallback(() => {
    return {
      collections: StorageService.getCollections(),
      modes: StorageService.getModes(),
      dimensions: StorageService.getDimensions(),
      resolvedValueTypes: StorageService.getValueTypes(),
      platforms: StorageService.getPlatforms(),
      themes: StorageService.getThemes(),
      tokens: StorageService.getTokens(),
      taxonomies: StorageService.getTaxonomies(),
      algorithms: StorageService.getAlgorithms(),
      namingRules: StorageService.getNamingRules(),
      dimensionOrder: StorageService.getDimensionOrder(),
      algorithmFile: StorageService.getAlgorithmFile(),
    };
  }, []);

  // Helper function to update change log data
  const updateChangeLogData = useCallback(() => {
    const currentSnapshot = createDataSnapshot();
    // Get the current baseline data from ChangeTrackingService to ensure we have the latest
    const baselineSnapshot = ChangeTrackingService.getBaselineDataSnapshot();
    setChangeLogData({
      currentData: currentSnapshot,
      baselineData: baselineSnapshot
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
            setAlgorithms(snapshot.algorithms);
            setTaxonomyOrder(snapshot.namingRules.taxonomyOrder);
            setDimensionOrder(snapshot.dimensionOrder);
            
            // Update change log data
            setChangeLogData({
              currentData: snapshot as unknown as Record<string, unknown>,
              baselineData: snapshot as unknown as Record<string, unknown>
            });
            
            setLoading(false);
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
            setAlgorithms(snapshot.algorithms);
            setTaxonomyOrder(snapshot.namingRules.taxonomyOrder);
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
        
        // Initialize data manager
        await dataManager.initialize(callbacks);
        
        // Initialize GitHub state
        const currentUser = GitHubAuthService.getCurrentUser();
        const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
        setGithubUser(currentUser);
        setSelectedRepoInfo(repoInfo);
        
      } catch (error) {
        console.error('[App] Error initializing data manager:', error);
        setLoading(false);
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
      
      setIsGitHubConnected(isConnected);
      setGithubUser(currentUser);
      setSelectedRepoInfo(repoInfo);
    };

    checkGitHubConnection();
    
    // Listen for storage changes to detect GitHub data updates
    const handleStorageChange = () => {
      checkGitHubConnection();
    };

    // Listen for GitHub file loaded events from GitHubCallback
    const handleGitHubFileLoaded = () => {
      checkGitHubConnection();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('github:file-loaded', handleGitHubFileLoaded);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('github:file-loaded', handleGitHubFileLoaded);
    };
  }, []);

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
  }, []);

  useEffect(() => {
    // Only load example data if:
    // 1. We have a dataSource set
    // 2. We're not connected to GitHub
    // 3. We don't have any stored data
    // 4. We don't have GitHub repository info stored
    const dataManager = DataManager.getInstance();
    const hasStoredData = dataManager.hasExistingData();
    const hasGitHubData = GitHubApiService.hasSelectedRepository();
    
    if (dataSource && !isGitHubConnected && !hasStoredData && !hasGitHubData) {
      console.log('[App] Loading example data - no existing data found');
      loadDataFromSource(dataSource);
    } else if (hasStoredData || hasGitHubData) {
      console.log('[App] Found existing data, not loading example data');
      setLoading(false);
    }
  }, [dataSource, isGitHubConnected, loadDataFromSource]);

  // Function to refresh data from storage (called when GitHub data is loaded)
  const refreshDataFromStorage = () => {
    const storedCollections = StorageService.getCollections();
    const storedModes = StorageService.getModes();
    const storedDimensions = StorageService.getDimensions();
    const storedResolvedValueTypes = StorageService.getValueTypes();
    const storedPlatforms = StorageService.getPlatforms();
    const storedThemes = StorageService.getThemes();
    const storedTokens = StorageService.getTokens();
    const storedTaxonomies = StorageService.getTaxonomies();
    const storedAlgorithms = StorageService.getAlgorithms();
    const storedNamingRules = StorageService.getNamingRules();

    setCollections(storedCollections);
    setModes(storedModes);
    setDimensions(storedDimensions);
    setResolvedValueTypes(storedResolvedValueTypes);
    setPlatforms(storedPlatforms);
    setThemes(storedThemes);
    setTokens(storedTokens);
    setTaxonomies(storedTaxonomies);
    setAlgorithms(storedAlgorithms);
    setTaxonomyOrder(storedNamingRules.taxonomyOrder);

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
      algorithms: storedAlgorithms,
      namingRules: storedNamingRules,
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
  };

  // Expose refresh function globally for GitHub components to call
  useEffect(() => {
    (window as Window & { refreshAppData?: () => void }).refreshAppData = refreshDataFromStorage;
    return () => {
      delete (window as Window & { refreshAppData?: () => void }).refreshAppData;
    };
  }, []);

  // Listen for data change events to update change log data
  useEffect(() => {
    const handleDataChange = () => {
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
      // Only clear OAuth state if user is already authenticated
      // This prevents clearing valid OAuth state during the callback process
      if (GitHubAuthService.isAuthenticated()) {
        console.log('User already authenticated, clearing OAuth state before new auth');
        GitHubAuthService.clearOAuthState();
      }
      
      // Initiate the OAuth flow
      await GitHubAuthService.initiateAuth();
      
      // Note: initiateAuth() redirects to GitHub, so code after this won't execute
      // The state will be updated when the user returns from GitHub
      
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
      title: 'Disconnected',
      description: 'Successfully disconnected from GitHub.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleFileSelected = async (fileContent: Record<string, unknown>, fileType: 'schema' | 'theme-override') => {
    console.log('[App] handleFileSelected called with:', { fileType, fileContent });
    
    try {
      const dataManager = DataManager.getInstance();
      
      // Load data via DataManager
      await dataManager.loadFromGitHub(fileContent, fileType);
      
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
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateThemes = (updatedThemes: Theme[]) => {
    setThemes(updatedThemes);
    StorageService.setThemes(updatedThemes);
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

  const handleUpdateAlgorithms = (updatedAlgorithms: Algorithm[]) => {
    setAlgorithms(updatedAlgorithms);
    StorageService.setAlgorithms(updatedAlgorithms);
    // Update change log data
    updateChangeLogData();
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
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
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <Box h="100vh" display="flex" flexDirection="column">
          <Box flex="1" position="relative">
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
              currentView={currentView}
              onNavigate={navigateToView}
            >
              <Routes>
                <Route path="/auth/github/callback" element={<GitHubCallback />} />
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
                algorithms={algorithms}
                dimensionOrder={dimensionOrder}
                taxonomyOrder={taxonomyOrder}
                schema={schema}
                onUpdateTokens={handleUpdateTokens}
                onUpdateCollections={handleUpdateCollections}
                onUpdateDimensions={handleUpdateDimensions}
                onUpdateResolvedValueTypes={handleUpdateResolvedValueTypes}
                onUpdatePlatforms={handleUpdatePlatforms}
                onUpdateThemes={handleUpdateThemes}
                onUpdateTaxonomies={handleUpdateTaxonomies}
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
          </Box>
        </Box>
      </BrowserRouter>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        size="xl" 
        scrollBehavior="inside"
        closeOnOverlayClick={true}
        closeOnEsc={true}
        isCentered={true}
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Change History</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <ChangeLog 
              previousData={changeLogData?.baselineData}
              currentData={changeLogData?.currentData}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </ChakraProvider>
  );
};

export default App; 