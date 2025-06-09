import React, { useState } from 'react';
import { Box } from '@chakra-ui/react';
import { VerticalTabsLayout } from '../../components/VerticalTabsLayout';
import { PlatformsView } from './PlatformsView';
import { ValidationView } from './ValidationView';
import type { Token, Platform, Taxonomy, TokenCollection, Dimension } from '@token-model/data-model';

interface PublishingViewProps {
  platforms: Platform[];
  setPlatforms: (platforms: Platform[]) => void;
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  taxonomies: Taxonomy[];
  collections: TokenCollection[];
  dimensions: Dimension[];
}

const PublishingView: React.FC<PublishingViewProps> = (props) => {
  const { platforms, setPlatforms, tokens, setTokens, taxonomies, collections, dimensions } = props;
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      id: '0',
      label: 'Platforms',
      content: (
        <PlatformsView
          platforms={platforms}
          setPlatforms={setPlatforms}
          tokens={tokens}
          setTokens={setTokens}
          taxonomies={taxonomies}
        />
      ),
    },
    {
      id: '1',
      label: 'Validation',
      content: (
        <ValidationView
          tokens={tokens}
          collections={collections}
          dimensions={dimensions}
          platforms={platforms}
          taxonomies={taxonomies}
        />
      ),
    },
  ];

  return (
    <Box>
      <VerticalTabsLayout
        tabs={tabs}
        activeTab={activeTab}
        onChange={(tabId: string) => setActiveTab(parseInt(tabId, 10))}
      />
    </Box>
  );
};

export default PublishingView; 