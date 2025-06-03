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
  useColorMode,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  Switch
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import type { Dimension, Mode, ResolvedValueType } from '@token-model/data-model';
import { ValidationService } from '../services/validation';
import { createUniqueId } from '../utils/id';
import { StorageService } from '../services/storage';

interface DimensionsEditorProps {
  dimensions: Dimension[];
  setDimensions: (dims: Dimension[]) => void;
  isOpen: boolean;
  onClose: () => void;
  editingIndex: number | null;
}

interface DimensionFormData {
  id: string;
  displayName: string;
  description: string;
  modes: Mode[];
  defaultMode: string;
  resolvedValueTypeIds: string[];
  required: boolean;
}

export function DimensionsEditor({
  dimensions,
  setDimensions,
  isOpen,
  onClose,
  editingIndex
}: DimensionsEditorProps) {
  const { colorMode } = useColorMode();
  const [form, setForm] = useState<DimensionFormData>({
    id: '',
    displayName: '',
    description: '',
    modes: [],
    defaultMode: '',
    resolvedValueTypeIds: [],
    required: false,
  });
  const [modeForm, setModeForm] = useState({ id: '', name: '', description: '' });
  const [modeDialogOpen, setModeDialogOpen] = useState(false);
  const [modeEditIndex, setModeEditIndex] = useState<number | null>(null);
  const toast = useToast();

  // Use StorageService to get value types from local storage
  const resolvedValueTypes: ResolvedValueType[] = StorageService.getValueTypes() || [];

  React.useEffect(() => {
    if (editingIndex !== null && dimensions[editingIndex]) {
      const dim = dimensions[editingIndex];
      console.log('[DimensionsEditor] Editing existing dimension:', dim);
      setForm({
        id: dim.id,
        displayName: dim.displayName,
        description: dim.description || '',
        modes: dim.modes,
        defaultMode: dim.defaultMode || (dim.modes[0]?.id ?? ''),
        resolvedValueTypeIds: dim.resolvedValueTypeIds || [],
        required: dim.required || false,
      });
    } else {
      console.log('[DimensionsEditor] Creating new dimension');
      setForm({
        id: createUniqueId('dimension'),
        displayName: '',
        description: '',
        modes: [],
        defaultMode: '',
        resolvedValueTypeIds: [],
        required: false,
      });
    }
  }, [editingIndex, dimensions, isOpen]);

  const handleFormChange = (field: keyof DimensionFormData, value: string) => {
    console.log(`[DimensionsEditor] Form field "${field}" changed to:`, value);
    setForm((prev: DimensionFormData) => ({ ...prev, [field]: value }));
  };

  const handleModeDialogOpen = (index: number | null = null) => {
    console.log('[DimensionsEditor] Opening mode dialog for index:', index);
    setModeEditIndex(index);
    if (index !== null && form.modes) {
      const m = form.modes[index];
      console.log('[DimensionsEditor] Editing existing mode:', m);
      setModeForm({ id: m.id, name: m.name, description: m.description || '' });
    } else {
      console.log('[DimensionsEditor] Creating new mode');
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
    console.log('[DimensionsEditor] Saving mode:', modeForm);
    if (!modeForm.id || !modeForm.name) {
      console.error('[DimensionsEditor] Mode validation failed: Missing id or name');
      return;
    }
    const newModes = form.modes ? [...form.modes] : [];
    let newDefaultMode = form.defaultMode;
    if (modeEditIndex !== null) {
      console.log('[DimensionsEditor] Updating existing mode at index:', modeEditIndex);
      newModes[modeEditIndex] = { ...modeForm, dimensionId: form.id! };
    } else {
      console.log('[DimensionsEditor] Adding new mode');
      newModes.push({ ...modeForm, dimensionId: form.id! });
      if (newModes.length === 1) {
        newDefaultMode = newModes[0].id;
        console.log('[DimensionsEditor] Setting first mode as default:', newDefaultMode);
      }
    }
    setForm((prev: DimensionFormData) => ({ ...prev, modes: newModes, defaultMode: newDefaultMode }));
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

  const handleAddValueType = (valueTypeId: string) => {
    console.log('[DimensionsEditor] Adding value type:', valueTypeId);
    setForm((prev: DimensionFormData) => ({
      ...prev,
      resolvedValueTypeIds: [...(prev.resolvedValueTypeIds || []), valueTypeId],
    }));
  };

  const handleRemoveValueType = (valueTypeId: string) => {
    console.log('[DimensionsEditor] Removing value type:', valueTypeId);
    setForm((prev: DimensionFormData) => ({
      ...prev,
      resolvedValueTypeIds: (prev.resolvedValueTypeIds || []).filter((id: string) => id !== valueTypeId),
    }));
  };

  const handleSave = () => {
    console.log('[DimensionsEditor] Starting save process with form data:', form);
    
    // Validation for required fields
    if (!form.id || !form.displayName) {
      console.error('[DimensionsEditor] Validation failed: Missing id or displayName', form);
      toast({ 
        title: 'Required Fields Missing', 
        description: 'ID and display name are required fields.',
        status: 'error', 
        duration: 4000,
        isClosable: true 
      });
      return;
    }

    if (!form.modes || form.modes.length === 0) {
      console.error('[DimensionsEditor] Validation failed: No modes', form);
      toast({
        title: 'At least one mode required',
        description: 'You must add at least one mode to the dimension.',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
      return;
    }

    if (!form.defaultMode || !form.modes.some((m: Mode) => m.id === form.defaultMode)) {
      console.error('[DimensionsEditor] Validation failed: Invalid defaultMode', form);
      toast({ 
        title: 'Invalid Default Mode', 
        description: 'Please select a valid default mode from the available modes.',
        status: 'error', 
        duration: 4000,
        isClosable: true 
      });
      return;
    }

    if (typeof form.required !== 'boolean') {
      console.error('[DimensionsEditor] Validation failed: required is not boolean', form);
      toast({
        title: 'Required Field Missing',
        description: 'The "Required" field must be set.',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
      return;
    }

    // Validate each mode
    for (const mode of form.modes) {
      if (!mode.id || !mode.name || !mode.dimensionId) {
        console.error('[DimensionsEditor] Validation failed: Mode missing required fields', mode);
        toast({
          title: 'Invalid Mode',
          description: 'Each mode must have an id, name, and dimensionId.',
          status: 'error',
          duration: 4000,
          isClosable: true
        });
        return;
      }
    }

    // If all validations pass, save
    const newDims = [...dimensions];
    const dimToSave = {
      ...form,
      modes: form.modes || [],
      required: form.required,
      defaultMode: form.defaultMode,
      resolvedValueTypeIds: form.resolvedValueTypeIds,
    } as Dimension;
    console.log('[DimensionsEditor] Prepared dimension to save:', dimToSave);

    if (editingIndex !== null) {
      console.log('[DimensionsEditor] Updating existing dimension at index:', editingIndex);
      newDims[editingIndex] = dimToSave;
    } else {
      console.log('[DimensionsEditor] Adding new dimension');
      newDims.push(dimToSave);
    }

    // Get existing data from storage for validation
    const existingData = localStorage.getItem('tokenSystem');
    console.log('[DimensionsEditor] Existing data from storage:', existingData);
    
    const systemData = existingData ? JSON.parse(existingData) : {
      systemName: 'Design System',
      systemId: 'design-system',
      description: 'Design system for validation',
      tokenCollections: [],
      tokens: [],
      platforms: [],
      taxonomies: [],
      resolvedValueTypes: [],
      version: '1.0.0',
      versionHistory: []
    };

    // Compose validation data with existing system data and updated dimensions
    const validationData = {
      ...systemData,
      dimensions: newDims,
      resolvedValueTypes
    };
    console.log('[DimensionsEditor] Validation data:', validationData);

    // Call the ValidationService for schema validation
    if (typeof ValidationService !== 'undefined' && typeof ValidationService.validateData === 'function') {
      console.log('[DimensionsEditor] Calling ValidationService');
      const result = ValidationService.validateData(validationData);
      console.log('[DimensionsEditor] Validation result:', result);
      
      if (!result.isValid) {
        console.error('[DimensionsEditor] Schema validation failed:', result.errors);
        toast({
          title: 'Schema Validation Failed',
          description: result.errors?.map(e => e.message).join(', ') || 'See console for details.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    }

    setDimensions(newDims);
    onClose();
    toast({ 
      title: 'Dimension Saved', 
      description: `Successfully ${editingIndex !== null ? 'updated' : 'created'} dimension "${form.displayName}"`,
      status: 'success', 
      duration: 3000,
      isClosable: true 
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <ModalHeader>{editingIndex !== null ? 'Edit Dimension' : 'Add Dimension'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isRequired>
              <FormLabel>ID</FormLabel>
              <Input
                value={form.id}
                isReadOnly
              />
            </FormControl>
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
            <FormControl isRequired display="flex" alignItems="center">
              <FormLabel mb="0">Required</FormLabel>
              <Switch
                isChecked={form.required || false}
                onChange={e => setForm((prev: DimensionFormData) => ({ ...prev, required: e.target.checked }))}
              />
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
              <Text fontWeight="bold" mb={2}>Modes <span style={{color: 'red'}}>*</span></Text>
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
            <FormControl>
              <FormLabel>Value Types</FormLabel>
              <Select
                value=""
                onChange={e => {
                  if (e.target.value) {
                    handleAddValueType(e.target.value);
                  }
                }}
              >
                <option value="">Add a value type...</option>
                {resolvedValueTypes
                  .filter(type => !form.resolvedValueTypeIds.includes(type.id))
                  .map(type => (
                    <option key={type.id} value={type.id}>{type.displayName}</option>
                  ))}
              </Select>
              <Wrap mt={2} spacing={2}>
                {form.resolvedValueTypeIds.map((typeId: string) => {
                  const type = resolvedValueTypes.find(t => t.id === typeId);
                  return type ? (
                    <Tag key={typeId} size="md" borderRadius="full" variant="solid" colorScheme="blue">
                      <TagLabel>{type.displayName}</TagLabel>
                      <TagCloseButton onClick={() => handleRemoveValueType(typeId)} />
                    </Tag>
                  ) : null;
                })}
              </Wrap>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
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
    </Modal>
  );
} 