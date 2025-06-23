import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Box,
  Text,
  Button,
  HStack,
  IconButton,
  useColorMode,
  Select,
  Wrap,
  Tag,
  TagLabel,
  TagCloseButton
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';

export interface ResolvedValueTypeOption {
  id: string;
  name: string;
}

export interface TaxonomyEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: {
    id: string;
    name: string;
    description: string;
    terms: { id: string; name: string; description?: string }[];
    resolvedValueTypeIds?: string[];
    [key: string]: unknown;
  };
  handleFormChange: (field: string, value: string | string[] | { id: string; name: string; description?: string }[]) => void;
  handleTermDialogOpen: (index: number | null) => void;
  handleTermDelete: (index: number) => void;
  resolvedValueTypes: ResolvedValueTypeOption[];
}

export const TaxonomyEditorDialog: React.FC<TaxonomyEditorDialogProps> = (props: TaxonomyEditorDialogProps) => {
  const {
    open,
    onClose,
    onSave,
    form,
    handleFormChange,
    handleTermDialogOpen,
    handleTermDelete,
    resolvedValueTypes
  } = props;
  const { colorMode } = useColorMode();

  // Add debug logging for form data
  React.useEffect(() => {
    if (open) {
      console.log('[TaxonomyEditorDialog] Form data:', JSON.stringify(form, null, 2));
    }
  }, [open, form]);

  // Handler for multi-select value types
  const handleValueTypeAdd = (id: string) => {
    if (!form.resolvedValueTypeIds?.includes(id)) {
      const updated = [...(form.resolvedValueTypeIds || []), id];
      handleFormChange('resolvedValueTypeIds', updated);
    }
  };
  const handleValueTypeRemove = (id: string) => {
    const updated = (form.resolvedValueTypeIds || []).filter((v: string) => v !== id);
    handleFormChange('resolvedValueTypeIds', updated);
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <ModalHeader>{form.editingIndex !== null ? 'Edit Taxonomy' : 'Add Taxonomy'}</ModalHeader>
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
            <FormControl>
              <FormLabel>Value Types</FormLabel>
              <Select
                placeholder="Add a value type..."
                value=""
                onChange={e => {
                  if (e.target.value) handleValueTypeAdd(e.target.value);
                }}
              >
                {resolvedValueTypes
                  .filter(type => !(form.resolvedValueTypeIds || []).includes(type.id))
                  .map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
              </Select>
              <Wrap mt={2} spacing={2}>
                {(form.resolvedValueTypeIds || []).map((typeId: string) => {
                  const type = resolvedValueTypes.find(t => t.id === typeId);
                  return type ? (
                    <Tag key={typeId} size="md" borderRadius="full" variant="solid" colorScheme="blue">
                      <TagLabel>{type.name}</TagLabel>
                      <TagCloseButton onClick={() => handleValueTypeRemove(typeId)} />
                    </Tag>
                  ) : null;
                })}
              </Wrap>
            </FormControl>
            <Box>
              <Text fontWeight="bold" mb={2}>Terms</Text>
              <Button leftIcon={<LuPlus />} size="sm" onClick={() => handleTermDialogOpen(null)} mb={2}>
                Add Term
              </Button>
              <VStack align="stretch" spacing={1}>
                {form.terms.map((term: { id: string; name: string; description?: string }, idx: number) => (
                  <HStack key={term.id}>
                    <Text>{term.name}</Text>
                    <IconButton aria-label="Edit term" icon={<LuPencil />} size="xs" onClick={() => handleTermDialogOpen(idx)} />
                    <IconButton aria-label="Delete term" icon={<LuTrash2 />} size="xs" colorScheme="red" onClick={() => handleTermDelete(idx)} />
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={onSave}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 