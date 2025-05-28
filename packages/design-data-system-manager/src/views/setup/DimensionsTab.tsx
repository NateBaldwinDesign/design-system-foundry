import React, { useState } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  FormControl,
  FormLabel,
  Select,
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
  useColorMode
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import type { Dimension, Mode, DimensionType, Token, TokenCollection, Platform, Taxonomy } from '@token-model/data-model';
import { createUniqueId } from '../../utils/id';
import { ValidationService } from '../../services/validation';

interface DimensionsTabProps {
  dimensions: Dimension[];
  setDimensions: (dims: Dimension[]) => void;
}

const DIMENSION_TYPES: DimensionType[] = [
  'COLOR_SCHEME',
  'CONTRAST',
  'DEVICE_TYPE',
  'BRAND',
  'THEME',
  'MOTION',
  'DENSITY'
];

interface DimensionFormData {
  id: string;
  displayName: string;
  description: string;
  modes: Mode[];
  defaultMode: string;
}

export function DimensionsTab({ dimensions, setDimensions }: DimensionsTabProps) {
  const { colorMode } = useColorMode();
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<DimensionFormData>({
    id: '',
    displayName: '',
    description: '',
    modes: [],
    defaultMode: '',
  });
  const [modeForm, setModeForm] = useState({ id: '', name: '', description: '' });
  const [modeDialogOpen, setModeDialogOpen] = useState(false);
  const [modeEditIndex, setModeEditIndex] = useState<number | null>(null);
  const toast = useToast();
  // Assume tokens, collections, platforms, and taxonomies are available via props or context (for this edit, use empty arrays as placeholders)
  const tokens: Token[] = [];
  const collections: TokenCollection[] = [];
  const platforms: Platform[] = [];
  const taxonomies: Taxonomy[] = [];

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      const dim = dimensions[index];
      setForm({
        id: dim.id,
        displayName: dim.displayName,
        description: dim.description || '',
        modes: dim.modes,
        defaultMode: dim.defaultMode || (dim.modes[0]?.id ?? ''),
      });
    } else {
      setForm({
        id: createUniqueId('dimension'),
        displayName: '',
        description: '',
        modes: [],
        defaultMode: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIndex(null);
  };

  const handleFormChange = (field: keyof DimensionFormData, value: string) => {
    setForm((prev: DimensionFormData) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.id || !form.displayName) {
      toast({ 
        title: 'Required Fields Missing', 
        description: 'ID and display name are required fields.',
        status: 'error', 
        duration: 4000,
        isClosable: true 
      });
      return;
    }
    if (!form.defaultMode || !form.modes.some(m => m.id === form.defaultMode)) {
      toast({ 
        title: 'Invalid Default Mode', 
        description: 'Please select a valid default mode from the available modes.',
        status: 'error', 
        duration: 4000,
        isClosable: true 
      });
      return;
    }
    const newDims = [...dimensions];
    const dimToSave = {
      ...form,
      modes: form.modes || [],
      required: true,
      defaultMode: form.defaultMode
    } as Dimension;
    if (editingIndex !== null) {
      newDims[editingIndex] = dimToSave;
    } else {
      newDims.push(dimToSave);
    }
    // Compose the full data object for validation
    const data = {
      tokenCollections: collections,
      dimensions: newDims,
      tokens,
      platforms,
      taxonomies,
      version: '1.0.0',
      versionHistory: []
    };
    const result = ValidationService.validateData(data);
    if (!result.isValid) {
      toast({
        title: 'Schema Validation Failed',
        description: result.errors?.map(e => e.message).join('\n') || 'Your change would make the data invalid. See the Validation tab for details.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setDimensions(newDims);
    setOpen(false);
    setEditingIndex(null);
    toast({ 
      title: 'Dimension Saved', 
      description: `Successfully ${editingIndex !== null ? 'updated' : 'created'} dimension "${form.displayName}"`,
      status: 'success', 
      duration: 3000,
      isClosable: true 
    });
  };

  const handleDelete = (index: number) => {
    const dimToDelete = dimensions[index];
    const newDims = dimensions.filter((_, i) => i !== index);
    const data = {
      tokenCollections: collections,
      dimensions: newDims,
      tokens,
      platforms,
      taxonomies,
      version: '1.0.0',
      versionHistory: []
    };
    const result = ValidationService.validateData(data);
    if (!result.isValid) {
      toast({
        title: 'Cannot Delete Dimension',
        description: result.errors?.map(e => e.message).join('\n') || 'This dimension cannot be deleted as it would make the data invalid. See the Validation tab for details.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setDimensions(newDims);
    toast({ 
      title: 'Dimension Deleted', 
      description: `Successfully deleted dimension "${dimToDelete.displayName}"`,
      status: 'info', 
      duration: 3000,
      isClosable: true 
    });
  };

  // Mode management for a dimension
  const handleModeDialogOpen = (index: number | null = null) => {
    setModeEditIndex(index);
    if (index !== null && form.modes) {
      const m = form.modes[index];
      setModeForm({ id: m.id, name: m.name, description: m.description || '' });
    } else {
      setModeForm({ id: createUniqueId('mode'), name: '', description: '' });
    }
    setModeDialogOpen(true);
  };

  const handleModeDialogClose = () => {
    setModeDialogOpen(false);
    setModeEditIndex(null);
  };

  const handleModeFormChange = (field: keyof typeof modeForm, value: string) => {
    setModeForm((prev: typeof modeForm) => ({ ...prev, [field]: value }));
  };

  const handleModeSave = () => {
    if (!modeForm.id || !modeForm.name) return;
    const newModes = form.modes ? [...form.modes] : [];
    let newDefaultMode = form.defaultMode;
    if (modeEditIndex !== null) {
      newModes[modeEditIndex] = { ...modeForm, dimensionId: form.id! };
    } else {
      newModes.push({ ...modeForm, dimensionId: form.id! });
      if (newModes.length === 1) {
        newDefaultMode = newModes[0].id;
      }
    }
    setForm(prev => ({ ...prev, modes: newModes, defaultMode: newDefaultMode }));
    setModeDialogOpen(false);
    setModeEditIndex(null);
  };

  const handleModeDelete = (index: number) => {
    setForm((prev: DimensionFormData) => {
      const newModes = (prev.modes || []).filter((_: Mode, i: number) => i !== index);
      let newDefault = prev.defaultMode;
      if (prev.modes[index]?.id === prev.defaultMode) {
        newDefault = newModes[0]?.id || '';
      }
      return { ...prev, modes: newModes, defaultMode: newDefault };
    });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Dimensions</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" leftIcon={<LuPlus />} onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
          Add Dimension
        </Button>
        <VStack align="stretch" spacing={2}>
          {dimensions.map((dim: Dimension, i: number) => (
            <Box 
              key={dim.id} 
              p={3} 
              borderWidth={1} 
              borderRadius="md" 
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <HStack justify="space-between" align="center">
                <Box>
                  <Text fontSize="lg" fontWeight="medium">{dim.displayName}</Text>
                  <Text fontSize="sm" color="gray.600">Modes: {dim.modes.map((m: Mode) => m.name).join(', ')}</Text>
                </Box>
                <HStack>
                  <IconButton aria-label="Edit dimension" icon={<LuPencil />} size="sm" onClick={() => handleOpen(i)} />
                  <IconButton aria-label="Delete dimension" icon={<LuTrash2 />} size="sm" colorScheme="red" onClick={() => handleDelete(i)} />
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>
      {/* Dimension Editor Modal */}
      <Modal isOpen={open} onClose={handleClose} size="lg">
        <ModalOverlay />
        <ModalContent bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
          <ModalHeader>{editingIndex !== null ? 'Edit Dimension' : 'Add Dimension'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Display Name</FormLabel>
                <Input
                  value={form.displayName}
                  onChange={e => handleFormChange('displayName', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={form.description}
                  onChange={e => handleFormChange('description', e.target.value)}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Type</FormLabel>
                <Select
                  value={form.id ? (dimensions.find(d => d.id === form.id)?.type || 'COLOR_SCHEME') : 'COLOR_SCHEME'}
                  onChange={() => {}}
                  isReadOnly
                >
                  {DIMENSION_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Default Mode</FormLabel>
                <Select
                  value={form.defaultMode}
                  onChange={e => handleFormChange('defaultMode', e.target.value)}
                >
                  <option value="">None</option>
                  {form.modes.map((mode: Mode) => (
                    <option key={mode.id} value={mode.id}>{mode.name}</option>
                  ))}
                </Select>
              </FormControl>
              <Box>
                <Text fontWeight="bold" mb={2}>Modes</Text>
                <Button leftIcon={<LuPlus />} size="sm" onClick={() => handleModeDialogOpen(null)} mb={2}>
                  Add Mode
                </Button>
                <VStack align="stretch" spacing={1}>
                  {form.modes.map((mode: Mode, idx: number) => (
                    <HStack key={mode.id}>
                      <Text>{mode.name}</Text>
                      <IconButton aria-label="Edit mode" icon={<LuPencil />} size="xs" onClick={() => handleModeDialogOpen(idx)} />
                      <IconButton aria-label="Delete mode" icon={<LuTrash2 />} size="xs" colorScheme="red" onClick={() => handleModeDelete(idx)} />
                    </HStack>
                  ))}
                </VStack>
              </Box>
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
      {/* Mode Editor Modal */}
      <Modal isOpen={modeDialogOpen} onClose={handleModeDialogClose} size="sm">
        <ModalOverlay />
        <ModalContent bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
          <ModalHeader>{modeEditIndex !== null ? 'Edit Mode' : 'Add Mode'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={modeForm.name}
                  onChange={e => handleModeFormChange('name', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={modeForm.description}
                  onChange={e => handleModeFormChange('description', e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleModeDialogClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleModeSave}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 