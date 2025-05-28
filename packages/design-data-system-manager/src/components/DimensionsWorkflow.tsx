import React from 'react';
import {
  Box,
  Text,
  useColorMode
} from '@chakra-ui/react';
import type { Dimension } from '@token-model/data-model';
import { DimensionsEditor } from './DimensionsEditor';

interface DimensionsWorkflowProps {
  dimensions: Dimension[];
  setDimensions: (dims: Dimension[]) => void;
}

export function DimensionsWorkflow({ dimensions, setDimensions }: DimensionsWorkflowProps) {
  const { colorMode } = useColorMode();

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Dimensions</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <DimensionsEditor dimensions={dimensions} onChange={setDimensions} />
      </Box>
    </Box>
  );
} 