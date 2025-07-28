import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  IconButton,
  useToast,
  useColorMode,
  Tag,
  TagLabel,
  Wrap
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil, LuGripVertical } from 'react-icons/lu';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Taxonomy, Token, TokenCollection, Dimension, Platform, ResolvedValueType } from '@token-model/data-model';
import { createUniqueId } from '../../utils/id';
import { ValidationService } from '../../services/validation';
import { TaxonomyEditorDialog } from '../../components/TaxonomyEditorDialog';
import { TermEditorDialog } from '../../components/TermEditorDialog';
import { CardTitle } from '../../components/CardTitle';
import { StorageService } from '../../services/storage';

interface TaxonomyViewProps {
  taxonomies: Taxonomy[];
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
  tokens: Token[];
  collections: TokenCollection[];
  dimensions: Dimension[];
  platforms: Platform[];
  resolvedValueTypes: ResolvedValueType[];
}

function normalizeTerms(terms: { id: string; name: string; description?: string }[]): { id: string; name: string; description: string }[] {
  return terms.map((term: { id: string; name: string; description?: string }) => ({
    ...term,
    description: typeof term.description === 'string' ? term.description : ''
  }));
}

export function TaxonomyView({ 
  taxonomies, 
  setTaxonomies, 
  tokens, 
  collections, 
  dimensions, 
  platforms, 
  resolvedValueTypes 
}: TaxonomyViewProps) {
  const { colorMode } = useColorMode();
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState({
    id: '',
    name: '',
    description: '',
    terms: normalizeTerms([]),
    resolvedValueTypeIds: [] as string[],
  });
  const [termForm, setTermForm] = useState({ id: '', name: '', description: '' });
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [termEditIndex, setTermEditIndex] = useState<number | null>(null);
  const [taxonomyOrder, setTaxonomyOrder] = useState<string[]>([]);
  const toast = useToast();

  // Get taxonomyOrder from storage and sync with state
  useEffect(() => {
    const storedOrder = StorageService.getTaxonomyOrder() || [];
    setTaxonomyOrder(storedOrder);
  }, []);

  // Initialize taxonomy order if not present
  useEffect(() => {
    if (!taxonomyOrder || taxonomyOrder.length === 0) {
      const initialOrder = taxonomies.map(t => t.id);
      if (initialOrder.length > 0) {
        console.log('Initializing taxonomy order:', initialOrder);
        StorageService.setTaxonomyOrder(initialOrder);
        setTaxonomyOrder(initialOrder);
      }
    }
  }, [taxonomies, taxonomyOrder]);

  // Save taxonomies to localStorage whenever they change
  useEffect(() => {
    StorageService.setTaxonomies(taxonomies);
  }, [taxonomies]);

  const handleDragEnd = (result: DropResult) => {
    console.log('Drag end result:', result);
    console.log('Current taxonomyOrder:', taxonomyOrder);

    if (!result.destination || !taxonomyOrder) {
      console.log('No destination or taxonomyOrder is undefined');
      return;
    }

    // Create new order array
    const newOrder = Array.from(taxonomyOrder);
    const [removed] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, removed);

    console.log('New order after drag:', newOrder);

    // Ensure all taxonomies are included in the order
    const taxonomyIds = new Set(taxonomies.map(t => t.id));
    const currentOrderIds = new Set(newOrder);
    // Add any missing taxonomies to the end
    taxonomyIds.forEach(id => {
      if (!currentOrderIds.has(id)) {
        newOrder.push(id);
      }
    });

    // Validate the new order - simple validation for taxonomy reordering
    const existingTaxonomyIds = new Set(taxonomies.map(t => t.id));
    const invalidIds = newOrder.filter(id => !existingTaxonomyIds.has(id));
    
    if (invalidIds.length > 0) {
      console.log('Validation failed: Invalid taxonomy IDs:', invalidIds);
      toast({
        title: "Validation Error",
        description: `Invalid taxonomy IDs in order: ${invalidIds.join(', ')}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Update storage and local state
    StorageService.setTaxonomyOrder(newOrder);
    setTaxonomyOrder(newOrder);
    
    // Dispatch event to notify change detection system
    window.dispatchEvent(new CustomEvent('token-model:data-change'));
  };

  // Add effect to sync with localStorage
  useEffect(() => {
    const storedOrder = StorageService.getTaxonomyOrder();
    console.log('Initial taxonomy order from localStorage:', storedOrder);
  }, []);

  // Add effect to log taxonomy order changes
  useEffect(() => {
    console.log('Taxonomy order changed:', taxonomyOrder);
  }, [taxonomyOrder]);

  // Add effect to log taxonomies changes
  useEffect(() => {
    console.log('Taxonomies changed:', taxonomies);
  }, [taxonomies]);

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      const taxonomy = taxonomies[index] as Taxonomy;
      setForm({
        id: taxonomy.id,
        name: taxonomy.name,
        description: taxonomy.description || '',
        terms: normalizeTerms(taxonomy.terms || []),
        resolvedValueTypeIds: Array.isArray(taxonomy.resolvedValueTypeIds) ? taxonomy.resolvedValueTypeIds : [],
      });
    } else {
      setForm({
        id: createUniqueId('taxonomy'),
        name: '',
        description: '',
        terms: normalizeTerms([]),
        resolvedValueTypeIds: [],
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIndex(null);
  };

  const handleFormChange = (field: string, value: string | string[] | { id: string; name: string; description?: string }[]) => {
    setForm((prev: typeof form) => {
      if (field === 'terms') {
        return { ...prev, terms: normalizeTerms(value as { id: string; name: string; description?: string }[]) };
      }
      if (field === 'resolvedValueTypeIds') {
        return { ...prev, resolvedValueTypeIds: value as string[] };
      }
      return { ...prev, [field]: value };
    });
  };

  const validateAndSetTaxonomies = async (taxonomies: Taxonomy[]) => {
    try {
      // Get root-level data from localStorage
      const root = JSON.parse(localStorage.getItem('token-model:root') || '{}');
      const {
        systemName = 'Design System',
        systemId = 'design-system',
        version = '1.0.0',
        versionHistory = []
      } = root;

      const data = {
        systemName,
        systemId,
        tokenCollections: collections,
        dimensions,
        tokens,
        platforms,
        taxonomies,
        resolvedValueTypes: resolvedValueTypes,
        version,
        versionHistory
      };

      console.log('[TaxonomyView] Validation data:', JSON.stringify(data, null, 2));
      const result = ValidationService.validateData(data);
      console.log('[TaxonomyView] Validation result:', result);
      if (!result.isValid) {
        console.error('[TaxonomyView] Validation errors:', result.errors);
        toast({
          title: "Validation Error",
          description: `Schema Validation Failed: ${Array.isArray(result.errors) ? result.errors.join(', ') : 'See console for details.'}`,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      // Persist to local storage
      localStorage.setItem('token-model:taxonomies', JSON.stringify(taxonomies));
      setTaxonomies(taxonomies);
    } catch (error) {
      console.error('[TaxonomyView] Validation error:', error);
      toast({
        title: 'Validation Error',
        description: 'An error occurred while validating the data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSave = () => {
    // Ensure taxonomy has an id
    const taxonomyId = form.id && form.id.trim() ? form.id : createUniqueId('taxonomy');
    if (!form.name.trim()) {
      toast({ title: 'Name is required', status: 'error', duration: 2000 });
      return;
    }
    // Ensure all terms have id and name, and generate id if missing
    const termsWithIds = (form.terms || []).map((term: { id: string; name: string; description?: string }) => ({
      ...term,
      id: term.id && term.id.trim() ? term.id : createUniqueId('term'),
      name: term.name && term.name.trim() ? term.name : ''
    }));
    // Check for missing term names
    if (termsWithIds.some((term: { name: string }) => !term.name.trim())) {
      toast({ title: 'All terms must have a name', status: 'error', duration: 2000 });
      return;
    }
    // Check for duplicate term ids
    const termIds = termsWithIds.map((t: { id: string }) => t.id);
    if (new Set(termIds).size !== termIds.length) {
      toast({ title: 'Term IDs must be unique', status: 'error', duration: 2000 });
      return;
    }
    // Check for duplicate term names
    const termNames = termsWithIds.map((t: { name: string }) => t.name.trim().toLowerCase());
    if (new Set(termNames).size !== termNames.length) {
      toast({ title: 'Term names must be unique', status: 'error', duration: 2000 });
      return;
    }
    const newTaxonomies = [...taxonomies];
    const taxonomyToSave = {
      ...form,
      id: taxonomyId,
      terms: termsWithIds,
      resolvedValueTypeIds: Array.isArray(form.resolvedValueTypeIds) ? form.resolvedValueTypeIds : [],
    };
    if (editingIndex !== null) {
      newTaxonomies[editingIndex] = taxonomyToSave;
    } else {
      newTaxonomies.push(taxonomyToSave);
      // Add new taxonomy to the order if it's not already there
      if (!taxonomyOrder.includes(taxonomyId)) {
        const newOrder = [...taxonomyOrder, taxonomyId];
        StorageService.setTaxonomyOrder(newOrder);
        setTaxonomyOrder(newOrder);
        
        // Dispatch event to notify change detection system
        window.dispatchEvent(new CustomEvent('token-model:data-change'));
      }
    }
    if (!validateAndSetTaxonomies(newTaxonomies)) {
      return;
    }
    setOpen(false);
    setEditingIndex(null);
    toast({ title: 'Taxonomy saved', status: 'success', duration: 2000 });
  };

  const handleDelete = (index: number) => {
    const taxonomyToDelete = taxonomies[index];
    const updated = taxonomies.filter((_: Taxonomy, i: number) => i !== index);
    // Remove the deleted taxonomy from the order
    const newOrder = taxonomyOrder.filter(id => id !== taxonomyToDelete.id);
    // Validate the changes - simple validation for taxonomy deletion
    const existingTaxonomyIds = new Set(updated.map(t => t.id));
    const invalidIds = newOrder.filter(id => !existingTaxonomyIds.has(id));
    
    if (invalidIds.length > 0) {
      console.log('Validation failed: Invalid taxonomy IDs after deletion:', invalidIds);
      toast({
        title: 'Cannot Delete Taxonomy',
        description: `Invalid taxonomy IDs in order: ${invalidIds.join(', ')}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setTaxonomies(updated);
    StorageService.setTaxonomyOrder(newOrder);
    setTaxonomyOrder(newOrder);
    
    // Dispatch event to notify change detection system
    window.dispatchEvent(new CustomEvent('token-model:data-change'));
    toast({ title: 'Taxonomy deleted', status: 'info', duration: 2000 });
  };

  // Term management
  const handleTermDialogOpen = (index: number | null) => {
    if (index !== null && form.terms[index]) {
      const t = form.terms[index];
      setTermForm({ 
        id: t.id, 
        name: t.name, 
        description: t.description || '' 
      });
    } else {
      setTermForm({ 
        id: createUniqueId('term'), 
        name: '', 
        description: '' 
      });
    }
    setTermDialogOpen(true);
    setTermEditIndex(index);
  };

  const handleTermDialogClose = () => {
    setTermDialogOpen(false);
    setTermEditIndex(null);
  };

  const handleTermFormChange = (field: string, value: string) => {
    setTermForm((prev: typeof termForm) => ({ ...prev, [field]: value }));
  };

  const handleTermSave = () => {
    // Ensure term has an id
    const termId = termForm.id && termForm.id.trim() ? termForm.id : createUniqueId('term');
    if (!termForm.name.trim()) {
      toast({ title: 'Term name is required', status: 'error', duration: 2000 });
      return;
    }
    // Check for duplicate term names (case-insensitive)
    const newTerms = form.terms ? [...form.terms] : [];
    const termNames = newTerms.map((t: { name: string }) => t.name.trim().toLowerCase());
    if (
      (termEditIndex === null && termNames.includes(termForm.name.trim().toLowerCase())) ||
      (termEditIndex !== null && termNames.filter((_: string, i: number) => i !== termEditIndex).includes(termForm.name.trim().toLowerCase()))
    ) {
      toast({ title: 'Term names must be unique', status: 'error', duration: 2000 });
      return;
    }
    if (termEditIndex !== null) {
      newTerms[termEditIndex] = { ...termForm, id: termId };
    } else {
      newTerms.push({ ...termForm, id: termId });
    }
    setForm((prev: typeof form) => ({ ...prev, terms: newTerms }));
    setTermDialogOpen(false);
    setTermEditIndex(null);
  };

  const handleTermDelete = (index: number) => {
    setForm((prev: typeof form) => ({
      ...prev,
      terms: (prev.terms || []).filter((_: { id: string; name: string; description?: string }, i: number) => i !== index)
    }));
  };

  // Sort taxonomies according to taxonomyOrder
  const sortedTaxonomies = [...taxonomies].sort((a, b) => {
    if (!taxonomyOrder || taxonomyOrder.length === 0) {
      console.log('No taxonomy order, using original order');
      return 0;
    }
    const indexA = taxonomyOrder.indexOf(a.id);
    const indexB = taxonomyOrder.indexOf(b.id);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  console.log('Sorted taxonomies:', sortedTaxonomies);

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={2}>Taxonomies</Text>
      <Text fontSize="sm" color="gray.600" mb={6}>Taxonomies are used to classify tokens. Ordering them will affect how names are generated in published tokens.</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" leftIcon={<LuPlus />} onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
          Add Taxonomy
        </Button>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="taxonomies">
            {(provided) => (
              <VStack
                {...provided.droppableProps}
                ref={provided.innerRef}
                align="stretch"
                spacing={2}
              >
                {sortedTaxonomies.map((taxonomy: Taxonomy, i: number) => (
                  <Draggable key={taxonomy.id} draggableId={taxonomy.id} index={i}>
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
                          <HStack spacing={2}>
                            <Box w="32px" textAlign="center" fontWeight="bold" color="gray.500">
                              {i + 1}
                            </Box>
                            <Box {...provided.dragHandleProps} cursor="grab">
                              <LuGripVertical />
                            </Box>
                            <Box>
                              <CardTitle title={taxonomy.name} cardType="taxonomy" />
                              <Text fontSize="sm" color="gray.600">{taxonomy.description}</Text>
                              <Text fontSize="sm" color="gray.600">Terms: {taxonomy.terms.map((t: { name: string }) => t.name).join(', ')}</Text>
                              {Array.isArray(taxonomy.resolvedValueTypeIds) && taxonomy.resolvedValueTypeIds.length > 0 && (
                                <Wrap mt={2} spacing={2}>
                                  {taxonomy.resolvedValueTypeIds.map((typeId: string) => {
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
                            <IconButton aria-label="Edit taxonomy" icon={<LuPencil />} size="sm" onClick={() => handleOpen(i)} />
                            <IconButton aria-label="Delete taxonomy" icon={<LuTrash2 />} size="sm" colorScheme="red" onClick={() => handleDelete(i)} />
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

      <TaxonomyEditorDialog
        open={open}
        onClose={handleClose}
        onSave={handleSave}
        form={{ ...form, editingIndex }}
        handleFormChange={handleFormChange}
        handleTermDialogOpen={handleTermDialogOpen}
        handleTermDelete={handleTermDelete}
        resolvedValueTypes={Array.isArray(resolvedValueTypes) ? resolvedValueTypes.map(vt => ({ id: vt.id, name: vt.displayName })) : []}
      />
      <TermEditorDialog
        open={termDialogOpen}
        onClose={handleTermDialogClose}
        onSave={handleTermSave}
        termForm={termForm}
        handleTermFormChange={handleTermFormChange}
        termEditIndex={termEditIndex}
      />
    </Box>
  );
} 