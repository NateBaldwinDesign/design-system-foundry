import React, { useState, useEffect } from 'react';
import {
  Box,
  ChakraProvider,
  Spinner,
  Button
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
import DashboardView from './views/dashboard/DashboardView';
import './App.css';
import { AppLayout } from './components/AppLayout';
import theme from './theme';
import { TokensTab } from './views/tokens/TokensTab';
import { CollectionsTab } from './views/tokens/CollectionsTab';
import AlgorithmsTab from './views/tokens/AlgorithmsTab';
import { DimensionsTab } from './views/setup/DimensionsTab';
import { ClassificationTab } from './views/setup/ClassificationTab';
import { NamingRulesTab } from './views/setup/NamingRulesTab';
import { ValueTypesTab } from './views/setup/ValueTypesTab';
import { PlatformsTab } from './views/publishing/PlatformsTab';
import { ValidationTab } from './views/publishing/ValidationTab';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CoreDataView from './views/schemas/CoreDataView';
import ThemeOverridesView from './views/schemas/ThemeOverridesView';
import { Plus } from 'lucide-react';
import { TokenEditorDialog, ExtendedToken } from './components/TokenEditorDialog';

// TypeScript declaration for import.meta.glob
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const exampleDataFiles = import.meta.glob('../../data-model/examples/**/*.json', { as: 'raw' });

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
  const [dataSource, setDataSource] = useState<string>('../../data-model/examples/themed/core-data.json');
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
  const [selectedToken, setSelectedToken] = useState<ExtendedToken | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    setDataOptions(getDataSourceOptions());
  }, []);

  const loadDataFromSource = async (filePath: string) => {
    try {
      const fileContent = await exampleDataFiles[filePath]();
      const d = JSON.parse(fileContent);

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
      const dTyped = d as LoadedData;
      const normalizedCollections = dTyped.tokenCollections ?? [];
      const normalizedDimensions = dTyped.dimensions ?? [];
      const normalizedTokens = dTyped.tokens ?? [];
      const normalizedPlatforms = dTyped.platforms ?? [];
      const normalizedThemes = (dTyped.themes ?? []).map((theme) => ({
        id: theme.id,
        displayName: theme.displayName,
        isDefault: theme.isDefault ?? false,
        description: theme.description
      }));
      const normalizedTaxonomies = dTyped.taxonomies ?? [];
      const normalizedResolvedValueTypes = dTyped.resolvedValueTypes ?? [];
      const normalizedNamingRules = {
        taxonomyOrder: dTyped.namingRules?.taxonomyOrder ?? []
      };
      const normalizedVersionHistory = dTyped.versionHistory ?? [];
      const systemName = dTyped.systemName ?? 'Design System';
      const systemId = dTyped.systemId ?? 'design-system';
      const description = dTyped.description ?? 'A comprehensive design system with tokens, dimensions, and themes';
      const version = dTyped.version ?? '1.0.0';

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
      console.error('Error loading data:', error);
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
      if (token.id) {
        return prevTokens.map((t: ExtendedToken) => t.id === token.id ? token : t);
      }
      return [...prevTokens, { ...token, id: `token-${Date.now()}` }];
    });
    handleCloseEditor();
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
                    <TokensTab
                      tokens={tokens}
                      collections={collections}
                      resolvedValueTypes={resolvedValueTypes}
                      renderAddTokenButton={
                        <Button colorScheme="blue" size="sm" onClick={handleAddToken} leftIcon={<Plus />}>
                          Add Token
                        </Button>
                      }
                    />
                    {isEditorOpen && selectedToken && (
                      <TokenEditorDialog
                        token={selectedToken}
                        tokens={tokens}
                        open={isEditorOpen}
                        onClose={handleCloseEditor}
                        onSave={handleSaveToken}
                        taxonomies={taxonomies}
                        resolvedValueTypes={resolvedValueTypes}
                        isNew={!selectedToken.id}
                        onViewClassifications={() => {}}
                        modes={modes}
                        dimensions={dimensions}
                        platforms={platforms}
                      />
                    )}
                  </>
                } />
                <Route path="/tokens/collections" element={<CollectionsTab collections={collections} modes={modes} onUpdate={setCollections} />} />
                <Route path="/tokens/algorithms" element={<AlgorithmsTab />} />
                <Route path="/schemas" element={<Navigate to="/schemas/core-data" replace />} />
                <Route path="/schemas/core-data" element={<CoreDataView />} />
                <Route path="/schemas/theme-overrides" element={<ThemeOverridesView />} />
                <Route path="/setup" element={<Navigate to="/setup/dimensions" replace />} />
                <Route path="/setup/dimensions" element={<DimensionsTab dimensions={dimensions} setDimensions={setDimensions} />} />
                <Route path="/setup/classification" element={<ClassificationTab taxonomies={taxonomies} setTaxonomies={setTaxonomies} />} />
                <Route path="/setup/naming-rules" element={<NamingRulesTab taxonomies={taxonomies} taxonomyOrder={taxonomyOrder} setTaxonomyOrder={setTaxonomyOrder} />} />
                <Route path="/setup/value-types" element={<ValueTypesTab valueTypes={resolvedValueTypes} onUpdate={setResolvedValueTypes} />} />
                <Route path="/themes" element={<ThemesView themes={themes} setThemes={setThemes} />} />
                <Route path="/publishing" element={<Navigate to="/publishing/platforms" replace />} />
                <Route path="/publishing/platforms" element={<PlatformsTab platforms={platforms} setPlatforms={setPlatforms} tokens={tokens} setTokens={setTokens} taxonomies={taxonomies} />} />
                <Route path="/publishing/export-settings" element={<Box p={4}>Export settings content coming soon...</Box>} />
                <Route path="/publishing/validation" element={<ValidationTab tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} taxonomies={taxonomies} version="1.0.0" versionHistory={[]} onValidate={() => {}} />} />
                <Route path="/publishing/version-history" element={<Box p={4}>Version history content coming soon...</Box>} />
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