import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Box,
  Text,
  Input,
  FormControl,
  FormLabel,
  Select,
  Checkbox,
  VStack,
  HStack,
  Tag,
  useToast
} from '@chakra-ui/react';
import type { TokenCollection } from '@token-model/data-model';

export interface CollectionEditorDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (collection: TokenCollection) => void;
  collection?: TokenCollection | null;
  valueTypes: { id: string; displayName: string }[];
  isNew?: boolean;
}

// Local form state type for the dialog
interface CollectionEditorFormState {
  name: string;
  description: string;
  resolvedValueTypeIds: string[];
  private: boolean;
}

// Extended TokenCollection type to include resolvedValueTypeIds
interface ExtendedTokenCollection extends TokenCollection {
  resolvedValueTypeIds: string[];
}

export function CollectionEditorDialog({ open, onClose, onSave, collection, valueTypes, isNew = false }: CollectionEditorDialogProps) {
  const [editedCollection, setEditedCollection] = useState<CollectionEditorFormState>({
    name: '',
    description: '',
    resolvedValueTypeIds: [],
    private: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  useEffect(() => {
    if (open) {
      if (collection) {
        const extendedCollection = collection as ExtendedTokenCollection;
        setEditedCollection({
          name: collection.name || '',
          description: collection.description || '',
          resolvedValueTypeIds: extendedCollection.resolvedValueTypeIds || [],
          private: !!collection.private,
        });
      } else {
        setEditedCollection({
          name: '',
          description: '',
          resolvedValueTypeIds: [],
          private: false,
        });
      }
      setErrors({});
    }
  }, [open, collection]);

  const handleChange = (field: keyof CollectionEditorFormState, value: string | boolean | string[]) => {
    setEditedCollection((prev: CollectionEditorFormState) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setErrors({});
    if (!editedCollection.name || !editedCollection.name.trim()) {
      setErrors({ name: 'Name is required' });
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        status: 'error',
        duration: 2000,
      });
      return;
    }
    if (!Array.isArray(editedCollection.resolvedValueTypeIds) || editedCollection.resolvedValueTypeIds.length === 0) {
      setErrors({ resolvedValueTypeIds: 'At least one value type is required' });
      toast({
        title: 'Validation Error',
        description: 'At least one value type is required',
        status: 'error',
        duration: 2000,
      });
      return;
    }
    onSave({
      ...collection,
      name: editedCollection.name,
      description: editedCollection.description,
      resolvedValueTypeIds: editedCollection.resolvedValueTypeIds,
      private: !!editedCollection.private,
      id: collection?.id || crypto.randomUUID(),
    } as TokenCollection);
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{isNew ? 'Create Collection' : 'Edit Collection'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={!!errors.name} isRequired>
              <FormLabel>Name</FormLabel>
              <Input
                value={editedCollection.name || ''}
                onChange={e => handleChange('name', e.target.value)}
              />
              {errors.name && (
                <Text color="red.500" fontSize="sm">{errors.name}</Text>
              )}
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input
                value={editedCollection.description || ''}
                onChange={e => handleChange('description', e.target.value)}
                as="textarea"
                rows={2}
              />
            </FormControl>
            <FormControl isInvalid={!!errors.resolvedValueTypeIds} isRequired>
              <FormLabel>Resolved Value Types</FormLabel>
              <Select
                multiple
                value={editedCollection.resolvedValueTypeIds || []}
                onChange={e => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleChange('resolvedValueTypeIds', values);
                }}
              >
                {Array.isArray(valueTypes) && valueTypes.length > 0 ? (
                  valueTypes.map(vt => (
                    <option key={vt.id} value={vt.id}>{vt.displayName}</option>
                  ))
                ) : (
                  <option disabled value="">
                    {valueTypes === undefined
                      ? "No resolved value types available. Please configure them in the editor above."
                      : "No resolved value types found."}
                  </option>
                )}
              </Select>
              <Box mt={2}>
                <HStack spacing={2} wrap="wrap">
                  {editedCollection.resolvedValueTypeIds.map((id: string) => {
                    const vt = Array.isArray(valueTypes) ? valueTypes.find(v => v.id === id) : undefined;
                    return (
                      <Tag key={id} size="md" colorScheme="blue">
                        {vt ? vt.displayName : id}
                      </Tag>
                    );
                  })}
                </HStack>
              </Box>
              {errors.resolvedValueTypeIds && (
                <Text color="red.500" fontSize="sm">{errors.resolvedValueTypeIds}</Text>
              )}
            </FormControl>
            <FormControl>
              <Checkbox
                isChecked={!!editedCollection.private}
                onChange={e => handleChange('private', e.target.checked)}
              >
                Private
              </Checkbox>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            {isNew ? 'Create' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 