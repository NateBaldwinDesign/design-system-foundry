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
} from '@chakra-ui/react';
import { LuPlus, LuTrash2, LuPencil } from 'react-icons/lu';

export interface BaseEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  title: string;
  children: React.ReactNode;
}

export const BaseEditorDialog: React.FC<BaseEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  title,
  children
}) => {
  const { colorMode } = useColorMode();

  return (
    <Modal isOpen={open} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {children}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={async () => {
            try {
              await onSave();
            } catch (error) {
              console.error('Error saving:', error);
            }
          }}>
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// Common form controls that can be reused
export const NameFormControl: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <FormControl isRequired>
    <FormLabel>Name</FormLabel>
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </FormControl>
);

export const DescriptionFormControl: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <FormControl>
    <FormLabel>Description</FormLabel>
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </FormControl>
);

export const TermsList: React.FC<{
  terms: { id: string; name: string; description?: string }[];
  onAddTerm: () => void;
  onEditTerm: (index: number) => void;
  onDeleteTerm: (index: number) => void;
}> = ({ terms, onAddTerm, onEditTerm, onDeleteTerm }) => (
  <Box>
    <Text fontWeight="bold" mb={2}>Terms</Text>
    <Button leftIcon={<LuPlus />} size="sm" onClick={onAddTerm} mb={2}>
      Add Term
    </Button>
    <VStack align="stretch" spacing={1}>
      {terms.map((term, idx) => (
        <HStack key={term.id}>
          <Text>{term.name}</Text>
          <IconButton 
            aria-label="Edit term" 
            icon={<LuPencil />} 
            size="xs" 
            onClick={() => onEditTerm(idx)} 
          />
          <IconButton 
            aria-label="Delete term" 
            icon={<LuTrash2 />} 
            size="xs" 
            colorScheme="red" 
            onClick={() => onDeleteTerm(idx)} 
          />
        </HStack>
      ))}
    </VStack>
  </Box>
); 