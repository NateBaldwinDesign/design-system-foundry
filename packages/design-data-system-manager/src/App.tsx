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

const DATA_SOURCES = [
  { label: 'Default Data', value: 'default' },
  { label: 'Complex Data', value: 'complex' }
];

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [dataSource, setDataSource] = useState<'default' | 'complex'>('default');
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

  // Helper to load data from the selected source
  const loadDataFromSource = async (source: 'default' | 'complex') => {
    setLoading(true);
    let data;
    if (source === 'default') {
      data = await import('./services/data/default-data.json');
    } else {
      data = await import('./services/data/complex-data.json');
    }
    const d = data.default;

    // Normalize platforms
    const normalizedPlatforms = (d.platforms || []).map((p: any) => ({
      ...p,
      displayName: p.displayName || p.name || ''
    }));

    // Normalize tokens
    const normalizedTokens = (d.tokens || []).map((t: any) => ({
      themeable: t.themeable ?? false,
      ...t
    }));

    // Normalize dimensions
    const normalizedDimensions = (d.dimensions || []).map((dim: any) => ({
      type: dim.type || 'COLOR_SCHEME',
      ...dim
    }));

    // Construct global modes array from all dimensions
    const allModes = normalizedDimensions.flatMap((d: any) => d.modes || []);

    setCollections((d as any).tokenCollections ?? []);
    setModes(allModes);
    setDimensions(normalizedDimensions);
    setResolvedValueTypes((d as any).resolvedValueTypes ?? []);
    setTokens(normalizedTokens);
    setPlatforms(normalizedPlatforms);
    setThemes((d as any).themes ?? []);
    setTaxonomies((d as any).taxonomies ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadDataFromSource(dataSource);
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
          Token Model
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small">
            <InputLabel>Data Source</InputLabel>
            <Select
              value={dataSource}
              label="Data Source"
              onChange={e => setDataSource(e.target.value as 'default' | 'complex')}
              sx={{ minWidth: 160 }}
            >
              {DATA_SOURCES.map(ds => (
                <MenuItem key={ds.value} value={ds.value}>{ds.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
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
          setCollections={(newCollections) => {
            setCollections(newCollections);
            StorageService.setCollections(newCollections);
          }}
          dimensions={dimensions}
          setDimensions={(newDimensions) => {
            setDimensions(newDimensions);
            StorageService.setDimensions(newDimensions);
          }}
          modes={modes}
          setModes={(newModes) => {
            setModes(newModes);
            StorageService.setModes(newModes);
          }}
          themes={themes}
          taxonomies={taxonomies}
          setTaxonomies={(newTaxonomies) => {
            setTaxonomies(newTaxonomies);
            StorageService.setTaxonomies(newTaxonomies);
          }}
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
    </Container>
  );
}

export default App; 