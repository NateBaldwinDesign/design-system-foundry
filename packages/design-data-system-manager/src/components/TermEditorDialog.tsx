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
  Button,
  useColorMode
} from '@chakra-ui/react';

export interface TermEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  termForm: any;
  handleTermFormChange: (field: string, value: string) => void;
  termEditIndex: number | null;
}

export const TermEditorDialog: React.FC<TermEditorDialogProps> = ({
  open,
  onClose,
  onSave,
  termForm,
  handleTermFormChange,
  termEditIndex
}) => {
  const { colorMode } = useColorMode();
  return (
    <Modal isOpen={open} onClose={onClose} size="sm">
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