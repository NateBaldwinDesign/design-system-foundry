import React from 'react';
import {
  Dialog,
  Field,
  Input,
  Button,
  Stack,
  Checkbox
} from '@chakra-ui/react';
import type { TokenCollection } from '@token-model/data-model';
import { ResolvedValueTypePicker } from './ResolvedValueTypePicker';

interface CollectionEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (collection: TokenCollection) => void;
  collection?: TokenCollection;
  isNew?: boolean;
}

export function CollectionEditorDialog({ open, onClose, onSave, collection, isNew = false }: CollectionEditorDialogProps) {
  const [editedCollection, setEditedCollection] = React.useState(() => ({
    id: collection?.id || '',
    name: collection?.name || '',
    description: collection?.description || '',
    resolvedValueTypeIds: collection?.resolvedValueTypeIds || [],
    private: collection?.private || false
  }));

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleChange = (field: keyof typeof editedCollection, value: string | boolean | string[]) => {
    setEditedCollection(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!editedCollection.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!editedCollection.resolvedValueTypeIds.length) {
      newErrors.resolvedValueTypeIds = 'At least one value type is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(editedCollection);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content>
        <Dialog.Header>{isNew ? 'Create Collection' : 'Edit Collection'}</Dialog.Header>
        <Button 
          position="absolute" 
          top={2} 
          right={2} 
          variant="ghost" 
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </Button>
        <Dialog.Body>
          <Stack gap={4} align="stretch">
            <Field.Root invalid={!!errors.name} required>
              <Field.Label>Name</Field.Label>
              <Input
                value={editedCollection.name || ''}
                onChange={e => handleChange('name', e.target.value)}
              />
              {errors.name && (
                <Field.ErrorText>{errors.name}</Field.ErrorText>
              )}
            </Field.Root>
            <Field.Root>
              <Field.Label>Description</Field.Label>
              <Input
                value={editedCollection.description || ''}
                onChange={e => handleChange('description', e.target.value)}
              />
            </Field.Root>
            <Field.Root invalid={!!errors.resolvedValueTypeIds} required>
              <ResolvedValueTypePicker
                value={editedCollection.resolvedValueTypeIds}
                onChange={vals => handleChange('resolvedValueTypeIds', vals)}
                label="Resolved Value Types"
                required={true}
                error={errors.resolvedValueTypeIds}
              />
            </Field.Root>
            <Field.Root>
              <Checkbox.Root
                checked={!!editedCollection.private}
                onCheckedChange={(details) => handleChange('private', details.checked === true)}
              >
                <Checkbox.Control />
                <Checkbox.Label>Private</Checkbox.Label>
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
    </Dialog.Root>
  );
} 