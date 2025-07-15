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
    // Handle special "All Properties" option
    const hasAllProperties = propertyTypeIds.includes('ALL');
    
    if (hasAllProperties) {
      // If "All Properties" is selected, select all available property types
      const allPropertyTypes = propAvailablePropertyTypes || [];
      const actualPropertyTypes = allPropertyTypes.filter(pt => pt.id !== 'ALL');
      onChange(actualPropertyTypes);
    } else {
      // Convert string IDs back to PropertyType objects (excluding "ALL")
      const selectedPropertyTypes = propertyTypeIds
        .filter(id => id !== 'ALL')
        .map(id => {
          const allPropertyTypes = propAvailablePropertyTypes || [];
          return allPropertyTypes.find(pt => pt.id === id);
        })
        .filter(Boolean) as PropertyType[];
      
      onChange(selectedPropertyTypes);
    }
  };

  // Get available property types (either from props or empty array)
  const availablePropertyTypes = propAvailablePropertyTypes || [];
  
  // Get selected property type IDs for checkbox group
  const selectedPropertyTypeIds = value.map(pt => pt.id);
  
  // Get available property type IDs (excluding "ALL")
  const availablePropertyTypeIds = availablePropertyTypes.map(pt => pt.id).filter(id => id !== 'ALL');
  
  // Get the intersection of selected and available IDs (what should be checked)
  const visibleSelectedIds = selectedPropertyTypeIds.filter(id => availablePropertyTypeIds.includes(id));
  
  // Check if all available property types are selected AND there are multiple available types
  // (Don't show "ALL" when there's only one option - that's confusing)
  const allActualTypesSelected = availablePropertyTypeIds.length > 1 && 
    availablePropertyTypeIds.every(id => selectedPropertyTypeIds.includes(id));
  
  // Prepare checkbox group value - include "ALL" if all types are selected (and multiple exist), otherwise show visible selected IDs
  const checkboxGroupValue = allActualTypesSelected ? ['ALL'] : visibleSelectedIds;

  // Debug logging to identify the issue
  console.log('[PropertyTypePicker] Debug state:', {
    selectedPropertyTypeIds,
    availablePropertyTypeIds,
    visibleSelectedIds,
    allActualTypesSelected,
    checkboxGroupValue,
    value: value.map(pt => ({ id: pt.id, displayName: pt.displayName })),
    availablePropertyTypes: availablePropertyTypes.map(pt => ({ id: pt.id, displayName: pt.displayName }))
  });

  console.log('[PropertyTypePicker] CheckboxGroup value:', checkboxGroupValue);

  return (
    <FormControl>
      <HStack justify="space-between" align="center" mb={2}>
        <FormLabel fontSize="sm" mb={0}>Property Types</FormLabel>
      </HStack>
      
      <CheckboxGroup
        value={checkboxGroupValue}
        onChange={handlePropertyTypeChange}
        isDisabled={disabled}
      >
        <VStack spacing={2} align="stretch">
          {availablePropertyTypes.map((propertyType) => (
            <Checkbox
              key={propertyType.id}
              value={propertyType.id === 'ALL' ? 'ALL' : propertyType.id}
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