import React from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel, Heading, Text, VStack, Container, Code } from '@chakra-ui/react';
import { PlatformOverridesPropertiesTab } from './PlatformOverridesPropertiesTab';
import { PlatformOverridesExampleTab } from './PlatformOverridesExampleTab';

const PlatformOverridesView: React.FC = () => {
  return (
    <Container maxW="1000px" p={0}>
      <VStack spacing={4} align="stretch" mb={6}>
        <Heading size="lg">Platform Extension Schema</Heading>
        <Text>
          Platform extensions provide a safe, schema-driven way to extend or customize tokens for specific platforms while maintaining the core token set as the single source of truth.
          This schema enables platform teams to create and maintain platform-specific overrides, additions, and configurations independently.
          Each platform extension must reference the core system ID and platform ID, and includes a unique <Code colorScheme="purple">figmaFileKey</Code> for platform-specific Figma publishing.
          The schema supports token overrides, algorithm variable overrides, syntax patterns, value formatters, and mode/dimension omissions for platform-specific customization.
        </Text>
      </VStack>

      <Tabs>
        <TabList>
          <Tab>Properties</Tab>
          <Tab>Example</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <PlatformOverridesPropertiesTab />
          </TabPanel>
          <TabPanel>
            <PlatformOverridesExampleTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export default PlatformOverridesView; 