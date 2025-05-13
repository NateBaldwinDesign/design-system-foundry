import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  Button,
  CircularProgress
} from '@mui/material';
import { TokenCollection, Mode, Token, Dimension } from '@token-model/data-model';
import { TokenForm } from './components/TokenForm';
import { TokenList } from './components/TokenList';
import { CollectionsWorkflow } from './components/CollectionsWorkflow';
import { ModesWorkflow } from './components/ModesWorkflow';
import { ValueTypesWorkflow } from './components/ValueTypesWorkflow';
import { SettingsWorkflow } from './components/SettingsWorkflow';
import { StorageService } from './services/storage';
import { ValidationTester } from './components/ValidationTester';
import { generateId, ID_PREFIXES } from './utils/id';

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

function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [collections, setCollections] = useState<TokenCollection[]>([]);
  const [modes, setModes] = useState<Mode[]>([]);
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [valueTypes, setValueTypes] = useState<string[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedCollections, loadedModes, loadedDimensions, loadedValueTypes, loadedTokens] = await Promise.all([
          StorageService.getCollections(),
          StorageService.getModes(),
          StorageService.getDimensions(),
          StorageService.getValueTypes(),
          StorageService.getTokens()
        ]);

        setCollections(loadedCollections);
        setModes(loadedModes);
        setDimensions(loadedDimensions);
        setValueTypes(loadedValueTypes);
        setTokens(loadedTokens);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateToken = (tokenData: Omit<Token, 'id'>) => {
    const newToken: Token = {
      ...tokenData,
      id: generateId(ID_PREFIXES.TOKEN)
    };
    const newTokens = [...tokens, newToken];
    setTokens(newTokens);
    StorageService.setTokens(newTokens);
  };

  const handleEditToken = (token: Token) => {
    // TODO: Implement token editing
    console.log('Edit token:', token);
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
        <Button variant="outlined" color="error" onClick={handleReset} sx={{ ml: 2 }}>
          Reset Data
        </Button>
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
          <Typography variant="h5" gutterBottom>
            Tokens
          </Typography>
          <TokenList
            tokens={tokens}
            collections={collections}
            modes={modes}
            dimensions={dimensions}
            onEdit={handleEditToken}
            onDelete={(tokenId) => {
              const newTokens = tokens.filter(t => t.id !== tokenId);
              setTokens(newTokens);
              StorageService.setTokens(newTokens);
            }}
          />
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom>
            Add Token
          </Typography>
          <TokenForm
            collections={collections}
            modes={modes}
            dimensions={dimensions}
            tokens={tokens}
            onSubmit={handleCreateToken}
          />
        </Box>
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