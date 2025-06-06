import React from 'react';
import { Field, Select, Box, Stack, Tag, TagLabel, CloseButton } from '@chakra-ui/react';
import type { ResolvedValueType } from '@token-model/data-model';
import { StorageService } from '../services/storage';
import { createListCollection } from '@chakra-ui/react';

interface ResolvedValueTypePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  // For backward compatibility
  isRequired?: boolean;
}

export function ResolvedValueTypePicker({
  value,
  onChange,
  label = 'Value Types',
  required = false,
  isRequired,
  disabled = false,
  error
}: ResolvedValueTypePickerProps) {
  const valueTypes: ResolvedValueType[] = StorageService.getValueTypes() || [];
  const isFieldRequired = required || isRequired;

  const handleAddValueType = (valueTypeId: string) => {
    if (valueTypeId) {
      onChange([...value, valueTypeId]);
    }
  };

  const handleRemoveValueType = (valueTypeId: string) => {
    onChange(value.filter(id => id !== valueTypeId));
  };

  const availableValueTypes = valueTypes.filter(type => !value.includes(type.id));
  const valueTypeCollection = createListCollection({
    items: availableValueTypes.map(type => ({
      value: type.id,
      label: type.displayName
    }))
  });

  return (
    <Field.Root required={isFieldRequired} invalid={!!error} disabled={disabled}>
      <Field.Label>{label}</Field.Label>
      <Select.Root
        value={[]}
        onValueChange={(details) => {
          const selectedValue = Array.isArray(details.value) ? details.value[0] : details.value;
          if (selectedValue) {
            handleAddValueType(selectedValue);
          }
        }}
        collection={valueTypeCollection}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Add a value type..." />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {availableValueTypes.map(type => (
              <Select.Item key={type.id} item={{ value: type.id, label: type.displayName }}>
                {type.displayName}
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
      <Box mt={2}>
        <Stack direction="row" gap={2} flexWrap="wrap">
          {value.map((typeId: string) => {
            const type = valueTypes.find(t => t.id === typeId);
            return type ? (
              <Tag.Root key={typeId} size="md" borderRadius="full" variant="solid" colorPalette="blue">
                <TagLabel>{type.displayName}</TagLabel>
                <CloseButton onClick={() => handleRemoveValueType(typeId)} />
              </Tag.Root>
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