import React from 'react';
import { Box, Button } from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import type { ViewId } from '../hooks/useViewState';
import type { 
  TokenCollection, 
  Mode, 
  Dimension, 
  Platform, 
  Taxonomy, 
  Theme, 
  ResolvedValueType
} from '@token-model/data-model';
import type { ExtendedToken } from './TokenEditorDialog';
import type { Algorithm } from '../types/algorithm';
import type { Schema } from '../hooks/useSchema';
import type { GitHubUser } from '../config/github';

// Import all view components
import DashboardView from '../views/dashboard/DashboardView';
import { TokensView } from '../views/tokens/TokensView';
import { CollectionsView } from '../views/tokens/CollectionsView';
import { SystemVariablesView } from '../views/tokens/SystemVariablesView';
import AlgorithmsView from '../views/tokens/AlgorithmsView';
import { TokenAnalysis } from '../views/tokens/TokenAnalysis';
import { DimensionsView } from '../views/setup/DimensionsView';
import { ClassificationView } from '../views/setup/ClassificationView';
import { NamingRulesView } from '../views/setup/NamingRulesView';
import { ValueTypesView } from '../views/setup/ValueTypesView';
import ThemesView from '../views/themes/ThemesView';

import { PlatformsView } from '../views/platforms/PlatformsView';
import { ValidationView } from '../views/publishing/ValidationView';
import { ExportSettingsView } from '../views/publishing/ExportSettingsView';
import CoreDataView from '../views/schemas/CoreDataView';
import ThemeOverridesView from '../views/schemas/ThemeOverridesView';
import AlgorithmDataView from '../views/schemas/AlgorithmDataView';
import { TokenEditorDialog } from './TokenEditorDialog';

interface ViewRendererProps {
  currentView: ViewId;
  // Data props
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  resolvedValueTypes: ResolvedValueType[];
  platforms: Platform[];
  themes: Theme[];
  taxonomies: Taxonomy[];
  algorithms: Algorithm[];
  dimensionOrder: string[];
  taxonomyOrder: string[];
  schema: Schema | null;
  // GitHub user info
  githubUser: GitHubUser | null;
  // Handler props
  onUpdateTokens: (tokens: ExtendedToken[]) => void;
  onUpdateCollections: (collections: TokenCollection[]) => void;
  onUpdateDimensions: (dimensions: Dimension[]) => void;
  onUpdateResolvedValueTypes: (valueTypes: ResolvedValueType[]) => void;
  onUpdatePlatforms: (platforms: Platform[]) => void;
  onUpdateThemes: (themes: Theme[]) => void;
  onUpdateTaxonomies: (taxonomies: Taxonomy[]) => void;
  onUpdateAlgorithms: (algorithms: Algorithm[]) => void;
  setDimensionOrder: (order: string[]) => void;
  setTaxonomyOrder: (order: string[]) => void;
  // Token editor props
  selectedToken: ExtendedToken | null;
  isEditorOpen: boolean;
  onAddToken: () => void;
  onEditToken: (token: ExtendedToken) => void;
  onCloseEditor: () => void;
  onSaveToken: (token: ExtendedToken) => void;
  onDeleteToken: (tokenId: string) => void;
}

export const ViewRenderer: React.FC<ViewRendererProps> = ({
  currentView,
  tokens,
  collections,
  modes,
  dimensions,
  resolvedValueTypes,
  platforms,
  themes,
  taxonomies,
  algorithms,
  dimensionOrder,
  taxonomyOrder,
  schema,
  githubUser,
  onUpdateTokens,
  onUpdateCollections,
  onUpdateDimensions,
  onUpdateResolvedValueTypes,
  onUpdatePlatforms,
  onUpdateThemes,
  onUpdateTaxonomies,
  onUpdateAlgorithms,
  setDimensionOrder,
  setTaxonomyOrder,
  selectedToken,
  isEditorOpen,
  onAddToken,
  onEditToken,
  onCloseEditor,
  onSaveToken,
  onDeleteToken,
}) => {
  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView tokens={tokens} platforms={platforms} themes={themes} githubUser={githubUser} />;
      
      case 'tokens':
        return (
          <>
            <TokensView
              tokens={tokens}
              collections={collections}
              resolvedValueTypes={resolvedValueTypes}
              modes={modes}
              taxonomies={taxonomies}
              renderAddTokenButton={
                <Button colorScheme="blue" size="sm" onClick={onAddToken} leftIcon={<Plus />}>
                  Add Token
                </Button>
              }
              onEditToken={onEditToken}
            />
            {isEditorOpen && selectedToken && (
              <TokenEditorDialog
                token={selectedToken}
                tokens={tokens}
                dimensions={dimensions}
                modes={modes}
                platforms={platforms}
                open={isEditorOpen}
                onClose={onCloseEditor}
                onSave={onSaveToken}
                taxonomies={taxonomies}
                resolvedValueTypes={resolvedValueTypes}
                isNew={!selectedToken.id}
                onViewClassifications={() => {}}
                onDeleteToken={onDeleteToken}
                collections={collections}
                schema={schema}
              />
            )}
          </>
        );
      
      case 'collections':
        return <CollectionsView collections={collections} onUpdate={onUpdateCollections} tokens={tokens} resolvedValueTypes={resolvedValueTypes} />;
      
      case 'system-variables':
        return <SystemVariablesView dimensions={dimensions} />;
      
      case 'algorithms':
        return <AlgorithmsView algorithms={algorithms} onUpdate={onUpdateAlgorithms} onUpdateTokens={onUpdateTokens} />;
      
      case 'analysis':
        return <TokenAnalysis tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} taxonomies={taxonomies} resolvedValueTypes={resolvedValueTypes} />;
      
      case 'dimensions':
        return (
          <DimensionsView 
            dimensions={dimensions} 
            setDimensions={onUpdateDimensions}
            dimensionOrder={dimensionOrder}
            setDimensionOrder={setDimensionOrder}
            onDataChange={(data) => {
              onUpdateDimensions(data.dimensions);
              setDimensionOrder(data.dimensionOrder);
            }}
          />
        );
      
      case 'classification':
        return <ClassificationView taxonomies={taxonomies} setTaxonomies={onUpdateTaxonomies} tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} resolvedValueTypes={resolvedValueTypes} />;
      
      case 'naming-rules':
        return <NamingRulesView taxonomies={taxonomies} taxonomyOrder={taxonomyOrder} setTaxonomyOrder={setTaxonomyOrder} />;
      
      case 'value-types':
        return <ValueTypesView valueTypes={resolvedValueTypes} onUpdate={onUpdateResolvedValueTypes} tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} taxonomies={taxonomies} themes={themes} />;
      
      case 'themes':
        return <ThemesView themes={themes} setThemes={onUpdateThemes} />;
      
      case 'platforms':
        return <PlatformsView />;
      
      case 'figma-settings':
        return <ExportSettingsView />;
      
      case 'validation':
        return <ValidationView tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} taxonomies={taxonomies} version="1.0.0" versionHistory={[]} onValidate={() => {}} />;
      
      case 'version-history':
        return <Box p={4}>Version history content coming soon...</Box>;
      
      case 'access':
        return <Box p={4}>Access management coming soon...</Box>;
      
      case 'core-data':
        return <CoreDataView />;
      
      case 'theme-overrides':
        return <ThemeOverridesView />;
      
      case 'algorithm-data':
        return <AlgorithmDataView />;
      
      default:
        return <DashboardView tokens={tokens} platforms={platforms} themes={themes} githubUser={githubUser} />;
    }
  };

  return <>{renderView()}</>;
}; 