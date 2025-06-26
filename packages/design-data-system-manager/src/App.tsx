import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  ChakraProvider,
  Spinner,
  Button,
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
  Token,
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
import { GitHubSaveService } from './services/githubSave';
import { createUniqueId } from './utils/id';
import { getDefaultValueForType } from './utils/valueTypeUtils';

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
  const [baselineData, setBaselineData] = useState<Record<string, unknown> | null>(null);
  const [changeLogData] = useState<{ currentData: Record<string, unknown>; baselineData: Record<string, unknown> | null }>({ currentData: {}, baselineData: null });
  const [isOpen, setIsOpen] = useState(false);
  const { currentView, navigateToView } = useViewState();

  // Initialize data from storage on mount
  useEffect(() => {
    // Load all data from storage once on mount
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

    // Set baselineData to the loaded data
    setBaselineData({
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
    });

    // Initialize GitHub state
    const currentUser = GitHubAuthService.getCurrentUser();
    const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
    setGithubUser(currentUser);
    setSelectedRepoInfo(repoInfo);

    setLoading(false);
  }, []); // Only run once on mount

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
      
      // Load core data from package
      const coreDataModule = await exampleData[dataSourceKey as keyof typeof exampleData]();
      const coreData = coreDataModule.default || coreDataModule;
      
      // Load algorithm data if available
      let loadedAlgorithms: Algorithm[] | null = null;
      let algorithmFile: Record<string, unknown> | null = null;
      try {
        const algorithmModule = await algorithmData[dataSourceKey as keyof typeof algorithmData]();
        if (algorithmModule && algorithmModule.default) {
          console.log('[App] Algorithm module loaded:', algorithmModule.default);
          // Store the complete algorithm file structure
          algorithmFile = algorithmModule.default as Record<string, unknown>;
          // Cast the algorithm data to the correct type
          loadedAlgorithms = (algorithmModule.default.algorithms || []) as Algorithm[];
          console.log('[App] Loaded algorithms:', loadedAlgorithms);
        } else {
          console.log('[App] No algorithm data available for this data source');
          loadedAlgorithms = null;
        }
      } catch (algorithmError) {
        console.log('[App] No algorithm data available for:', dataSourceKey);
      }

      const d = coreData as LoadedData;

      // Use a type for the loaded data
      type LoadedData = {
        tokenCollections?: TokenCollection[];
        dimensions?: Dimension[];
        tokens?: Token[];
        platforms?: Platform[];
        themes?: Theme[];
        taxonomies?: Taxonomy[];
        resolvedValueTypes?: ResolvedValueType[];
        namingRules?: { taxonomyOrder?: string[] };
        versionHistory?: unknown[];
        systemName?: string;
        systemId?: string;
        description?: string;
        version?: string;
      };

      const normalizedCollections = d.tokenCollections ?? [];
      const normalizedDimensions = d.dimensions ?? [];
      const normalizedTokens = (d.tokens ?? []).map((token: Token) => ({
        ...token,
        valuesByMode: token.valuesByMode
      }));
      const normalizedPlatforms = d.platforms ?? [];
      const normalizedThemes = (d.themes ?? []).map((theme: Theme) => ({
        id: theme.id,
        displayName: theme.displayName,
        isDefault: theme.isDefault ?? false,
        description: theme.description
      }));
      const normalizedTaxonomies = d.taxonomies ?? [];
      const normalizedResolvedValueTypes = d.resolvedValueTypes ?? [];
      const normalizedNamingRules = {
        taxonomyOrder: d.namingRules?.taxonomyOrder ?? []
      };
      const normalizedVersionHistory = (d.versionHistory ?? []) as Array<{
        version: string;
        dimensions: string[];
        date: string;
        migrationStrategy?: {
          emptyModeIds: string;
          preserveOriginalValues: boolean;
        };
      }>;
      const systemName = d.systemName ?? 'Design System';
      const systemId = d.systemId ?? 'design-system';
      const description = d.description ?? 'A comprehensive design system with tokens, dimensions, and themes';
      const version = d.version ?? '1.0.0';

      const allModes: Mode[] = normalizedDimensions.flatMap((d: Dimension) => (d as { modes?: Mode[] }).modes || []);

      // Set React state
      setCollections(normalizedCollections);
      setModes(allModes);
      setDimensions(normalizedDimensions);
      setResolvedValueTypes(normalizedResolvedValueTypes);
      setTokens(normalizedTokens as ExtendedToken[]);
      setPlatforms(normalizedPlatforms);
      setThemes(normalizedThemes);
      setTaxonomies(normalizedTaxonomies);
      setTaxonomyOrder(normalizedNamingRules.taxonomyOrder);
      
      // Set algorithms state if algorithm data was loaded
      if (loadedAlgorithms) {
        console.log('[App] Loading', loadedAlgorithms.length, 'algorithms');
        // Cast to Algorithm[] to handle type differences between loaded data and Algorithm interface
        setAlgorithms(loadedAlgorithms as Algorithm[]);
        StorageService.setAlgorithms(loadedAlgorithms as Algorithm[]);
        // Store the complete algorithm file structure to preserve config and metadata
        if (algorithmFile) {
          StorageService.setAlgorithmFile(algorithmFile);
        }
        console.log(`Loaded ${loadedAlgorithms.length} algorithms from ${dataSourceKey}`);
      } else {
        // Clear algorithms if no algorithm data was found
        console.log('[App] No algorithm data found, clearing algorithms state');
        setAlgorithms([]);
        StorageService.setAlgorithms([]);
        // Clear algorithm file by removing it from localStorage
        localStorage.removeItem('token-model:algorithm-file');
      }
      
      setLoading(false);

      // Store in localStorage via StorageService
      StorageService.setCollections(normalizedCollections);
      StorageService.setModes(allModes);
      StorageService.setDimensions(normalizedDimensions);
      StorageService.setValueTypes(normalizedResolvedValueTypes);
      StorageService.setTokens(normalizedTokens);
      StorageService.setPlatforms(normalizedPlatforms);
      StorageService.setThemes(normalizedThemes);
      StorageService.setTaxonomies(normalizedTaxonomies);
      StorageService.setNamingRules(normalizedNamingRules);

      // Store root-level data in localStorage
      StorageService.setRootData({
        systemName,
        systemId,
        description,
        version,
        versionHistory: normalizedVersionHistory
      });
      
      // Reset change tracking baseline for new data source
      const newBaselineData = {
        collections: normalizedCollections,
        modes: allModes,
        dimensions: normalizedDimensions,
        resolvedValueTypes: normalizedResolvedValueTypes,
        platforms: normalizedPlatforms,
        themes: normalizedThemes,
        tokens: normalizedTokens,
        taxonomies: normalizedTaxonomies,
        algorithms: loadedAlgorithms || [],
        namingRules: normalizedNamingRules,
      };
      setBaselineData(newBaselineData);
      
      // Dispatch event to notify change detection that new data has been loaded
      window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
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
    if (dataSource && !isGitHubConnected) {
      // Always load the selected data source when not connected to GitHub
      loadDataFromSource(dataSource);
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
    setBaselineData(newBaselineData);

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

  const handleResetData = () => {
    // Clear all localStorage data
    localStorage.clear();
    sessionStorage.clear();
    StorageService.clearAll();
    setTokens([]);
    setCollections([]);
    setModes([]);
    setDimensions([]);
    setResolvedValueTypes([]);
    setPlatforms([]);
    setThemes([]);
    setTaxonomies([]);
    setTaxonomyOrder([]);
    setAlgorithms([]);
    setBaselineData({
      collections: [],
      modes: [],
      dimensions: [],
      resolvedValueTypes: [],
      platforms: [],
      themes: [],
      tokens: [],
      taxonomies: [],
      algorithms: [],
      namingRules: { taxonomyOrder: [] },
    });
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
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

  const handleFileSelected = () => {
    // Implementation will be added when needed
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
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateCollections = (updatedCollections: TokenCollection[]) => {
    setCollections(updatedCollections);
    StorageService.setCollections(updatedCollections);
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateDimensions = (updatedDimensions: Dimension[]) => {
    setDimensions(updatedDimensions);
    StorageService.setDimensions(updatedDimensions);
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateResolvedValueTypes = (updatedResolvedValueTypes: ResolvedValueType[]) => {
    setResolvedValueTypes(updatedResolvedValueTypes);
    StorageService.setValueTypes(updatedResolvedValueTypes);
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdatePlatforms = (updatedPlatforms: Platform[]) => {
    setPlatforms(updatedPlatforms);
    StorageService.setPlatforms(updatedPlatforms);
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateThemes = (updatedThemes: Theme[]) => {
    setThemes(updatedThemes);
    StorageService.setThemes(updatedThemes);
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateTaxonomies = (updatedTaxonomies: Taxonomy[]) => {
    setTaxonomies(updatedTaxonomies);
    StorageService.setTaxonomies(updatedTaxonomies);
    // Dispatch event to notify change detection
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
  };

  const handleUpdateAlgorithms = (updatedAlgorithms: Algorithm[]) => {
    setAlgorithms(updatedAlgorithms);
    StorageService.setAlgorithms(updatedAlgorithms);
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
              currentData={changeLogData?.currentData}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </ChakraProvider>
  );
};

export default App; 