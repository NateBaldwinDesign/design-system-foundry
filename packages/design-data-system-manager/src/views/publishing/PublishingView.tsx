import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { VerticalTabsLayout } from '../../components/VerticalTabsLayout';
import { SettingsPlatformsTab } from '../../components/SettingsPlatformsTab';
import { ValidationTester } from '../../components/ValidationTester';
import { Token, TokenCollection } from '@token-model/data-model';

interface PublishingViewProps {
  tokens?: Token[];
  collections?: TokenCollection[];
}

const PublishingView: React.FC<PublishingViewProps> = ({
  tokens = [],
  collections = []
}) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <VerticalTabsLayout
      tabs={[
        {
          id: 'platforms',
          label: 'Platforms',
          content: <SettingsPlatformsTab />
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
            <ValidationTester
              tokens={tokens}
              collections={collections}
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