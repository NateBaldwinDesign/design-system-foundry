import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  Spinner,
  ChakraProvider
} from '@chakra-ui/react';
import {
  TokenCollection,
  Mode,
  Token,
  Dimension,
  Platform,
  Taxonomy,
  Theme
} from '@token-model/data-model';
import { StorageService } from './services/storage';
import PublishingView from './views/publishing/PublishingView';
import TokensView from './views/tokens/TokensView';
import SetupView from './views/setup/SetupView';
import ThemesView from './views/themes/ThemesView';
import DashboardView from './views/dashboard/DashboardView';
import './App.css';
import { CodeSyntaxService, ensureCodeSyntaxArrayFormat } from './services/codeSyntax';
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

const TOKENS_TABS = ['tokens', 'collections', 'algorithms'];
const SETUP_TABS = ['dimensions', 'classification', 'naming-rules', 'value-types'];
const PUBLISHING_TABS = ['platforms', 'export-settings', 'validation', 'version-history'];

const App: React.FC = () => {
  const [dataSource, setDataSource] = useState<string>('../../data-model/examples/themed/core-data.json');
  const [collections, setCollections] = useState<TokenCollection[]>([]);
  const [modes, setModes] = useState<Mode[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [resolvedValueTypes, setResolvedValueTypes] = useState<{ id: string; displayName: string }[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataOptions, setDataOptions] = useState<{ label: string; value: string; filePath: string }[]>([]);
  const [taxonomyOrder, setTaxonomyOrder] = useState<string[]>([]);

  useEffect(() => {
    setDataOptions(getDataSourceOptions());
  }, []);

  const loadDataFromSource = async (filePath: string) => {
    try {
      const fileContent = await exampleDataFiles[filePath]();
      const d = JSON.parse(fileContent);

      // Normalize and set state
      const normalizedCollections = (d as { tokenCollections?: TokenCollection[] }).tokenCollections ?? [];
      const normalizedDimensions = (d as { dimensions?: Dimension[] }).dimensions ?? [];
      const normalizedTokens = (d as { tokens?: Token[] }).tokens ?? [];
      const normalizedPlatforms = (d as { platforms?: Platform[] }).platforms ?? [];
      const normalizedThemes = ((d as { themes?: Theme[] }).themes ?? []).map(theme => ({
        id: (theme as any).id,
        displayName: (theme as any).displayName,
        isDefault: (theme as any).isDefault ?? false,
        description: (theme as any).description
      }));
      const normalizedTaxonomies = (d as { taxonomies?: Taxonomy[] }).taxonomies ?? [];
      const normalizedResolvedValueTypes = (d as { resolvedValueTypes?: { id: string; displayName: string }[] }).resolvedValueTypes ?? [];
      const normalizedNamingRules = {
        taxonomyOrder: (d as { namingRules?: { taxonomyOrder?: string[] } }).namingRules?.taxonomyOrder ?? []
      };
      const normalizedVersionHistory = (d as { versionHistory?: any[] }).versionHistory ?? [];
      const systemName = (d as { systemName?: string }).systemName ?? 'Design System';
      const systemId = (d as { systemId?: string }).systemId ?? 'design-system';
      const description = (d as { description?: string }).description ?? 'A comprehensive design system with tokens, dimensions, and themes';
      const version = (d as { version?: string }).version ?? '1.0.0';

      const allModes: Mode[] = normalizedDimensions.flatMap((d: Dimension) => (d as { modes?: Mode[] }).modes || []);

      // Set React state
      setCollections(normalizedCollections);
      setModes(allModes);
      setDimensions(normalizedDimensions);
      setResolvedValueTypes(normalizedResolvedValueTypes);
      setTokens(normalizedTokens);
      setPlatforms(normalizedPlatforms);
      setThemes(normalizedThemes);
      setTaxonomies(normalizedTaxonomies);
      setTaxonomyOrder(normalizedNamingRules.taxonomyOrder);
      setLoading(false);

      // Store in localStorage via StorageService
      StorageService.setCollections(normalizedCollections);
      StorageService.setModes(allModes);
      StorageService.setDimensions(normalizedDimensions);
      StorageService.setValueTypes(normalizedResolvedValueTypes.map(vt => vt.id));
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
                <Route path="/tokens/tokens" element={<TokensTab
                  tokens={tokens}
                  collections={collections}
                  modes={modes}
                  dimensions={dimensions}
                  platforms={platforms}
                  onEdit={() => {}}
                  onDelete={(tokenId) => setTokens(tokens.filter(t => t.id !== tokenId))}
                  taxonomies={taxonomies}
                  resolvedValueTypes={resolvedValueTypes}
                  onViewClassifications={() => {}}
                  renderAddTokenButton={null}
                />} />
                <Route path="/tokens/collections" element={<CollectionsTab collections={collections} modes={modes} onUpdate={setCollections} />} />
                <Route path="/tokens/algorithms" element={<AlgorithmsTab />} />
                <Route path="/schemas" element={<Navigate to="/schemas/core-data" replace />} />
                <Route path="/schemas/core-data" element={<CoreDataView />} />
                <Route path="/schemas/theme-overrides" element={<ThemeOverridesView />} />
                <Route path="/setup" element={<Navigate to="/setup/dimensions" replace />} />
                <Route path="/setup/dimensions" element={<DimensionsTab dimensions={dimensions} setDimensions={setDimensions} />} />
                <Route path="/setup/classification" element={<ClassificationTab taxonomies={taxonomies} setTaxonomies={setTaxonomies} />} />
                <Route path="/setup/naming-rules" element={<NamingRulesTab taxonomies={taxonomies} taxonomyOrder={taxonomyOrder} setTaxonomyOrder={setTaxonomyOrder} />} />
                <Route path="/setup/value-types" element={<ValueTypesTab valueTypes={resolvedValueTypes.map(vt => vt.id)} onUpdate={types => setResolvedValueTypes(types.map(id => ({ id, displayName: id })))} />} />
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