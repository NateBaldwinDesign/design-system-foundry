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

export const DimensionsEditor: React.FC<DimensionsEditorProps> = ({
  open,
  onClose,
  onSave,
  dimension,
  isNew
}) => {
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
    onSave({
      id: dimension?.id || '',
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
          <Dialog.Header>{isNew ? 'New Dimension' : 'Edit Dimension'}</Dialog.Header>
          <Dialog.Body>
            <Stack gap={4}>
              <Field.Root>
                <Field.Label>Name</Field.Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter dimension name"
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter dimension description"
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
            <Button
              onClick={onClose}
              variant="ghost"
              colorPalette="gray"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              colorPalette="blue"
              ml={3}
            >
              Save
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}; 