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
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import { StorageService } from '../services/storage';

interface Theme {
  id: string;
  displayName: string;
  description?: string;
  isDefault?: boolean;
}

interface ThemesWorkflowProps {
  themes: Theme[];
  setThemes: (themes: Theme[]) => void;
}

export function ThemesWorkflow({ themes, setThemes }: ThemesWorkflowProps) {
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
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.displayName.trim()) {
      toast({ title: 'Display name is required', status: 'error', duration: 2000 });
      return;
    }

    const id = form.id || form.displayName.trim().replace(/\s+/g, '_').toLowerCase();
    if (!form.id && themes.some(t => t.id === id)) {
      toast({ title: 'A theme with this name already exists', status: 'error', duration: 2000 });
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

    setThemes(newThemes);
    StorageService.setThemes(newThemes);
    setOpen(false);
    setEditingIndex(null);
    toast({ title: 'Theme saved', status: 'success', duration: 2000 });
  };

  const handleDelete = (index: number) => {
    const newThemes = themes.filter((_, i) => i !== index);
    setThemes(newThemes);
    StorageService.setThemes(newThemes);
    toast({ title: 'Theme deleted', status: 'info', duration: 2000 });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Themes</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button leftIcon={<LuPlus />} onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
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
                    icon={<LuPencil />} 
                    size="sm" 
                    onClick={() => handleOpen(i)}
                    colorScheme={colorMode === 'dark' ? 'blue' : 'gray'}
                  />
                  <IconButton 
                    aria-label="Delete theme" 
                    icon={<LuTrash2 />} 
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