import React, { useState } from "react";
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  IconButton,
  Dialog,
  Input,
  Select,
  Field,
  Portal,
  createListCollection,
} from '@chakra-ui/react';
import { useTheme } from 'next-themes';
import { LuTrash2, LuPencil, LuPlus } from 'react-icons/lu';
import { ValidationService } from '../../services/validation';
import type { Token, TokenCollection, Dimension, Platform, Taxonomy, Theme, ResolvedValueType, StandardValueType } from '@token-model/data-model';
import { useToast } from '../../hooks/useToast';
import type { ChangeEvent } from 'react';

interface ValueTypesViewProps {
  valueTypes: ResolvedValueType[];
  onUpdate: (valueTypes: ResolvedValueType[]) => void;
}

export function ValueTypesView({ valueTypes, onUpdate }: ValueTypesViewProps) {
  const { theme } = useTheme();
  const colorMode = theme === 'dark' ? 'dark' : 'light';
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ResolvedValueType | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<StandardValueType | 'CUSTOM'>('CUSTOM');
  const [errors, setErrors] = useState<{ name?: string; type?: string }>({});
  const toast = useToast();
  // Assume tokens, collections, dimensions, platforms, taxonomies, and themes are available via props or context (for this edit, use empty arrays as placeholders)
  const tokens: Token[] = [];
  const collections: TokenCollection[] = [];
  const dimensions: Dimension[] = [];
  const platforms: Platform[] = [];
  const taxonomies: Taxonomy[] = [];
  const themes: Theme[] = [];

  const availableStandardTypes: StandardValueType[] = [
    'COLOR',
    'DIMENSION',
    'SPACING',
    'FONT_FAMILY',
    'FONT_WEIGHT',
    'FONT_SIZE',
    'LINE_HEIGHT',
    'LETTER_SPACING',
    'DURATION',
    'CUBIC_BEZIER',
    'BLUR',
    'SPREAD',
    'RADIUS'
  ];

  const handleOpenCreate = () => {
    setEditingType(null);
    setName('');
    setType('CUSTOM');
    setErrors({});
    setDialogOpen(true);
  };

  const handleOpenEdit = (valueType: ResolvedValueType) => {
    setEditingType(valueType);
    setName(valueType.displayName);
    setType(valueType.type || 'CUSTOM');
    setErrors({});
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingType(null);
    setName('');
    setType('CUSTOM');
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: { name?: string; type?: string } = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!type) {
      newErrors.type = 'Type is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDialogSave = () => {
    if (!validateForm()) return;

    const updatedValueTypes = [...valueTypes];
    if (editingType) {
      const index = updatedValueTypes.findIndex(t => t.id === editingType.id);
      if (index !== -1) {
        updatedValueTypes[index] = {
          ...editingType,
          displayName: name,
          type: type === 'CUSTOM' ? undefined : type
        };
      }
    } else {
      const newValueType: ResolvedValueType = {
        id: `value-type-${Date.now()}`,
        displayName: name,
        type: type === 'CUSTOM' ? undefined : type
      };
      updatedValueTypes.push(newValueType);
    }

    onUpdate(updatedValueTypes);
    handleDialogClose();
    toast({
      title: editingType ? 'Value Type Updated' : 'Value Type Created',
      description: `Successfully ${editingType ? 'updated' : 'created'} value type "${name}"`,
      status: 'success'
    });
  };

  const handleDelete = (valueType: ResolvedValueType) => {
    const updatedValueTypes = valueTypes.filter(t => t.id !== valueType.id);
    onUpdate(updatedValueTypes);
    toast({
      title: 'Value Type Deleted',
      description: `Successfully deleted value type "${valueType.displayName}"`,
      status: 'success'
    });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Value Types</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" onClick={handleOpenCreate} colorScheme="blue" mb={4}>
          <LuPlus />
          Create New Value Type
        </Button>
        <VStack align="stretch" gap={2}>
          {valueTypes.map((valueType) => (
            <Box 
              key={valueType.id} 
              p={3} 
              borderWidth={1} 
              borderRadius="md" 
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <HStack justify="space-between" align="center">
                <Box>
                  <Text fontSize="lg" fontWeight="medium">{valueType.displayName}</Text>
                  <Text fontSize="sm" color="gray.600">Type: {valueType.type || 'Custom'}</Text>
                </Box>
                <HStack>
                  <IconButton aria-label="Edit value type" size="sm" onClick={() => handleOpenEdit(valueType)}>
                    <LuPencil />
                  </IconButton>
                  <IconButton aria-label="Delete value type" size="sm" colorScheme="red" onClick={() => handleDelete(valueType)}>
                    <LuTrash2 />
                  </IconButton>
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>
      <Dialog.Root open={dialogOpen} onOpenChange={handleDialogClose}>
        <Dialog.Content>
          <Dialog.Header>{editingType ? 'Edit Value Type' : 'Create Value Type'}</Dialog.Header>
          <Button 
            position="absolute" 
            top={2} 
            right={2} 
            variant="ghost" 
            onClick={handleDialogClose}
            aria-label="Close dialog"
          >
            ×
          </Button>
          <Dialog.Body>
            <VStack gap={4}>
              <Field.Root invalid={!!errors.name}>
                <Field.Label>Name</Field.Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter value type name"
                />
                {errors.name && <Field.ErrorText>{errors.name}</Field.ErrorText>}
              </Field.Root>
              <Field.Root invalid={!!errors.type}>
                <Field.Label>Type</Field.Label>
                <Select.Root
                  value={[type]}
                  onValueChange={(details) => {
                    const value = Array.isArray(details.value) ? details.value[0] : details.value;
                    setType(value as StandardValueType | 'CUSTOM');
                  }}
                  collection={createListCollection({
                    items: [
                      { value: 'CUSTOM', label: 'Custom' },
                      ...availableStandardTypes.map(type => ({ value: type, label: type }))
                    ]
                  })}
                >
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Select type..." />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        <Select.Item item={{ value: 'CUSTOM', label: 'Custom' }}>Custom</Select.Item>
                        {availableStandardTypes.map((type) => (
                          <Select.Item key={type} item={{ value: type, label: type }}>
                            {type}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
                {errors.type && <Field.ErrorText>{errors.type}</Field.ErrorText>}
              </Field.Root>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" mr={3} onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleDialogSave}>
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
} 