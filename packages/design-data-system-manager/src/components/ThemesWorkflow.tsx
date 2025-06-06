import React, { useState } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  Field,
  VStack,
  HStack,
  IconButton,
  Dialog,
  Tag,
  Stack,
  Checkbox
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import { StorageService } from '../services/storage';
import { ValidationService } from '../services/validation';
import { useToast } from '../hooks/useToast';
import type { Theme, Token, TokenCollection, Dimension, Platform, Taxonomy } from '@token-model/data-model';

interface ThemesWorkflowProps {
  themes: Theme[];
  setThemes: (themes: Theme[]) => void;
}

export function ThemesWorkflow({ themes, setThemes }: ThemesWorkflowProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState({ name: '' });
  const toast = useToast();

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      setName(themes[index].displayName);
      setDescription(themes[index].description || '');
      setIsDefault(themes[index].isDefault || false);
    } else {
      setName('');
      setDescription('');
      setIsDefault(false);
    }
    setIsDialogOpen(true);
  };

  const handleClose = () => {
    setEditingIndex(null);
    setIsDialogOpen(false);
    setName('');
    setDescription('');
    setIsDefault(false);
    setErrors({ name: '' });
  };

  const handleSave = () => {
    if (!name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }

    const updatedThemes = [...themes];
    if (editingIndex !== null) {
      updatedThemes[editingIndex] = {
        ...updatedThemes[editingIndex],
        displayName: name,
        description: description || undefined,
        isDefault
      };
    } else {
      updatedThemes.push({
        id: `theme-${Date.now()}`,
        displayName: name,
        description: description || undefined,
        isDefault
      });
    }

    setThemes(updatedThemes);
    handleClose();
    toast({
      title: editingIndex !== null ? 'Theme updated' : 'Theme created',
      status: 'success'
    });
  };

  const handleDelete = (index: number) => {
    const updatedThemes = themes.filter((_, i) => i !== index);
    setThemes(updatedThemes);
    toast({
      title: 'Theme deleted',
      status: 'success'
    });
  };

  return (
    <Box>
      <VStack gap={4} align="stretch">
        {themes.map((theme, index) => (
          <HStack key={theme.id} justify="space-between" p={4} borderWidth={1} borderRadius="md">
            <VStack align="start" gap={1}>
              <Text fontWeight="bold">{theme.displayName}</Text>
              {theme.description && <Text color="gray.500">{theme.description}</Text>}
              {theme.isDefault && (
                <Box
                  as="span"
                  px={2}
                  py={1}
                  fontSize="sm"
                  borderRadius="md"
                  bg="green.100"
                  color="green.800"
                >
                  Default
                </Box>
              )}
            </VStack>
            <HStack>
              <IconButton
                aria-label="Edit theme"
                onClick={() => handleOpen(index)}
                variant="ghost"
              >
                <LuPencil />
              </IconButton>
              <IconButton
                aria-label="Delete theme"
                onClick={() => handleDelete(index)}
                variant="ghost"
                colorPalette="red"
              >
                <LuTrash2 />
              </IconButton>
            </HStack>
          </HStack>
        ))}

        <Button
          onClick={() => handleOpen()}
          variant="outline"
          alignSelf="start"
        >
          <LuPlus style={{ marginRight: '8px' }} />
          Add Theme
        </Button>
      </VStack>

      <Dialog.Root open={isDialogOpen} onOpenChange={(details) => setIsDialogOpen(details.open)}>
        <Dialog.Content>
          <Dialog.Header>{editingIndex !== null ? 'Edit Theme' : 'Create Theme'}</Dialog.Header>
          <Dialog.Body>
            <VStack gap={4}>
              <Field.Root invalid={!!errors.name}>
                <Field.Label>Name</Field.Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter theme name"
                />
                {errors.name && <Field.ErrorText>{errors.name}</Field.ErrorText>}
              </Field.Root>

              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter theme description"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Is Default</Field.Label>
                <Checkbox.Root
                  checked={isDefault}
                  onCheckedChange={(details) => setIsDefault(details.checked === true)}
                >
                  <Checkbox.Control />
                  <Checkbox.Label>Set as default theme</Checkbox.Label>
                </Checkbox.Root>
              </Field.Root>
            </VStack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" mr={3} onClick={handleClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSave}>
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
} 