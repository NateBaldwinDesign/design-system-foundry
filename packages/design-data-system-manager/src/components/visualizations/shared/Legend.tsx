/**
 * Visualization Legend Component
 * Reusable legend for showing visualization categories and types
 * Uses Chakra UI components for consistency
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  SimpleGrid,
  Heading,
  Button
} from '@chakra-ui/react';
import { Circle, Square, Minus } from 'lucide-react';
import type { VisualizationLegendProps, LegendItem } from './types';

export const VisualizationLegend: React.FC<VisualizationLegendProps> = ({
  items,
  title = 'Legend',
  position = 'right',
  orientation = 'vertical'
}) => {
  const renderShape = (item: LegendItem) => {
    const shapeProps = {
      size: 12,
      color: item.color,
      fill: item.color
    };

    switch (item.shape) {
      case 'square':
        return <Square {...shapeProps} />;
      case 'line':
        return <Minus {...shapeProps} />;
      case 'circle':
      default:
        return <Circle {...shapeProps} />;
    }
  };

  const renderLegendItem = (item: LegendItem) => (
    <HStack
      key={item.id}
      spacing={2}
      cursor={item.onClick ? 'pointer' : 'default'}
      opacity={item.visible === false ? 0.5 : 1}
      onClick={() => item.onClick?.(item.id)}
      _hover={item.onClick ? { bg: 'gray.50' } : undefined}
      px={2}
      py={1}
      borderRadius="sm"
    >
      {renderShape(item)}
      <Text fontSize="sm" color="gray.700">
        {item.label}
      </Text>
      {item.count !== undefined && (
        <Badge size="sm" colorScheme="gray">
          {item.count}
        </Badge>
      )}
    </HStack>
  );

  const legendContent = (
    <Box>
      {title && (
        <Heading size="sm" mb={3} color="gray.700">
          {title}
        </Heading>
      )}
      
      {orientation === 'vertical' ? (
        <VStack align="start" spacing={1}>
          {items.map(renderLegendItem)}
        </VStack>
      ) : (
        <SimpleGrid columns={Math.ceil(items.length / 2)} spacing={2}>
          {items.map(renderLegendItem)}
        </SimpleGrid>
      )}
    </Box>
  );

  return (
    <Box
      p={4}
      borderWidth={1}
      borderRadius="md"
      bg="white"
      shadow="sm"
      minW={orientation === 'vertical' ? '200px' : 'auto'}
      maxW={orientation === 'vertical' ? '250px' : 'auto'}
    >
      {legendContent}
    </Box>
  );
};
