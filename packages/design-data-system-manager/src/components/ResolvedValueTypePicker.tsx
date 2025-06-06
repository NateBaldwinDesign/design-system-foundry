import React from 'react';
import { Field, Select, Box, Stack, Tag, TagLabel, CloseButton, Text } from '@chakra-ui/react';
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
    <Field.Root isRequired={isRequired} isInvalid={!!error} isDisabled={disabled}>
      <Field.Label>{label}</Field.Label>
      <Select.Root>
        <Select.Trigger>
          <Select.Value placeholder="Add a value type..." />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="">Add a value type...</Select.Item>
          {valueTypes
            .filter(type => !value.includes(type.id))
            .map(type => (
              <Select.Item key={type.id} value={type.id}>{type.displayName}</Select.Item>
            ))}
        </Select.Content>
      </Select.Root>
      <Box mt={2}>
        <Stack direction="row" gap={2} flexWrap="wrap">
          {value.map((typeId: string) => {
            const type = valueTypes.find(t => t.id === typeId);
            return type ? (
              <Tag key={typeId} size="md" borderRadius="full" variant="solid" colorPalette="blue">
                <TagLabel>{type.displayName}</TagLabel>
                <CloseButton onClick={() => handleRemoveValueType(typeId)} />
              </Tag>
            ) : null;
          })}
        </Stack>
      </Box>
      {error && (
        <Field.ErrorText>{error}</Field.ErrorText>
      )}
    </Field.Root>
  );
} 