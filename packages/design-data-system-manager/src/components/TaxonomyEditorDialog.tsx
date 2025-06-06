import React from 'react';
import {
  Dialog,
  Field,
  Input,
  Box,
  Text,
  Button,
  Stack,
  IconButton,
  useColorMode,
  Select,
  Wrap,
  Tag,
  TagLabel,
  TagCloseButton
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'lucide-react';

export interface ResolvedValueTypeOption {
  id: string;
  name: string;
}

interface TaxonomyEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (taxonomy: any) => void;
  taxonomy?: any;
  isNew?: boolean;
  resolvedValueTypes: ResolvedValueTypeOption[];
}

export function TaxonomyEditorDialog({
  open,
  onClose,
  onSave,
  taxonomy,
  isNew = false,
  resolvedValueTypes
}: TaxonomyEditorDialogProps) {
  const { colorMode } = useColorMode();
  const [editedTaxonomy, setEditedTaxonomy] = React.useState(() => ({
    id: taxonomy?.id || '',
    name: taxonomy?.name || '',
    description: taxonomy?.description || '',
    terms: taxonomy?.terms || [],
    resolvedValueTypeIds: taxonomy?.resolvedValueTypeIds || []
  }));

  const [termForm, setTermForm] = React.useState({
    name: '',
    description: ''
  });

  const [termEditIndex, setTermEditIndex] = React.useState<number | null>(null);

  const handleChange = (field: string, value: any) => {
    setEditedTaxonomy(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTermFormChange = (field: string, value: string) => {
    setTermForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTerm = () => {
    if (!termForm.name) return;

    const newTerm = {
      id: crypto.randomUUID(),
      name: termForm.name,
      description: termForm.description
    };

    setEditedTaxonomy(prev => ({
      ...prev,
      terms: [...prev.terms, newTerm]
    }));

    setTermForm({
      name: '',
      description: ''
    });
  };

  const handleEditTerm = (index: number) => {
    const term = editedTaxonomy.terms[index];
    setTermForm({
      name: term.name,
      description: term.description || ''
    });
    setTermEditIndex(index);
  };

  const handleUpdateTerm = () => {
    if (!termForm.name || termEditIndex === null) return;

    setEditedTaxonomy(prev => ({
      ...prev,
      terms: prev.terms.map((term, index) =>
        index === termEditIndex
          ? { ...term, name: termForm.name, description: termForm.description }
          : term
      )
    }));

    setTermForm({
      name: '',
      description: ''
    });
    setTermEditIndex(null);
  };

  const handleDeleteTerm = (index: number) => {
    setEditedTaxonomy(prev => ({
      ...prev,
      terms: prev.terms.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(editedTaxonomy);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Dialog.Header>{isNew ? 'Create Taxonomy' : 'Edit Taxonomy'}</Dialog.Header>
        <Dialog.CloseButton />
        <Dialog.Body>
          <Stack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Name</Field.Label>
              <Input
                value={editedTaxonomy.name}
                onChange={e => handleChange('name', e.target.value)}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Description</Field.Label>
              <Input
                value={editedTaxonomy.description || ''}
                onChange={e => handleChange('description', e.target.value)}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Resolved Value Types</Field.Label>
              <Select
                value={editedTaxonomy.resolvedValueTypeIds}
                onChange={e => handleChange('resolvedValueTypeIds', Array.from(e.target.selectedOptions, option => option.value))}
                multiple
              >
                {resolvedValueTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </Field.Root>
            <Field.Root>
              <Field.Label>Terms</Field.Label>
              <Stack gap={4}>
                {editedTaxonomy.terms.map((term: any, index: number) => (
                  <Box
                    key={term.id}
                    p={3}
                    borderWidth={1}
                    borderRadius="md"
                    bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  >
                    <Stack direction="row" justify="space-between" align="center">
                      <Stack gap={1}>
                        <Text fontWeight="bold">{term.name}</Text>
                        {term.description && (
                          <Text fontSize="sm" color="gray.500">
                            {term.description}
                          </Text>
                        )}
                      </Stack>
                      <Stack direction="row">
                        <IconButton
                          aria-label="Edit term"
                          icon={<LuPencil />}
                          size="sm"
                          onClick={() => handleEditTerm(index)}
                        />
                        <IconButton
                          aria-label="Delete term"
                          icon={<LuTrash2 />}
                          size="sm"
                          onClick={() => handleDeleteTerm(index)}
                        />
                      </Stack>
                    </Stack>
                  </Box>
                ))}
                <Stack gap={4}>
                  <Field.Root>
                    <Field.Label>Add Term</Field.Label>
                    <Input
                      value={termForm.name}
                      onChange={e => handleTermFormChange('name', e.target.value)}
                      placeholder="Term name"
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Description</Field.Label>
                    <Input
                      value={termForm.description}
                      onChange={e => handleTermFormChange('description', e.target.value)}
                      placeholder="Term description"
                    />
                  </Field.Root>
                  <Button
                    leftIcon={<LuPlus />}
                    onClick={termEditIndex !== null ? handleUpdateTerm : handleAddTerm}
                    disabled={!termForm.name}
                  >
                    {termEditIndex !== null ? 'Update Term' : 'Add Term'}
                  </Button>
                </Stack>
              </Stack>
            </Field.Root>
          </Stack>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorPalette="blue" onClick={handleSave}>
            {isNew ? 'Create' : 'Save'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
} 