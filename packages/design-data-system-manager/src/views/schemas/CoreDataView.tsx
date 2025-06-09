import React from 'react';
import { Tabs, Heading, Text, VStack, Container } from '@chakra-ui/react';
import { CoreDataPropertiesTab } from './CoreDataPropertiesTab';
import { CoreDataExampleTab } from './CoreDataExampleTab';

const CoreDataView: React.FC = () => {
  return (
    <Container maxW="1000px" p={0}>
      <VStack gap={4} align="stretch" mb={6}>
        <Heading size="lg">Core Data Schema</Heading>
        <Text>
          The core data schema defines the canonical structure for the Token Model system, including tokens, collections, dimensions, and platforms. 
          It serves as the source of truth for validation and interoperability, defining which tokens are themeable and how they can be customized.
          The schema requires system identification, versioning, and comprehensive token definitions with support for both global and mode-specific values.
        </Text>
      </VStack>

      <Tabs.Root defaultValue="properties">
        <Tabs.List>
          <Tabs.Trigger value="properties">Properties</Tabs.Trigger>
          <Tabs.Trigger value="example">Example</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="properties">
          <CoreDataPropertiesTab />
        </Tabs.Content>
        <Tabs.Content value="example">
          <CoreDataExampleTab />
        </Tabs.Content>
      </Tabs.Root>
    </Container>
  );
};

export default CoreDataView; 