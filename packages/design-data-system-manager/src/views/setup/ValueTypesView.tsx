import React, { useState } from "react";
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  IconButton,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  FormErrorMessage,
  useColorMode
} from '@chakra-ui/react';
import { LuTrash2, LuPencil, LuPlus } from 'react-icons/lu';
import { ValidationService } from '../../services/validation';
import type { ResolvedValueType, StandardValueType, Token, TokenCollection, Dimension, Platform, Taxonomy, Theme } from '@token-model/data-model/src/schema';
import { StandardValueType as StandardValueTypeSchema } from '@token-model/data-model/src/schema';
import { CardTitle } from '../../components/CardTitle';

interface ValueTypesViewProps {
  valueTypes: ResolvedValueType[];
  onUpdate: (valueTypes: ResolvedValueType[]) => void;
  tokens: Token[];
  collections: TokenCollection[];
  dimensions: Dimension[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  themes: Theme[];
}

export function ValueTypesView({ 
  valueTypes, 
  onUpdate, 
  tokens, 
  collections, 
  dimensions, 
  platforms, 
  taxonomies, 
  themes 
}: ValueTypesViewProps) {
  const { colorMode } = useColorMode();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ResolvedValueType | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<StandardValueType | 'CUSTOM'>('CUSTOM');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  // Compute available standard types (exclude those already used, except for the one being edited)
  const usedTypes = valueTypes
    .filter(vt => !editingType || vt.id !== editingType.id)
    .map(vt => vt.type)
    .filter((t): t is StandardValueType => !!t);
  const availableStandardTypes = Object.values(StandardValueTypeSchema.enum).filter(
    (enumValue) => !usedTypes.includes(enumValue)
  );

  const handleOpenCreate = () => {
    setEditingType(null);
    setName('');
    setType('CUSTOM'); // Use 'CUSTOM' as a sentinel value for custom types
    setDialogOpen(true);
  };

  const handleOpenEdit = (valueType: ResolvedValueType) => {
    setEditingType(valueType);
    setName(valueType.displayName);
    setType(valueType.type || 'CUSTOM');
    setDialogOpen(true);
  };

  const validateAndSetValueTypes = (updatedValueTypes: ResolvedValueType[]) => {
    // Get systemName and systemId from storage or fallback
    const storedData = JSON.parse(localStorage.getItem('token-model:data') || '{}');
    const systemName = storedData.systemName || 'Design Token System';
    const systemId = storedData.systemId || 'default-system-id';

    const data = {
      tokenCollections: collections,
      dimensions: dimensions,
      tokens: tokens,
      platforms: platforms,
      taxonomies: taxonomies,
      themes: themes,
      resolvedValueTypes: updatedValueTypes,
      version: '1.0.0',
      versionHistory: [],
      systemName,
      systemId
    };
    const result = ValidationService.validateData(data);
    if (!result.isValid) {
      // Debugging: log the validation errors and the data being validated
      console.error('[ValueTypesView] Schema validation failed:', {
        errors: result.errors,
        data
      });
      toast({
        title: 'Schema Validation Failed',
        description: 'Your change would make the data invalid. See the Validation tab for details.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return false;
    }
    onUpdate(updatedValueTypes);
    return true;
  };

  const handleDialogSave = () => {
    setErrors({});
    if (!name.trim()) {
      setErrors({ name: 'Name is required' });
      toast({
        title: 'Required Field Missing',
        description: 'Value type name is required.',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
      return;
    }
    // No need to require type if custom
    if (!type) {
      setErrors({ type: 'Type is required' });
      toast({
        title: 'Required Field Missing',
        description: 'Value type must be selected.',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
      return;
    }
    const newType: ResolvedValueType = {
      id: name.trim().toLowerCase().replace(/\s+/g, '-'),
      displayName: name.trim(),
      ...(type !== 'CUSTOM' ? { type: type as StandardValueType } : {})
    };
    if (editingType) {
      const updated = valueTypes.map(t => t.id === editingType.id ? newType : t);
      if (!validateAndSetValueTypes(updated)) return;
      toast({ 
        title: 'Value Type Updated', 
        description: `Successfully updated value type "${newType.displayName}"`,
        status: 'success', 
        duration: 3000,
        isClosable: true 
      });
    } else {
      const updated = [...valueTypes, newType];
      if (!validateAndSetValueTypes(updated)) return;
      toast({ 
        title: 'Value Type Created', 
        description: `Successfully created value type "${newType.displayName}"`,
        status: 'success', 
        duration: 3000,
        isClosable: true 
      });
    }
    setDialogOpen(false);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleDelete = (valueType: ResolvedValueType) => {
    const updated = valueTypes.filter(t => t.id !== valueType.id);
    if (!validateAndSetValueTypes(updated)) return;
    toast({ 
      title: 'Value Type Deleted', 
      description: `Successfully deleted value type "${valueType.displayName}"`,
      status: 'info', 
      duration: 3000,
      isClosable: true 
    });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Value Types</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" onClick={handleOpenCreate} colorScheme="blue" mb={4} leftIcon={<LuPlus />}>
          Create New Value Type
        </Button>
        <VStack align="stretch" spacing={2}>
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
                  <CardTitle title={valueType.displayName} cardType={valueType.type || 'Custom'} />
                  <Text fontSize="sm" color="gray.600">Type: {valueType.type || 'Custom'}</Text>
                </Box>
                <HStack>
                  <IconButton aria-label="Edit value type" icon={<LuPencil />} size="sm" onClick={() => handleOpenEdit(valueType)} />
                  <IconButton aria-label="Delete value type" icon={<LuTrash2 />} size="sm" colorScheme="red" onClick={() => handleDelete(valueType)} />
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>
      <Modal isOpen={dialogOpen} onClose={handleDialogClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingType ? 'Edit Value Type' : 'Create Value Type'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isInvalid={!!errors.name}>
                <FormLabel>Name</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter value type name"
                />
                {errors.name && <FormErrorMessage>{errors.name}</FormErrorMessage>}
              </FormControl>
              <FormControl isInvalid={!!errors.type}>
                <FormLabel>Type</FormLabel>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value as StandardValueType | 'CUSTOM')}
                >
                  <option value="CUSTOM">Custom</option>
                  {availableStandardTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
                {errors.type && <FormErrorMessage>{errors.type}</FormErrorMessage>}
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleDialogSave}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 