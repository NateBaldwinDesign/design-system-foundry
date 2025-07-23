import React from 'react';
import { Box, Text, VStack, useColorMode } from '@chakra-ui/react';
import { FigmaSettings } from '../../components/FigmaSettings';
import { createSchemaJsonFromLocalStorage } from '../../services/createJson';
import type { TokenSystem } from '@token-model/data-model';

interface ExportSettingsViewProps {
  // This view doesn't need props since it loads data from localStorage
  // but we keep the interface for consistency with other views
}

export const ExportSettingsView: React.FC<ExportSettingsViewProps> = () => {
  const { colorMode } = useColorMode();

  // Load the canonical token system from localStorage
  const tokenSystem = createSchemaJsonFromLocalStorage() as unknown as TokenSystem;

  return (
    <VStack 
      p={4} 
      bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}
      flex="1"
      align="stretch"
      spacing={0}
    >
      <Box maxW="1000px" p={0} w="100%">
        <Box mb={6}>
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            Figma Settings
          </Text>
          <Text fontSize="sm" color="gray.500">
            Configure Figma publishing settings and syntax patterns
          </Text>
        </Box>
        
        <FigmaSettings tokenSystem={tokenSystem} />
      </Box>
    </VStack>
  );
}; 