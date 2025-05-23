import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { TokenCollection, Mode, Taxonomy } from '@token-model/data-model';
import { generateId, ID_PREFIXES } from '../../utils/id';
import { SettingsThemesTab } from './SettingsThemesTab';
import { SettingsTaxonomiesTab } from './SettingsTaxonomiesTab';
import { SettingsPlatformsTab } from '../../components/SettingsPlatformsTab';

interface SettingsWorkflowProps {
  collections: TokenCollection[];
  setCollections: (collections: TokenCollection[]) => void;
  modes: Mode[];
  setModes: (modes: Mode[]) => void;
  themes: unknown[];
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
  const [themeList, setThemeList] = useState(themes);

  useEffect(() => {
    setThemeList(themes);
  }, [themes]);

  const handleTabChange = (index: number) => {
    setActiveTab(index);
  };

  return (
    <Box>
      <Box bg="gray.50" p={2} borderRadius="md" boxShadow="md" mb={4}>
        <Tabs index={activeTab} onChange={handleTabChange} variant="enclosed" isFitted>
          <TabList>
            <Tab>Themes</Tab>
            <Tab>Taxonomies</Tab>
            <Tab>Platforms</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <SettingsThemesTab themes={themeList} setThemes={setThemeList} />
            </TabPanel>
            <TabPanel>
              <SettingsTaxonomiesTab 
                taxonomies={taxonomies} 
                setTaxonomies={setTaxonomies}
                taxonomyOrder={taxonomyOrder}
                setTaxonomyOrder={setTaxonomyOrder}
              />
            </TabPanel>
            <TabPanel>
              <SettingsPlatformsTab />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
} 