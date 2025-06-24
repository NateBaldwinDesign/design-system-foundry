import React from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel, Heading, Text, VStack, Container } from '@chakra-ui/react';
import { ThemeOverridesPropertiesTab } from './ThemeOverridesPropertiesTab';
import { ThemeOverridesExampleTab } from './ThemeOverridesExampleTab';

const ThemeOverridesView: React.FC = () => {
  return (
    <Container maxW="1000px" p={0}>
      <VStack spacing={4} align="stretch" mb={6}>
        <Heading size="lg">Theme Overrides Schema</Heading>
        <Text>
          Theme overrides provide a safe, schema-driven way to extend or customize tokens that are explicitly marked as themeable in the core data.
          This schema enables teams to create and maintain different themes independently, without modifying the core token set.
          Each theme override file must reference the core system ID and can only override tokens that are explicitly marked as themeable.
          The schema supports mode-specific overrides, platform-specific values, and comprehensive metadata for change tracking and documentation.
        </Text>
      </VStack>

      <Tabs>
        <TabList>
          <Tab>Properties</Tab>
          <Tab>Example</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <ThemeOverridesPropertiesTab />
          </TabPanel>
          <TabPanel>
            <ThemeOverridesExampleTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export default ThemeOverridesView; 