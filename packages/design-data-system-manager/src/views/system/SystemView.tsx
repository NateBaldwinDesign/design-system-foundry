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

interface SystemViewProps {
  // Add any props that might be needed for system functionality
}

export const SystemView: React.FC<SystemViewProps> = () => {
  // Get data directly from storage for each component
  const dimensions = StorageService.getDimensions();
  const taxonomies = StorageService.getTaxonomies();
  const resolvedValueTypes = StorageService.getValueTypes();
  const tokens = StorageService.getTokens();
  const collections = StorageService.getCollections();
  const platforms = StorageService.getPlatforms();
  const themes = StorageService.getThemes();
  const componentProperties = StorageService.getComponentProperties();
  const componentCategories = StorageService.getComponentCategories();

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
              setDimensions={(dims) => StorageService.setDimensions(dims)}
            />
          </TabPanel>
          
          <TabPanel>
            <TaxonomyView
              taxonomies={taxonomies}
              setTaxonomies={(tax) => StorageService.setTaxonomies(tax)}
              tokens={tokens}
              collections={collections}
              dimensions={dimensions}
              platforms={platforms}
              resolvedValueTypes={resolvedValueTypes}
            />
          </TabPanel>
          
          <TabPanel>
            <ValueTypesView
              valueTypes={resolvedValueTypes}
              onUpdate={(types) => StorageService.setValueTypes(types)}
              tokens={tokens}
              collections={collections}
              dimensions={dimensions}
              platforms={platforms}
              taxonomies={taxonomies}
              themes={themes}
            />
          </TabPanel>

          <TabPanel>
            <ComponentCategoriesView
              componentCategories={componentCategories}
              setComponentCategories={(categories) => StorageService.setComponentCategories(categories)}
            />
          </TabPanel>

          <TabPanel>
            <ComponentPropertiesView
              componentProperties={componentProperties}
              setComponentProperties={(props) => StorageService.setComponentProperties(props)}
              tokens={tokens}
              collections={collections}
              dimensions={dimensions}
              platforms={platforms}
              resolvedValueTypes={resolvedValueTypes}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </PageTemplate>
  );
}; 