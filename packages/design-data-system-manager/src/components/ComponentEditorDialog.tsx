import React from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Select,
  VStack,
  HStack,
  Text,
  IconButton,
  Box,
  useColorMode,
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import type { ComponentCategory, ComponentProperty } from '@token-model/data-model';
import { BaseEditorDialog, NameFormControl, DescriptionFormControl } from './shared/BaseEditorDialog';

export interface ComponentEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  form: {
    id: string;
    displayName: string;
    description: string;
    componentCategoryId: string;
    componentProperties: Array<{
      componentPropertyId: string;
      description: string;
      supportedOptionIds?: string[];
      default?: boolean | string;
    }>;
    editingIndex: number | null;
  };
  componentCategories: ComponentCategory[];
  componentProperties: ComponentProperty[];
  handleFormChange: (field: string, value: string | boolean | Array<{
    componentPropertyId: string;
    description: string;
    supportedOptionIds?: string[];
    default?: boolean | string;
  }>) => void;
  handlePropertyDialogOpen: (index: number | null) => void;
  handlePropertyDelete: (index: number) => void;
}

export const ComponentEditorDialog: React.FC<ComponentEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  form,
  componentCategories,
  componentProperties,
  handleFormChange,
  handlePropertyDialogOpen,
  handlePropertyDelete,
}) => {
  const { colorMode } = useColorMode();

  const getPropertyDisplayName = (propertyId: string) => {
    const property = componentProperties.find(p => p.id === propertyId);
    return property ? property.displayName : `Unknown Property (${propertyId})`;
  };



  return (
    <BaseEditorDialog
      open={open}
      onClose={onClose}
      onSave={onSave}
      title={form.editingIndex !== null ? 'Edit Component' : 'Add Component'}
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
        <FormLabel>Category</FormLabel>
        <Select
          value={form.componentCategoryId}
          onChange={e => handleFormChange('componentCategoryId', e.target.value)}
          placeholder="Select a category..."
        >
          {componentCategories.map(category => (
            <option key={category.id} value={category.id}>
              {category.displayName}
            </option>
          ))}
        </Select>
      </FormControl>

      <Box>
        <HStack justify="space-between" align="center" mb={2}>
          <Text fontWeight="bold">Component Properties</Text>
          <Button 
            leftIcon={<LuPlus />} 
            size="sm" 
            onClick={() => handlePropertyDialogOpen(null)} 
            colorScheme="blue"
          >
            Add Property
          </Button>
        </HStack>
        
        <VStack align="stretch" spacing={2}>
          {form.componentProperties.map((property, idx) => (
            <Box
              key={property.componentPropertyId}
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <HStack justify="space-between" align="start">
                <Box flex="1">
                  <Text fontWeight="medium">
                    {getPropertyDisplayName(property.componentPropertyId)}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {property.description}
                  </Text>
                  {property.supportedOptionIds && property.supportedOptionIds.length > 0 && (
                    <Text fontSize="sm" color="gray.600">
                      Supported Options: {property.supportedOptionIds.length}
                    </Text>
                  )}
                  {property.default !== undefined && (
                    <Text fontSize="sm" color="gray.600">
                      Default: {typeof property.default === 'boolean' ? (property.default ? 'True' : 'False') : property.default}
                    </Text>
                  )}
                </Box>
                <HStack>
                  <IconButton 
                    aria-label="Edit property" 
                    icon={<LuPencil />} 
                    size="xs" 
                    onClick={() => handlePropertyDialogOpen(idx)} 
                  />
                  <IconButton 
                    aria-label="Delete property" 
                    icon={<LuTrash2 />} 
                    size="xs" 
                    colorScheme="red" 
                    onClick={() => handlePropertyDelete(idx)} 
                  />
                </HStack>
              </HStack>
            </Box>
          ))}
          
          {form.componentProperties.length === 0 && (
            <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
              No properties added yet. Click &quot;Add Property&quot; to get started.
            </Text>
          )}
        </VStack>
      </Box>
    </BaseEditorDialog>
  );
}; 