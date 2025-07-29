import React from 'react';
import { Container, VStack, Heading, useColorMode } from '@chakra-ui/react';

const ComponentsView: React.FC = () => {
  const { colorMode } = useColorMode();
  
  return (
    <VStack 
      p={4} 
      bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}
      flex="1"
      align="stretch"
      spacing={0}
    >
      <Container maxW="1000px" p={0}>
        <VStack spacing={4} align="stretch" mb={6}>
          <Heading size="lg">Components</Heading>
        </VStack>
      </Container>
    </VStack>
  );
};

export default ComponentsView; 