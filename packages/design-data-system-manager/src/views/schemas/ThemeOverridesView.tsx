import React from 'react';
import { Tabs, Heading, Text, VStack, Container } from '@chakra-ui/react';
import { ThemeOverridesPropertiesTab } from './ThemeOverridesPropertiesTab';
import { ThemeOverridesExampleTab } from './ThemeOverridesExampleTab';

const ThemeOverridesView: React.FC = () => {
  return (
    <Container maxW="1000px" p={0}>
      <VStack gap={4} align="stretch" mb={6}>
        <Heading size="lg">Theme Overrides Schema</Heading>
        <Text>
          Theme overrides provide a safe, schema-driven way to extend or customize tokens that are explicitly marked as themeable in the core data.
          This schema enables teams to create and maintain different themes independently, without modifying the core token set.
          Each theme override file must reference the core system ID and can only override tokens that are explicitly marked as themeable.
        </Text>
      </VStack>

      <Tabs.Root defaultValue="properties">
        <Tabs.List>
          <Tabs.Trigger value="properties">Properties</Tabs.Trigger>
          <Tabs.Trigger value="example">Example</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="properties">
          <ThemeOverridesPropertiesTab />
        </Tabs.Content>
        <Tabs.Content value="example">
          <ThemeOverridesExampleTab />
        </Tabs.Content>
      </Tabs.Root>
    </Container>
  );
};

export default ThemeOverridesView; 