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
import { DeleteIcon, EditIcon, AddIcon } from '@chakra-ui/icons';
import { ValidationService } from '../../services/validation';
import type { Token, TokenCollection, Dimension, Platform, Taxonomy, Theme } from '@token-model/data-model';

interface ValueTypeItem {
  name: string;
  type: string;
}

interface ValueTypesTabProps {
  valueTypes: string[];
  onUpdate: (valueTypes: string[]) => void;
}

export function ValueTypesTab({ valueTypes, onUpdate }: ValueTypesTabProps) {
  const { colorMode } = useColorMode();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();
  // Assume tokens, collections, dimensions, platforms, taxonomies, and themes are available via props or context (for this edit, use empty arrays as placeholders)
  const tokens: Token[] = [];
  const collections: TokenCollection[] = [];
  const dimensions: Dimension[] = [];
  const platforms: Platform[] = [];
  const taxonomies: Taxonomy[] = [];
  const themes: Theme[] = [];

  // For demo, treat valueTypes as array of names, but you can adapt to array of objects if needed
  const valueTypeList: ValueTypeItem[] = valueTypes.map((vt: string) => ({ name: vt, type: 'STRING' }));

  const handleOpenCreate = () => {
    setEditingType(null);
    setName('');
    setType('');
    setDialogOpen(true);
  };

  const handleOpenEdit = (valueType: ValueTypeItem) => {
    setEditingType(valueType.name);
    setName(valueType.name);
    setType(valueType.type);
    setDialogOpen(true);
  };

  const validateAndSetValueTypes = (updatedValueTypes: string[]) => {
    const data = {
      tokenCollections: collections,
      dimensions,
      tokens,
      platforms,
      taxonomies,
      themes,
      resolvedValueTypes: updatedValueTypes.map(id => ({ id, displayName: id })),
      version: '1.0.0',
      versionHistory: []
    };
    const result = ValidationService.validateData(data);
    if (!result.isValid) {
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
    const newType: string = name.trim();
    if (editingType) {
      const updated = valueTypes.map(t => t === editingType ? newType : t);
      if (!validateAndSetValueTypes(updated)) return;
      toast({ 
        title: 'Value Type Updated', 
        description: `Successfully updated value type "${newType}"`,
        status: 'success', 
        duration: 3000,
        isClosable: true 
      });
    } else {
      const updated = [...valueTypes, newType];
      if (!validateAndSetValueTypes(updated)) return;
      toast({ 
        title: 'Value Type Created', 
        description: `Successfully created value type "${newType}"`,
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

  const handleDelete = (valueType: string) => {
    const updated = valueTypes.filter(t => t !== valueType);
    if (!validateAndSetValueTypes(updated)) return;
    toast({ 
      title: 'Value Type Deleted', 
      description: `Successfully deleted value type "${valueType}"`,
      status: 'info', 
      duration: 3000,
      isClosable: true 
    });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Value Types</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" onClick={handleOpenCreate} colorScheme="blue" mb={4} leftIcon={<AddIcon />}>
          Create New Value Type
        </Button>
        <VStack align="stretch" spacing={2}>
          {valueTypeList.map((valueType) => (
            <Box 
              key={valueType.name} 
              p={3} 
              borderWidth={1} 
              borderRadius="md" 
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <HStack justify="space-between" align="center">
                <Box>
                  <Text fontSize="lg" fontWeight="medium">{valueType.name}</Text>
                  <Text fontSize="sm" color="gray.600">Type: {valueType.type}</Text>
                </Box>
                <HStack>
                  <IconButton aria-label="Edit value type" icon={<EditIcon />} size="sm" onClick={() => handleOpenEdit(valueType)} />
                  <IconButton aria-label="Delete value type" icon={<DeleteIcon />} size="sm" colorScheme="red" onClick={() => handleDelete(valueType.name)} />
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>
      <Modal isOpen={dialogOpen} onClose={handleDialogClose} size="md">
        <ModalOverlay />
        <ModalContent bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
          <ModalHeader>{editingType ? 'Edit Value Type' : 'Create Value Type'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isInvalid={!!errors.name} isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <FormErrorMessage>{errors.name}</FormErrorMessage>}
              </FormControl>
              <FormControl isInvalid={!!errors.type} isRequired>
                <FormLabel>Type</FormLabel>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="Select type"
                >
                  <option value="COLOR">Color</option>
                  <option value="FLOAT">Float</option>
                  <option value="INTEGER">Integer</option>
                  <option value="STRING">String</option>
                  <option value="BOOLEAN">Boolean</option>
                  <option value="ALIAS">Alias</option>
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
              {editingType ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 