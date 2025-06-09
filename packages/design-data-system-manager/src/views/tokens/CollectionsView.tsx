import React, { useState } from 'react';
import { Box, Button, Stack, Text } from '@chakra-ui/react';
import type { TokenCollection, ResolvedValueType } from '@token-model/data-model';
import { CollectionEditorDialog } from '../../components/CollectionEditorDialog';

interface CollectionsViewProps {
  collections: TokenCollection[];
  onUpdate: (collections: TokenCollection[]) => void;
  resolvedValueTypes: ResolvedValueType[];
}

export function CollectionsView({ 
  collections, 
  onUpdate,
  resolvedValueTypes 
}: CollectionsViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<TokenCollection | undefined>(undefined);

  const handleCreate = () => {
    setEditingCollection(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (collection: TokenCollection) => {
    setEditingCollection(collection);
    setIsDialogOpen(true);
  };

  const handleSave = (collection: TokenCollection) => {
    const updatedCollections = editingCollection
      ? collections.map(c => c.id === collection.id ? collection : c)
      : [...collections, collection];
    onUpdate(updatedCollections);
    setIsDialogOpen(false);
  };

  return (
    <Box>
      <Stack direction="row" justify="space-between" align="center" mb={4}>
        <Text fontSize="xl" fontWeight="bold">Collections</Text>
        <Button onClick={handleCreate}>Create Collection</Button>
      </Stack>

      <Stack gap={4}>
        {collections.map(collection => (
          <Box
            key={collection.id}
            p={4}
            borderWidth={1}
            borderRadius="md"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Text fontWeight="bold">{collection.name}</Text>
              {collection.description && (
                <Text color="gray.600" mt={1}>{collection.description}</Text>
              )}
            </Box>
            <Button onClick={() => handleEdit(collection)}>Edit</Button>
          </Box>
        ))}
      </Stack>

      <CollectionEditorDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        collection={editingCollection}
        isNew={!editingCollection}
        resolvedValueTypes={resolvedValueTypes}
      />
    </Box>
  );
} 