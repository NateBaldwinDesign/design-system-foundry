import React, { useState } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  FormControl,
  FormLabel,
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
  Tag,
  useColorMode
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import { StorageService } from '../../services/storage';
import { ValidationService } from '../../services/validation';
import type { Token, TokenCollection, Dimension, Platform, Taxonomy } from '@token-model/data-model';

interface Theme {
  id: string;
  displayName: string;
  description?: string;
  isDefault?: boolean;
}

interface ThemesTabProps {
  themes: Theme[];
  setThemes: (themes: Theme[]) => void;
}

export function ThemesTab({ themes, setThemes }: ThemesTabProps) {
  const { colorMode } = useColorMode();
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Theme>({
    id: '',
    displayName: '',
    description: '',
    isDefault: false
  });
  const toast = useToast();
  // Assume tokens, collections, dimensions, platforms, and taxonomies are available via props or context (for this edit, use empty arrays as placeholders)
  const tokens: Token[] = [];
  const collections: TokenCollection[] = [];
  const dimensions: Dimension[] = [];
  const platforms: Platform[] = [];
  const taxonomies: Taxonomy[] = [];

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      setForm(themes[index]);
    } else {
      setForm({
        id: '',
        displayName: '',
        description: '',
        isDefault: false
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIndex(null);
  };

  const handleFormChange = (field: keyof Theme, value: string | boolean) => {
    setForm((prev: Theme) => ({ ...prev, [field]: value }));
  };

  const validateAndSetThemes = (updatedThemes: Theme[]) => {
    const data = {
      tokenCollections: collections,
      dimensions,
      tokens,
      platforms,
      taxonomies,
      themes: updatedThemes,
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
    setThemes(updatedThemes);
    return true;
  };

  const handleSave = () => {
    if (!form.displayName.trim()) {
      toast({ 
        title: 'Required Field Missing', 
        description: 'Display name is required for themes.',
        status: 'error', 
        duration: 4000,
        isClosable: true 
      });
      return;
    }
    const id = form.id || form.displayName.trim().replace(/\s+/g, '_').toLowerCase();
    if (!form.id && themes.some(t => t.id === id)) {
      toast({ 
        title: 'Duplicate Theme', 
        description: 'A theme with this name already exists. Please choose a different name.',
        status: 'error', 
        duration: 4000,
        isClosable: true 
      });
      return;
    }
    const newThemes = [...themes];
    const themeToSave = {
      ...form,
      id,
      isDefault: form.isDefault
    };
    if (editingIndex !== null) {
      newThemes[editingIndex] = themeToSave;
    } else {
      newThemes.push(themeToSave);
    }
    // If this theme is set as default, unset any other default themes
    if (themeToSave.isDefault) {
      newThemes.forEach(t => {
        if (t.id !== themeToSave.id) {
          t.isDefault = false;
        }
      });
    }
    if (!validateAndSetThemes(newThemes)) {
      return;
    }
    setOpen(false);
    setEditingIndex(null);
    toast({ 
      title: 'Theme Saved', 
      description: `Successfully ${editingIndex !== null ? 'updated' : 'created'} theme "${form.displayName}"`,
      status: 'success', 
      duration: 3000,
      isClosable: true 
    });
  };

  const handleDelete = (index: number) => {
    const themeToDelete = themes[index];
    const newThemes = themes.filter((_, i) => i !== index);
    if (!validateAndSetThemes(newThemes)) {
      return;
    }
    toast({ 
      title: 'Theme Deleted', 
      description: `Successfully deleted theme "${themeToDelete.displayName}"`,
      status: 'info', 
      duration: 3000,
      isClosable: true 
    });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Themes</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button leftIcon={<AddIcon />} size="sm" onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
          Add Theme
        </Button>
        <VStack align="stretch" spacing={2}>
          {themes.map((theme, i) => (
            <Box 
              key={theme.id} 
              p={3} 
              borderWidth={1} 
              borderRadius="md" 
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <HStack justify="space-between" align="center">
                <Box>
                  <Text fontSize="lg" fontWeight="medium">{theme.displayName}</Text>
                  <Text fontSize="sm" color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}>
                    {theme.description || ''}
                  </Text>
                  {theme.isDefault && (
                    <Tag colorScheme="green" size="sm" mt={1}>Default</Tag>
                  )}
                </Box>
                <HStack>
                  <IconButton 
                    aria-label="Edit theme" 
                    icon={<EditIcon />} 
                    size="sm" 
                    onClick={() => handleOpen(i)}
                    colorScheme={colorMode === 'dark' ? 'blue' : 'gray'}
                  />
                  <IconButton 
                    aria-label="Delete theme" 
                    icon={<DeleteIcon />} 
                    size="sm" 
                    colorScheme="red" 
                    onClick={() => handleDelete(i)}
                  />
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>
      {/* Theme Editor Modal */}
      <Modal isOpen={open} onClose={handleClose} size="lg">
        <ModalOverlay />
        <ModalContent bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
          <ModalHeader>{editingIndex !== null ? 'Edit Theme' : 'Add Theme'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Display Name</FormLabel>
                <Input
                  value={form.displayName}
                  onChange={e => handleFormChange('displayName', e.target.value)}
                  bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={form.description || ''}
                  onChange={e => handleFormChange('description', e.target.value)}
                  bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Default Theme</FormLabel>
                <Button
                  colorScheme={form.isDefault ? 'green' : 'gray'}
                  onClick={() => handleFormChange('isDefault', !form.isDefault)}
                  size="sm"
                >
                  {form.isDefault ? 'Default Theme' : 'Set as Default'}
                </Button>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 