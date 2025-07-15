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
    // Get available property types (excluding special options)
    const availablePropertyTypes = propAvailablePropertyTypes || [];
    const actualPropertyTypes = availablePropertyTypes.filter(pt => pt.id !== 'ALL' && pt.id !== 'ANY_PROPERTY');
    const actualPropertyTypeIds = actualPropertyTypes.map(pt => pt.id);
    
    // Check if "Any Property (undefined)" is being selected
    const hasAnyProperty = propertyTypeIds.includes('ANY_PROPERTY');
    const previousHasAnyProperty = value.length === 0; // Empty array means "any property"
    
    if (hasAnyProperty && !previousHasAnyProperty) {
      // "Any Property (undefined)" was just selected - clear all property types
      onChange([]);
    } else if (!hasAnyProperty && previousHasAnyProperty) {
      // "Any Property (undefined)" was just deselected - select all available property types
      onChange(actualPropertyTypes);
    } else {
      // Handle "Select All" or individual selections
      const hasSelectAll = propertyTypeIds.includes('ALL');
      const previousHasSelectAll = value.length === actualPropertyTypeIds.length && 
        actualPropertyTypeIds.every(id => value.some(pt => pt.id === id));
      
      if (hasSelectAll && !previousHasSelectAll) {
        // "Select All" was just selected - select all available property types
        onChange(actualPropertyTypes);
      } else if (!hasSelectAll && previousHasSelectAll) {
        // "Select All" was just deselected - clear all selections
        onChange([]);
      } else {
        // Regular selection/deselection of individual property types
        const selectedPropertyTypes = propertyTypeIds
          .filter(id => id !== 'ALL' && id !== 'ANY_PROPERTY')
          .map(id => actualPropertyTypes.find(pt => pt.id === id))
          .filter(Boolean) as PropertyType[];
        
        onChange(selectedPropertyTypes);
      }
    }
  };

  // Get available property types (either from props or empty array)
  const availablePropertyTypes = propAvailablePropertyTypes || [];
  
  // Get selected property type IDs for checkbox group
  const selectedPropertyTypeIds = value.map(pt => pt.id);
  
  // Get available property type IDs (excluding special options)
  const availablePropertyTypeIds = availablePropertyTypes.map(pt => pt.id).filter(id => id !== 'ALL' && id !== 'ANY_PROPERTY');
  
  // Get the intersection of selected and available IDs (what should be checked)
  const visibleSelectedIds = selectedPropertyTypeIds.filter(id => availablePropertyTypeIds.includes(id));
  
  // Check if all available property types are selected (for "Select All" checkbox)
  const allActualTypesSelected = availablePropertyTypeIds.length > 0 && 
    availablePropertyTypeIds.every(id => selectedPropertyTypeIds.includes(id));
  
  // Check if "Any Property (undefined)" should be selected (empty propertyTypes array)
  const anyPropertySelected = value.length === 0;
  
  // Only show "Select All" when there are more than 2 options (more than 1 filtered option + "Any Property")
  const shouldShowSelectAll = availablePropertyTypeIds.length > 1;
  
  // Prepare checkbox group value
  let checkboxGroupValue: string[] = [];
  
  if (anyPropertySelected) {
    // If "Any Property (undefined)" is selected, only show that checkbox as checked
    checkboxGroupValue = ['ANY_PROPERTY'];
  } else if (allActualTypesSelected && shouldShowSelectAll) {
    // If all types are selected and "Select All" should be shown, show "Select All" and all individual IDs
    checkboxGroupValue = ['ALL', ...availablePropertyTypeIds];
  } else {
    // Show only the individually selected IDs
    checkboxGroupValue = visibleSelectedIds;
  }

  // Debug logging to identify the issue
  console.log('[PropertyTypePicker] Debug state:', {
    selectedPropertyTypeIds,
    availablePropertyTypeIds,
    visibleSelectedIds,
    allActualTypesSelected,
    anyPropertySelected,
    checkboxGroupValue,
    value: value.map(pt => ({ id: pt.id, displayName: pt.displayName })),
    availablePropertyTypes: availablePropertyTypes.map(pt => ({ 
      id: pt.id, 
      displayName: pt.displayName,
      compatibleValueTypes: pt.compatibleValueTypes 
    }))
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
              value={propertyType.id === 'ALL' ? 'ALL' : propertyType.id === 'ANY_PROPERTY' ? 'ANY_PROPERTY' : propertyType.id}
              size="md"
            >
              {propertyType.displayName}
            </Checkbox>
          ))}
        </VStack>
      </CheckboxGroup>
      
      <FormHelperText>
        {anyPropertySelected 
          ? 'Any property type (no scoping)' 
          : value.length === 0 
            ? 'No property types selected' 
            : `${value.length} property type(s) selected`
        }
      </FormHelperText>
    </FormControl>
  );
} 