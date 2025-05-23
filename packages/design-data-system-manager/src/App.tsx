import React from "react";
import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Button,
  useDisclosure,
  Flex,
  Spinner,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  Select
} from '@chakra-ui/react';
import {
  TokenCollection,
  Mode,
  Token,
  Dimension,
  Platform,
  Taxonomy
} from '@token-model/data-model';
import { TokensTab } from './components/TokensTab';
import { CollectionsTab } from './components/CollectionsTab';
import { DimensionsTab } from './components/DimensionsTab';
import { ValueTypesTab } from './components/ValueTypesTab';
import { SettingsWorkflow } from './views/settings/SettingsWorkflow';
import { StorageService } from './services/storage';
import { ValidationTab } from './components/ValidationTab';
import { generateId, ID_PREFIXES } from './utils/id';
import { TokenEditorDialog } from './components/TokenEditorDialog';
import { exportAndValidateData } from './utils/validateAndExportData';
import { createSchemaJsonFromLocalStorage, validateSchemaJson, downloadSchemaJsonFromLocalStorage } from './services/createJson';
import './App.css';
import Header from './components/Header';
import { VerticalTabsLayout } from './components/VerticalTabsLayout';
import { ClassificationTab } from './views/settings/SettingsTaxonomiesTab';
import { NamingRulesTab } from './views/settings/SettingsNamingRulesTab';
import { ThemesTab } from './views/settings/SettingsThemesTab';
import { ThemesTab as ThemesWorkflowTab } from './components/ThemesTab';
import PublishingView from './views/publishing/PublishingView';
import TokensView from './views/tokens/TokensView';
import SetupView from './views/setup/SetupView';
import ThemesView from './views/themes/ThemesView';

// TypeScript declaration for import.meta.glob
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const exampleDataFiles = import.meta.glob('../../data-model/examples/**/*.json', { as: 'raw' });

function getDataSourceOptions() {
  // Convert file paths to user-friendly labels
  return Object.keys(exampleDataFiles).map((filePath) => {
    // e.g., ../../data-model/examples/themed/core-data.json -> themed/core-data.json
    const relPath = filePath.replace(/^\.\.\/\.\.\/data-model\/examples\//, '');
    // Label: Themed / Core Data
    const label = relPath
      .replace(/\//g, ' / ')
      .replace(/-/g, ' ')
      .replace(/\.json$/, '')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    return { label, value: relPath, filePath };
  });
}

export function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [dataSource, setDataSource] = useState<string>('themed/core-data.json');
  const [collections, setCollections] = useState<TokenCollection[]>([]);
  const [modes, setModes] = useState<Mode[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [resolvedValueTypes, setResolvedValueTypes] = useState<{ id: string; displayName: string }[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [themes, setThemes] = useState<any[]>([]);
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [dataOptions, setDataOptions] = useState<{ label: string; value: string; filePath: string }[]>([]);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; result?: any; error?: any } | null>(null);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadOption, setDownloadOption] = useState('raw');
  const [taxonomyOrder, setTaxonomyOrder] = useState<string[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeView, setActiveView] = useState<string>('tokens');
  const [setupActiveTab, setSetupActiveTab] = useState<number>(0);

  // Discover data files on mount
  useEffect(() => {
    setDataOptions(getDataSourceOptions());
  }, []);

  // Helper to load data from the selected source
  const loadDataFromSource = async (source: string) => {
    setLoading(true);
    let rawData = await exampleDataFiles[`../../data-model/examples/${source}`]();
    let d = JSON.parse(rawData);

    // --- THEME OVERRIDE MERGE LOGIC ---
    // If this is a theme override file (has systemId, themeId, tokenOverrides, and no tokens array)
    if (
      d &&
      typeof d === 'object' &&
      d.systemId &&
      d.themeId &&
      Array.isArray(d.tokenOverrides) &&
      !Array.isArray(d.tokens)
    ) {
      // Find all files in the same directory
      const dirPrefix = source.substring(0, source.lastIndexOf('/') + 1);
      const candidates = Object.keys(exampleDataFiles).filter(f => f.startsWith(`../../data-model/examples/${dirPrefix}`));
      let coreData = null;
      for (const file of candidates) {
        if (file === `../../data-model/examples/${source}`) continue;
        const fileRaw = await exampleDataFiles[file]();
        let fileData;
        try { fileData = JSON.parse(fileRaw); } catch { continue; }
        if (
          fileData &&
          typeof fileData === 'object' &&
          fileData.systemId === d.systemId &&
          Array.isArray(fileData.tokens)
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
      // Merge tokenOverrides into coreData tokens (only for themeable tokens)
      const mergedTokens = coreData.tokens.map((token: any) => {
        const override = d.tokenOverrides.find((o: any) => o.tokenId === token.id);
        if (override && token.themeable) {
          // Replace the valuesByMode with the override value (global, modeIds: [])
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
      // Use the merged data for the UI
      d = { ...coreData, ...d, tokens: mergedTokens };
    }
    // --- END THEME OVERRIDE MERGE LOGIC ---

    // Normalize platforms
    const normalizedPlatforms = (d.platforms || []).map((p: any) => ({
      ...p,
      displayName: p.displayName || p.name || '',
      syntaxPatterns: {
        prefix: p.syntaxPatterns?.prefix ?? '',
        suffix: p.syntaxPatterns?.suffix ?? '',
        delimiter: p.syntaxPatterns?.delimiter ?? '_',
        capitalization: p.syntaxPatterns?.capitalization ?? 'none',
        formatString: p.syntaxPatterns?.formatString ?? ''
      }
    }));

    // Normalize collections with required fields
    const normalizedCollections = (d.tokenCollections || []).map((c: any) => ({
      ...c,
      resolvedValueTypes: c.resolvedValueTypes || []
    }));

    // Normalize tokens with proper value types
    const normalizedTokens = (d.tokens || []).map((t: any) => {
      // Ensure valuesByMode has proper value types
      const normalizedValuesByMode = (t.valuesByMode || []).map((v: any) => {
        if (v.value) {
          // Convert DIMENSION and FONT_FAMILY to STRING type
          if (v.value.type === 'DIMENSION' || v.value.type === 'FONT_FAMILY') {
            return {
              ...v,
              value: {
                type: 'STRING',
                value: v.value.value
              }
            };
          }
          // Ensure ALIAS type has tokenId
          if (v.value.type === 'ALIAS' && !v.value.tokenId) {
            return {
              ...v,
              value: {
                type: 'STRING',
                value: v.value.value || ''
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

    // Normalize dimensions
    const normalizedDimensions = (d.dimensions || []).map((dim: any) => ({
      type: dim.type || 'COLOR_SCHEME',
      ...dim
    }));

    // Construct global modes array from all dimensions
    const allModes = normalizedDimensions.flatMap((d: any) => d.modes || []);

    // Ensure required top-level fields
    const normalizedData = {
      ...d,
      tokenCollections: normalizedCollections,
      tokens: normalizedTokens,
      dimensions: normalizedDimensions,
      platforms: normalizedPlatforms,
      tokenGroups: d.tokenGroups || [],
      tokenVariants: d.tokenVariants || [],
      themeOverrides: d.themeOverrides || {}
    };

    setCollections(normalizedCollections);
    setModes(allModes);
    setDimensions(normalizedDimensions);
    setResolvedValueTypes((d as any).resolvedValueTypes ?? []);
    setTokens(normalizedTokens);
    setPlatforms(normalizedPlatforms);
    setThemes((d as any).themes ?? []);
    setTaxonomies((d as any).taxonomies ?? []);
    setLoading(false);

    // Naming rules/taxonomy order
    const namingRules = (d as any).namingRules || {};
    const order = namingRules.taxonomyOrder || [];
    setTaxonomyOrder(order);

    // Sync to localStorage for validation
    StorageService.setCollections(normalizedCollections);
    StorageService.setModes(allModes);
    StorageService.setDimensions(normalizedDimensions);
    StorageService.setValueTypes((d as any).resolvedValueTypes ?? []);
    StorageService.setTokens(normalizedTokens);
    StorageService.setPlatforms(normalizedPlatforms);
    StorageService.setThemes((d as any).themes ?? []);
    StorageService.setTaxonomies((d as any).taxonomies ?? []);

    // Also sync namingRules to localStorage:token-model:root
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleOpenCreateDialog = () => setCreateDialogOpen(true);
  const handleCloseCreateDialog = () => setCreateDialogOpen(false);

  const handleCreateToken = (tokenData: Omit<Token, 'id'>) => {
    const newToken: Token = {
      ...tokenData,
      id: generateId(ID_PREFIXES.TOKEN)
    };
    const newTokens = [...tokens, newToken];
    setTokens(newTokens);
    StorageService.setTokens(newTokens);
    setCreateDialogOpen(false);
  };

  const handleEditToken = (token: Token) => {
    setSelectedToken(token);
    onOpen();
  };

  const handleSaveToken = (token: Token) => {
    if (selectedToken) {
      setTokens(tokens.map(t => t.id === token.id ? token : t));
    } else {
      setTokens([...tokens, token]);
    }
    onClose();
  };

  const handleDeleteToken = (tokenId: string) => {
    setTokens(tokens.filter(t => t.id !== tokenId));
  };

  const handleResetData = () => {
    // Clear all localStorage data
    StorageService.clearAll();

    // Clear in-memory state (including schema, platforms, naming rules)
    setTokens([]);
    setCollections([]);
    setModes([]);
    setDimensions([]);
    setResolvedValueTypes([]);
    setPlatforms([]);
    setThemes([]);
    setTaxonomies([]);
    setTaxonomyOrder([]);
    // If you use a schema context or useSchema, also reset it here if possible
    // For example: updateSchema({});

    // Reload data from current source (this will re-initialize everything from the selected data source)
    loadDataFromSource(dataSource);
  };

  const handleValidateData = () => {
    // Placeholder logic for validateData
  };

  const handleExportData = () => {
    // Placeholder logic for exportData
  };

  // Handler for popover link: close dialog, then navigate
  const handleViewSetupClassificationTab = () => {
    setActiveView('setup');
    setSetupActiveTab(1); // Set to Classifications tab (index 1)
  };

  // Updated: Synchronously reset tab index on user navigation
  const handleViewChange = (view: string) => {
    if (view === 'setup') {
      setSetupActiveTab(0); // Reset tab index synchronously
    }
    setActiveView(view);
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
            handleValidateData={handleValidateData}
            handleExportData={handleExportData}
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
              onEditToken={handleEditToken}
              onDeleteToken={handleDeleteToken}
              onSaveToken={handleSaveToken}
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
              collections={collections}
              dimensions={dimensions}
              platforms={platforms}
              taxonomies={taxonomies}
              version={'1.0.0'}
              versionHistory={[]}
            />
          )}
          {activeView !== 'tokens' && activeView !== 'setup' && activeView !== 'themes' && activeView !== 'publishing' && <Box />}
        </VStack>
      </Container>
    </Box>
  );
}

export default App; 