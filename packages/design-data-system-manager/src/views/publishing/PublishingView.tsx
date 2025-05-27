import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { VerticalTabsLayout } from '../../components/VerticalTabsLayout';
import { PlatformsTab } from './PlatformsTab';
import { ValidationTab } from './ValidationTab';
import { Token, TokenCollection, Dimension, Platform, Taxonomy } from '@token-model/data-model';

interface PublishingViewProps {
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  collections: TokenCollection[];
  setCollections: (collections: TokenCollection[]) => void;
  dimensions: Dimension[];
  setDimensions: (dimensions: Dimension[]) => void;
  platforms: Platform[];
  setPlatforms: (platforms: Platform[]) => void;
  taxonomies: Taxonomy[];
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
  setResolvedValueTypes: (types: { id: string; displayName: string }[]) => void;
  setThemes: (themes: unknown[]) => void;
  setModes: (modes: any[]) => void;
  setTaxonomyOrder: (order: string[]) => void;
}

const PublishingView: React.FC<PublishingViewProps> = ({
  tokens,
  setTokens,
  collections,
  setCollections,
  dimensions,
  setDimensions,
  platforms,
  setPlatforms,
  taxonomies,
  setTaxonomies,
  setResolvedValueTypes,
  setThemes,
  setModes,
  setTaxonomyOrder
}) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <VerticalTabsLayout
      tabs={[
        {
          id: 'platforms',
          label: 'Platforms',
          content: (
            <PlatformsTab
              platforms={platforms}
              setPlatforms={setPlatforms}
              tokens={tokens}
              setTokens={setTokens}
              taxonomies={taxonomies}
            />
          )
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
              version="1.0.0"
              versionHistory={[]}
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