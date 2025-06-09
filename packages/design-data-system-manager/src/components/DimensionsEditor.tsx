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
  const [displayName, setDisplayName] = React.useState(dimension?.displayName || '');
  const [description, setDescription] = React.useState(dimension?.description || '');
  const [defaultMode, setDefaultMode] = React.useState(dimension?.defaultMode || '');
  const [required, setRequired] = React.useState(dimension?.required || false);

  React.useEffect(() => {
    if (dimension) {
      setDisplayName(dimension.displayName);
      setDescription(dimension.description || '');
      setDefaultMode(dimension.defaultMode);
      setRequired(dimension.required);
    }
  }, [dimension]);

  const handleSave = () => {
    if (!displayName) return;

    onSave({
      id: dimension?.id || crypto.randomUUID(),
      displayName,
      description,
      modes: dimension?.modes || [],
      required,
      defaultMode,
      resolvedValueTypeIds: dimension?.resolvedValueTypeIds
    });
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              {isNew ? 'New Dimension' : 'Edit Dimension'}
            </Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>
            <Stack gap={4}>
              <Field.Root required>
                <Field.Label>Display Name</Field.Label>
                <Field.RequiredIndicator />
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter display name"
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter description"
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Default Mode</Field.Label>
                <Input
                  value={defaultMode}
                  onChange={(e) => setDefaultMode(e.target.value)}
                  placeholder="Enter default mode"
                />
              </Field.Root>
            </Stack>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorPalette="blue" onClick={handleSave} disabled={!displayName}>
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
} 