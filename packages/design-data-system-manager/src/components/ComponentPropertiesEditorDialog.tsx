import React from 'react';
import {
  FormControl,
  FormLabel,
  Select,
  Switch,
  VStack,
  Box,
  Text,
  Button,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import { BaseEditorDialog, NameFormControl, DescriptionFormControl } from './shared/BaseEditorDialog';
import type { ComponentPropertyOption } from '@token-model/data-model';

export interface ComponentPropertiesEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: {
    id: string;
    displayName: string;
    description: string;
    type: 'boolean' | 'list';
    default: boolean | string;
    options?: ComponentPropertyOption[];
    editingIndex: number | null;
  };
  handleFormChange: (field: string, value: string | boolean | ComponentPropertyOption[]) => void;
  handleOptionDialogOpen: (index: number | null) => void;
  handleOptionDelete: (index: number) => void;
}

export const ComponentPropertiesEditorDialog: React.FC<ComponentPropertiesEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  form,
  handleFormChange,
  handleOptionDialogOpen,
  handleOptionDelete,
}) => {
  const title = form.editingIndex !== null ? 'Edit Component Property' : 'Add Component Property';

  return (
    <BaseEditorDialog
      open={open}
      onClose={onClose}
      onSave={onSave}
      title={title}
    >
      <NameFormControl
        value={form.displayName}
        onChange={(value) => handleFormChange('displayName', value)}
      />
      
      <DescriptionFormControl
        value={form.description}
        onChange={(value) => handleFormChange('description', value)}
      />

      <FormControl isRequired>
        <FormLabel>Type</FormLabel>
        <Select
          value={form.type}
          onChange={e => {
            const newType = e.target.value as 'boolean' | 'list';
            handleFormChange('type', newType);
            
            // Reset default value based on type
            if (newType === 'boolean') {
              handleFormChange('default', false);
            } else if (newType === 'list') {
              // For list type, set default to empty string if no options available
              // This will be updated when options are added
              handleFormChange('default', form.options && form.options.length > 0 ? form.options[0].id : '');
            }
          }}
        >
          <option value="boolean">Boolean</option>
          <option value="list">List</option>
        </Select>
      </FormControl>

      {form.type === 'boolean' && (
        <FormControl isRequired>
          <FormLabel>Default Value</FormLabel>
          <HStack>
            <Text>False</Text>
            <Switch
              isChecked={form.default as boolean}
              onChange={e => handleFormChange('default', e.target.checked)}
              colorScheme="blue"
            />
            <Text>True</Text>
          </HStack>
        </FormControl>
      )}

      {form.type === 'list' && (
        <>
          <FormControl isRequired>
            <FormLabel>Default Value</FormLabel>
            <Select
              value={form.default as string}
              onChange={e => handleFormChange('default', e.target.value)}
              placeholder="Select default option..."
            >
              {form.options?.map(option => (
                <option key={option.id} value={option.id}>
                  {option.displayName}
                </option>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Text fontWeight="bold" mb={2}>Options</Text>
            <Button 
              leftIcon={<LuPlus />} 
              size="sm" 
              onClick={() => handleOptionDialogOpen(null)} 
              mb={2}
            >
              Add Option
            </Button>
            <VStack align="stretch" spacing={1}>
              {form.options?.map((option, idx) => (
                <HStack key={option.id}>
                  <Text>{option.displayName}</Text>
                  <IconButton 
                    aria-label="Edit option" 
                    icon={<LuPencil />} 
                    size="xs" 
                    onClick={() => handleOptionDialogOpen(idx)} 
                  />
                  <IconButton 
                    aria-label="Delete option" 
                    icon={<LuTrash2 />} 
                    size="xs" 
                    colorScheme="red" 
                    onClick={() => handleOptionDelete(idx)} 
                  />
                </HStack>
              ))}
            </VStack>
          </Box>
        </>
      )}
    </BaseEditorDialog>
  );
}; 