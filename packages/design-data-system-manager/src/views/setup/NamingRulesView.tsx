import React from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Select,
  IconButton,
  useToast,
  Heading,
  Divider,
  useColorMode
} from '@chakra-ui/react';
import { LuGripVertical, LuTrash2, LuChevronUp, LuChevronDown } from 'react-icons/lu';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import type { Taxonomy } from '@token-model/data-model';
import { StorageService } from '../../services/storage';

interface NamingRulesViewProps {
  taxonomies: Taxonomy[];
  taxonomyOrder: string[];
  setTaxonomyOrder: (order: string[]) => void;
}

export function NamingRulesView({
  taxonomies,
  taxonomyOrder,
  setTaxonomyOrder
}: NamingRulesViewProps) {
  const { colorMode } = useColorMode();
  const toast = useToast();

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(taxonomyOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTaxonomyOrder(items);
    StorageService.setNamingRules({ taxonomyOrder: items });
  };

  const handleAddTaxonomy = (taxonomyId: string) => {
    if (taxonomyOrder.includes(taxonomyId)) {
      toast({
        title: 'Taxonomy already in order',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const newOrder = [...taxonomyOrder, taxonomyId];
    setTaxonomyOrder(newOrder);
    StorageService.setNamingRules({ taxonomyOrder: newOrder });
  };

  const handleRemoveTaxonomy = (taxonomyId: string) => {
    const newOrder = taxonomyOrder.filter(id => id !== taxonomyId);
    setTaxonomyOrder(newOrder);
    StorageService.setNamingRules({ taxonomyOrder: newOrder });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...taxonomyOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setTaxonomyOrder(newOrder);
    StorageService.setNamingRules({ taxonomyOrder: newOrder });
  };

  const handleMoveDown = (index: number) => {
    if (index === taxonomyOrder.length - 1) return;
    const newOrder = [...taxonomyOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setTaxonomyOrder(newOrder);
    StorageService.setNamingRules({ taxonomyOrder: newOrder });
  };

  const availableTaxonomies = taxonomies.filter(t => !taxonomyOrder.includes(t.id));

  // Defensive: Only render Draggables for IDs present in taxonomies
  const filteredOrder = taxonomyOrder.filter(id => taxonomies.some(t => t.id === id));

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Naming Rules</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Heading size="md" mb={2}>Taxonomy Order</Heading>
        <Text fontSize="sm" color="gray.600" mb={4}>
          Define the order of taxonomies in token names. This order determines how taxonomy terms appear in generated code syntax.
        </Text>
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel>Add Taxonomy to Order</FormLabel>
            <HStack>
              <Select
                placeholder="Select taxonomy"
                onChange={(e) => handleAddTaxonomy(e.target.value)}
                value=""
              >
                {availableTaxonomies.map((taxonomy) => (
                  <option key={taxonomy.id} value={taxonomy.id}>
                    {taxonomy.name}
                  </option>
                ))}
              </Select>
            </HStack>
          </FormControl>

          <Divider />

          <Box>
            <Text fontWeight="medium" mb={2}>Current Order</Text>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="taxonomy-order">
                {(provided: DroppableProvided) => (
                  <VStack
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    spacing={2}
                    align="stretch"
                  >
                    {filteredOrder.map((taxonomyId, index) => {
                      const taxonomy = taxonomies.find(t => t.id === taxonomyId);
                      if (!taxonomy) return null;

                      return (
                        <Draggable
                          key={taxonomyId}
                          draggableId={taxonomyId}
                          index={index}
                        >
                          {(provided: DraggableProvided, snapshot) => (
                            <HStack
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              p={3}
                              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                              borderRadius="md"
                              boxShadow={snapshot.isDragging ? "md" : "sm"}
                              border="1px"
                              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                              transition="all 0.2s"
                            >
                              <Box w="32px" textAlign="center" fontWeight="bold" color="gray.500">
                                {index + 1}
                              </Box>
                              <Box {...provided.dragHandleProps} cursor="grab">
                                <LuGripVertical />
                              </Box>
                              <Text flex={1}>{taxonomy.name}</Text>
                              <HStack spacing={1}>
                                <IconButton
                                  aria-label="Move up"
                                  icon={<LuChevronUp />}
                                  size="sm"
                                  variant="ghost"
                                  isDisabled={index === 0}
                                  onClick={() => handleMoveUp(index)}
                                />
                                <IconButton
                                  aria-label="Move down"
                                  icon={<LuChevronDown />}
                                  size="sm"
                                  variant="ghost"
                                  isDisabled={index === filteredOrder.length - 1}
                                  onClick={() => handleMoveDown(index)}
                                />
                                <IconButton
                                  aria-label="Remove taxonomy"
                                  icon={<LuTrash2 />}
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => handleRemoveTaxonomy(taxonomyId)}
                                />
                              </HStack>
                            </HStack>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </VStack>
                )}
              </Droppable>
            </DragDropContext>
          </Box>
        </VStack>
      </Box>
    </Box>
  );
} 