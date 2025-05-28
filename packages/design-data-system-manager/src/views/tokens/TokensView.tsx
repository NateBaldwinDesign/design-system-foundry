import React, { useState } from 'react';
import { Box, Button } from '@chakra-ui/react';
import { VerticalTabsLayout } from '../../components/VerticalTabsLayout';
import { TokensTab } from './TokensTab';
import { CollectionsTab } from './CollectionsTab';
import { TokenEditorDialog } from '../../components/TokenEditorDialog';
import { Token, TokenCollection, Mode, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { LuPlus } from 'react-icons/lu';
import { ValidationService } from '../../services/validation';
import { useToast } from '@chakra-ui/react';

interface TokensViewProps {
  tokens: Token[];
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  resolvedValueTypes: { id: string; displayName: string }[];
  onDeleteToken: (tokenId: string) => void;
  onSaveToken: (token: Token) => void;
  setCollections: (collections: TokenCollection[]) => void;
  activeTab: number;
  onTabChange: (index: number) => void;
  /**
   * Callback to switch to SetupView and Classification tab
   */
  onViewSetupClassificationTab?: () => void;
}

const TokensView: React.FC<TokensViewProps> = ({
  tokens,
  collections,
  modes,
  dimensions,
  platforms,
  taxonomies,
  resolvedValueTypes,
  onDeleteToken,
  onSaveToken,
  setCollections,
  activeTab,
  onTabChange,
  onViewSetupClassificationTab
}: TokensViewProps) => {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const toast = useToast();

  const handleEditToken = (token: Token) => {
    if (!isOpen) {
      setSelectedToken(token);
      setIsOpen(true);
    }
  };

  const handleAddToken = () => {
    if (!isOpen) {
      setSelectedToken({
        id: '',
        displayName: '',
        valuesByMode: [],
        resolvedValueType: 'COLOR',
        tokenCollectionId: '',
        private: false,
        themeable: false,
        taxonomies: [],
        propertyTypes: [],
        codeSyntax: {}
      });
      setIsOpen(true);
    }
  };

  const handleSaveToken = (token: Token) => {
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
    setIsOpen(false);
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

  // Handler for popover link: close dialog, then navigate
  const handleViewClassifications = () => {
    console.log('[TokensView] handleViewClassifications called');
    setTimeout(() => {
      console.log('[TokensView] setTimeout: closing dialog');
      handleClose();
      console.log('[TokensView] setTimeout: dialog closed, navigating');
      if (onViewSetupClassificationTab) {
        onViewSetupClassificationTab();
      } else {
        console.log('onViewSetupClassificationTab is not defined');
      }
    }, 0);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedToken(null);
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
                modes={modes}
                dimensions={dimensions}
                platforms={platforms}
                onEdit={handleEditToken}
                onDelete={onDeleteToken}
                taxonomies={taxonomies}
                resolvedValueTypes={resolvedValueTypes}
                onViewClassifications={handleViewClassifications}
                renderAddTokenButton={
                  <Button colorScheme="blue" size="sm" onClick={handleAddToken} leftIcon={<LuPlus />}>
                    Add Token
                  </Button>
                }
              />
              {isOpen && selectedToken && (
                <TokenEditorDialog
                  token={selectedToken}
                  tokens={tokens}
                  dimensions={dimensions}
                  modes={modes}
                  platforms={platforms}
                  open={isOpen}
                  onClose={handleClose}
                  onSave={handleSaveToken}
                  taxonomies={taxonomies}
                  resolvedValueTypes={resolvedValueTypes}
                  isNew={!selectedToken.id}
                  onViewClassifications={handleViewClassifications}
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