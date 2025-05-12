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
import { TokenCollection, Mode, Token } from '@token-model/data-model';
import { TokenForm } from './components/TokenForm';
import { TokenList } from './components/TokenList';
import { CollectionsWorkflow } from './components/CollectionsWorkflow';
import { ModesWorkflow } from './components/ModesWorkflow';
import { ValueTypesWorkflow } from './components/ValueTypesWorkflow';
import { StorageService } from './services/storage';
import { ValidationTester } from './components/ValidationTester';

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
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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
  const [tokens, setTokens] = useState<Token[]>([]);
  const [collections, setCollections] = useState<TokenCollection[]>([]);
  const [modes, setModes] = useState<Mode[]>([]);
  const [valueTypes, setValueTypes] = useState<string[]>([]);
  const [editingToken, setEditingToken] = useState<Token | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = () => {
      try {
        // Clear existing data to ensure we get the defaults
        StorageService.clearAll();
        
        // Load data with defaults
        const loadedTokens = StorageService.getTokens();
        const loadedCollections = StorageService.getCollections();
        const loadedModes = StorageService.getModes();
        const loadedValueTypes = StorageService.getValueTypes();

        setTokens(loadedTokens);
        setCollections(loadedCollections);
        setModes(loadedModes);
        setValueTypes(loadedValueTypes);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateToken = (newToken: Omit<Token, 'id'>) => {
    const token: Token = {
      ...newToken,
      id: crypto.randomUUID()
    };
    setTokens([...tokens, token]);
  };

  const handleEditToken = (token: Token) => {
    setEditingToken(token);
  };

  const handleUpdateToken = (updatedToken: Omit<Token, 'id'>) => {
    if (!editingToken) return;
    
    setTokens(tokens.map(token => 
      token.id === editingToken.id 
        ? { ...updatedToken, id: token.id }
        : token
    ));
    setEditingToken(null);
  };

  const handleDeleteToken = (tokenId: string) => {
    setTokens(tokens.filter(token => token.id !== tokenId));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Token Model
      </Typography>

      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="token model tabs"
          centered
        >
          <Tab label="Tokens" />
          <Tab label="Settings" />
        </Tabs>
      </Paper>

      <TabPanel value={activeTab} index={0}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ mb: 4 }}>
            <Button 
              variant="contained" 
              onClick={() => setEditingToken(null)}
              sx={{ mb: 2 }}
            >
              Create New Token
            </Button>
            
            {editingToken && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Edit Token
                </Typography>
                <TokenForm 
                  collections={collections}
                  modes={modes}
                  valueTypes={valueTypes}
                  tokens={tokens}
                  onSubmit={handleUpdateToken}
                  initialData={editingToken}
                />
              </Box>
            )}
          </Box>

          <TokenList 
            tokens={tokens} 
            collections={collections}
            modes={modes}
            valueTypes={valueTypes}
            onEdit={handleEditToken}
            onDelete={handleDeleteToken}
          />
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Value Types
          </Typography>
          <ValueTypesWorkflow
            valueTypes={valueTypes}
            onUpdate={(newValueTypes) => {
              setValueTypes(newValueTypes);
              StorageService.setValueTypes(newValueTypes);
            }}
          />
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Collections
          </Typography>
          <CollectionsWorkflow
            collections={collections}
            modes={modes}
            onUpdate={(newCollections) => {
              setCollections(newCollections);
              StorageService.setCollections(newCollections);
            }}
          />
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom>
            Modes
          </Typography>
          <ModesWorkflow
            modes={modes}
            collections={collections}
            onUpdate={(newModes) => {
              setModes(newModes);
              StorageService.setModes(newModes);
            }}
          />
        </Box>
      </TabPanel>

      <Box sx={{ my: 4 }}>
        <Typography variant="h5" gutterBottom>
          Validation Tester
        </Typography>
        <ValidationTester />
      </Box>

      <Box>
        <Typography variant="h5" gutterBottom>
          Token Form
        </Typography>
        <TokenForm
          collections={[]}
          modes={[]}
          valueTypes={[]}
          tokens={[]}
          onSubmit={() => {}}
        />
      </Box>
    </Container>
  );
}

export default App; 