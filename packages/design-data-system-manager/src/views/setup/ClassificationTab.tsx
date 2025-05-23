import React, { useState } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  FormControl,
  FormLabel,
  Input,
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
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';
import type { Taxonomy } from '@token-model/data-model';
import { createUniqueId } from '../../utils/id';

interface ClassificationTabProps {
  taxonomies: Taxonomy[];
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
}

export function ClassificationTab({ taxonomies, setTaxonomies }: ClassificationTabProps) {
  const { colorMode } = useColorMode();
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<{
    id: string;
    name: string;
    description: string;
    terms: { id: string; name: string; description: string }[];
  }>({
    id: '',
    name: '',
    description: '',
    terms: []
  });
  const [termForm, setTermForm] = useState({ id: '', name: '', description: '' });
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [termEditIndex, setTermEditIndex] = useState<number | null>(null);
  const toast = useToast();

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      const tax = taxonomies[index];
      setForm({
        id: tax.id,
        name: tax.name,
        description: tax.description,
        terms: tax.terms
      });
    } else {
      setForm({
        id: createUniqueId('taxonomy'),
        name: '',
        description: '',
        terms: []
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIndex(null);
  };

  const handleFormChange = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: 'Name is required', status: 'error', duration: 2000 });
      return;
    }

    const newTaxonomies = [...taxonomies];
    const taxonomyToSave = {
      ...form,
      terms: form.terms || []
    };

    if (editingIndex !== null) {
      newTaxonomies[editingIndex] = taxonomyToSave;
    } else {
      newTaxonomies.push(taxonomyToSave);
    }

    setTaxonomies(newTaxonomies);
    setOpen(false);
    setEditingIndex(null);
    toast({ title: 'Taxonomy saved', status: 'success', duration: 2000 });
  };

  const handleDelete = (index: number) => {
    setTaxonomies(taxonomies.filter((_: Taxonomy, i: number) => i !== index));
    toast({ title: 'Taxonomy deleted', status: 'info', duration: 2000 });
  };

  // Term management
  const handleTermDialogOpen = (index: number | null = null) => {
    setTermEditIndex(index);
    if (index !== null && form.terms) {
      const term = form.terms[index];
      setTermForm({ id: term.id, name: term.name, description: term.description || '' });
    } else {
      setTermForm({ id: createUniqueId('term'), name: '', description: '' });
    }
    setTermDialogOpen(true);
  };

  const handleTermDialogClose = () => {
    setTermDialogOpen(false);
    setTermEditIndex(null);
  };

  const handleTermFormChange = (field: keyof typeof termForm, value: string) => {
    setTermForm(prev => ({ ...prev, [field]: value }));
  };

  const handleTermSave = () => {
    if (!termForm.name.trim()) {
      toast({ title: 'Term name is required', status: 'error', duration: 2000 });
      return;
    }

    const newTerms = form.terms ? [...form.terms] : [];
    if (termEditIndex !== null) {
      newTerms[termEditIndex] = { ...termForm };
    } else {
      newTerms.push({ ...termForm });
    }
    setForm(prev => ({ ...prev, terms: newTerms }));
    setTermDialogOpen(false);
    setTermEditIndex(null);
  };

  const handleTermDelete = (index: number) => {
    setForm(prev => ({
      ...prev,
      terms: (prev.terms || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Classification</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" leftIcon={<AddIcon />} onClick={() => handleOpen(null)} colorScheme="blue" mb={4}>
          Add Taxonomy
        </Button>
        <VStack align="stretch" spacing={2}>
          {taxonomies.map((taxonomy, i) => (
            <Box 
              key={taxonomy.id} 
              p={3} 
              borderWidth={1} 
              borderRadius="md" 
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <HStack justify="space-between" align="center">
                <Box>
                  <Text fontSize="lg" fontWeight="medium">{taxonomy.name}</Text>
                  <Text fontSize="sm" color="gray.600">{taxonomy.description}</Text>
                  <Text fontSize="sm" color="gray.600">Terms: {taxonomy.terms.map((t: { name: string }) => t.name).join(', ')}</Text>
                </Box>
                <HStack>
                  <IconButton aria-label="Edit taxonomy" icon={<EditIcon />} size="sm" onClick={() => handleOpen(i)} />
                  <IconButton aria-label="Delete taxonomy" icon={<DeleteIcon />} size="sm" colorScheme="red" onClick={() => handleDelete(i)} />
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      </Box>

      {/* Taxonomy Editor Modal */}
      <Modal isOpen={open} onClose={handleClose} size="lg">
        <ModalOverlay />
        <ModalContent bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
          <ModalHeader>{editingIndex !== null ? 'Edit Taxonomy' : 'Add Taxonomy'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={form.name}
                  onChange={e => handleFormChange('name', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={form.description}
                  onChange={e => handleFormChange('description', e.target.value)}
                />
              </FormControl>
              <Box>
                <Text fontWeight="bold" mb={2}>Terms</Text>
                <Button leftIcon={<AddIcon />} size="sm" onClick={() => handleTermDialogOpen(null)} mb={2}>
                  Add Term
                </Button>
                <VStack align="stretch" spacing={1}>
                  {form.terms.map((term, idx) => (
                    <HStack key={term.id}>
                      <Text>{term.name}</Text>
                      <IconButton aria-label="Edit term" icon={<EditIcon />} size="xs" onClick={() => handleTermDialogOpen(idx)} />
                      <IconButton aria-label="Delete term" icon={<DeleteIcon />} size="xs" colorScheme="red" onClick={() => handleTermDelete(idx)} />
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

      {/* Term Editor Modal */}
      <Modal isOpen={termDialogOpen} onClose={handleTermDialogClose} size="sm">
        <ModalOverlay />
        <ModalContent bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
          <ModalHeader>{termEditIndex !== null ? 'Edit Term' : 'Add Term'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={termForm.name}
                  onChange={e => handleTermFormChange('name', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  value={termForm.description}
                  onChange={e => handleTermFormChange('description', e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleTermDialogClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleTermSave}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
} 