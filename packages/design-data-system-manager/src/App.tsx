import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  VStack,
  Spinner
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
import Header from './components/Header';
import PublishingView from './views/publishing/PublishingView';
import TokensView from './views/tokens/TokensView';
import SetupView from './views/setup/SetupView';
import ThemesView from './views/themes/ThemesView';
import DashboardView from './views/dashboard/DashboardView';
import './App.css';
import { CodeSyntaxService, ensureCodeSyntaxArrayFormat } from './services/codeSyntax';

// TypeScript declaration for import.meta.glob
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const exampleDataFiles = import.meta.glob('../../data-model/examples/**/*.json', { as: 'raw' });

function getDataSourceOptions() {
  return Object.keys(exampleDataFiles).map((filePath) => {
    const relPath = filePath.replace(/^e\/\.\.\/data-model\/examples\//, '');
    const label = relPath
      .replace(/\//g, ' / ')
      .replace(/-/g, ' ')
      .replace(/\.json$/, '')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, value: relPath, filePath };
  });
}

export function App() {
  const [dataSource, setDataSource] = useState<string>('themed/core-data.json');
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
  const [activeView, setActiveView] = useState<string>('tokens');
  const [setupActiveTab, setSetupActiveTab] = useState<number>(0);

  useEffect(() => {
    setDataOptions(getDataSourceOptions());
  }, []);

  useEffect(() => {
    // Normalize codeSyntax for all tokens on load
    let loadedTokens = StorageService.getTokens() || [];
    let tokensWereNormalized = false;
    loadedTokens = loadedTokens.map(token => {
      if (!Array.isArray(token.codeSyntax)) {
        tokensWereNormalized = true;
        return {
          ...token,
          codeSyntax: ensureCodeSyntaxArrayFormat(token.codeSyntax || {})
        };
      }
      return token;
    });
    if (tokensWereNormalized) {
      StorageService.setTokens(loadedTokens);
    }
    setTokens(loadedTokens);
    setPlatforms(StorageService.getPlatforms() || []);
    setCollections(StorageService.getCollections ? StorageService.getCollections() : []);
    setDimensions(StorageService.getDimensions ? StorageService.getDimensions() : []);
    setTaxonomies(StorageService.getTaxonomies ? StorageService.getTaxonomies() : []);
    setResolvedValueTypes(StorageService.getValueTypes ? StorageService.getValueTypes() : []);
    setThemes(StorageService.getThemes ? StorageService.getThemes() : []);
    setModes(StorageService.getModes ? StorageService.getModes() : []);
    const root = JSON.parse(localStorage.getItem('token-model:root') || '{}');
    setTaxonomyOrder(root.namingRules?.taxonomyOrder || []);
    setLoading(false);
  }, []);

  // Helper: update state and persist to local storage
  const updateTokens = (newTokens: Token[]) => {
    setTokens(newTokens);
    StorageService.setTokens(newTokens);
  };
  const updatePlatforms = (newPlatforms: Platform[]) => {
    setPlatforms(newPlatforms);
    StorageService.setPlatforms(newPlatforms);
  };
  const updateCollections = (newCollections: TokenCollection[]) => {
    setCollections(newCollections);
    StorageService.setCollections(newCollections);
  };
  const updateDimensions = (newDimensions: Dimension[]) => {
    setDimensions(newDimensions);
    StorageService.setDimensions(newDimensions);
  };
  const updateTaxonomies = (newTaxonomies: Taxonomy[]) => {
    setTaxonomies(newTaxonomies);
    StorageService.setTaxonomies(newTaxonomies);
  };
  // TODO: setValueTypes expects string[], but schema uses {id, displayName}[]
  const updateResolvedValueTypes = (newTypes: { id: string; displayName: string }[]) => {
    setResolvedValueTypes(newTypes);
    // @ts-expect-error: StorageService.setValueTypes expects string[] but schema uses objects
    StorageService.setValueTypes(newTypes);
  };
  const updateThemes = (newThemes: unknown[]) => {
    setThemes(newThemes);
    StorageService.setThemes(newThemes);
  };
  const updateModes = (newModes: Mode[]) => {
    setModes(newModes);
    StorageService.setModes(newModes);
  };
  const updateTaxonomyOrder = (order: string[]) => {
    setTaxonomyOrder(order);
    const root = JSON.parse(localStorage.getItem('token-model:root') || '{}');
    localStorage.setItem('token-model:root', JSON.stringify({
      ...root,
      namingRules: {
        ...root.namingRules,
        taxonomyOrder: order
      }
    }));
  };

  const loadDataFromSource = async (source: string) => {
    setLoading(true);
    const rawData = await exampleDataFiles[`../../data-model/examples/${source}`]();
    let d = JSON.parse(rawData);

    if (
      d &&
      typeof d === 'object' &&
      d.systemId &&
      d.themeId &&
      Array.isArray(d.tokenOverrides) &&
      !Array.isArray(d.tokens)
    ) {
      const dirPrefix = source.substring(0, source.lastIndexOf('/') + 1);
      const candidates = Object.keys(exampleDataFiles).filter(f => f.startsWith(`../../data-model/examples/${dirPrefix}`));
      let coreData: Record<string, unknown> | null = null;
      for (const file of candidates) {
        if (file === `../../data-model/examples/${source}`) continue;
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
      d = { ...coreData, ...d, tokens: mergedTokens };
    }

    const normalizedPlatforms: Platform[] = (d.platforms || []).map((p: Platform) => ({
      ...p,
      displayName: p.displayName || (p as { name?: string }).name || '',
      syntaxPatterns: {
        prefix: p.syntaxPatterns?.prefix ?? '',
        suffix: p.syntaxPatterns?.suffix ?? '',
        delimiter: p.syntaxPatterns?.delimiter ?? '_',
        capitalization: p.syntaxPatterns?.capitalization ?? 'none',
        formatString: p.syntaxPatterns?.formatString ?? ''
      }
    }));

    const normalizedCollections: TokenCollection[] = (d.tokenCollections || []).map((c: TokenCollection) => ({
      ...c,
      resolvedValueTypes: c.resolvedValueTypes || []
    }));

    const normalizedTokens: Token[] = (d.tokens || []).map((t: Token) => {
      const normalizedValuesByMode = (t.valuesByMode || []).map((v: { value: unknown; modeIds: string[] }) => {
        if (v.value && typeof v.value === 'object' && v.value !== null) {
          const valueObj = v.value as { type?: string; value?: unknown; tokenId?: string };
          if (valueObj.type === 'DIMENSION' || valueObj.type === 'FONT_FAMILY') {
            return {
              ...v,
              value: {
                type: 'STRING',
                value: valueObj.value
              }
            };
          }
          if (valueObj.type === 'ALIAS' && !valueObj.tokenId) {
            return {
              ...v,
              value: {
                type: 'STRING',
                value: valueObj.value || ''
              }
            };
          }
        }
        return v;
      });
      return {
        themeable: t.themeable ?? false,
        ...t,
        valuesByMode: normalizedValuesByMode
      };
    });

    const normalizedDimensions: Dimension[] = (d.dimensions || []).map((dim: Dimension) => ({
      type: (dim as { type?: string }).type || 'COLOR_SCHEME',
      ...dim
    }));

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

  const handleViewSetupClassificationTab = () => {
    setActiveView('setup');
    setSetupActiveTab(1);
  };

  const handleViewChange = (view: string) => {
    if (view === 'setup') {
      setSetupActiveTab(0);
    }
    setActiveView(view);
  };

  const handleResetData = () => {
    // Clear all localStorage data
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear all StorageService data
    StorageService.clearAll();
    
    // Clear all in-memory state
    setTokens([]);
    setCollections([]);
    setModes([]);
    setDimensions([]);
    setResolvedValueTypes([]);
    setPlatforms([]);
    setThemes([]);
    setTaxonomies([]);
    setTaxonomyOrder([]);
    
    // Clear browser cache for this domain
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    // Reload the page to ensure a clean state
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
    <Box minH="100vh" minW="100vw" bg="chakra-body-bg">
      <Container maxW="100vw" p={0} height="100vh" display="flex" flexDirection="column">
        <VStack spacing={0} align="stretch" flex="1">
          <Header
            dataSource={dataSource}
            setDataSource={setDataSource}
            dataOptions={dataOptions}
            handleResetData={handleResetData}
            handleValidateData={() => {}}
            handleExportData={() => {}}
            activeView={activeView}
            onViewChange={handleViewChange}
          />
          {activeView === 'tokens' && (
            <TokensView
              tokens={tokens}
              collections={collections}
              modes={modes}
              dimensions={dimensions}
              platforms={platforms}
              taxonomies={taxonomies}
              resolvedValueTypes={resolvedValueTypes}
              themes={themes}
              taxonomyOrder={taxonomyOrder}
              onEditToken={() => {}}
              onDeleteToken={() => {}}
              onSaveToken={() => {}}
              setCollections={setCollections}
              setModes={setModes}
              setTaxonomies={setTaxonomies}
              setTaxonomyOrder={setTaxonomyOrder}
              setResolvedValueTypes={setResolvedValueTypes}
              onViewSetupClassificationTab={handleViewSetupClassificationTab}
            />
          )}
          {activeView === 'setup' && (
            <SetupView
              dimensions={dimensions}
              setDimensions={setDimensions}
              taxonomies={taxonomies}
              setTaxonomies={setTaxonomies}
              taxonomyOrder={taxonomyOrder}
              setTaxonomyOrder={setTaxonomyOrder}
              resolvedValueTypes={resolvedValueTypes}
              setResolvedValueTypes={setResolvedValueTypes}
              activeTab={setupActiveTab}
              setActiveTab={setSetupActiveTab}
            />
          )}
          {activeView === 'themes' && (
            <ThemesView
              themes={themes}
              setThemes={setThemes}
            />
          )}
          {activeView === 'publishing' && (
            <PublishingView
              tokens={tokens}
              platforms={platforms}
              collections={collections}
              dimensions={dimensions}
              taxonomies={taxonomies}
              setTokens={updateTokens}
              setPlatforms={updatePlatforms}
              setCollections={updateCollections}
              setDimensions={updateDimensions}
              setTaxonomies={updateTaxonomies}
              setResolvedValueTypes={updateResolvedValueTypes}
              setThemes={updateThemes}
              setModes={updateModes}
              setTaxonomyOrder={updateTaxonomyOrder}
            />
          )}
          {activeView === 'dashboard' && (
            <DashboardView />
          )}
          {activeView !== 'tokens' && activeView !== 'setup' && activeView !== 'themes' && activeView !== 'publishing' && activeView !== 'dashboard' && <Box />}
        </VStack>
      </Container>
    </Box>
  );
}

export default App; 