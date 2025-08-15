import React from 'react';
import { Button } from '@chakra-ui/react';
import { Plus } from 'lucide-react';
import type { ViewId } from '../hooks/useViewState';
import { PageLoader } from './PageLoader';
import type { 
  TokenCollection, 
  Mode, 
  Dimension, 
  Platform, 
  Taxonomy, 
  Theme, 
  ResolvedValueType,
  ComponentProperty,
  ComponentCategory,
  Component
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
import FoundationsView from '../views/FoundationsView';
import { DimensionsView } from '../views/system/DimensionsView';
import { TaxonomyView } from '../views/system/TaxonomyView';
import { ValueTypesView } from '../views/system/ValueTypesView';
import ThemesView from '../views/ThemesView';
import { PlatformsView } from '../views/PlatformsView';
import { ValidationView } from '../views/ValidationView';
import { SystemView } from '../views/system/SystemView';
import { TokenEditorDialog } from './TokenEditorDialog';
import { FigmaConfigurationsView } from '../views/FigmaConfigurationsView';
import { createSchemaJsonFromLocalStorage } from '../services/createJson';
import { StorageService } from '../services/storage';
import type { TokenSystem } from '@token-model/data-model';
import SchemasView from '../views/SchemasView';
import ComponentsView from '../views/ComponentsView';
import { CollectionsView } from '../views/CollectionsView';
import AnalysisView from '../views/AnalysisView';

import type { DataSourceContext } from '../services/dataSourceManager';

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
  componentCategories: ComponentCategory[];
  components: Component[];
  algorithms: Algorithm[];
  schema: Schema | null;
  // GitHub user info
  githubUser: GitHubUser | null;
  // View mode
  isViewOnlyMode?: boolean;
  canEdit?: boolean;
  // Data source context
  dataSourceContext?: DataSourceContext;
  // App loading state
  isAppLoading?: boolean;
  // Order props
  dimensionOrder?: string[];
  taxonomyOrder?: string[];
  setDimensionOrder?: (order: string[]) => void;
  setTaxonomyOrder?: (order: string[]) => void;
  // Handler props
  onUpdateTokens: (tokens: ExtendedToken[]) => void;
  onUpdateCollections: (collections: TokenCollection[]) => void;
  onUpdateDimensions: (dimensions: Dimension[]) => void;
  onUpdateResolvedValueTypes: (valueTypes: ResolvedValueType[]) => void;
  onUpdatePlatforms: (platforms: Platform[]) => void;
  onUpdateThemes: (themes: Theme[]) => void;
  onUpdateTaxonomies: (taxonomies: Taxonomy[]) => void;
  onUpdateComponentProperties: (properties: ComponentProperty[]) => void;
  onUpdateComponentCategories: (categories: ComponentCategory[]) => void;
  onUpdateComponents: (components: Component[]) => void;
  onUpdateAlgorithms: (algorithms: Algorithm[]) => void;
  // Token editor props
  selectedToken: ExtendedToken | null;
  isEditorOpen: boolean;
  onAddToken: () => void;
  onEditToken: (token: ExtendedToken) => void;
  onCloseEditor: () => void;
  onSaveToken: (token: ExtendedToken) => void;
  onDeleteToken: (tokenId: string) => void;
  // NEW: Unified edit permissions function
  hasEditPermissions?: () => boolean;
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
  componentCategories,
  components,
  algorithms,
  schema,
  githubUser,
  isViewOnlyMode = false,
  canEdit = false,
  dataSourceContext,
  isAppLoading = false,
  dimensionOrder,
  taxonomyOrder,
  setDimensionOrder,
  setTaxonomyOrder,
  onUpdateTokens,
  onUpdateCollections,
  onUpdateDimensions,
  onUpdateResolvedValueTypes,
  onUpdatePlatforms,
  onUpdateThemes,
  onUpdateTaxonomies,
  onUpdateComponentProperties,
  onUpdateComponentCategories,
  onUpdateComponents,
  onUpdateAlgorithms,
  selectedToken,
  isEditorOpen,
  onAddToken,
  onEditToken,
  onCloseEditor,
  onSaveToken,
  onDeleteToken,
  // NEW: Unified edit permissions function
  hasEditPermissions,
}) => {
  // Views should show edit capabilities when user has permissions AND is in edit mode
  // canEdit prop already combines hasEditPermissions && isEditMode from App.tsx
  const effectiveCanEdit = canEdit;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView 
          tokens={tokens} 
          platforms={platforms} 
          themes={themes} 
          componentCategories={componentCategories}
          componentProperties={componentProperties}
          components={components}
          githubUser={githubUser} 
        />;
      
      case 'tokens':
        return (
          <>
            <TokensView
              tokens={tokens}
              collections={collections}
              resolvedValueTypes={resolvedValueTypes}
              modes={modes}
              dimensions={dimensions}
              taxonomies={taxonomies}
              canEdit={effectiveCanEdit}
              dataSourceContext={dataSourceContext}
              dimensionOrder={dimensionOrder}
              renderAddTokenButton={
                effectiveCanEdit ? (
                  <Button colorScheme="blue" size="sm" onClick={onAddToken} leftIcon={<Plus />}>
                    Add Token
                  </Button>
                ) : null
              }
              onEditToken={effectiveCanEdit ? onEditToken : undefined}
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
                dataSourceContext={dataSourceContext}
              />
            )}
          </>
        );

      case 'system-variables':
        return <SystemVariablesView dimensions={dimensions} canEdit={effectiveCanEdit} />;
      
      case 'foundations':
        return <FoundationsView canEdit={effectiveCanEdit} />;
      
      case 'algorithms':
        return <AlgorithmsView algorithms={algorithms} onUpdate={onUpdateAlgorithms} onUpdateTokens={onUpdateTokens} canEdit={effectiveCanEdit} />;
      
      case 'analysis':
        return <AnalysisView/>;
      
      case 'dimensions':
        return (
          <DimensionsView 
            dimensions={dimensions} 
            setDimensions={onUpdateDimensions}
            canEdit={effectiveCanEdit}
          />
        );
      
      case 'classification':
        return <TaxonomyView taxonomies={taxonomies} setTaxonomies={onUpdateTaxonomies} tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} resolvedValueTypes={resolvedValueTypes} canEdit={effectiveCanEdit} />;
      
      case 'value-types':
        return <ValueTypesView valueTypes={resolvedValueTypes} onUpdate={onUpdateResolvedValueTypes} tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} taxonomies={taxonomies} themes={themes} canEdit={effectiveCanEdit} />;
      
      case 'collections':
        return <CollectionsView collections={collections} onUpdate={onUpdateCollections} tokens={tokens} resolvedValueTypes={resolvedValueTypes} canEdit={effectiveCanEdit} />;
      
      case 'themes':
        return <ThemesView themes={themes} setThemes={onUpdateThemes} canEdit={effectiveCanEdit} />;
      
      case 'platforms':
        return <PlatformsView platforms={platforms} setPlatforms={onUpdatePlatforms} canEdit={effectiveCanEdit} />;
      
      case 'figma-settings': {
        // Get the appropriate token system based on current source context
        const getTokenSystemForFigmaSettings = () => {
          const sourceContext = dataSourceContext;
          
          if (sourceContext?.currentPlatform === null && sourceContext?.currentTheme === null) {
            // Core data - use pure core data, not merged data
            const coreData = StorageService.getCoreData();
            
            if (!coreData) {
              // Fallback to createSchemaJsonFromLocalStorage if no core data
              return createSchemaJsonFromLocalStorage();
            }
            
            // Ensure dimensionOrder is included from localStorage if not present in coreData
            if (!coreData.dimensionOrder || coreData.dimensionOrder.length === 0) {
              const dimensionOrder = StorageService.getDimensionOrder();
              if (dimensionOrder && dimensionOrder.length > 0) {
                coreData.dimensionOrder = dimensionOrder;
              }
            }
            
            return coreData;
          } else {
            // Platform or theme source - use merged data
            return createSchemaJsonFromLocalStorage();
          }
        };
        
        return <FigmaConfigurationsView 
          tokenSystem={getTokenSystemForFigmaSettings()} 
          canEdit={effectiveCanEdit} 
          dataSourceContext={dataSourceContext} 
          hasEditPermissions={hasEditPermissions}
        />;
      }
      
      case 'validation':
        return <ValidationView tokens={tokens} collections={collections} dimensions={dimensions} platforms={platforms} taxonomies={taxonomies} version="1.0.0" versionHistory={[]} onValidate={() => {}} />;
      
      case 'schemas':
        return <SchemasView />;
      
      case 'system':
        return <SystemView canEdit={effectiveCanEdit} />;
      
      case 'components':
        return (
          <ComponentsView
            components={components}
            setComponents={onUpdateComponents}
            componentCategories={componentCategories}
            componentProperties={componentProperties}
            canEdit={effectiveCanEdit}
          />
        );
      
      default:
        return <DashboardView 
          tokens={tokens} 
          platforms={platforms} 
          themes={themes} 
          componentCategories={componentCategories}
          componentProperties={componentProperties}
          components={components}
          githubUser={githubUser} 
        />;
    }
  };

  return (
    <PageLoader isLoading={isAppLoading}>
      {renderView()}
    </PageLoader>
  );
}; 