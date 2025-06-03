import React from 'react';
import { FormControl, FormLabel, Select, Box, HStack, Tag, TagLabel, TagCloseButton, Text } from '@chakra-ui/react';
import type { ResolvedValueType } from '@token-model/data-model';
import { StorageService } from '../services/storage';

interface ResolvedValueTypePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  isRequired?: boolean;
  disabled?: boolean;
  error?: string;
}

export function ResolvedValueTypePicker({
  value,
  onChange,
  label = 'Value Types',
  isRequired = false,
  disabled = false,
  error
}: ResolvedValueTypePickerProps) {
  const valueTypes: ResolvedValueType[] = StorageService.getValueTypes() || [];

  const handleAddValueType = (valueTypeId: string) => {
    if (valueTypeId) {
      onChange([...value, valueTypeId]);
    }
  };

  const handleRemoveValueType = (valueTypeId: string) => {
    onChange(value.filter(id => id !== valueTypeId));
  };

  return (
    <FormControl isRequired={isRequired} isInvalid={!!error} isDisabled={disabled}>
      <FormLabel>{label}</FormLabel>
      <Select
        value=""
        onChange={e => handleAddValueType(e.target.value)}
      >
        <option value="">Add a value type...</option>
        {valueTypes
          .filter(type => !value.includes(type.id))
          .map(type => (
            <option key={type.id} value={type.id}>{type.displayName}</option>
          ))}
      </Select>
      <Box mt={2}>
        <HStack spacing={2} wrap="wrap">
          {value.map((typeId: string) => {
            const type = valueTypes.find(t => t.id === typeId);
            return type ? (
              <Tag key={typeId} size="md" borderRadius="full" variant="solid" colorScheme="blue">
                <TagLabel>{type.displayName}</TagLabel>
                <TagCloseButton onClick={() => handleRemoveValueType(typeId)} />
              </Tag>
            ) : null;
          })}
        </HStack>
      </Box>
      {error && (
        <Text color="red.500" fontSize="sm">{error}</Text>
      )}
    </FormControl>
  );
} 