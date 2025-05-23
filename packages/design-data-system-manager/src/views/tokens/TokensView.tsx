import React, { useState } from 'react';
import { Box, Button } from '@chakra-ui/react';
import { VerticalTabsLayout } from '../../components/VerticalTabsLayout';
import { TokenList } from '../../components/TokenList';
import { CollectionsWorkflow } from '../../components/CollectionsWorkflow';
import { SettingsWorkflow } from '../settings/SettingsWorkflow';
import { ValidationTester } from '../../components/ValidationTester';
import { TokenEditorDialog } from '../../components/TokenEditorDialog';
import { Token, TokenCollection, Mode, Dimension, Platform, Taxonomy } from '@token-model/data-model';

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
  onViewSetupClassificationTab
}: TokensViewProps) => {
  const [activeTab, setActiveTab] = useState(0);
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
              <TokenList
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
              />
              <Button colorScheme="blue" size="sm" onClick={handleAddToken} mb={4}>
                Add Token
              </Button>
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
            <CollectionsWorkflow
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
        },
        {
          id: 'settings',
          label: 'Settings',
          content: (
            <SettingsWorkflow
              collections={collections}
              setCollections={setCollections}
              modes={modes}
              setModes={setModes}
              themes={themes}
              taxonomies={taxonomies}
              setTaxonomies={setTaxonomies}
              taxonomyOrder={taxonomyOrder}
              setTaxonomyOrder={setTaxonomyOrder}
              resolvedValueTypes={resolvedValueTypes}
              setResolvedValueTypes={setResolvedValueTypes}
            />
          )
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
        }
      ]}
      activeTab={activeTab}
      onChange={setActiveTab}
    />
  );
};

export default TokensView; 