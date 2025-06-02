import React, { useState } from 'react';
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  IconButton,
  useToast,
  useColorMode,
  Tag,
  TagLabel,
  Wrap,
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import type { Dimension, Mode, Token, TokenCollection, Platform, Taxonomy } from '@token-model/data-model';
import { createUniqueId } from '../../utils/id';
import { ValidationService } from '../../services/validation';
import { DimensionsEditor } from '../../components/DimensionsEditor';

interface DimensionsTabProps {
  dimensions: Dimension[];
  setDimensions: (dims: Dimension[]) => void;
}

const resolvedValueTypes = [
  { id: 'COLOR', name: 'Color' },
  { id: 'DIMENSION', name: 'Dimension' },
  { id: 'FONT_FAMILY', name: 'Font Family' },
  { id: 'FONT_WEIGHT', name: 'Font Weight' },
  { id: 'FONT_STYLE', name: 'Font Style' },
  { id: 'DURATION', name: 'Duration' },
  { id: 'CUBIC_BEZIER', name: 'Cubic Bezier' },
  { id: 'BORDER_WIDTH', name: 'Border Width' },
  { id: 'CORNER_ROUNDING', name: 'Corner Rounding' },
  { id: 'ELEVATION', name: 'Elevation' },
  { id: 'SHADOW', name: 'Shadow' },
  { id: 'OPACITY', name: 'Opacity' },
  { id: 'NUMBER', name: 'Number' }
];

interface DimensionFormData {
  id: string;
  displayName: string;
  description: string;
  modes: Mode[];
  defaultMode: string;
  resolvedValueTypeIds: string[];
  required: boolean;
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
    resolvedValueTypeIds: [],
    required: false,
  });
  const [modeForm, setModeForm] = useState({ id: '', name: '', description: '' });
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
        resolvedValueTypeIds: dim.resolvedValueTypeIds || [],
        required: dim.required || false,
      });
    } else {
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
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIndex(null);
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
    if (!form.defaultMode || !form.modes.some((m: Mode) => m.id === form.defaultMode)) {
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
      defaultMode: form.defaultMode,
      resolvedValueTypeIds: form.resolvedValueTypeIds,
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
        description: result.errors?.map((e: { message: string }) => e.message).join('\n') || 'Your change would make the data invalid. See the Validation tab for details.',
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
      const m: Mode = form.modes[index];
      setModeForm({ id: m.id, name: m.name, description: m.description || '' });
    } else {
      setModeForm({ id: createUniqueId('mode'), name: '', description: '' });
    }
  };

  const handleModeDialogClose = () => {
    setModeEditIndex(null);
  };

  const handleModeFormChange = (field: keyof typeof modeForm, value: string) => {
    setModeForm((prev: typeof modeForm) => ({ ...prev, [field]: value }));
  };

  const handleModeSave = () => {
    if (!modeForm.id || !modeForm.name) return;
    const newModes: Mode[] = form.modes ? [...form.modes] : [];
    let newDefaultMode = form.defaultMode;
    if (modeEditIndex !== null) {
      newModes[modeEditIndex] = { ...modeForm, dimensionId: form.id! };
    } else {
      newModes.push({ ...modeForm, dimensionId: form.id! });
      if (newModes.length === 1) {
        newDefaultMode = newModes[0].id;
      }
    }
    setForm((prev: DimensionFormData) => ({ ...prev, modes: newModes, defaultMode: newDefaultMode }));
    setModeDialogClose();
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
    setForm((prev: DimensionFormData) => ({
      ...prev,
      resolvedValueTypeIds: [...(prev.resolvedValueTypeIds || []), valueTypeId],
    }));
  };

  const handleRemoveValueType = (valueTypeId: string) => {
    setForm((prev: DimensionFormData) => ({
      ...prev,
      resolvedValueTypeIds: (prev.resolvedValueTypeIds || []).filter((id: string) => id !== valueTypeId),
    }));
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
                  <Text fontSize="xs" color="gray.500">ID: {dim.id}</Text>
                  {Array.isArray(dim.resolvedValueTypeIds) && dim.resolvedValueTypeIds.length > 0 && (
                    <Wrap mt={2} spacing={2}>
                      {dim.resolvedValueTypeIds.map((typeId: string) => {
                        const type = resolvedValueTypes.find((t: { id: string }) => t.id === typeId);
                        return type ? (
                          <Tag key={typeId} size="md" borderRadius="full" variant="solid" colorScheme="blue">
                            <TagLabel>{type.name}</TagLabel>
                          </Tag>
                        ) : null;
                      })}
                    </Wrap>
                  )}
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
      <DimensionsEditor
        dimensions={dimensions}
        setDimensions={setDimensions}
        resolvedValueTypes={resolvedValueTypes}
        isOpen={open}
        onClose={handleClose}
        editingIndex={editingIndex}
      />
    </Box>
  );
} 