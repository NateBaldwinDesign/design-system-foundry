import React, { ChangeEvent } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Field,
  IconButton,
  Heading,
  createListCollection
} from '@chakra-ui/react';
import { Select } from '@chakra-ui/react';
import { useTheme } from 'next-themes';
import { LuGripVertical, LuTrash2, LuChevronUp, LuChevronDown } from 'react-icons/lu';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd';
import type { Taxonomy } from '@token-model/data-model';
import { StorageService } from '../../services/storage';
import { useToast } from '../../hooks/useToast';

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
  const { theme } = useTheme();
  const colorMode = theme === 'dark' ? 'dark' : 'light';
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
        closable: true,
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
        <VStack gap={4} align="stretch">
          <Field.Root>
            <Field.Label>Add Taxonomy to Order</Field.Label>
            <HStack>
              <Select.Root
                value={['']}
                onValueChange={(details) => {
                  const value = Array.isArray(details.value) ? details.value[0] : details.value;
                  if (value) handleAddTaxonomy(value);
                }}
                collection={createListCollection({
                  items: availableTaxonomies.map(taxonomy => ({
                    value: taxonomy.id,
                    label: taxonomy.name
                  }))
                })}
              >
                <Select.Trigger>
                  <Select.ValueText placeholder="Select taxonomy" />
                </Select.Trigger>
                <Select.Content>
                  {availableTaxonomies.map((taxonomy) => (
                    <Select.Item key={taxonomy.id} item={{ value: taxonomy.id, label: taxonomy.name }}>
                      {taxonomy.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </HStack>
          </Field.Root>

          <Box>
            <Text fontWeight="medium" mb={2}>Current Order</Text>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="taxonomy-order">
                {(provided: DroppableProvided) => (
                  <VStack
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    gap={2}
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
                              <HStack gap={1}>
                                <IconButton
                                  aria-label="Move up"
                                  size="sm"
                                  variant="ghost"
                                  disabled={index === 0}
                                  onClick={() => handleMoveUp(index)}
                                >
                                  <LuChevronUp />
                                </IconButton>
                                <IconButton
                                  aria-label="Move down"
                                  size="sm"
                                  variant="ghost"
                                  disabled={index === filteredOrder.length - 1}
                                  onClick={() => handleMoveDown(index)}
                                >
                                  <LuChevronDown />
                                </IconButton>
                                <IconButton
                                  aria-label="Remove taxonomy"
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={() => handleRemoveTaxonomy(taxonomyId)}
                                >
                                  <LuTrash2 />
                                </IconButton>
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