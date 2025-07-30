import React, { useState, useEffect } from 'react';
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
  Wrap
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil, LuGripVertical } from 'react-icons/lu';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Dimension, Mode, ResolvedValueType } from '@token-model/data-model';

import { DimensionsEditor } from '../../components/DimensionsEditor';
import { StorageService } from '../../services/storage';
import { CardTitle } from '../../components/CardTitle';

interface DimensionsViewProps {
  dimensions: Dimension[];
  setDimensions: (dimensions: Dimension[]) => void;
  canEdit?: boolean;
}

export function DimensionsView({ 
  dimensions, 
  setDimensions,
  canEdit = true
}: DimensionsViewProps) {
  const { colorMode } = useColorMode();
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dimensionOrder, setDimensionOrder] = useState<string[]>([]);
  const toast = useToast();

  // Get resolvedValueTypes from storage for validation
  const resolvedValueTypes = StorageService.getValueTypes();

  // Get dimensionOrder from storage and sync with state
  useEffect(() => {
    const storedOrder = StorageService.getDimensionOrder() || [];
    setDimensionOrder(storedOrder);
  }, []);

  // Initialize dimension order if not present
  useEffect(() => {
    if (!dimensionOrder || dimensionOrder.length === 0) {
      const initialOrder = dimensions.map(d => d.id);
      if (initialOrder.length > 0) {
        console.log('Initializing dimension order:', initialOrder);
        StorageService.setDimensionOrder(initialOrder);
        setDimensionOrder(initialOrder);
      }
    }
  }, [dimensions, dimensionOrder]);

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

    // Validate the new order - simple validation for dimension reordering
    const existingDimensionIds = new Set(dimensions.map(d => d.id));
    const invalidIds = newOrder.filter(id => !existingDimensionIds.has(id));
    
    if (invalidIds.length > 0) {
      console.log('Validation failed: Invalid dimension IDs:', invalidIds);
      toast({
        title: "Validation Error",
        description: `Invalid dimension IDs in order: ${invalidIds.join(', ')}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Update storage and local state
    StorageService.setDimensionOrder(newOrder);
    setDimensionOrder(newOrder);
    
    // Dispatch event to notify change detection system
    window.dispatchEvent(new CustomEvent('token-model:data-change'));
  };



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
    // Validate the changes - simple validation for dimension deletion
    const existingDimensionIds = new Set(newDims.map(d => d.id));
    const invalidIds = newOrder.filter(id => !existingDimensionIds.has(id));
    
    if (invalidIds.length > 0) {
      console.log('Validation failed: Invalid dimension IDs after deletion:', invalidIds);
      toast({
        title: 'Cannot Delete Dimension',
        description: `Invalid dimension IDs in order: ${invalidIds.join(', ')}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setDimensions(newDims);
    StorageService.setDimensionOrder(newOrder);
    setDimensionOrder(newOrder);
    
    // Dispatch event to notify change detection system
    window.dispatchEvent(new CustomEvent('token-model:data-change'));
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

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={2}>Dimensions</Text>
      <Text fontSize="sm" color="gray.600" mb={6}>Dimensions define mutually exclusive modes that share a common theme. Each dimension can have multiple modes, and tokens can have different values for each mode.</Text>

      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        {canEdit && (
          <Button size="sm" leftIcon={<LuPlus />} onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
            Add Dimension
          </Button>
        )}
        {canEdit ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="dimensions">
              {(provided) => (
                <VStack
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  align="stretch"
                  spacing={2}
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
                          opacity={snapshot.isDragging ? 0.8 : 1}
                        >
                          <HStack justify="space-between" align="center">
                            <HStack spacing={2}>
                              <Box w="32px" textAlign="center" fontWeight="bold" color="gray.500">
                                {i + 1}
                              </Box>
                              <Box {...provided.dragHandleProps} cursor="grab">
                                <LuGripVertical />
                              </Box>
                              <Box>
                                <CardTitle title={dim.displayName} cardType="dimension" />
                                <Text fontSize="sm" color="gray.600">Modes: {dim.modes.map((m: Mode) => m.name).join(', ')}</Text>
                                <Text fontSize="xs" color="gray.500">ID: {dim.id}</Text>
                                {Array.isArray(dim.resolvedValueTypeIds) && dim.resolvedValueTypeIds.length > 0 && (
                                  <Wrap mt={2} spacing={2}>
                                    {dim.resolvedValueTypeIds.map((typeId: string) => {
                                      const type = resolvedValueTypes.find((t: ResolvedValueType) => t.id === typeId);
                                      return type ? (
                                        <Tag key={typeId} size="md" borderRadius="full" variant="subtle" colorScheme="blue">
                                          <TagLabel>{type.displayName}</TagLabel>
                                        </Tag>
                                      ) : null;
                                    })}
                                  </Wrap>
                                )}
                              </Box>
                            </HStack>
                            <HStack>
                              <IconButton aria-label="Edit dimension" icon={<LuPencil />} size="sm" onClick={() => handleOpen(i)} />
                              <IconButton aria-label="Delete dimension" icon={<LuTrash2 />} size="sm" colorScheme="red" onClick={() => handleDelete(i)} />
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
        ) : (
          <VStack align="stretch" spacing={2}>
            {sortedDimensions.map((dim: Dimension, i: number) => (
              <Box
                key={dim.id}
                p={3}
                borderWidth={1}
                borderRadius="md"
                bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
              >
                <HStack justify="space-between" align="center">
                  <HStack spacing={2}>
                    <Box w="32px" textAlign="center" fontWeight="bold" color="gray.500">
                      {i + 1}
                    </Box>
                    <Box>
                      <CardTitle title={dim.displayName} cardType="dimension" />
                      <Text fontSize="sm" color="gray.600">Modes: {dim.modes.map((m: Mode) => m.name).join(', ')}</Text>
                      <Text fontSize="xs" color="gray.500">ID: {dim.id}</Text>
                      {Array.isArray(dim.resolvedValueTypeIds) && dim.resolvedValueTypeIds.length > 0 && (
                        <Wrap mt={2} spacing={2}>
                          {dim.resolvedValueTypeIds.map((typeId: string) => {
                            const type = resolvedValueTypes.find((t: ResolvedValueType) => t.id === typeId);
                            return type ? (
                              <Tag key={typeId} size="md" borderRadius="full" variant="subtle" colorScheme="blue">
                                <TagLabel>{type.displayName}</TagLabel>
                              </Tag>
                            ) : null;
                          })}
                        </Wrap>
                      )}
                    </Box>
                  </HStack>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
      <DimensionsEditor
        dimensions={dimensions}
        setDimensions={setDimensions}
        isOpen={open}
        onClose={handleClose}
        editingIndex={editingIndex}
      />
    </Box>
  );
} 