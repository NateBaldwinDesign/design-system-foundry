import React from 'react';
import {
  Dialog,
  Field,
  Input,
  Button,
  Stack
} from '@chakra-ui/react';
import type { Dimension } from '@token-model/data-model';

interface DimensionsEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (dimension: Dimension) => void;
  dimension?: Dimension;
  isNew?: boolean;
}

export function DimensionsEditor({
  open,
  onClose,
  onSave,
  dimension,
  isNew = false
}: DimensionsEditorProps) {
  const [editedDimension, setEditedDimension] = React.useState(() => ({
    id: dimension?.id || '',
    displayName: dimension?.displayName || '',
    description: dimension?.description || '',
    defaultMode: dimension?.defaultMode || '',
    modes: dimension?.modes || [],
    required: dimension?.required || false
  }));

  const handleChange = (field: keyof typeof editedDimension, value: string | boolean | string[]) => {
    setEditedDimension(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(editedDimension);
  };

  return (
    <Dialog.Root open={open} onOpenChange={() => onClose()}>
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{isNew ? 'Create Dimension' : 'Edit Dimension'}</Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>
            <Stack gap={4} align="stretch">
              <Field.Root required>
                <Field.Label>Name</Field.Label>
                <Input
                  value={editedDimension.displayName}
                  onChange={e => handleChange('displayName', e.target.value)}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Input
                  value={editedDimension.description || ''}
                  onChange={e => handleChange('description', e.target.value)}
                />
              </Field.Root>
              <Field.Root required>
                <Field.Label>Default Mode</Field.Label>
                <Input
                  value={editedDimension.defaultMode}
                  onChange={e => handleChange('defaultMode', e.target.value)}
                />
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
      </Dialog.Positioner>
    </Dialog.Root>
  );
} 