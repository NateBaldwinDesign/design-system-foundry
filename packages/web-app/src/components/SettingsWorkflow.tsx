import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { TokenCollection, ResolvedValueType, DimensionType, FallbackStrategy, Dimension, Mode } from '@token-model/data-model';
import { DimensionsWorkflow } from './DimensionsWorkflow';
import { generateId, ID_PREFIXES } from '../utils/id';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
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

interface SettingsWorkflowProps {
  collections: TokenCollection[];
  setCollections: (collections: TokenCollection[]) => void;
  dimensions: Dimension[];
  setDimensions: (dimensions: Dimension[]) => void;
  modes: Mode[];
  setModes: (modes: Mode[]) => void;
}

export function SettingsWorkflow({ 
  collections, 
  setCollections, 
  dimensions, 
  setDimensions,
  modes,
  setModes 
}: SettingsWorkflowProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [newCollection, setNewCollection] = useState<Partial<TokenCollection>>({
    name: '',
    resolvedValueTypes: [],
    private: false,
    defaultModeIds: [],
    modeResolutionStrategy: {
      priorityByType: [],
      fallbackStrategy: 'MOST_SPECIFIC_MATCH'
    }
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddCollection = () => {
    try {
      const ms = newCollection.modeResolutionStrategy || { priorityByType: [], fallbackStrategy: 'MOST_SPECIFIC_MATCH' };
      const collection: TokenCollection = {
        id: generateId(ID_PREFIXES.TOKEN_COLLECTION),
        name: newCollection.name || '',
        resolvedValueTypes: newCollection.resolvedValueTypes || [],
        private: newCollection.private || false,
        defaultModeIds: newCollection.defaultModeIds || [],
        modeResolutionStrategy: {
          priorityByType: ms.priorityByType ?? [],
          fallbackStrategy: ms.fallbackStrategy ?? 'MOST_SPECIFIC_MATCH',
        }
      };
      setCollections([...collections, collection]);
      setNewCollection({
        name: '',
        resolvedValueTypes: [],
        private: false,
        defaultModeIds: [],
        modeResolutionStrategy: {
          priorityByType: [],
          fallbackStrategy: 'MOST_SPECIFIC_MATCH'
        }
      });
    } catch (error) {
      console.error('Failed to create collection', error);
    }
  };

  const handleDeleteCollection = (id: string) => {
    setCollections(collections.filter(c => c.id !== id));
  };

  return (
    <Box>
      <Paper sx={{ width: '100%', mb: 4 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="settings tabs"
          centered
        >
          <Tab label="Collections" />
          <Tab label="Dimensions" />
          <Tab label="Modes" />
          <Tab label="Value Types" />
        </Tabs>
      </Paper>

      <TabPanel value={activeTab} index={0}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Create New Collection
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
            <TextField
              label="Name"
              value={newCollection.name}
              onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
            />
            <FormControl>
              <InputLabel>Resolved Value Types</InputLabel>
              <Select
                multiple
                value={newCollection.resolvedValueTypes || []}
                onChange={(e) => setNewCollection({ 
                  ...newCollection, 
                  resolvedValueTypes: e.target.value as ResolvedValueType[] 
                })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="COLOR">Color</MenuItem>
                <MenuItem value="DIMENSION">Dimension</MenuItem>
                <MenuItem value="FONT_FAMILY">Font Family</MenuItem>
                <MenuItem value="FONT_WEIGHT">Font Weight</MenuItem>
                <MenuItem value="FONT_STYLE">Font Style</MenuItem>
                <MenuItem value="DURATION">Duration</MenuItem>
                <MenuItem value="CUBIC_BEZIER">Cubic Bezier</MenuItem>
                <MenuItem value="BORDER_WIDTH">Border Width</MenuItem>
                <MenuItem value="CORNER_ROUNDING">Corner Rounding</MenuItem>
                <MenuItem value="ELEVATION">Elevation</MenuItem>
                <MenuItem value="SHADOW">Shadow</MenuItem>
                <MenuItem value="OPACITY">Opacity</MenuItem>
                <MenuItem value="NUMBER">Number</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Mode Resolution Priority</InputLabel>
              <Select
                multiple
                value={newCollection.modeResolutionStrategy?.priorityByType ?? []}
                onChange={(e) => setNewCollection({ 
                  ...newCollection, 
                  modeResolutionStrategy: {
                    priorityByType: e.target.value as DimensionType[],
                    fallbackStrategy: newCollection.modeResolutionStrategy?.fallbackStrategy ?? 'MOST_SPECIFIC_MATCH',
                  }
                })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="COLOR_SCHEME">Color Scheme</MenuItem>
                <MenuItem value="CONTRAST">Contrast</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>Fallback Strategy</InputLabel>
              <Select
                value={newCollection.modeResolutionStrategy?.fallbackStrategy ?? 'MOST_SPECIFIC_MATCH'}
                onChange={(e) => setNewCollection({ 
                  ...newCollection, 
                  modeResolutionStrategy: {
                    priorityByType: newCollection.modeResolutionStrategy?.priorityByType ?? [],
                    fallbackStrategy: e.target.value as FallbackStrategy,
                  }
                })}
              >
                <MenuItem value="MOST_SPECIFIC_MATCH">Most Specific Match</MenuItem>
                <MenuItem value="FIRST_MATCH">First Match</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleAddCollection}
              startIcon={<AddIcon />}
            >
              Add Collection
            </Button>
          </Box>
        </Box>

        <Typography variant="h6" gutterBottom>
          Existing Collections
        </Typography>
        {collections.map((collection) => (
          <Paper key={collection.id} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">{collection.name}</Typography>
              <IconButton onClick={() => handleDeleteCollection(collection.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Value Types: {collection.resolvedValueTypes.join(', ')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mode Priority: {collection.modeResolutionStrategy?.priorityByType.join(' > ') || 'None'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fallback Strategy: {collection.modeResolutionStrategy?.fallbackStrategy || 'None'}
            </Typography>
          </Paper>
        ))}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <DimensionsWorkflow 
          dimensions={dimensions}
          setDimensions={setDimensions}
          modes={modes}
          setModes={setModes}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Typography variant="h6" gutterBottom>
          Value Types
        </Typography>
        <Typography>
          Currently supported value types:
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Chip label="COLOR" sx={{ mr: 1 }} />
        </Box>
      </TabPanel>
    </Box>
  );
} 