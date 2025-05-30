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
  useColorMode
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';

export interface TaxonomyEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  form: any;
  handleFormChange: (field: string, value: string) => void;
  handleTermDialogOpen: (index: number | null) => void;
  handleTermDelete: (index: number) => void;
}

export const TaxonomyEditorDialog: React.FC<TaxonomyEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  form,
  handleFormChange,
  handleTermDialogOpen,
  handleTermDelete
}) => {
  const { colorMode } = useColorMode();

  // Add debug logging for form data
  React.useEffect(() => {
    if (open) {
      console.log('[TaxonomyEditorDialog] Form data:', JSON.stringify(form, null, 2));
    }
  }, [open, form]);

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
            <Box>
              <Text fontWeight="bold" mb={2}>Terms</Text>
              <Button leftIcon={<LuPlus />} size="sm" onClick={() => handleTermDialogOpen(null)} mb={2}>
                Add Term
              </Button>
              <VStack align="stretch" spacing={1}>
                {form.terms.map((term: any, idx: number) => (
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