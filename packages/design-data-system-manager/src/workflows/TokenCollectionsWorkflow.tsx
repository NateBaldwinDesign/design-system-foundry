import React from 'react';
import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Switch,
  VStack,
  Text,
} from '@chakra-ui/react';
import type { TokenCollection, FallbackStrategy } from '@token-model/data-model';

interface TokenCollectionsWorkflowProps {
  tokenCollections: TokenCollection[];
  setTokenCollections: (collections: TokenCollection[]) => void;
}

const defaultModeResolutionStrategy = {
  priorityByType: [] as string[],
  fallbackStrategy: 'MOST_SPECIFIC_MATCH' as FallbackStrategy,
};

export default function TokenCollectionsWorkflow({
  tokenCollections,
  setTokenCollections,
}: TokenCollectionsWorkflowProps) {
  const [newCollection, setNewCollection] = useState<Partial<TokenCollection>>({
    name: '',
    resolvedValueTypeIds: [],
    private: false,
    defaultModeIds: [],
    modeResolutionStrategy: defaultModeResolutionStrategy,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleAddCollection = () => {
    setFieldErrors({});
    try {
      const collection: TokenCollection = {
        id: crypto.randomUUID(),
        name: newCollection.name || '',
        resolvedValueTypeIds: (newCollection.resolvedValueTypeIds || []).filter(Boolean),
        private: newCollection.private || false,
        defaultModeIds: (newCollection.defaultModeIds || []).filter(Boolean),
        modeResolutionStrategy: {
          priorityByType: (newCollection.modeResolutionStrategy?.priorityByType || []).filter(Boolean),
          fallbackStrategy: newCollection.modeResolutionStrategy?.fallbackStrategy || 'MOST_SPECIFIC_MATCH',
        },
      };
      setTokenCollections([...tokenCollections, collection]);
      setNewCollection({
        name: '',
        resolvedValueTypeIds: [],
        private: false,
        defaultModeIds: [],
        modeResolutionStrategy: defaultModeResolutionStrategy,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        setFieldErrors({ general: error.message });
      } else {
        setFieldErrors({ general: 'An unexpected error occurred.' });
      }
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <Box p={4} borderWidth="1px" borderColor="gray.200" borderRadius="lg">
        <Text fontSize="2xl" fontWeight="bold" mb={4}>
          Add New Token Collection
        </Text>
        <Box as="form" display="flex" flexDirection="column" gap={4}>
          <FormControl isInvalid={Boolean(fieldErrors.name)}>
            <FormLabel>Name</FormLabel>
            <Input
              type="text"
              value={newCollection.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCollection({ ...newCollection, name: e.target.value })}
            />
            {fieldErrors.name && (
              <Text color="red.500">{fieldErrors.name}</Text>
            )}
          </FormControl>
          <FormControl isInvalid={Boolean(fieldErrors.resolvedValueTypeIds)}>
            <FormLabel>Resolved Value Type IDs (comma separated)</FormLabel>
            <Input
              type="text"
              value={(newCollection.resolvedValueTypeIds || []).join(',')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCollection({ ...newCollection, resolvedValueTypeIds: e.target.value.split(',').map((v: string) => v.trim()) })}
            />
            {fieldErrors.resolvedValueTypeIds && (
              <Text color="red.500">{fieldErrors.resolvedValueTypeIds}</Text>
            )}
          </FormControl>
          <FormControl>
            <FormLabel>Private</FormLabel>
            <Switch
              isChecked={!!newCollection.private}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCollection({ ...newCollection, private: e.target.checked })}
            />
          </FormControl>
          <FormControl isInvalid={Boolean(fieldErrors.defaultModeIds)}>
            <FormLabel>Default Mode IDs (comma separated)</FormLabel>
            <Input
              type="text"
              value={(newCollection.defaultModeIds || []).join(',')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCollection({ ...newCollection, defaultModeIds: e.target.value.split(',').map((v: string) => v.trim()) })}
            />
            {fieldErrors.defaultModeIds && (
              <Text color="red.500">{fieldErrors.defaultModeIds}</Text>
            )}
          </FormControl>
          <FormControl isInvalid={Boolean(fieldErrors['modeResolutionStrategy'])}>
            <FormLabel>Mode Resolution Priority By Type (comma separated)</FormLabel>
            <Input
              type="text"
              value={(newCollection.modeResolutionStrategy?.priorityByType || []).join(',')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCollection({
                ...newCollection,
                modeResolutionStrategy: {
                  priorityByType: e.target.value.split(',').map((v: string) => v.trim()),
                  fallbackStrategy: newCollection.modeResolutionStrategy?.fallbackStrategy || 'MOST_SPECIFIC_MATCH',
                },
              })}
            />
            {fieldErrors['modeResolutionStrategy'] && (
              <Text color="red.500">{fieldErrors['modeResolutionStrategy']}</Text>
            )}
          </FormControl>
          <FormControl isInvalid={Boolean(fieldErrors['modeResolutionStrategy'])}>
            <FormLabel>Mode Resolution Fallback Strategy</FormLabel>
            <Input
              type="text"
              value={newCollection.modeResolutionStrategy?.fallbackStrategy || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCollection({
                ...newCollection,
                modeResolutionStrategy: {
                  priorityByType: newCollection.modeResolutionStrategy?.priorityByType || [],
                  fallbackStrategy: e.target.value as FallbackStrategy,
                },
              })}
            />
            {fieldErrors['modeResolutionStrategy'] && (
              <Text color="red.500">{fieldErrors['modeResolutionStrategy']}</Text>
            )}
          </FormControl>
          {fieldErrors.general && (
            <Text color="red.500">{fieldErrors.general}</Text>
          )}
          <Button colorScheme="blue" onClick={handleAddCollection}>
            Add Collection
          </Button>
        </Box>
      </Box>

      <Box p={4} borderWidth="1px" borderColor="gray.200" borderRadius="lg">
        <Text fontSize="2xl" fontWeight="bold" mb={4}>
          Token Collections List
        </Text>
        {tokenCollections.map((collection) => (
          <Text key={collection.id} mb={2}>
            {collection.name}
            <Text as="span" fontWeight="light" ml={2}>
              Resolved Value Type IDs: {collection.resolvedValueTypeIds.join(', ')}
            </Text>
            <Text as="span" fontWeight="light" ml={2}>
              Private: {collection.private ? 'Yes' : 'No'}
            </Text>
            <Text as="span" fontWeight="light" ml={2}>
              Default Mode IDs: {collection.defaultModeIds?.join(', ') || 'None'}
            </Text>
            <Text as="span" fontWeight="light" ml={2}>
              Mode Resolution Strategy: Priority By Type: {collection.modeResolutionStrategy?.priorityByType.join(', ') || 'None'}, Fallback: {collection.modeResolutionStrategy?.fallbackStrategy || 'None'}
            </Text>
          </Text>
        ))}
      </Box>
    </VStack>
  );
} 