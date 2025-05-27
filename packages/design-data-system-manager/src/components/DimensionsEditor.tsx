import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Input,
  Button,
  IconButton,
  VStack,
  HStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  useDisclosure
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon, EditIcon } from '@chakra-ui/icons';
import type { Dimension, Mode } from '@token-model/data-model';
import { createUniqueId } from '../utils/id';

interface DimensionsEditorProps {
  dimensions: Dimension[];
  onChange: (dimensions: Dimension[]) => void;
}

export function DimensionsEditor({ dimensions, onChange }: DimensionsEditorProps) {
  const [editedDimensions, setEditedDimensions] = useState<Dimension[]>(dimensions);
  const [editingDimension, setEditingDimension] = useState<Dimension | null>(null);
  const [editingMode, setEditingMode] = useState<{ dimensionId: string; mode: Mode } | null>(null);
  const [isNewDimension, setIsNewDimension] = useState(false);
  const [isNewMode, setIsNewMode] = useState(false);
  const { isOpen: isDimensionModalOpen, onOpen: onDimensionModalOpen, onClose: onDimensionModalClose } = useDisclosure();
  const { isOpen: isModeModalOpen, onOpen: onModeModalOpen, onClose: onModeModalClose } = useDisclosure();

  useEffect(() => {
    onChange(editedDimensions);
  }, [editedDimensions, onChange]);

  useEffect(() => {
    if (editingDimension && isNewDimension && !editingDimension.id) {
      setEditingDimension(prev => prev ? { ...prev, id: createUniqueId('dimension') } : null);
    }
  }, [editingDimension, isNewDimension]);

  const handleAddDimension = () => {
    const newDimension: Dimension = {
      id: createUniqueId('dimension'),
      type: 'COLOR_SCHEME',
      displayName: '',
      description: '',
      modes: [],
      defaultMode: '',
      required: false
    };
    setEditingDimension(newDimension);
    setIsNewDimension(true);
    onDimensionModalOpen();
  };

  const handleAddMode = (dimensionId: string) => {
    const newMode: Mode = {
      id: createUniqueId('mode'),
      name: '',
      dimensionId,
      description: ''
    };
    setEditingMode({ dimensionId, mode: newMode });
    setIsNewMode(true);
    onModeModalOpen();
  };

  const handleDeleteDimension = (dimensionId: string) => {
    setEditedDimensions(prev => prev.filter(d => d.id !== dimensionId));
  };

  const handleDeleteMode = (dimensionId: string, modeId: string) => {
    setEditedDimensions(prev =>
      prev.map(dim => {
        if (dim.id !== dimensionId) return dim;
        const updatedModes = dim.modes.filter(m => m.id !== modeId);
        return {
          ...dim,
          modes: updatedModes,
          defaultMode: dim.defaultMode === modeId ? updatedModes[0]?.id || '' : dim.defaultMode
        };
      })
    );
  };

  const handleSaveDimension = () => {
    if (!editingDimension) return;

    if (isNewDimension) {
      setEditedDimensions(prev => [...prev, editingDimension]);
    } else {
      setEditedDimensions(prev =>
        prev.map(d => (d.id === editingDimension.id ? editingDimension : d))
      );
    }
    setEditingDimension(null);
    setIsNewDimension(false);
    onDimensionModalClose();
  };

  const handleSaveMode = () => {
    if (!editingMode) return;

    setEditedDimensions(prev =>
      prev.map(dim => {
        if (dim.id !== editingMode.dimensionId) return dim;

        const updatedModes = isNewMode
          ? [...dim.modes, editingMode.mode]
          : dim.modes.map(m => (m.id === editingMode.mode.id ? editingMode.mode : m));

        const defaultMode = dim.defaultMode && updatedModes.some(m => m.id === dim.defaultMode)
          ? dim.defaultMode
          : updatedModes[0]?.id || '';

        return {
          ...dim,
          modes: updatedModes,
          defaultMode
        };
      })
    );

    setEditingMode(null);
    setIsNewMode(false);
    onModeModalClose();
  };

  return (
    <Box>
      <HStack justify="space-between" align="center" mb={4}>
        <Text fontSize="xl" fontWeight="bold">Dimensions</Text>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={handleAddDimension}
        >
          Add Dimension
        </Button>
      </HStack>

      <VStack spacing={4} align="stretch">
        {editedDimensions.map(dimension => (
          <Box
            key={dimension.id}
            p={4}
            borderWidth={1}
            borderRadius="md"
            bg="white"
          >
            <HStack justify="space-between" align="start" mb={4}>
              <Box flex={1}>
                <Text fontSize="lg" fontWeight="medium">{dimension.displayName}</Text>
                <Text fontSize="sm" color="gray.600">{dimension.description}</Text>
                <Text fontSize="xs" color="gray.500">ID: {dimension.id}</Text>
              </Box>
              <HStack>
                <IconButton
                  aria-label="Edit dimension"
                  icon={<EditIcon />}
                  size="sm"
                  onClick={() => {
                    setEditingDimension(dimension);
                    setIsNewDimension(false);
                    onDimensionModalOpen();
                  }}
                />
                <IconButton
                  aria-label="Delete dimension"
                  icon={<DeleteIcon />}
                  size="sm"
                  colorScheme="red"
                  onClick={() => handleDeleteDimension(dimension.id)}
                />
              </HStack>
            </HStack>

            <Box>
              <HStack justify="space-between" align="center" mb={2}>
                <Text fontSize="md" fontWeight="medium">Modes</Text>
                <Button
                  size="sm"
                  leftIcon={<AddIcon />}
                  onClick={() => handleAddMode(dimension.id)}
                >
                  Add Mode
                </Button>
              </HStack>
              <VStack spacing={2} align="stretch">
                {dimension.modes.map(mode => (
                  <HStack
                    key={mode.id}
                    p={2}
                    borderWidth={1}
                    borderRadius="md"
                    justify="space-between"
                  >
                    <Box>
                      <Text fontWeight="medium">{mode.name}</Text>
                      <Text fontSize="sm" color="gray.600">{mode.description}</Text>
                      <Text fontSize="xs" color="gray.500">ID: {mode.id}</Text>
                    </Box>
                    <HStack>
                      <IconButton
                        aria-label="Edit mode"
                        icon={<EditIcon />}
                        size="sm"
                        onClick={() => {
                          setEditingMode({ dimensionId: dimension.id, mode });
                          setIsNewMode(false);
                          onModeModalOpen();
                        }}
                      />
                      <IconButton
                        aria-label="Delete mode"
                        icon={<DeleteIcon />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDeleteMode(dimension.id, mode.id)}
                      />
                    </HStack>
                  </HStack>
                ))}
              </VStack>
            </Box>
          </Box>
        ))}
      </VStack>

      {/* Dimension Editor Modal */}
      <Modal isOpen={isDimensionModalOpen} onClose={onDimensionModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isNewDimension ? 'Add Dimension' : 'Edit Dimension'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Dimension ID</FormLabel>
                <Input
                  value={editingDimension?.id || ''}
                  isReadOnly
                />
              </FormControl>
              <FormControl>
                <FormLabel>Display Name</FormLabel>
                <Input
                  value={editingDimension?.displayName || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingDimension(prev => prev ? { ...prev, displayName: e.target.value } : null)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={editingDimension?.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingDimension(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Type</FormLabel>
                <Select
                  value={editingDimension?.type || 'COLOR_SCHEME'}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditingDimension(prev => prev ? { ...prev, type: e.target.value as Dimension['type'] } : null)}
                >
                  <option value="COLOR_SCHEME">Color Scheme</option>
                  <option value="CONTRAST">Contrast</option>
                  <option value="DEVICE_TYPE">Device Type</option>
                  <option value="BRAND">Brand</option>
                  <option value="THEME">Theme</option>
                  <option value="MOTION">Motion</option>
                  <option value="DENSITY">Density</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Default Mode</FormLabel>
                <Select
                  value={editingDimension?.defaultMode || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditingDimension(prev => prev ? { ...prev, defaultMode: e.target.value } : null)}
                >
                  <option value="">None</option>
                  {editingDimension?.modes.map(mode => (
                    <option key={mode.id} value={mode.id}>{mode.name}</option>
                  ))}
                </Select>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onDimensionModalClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveDimension}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Mode Editor Modal */}
      <Modal isOpen={isModeModalOpen} onClose={onModeModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{isNewMode ? 'Add Mode' : 'Edit Mode'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel>Mode ID</FormLabel>
                <Input
                  value={editingMode?.mode.id || ''}
                  isReadOnly
                />
              </FormControl>
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={editingMode?.mode.name || ''}
                  onChange={e => setEditingMode(prev => prev ? { ...prev, mode: { ...prev.mode, name: e.target.value } } : null)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={editingMode?.mode.description || ''}
                  onChange={e => setEditingMode(prev => prev ? { ...prev, mode: { ...prev.mode, description: e.target.value } } : null)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onModeModalClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveMode}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 