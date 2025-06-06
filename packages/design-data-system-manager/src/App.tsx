import React, { useState, useEffect } from 'react';
import {
  Box,
  ChakraProvider,
  Spinner,
  Button,
} from '@chakra-ui/react';
import {
  TokenCollection,
  Mode,
  Token,
  Dimension,
  Platform,
  Taxonomy,
  Theme,
  ResolvedValueType
} from '@token-model/data-model';
import { StorageService } from './services/storage';
import ThemesView from './views/themes/ThemesView';
import { DashboardView } from './views/dashboard/DashboardView';
import './App.css';
import { AppLayout } from './components/AppLayout';
import { TokensView } from './views/tokens/TokensView';
import { CollectionsView } from './views/tokens/CollectionsView';
import AlgorithmsView from './views/tokens/AlgorithmsView';
import { PlatformsView } from './views/publishing/PlatformsView';
import ValidationView from './views/publishing/ValidationView';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CoreDataView from './views/schemas/CoreDataView';
import ThemeOverridesView from './views/schemas/ThemeOverridesView';
import { Plus } from 'lucide-react';
import { TokenEditorDialog } from './components/TokenEditorDialog';
import { useToast as useCustomToast } from './hooks/useToast';
import { DimensionsView } from './views/setup/DimensionsView';
import { ClassificationView } from './views/setup/ClassificationView';
import { NamingRulesView } from './views/setup/NamingRulesView';
import { ValueTypesView } from './views/setup/ValueTypesView';
import system from './theme';


// TypeScript declaration for import.meta.glob
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const exampleDataFiles = import.meta.glob('../../data-model/examples/**/*.json', { as: 'raw' });

interface ExtendedToken extends Omit<Token, 'valuesByMode' | 'private'> {
  valuesByMode: Array<{
    modeIds: string[];
    value: { value?: unknown; tokenId?: string };
    metadata?: Record<string, unknown>;
    platformOverrides?: Array<{ platformId: string; value: string }>;
  }>;
  themeable: boolean;
  private: boolean;
  tokenCollectionId: string;
  taxonomies: TokenTaxonomyRef[];
}

function getDataSourceOptions() {
  return Object.keys(exampleDataFiles).map((filePath) => {
    // Extract just the file name (no directory, no extension)
    const fileName = filePath.split('/').pop()?.replace(/\.json$/, '') || filePath;
    // Capitalize first letter and replace dashes/underscores with spaces
    const label = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, value: filePath, filePath };
  });
}

const App = () => {
  const [dataSource, setDataSource] = useState<string>('../../data-model/examples/unthemed/example-minimal-data.json');
  const [collections, setCollections] = useState<TokenCollection[]>([]);
  const [modes, setModes] = useState<Mode[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [resolvedValueTypes, setResolvedValueTypes] = useState<ResolvedValueType[]>([]);
  const [tokens, setTokens] = useState<ExtendedToken[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataOptions, setDataOptions] = useState<{ label: string; value: string; filePath: string }[]>([]);
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
  const toast = useCustomToast();

  // Add effect to reload collections from storage when they change
  useEffect(() => {
    const storedCollections = StorageService.getCollections();
    if (JSON.stringify(storedCollections) !== JSON.stringify(collections)) {
      setCollections(storedCollections);
    }
  }, [collections]);

  useEffect(() => {
    setDataOptions(getDataSourceOptions());
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

  const loadDataFromSource = async (filePath: string) => {
    try {
      const fileContent: string = await exampleDataFiles[filePath]();
      if (!fileContent || fileContent.trim() === '') {
        throw new Error('The selected data file is empty. Please choose a valid JSON file.');
      }
      const d: LoadedData = JSON.parse(fileContent);

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
      const normalizedTokens = (d.tokens ?? []).map((token: any) => ({
        ...token,
        valuesByMode: token.valuesByMode
      }));
      const normalizedPlatforms = d.platforms ?? [];
      const normalizedThemes = (d.themes ?? []).map((theme) => ({
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
    setSelectedToken({
      id: '',
      displayName: '',
      description: '',
      tokenCollectionId: collections[0]?.id || '',
      resolvedValueTypeId: 'color',
      propertyTypes: [],
      private: false,
      themeable: false,
      status: 'experimental',
      taxonomies: [],
      codeSyntax: [],
      constraints: [],
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

  const handleEditToken = (token: ExtendedToken) => {
    setSelectedToken(token);
    setIsEditorOpen(true);
  };

  return (
    <ChakraProvider value={system}>
      <BrowserRouter>
        <AppLayout
          dataSource={dataSource}
          setDataSource={setDataSource}
          dataOptions={dataOptions}
          onResetData={handleResetData}
          onExportData={() => {}}
        >
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" h="100vh">
              <Spinner />
            </Box>
          ) : (
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
                    taxonomies={taxonomies}
                    renderAddTokenButton={
                      <Button 
                        colorPalette="blue" 
                        size="sm" 
                        onClick={handleAddToken}
                      >
                        <Plus />
                        Add Token
                      </Button>
                    }
                    onEditToken={handleEditToken}
                    onDeleteToken={handleDeleteToken}
                  />
                  {isEditorOpen && selectedToken && (
                    <TokenEditorDialog
                      open={isEditorOpen}
                      onClose={() => setIsEditorOpen(false)}
                      onSave={handleSaveToken}
                      token={selectedToken || {
                        id: '',
                        displayName: '',
                        description: '',
                        resolvedValueTypeId: '',
                        tokenCollectionId: '',
                        private: false,
                        propertyTypes: [],
                        taxonomies: [],
                        valuesByMode: [],
                        codeSyntax: [],
                        platformOverrides: []
                      }}
                      isNew={!selectedToken}
                      tokenCollections={collections}
                      onDeleteToken={handleDeleteToken}
                    />
                  )}
                </>
              } />
              <Route path="/tokens/collections" element={<CollectionsView collections={collections} modes={modes} onUpdate={setCollections} />} />
              <Route path="/tokens/algorithms" element={<AlgorithmsView />} />
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
          )}
        </AppLayout>
      </BrowserRouter>
    </ChakraProvider>
  );
};

export default App; 