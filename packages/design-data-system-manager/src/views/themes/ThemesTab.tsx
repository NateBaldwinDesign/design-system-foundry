import React, { useState } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  VStack,
  HStack,
  IconButton,
  Dialog,
  Field,
  Tag
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import { ValidationService } from '../../services/validation';
import { useToast } from '../../hooks/useToast';
import { useTheme } from 'next-themes';
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
  const { resolvedTheme } = useTheme();
  const colorMode = resolvedTheme;
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
        closable: true,
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
        closable: true 
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
        closable: true 
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
      closable: true 
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
      closable: true 
    });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Themes</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button 
          size="sm" 
          onClick={() => handleOpen(null)} 
          colorPalette="blue" 
          mb={4}
        >
          <LuPlus style={{ marginRight: '0.5rem' }} />
          Add Theme
        </Button>
        <VStack gap={2} align="stretch">
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
                  <Text fontWeight="bold">{theme.displayName}</Text>
                  {theme.description && (
                    <Text fontSize="sm" color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}>
                      {theme.description}
                    </Text>
                  )}
                  {theme.isDefault && (
                    <Tag.Root size="sm" colorPalette="green" mt={1}>
                      <Tag.Label>Default</Tag.Label>
                    </Tag.Root>
                  )}
                </Box>
                <HStack>
                  <IconButton
                    aria-label="Edit theme"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpen(i)}
                  >
                    <LuPencil />
                  </IconButton>
                  <IconButton
                    aria-label="Delete theme"
                    size="sm"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => handleDelete(i)}
                  >
                    <LuTrash2 />
                  </IconButton>
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>

      <Dialog.Root open={open} onOpenChange={handleClose}>
        <Dialog.Content bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
          <Dialog.Header>{editingIndex !== null ? 'Edit Theme' : 'Add Theme'}</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body>
            <VStack gap={4} align="stretch">
              <Field.Root required>
                <Field.Label>Display Name</Field.Label>
                <Input
                  value={form.displayName}
                  onChange={e => handleFormChange('displayName', e.target.value)}
                  bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Input
                  value={form.description || ''}
                  onChange={e => handleFormChange('description', e.target.value)}
                  bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Default Theme</Field.Label>
                <Button
                  colorPalette={form.isDefault ? 'green' : 'gray'}
                  onClick={() => handleFormChange('isDefault', !form.isDefault)}
                  size="sm"
                >
                  {form.isDefault ? 'Default Theme' : 'Set as Default'}
                </Button>
              </Field.Root>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" mr={3} onClick={handleClose}>Cancel</Button>
            <Button colorPalette="blue" onClick={handleSave}>Save</Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
} 