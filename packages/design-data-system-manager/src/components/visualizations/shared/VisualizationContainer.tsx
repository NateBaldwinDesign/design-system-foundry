/**
 * Visualization Container Component
 * Common wrapper with error handling, loading states, and layout
 * Uses Chakra UI components for consistency
 */

import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Alert,
  AlertIcon,
  AlertDescription,
  Button,
  Spinner,
  Center
} from '@chakra-ui/react';
import { RefreshCw } from 'lucide-react';
import type { VisualizationContainerProps } from './types';

export const VisualizationContainer: React.FC<VisualizationContainerProps> = ({
  title,
  description,
  children,
  toolbar,
  legend,
  isLoading = false,
  error,
  onRetry,
  height = 600,
  width = '100%'
}) => {
  if (isLoading) {
    return (
      <Box
        width={width}
        height={height}
        borderWidth={1}
        borderRadius="md"
        bg="white"
        p={8}
      >
        <Center height="100%">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" />
            <Text color="gray.600">
              Loading visualization...
            </Text>
          </VStack>
        </Center>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        width={width}
        height={height}
        borderWidth={1}
        borderRadius="md"
        bg="white"
        p={6}
      >
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={2} flex={1}>
            <AlertDescription fontWeight="medium">
              Failed to load visualization
            </AlertDescription>
            <Text fontSize="sm" color="gray.600">
              {error}
            </Text>
            {onRetry && (
              <Button
                size="sm"
                leftIcon={<RefreshCw size={16} />}
                onClick={onRetry}
                colorScheme="red"
                variant="outline"
              >
                Retry
              </Button>
            )}
          </VStack>
        </Alert>
      </Box>
    );
  }

  return (
    <Box width={width}>
      {/* Header */}
      {(title || description) && (
        <VStack align="start" spacing={2} mb={4}>
          {title && (
            <Heading size="md" color="gray.800">
              {title}
            </Heading>
          )}
          {description && (
            <Text fontSize="sm" color="gray.600">
              {description}
            </Text>
          )}
        </VStack>
      )}

      {/* Toolbar */}
      {toolbar && (
        <Box mb={4}>
          {toolbar}
        </Box>
      )}

      {/* Main Content Area */}
      <HStack align="start" spacing={4}>
        {/* Visualization */}
        <Box
          flex={1}
          height={height}
          borderWidth={1}
          borderRadius="md"
          bg="white"
          overflow="hidden"
          position="relative"
        >
          {children}
        </Box>

        {/* Legend */}
        {legend && (
          <Box flexShrink={0}>
            {legend}
          </Box>
        )}
      </HStack>
    </Box>
  );
};
