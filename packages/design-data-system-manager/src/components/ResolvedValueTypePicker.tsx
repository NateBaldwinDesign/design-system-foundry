import React from 'react';
import { Field, Select, Box, Stack, Tag, TagLabel, CloseButton } from '@chakra-ui/react';
import type { ResolvedValueType } from '@token-model/data-model';
import { StorageService } from '../services/storage';

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
  label,
  required,
  disabled,
  error,
  isRequired
}: ResolvedValueTypePickerProps) {
  const resolvedValueTypes = StorageService.getValueTypes() || [];

  const handleRemove = (typeId: string) => {
    onChange(value.filter(id => id !== typeId));
  };

  return (
    <Field.Root>
      {label && (
        <>
          <Field.Label>{label}</Field.Label>
          {(required || isRequired) && <Field.RequiredIndicator />}
        </>
      )}
      <Box>
        <Select.Root
          value={[]}
          collection={resolvedValueTypes.filter((type: ResolvedValueType) => !value.includes(type.id))}
          onValueChange={(details) => {
            const selectedValue = Array.isArray(details.value) ? details.value[0] : details.value;
            if (selectedValue && !value.includes(selectedValue)) {
              onChange([...value, selectedValue]);
            }
          }}
        >
          <Select.HiddenSelect />
          <Select.Control>
            <Select.Trigger disabled={disabled}>
              <Select.ValueText placeholder="Select value type" />
            </Select.Trigger>
            <Select.IndicatorGroup>
              <Select.Indicator />
            </Select.IndicatorGroup>
          </Select.Control>
          <Select.Positioner>
            <Select.Content>
              {resolvedValueTypes
                .filter((type: ResolvedValueType) => !value.includes(type.id))
                .map((type: ResolvedValueType) => (
                  <Select.Item key={type.id}>
                    {type.displayName}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
            </Select.Content>
          </Select.Positioner>
        </Select.Root>
        {error && <Field.ErrorText>{error}</Field.ErrorText>}
        <Stack direction="row" wrap="wrap" gap={2} mt={2}>
          {value.map(typeId => {
            const type = resolvedValueTypes.find((t: ResolvedValueType) => t.id === typeId);
            if (!type) return null;
            return (
              <Tag.Root key={typeId} size="sm">
                <TagLabel>{type.displayName}</TagLabel>
                <CloseButton
                  size="sm"
                  onClick={() => handleRemove(typeId)}
                  disabled={disabled}
                />
              </Tag.Root>
            );
          })}
        </Stack>
      </Box>
    </Field.Root>
  );
} 