import React from 'react';
import { Box, Stack, CloseButton } from '@chakra-ui/react';
import type { ResolvedValueType } from '@token-model/data-model';

interface ResolvedValueTypePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  resolvedValueTypes: ResolvedValueType[];
  label?: string;
  disabled?: boolean;
  error?: string;
  isRequired?: boolean;
}

export const ResolvedValueTypePicker: React.FC<ResolvedValueTypePickerProps> = ({
  value,
  onChange,
  resolvedValueTypes,
  label,
  disabled,
  error,
  isRequired
}) => {
  const handleRemove = (typeId: string) => {
    onChange(value.filter(id => id !== typeId));
  };

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    if (selectedValue && !value.includes(selectedValue)) {
      onChange([...value, selectedValue]);
    }
  };

  return (
    <Box>
      {label && (
        <Box as="label" display="block" mb={2}>
          {label}
          {isRequired && <Box as="span" color="red.500" ml={1}>*</Box>}
        </Box>
      )}
      <Box>
        <select
          value=""
          onChange={handleChange}
          disabled={disabled}
          style={{
            width: '100%',
            height: '40px',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--chakra-colors-gray-200)',
            backgroundColor: 'white',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.4 : 1
          }}
        >
          <option value="">Select value type</option>
          {resolvedValueTypes
            .filter((type: ResolvedValueType) => !value.includes(type.id))
            .map((type: ResolvedValueType) => (
              <option key={type.id} value={type.id}>
                {type.displayName}
              </option>
            ))}
        </select>
        {error && (
          <Box color="red.500" fontSize="sm" mt={1}>
            {error}
          </Box>
        )}
        <Stack direction="row" wrap="wrap" gap={2} mt={2}>
          {value.map((typeId) => {
            const type = resolvedValueTypes.find((t) => t.id === typeId);
            return (
              <Box
                key={typeId}
                display="inline-flex"
                alignItems="center"
                bg="blue.500"
                color="white"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="sm"
              >
                <Box mr={2}>{type?.displayName}</Box>
                <CloseButton
                  size="sm"
                  onClick={() => handleRemove(typeId)}
                  disabled={disabled}
                  color="white"
                />
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}; 