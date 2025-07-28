import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  IconButton,
  useToast,
  useColorMode,
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import type { ComponentProperty, Token, TokenCollection, Dimension, Platform, ResolvedValueType } from '@token-model/data-model';
import { createUniqueId } from '../../utils/id';
import { ValidationService } from '../../services/validation';
import { ComponentPropertiesEditorDialog } from '../../components/ComponentPropertiesEditorDialog';
import { ComponentOptionEditorDialog } from '../../components/ComponentOptionEditorDialog';
import { CardTitle } from '../../components/CardTitle';
import { StorageService } from '../../services/storage';

interface ComponentPropertiesViewProps {
  componentProperties: ComponentProperty[];
  setComponentProperties: (properties: ComponentProperty[]) => void;
  tokens: Token[];
  collections: TokenCollection[];
  dimensions: Dimension[];
  platforms: Platform[];
  resolvedValueTypes: ResolvedValueType[];
}

function normalizeOptions(options: { id: string; displayName: string; description?: string }[]): { id: string; displayName: string; description: string }[] {
  return options.map((option: { id: string; displayName: string; description?: string }) => ({
    ...option,
    description: typeof option.description === 'string' ? option.description : ''
  }));
}

export function ComponentPropertiesView({ 
  componentProperties, 
  setComponentProperties, 
  tokens, 
  collections, 
  dimensions, 
  platforms, 
  resolvedValueTypes 
}: ComponentPropertiesViewProps) {
  const { colorMode } = useColorMode();
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState({
    id: '',
    displayName: '',
    description: '',
    type: 'boolean' as 'boolean' | 'list',
    default: false as boolean | string,
    options: normalizeOptions([]),
  });
  const [optionForm, setOptionForm] = useState({ id: '', displayName: '', description: '' });
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [optionEditIndex, setOptionEditIndex] = useState<number | null>(null);
  const toast = useToast();

  // Save component properties to localStorage whenever they change
  useEffect(() => {
    StorageService.setComponentProperties(componentProperties);
  }, [componentProperties]);

  // Local state for component properties to handle immediate updates
  const [localComponentProperties, setLocalComponentProperties] = useState<ComponentProperty[]>(componentProperties);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalComponentProperties(componentProperties);
  }, [componentProperties]);

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      const property = localComponentProperties[index] as ComponentProperty;
      setForm({
        id: property.id,
        displayName: property.displayName,
        description: property.description || '',
        type: property.type,
        default: property.default,
        options: property.type === 'list' ? normalizeOptions(property.options || []) : normalizeOptions([]),
      });
    } else {
      setForm({
        id: createUniqueId('component-property'),
        displayName: '',
        description: '',
        type: 'boolean',
        default: false,
        options: normalizeOptions([]),
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIndex(null);
  };

  const handleFormChange = (field: string, value: string | boolean | { id: string; displayName: string; description?: string }[]) => {
    setForm((prev: typeof form) => {
      if (field === 'options') {
        return { ...prev, options: normalizeOptions(value as { id: string; displayName: string; description?: string }[]) };
      }
      return { ...prev, [field]: value };
    });
  };

  const validateAndSetComponentProperties = async (properties: ComponentProperty[]) => {
    try {
      // Get root-level data from localStorage
      const root = JSON.parse(localStorage.getItem('token-model:root') || '{}');
      const {
        systemName = 'Design System',
        systemId = 'design-system',
        version = '1.0.0',
        versionHistory = []
      } = root;

      const data = {
        systemName,
        systemId,
        description: 'Design system with component properties',
        tokenCollections: collections || [],
        dimensions: dimensions || [],
        tokens: tokens || [],
        platforms: platforms || [],
        taxonomies: StorageService.getTaxonomies() || [],
        resolvedValueTypes: resolvedValueTypes || [],
        componentProperties: properties || [],
        standardPropertyTypes: [],
        propertyTypes: [],
        version,
        versionHistory: versionHistory || []
      };

      console.log('[ComponentPropertiesView] Validation data:', JSON.stringify(data, null, 2));
      const result = ValidationService.validateData(data);
      console.log('[ComponentPropertiesView] Validation result:', result);
      if (!result.isValid) {
        console.error('[ComponentPropertiesView] Validation errors:', result.errors);
        const errorMessages = Array.isArray(result.errors) 
          ? result.errors.map(error => typeof error === 'string' ? error : JSON.stringify(error)).join(', ')
          : 'See console for details.';
        toast({
          title: "Validation Error",
          description: `Schema Validation Failed: ${errorMessages}`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      // Persist to local storage
      localStorage.setItem('token-model:component-properties', JSON.stringify(properties));
      setComponentProperties(properties);
    } catch (error) {
      console.error('[ComponentPropertiesView] Validation error:', error);
      toast({
        title: 'Validation Error',
        description: 'An error occurred while validating the data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSave = () => {
    // Ensure property has an id
    const propertyId = form.id && form.id.trim() ? form.id : createUniqueId('component-property');
    if (!form.displayName.trim()) {
      toast({ title: 'Name is required', status: 'error', duration: 2000 });
      return;
    }

    // Type-specific validation
    if (form.type === 'list') {
      // Ensure all options have id and displayName, and generate id if missing
      const optionsWithIds = (form.options || []).map((option: { id: string; displayName: string; description?: string }) => ({
        ...option,
        id: option.id && option.id.trim() ? option.id : createUniqueId('component-option'),
        displayName: option.displayName && option.displayName.trim() ? option.displayName : ''
      }));
      
      // Check for missing option names
      if (optionsWithIds.some((option: { displayName: string }) => !option.displayName.trim())) {
        toast({ title: 'All options must have a name', status: 'error', duration: 2000 });
        return;
      }
      
      // Check for duplicate option ids
      const optionIds = optionsWithIds.map((o: { id: string }) => o.id);
      if (new Set(optionIds).size !== optionIds.length) {
        toast({ title: 'Option IDs must be unique', status: 'error', duration: 2000 });
        return;
      }
      
      // Check for duplicate option names
      const optionNames = optionsWithIds.map((o: { displayName: string }) => o.displayName.trim().toLowerCase());
      if (new Set(optionNames).size !== optionNames.length) {
        toast({ title: 'Option names must be unique', status: 'error', duration: 2000 });
        return;
      }

      // Validate default value references an existing option
      if (typeof form.default === 'string' && !optionsWithIds.some(opt => opt.id === form.default)) {
        toast({ title: 'Default value must reference an existing option', status: 'error', duration: 2000 });
        return;
      }

      form.options = optionsWithIds as { id: string; displayName: string; description: string }[];
    }

    const newComponentProperties = [...localComponentProperties];
    const propertyToSave = {
      ...form,
      id: propertyId,
      options: form.type === 'list' ? form.options : undefined,
    } as ComponentProperty;

    if (editingIndex !== null) {
      newComponentProperties[editingIndex] = propertyToSave;
    } else {
      newComponentProperties.push(propertyToSave);
    }

    // Update local state immediately for immediate UI feedback
    setLocalComponentProperties(newComponentProperties);
    
    validateAndSetComponentProperties(newComponentProperties);
    
    // Dispatch event to notify change detection system
    window.dispatchEvent(new CustomEvent('token-model:data-change'));
    
    setOpen(false);
    setEditingIndex(null);
    toast({ title: 'Component property saved', status: 'success', duration: 2000 });
  };

  const handleDelete = (index: number) => {
    const updated = localComponentProperties.filter((_: ComponentProperty, i: number) => i !== index);
    setLocalComponentProperties(updated);
    setComponentProperties(updated);
    
    // Dispatch event to notify change detection system
    window.dispatchEvent(new CustomEvent('token-model:data-change'));
    
    toast({ title: 'Component property deleted', status: 'info', duration: 2000 });
  };

  // Option management
  const handleOptionDialogOpen = (index: number | null) => {
    if (index !== null && form.options[index]) {
      const o = form.options[index];
      setOptionForm({ 
        id: o.id, 
        displayName: o.displayName, 
        description: o.description || '' 
      });
    } else {
      setOptionForm({ 
        id: createUniqueId('component-option'), 
        displayName: '', 
        description: '' 
      });
    }
    setOptionDialogOpen(true);
    setOptionEditIndex(index);
  };

  const handleOptionDialogClose = () => {
    setOptionDialogOpen(false);
    setOptionEditIndex(null);
  };

  const handleOptionFormChange = (field: string, value: string) => {
    setOptionForm((prev: typeof optionForm) => ({ ...prev, [field]: value }));
  };

  const handleOptionSave = () => {
    // Ensure option has an id
    const optionId = optionForm.id && optionForm.id.trim() ? optionForm.id : createUniqueId('component-option');
    if (!optionForm.displayName.trim()) {
      toast({ title: 'Option name is required', status: 'error', duration: 2000 });
      return;
    }
    
    // Check for duplicate option names (case-insensitive)
    const newOptions = form.options ? [...form.options] : [];
    const optionNames = newOptions.map((o: { displayName: string }) => o.displayName.trim().toLowerCase());
    if (
      (optionEditIndex === null && optionNames.includes(optionForm.displayName.trim().toLowerCase())) ||
      (optionEditIndex !== null && optionNames.filter((_: string, i: number) => i !== optionEditIndex).includes(optionForm.displayName.trim().toLowerCase()))
    ) {
      toast({ title: 'Option names must be unique', status: 'error', duration: 2000 });
      return;
    }
    
    if (optionEditIndex !== null) {
      newOptions[optionEditIndex] = { ...optionForm, id: optionId };
    } else {
      newOptions.push({ ...optionForm, id: optionId });
    }
    setForm((prev: typeof form) => ({ ...prev, options: newOptions }));
    setOptionDialogOpen(false);
    setOptionEditIndex(null);
  };

  const handleOptionDelete = (index: number) => {
    setForm((prev: typeof form) => ({
      ...prev,
      options: (prev.options || []).filter((_: { id: string; displayName: string; description?: string }, i: number) => i !== index)
    }));
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={2}>Component Properties</Text>
      <Text fontSize="sm" color="gray.600" mb={6}>Component properties define attributes that can be applied to components. They can be boolean (true/false) or list-based with predefined options.</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" leftIcon={<LuPlus />} onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
          Add Component Property
        </Button>
        <VStack align="stretch" spacing={2}>
          {localComponentProperties.map((property: ComponentProperty, i: number) => (
            <Box
              key={property.id}
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <HStack justify="space-between" align="center">
                <Box>
                  <CardTitle title={property.displayName} cardType="componentProperty" />
                  <Text fontSize="sm" color="gray.600">{property.description}</Text>
                  <Text fontSize="sm" color="gray.600">
                    Type: {property.type} | Default: {
                      property.type === 'boolean' 
                        ? (property.default ? 'True' : 'False')
                        : property.default
                    }
                  </Text>
                  {property.type === 'list' && property.options && property.options.length > 0 && (
                    <Text fontSize="sm" color="gray.600">
                      Options: {property.options.map((opt: { displayName: string }) => opt.displayName).join(', ')}
                    </Text>
                  )}
                </Box>
                <HStack>
                  <IconButton aria-label="Edit component property" icon={<LuPencil />} size="sm" onClick={() => handleOpen(i)} />
                  <IconButton aria-label="Delete component property" icon={<LuTrash2 />} size="sm" colorScheme="red" onClick={() => handleDelete(i)} />
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>

      <ComponentPropertiesEditorDialog
        open={open}
        onClose={handleClose}
        onSave={handleSave}
        form={{ ...form, editingIndex }}
        handleFormChange={handleFormChange}
        handleOptionDialogOpen={handleOptionDialogOpen}
        handleOptionDelete={handleOptionDelete}
      />
      <ComponentOptionEditorDialog
        open={optionDialogOpen}
        onClose={handleOptionDialogClose}
        onSave={handleOptionSave}
        optionForm={optionForm}
        handleOptionFormChange={handleOptionFormChange}
        optionEditIndex={optionEditIndex}
      />
    </Box>
  );
} 