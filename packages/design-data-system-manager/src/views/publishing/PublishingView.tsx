import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { VerticalTabsLayout } from '../../components/VerticalTabsLayout';
import { PlatformsTab } from './PlatformsTab';
import { ValidationTab } from './ValidationTab';
import { Token, TokenCollection, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { StorageService } from '../../services/storage';

interface PublishingViewProps {
  tokens?: Token[];
  collections?: TokenCollection[];
  dimensions?: Dimension[];
  platforms?: Platform[];
  taxonomies?: Taxonomy[];
  version?: string;
  versionHistory?: unknown[];
}

const PublishingView: React.FC<PublishingViewProps> = ({
  tokens: initialTokens = [],
  collections: initialCollections = [],
  dimensions: initialDimensions = [],
  platforms: initialPlatforms = [],
  taxonomies: initialTaxonomies = [],
  version: initialVersion = '1.0.0',
  versionHistory: initialVersionHistory = []
}) => {
  const [tokens, setTokens] = useState<Token[]>(initialTokens);
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);
  const [collections, setCollections] = useState<TokenCollection[]>(initialCollections);
  const [dimensions, setDimensions] = useState<Dimension[]>(initialDimensions);
  const [taxonomies, setTaxonomies] = useState<Taxonomy[]>(initialTaxonomies);
  const [version, setVersion] = useState<string>(initialVersion);
  const [versionHistory, setVersionHistory] = useState<unknown[]>(initialVersionHistory);

  const reloadAllData = () => {
    setTokens(StorageService.getTokens() || []);
    setPlatforms(StorageService.getPlatforms() || []);
    setCollections(StorageService.getCollections ? StorageService.getCollections() : []);
    setDimensions(StorageService.getDimensions ? StorageService.getDimensions() : []);
    setTaxonomies(StorageService.getTaxonomies ? StorageService.getTaxonomies() : []);
    setVersion(StorageService.getVersion ? StorageService.getVersion() : '1.0.0');
    setVersionHistory(StorageService.getVersionHistory ? StorageService.getVersionHistory() : []);
  };

  const [activeTab, setActiveTab] = useState(0);

  return (
    <VerticalTabsLayout
      tabs={[
        {
          id: 'platforms',
          label: 'Platforms',
          content: <PlatformsTab onDataChange={reloadAllData} />
        },
        {
          id: 'export-settings',
          label: 'Export Settings',
          content: <Box p={4}>Export settings content coming soon...</Box>
        },
        {
          id: 'validation',
          label: 'Validation',
          content: (
            <ValidationTab
              tokens={tokens}
              collections={collections}
              dimensions={dimensions}
              platforms={platforms}
              taxonomies={taxonomies}
              version={version}
              versionHistory={versionHistory}
              onValidate={() => {}}
            />
          )
        },
        {
          id: 'version-history',
          label: 'Version History',
          content: <Box p={4}>Version history content coming soon...</Box>
        }
      ]}
      activeTab={activeTab}
      onChange={setActiveTab}
    />
  );
};

export default PublishingView; 