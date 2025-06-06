import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Button,
  Text,
  Input,
  Field,
  Checkbox,
  Stack,
  useToast
} from '@chakra-ui/react';
import type { TokenCollection } from '@token-model/data-model';
import { ResolvedValueTypePicker } from './ResolvedValueTypePicker';

export interface CollectionEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (collection: TokenCollection) => void;
  collection?: TokenCollection | null;
  isNew?: boolean;
}

interface CollectionEditorFormState {
  id: string;
  name: string;
  description?: string;
  resolvedValueTypeIds: string[];
  private?: boolean;
}

export function CollectionEditorDialog({ open, onClose, onSave, collection, isNew = false }: CollectionEditorDialogProps) {
  const [editedCollection, setEditedCollection] = useState<CollectionEditorFormState>({
    id: collection?.id || '',
    name: collection?.name || '',
    description: collection?.description || '',
    resolvedValueTypeIds: collection?.resolvedValueTypeIds || [],
    private: collection?.private || false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (collection) {
      setEditedCollection({
        id: collection.id,
        name: collection.name,
        description: collection.description || '',
        resolvedValueTypeIds: collection.resolvedValueTypeIds || [],
        private: collection.private || false
      });
    }
  }, [collection]);

  const handleChange = (field: keyof CollectionEditorFormState, value: any) => {
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
    // Validate
    const newErrors: Record<string, string> = {};
    if (!editedCollection.name) {
      newErrors.name = 'Name is required';
    }
    if (!editedCollection.resolvedValueTypeIds.length) {
      newErrors.resolvedValueTypeIds = 'At least one resolved value type is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      id: editedCollection.id,
      name: editedCollection.name,
      description: editedCollection.description,
      resolvedValueTypeIds: editedCollection.resolvedValueTypeIds,
      private: editedCollection.private
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content>
        <Dialog.Header>{isNew ? 'Create Collection' : 'Edit Collection'}</Dialog.Header>
        <Dialog.CloseButton />
        <Dialog.Body>
          <Stack gap={4} align="stretch">
            <Field.Root isInvalid={!!errors.name} isRequired>
              <Field.Label>Name</Field.Label>
              <Input
                value={editedCollection.name || ''}
                onChange={e => handleChange('name', e.target.value)}
              />
              {errors.name && (
                <Text color="red.500" fontSize="sm">{errors.name}</Text>
              )}
            </Field.Root>
            <Field.Root>
              <Field.Label>Description</Field.Label>
              <Input
                value={editedCollection.description || ''}
                onChange={e => handleChange('description', e.target.value)}
                as="textarea"
                rows={2}
              />
            </Field.Root>
            <Field.Root isInvalid={!!errors.resolvedValueTypeIds} isRequired>
              <ResolvedValueTypePicker
                value={editedCollection.resolvedValueTypeIds}
                onChange={vals => handleChange('resolvedValueTypeIds', vals)}
                label="Resolved Value Types"
                isRequired={true}
                error={errors.resolvedValueTypeIds}
              />
            </Field.Root>
            <Field.Root>
              <Checkbox
                isChecked={!!editedCollection.private}
                onChange={e => handleChange('private', e.target.checked)}
              >
                Private
              </Checkbox>
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