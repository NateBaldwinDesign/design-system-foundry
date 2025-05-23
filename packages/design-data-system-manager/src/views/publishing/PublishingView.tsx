import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { VerticalTabsLayout } from '../../components/VerticalTabsLayout';
import { PlatformsTab } from './PlatformsTab';
import { ValidationTab } from './ValidationTab';
import { Token, TokenCollection, Dimension, Platform, Taxonomy } from '@token-model/data-model';

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
  tokens = [],
  collections = [],
  dimensions = [],
  platforms = [],
  taxonomies = [],
  version = '1.0.0',
  versionHistory = []
}) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <VerticalTabsLayout
      tabs={[
        {
          id: 'platforms',
          label: 'Platforms',
          content: <PlatformsTab />
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