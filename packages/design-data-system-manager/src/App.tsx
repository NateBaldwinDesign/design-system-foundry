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
  Taxonomy
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
  const [themes, setThemes] = useState<unknown[]>([]);
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataOptions, setDataOptions] = useState<{ label: string; value: string; filePath: string }[]>([]);
  const [taxonomyOrder, setTaxonomyOrder] = useState<string[]>([]);

  useEffect(() => {
    setDataOptions(getDataSourceOptions());
  }, []);

  const loadDataFromSource = async (filePath: string) => {
    setLoading(true);
    const rawData = await exampleDataFiles[filePath]();
    let d = JSON.parse(rawData);

    // If this is a theme override file, merge with the full core data object
    if (
      d &&
      typeof d === 'object' &&
      d.systemId &&
      d.themeId &&
      Array.isArray(d.tokenOverrides) &&
      !Array.isArray(d.tokens)
    ) {
      // Search ALL files for a matching core data file (not just same directory)
      const candidates = Object.keys(exampleDataFiles);
      let coreData: Record<string, unknown> | null = null;
      for (const file of candidates) {
        if (file === filePath) continue;
        const fileRaw = await exampleDataFiles[file]();
        let fileData: Record<string, unknown> | undefined;
        try { fileData = JSON.parse(fileRaw); } catch { continue; }
        if (
          fileData &&
          typeof fileData === 'object' &&
          (fileData as { systemId?: string; tokens?: Token[] }).systemId === d.systemId &&
          Array.isArray((fileData as { tokens?: Token[] }).tokens)
        ) {
          coreData = fileData;
          break;
        }
      }
      if (!coreData) {
        alert('No matching core data file found for systemId: ' + d.systemId);
        setLoading(false);
        return;
      }
      // Merge tokens: apply overrides to core tokens
      const mergedTokens: Token[] = ((coreData as { tokens: Token[] }).tokens).map((token: Token) => {
        const override = (d.tokenOverrides as { tokenId: string; value: unknown }[]).find((o) => o.tokenId === token.id);
        if (override && token.themeable) {
          return {
            ...token,
            valuesByMode: [
              {
                modeIds: [],
                value: override.value
              }
            ]
          };
        }
        return token;
      });
      // Merge: use all fields from coreData, but replace tokens with mergedTokens
      d = { ...coreData, ...d, tokens: mergedTokens };
    }

    // Normalize and set state
    const normalizedCollections = (d as { tokenCollections?: TokenCollection[] }).tokenCollections ?? [];
    const normalizedDimensions = (d as { dimensions?: Dimension[] }).dimensions ?? [];
    const normalizedTokens = (d as { tokens?: Token[] }).tokens ?? [];
    const normalizedPlatforms = (d as { platforms?: Platform[] }).platforms ?? [];

    const allModes: Mode[] = normalizedDimensions.flatMap((d: Dimension) => (d as { modes?: Mode[] }).modes || []);

    setCollections(normalizedCollections);
    setModes(allModes);
    setDimensions(normalizedDimensions);
    setResolvedValueTypes((d as { resolvedValueTypes?: { id: string; displayName: string }[] }).resolvedValueTypes ?? []);
    setTokens(normalizedTokens);
    setPlatforms(normalizedPlatforms);
    setThemes((d as { themes?: unknown[] }).themes ?? []);
    setTaxonomies((d as { taxonomies?: Taxonomy[] }).taxonomies ?? []);
    setLoading(false);

    const namingRules = (d as { namingRules?: { taxonomyOrder?: string[] } }).namingRules || {};
    const order = namingRules.taxonomyOrder || [];
    setTaxonomyOrder(order);

    StorageService.setCollections(normalizedCollections);
    StorageService.setModes(allModes);
    StorageService.setDimensions(normalizedDimensions);
    // @ts-expect-error: StorageService.setValueTypes expects string[] but schema uses objects
    StorageService.setValueTypes((d as { resolvedValueTypes?: { id: string; displayName: string }[] }).resolvedValueTypes ?? []);
    StorageService.setTokens(normalizedTokens);
    StorageService.setPlatforms(normalizedPlatforms);
    StorageService.setThemes((d as { themes?: unknown[] }).themes ?? []);
    StorageService.setTaxonomies((d as { taxonomies?: Taxonomy[] }).taxonomies ?? []);

    const root = JSON.parse(localStorage.getItem('token-model:root') || '{}');
    localStorage.setItem('token-model:root', JSON.stringify({
      ...root,
      namingRules: {
        ...namingRules,
        taxonomyOrder: order
      }
    }));
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