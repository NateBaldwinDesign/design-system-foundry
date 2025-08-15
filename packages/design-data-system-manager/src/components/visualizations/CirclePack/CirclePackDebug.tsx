/**
 * Debug component for Circle Pack data structure
 */

import React from 'react';
import { Box, Text, VStack, HStack, Badge } from '@chakra-ui/react';
import type { CirclePackData, CirclePackNode } from '../../../services/visualizations/types/circle-pack-data';

interface CirclePackDebugProps {
  data: CirclePackData;
}

export const CirclePackDebug: React.FC<CirclePackDebugProps> = ({ data }) => {
  const renderNode = (node: CirclePackNode, depth: number = 0) => {
    const indent = '  '.repeat(depth);
    
    return (
      <Box key={node.name} ml={depth * 4}>
        <HStack spacing={2}>
          <Text fontSize="sm" fontWeight="bold">
            {indent}{node.name}
          </Text>
          <Badge colorScheme={
            node.type === 'system' ? 'gray' :
            node.type === 'core' ? 'blue' :
            node.type === 'platform' ? 'green' :
            node.type === 'theme' ? 'purple' : 'gray'
          }>
            {node.type}
          </Badge>
          {node.value && (
            <Badge colorScheme="orange">
              value: {node.value}
            </Badge>
          )}
          {node.hasChildren && (
            <Badge colorScheme="teal">
              has children
            </Badge>
          )}
        </HStack>
        {node.children && node.children.length > 0 && (
          <VStack align="start" spacing={1} mt={1}>
            {node.children.map(child => renderNode(child, depth + 1))}
          </VStack>
        )}
      </Box>
    );
  };

  return (
    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Circle Pack Data Structure Debug
      </Text>
      <VStack align="start" spacing={2}>
        {renderNode(data)}
      </VStack>
    </Box>
  );
};
