"use client"

import React from 'react';
import {
  Dialog,
  Field,
  Input,
  Button,
  Stack
} from '@chakra-ui/react';
import { useColorMode } from './ui/color-mode';

interface TermForm {
  name: string;
  description: string;
}

export interface TermEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  termForm: TermForm;
  handleTermFormChange: (field: keyof TermForm, value: string) => void;
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
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
          <Dialog.Header>
            <Dialog.Title>{termEditIndex !== null ? 'Edit Term' : 'Add Term'}</Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>
            <Stack gap={4} align="stretch">
              <Field.Root required>
                <Field.Label>Name</Field.Label>
                <Field.RequiredIndicator />
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
      </Dialog.Positioner>
    </Dialog.Root>
  );
}; 