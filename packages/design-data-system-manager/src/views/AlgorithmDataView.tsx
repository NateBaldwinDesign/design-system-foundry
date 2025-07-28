import React from 'react';
import { Tabs, TabList, TabPanels, Tab, TabPanel, Heading, Text, VStack, Container } from '@chakra-ui/react';
import { AlgorithmDataPropertiesTab } from './AlgorithmDataPropertiesTab';
import { AlgorithmDataExampleTab } from './AlgorithmDataExampleTab';

const AlgorithmDataView: React.FC = () => {
  return (
    <Container maxW="1000px" p={0}>
      <VStack spacing={4} align="stretch" mb={6}>
        <Heading size="lg">Algorithm Data Schema</Heading>
        <Text>
          The algorithm data schema defines the structure for algorithmic design token generation with support for multiple expression formats, system variables, and execution workflows.
          It serves as the foundation for programmatic token generation, enabling teams to create dynamic design systems that can adapt to different contexts and requirements.
          The schema supports mathematical formulas, conditional logic, platform-specific execution, and seamless integration with the core token system.
        </Text>
      </VStack>

      <Tabs>
        <TabList>
          <Tab>Properties</Tab>
          <Tab>Example</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <AlgorithmDataPropertiesTab />
          </TabPanel>
          <TabPanel>
            <AlgorithmDataExampleTab />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export default AlgorithmDataView; 