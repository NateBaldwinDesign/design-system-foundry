import { useState, useEffect } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { TokenCollection, ResolvedValueType, DimensionType, FallbackStrategy, Dimension, Mode, Taxonomy } from '@token-model/data-model';
import { SettingsDimensionsTab } from './SettingsDimensionsTab';
import { generateId, ID_PREFIXES } from '../../utils/id';
import { StorageService } from '../../services/storage';
import { SettingsThemesTab } from './SettingsThemesTab';
import { SettingsCollectionsTab } from './SettingsCollectionsTab';
import { SettingsValueTypesTab } from './SettingsValueTypesTab';
import { SettingsTaxonomiesTab } from './SettingsTaxonomiesTab';
import { SettingsPlatformsTab } from '../../components/SettingsPlatformsTab';

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
  themes: any[];
  taxonomies: Taxonomy[];
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
  taxonomyOrder: string[];
  setTaxonomyOrder: (order: string[]) => void;
  resolvedValueTypes: { id: string; displayName: string }[];
  setResolvedValueTypes: (types: { id: string; displayName: string }[]) => void;
}

export function SettingsWorkflow({ 
  collections, 
  setCollections, 
  dimensions, 
  setDimensions,
  modes,
  setModes,
  themes,
  taxonomies,
  setTaxonomies,
  taxonomyOrder,
  setTaxonomyOrder,
  resolvedValueTypes,
  setResolvedValueTypes
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
  const [editTheme, setEditTheme] = useState<any | null>(null);
  const [editThemeFields, setEditThemeFields] = useState<any | null>(null);
  const [themeList, setThemeList] = useState<any[]>(themes);

  useEffect(() => {
    setThemeList(themes);
  }, [themes]);

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
          <Tab label="Value Types" />
          <Tab label="Themes" />
          <Tab label="Taxonomies" />
          <Tab label="Platforms" />
        </Tabs>
      </Paper>

      <TabPanel value={activeTab} index={0}>
        <SettingsCollectionsTab
          collections={collections}
          setCollections={setCollections}
          newCollection={newCollection}
          setNewCollection={setNewCollection}
          handleAddCollection={handleAddCollection}
          handleDeleteCollection={handleDeleteCollection}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <SettingsDimensionsTab
          dimensions={dimensions}
          setDimensions={setDimensions}
          modes={modes}
          setModes={setModes}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <SettingsValueTypesTab 
          resolvedValueTypes={resolvedValueTypes}
          setResolvedValueTypes={setResolvedValueTypes}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <SettingsThemesTab themes={themeList} setThemes={setThemeList} />
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <SettingsTaxonomiesTab 
          taxonomies={taxonomies} 
          setTaxonomies={setTaxonomies}
          taxonomyOrder={taxonomyOrder}
          setTaxonomyOrder={setTaxonomyOrder}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        <SettingsPlatformsTab />
      </TabPanel>
    </Box>
  );
} 