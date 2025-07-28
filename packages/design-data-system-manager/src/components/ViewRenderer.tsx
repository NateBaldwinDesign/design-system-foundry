import React from 'react';
import { Button } from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import type { ViewId } from '../hooks/useViewState';
import type { 
  TokenCollection, 
  Mode, 
  Dimension, 
  Platform, 
  Taxonomy, 
  Theme, 
  ResolvedValueType,
  ComponentProperty
} from '@token-model/data-model';
import type { ExtendedToken } from './TokenEditorDialog';
import type { Algorithm } from '../types/algorithm';
import type { Schema } from '../hooks/useSchema';
import type { GitHubUser } from '../config/github';

// Import all view components
import DashboardView from '../views/DashboardView';
import { TokensView } from '../views/TokensView';
import { SystemVariablesView } from '../views/SystemVariablesView';
import AlgorithmsView from '../views/AlgorithmsView';
import { TokenAnalysis } from '../views/TokenAnalysis';
import { DimensionsView } from '../views/system/DimensionsView';
import { TaxonomyView } from '../views/system/TaxonomyView';
import { ValueTypesView } from '../views/system/ValueTypesView';
import ThemesView from '../views/ThemesView';
import { PlatformsView } from '../views/PlatformsView';
import { ValidationView } from '../views/ValidationView';
import { SystemView } from '../views/system/SystemView';
import { TokenEditorDialog } from './TokenEditorDialog';
import { FigmaSettings } from './FigmaSettings';
import { createSchemaJsonFromLocalStorage } from '../services/createJson';
import type { TokenSystem } from '@token-model/data-model';
import SchemasView from '../views/SchemasView';

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
  componentProperties: ComponentProperty[];
  algorithms: Algorithm[];
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
  componentProperties,
  algorithms,
  schema,
  githubUser,
  onUpdateTokens,
  onUpdateDimensions,
  onUpdateResolvedValueTypes,
  onUpdatePlatforms,
  onUpdateThemes,
  onUpdateTaxonomies,
  onUpdateAlgorithms,
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
          />
        );
      
      case 'classification':
        return <TaxonomyView taxonomies={taxonomies} setTaxonomies={onUpdateTaxonomies} tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} resolvedValueTypes={resolvedValueTypes} />;
      
      case 'value-types':
        return <ValueTypesView valueTypes={resolvedValueTypes} onUpdate={onUpdateResolvedValueTypes} tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} taxonomies={taxonomies} themes={themes} />;
      
      case 'themes':
        return <ThemesView themes={themes} setThemes={onUpdateThemes} />;
      
      case 'platforms':
        return <PlatformsView platforms={platforms} setPlatforms={onUpdatePlatforms} />;
      
      case 'figma-settings':
        return <FigmaSettings tokenSystem={createSchemaJsonFromLocalStorage() as unknown as TokenSystem} />;
      
      case 'validation':
        return <ValidationView tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} taxonomies={taxonomies} version="1.0.0" versionHistory={[]} onValidate={() => {}} />;
      
      case 'schemas':
        return <SchemasView />;
      
      case 'system':
        return <SystemView />;
      
      default:
        return <DashboardView tokens={tokens} platforms={platforms} themes={themes} githubUser={githubUser} />;
    }
  };

  return <>{renderView()}</>;
}; 