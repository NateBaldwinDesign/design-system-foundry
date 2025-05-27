import React, { useState } from 'react';
import { Box, Button } from '@chakra-ui/react';
import { VerticalTabsLayout } from '../../components/VerticalTabsLayout';
import { TokensTab } from './TokensTab';
import { CollectionsTab } from './CollectionsTab';
import { TokenEditorDialog } from '../../components/TokenEditorDialog';
import { Token, TokenCollection, Mode, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { AddIcon } from '@chakra-ui/icons';

interface Theme {
  id: string;
  displayName: string;
  description?: string;
  isDefault?: boolean;
}

interface TokensViewProps {
  tokens: Token[];
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  resolvedValueTypes: { id: string; displayName: string }[];
  themes: Theme[];
  taxonomyOrder: string[];
  onDeleteToken: (tokenId: string) => void;
  onSaveToken: (token: Token) => void;
  setCollections: (collections: TokenCollection[]) => void;
  setModes: (modes: Mode[]) => void;
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
  setTaxonomyOrder: (order: string[]) => void;
  setResolvedValueTypes: (types: { id: string; displayName: string }[]) => void;
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
  themes,
  taxonomyOrder,
  onDeleteToken,
  onSaveToken,
  setCollections,
  setModes,
  setTaxonomies,
  setTaxonomyOrder,
  setResolvedValueTypes,
  activeTab,
  onTabChange,
  onViewSetupClassificationTab
}: TokensViewProps) => {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    setSelectedToken(null);
  };

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
    onSaveToken(token);
    setIsOpen(false);
    setSelectedToken(null);
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
                  <Button colorScheme="blue" size="sm" onClick={handleAddToken} leftIcon={<AddIcon />}>
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
              onUpdate={setCollections}
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