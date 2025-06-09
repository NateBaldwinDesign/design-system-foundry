import React from 'react';
import {
  Dialog,
  Field,
  Input,
  Button,
  Stack,
  Checkbox
} from '@chakra-ui/react';
import type { TokenCollection, ResolvedValueType } from '@token-model/data-model';
import { ResolvedValueTypePicker } from './ResolvedValueTypePicker';

interface CollectionEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (collection: TokenCollection) => void;
  collection?: TokenCollection;
  isNew?: boolean;
  resolvedValueTypes: ResolvedValueType[];
}

export function CollectionEditorDialog({ 
  open, 
  onClose, 
  onSave, 
  collection, 
  isNew = false,
  resolvedValueTypes 
}: CollectionEditorDialogProps) {
  const [editedCollection, setEditedCollection] = React.useState(() => ({
    id: collection?.id || '',
    name: collection?.name || '',
    resolvedValueTypeIds: collection?.resolvedValueTypeIds || [],
    private: collection?.private || false,
    description: collection?.description || '',
    defaultModeIds: collection?.defaultModeIds || [],
    modeResolutionStrategy: collection?.modeResolutionStrategy || {
      priorityByType: [],
      fallbackStrategy: 'DEFAULT_VALUE'
    }
  }));

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleChange = (field: keyof TokenCollection, value: string | boolean | string[]) => {
    setEditedCollection(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};

    if (!editedCollection.name) {
      newErrors.name = 'Name is required';
    }

    if (editedCollection.resolvedValueTypeIds.length === 0) {
      newErrors.resolvedValueTypeIds = 'At least one value type is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(editedCollection);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>{isNew ? 'Create Collection' : 'Edit Collection'}</Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>
            <Stack gap={4} align="stretch">
              <Field.Root invalid={!!errors.name} required>
                <Field.Label>Name</Field.Label>
                <Field.RequiredIndicator />
                <Input
                  value={editedCollection.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                />
                {errors.name && (
                  <Field.ErrorText>{errors.name}</Field.ErrorText>
                )}
              </Field.Root>

              <Field.Root invalid={!!errors.resolvedValueTypeIds} required>
                <Field.Label>Resolved Value Types</Field.Label>
                <Field.RequiredIndicator />
                <ResolvedValueTypePicker
                  value={editedCollection.resolvedValueTypeIds}
                  onChange={(vals) => handleChange('resolvedValueTypeIds', vals)}
                  resolvedValueTypes={resolvedValueTypes}
                  label="Resolved Value Types"
                  isRequired={true}
                  error={errors.resolvedValueTypeIds}
                />
              </Field.Root>

              <Field.Root>
                <Field.Label>Description</Field.Label>
                <Input
                  value={editedCollection.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </Field.Root>

              <Field.Root>
                <Checkbox.Root
                  checked={editedCollection.private}
                  onCheckedChange={(details) => handleChange('private', details.checked === true)}
                >
                  <Checkbox.Control />
                  <Checkbox.Label>Private Collection</Checkbox.Label>
                </Checkbox.Root>
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