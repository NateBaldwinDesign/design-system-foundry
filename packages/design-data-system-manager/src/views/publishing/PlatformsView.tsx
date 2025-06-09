import React from 'react';
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  IconButton,
  Dialog,
  Field,
  Input
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import { useTheme } from 'next-themes';
import type { Platform, Token, Taxonomy } from '@token-model/data-model';
import { ValidationService } from '../../services/validation';
import { useToast } from '../../hooks/useToast';

export interface PlatformsViewProps {
  platforms: Platform[];
  setPlatforms: (platforms: Platform[]) => void;
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  taxonomies: Taxonomy[];
}

export const PlatformsView: React.FC<PlatformsViewProps> = ({
  platforms,
  setPlatforms,
  tokens,
  setTokens,
  taxonomies,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [open, setOpen] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<Platform>({
    id: '',
    displayName: '',
    description: '',
    syntaxPatterns: {
      capitalization: 'none'
    }
  });
  const toast = useToast();

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      setForm(platforms[index]);
    } else {
      setForm({
        id: '',
        displayName: '',
        description: '',
        syntaxPatterns: {
          capitalization: 'none'
        }
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIndex(null);
  };

  const handleFormChange = (field: keyof Platform, value: string | { platformId: string; formattedName: string }[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateAndSetPlatforms = (updatedPlatforms: Platform[]) => {
    const data = {
      platforms: updatedPlatforms,
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
        closable: true
      });
      return false;
    }
    setPlatforms(updatedPlatforms);
    return true;
  };

  const handleSave = () => {
    if (!form.displayName.trim()) {
      toast({
        title: 'Required Field Missing',
        description: 'Display name is required for platforms.',
        status: 'error',
        duration: 4000,
        closable: true
      });
      return;
    }
    const id = form.id || form.displayName.trim().replace(/\s+/g, '_').toLowerCase();
    if (!form.id && platforms.some(p => p.id === id)) {
      toast({
        title: 'Duplicate Platform',
        description: 'A platform with this name already exists. Please choose a different name.',
        status: 'error',
        duration: 4000,
        closable: true
      });
      return;
    }
    const newPlatforms = [...platforms];
    const platformToSave = {
      ...form,
      id
    };
    if (editingIndex !== null) {
      newPlatforms[editingIndex] = platformToSave;
    } else {
      newPlatforms.push(platformToSave);
    }
    if (!validateAndSetPlatforms(newPlatforms)) {
      return;
    }
    setOpen(false);
    setEditingIndex(null);
    toast({
      title: 'Platform Saved',
      description: `Successfully ${editingIndex !== null ? 'updated' : 'created'} platform "${form.displayName}"`,
      status: 'success',
      duration: 3000,
      closable: true
    });
  };

  const handleDelete = (index: number) => {
    const platformToDelete = platforms[index];
    const newPlatforms = platforms.filter((_, i) => i !== index);
    if (!validateAndSetPlatforms(newPlatforms)) {
      return;
    }
    toast({
      title: 'Platform Deleted',
      description: `Successfully deleted platform "${platformToDelete.displayName}"`,
      status: 'info',
      duration: 3000,
      closable: true
    });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Platforms</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={isDark ? 'gray.900' : 'white'}>
        <Button
          size="sm"
          onClick={() => handleOpen(null)}
          colorPalette="blue"
          mb={4}
        >
          <LuPlus style={{ marginRight: '0.5rem' }} />
          Add Platform
        </Button>
        <VStack gap={2} align="stretch">
          {platforms.map((platform, i) => (
            <Box
              key={platform.id}
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={isDark ? 'gray.800' : 'gray.50'}
              borderColor={isDark ? 'gray.600' : 'gray.200'}
            >
              <HStack justify="space-between" align="center">
                <Box>
                  <Text fontWeight="bold">{platform.displayName}</Text>
                  {platform.description && (
                    <Text fontSize="sm" color={isDark ? 'gray.400' : 'gray.600'}>
                      {platform.description}
                    </Text>
                  )}
                </Box>
                <HStack>
                  <IconButton
                    aria-label="Edit platform"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpen(i)}
                  >
                    <LuPencil />
                  </IconButton>
                  <IconButton
                    aria-label="Delete platform"
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
        <Dialog.Content bg={isDark ? 'gray.900' : 'white'}>
          <Dialog.Header>{editingIndex !== null ? 'Edit Platform' : 'Add Platform'}</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body>
            <VStack gap={4} align="stretch">
              <Field.Root required>
                <Field.Label>Display Name</Field.Label>
                <Input
                  value={form.displayName}
                  onChange={e => handleFormChange('displayName', e.target.value)}
                  bg={isDark ? 'gray.700' : 'white'}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Input
                  value={form.description || ''}
                  onChange={e => handleFormChange('description', e.target.value)}
                  bg={isDark ? 'gray.700' : 'white'}
                />
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
}; 