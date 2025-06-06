import React from 'react';
import {
  Dialog,
  Field,
  Input,
  Button,
  Stack,
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
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Dialog.Header>{termEditIndex !== null ? 'Edit Term' : 'Add Term'}</Dialog.Header>
        <Dialog.CloseButton />
        <Dialog.Body>
          <Stack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Name</Field.Label>
              <Input
                value={termForm.name}
                onChange={e => handleTermFormChange('name', e.target.value)}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Description</Field.Label>
              <Input
                value={termForm.description}
                onChange={e => handleTermFormChange('description', e.target.value)}
              />
            </Field.Root>
          </Stack>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorPalette="blue" onClick={onSave}>
            Save
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
}; 