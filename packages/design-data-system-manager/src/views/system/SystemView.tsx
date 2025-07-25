import React from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { DimensionsView } from '../setup/DimensionsView';
import { ClassificationView } from '../setup/ClassificationView';
import { ValueTypesView } from '../setup/ValueTypesView';
import { NamingRulesView } from '../setup/NamingRulesView';
import { StorageService } from '../../services/storage';

interface SystemViewProps {
  // Add any props that might be needed for system functionality
}

export const SystemView: React.FC<SystemViewProps> = () => {
  // Get data directly from storage for each component
  const dimensions = StorageService.getDimensions();
  const dimensionOrder = StorageService.getDimensionOrder();
  const taxonomies = StorageService.getTaxonomies();
  const taxonomyOrder = StorageService.getNamingRules()?.taxonomyOrder || [];
  const resolvedValueTypes = StorageService.getValueTypes();
  const tokens = StorageService.getTokens();
  const collections = StorageService.getCollections();
  const platforms = StorageService.getPlatforms();
  const themes = StorageService.getThemes();

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <HStack spacing={4} align="center" mb={2}>
            <Heading size="lg">System</Heading>
          </HStack>
        </Box>

        {/* Tabs */}
        <Tabs>
          <TabList>
            <Tab>Dimensions</Tab>
            <Tab>Taxonomies</Tab>
            <Tab>Naming Rules</Tab>
            <Tab>Value Types</Tab>
          </TabList>

          <TabPanels mt={4}>
            <TabPanel>
              <DimensionsView
                dimensions={dimensions}
                setDimensions={(dims) => StorageService.setDimensions(dims)}
                dimensionOrder={dimensionOrder}
                setDimensionOrder={(order) => StorageService.setDimensionOrder(order)}
              />
            </TabPanel>
            
            <TabPanel>
              <ClassificationView
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
              <NamingRulesView
                taxonomies={taxonomies}
                taxonomyOrder={taxonomyOrder}
                setTaxonomyOrder={(order) => StorageService.setNamingRules({ taxonomyOrder: order })}
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
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}; 