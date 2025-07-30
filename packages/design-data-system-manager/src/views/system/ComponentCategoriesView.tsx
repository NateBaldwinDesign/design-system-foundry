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
  Input,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import type { ComponentCategory } from '@token-model/data-model';
import { createUniqueId } from '../../utils/id';
import { CardTitle } from '../../components/CardTitle';
import { StorageService } from '../../services/storage';

interface ComponentCategoriesViewProps {
  componentCategories: ComponentCategory[];
  setComponentCategories: (categories: ComponentCategory[]) => void;
  canEdit?: boolean;
}

export function ComponentCategoriesView({ 
  componentCategories, 
  setComponentCategories,
  canEdit = true
}: ComponentCategoriesViewProps) {
  const { colorMode } = useColorMode();
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState({
    id: '',
    displayName: '',
    description: '',
  });
  const toast = useToast();

  // Save component categories to localStorage whenever they change
  useEffect(() => {
    StorageService.setComponentCategories(componentCategories);
  }, [componentCategories]);

  // Local state for component categories to handle immediate updates
  const [localComponentCategories, setLocalComponentCategories] = useState<ComponentCategory[]>(componentCategories);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalComponentCategories(componentCategories);
  }, [componentCategories]);

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      const category = localComponentCategories[index];
      setForm({
        id: category.id,
        displayName: category.displayName,
        description: category.description || '',
      });
    } else {
      setForm({
        id: createUniqueId('component-category'),
        displayName: '',
        description: '',
      });
    }
    setOpen(true);
  };

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.displayName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Display name is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newCategory: ComponentCategory = {
      id: form.id,
      displayName: form.displayName.trim(),
      description: form.description.trim() || undefined,
    };

    let updatedCategories: ComponentCategory[];

    if (editingIndex !== null) {
      updatedCategories = [...localComponentCategories];
      updatedCategories[editingIndex] = newCategory;
    } else {
      updatedCategories = [...localComponentCategories, newCategory];
    }

    setLocalComponentCategories(updatedCategories);
    setComponentCategories(updatedCategories);
    setOpen(false);
    setForm({ id: '', displayName: '', description: '' });

    // Trigger change detection
    window.dispatchEvent(new CustomEvent('token-model:data-change'));

    toast({
      title: 'Success',
      description: `Component category ${editingIndex !== null ? 'updated' : 'created'} successfully`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleDelete = async (index: number) => {
    const category = localComponentCategories[index];
    const updatedCategories = localComponentCategories.filter((_, i) => i !== index);

    setLocalComponentCategories(updatedCategories);
    setComponentCategories(updatedCategories);

    // Trigger change detection
    window.dispatchEvent(new CustomEvent('token-model:data-change'));

    toast({
      title: 'Success',
      description: `Component category ${category.displayName} deleted successfully`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleClose = () => {
    setOpen(false);
    setForm({ id: '', displayName: '', description: '' });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={2}>Component Categories</Text>
      <Text fontSize="sm" color="gray.600" mb={6}>Component categories help organize components into logical groups for better management and discovery.</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        {canEdit && (
          <Button size="sm" leftIcon={<LuPlus />} onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
            Add Component Category
          </Button>
        )}
        <VStack align="stretch" spacing={2}>
          {localComponentCategories.map((category, i) => (
            <Box
              key={category.id}
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <HStack justify="space-between" align="center">
                <Box>
                  <CardTitle title={category.displayName} cardType="collection" />
                  <Text fontSize="sm" color="gray.600">{category.description}</Text>
                  <Text fontSize="sm" color="gray.600">ID: {category.id}</Text>
                </Box>
                {canEdit && (
                  <HStack>
                    <IconButton aria-label="Edit component category" icon={<LuPencil />} size="sm" onClick={() => handleOpen(i)} />
                    <IconButton aria-label="Delete component category" icon={<LuTrash2 />} size="sm" colorScheme="red" onClick={() => handleDelete(i)} />
                  </HStack>
                )}
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Edit/Create Modal */}
      <Modal isOpen={open} onClose={handleClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingIndex !== null ? 'Edit Component Category' : 'Create Component Category'}
          </ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Display Name</FormLabel>
                <Input
                  value={form.displayName}
                  onChange={(e) => handleFormChange('displayName', e.target.value)}
                  placeholder="Enter display name"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Enter description (optional)"
                  rows={3}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave}>
              {editingIndex !== null ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 