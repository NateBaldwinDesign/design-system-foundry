import React, { useState, useEffect } from 'react';
import {
  Box,
  ChakraProvider,
  Spinner,
  Button,
  useToast
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
import ThemesView from './views/themes/ThemesView';
import DashboardView from './views/dashboard/DashboardView';
import './App.css';
import { AppLayout } from './components/AppLayout';
import theme from './theme';
import { TokensView } from './views/tokens/TokensView';
import { CollectionsView } from './views/tokens/CollectionsView';
import AlgorithmsView from './views/tokens/AlgorithmsView';
import { PlatformsView } from './views/publishing/PlatformsView';
import { ValidationView } from './views/publishing/ValidationView';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CoreDataView from './views/schemas/CoreDataView';
import ThemeOverridesView from './views/schemas/ThemeOverridesView';
import { Plus } from 'lucide-react';
import { TokenEditorDialog, ExtendedToken } from './components/TokenEditorDialog';
import { useSchema } from './hooks/useSchema';
import { TokenAnalysis } from './views/tokens/TokenAnalysis';
import { DimensionsView } from './views/setup/DimensionsView';
import { ClassificationView } from './views/setup/ClassificationView';
import { NamingRulesView } from './views/setup/NamingRulesView';
import { ValueTypesView } from './views/setup/ValueTypesView';

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
  const toast = useToast();

  // Add effect to save resolved value types to storage when they change
  useEffect(() => {
    if (resolvedValueTypes.length > 0) {
      StorageService.setValueTypes(resolvedValueTypes);
    }
  }, [resolvedValueTypes]);

  // Add effect to reload collections from storage when they change
  useEffect(() => {
    const storedCollections = StorageService.getCollections();
    if (JSON.stringify(storedCollections) !== JSON.stringify(collections)) {
      setCollections(storedCollections);
    }
  }, [collections]);

  // Add effect to reload tokens from storage periodically and on window focus
  useEffect(() => {
    const reloadTokens = () => {
      const storedTokens = StorageService.getTokens();
      setTokens(prevTokens => {
        if (JSON.stringify(storedTokens) !== JSON.stringify(prevTokens)) {
          return storedTokens;
        }
        return prevTokens;
      });
    };

    // Reload on window focus (when user returns to the app)
    const handleFocus = () => {
      reloadTokens();
    };

    // Reload periodically (every 2 seconds)
    const interval = setInterval(reloadTokens, 2000);

    // Initial load
    reloadTokens();

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Add effect to reload taxonomies from storage when they change
  useEffect(() => {
    const reloadTaxonomies = () => {
      const storedTaxonomies = StorageService.getTaxonomies();
      setTaxonomies(prevTaxonomies => {
        if (JSON.stringify(storedTaxonomies) !== JSON.stringify(prevTaxonomies)) {
          return storedTaxonomies;
        }
        return prevTaxonomies;
      });
    };

    // Reload on window focus (when user returns to the app)
    const handleFocus = () => {
      reloadTaxonomies();
    };

    // Reload periodically (every 2 seconds)
    const interval = setInterval(reloadTaxonomies, 2000);

    // Initial load
    reloadTaxonomies();

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
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

  // Update dimension order when dimensions change
  useEffect(() => {
    const currentIds = dimensions.map(d => d.id);
    const newOrder = dimensionOrder.filter(id => currentIds.includes(id));
    // Add any new dimensions to the end
    currentIds.forEach(id => {
      if (!newOrder.includes(id)) {
        newOrder.push(id);
      }
    });
    if (JSON.stringify(newOrder) !== JSON.stringify(dimensionOrder)) {
      setDimensionOrder(newOrder);
      StorageService.setDimensionOrder(newOrder);
    }
  }, [dimensions]);

  const loadDataFromSource = async (dataSourceKey: string) => {
    try {
      console.log('[App] Loading data from package source:', dataSourceKey);
      
      // Load core data from package
      const coreDataModule = await exampleData[dataSourceKey as keyof typeof exampleData]();
      const coreData = coreDataModule.default || coreDataModule;
      
      // Load algorithm data if available
      let loadedAlgorithms: Algorithm[] | null = null;
      try {
        const algorithmModule = await algorithmData[dataSourceKey as keyof typeof algorithmData]();
        if (algorithmModule && algorithmModule.default) {
          console.log('[App] Algorithm module loaded:', algorithmModule.default);
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
      const normalizedVersionHistory = d.versionHistory ?? [];
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
        console.log(`Loaded ${loadedAlgorithms.length} algorithms from ${dataSourceKey}`);
      } else {
        // Clear algorithms if no algorithm data was found
        console.log('[App] No algorithm data found, clearing algorithms state');
        setAlgorithms([]);
        StorageService.setAlgorithms([]);
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
      const root = {
        systemName,
        systemId,
        description,
        version,
        versionHistory: normalizedVersionHistory
      };
      localStorage.setItem('token-model:root', JSON.stringify(root));
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
  };

  useEffect(() => {
    if (dataSource) {
      loadDataFromSource(dataSource);
    }
  }, [dataSource]);

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
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    window.location.reload();
  };

  const handleAddToken = () => {
    if (!collections.length) {
      toast({
        title: "No collections available",
        description: "Please create a collection first before adding tokens.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setSelectedToken({
      id: '',
      displayName: '',
      description: '',
      tokenCollectionId: collections[0].id,
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
    setTokens((prevTokens: ExtendedToken[]) => {
      let updatedTokens;
      if (token.id) {
        updatedTokens = prevTokens.map((t: ExtendedToken) => t.id === token.id ? token : t);
      } else {
        updatedTokens = [...prevTokens, { ...token, id: `token-${Date.now()}` }];
      }
      StorageService.setTokens(updatedTokens);
      return updatedTokens;
    });
    handleCloseEditor();
  };

  const handleDeleteToken = (tokenId: string) => {
    const tokenToDelete = tokens.find(t => t.id === tokenId);
    setTokens(prevTokens => {
      const updatedTokens = prevTokens.filter(t => t.id !== tokenId);
      StorageService.setTokens(updatedTokens);
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
            >
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardView />} />
                <Route path="/tokens" element={<Navigate to="/tokens/tokens" replace />} />
                <Route path="/tokens/tokens" element={
                  <>
                    <TokensView
                      tokens={tokens}
                      collections={collections}
                      resolvedValueTypes={resolvedValueTypes}
                      modes={modes}
                      taxonomies={taxonomies}
                      renderAddTokenButton={
                        <Button colorScheme="blue" size="sm" onClick={handleAddToken} leftIcon={<Plus />}>
                          Add Token
                        </Button>
                      }
                      onEditToken={(token) => {
                        setSelectedToken(token);
                        setIsEditorOpen(true);
                      }}
                    />
                    {isEditorOpen && selectedToken && (
                      <TokenEditorDialog
                        token={selectedToken}
                        tokens={tokens}
                        dimensions={dimensions}
                        modes={modes}
                        platforms={platforms}
                        open={isEditorOpen}
                        onClose={handleCloseEditor}
                        onSave={handleSaveToken}
                        taxonomies={taxonomies}
                        resolvedValueTypes={resolvedValueTypes}
                        isNew={!selectedToken.id}
                        onViewClassifications={() => {}}
                        onDeleteToken={handleDeleteToken}
                        collections={collections}
                        schema={schema}
                      />
                    )}
                  </>
                } />
                <Route path="/tokens/collections" element={<CollectionsView collections={collections} onUpdate={setCollections} tokens={tokens} resolvedValueTypes={resolvedValueTypes} />} />
                <Route path="/tokens/algorithms" element={<AlgorithmsView algorithms={algorithms} />} />
                <Route path="/tokens/analysis" element={<TokenAnalysis />} />
                <Route path="/schemas" element={<Navigate to="/schemas/core-data" replace />} />
                <Route path="/schemas/core-data" element={<CoreDataView />} />
                <Route path="/schemas/theme-overrides" element={<ThemeOverridesView />} />
                <Route path="/setup" element={<Navigate to="/dimensions" replace />} />
                <Route path="/dimensions" element={
                  <DimensionsView 
                    dimensions={dimensions} 
                    setDimensions={setDimensions}
                    dimensionOrder={dimensionOrder}
                    setDimensionOrder={setDimensionOrder}
                    onDataChange={(data) => {
                      setDimensions(data.dimensions);
                      setDimensionOrder(data.dimensionOrder);
                      StorageService.setDimensionOrder(data.dimensionOrder);
                    }}
                  />
                } />
                <Route path="/classification" element={<ClassificationView taxonomies={taxonomies} setTaxonomies={setTaxonomies} />} />
                <Route path="/naming-rules" element={<NamingRulesView taxonomies={taxonomies} taxonomyOrder={taxonomyOrder} setTaxonomyOrder={setTaxonomyOrder} />} />
                <Route path="/value-types" element={<ValueTypesView valueTypes={resolvedValueTypes} onUpdate={setResolvedValueTypes} />} />
                <Route path="/themes" element={<ThemesView themes={themes} setThemes={setThemes} />} />
                <Route path="/publishing" element={<Navigate to="/platforms" replace />} />
                <Route path="/platforms" element={<PlatformsView platforms={platforms} setPlatforms={setPlatforms} tokens={tokens} setTokens={setTokens} taxonomies={taxonomies} />} />
                <Route path="/export-settings" element={<Box p={4}>Export settings content coming soon...</Box>} />
                <Route path="/validation" element={<ValidationView tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} taxonomies={taxonomies} version="1.0.0" versionHistory={[]} onValidate={() => {}} />} />
                <Route path="/version-history" element={<Box p={4}>Version history content coming soon...</Box>} />
                <Route path="/access" element={<Box p={4}>Access management coming soon...</Box>} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </AppLayout>
          </Box>
        </Box>
      </BrowserRouter>
    </ChakraProvider>
  );
};

export default App; 