import React from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  HStack,
  Text,
  Switch,
} from '@chakra-ui/react';
import { BaseEditorDialog } from './shared/BaseEditorDialog';
import type { ComponentProperty } from '@token-model/data-model';

export interface ComponentPropertyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  propertyForm: {
    componentPropertyId: string;
    description: string;
    supportedOptionIds?: string[];
    default?: boolean | string;
  };
  componentProperties: ComponentProperty[];
  handlePropertyFormChange: (field: string, value: string | boolean | string[]) => void;
  propertyEditIndex: number | null;
}

export const ComponentPropertyDialog: React.FC<ComponentPropertyDialogProps> = ({
  open,
  onClose,
  onSave,
  propertyForm,
  componentProperties,
  handlePropertyFormChange,
  propertyEditIndex,
}) => {


  const selectedProperty = componentProperties.find(p => p.id === propertyForm.componentPropertyId);

  // Auto-populate defaults when property is selected
  const handlePropertySelection = (propertyId: string) => {
    const property = componentProperties.find(p => p.id === propertyId);
    if (property) {
      let newSupportedOptionIds: string[] = [];
      let newDefault: boolean | string;

      if (property.type === 'list' && property.options && property.default) {
        // For list properties, pre-select the default option
        newSupportedOptionIds = [property.default as string];
        newDefault = property.default as string;
      } else if (property.type === 'boolean') {
        // For boolean properties, use the property's default
        newDefault = property.default as boolean;
      } else {
        // Fallback for any other case
        newDefault = property.type === 'boolean' ? false : '';
      }

      handlePropertyFormChange('componentPropertyId', propertyId);
      handlePropertyFormChange('supportedOptionIds', newSupportedOptionIds);
      handlePropertyFormChange('default', newDefault);
    } else {
      handlePropertyFormChange('componentPropertyId', propertyId);
    }
  };

  return (
    <BaseEditorDialog
      open={open}
      onClose={onClose}
      onSave={onSave}
      title={propertyEditIndex !== null ? 'Edit Component Property' : 'Add Component Property'}
    >
      <FormControl isRequired>
        <FormLabel>Property</FormLabel>
        <Select
          value={propertyForm.componentPropertyId}
          onChange={e => handlePropertySelection(e.target.value)}
          placeholder="Select a property..."
        >
          {componentProperties.map(prop => (
            <option key={prop.id} value={prop.id}>
              {prop.displayName}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>Description</FormLabel>
        <Input
          value={propertyForm.description}
          onChange={e => handlePropertyFormChange('description', e.target.value)}
          placeholder="Describe how this property applies to this component (optional)..."
        />
      </FormControl>

      {selectedProperty && selectedProperty.type === 'list' && selectedProperty.options && (
        <FormControl>
          <FormLabel>Supported Options</FormLabel>
          <VStack align="stretch" spacing={2}>
            {selectedProperty.options.map(option => (
              <HStack key={option.id} justify="space-between">
                <Text fontSize="md">{option.displayName}</Text>
                <Switch
                  isChecked={propertyForm.supportedOptionIds?.includes(option.id) || false}
                  onChange={e => {
                    const currentIds = propertyForm.supportedOptionIds || [];
                    const newIds = e.target.checked
                      ? [...currentIds, option.id]
                      : currentIds.filter(id => id !== option.id);
                    handlePropertyFormChange('supportedOptionIds', newIds);
                  }}
                  size="md"
                />
              </HStack>
            ))}
          </VStack>
        </FormControl>
      )}

      {selectedProperty && (
        <FormControl>
          <FormLabel>Default Value</FormLabel>
          {selectedProperty.type === 'boolean' ? (
            <HStack>
              <Text fontSize="md">False</Text>
              <Switch
                isChecked={propertyForm.default as boolean || false}
                onChange={e => handlePropertyFormChange('default', e.target.checked)}
                colorScheme="blue"
                size="md"
              />
              <Text fontSize="md">True</Text>
            </HStack>
          ) : selectedProperty.type === 'list' && selectedProperty.options ? (
            <Select
              value={propertyForm.default as string || ''}
              onChange={e => handlePropertyFormChange('default', e.target.value)}
              placeholder="Select default option..."
            >
              {selectedProperty.options.map(option => (
                <option key={option.id} value={option.id}>
                  {option.displayName}
                </option>
              ))}
            </Select>
          ) : null}
        </FormControl>
      )}
    </BaseEditorDialog>
  );
}; 