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
  useColorMode,
  Select,
  FormHelperText
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';

interface Theme {
  id: string;
  displayName: string;
  description?: string;
  isDefault?: boolean;
  overrideSource?: {
    repositoryUri: string;
    filePath: string;
  };
  status?: 'active' | 'deprecated';
}

interface ThemesTabProps {
  themes: Theme[];
  setThemes: (themes: Theme[]) => void;
  canEdit?: boolean;
}

export function ThemesTab({ themes, setThemes, canEdit = false }: ThemesTabProps) {
  const { colorMode } = useColorMode();
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Theme>({
    id: '',
    displayName: '',
    description: '',
    isDefault: false,
    status: 'active'
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
        isDefault: false,
        status: 'active'
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
        {canEdit && (
          <Button leftIcon={<LuPlus />} size="sm" onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
            Add Theme
          </Button>
        )}
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
                  <HStack spacing={2} mt={1}>
                    {theme.isDefault && (
                      <Tag colorScheme="green" size="sm">Default</Tag>
                    )}
                    {theme.status === 'deprecated' && (
                      <Tag colorScheme="red" size="sm">Deprecated</Tag>
                    )}
                    {theme.overrideSource && (
                      <Tag colorScheme="blue" size="sm">External</Tag>
                    )}
                  </HStack>
                </Box>
                {canEdit && (
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
                )}
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
              
              <FormControl>
                <FormLabel>Status</FormLabel>
                <Select
                  value={form.status || 'active'}
                  onChange={e => handleFormChange('status', e.target.value)}
                  bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                >
                  <option value="active">Active</option>
                  <option value="deprecated">Deprecated</option>
                </Select>
                <FormHelperText>Lifecycle status of this theme</FormHelperText>
              </FormControl>
              
              <FormControl>
                <FormLabel>External Theme Override</FormLabel>
                <VStack spacing={2} align="stretch">
                  <Input
                    placeholder="Repository URI (e.g., owner/repo)"
                    value={form.overrideSource?.repositoryUri || ''}
                    onChange={e => {
                      const repositoryUri = e.target.value;
                      const filePath = form.overrideSource?.filePath || '';
                      setForm(prev => ({
                        ...prev,
                        overrideSource: repositoryUri && filePath ? { repositoryUri, filePath } : undefined
                      }));
                    }}
                    bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                  />
                  <Input
                    placeholder="File path (e.g., theme-dark.json)"
                    value={form.overrideSource?.filePath || ''}
                    onChange={e => {
                      const repositoryUri = form.overrideSource?.repositoryUri || '';
                      const filePath = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        overrideSource: repositoryUri && filePath ? { repositoryUri, filePath } : undefined
                      }));
                    }}
                    bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                  />
                </VStack>
                <FormHelperText>Optional: Reference to external theme override file</FormHelperText>
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