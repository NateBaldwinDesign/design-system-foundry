import React from 'react';
import {
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { DimensionsView } from './DimensionsView';
import { TaxonomyView } from './TaxonomyView';
import { ValueTypesView } from './ValueTypesView';
import { ComponentPropertiesView } from './ComponentPropertiesView';
import { ComponentCategoriesView } from './ComponentCategoriesView';
import { PageTemplate } from '../../components/PageTemplate';
import { StorageService } from '../../services/storage';
import type { TokenSystem, PlatformExtension, ThemeOverrideFile } from '@token-model/data-model';

interface SystemViewProps {
  canEdit?: boolean;
}

export const SystemView: React.FC<SystemViewProps> = ({ canEdit = false }) => {
  // Get data from the new data management system
  const localEdits = StorageService.getLocalEdits();
  const mergedData = StorageService.getMergedData();
  
  // Use merged data for display, fallback to local edits if merged data is not available
  const displayData = mergedData || localEdits;
  
  // Helper function to safely extract data from different types
  const extractData = (data: TokenSystem | PlatformExtension | ThemeOverrideFile | null) => {
    if (!data) return {};
    
    // Check if it's a TokenSystem (has dimensions, tokens, etc.)
    if ('dimensions' in data) {
      return {
        dimensions: data.dimensions || [],
        taxonomies: data.taxonomies || [],
        resolvedValueTypes: data.resolvedValueTypes || [],
        tokens: data.tokens || [],
        collections: data.tokenCollections || [],
        platforms: data.platforms || [],
        themes: data.themes || [],
        componentProperties: data.componentProperties || [],
        componentCategories: data.componentCategories || []
      };
    }
    
    // For other types, return empty arrays
    return {
      dimensions: [],
      taxonomies: [],
      resolvedValueTypes: [],
      tokens: [],
      collections: [],
      platforms: [],
      themes: [],
      componentProperties: [],
      componentCategories: []
    };
  };
  
  const {
    dimensions,
    taxonomies,
    resolvedValueTypes,
    tokens,
    collections,
    platforms,
    themes,
    componentProperties,
    componentCategories
  } = extractData(displayData);

  return (
    <PageTemplate 
      title="System"
    >
      <Tabs>
        <TabList>
          <Tab>Dimensions</Tab>
          <Tab>Taxonomies</Tab>
          <Tab>Value Types</Tab>
          <Tab>Component Categories</Tab>
          <Tab>Component Properties</Tab>
        </TabList>

        <TabPanels mt={4}>
          <TabPanel>
            <DimensionsView
              dimensions={dimensions}
              setDimensions={(dims) => StorageService.updateLocalEditsDimensions(dims)}
              canEdit={canEdit}
            />
          </TabPanel>
          
          <TabPanel>
            <TaxonomyView
              taxonomies={taxonomies}
              setTaxonomies={(tax) => StorageService.updateLocalEditsTaxonomies(tax)}
              tokens={tokens}
              collections={collections}
              dimensions={dimensions}
              platforms={platforms}
              resolvedValueTypes={resolvedValueTypes}
              canEdit={canEdit}
            />
          </TabPanel>
          
          <TabPanel>
            <ValueTypesView
              valueTypes={resolvedValueTypes}
              onUpdate={(types) => StorageService.updateLocalEditsValueTypes(types)}
              tokens={tokens}
              collections={collections}
              dimensions={dimensions}
              platforms={platforms}
              taxonomies={taxonomies}
              themes={themes}
              canEdit={canEdit}
            />
          </TabPanel>

          <TabPanel>
            <ComponentCategoriesView
              componentCategories={componentCategories}
              setComponentCategories={(categories) => StorageService.updateLocalEditsComponentCategories(categories)}
              canEdit={canEdit}
            />
          </TabPanel>

          <TabPanel>
            <ComponentPropertiesView
              componentProperties={componentProperties}
              setComponentProperties={(props) => StorageService.updateLocalEditsComponentProperties(props)}
              tokens={tokens}
              collections={collections}
              dimensions={dimensions}
              platforms={platforms}
              resolvedValueTypes={resolvedValueTypes}
              canEdit={canEdit}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </PageTemplate>
  );
}; 