import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { TokenCollection, Mode, Token, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { TokenList } from './components/TokenList';
import { CollectionsWorkflow } from './components/CollectionsWorkflow';
import { ModesWorkflow } from './components/ModesWorkflow';
import { ValueTypesWorkflow } from './components/ValueTypesWorkflow';
import { SettingsWorkflow } from './views/settings/SettingsWorkflow';
import { StorageService } from './services/storage';
import { ValidationTester } from './components/ValidationTester';
import { generateId, ID_PREFIXES } from './utils/id';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { TokenEditorDialog } from './components/TokenEditorDialog';
import { exportAndValidateData } from './utils/validateAndExportData';
import { createSchemaJsonFromLocalStorage, validateSchemaJson, downloadSchemaJsonFromLocalStorage } from './services/createJson';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`main-tabpanel-${index}`}
      aria-labelledby={`main-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

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

function App() {
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

  // Discover data files on mount
  useEffect(() => {
    setDataOptions(getDataSourceOptions());
  }, []);

  // Helper to load data from the selected source
  const loadDataFromSource = async (source: string) => {
    setLoading(true);
    let rawData = await exampleDataFiles[`../../data-model/examples/${source}`]();
    let d = JSON.parse(rawData);

    // Normalize platforms
    const normalizedPlatforms = (d.platforms || []).map((p: any) => ({
      ...p,
      displayName: p.displayName || p.name || ''
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

  const handleEditToken = (updatedToken: Token) => {
    const newTokens = tokens.map(t => t.id === updatedToken.id ? updatedToken : t);
    setTokens(newTokens);
    StorageService.setTokens(newTokens);
  };

  const handleReset = () => {
    StorageService.clearAll();
    window.location.reload();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container>
      <Box sx={{ my: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Design Data System Manager
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small">
            <InputLabel>Data Source</InputLabel>
            <Select
              value={dataSource}
              label="Data Source"
              onChange={e => setDataSource(e.target.value as string)}
              sx={{ minWidth: 220 }}
            >
              {dataOptions.map(ds => (
                <MenuItem key={ds.value} value={ds.value}>{ds.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              const schemaData = createSchemaJsonFromLocalStorage();
              const result = validateSchemaJson(schemaData);
              setValidationResult(result);
              setValidationDialogOpen(true);
            }}
            sx={{ ml: 2 }}
          >
            Validate data
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setDownloadDialogOpen(true)}
            sx={{ ml: 2 }}
          >
            Download
          </Button>
          <Button variant="outlined" color="error" onClick={handleReset} sx={{ ml: 2 }}>
            Reset Data
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="main tabs"
          centered
        >
          <Tab label="Tokens" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      <TabPanel value={activeTab} index={0}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              Tokens
            </Typography>
            <Button variant="contained" color="primary" onClick={handleOpenCreateDialog}>
              Add token
            </Button>
          </Box>
          <TokenList
            tokens={tokens}
            collections={collections}
            modes={modes}
            dimensions={dimensions}
            platforms={platforms}
            onEdit={handleEditToken}
            onDelete={(tokenId) => {
              const newTokens = tokens.filter(t => t.id !== tokenId);
              setTokens(newTokens);
              StorageService.setTokens(newTokens);
            }}
            taxonomies={taxonomies}
            resolvedValueTypes={resolvedValueTypes}
          />
        </Box>

        {/* Create Token Dialog */}
        <TokenEditorDialog
          token={{
            id: '',
            displayName: '',
            description: '',
            tokenCollectionId: collections[0]?.id || '',
            resolvedValueType: (resolvedValueTypes[0]?.id || 'COLOR') as Token['resolvedValueType'],
            private: false,
            valuesByMode: [],
            taxonomies: [],
            propertyTypes: [],
            codeSyntax: {},
            themeable: false,
          }}
          tokens={tokens}
          dimensions={dimensions}
          modes={modes}
          platforms={platforms}
          open={createDialogOpen}
          onClose={handleCloseCreateDialog}
          onSave={tokenData => {
            const newToken = {
              ...tokenData,
              id: generateId(ID_PREFIXES.TOKEN)
            };
            const newTokens = [...tokens, newToken];
            setTokens(newTokens);
            StorageService.setTokens(newTokens);
            setCreateDialogOpen(false);
          }}
          taxonomies={taxonomies}
          resolvedValueTypes={resolvedValueTypes}
          isNew={true}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <SettingsWorkflow
          collections={collections}
          setCollections={setCollections}
          dimensions={dimensions}
          setDimensions={setDimensions}
          modes={modes}
          setModes={setModes}
          themes={themes}
          taxonomies={taxonomies}
          setTaxonomies={setTaxonomies}
          taxonomyOrder={taxonomyOrder}
          setTaxonomyOrder={setTaxonomyOrder}
        />
      </TabPanel>

      <Box sx={{ my: 4 }}>
        <Typography variant="h5" gutterBottom>
          Validation Tester
        </Typography>
        <ValidationTester
          tokens={tokens}
          collections={collections}
          modes={modes}
          onValidate={(result) => {
            console.log('Validation result:', result);
          }}
        />
      </Box>

      <Dialog open={validationDialogOpen} onClose={() => setValidationDialogOpen(false)}>
        <DialogTitle>Validation Result</DialogTitle>
        <DialogContent>
          {validationResult?.valid ? (
            <Typography color="success.main">Data is valid!</Typography>
          ) : (
            <Box>
              <Typography color="error.main">Validation failed:</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{validationResult?.error}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setValidationDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Download Dialog */}
      <Dialog open={downloadDialogOpen} onClose={() => setDownloadDialogOpen(false)}>
        <DialogTitle>Download Data</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="download-option-label">Download Option</InputLabel>
            <Select
              labelId="download-option-label"
              value={downloadOption}
              label="Download Option"
              onChange={e => setDownloadOption(e.target.value)}
            >
              <MenuItem value="raw">Raw data</MenuItem>
              {/* Future options can be added here */}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDownloadDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              if (downloadOption === 'raw') {
                downloadSchemaJsonFromLocalStorage();
              }
              setDownloadDialogOpen(false);
            }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default App; 