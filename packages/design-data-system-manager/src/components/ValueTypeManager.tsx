import React, { useState } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  IconButton,
  useToast
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';

interface ValueTypeManagerProps {
  onSave: (valueTypes: string[]) => void;
}

export function ValueTypeManager({ onSave }: ValueTypeManagerProps) {
  const [valueTypes, setValueTypes] = useState<string[]>(['COLOR', 'FLOAT', 'INTEGER', 'STRING', 'BOOLEAN', 'ALIAS']);
  const [newValueType, setNewValueType] = useState('');
  const toast = useToast();

  const handleAddValueType = () => {
    if (newValueType && !valueTypes.includes(newValueType)) {
      const updatedTypes = [...valueTypes, newValueType];
      setValueTypes(updatedTypes);
      onSave(updatedTypes);
      setNewValueType('');
      toast({ title: 'Value type added', status: 'success', duration: 1500 });
    }
  };

  const handleDeleteValueType = (type: string) => {
    const updatedTypes = valueTypes.filter(t => t !== type);
    setValueTypes(updatedTypes);
    onSave(updatedTypes);
    toast({ title: 'Value type deleted', status: 'info', duration: 1500 });
  };

  return (
    <Box>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
        <Text fontSize="xl" fontWeight="bold" mb={4}>
          Value Types
        </Text>
        <HStack spacing={2} mb={4}>
          <Input
            placeholder="New Value Type"
            value={newValueType}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewValueType(e.target.value)}
            size="sm"
            maxW="200px"
          />
          <Button
            colorScheme="blue"
            onClick={handleAddValueType}
            disabled={!newValueType || valueTypes.includes(newValueType)}
            size="sm"
          >
            Add
          </Button>
        </HStack>
        <VStack align="stretch" spacing={2}>
          {valueTypes.map((type) => (
            <HStack key={type} justify="space-between" p={2} borderWidth={1} borderRadius="md" bg="gray.50">
              <Text>{type}</Text>
              <IconButton
                aria-label={`Delete ${type}`}
                icon={<DeleteIcon />}
                size="sm"
                colorScheme="red"
                onClick={() => handleDeleteValueType(type)}
              />
            </HStack>
          ))}
        </VStack>
      </Box>
    </Box>
  );
} 