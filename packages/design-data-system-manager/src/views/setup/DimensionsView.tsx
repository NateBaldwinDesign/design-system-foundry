import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  VStack,
  HStack,
  IconButton,
  Tag,
  TagLabel,
  Wrap
} from '@chakra-ui/react';
import { useTheme } from 'next-themes';
import { LuPlus, LuTrash2, LuPencil, LuGripVertical } from 'react-icons/lu';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Dimension, Mode, ResolvedValueType } from '@token-model/data-model';
import { ValidationService } from '../../services/validation';
import { DimensionsEditor } from '../../components/DimensionsEditor';
import { StorageService } from '../../services/storage';
import { useToast } from '../../hooks/useToast';

interface DimensionsViewProps {
  dimensions: Dimension[];
  setDimensions: (dims: Dimension[]) => void;
  dimensionOrder: string[];
  setDimensionOrder: (order: string[]) => void;
  onDataChange?: (data: { dimensions: Dimension[], dimensionOrder: string[] }) => void;
}

export function DimensionsView({ 
  dimensions, 
  setDimensions, 
  dimensionOrder, 
  setDimensionOrder,
  onDataChange
}: DimensionsViewProps) {
  const { theme } = useTheme();
  const colorMode = theme === 'dark' ? 'dark' : 'light';
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const toast = useToast();

  // Get resolvedValueTypes from storage for validation
  const resolvedValueTypes = StorageService.getValueTypes();

  // Initialize dimension order if not present
  useEffect(() => {
    if (!dimensionOrder || dimensionOrder.length === 0) {
      const initialOrder = dimensions.map(d => d.id);
      if (typeof setDimensionOrder === 'function') {
        console.log('Initializing dimension order:', initialOrder);
        setDimensionOrder(initialOrder);
        StorageService.setDimensionOrder(initialOrder);
        if (onDataChange) {
          onDataChange({ dimensions, dimensionOrder: initialOrder });
        }
      } else {
        console.warn('setDimensionOrder is not a function, skipping initialization');
      }
    }
  }, [dimensions, dimensionOrder, setDimensionOrder, onDataChange]);

  // Save dimensions to localStorage whenever they change
  useEffect(() => {
    StorageService.setDimensions(dimensions);
  }, [dimensions]);

  const handleDragEnd = (result: DropResult) => {
    console.log('Drag end result:', result);
    console.log('Current dimensionOrder:', dimensionOrder);

    if (!result.destination || !dimensionOrder) {
      console.log('No destination or dimensionOrder is undefined');
      return;
    }

    // Create new order array
    const newOrder = Array.from(dimensionOrder);
    const [removed] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, removed);

    console.log('New order after drag:', newOrder);

    // Ensure all dimensions are included in the order
    const dimensionIds = new Set(dimensions.map(d => d.id));
    const currentOrderIds = new Set(newOrder);
    // Add any missing dimensions to the end
    dimensionIds.forEach(id => {
      if (!currentOrderIds.has(id)) {
        newOrder.push(id);
      }
    });

    // Validate the new order
    const validationData = {
      systemName: "Design System",
      systemId: "design-system",
      dimensions,
      dimensionOrder: newOrder,
      tokenCollections: [],
      tokens: [],
      platforms: [],
      taxonomies: [],
      resolvedValueTypes,
      version: "1.0.0",
      versionHistory: []
    };

    console.log('[ValidationService] Data being validated:', validationData);
    const validationResult = ValidationService.validateData(validationData);
    console.log('Validation result:', validationResult);

    if (!validationResult.isValid) {
      console.log('Validation failed:', validationResult.errors);
      const errorMessages = validationResult.errors?.map(error => 
        typeof error === 'string' ? error : String(error)
      ) || [];
      toast({
        title: "Validation Error",
        description: errorMessages.join('\n'),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Update state and notify parent
    setDimensionOrder(newOrder);
    if (onDataChange) {
      onDataChange({
        dimensions,
        dimensionOrder: newOrder
      });
    }
  };

  // Add effect to sync with localStorage
  useEffect(() => {
    const storedOrder = StorageService.getDimensionOrder();
    console.log('Initial dimension order from localStorage:', storedOrder);
    if (storedOrder && Array.isArray(storedOrder) && storedOrder.length > 0 && typeof setDimensionOrder === 'function') {
      console.log('Setting initial dimension order:', storedOrder);
      setDimensionOrder(storedOrder);
    }
  }, [setDimensionOrder]);

  // Add effect to log dimension order changes
  useEffect(() => {
    console.log('Dimension order changed:', dimensionOrder);
  }, [dimensionOrder]);

  // Add effect to log dimensions changes
  useEffect(() => {
    console.log('Dimensions changed:', dimensions);
  }, [dimensions]);

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    const dimToDelete = dimensions[index];
    const newDims = dimensions.filter((_, i) => i !== index);
    // Remove the deleted dimension from the order
    const newOrder = dimensionOrder.filter(id => id !== dimToDelete.id);
    // Validate the changes
    const validationData = {
      dimensions: newDims,
      dimensionOrder: newOrder,
      tokenCollections: [],
      tokens: [],
      platforms: [],
      taxonomies: [],
      resolvedValueTypes,
      version: '1.0.0',
      versionHistory: []
    };
    const validationResult = ValidationService.validateData(validationData);
    if (!validationResult.isValid) {
      toast({
        title: 'Cannot Delete Dimension',
        description: validationResult.errors?.join('\n'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setDimensions(newDims);
    if (typeof setDimensionOrder === 'function') {
      setDimensionOrder(newOrder);
      StorageService.setDimensionOrder(newOrder);
    }
    if (onDataChange) {
      onDataChange({ dimensions: newDims, dimensionOrder: newOrder });
    }
    toast({ 
      title: 'Dimension Deleted', 
      description: `Successfully deleted dimension "${dimToDelete.displayName}"`,
      status: 'info', 
      duration: 3000,
      isClosable: true 
    });
  };

  // Sort dimensions according to dimensionOrder
  const sortedDimensions = [...dimensions].sort((a, b) => {
    if (!dimensionOrder || dimensionOrder.length === 0) {
      console.log('No dimension order, using original order');
      return 0;
    }
    const indexA = dimensionOrder.indexOf(a.id);
    const indexB = dimensionOrder.indexOf(b.id);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  console.log('Sorted dimensions:', sortedDimensions);

  const handleSave = (dimension: Dimension) => {
    const newDims = [...dimensions];
    if (editingIndex !== null) {
      newDims[editingIndex] = dimension;
    } else {
      newDims.push(dimension);
    }
    setDimensions(newDims);
    handleClose();
    toast({
      title: editingIndex !== null ? 'Dimension Updated' : 'Dimension Created',
      description: `Successfully ${editingIndex !== null ? 'updated' : 'created'} dimension "${dimension.displayName}"`,
      status: 'success'
    });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Dimensions</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
          <LuPlus />
          Add Dimension
        </Button>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dimensions">
            {(provided) => (
              <VStack
                {...provided.droppableProps}
                ref={provided.innerRef}
                align="stretch"
                gap={2}
              >
                {sortedDimensions.map((dim: Dimension, i: number) => (
                  <Draggable key={dim.id} draggableId={dim.id} index={i}>
                    {(provided, snapshot) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        p={3}
                        borderWidth={1}
                        borderRadius="md"
                        bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                        boxShadow={snapshot.isDragging ? "md" : "sm"}
                        transition="all 0.2s"
                      >
                        <HStack justify="space-between" align="center">
                          <HStack gap={2}>
                            <Box w="32px" textAlign="center" fontWeight="bold" color="gray.500">
                              {i + 1}
                            </Box>
                            <Box {...provided.dragHandleProps} cursor="grab">
                              <LuGripVertical />
                            </Box>
                            <Box>
                              <Text fontSize="lg" fontWeight="medium">{dim.displayName}</Text>
                              <Text fontSize="sm" color="gray.600">Modes: {dim.modes.map((m: Mode) => m.name).join(', ')}</Text>
                              <Text fontSize="xs" color="gray.500">ID: {dim.id}</Text>
                              {Array.isArray(dim.resolvedValueTypeIds) && dim.resolvedValueTypeIds.length > 0 && (
                                <Wrap mt={2} gap={2}>
                                  {dim.resolvedValueTypeIds.map((typeId: string) => {
                                    const type = resolvedValueTypes.find((t: ResolvedValueType) => t.id === typeId);
                                    return type ? (
                                      <Box
                                        key={typeId}
                                        as="span"
                                        px={2}
                                        py={1}
                                        borderRadius="full"
                                        bg="blue.500"
                                        color="white"
                                        fontSize="sm"
                                      >
                                        {type.displayName}
                                      </Box>
                                    ) : null;
                                  })}
                                </Wrap>
                              )}
                            </Box>
                          </HStack>
                          <HStack>
                            <IconButton aria-label="Edit dimension" size="sm" onClick={() => handleOpen(i)}>
                              <LuPencil />
                            </IconButton>
                            <IconButton aria-label="Delete dimension" size="sm" colorScheme="red" onClick={() => handleDelete(i)}>
                              <LuTrash2 />
                            </IconButton>
                          </HStack>
                        </HStack>
                      </Box>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </VStack>
            )}
          </Droppable>
        </DragDropContext>
      </Box>
      <DimensionsEditor
        open={open}
        onClose={handleClose}
        onSave={handleSave}
        dimension={editingIndex !== null ? dimensions[editingIndex] : undefined}
        isNew={editingIndex === null}
      />
    </Box>
  );
} 