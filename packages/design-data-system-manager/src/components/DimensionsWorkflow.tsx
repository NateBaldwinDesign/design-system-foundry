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
import type { Dimension, Mode, DimensionType } from '@token-model/data-model';
import { createUniqueId } from '../utils/id';

interface DimensionsWorkflowProps {
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

export function DimensionsWorkflow({ dimensions, setDimensions }: DimensionsWorkflowProps) {
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
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.id || !form.displayName) return;
    if (!form.defaultMode || !form.modes.some(m => m.id === form.defaultMode)) {
      toast({ title: 'Please select a valid default mode.', status: 'error', duration: 2000 });
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
    setDimensions(newDims);
    setOpen(false);
    setEditingIndex(null);
    toast({ title: 'Dimension saved', status: 'success', duration: 2000 });
  };

  const handleDelete = (index: number) => {
    setDimensions(dimensions.filter((_, i) => i !== index));
    toast({ title: 'Dimension deleted', status: 'info', duration: 2000 });
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
    setModeForm(prev => ({ ...prev, [field]: value }));
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
    setForm(prev => {
      const newModes = (prev.modes || []).filter((_, i) => i !== index);
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
        <Button leftIcon={<LuPlus />} onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
          Add Dimension
        </Button>
        <VStack align="stretch" spacing={2}>
          {dimensions.map((dim, i) => (
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
                  <Text fontSize="sm" color="gray.600">Modes: {dim.modes.map(m => m.name).join(', ')}</Text>
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
                  {form.modes.map(mode => (
                    <option key={mode.id} value={mode.id}>{mode.name}</option>
                  ))}
                </Select>
              </FormControl>
              <Text fontSize="md" fontWeight="medium">Modes</Text>
              <VStack align="stretch" spacing={2}>
                {form.modes.map((mode, idx) => (
                  <HStack 
                    key={mode.id} 
                    justify="space-between" 
                    align="center" 
                    p={2} 
                    borderWidth={1} 
                    borderRadius="md" 
                    bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                  >
                    <Box>
                      <Text fontWeight="medium">{mode.name}</Text>
                      <Text fontSize="sm" color="gray.600">{mode.description}</Text>
                    </Box>
                    <HStack>
                      <IconButton aria-label="Edit mode" icon={<LuPencil />} size="sm" onClick={() => handleModeDialogOpen(idx)} />
                      <IconButton aria-label="Delete mode" icon={<LuTrash2 />} size="sm" colorScheme="red" onClick={() => handleModeDelete(idx)} />
                    </HStack>
                  </HStack>
                ))}
                <Button leftIcon={<LuPlus />} onClick={() => handleModeDialogOpen(null)} colorScheme="blue" size="sm">
                  Add Mode
                </Button>
              </VStack>
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
      <Modal isOpen={modeDialogOpen} onClose={handleModeDialogClose} size="md">
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