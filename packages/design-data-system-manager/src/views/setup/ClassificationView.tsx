import React, { useState } from 'react';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  IconButton,
  Tag,
  TagLabel,
  Wrap
} from '@chakra-ui/react';
import { useTheme } from 'next-themes';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';
import type { Taxonomy, Token, TokenCollection, Dimension, Platform, ResolvedValueType } from '@token-model/data-model';
import { createUniqueId } from '../../utils/id';
import { ValidationService } from '../../services/validation';
import { TaxonomyEditorDialog } from '../../components/TaxonomyEditorDialog';
import { TermEditorDialog } from '../../components/TermEditorDialog';
import { StorageService } from '../../services/storage';
import { useToast } from '../../hooks/useToast';

interface ClassificationViewProps {
  taxonomies: Taxonomy[];
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
}

// Extend the Taxonomy type to include resolvedValueTypeIds
interface ExtendedTaxonomy extends Taxonomy {
  resolvedValueTypeIds?: string[];
}

// Utility to ensure all terms have a string description
function normalizeTerms(terms: { id: string; name: string; description?: string }[]): { id: string; name: string; description: string }[] {
  return terms.map((term: { id: string; name: string; description?: string }) => ({
    ...term,
    description: typeof term.description === 'string' ? term.description : ''
  }));
}

export function ClassificationView({ taxonomies, setTaxonomies }: ClassificationViewProps) {
  const { theme } = useTheme();
  const colorMode = theme === 'dark' ? 'dark' : 'light';
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
  const toast = useToast();
  const tokens: Token[] = StorageService.getTokens();
  const collections: TokenCollection[] = StorageService.getCollections();
  const dimensions: Dimension[] = StorageService.getDimensions();
  const platforms: Platform[] = StorageService.getPlatforms();
  const resolvedValueTypes: ResolvedValueType[] = StorageService.getValueTypes();

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      const taxonomy = taxonomies[index] as ExtendedTaxonomy;
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

  const handleFormChange = (field: string, value: string | { id: string; name: string; description?: string }[]) => {
    setForm((prev: typeof form) => {
      if (field === 'terms') {
        return { ...prev, terms: normalizeTerms(value as { id: string; name: string; description?: string }[]) };
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
        resolvedValueTypes: StorageService.getValueTypes(),
        version,
        versionHistory
      };

      console.log('[ClassificationView] Validation data:', JSON.stringify(data, null, 2));
      const result = ValidationService.validateData(data);
      console.log('[ClassificationView] Validation result:', result);
      if (!result.isValid) {
        console.error('[ClassificationView] Validation errors:', result.errors);
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
      StorageService.setTaxonomies(taxonomies);
      setTaxonomies(taxonomies);
    } catch (error) {
      console.error('[ClassificationView] Validation error:', error);
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
    }
    if (!validateAndSetTaxonomies(newTaxonomies)) {
      return;
    }
    setOpen(false);
    setEditingIndex(null);
    toast({ title: 'Taxonomy saved', status: 'success', duration: 2000 });
  };

  const handleDelete = (index: number) => {
    const updated = taxonomies.filter((_: Taxonomy, i: number) => i !== index);
    if (!validateAndSetTaxonomies(updated)) return;
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

  return (
    <Box>
      <VStack gap={4} align="stretch">
        <HStack justify="space-between">
          <Text fontSize="2xl" fontWeight="bold">Classification</Text>
          <Button onClick={() => handleOpen()}>
            <LuPlus />
            Add Taxonomy
          </Button>
        </HStack>

        <VStack gap={4} align="stretch">
          {taxonomies.map((taxonomy, index) => (
            <Box
              key={taxonomy.id}
              p={4}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.900' : 'white'}
            >
              <HStack justify="space-between" mb={2}>
                <Text fontSize="lg" fontWeight="medium">{taxonomy.name}</Text>
                <HStack gap={2}>
                  <IconButton
                    aria-label="Edit taxonomy"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpen(index)}
                  >
                    <LuPencil />
                  </IconButton>
                  <IconButton
                    aria-label="Delete taxonomy"
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    onClick={() => handleDelete(index)}
                  >
                    <LuTrash2 />
                  </IconButton>
                </HStack>
              </HStack>
              {taxonomy.description && (
                <Text color="gray.600" mb={2}>{taxonomy.description}</Text>
              )}
              <Wrap gap={2}>
                {taxonomy.terms?.map((term) => (
                  <Tag.Root key={term.id} size="md" borderRadius="full" variant="subtle">
                    <Tag.Label>{term.name}</Tag.Label>
                  </Tag.Root>
                ))}
              </Wrap>
            </Box>
          ))}
        </VStack>
      </VStack>

      <TaxonomyEditorDialog
        open={open}
        onClose={handleClose}
        onSave={handleSave}
        taxonomy={form}
        isNew={editingIndex === null}
        resolvedValueTypes={resolvedValueTypes.map(vt => ({ id: vt.id, name: vt.displayName }))}
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