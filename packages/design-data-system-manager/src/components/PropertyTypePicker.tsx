import React from 'react';
import {
  VStack,
  HStack,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
  FormHelperText
} from '@chakra-ui/react';
import type { PropertyType } from '@token-model/data-model/src/schema';

interface PropertyTypePickerProps {
  value: PropertyType[];
  onChange: (value: PropertyType[]) => void;
  disabled?: boolean;
  availablePropertyTypes?: PropertyType[];
}

export function PropertyTypePicker({ 
  value, 
  onChange, 
  disabled = false, 
  availablePropertyTypes: propAvailablePropertyTypes 
}: PropertyTypePickerProps) {

  const handlePropertyTypeChange = (propertyTypeIds: string[]) => {
    // Convert string IDs back to PropertyType objects
    const selectedPropertyTypes = propertyTypeIds.map(id => {
      const allPropertyTypes = propAvailablePropertyTypes || [];
      return allPropertyTypes.find(pt => pt.id === id);
    }).filter(Boolean) as PropertyType[];
    
    onChange(selectedPropertyTypes);
  };

  // Get available property types (either from props or empty array)
  const availablePropertyTypes = propAvailablePropertyTypes || [];
  
  // Get selected property type IDs for checkbox group
  const selectedPropertyTypeIds = value.map(pt => pt.id);

  return (
    <FormControl>
      <HStack justify="space-between" align="center" mb={2}>
        <FormLabel fontSize="sm" mb={0}>Property Types</FormLabel>
      </HStack>
      
      <CheckboxGroup
        value={selectedPropertyTypeIds}
        onChange={handlePropertyTypeChange}
        isDisabled={disabled}
      >
        <VStack spacing={2} align="stretch">
          {availablePropertyTypes.map((propertyType) => (
            <Checkbox
              key={propertyType.id}
              value={propertyType.id}
              size="md"
            >
              {propertyType.displayName}
            </Checkbox>
          ))}
        </VStack>
      </CheckboxGroup>
      
      <FormHelperText>
        {value.length === 0 ? 'No property types selected' : `${value.length} property type(s) selected`}
      </FormHelperText>
    </FormControl>
  );
} 