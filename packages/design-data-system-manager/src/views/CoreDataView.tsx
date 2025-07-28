import React from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel, Heading, Text, VStack, Container, Code } from '@chakra-ui/react';
import { CoreDataPropertiesTab } from './CoreDataPropertiesTab';
import { CoreDataExampleTab } from './CoreDataExampleTab';

const CoreDataView: React.FC = () => {
  return (
    <Container maxW="1000px" p={0}>
      <VStack spacing={4} align="stretch" mb={6}>
        <Heading size="lg">Core Data Schema</Heading>
        <Text>
          The core data schema defines the canonical structure for the Token Model system, including tokens, collections, dimensions, platforms, themes, and taxonomies. 
          It serves as the single source of truth for validation and interoperability, defining which tokens are themeable, how they can be customized, and how they relate to each other.
          The schema requires system identification, versioning, and comprehensive token definitions with support for multi-dimensional modes, platform-specific code syntax, and algorithmic generation.
          <b>Key updates:</b> Figma is now properly conceptualized as a publishing destination with dedicated configuration, and platform-specific overrides are handled through external platform extension files referenced via the <Code colorScheme="purple">extensionSource</Code> property in platforms.
        </Text>
      </VStack>

      <Tabs>
        <TabList>
          <Tab>Properties</Tab>
          <Tab>Example</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <CoreDataPropertiesTab />
          </TabPanel>
          <TabPanel>
            <CoreDataExampleTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export default CoreDataView; 