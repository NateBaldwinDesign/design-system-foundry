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
import type { Component, ComponentCategory, ComponentProperty } from '@token-model/data-model';
import { createUniqueId } from '../utils/id';
import { ValidationService } from '../services/validation';
import { ComponentEditorDialog } from '../components/ComponentEditorDialog';
import { ComponentPropertyDialog } from '../components/ComponentPropertyDialog';
import { CardTitle } from '../components/CardTitle';
import { StorageService } from '../services/storage';
import { PageTemplate } from '../components/PageTemplate';

interface ComponentsViewProps {
  components?: Component[];
  setComponents?: (components: Component[]) => void;
  componentCategories?: ComponentCategory[];
  componentProperties?: ComponentProperty[];
  canEdit?: boolean;
}

export function ComponentsView({ 
  components = [], 
  setComponents,
  componentCategories = [],
  componentProperties = [],
  canEdit = false
}: ComponentsViewProps) {
  const { colorMode } = useColorMode();
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState({
    id: '',
    displayName: '',
    description: '',
    componentCategoryId: '',
    componentProperties: [] as Array<{
      componentPropertyId: string;
      description: string;
      supportedOptionIds?: string[];
      default?: boolean | string;
    }>,
  });
  const [propertyForm, setPropertyForm] = useState({
    componentPropertyId: '',
    description: '',
    supportedOptionIds: [] as string[],
    default: undefined as boolean | string | undefined,
  });
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [propertyEditIndex, setPropertyEditIndex] = useState<number | null>(null);
  const toast = useToast();

  // Save components to localStorage whenever they change
  useEffect(() => {
    if (setComponents) {
      StorageService.setComponents(components);
    }
  }, [components, setComponents]);

  // Local state for components to handle immediate updates
  const [localComponents, setLocalComponents] = useState<Component[]>(components);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalComponents(components);
  }, [components]);

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      const component = localComponents[index] as Component;
      setForm({
        id: component.id,
        displayName: component.displayName,
        description: component.description || '',
        componentCategoryId: component.componentCategoryId,
        componentProperties: component.componentProperties.map(prop => ({
          ...prop,
          description: prop.description || ''
        })) || [],
      });
    } else {
      setForm({
        id: createUniqueId('component'),
        displayName: '',
        description: '',
        componentCategoryId: '',
        componentProperties: [],
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIndex(null);
  };

  const handleFormChange = (field: string, value: string | boolean | Array<{
    componentPropertyId: string;
    description: string;
    supportedOptionIds?: string[];
    default?: boolean | string;
  }>) => {
    setForm((prev: typeof form) => ({ ...prev, [field]: value }));
  };

  const validateAndSetComponents = async (components: Component[]) => {
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
        description: 'Design system with components',
        tokenCollections: StorageService.getCollections() || [],
        dimensions: StorageService.getDimensions() || [],
        tokens: StorageService.getTokens() || [],
        platforms: StorageService.getPlatforms() || [],
        themes: StorageService.getThemes() || [{ id: 'default', displayName: 'Default', isDefault: true }],
        taxonomies: StorageService.getTaxonomies() || [],
        resolvedValueTypes: StorageService.getValueTypes() || [],
        componentProperties: componentProperties || [],
        componentCategories: componentCategories || [],
        components: components || [],
        standardPropertyTypes: [],
        propertyTypes: [],
        version,
        versionHistory: versionHistory || []
      };

      const result = ValidationService.validateData(data);
      if (!result.isValid) {
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
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[ComponentsView] Validation error:', error);
      toast({
        title: 'Validation Error',
        description: 'An error occurred while validating the data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    }
  };

  const handleSave = async () => {
    // Ensure component has an id
    const componentId = form.id && form.id.trim() ? form.id : createUniqueId('component');
    if (!form.displayName.trim()) {
      toast({ title: 'Name is required', status: 'error', duration: 2000 });
      return;
    }
    if (!form.componentCategoryId) {
      toast({ title: 'Category is required', status: 'error', duration: 2000 });
      return;
    }

    // Validate that all component properties have required fields
    for (const prop of form.componentProperties) {
      if (!prop.componentPropertyId) {
        toast({ title: 'All properties must have a property selected', status: 'error', duration: 2000 });
        return;
      }
    }

    const newComponents = [...localComponents];
    const componentToSave: Component = {
      id: componentId,
      displayName: form.displayName,
      description: form.description,
      componentCategoryId: form.componentCategoryId,
      componentProperties: form.componentProperties,
    };

    if (editingIndex !== null) {
      newComponents[editingIndex] = componentToSave;
    } else {
      newComponents.push(componentToSave);
    }

    // Update local state immediately for immediate UI feedback
    setLocalComponents(newComponents);
    
    // Update localStorage immediately
    StorageService.setComponents(newComponents);
    
    // Call setComponents directly to ensure it's updated
    if (setComponents) {
      setComponents(newComponents);
    }
    
    // Validate the data
    const isValid = await validateAndSetComponents(newComponents);
    if (!isValid) {
      return;
    }
    
    // Dispatch event to notify change detection system
    window.dispatchEvent(new CustomEvent('token-model:data-change'));
    
    setOpen(false);
    setEditingIndex(null);
    toast({ title: 'Component saved', status: 'success', duration: 2000 });
  };

  const handleDelete = (index: number) => {
    const updated = localComponents.filter((_: Component, i: number) => i !== index);
    setLocalComponents(updated);
    
    // Update localStorage immediately
    StorageService.setComponents(updated);
    
    if (setComponents) {
      setComponents(updated);
    }
    
    // Dispatch event to notify change detection system
    window.dispatchEvent(new CustomEvent('token-model:data-change'));
    
    toast({ title: 'Component deleted', status: 'info', duration: 2000 });
  };

  // Property management
  const handlePropertyDialogOpen = (index: number | null) => {
    if (index !== null && form.componentProperties[index]) {
      const prop = form.componentProperties[index];
      setPropertyForm({
        componentPropertyId: prop.componentPropertyId,
        description: prop.description || '',
        supportedOptionIds: prop.supportedOptionIds || [],
        default: prop.default,
      });
    } else {
      setPropertyForm({
        componentPropertyId: '',
        description: '',
        supportedOptionIds: [],
        default: undefined,
      });
    }
    setPropertyDialogOpen(true);
    setPropertyEditIndex(index);
  };

  const handlePropertyDialogClose = () => {
    setPropertyDialogOpen(false);
    setPropertyEditIndex(null);
  };

  const handlePropertyFormChange = (field: string, value: string | boolean | string[]) => {
    setPropertyForm((prev: typeof propertyForm) => ({ 
      ...prev, 
      [field]: field === 'description' ? (value as string) || '' : value 
    }));
  };

  const handlePropertySave = () => {
    if (!propertyForm.componentPropertyId) {
      toast({ title: 'Property is required', status: 'error', duration: 2000 });
      return;
    }

    const newProperties = [...form.componentProperties];
    if (propertyEditIndex !== null) {
      newProperties[propertyEditIndex] = { ...propertyForm };
    } else {
      newProperties.push({ ...propertyForm });
    }
    
    setForm({ ...form, componentProperties: newProperties });
    setPropertyDialogOpen(false);
    setPropertyEditIndex(null);
  };

  const handlePropertyDelete = (index: number) => {
    setForm((prev: typeof form) => ({
      ...prev,
      componentProperties: prev.componentProperties.filter((_: { componentPropertyId: string; description: string; supportedOptionIds?: string[]; default?: boolean | string }, i: number) => i !== index)
    }));
  };

  const getCategoryDisplayName = (categoryId: string) => {
    const category = componentCategories.find(c => c.id === categoryId);
    return category ? category.displayName : `Unknown Category (${categoryId})`;
  };

  const getPropertyDisplayName = (propertyId: string) => {
    const property = componentProperties.find(p => p.id === propertyId);
    return property ? property.displayName : `Unknown Property (${propertyId})`;
  };

  return (
    <PageTemplate
      title="Components"
      description="Components are reusable UI elements with defined properties and behaviors. Each component belongs to a category and can have multiple properties with component-specific configurations."
    >
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        {canEdit && (
          <Button size="sm" leftIcon={<LuPlus />} onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
            Add Component
          </Button>
        )}
        <VStack align="stretch" spacing={2}>
          {localComponents.map((component: Component, i: number) => (
            <Box
              key={component.id}
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <HStack justify="space-between" align="center">
                <Box>
                  <CardTitle title={component.displayName} cardType="collection" />
                  <Text fontSize="sm" color="gray.600">{component.description}</Text>
                  <Text fontSize="sm" color="gray.600">
                    Category: {getCategoryDisplayName(component.componentCategoryId)}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Properties: {component.componentProperties.length}
                  </Text>
                  {component.componentProperties.length > 0 && (
                    <Text fontSize="sm" color="gray.600">
                      {component.componentProperties.map(prop => getPropertyDisplayName(prop.componentPropertyId)).join(', ')}
                    </Text>
                  )}
                </Box>
                {canEdit && (
                  <HStack>
                    <IconButton aria-label="Edit component" icon={<LuPencil />} size="sm" onClick={() => handleOpen(i)} />
                    <IconButton aria-label="Delete component" icon={<LuTrash2 />} size="sm" colorScheme="red" onClick={() => handleDelete(i)} />
                  </HStack>
                )}
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>

      <ComponentEditorDialog
        open={open}
        onClose={handleClose}
        onSave={handleSave}
        form={{ ...form, editingIndex }}
        componentCategories={componentCategories}
        componentProperties={componentProperties}
        handleFormChange={handleFormChange}
        handlePropertyDialogOpen={handlePropertyDialogOpen}
        handlePropertyDelete={handlePropertyDelete}
      />
      <ComponentPropertyDialog
        open={propertyDialogOpen}
        onClose={handlePropertyDialogClose}
        onSave={handlePropertySave}
        propertyForm={propertyForm}
        componentProperties={componentProperties}
        handlePropertyFormChange={handlePropertyFormChange}
        propertyEditIndex={propertyEditIndex}
      />
    </PageTemplate>
  );
}

export default ComponentsView; 