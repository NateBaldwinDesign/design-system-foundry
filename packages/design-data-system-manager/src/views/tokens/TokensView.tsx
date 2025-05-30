import React, { useState } from 'react';
import { Box, Button, useToast } from '@chakra-ui/react';
import { LuPlus } from 'react-icons/lu';
import { VerticalTabsLayout } from '../../components/VerticalTabsLayout';
import { TokensTab } from './TokensTab';
import { CollectionsTab } from './CollectionsTab';
import { TokenEditorDialog, ExtendedToken } from '../../components/TokenEditorDialog';
import { ValidationService } from '../../services/validation';
import type { TokenCollection, Mode, Dimension, Platform, Taxonomy } from '@token-model/data-model';

interface TokensViewProps {
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  resolvedValueTypes: { id: string; displayName: string }[];
  onSaveToken: (token: ExtendedToken) => void;
  setCollections: (collections: TokenCollection[]) => void;
  activeTab: number;
  onTabChange: (index: number) => void;
}

const TokensView: React.FC<TokensViewProps> = ({
  tokens,
  collections,
  modes,
  dimensions,
  platforms,
  taxonomies,
  resolvedValueTypes,
  onSaveToken,
  setCollections,
  activeTab,
  onTabChange
}: TokensViewProps) => {
  const [selectedToken, setSelectedToken] = useState<ExtendedToken | null>(null);
  const [isTokenEditorOpen, setIsTokenEditorOpen] = useState(false);
  const toast = useToast();

  const handleSaveToken = (token: ExtendedToken) => {
    // Compose the new tokens array
    const newTokens = token.id
      ? tokens.map(t => t.id === token.id ? token : t)
      : [...tokens, token];
    // Compose the full data object for validation
    const data = {
      tokenCollections: collections,
      dimensions,
      tokens: newTokens,
      platforms,
      taxonomies,
      version: '1.0.0',
      versionHistory: []
    };
    const result = ValidationService.validateData(data);
    if (!result.isValid) {
      toast({
        title: 'Schema Validation Failed',
        description: 'Your change would make the data invalid. See the Validation tab for details.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    onSaveToken(token);
    setIsTokenEditorOpen(false);
    setSelectedToken(null);
  };

  // Wrap setCollections with schema validation
  const handleUpdateCollections = (newCollections: TokenCollection[]) => {
    const data = {
      tokenCollections: newCollections,
      dimensions,
      tokens,
      platforms,
      taxonomies,
      version: '1.0.0',
      versionHistory: []
    };
    const result = ValidationService.validateData(data);
    if (!result.isValid) {
      toast({
        title: 'Schema Validation Failed',
        description: 'Your change would make the data invalid. See the Validation tab for details.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    setCollections(newCollections);
  };

  return (
    <VerticalTabsLayout
      tabs={[
        {
          id: 'tokens',
          label: 'Tokens',
          content: (
            <>
              <TokensTab
                tokens={tokens}
                collections={collections}
                resolvedValueTypes={resolvedValueTypes}
                renderAddTokenButton={
                  <Button
                    leftIcon={<LuPlus />}
                    colorScheme="blue"
                    onClick={() => setIsTokenEditorOpen(true)}
                  >
                    Add Token
                  </Button>
                }
              />
              {isTokenEditorOpen && selectedToken && (
                <TokenEditorDialog
                  open={isTokenEditorOpen}
                  onClose={() => setIsTokenEditorOpen(false)}
                  token={selectedToken}
                  onSave={handleSaveToken}
                  tokens={tokens}
                  taxonomies={taxonomies}
                  resolvedValueTypes={resolvedValueTypes}
                  dimensions={dimensions}
                  platforms={platforms}
                  modes={modes}
                />
              )}
            </>
          )
        },
        {
          id: 'collections',
          label: 'Collections',
          content: (
            <CollectionsTab
              collections={collections}
              modes={modes}
              onUpdate={handleUpdateCollections}
            />
          )
        },
        {
          id: 'algorithms',
          label: 'Algorithms',
          content: (
            <Box>To be built...</Box>
          )
        }
      ]}
      activeTab={activeTab}
      onChange={onTabChange}
    />
  );
};

export default TokensView; 