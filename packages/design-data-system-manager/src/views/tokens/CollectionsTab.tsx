import React, { useState } from 'react';
import {
  Box,
  Text,
  Button,
  IconButton,
  VStack,
  HStack,
  useToast,
  useColorMode
} from '@chakra-ui/react';
import { LuTrash2, LuPencil, LuPlus } from 'react-icons/lu';
import type { TokenCollection, Mode } from '@token-model/data-model';
import { CollectionEditorDialog } from '../../components/CollectionEditorDialog';

interface CollectionsTabProps {
  collections: TokenCollection[];
  modes: Mode[];
  onUpdate: (collections: TokenCollection[]) => void;
}

export function CollectionsTab({ collections, modes, onUpdate }: CollectionsTabProps) {
  const { colorMode } = useColorMode();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<TokenCollection | null>(null);
  const [isNew, setIsNew] = useState(false);
  const toast = useToast();

  // Open dialog for creating a new collection
  const handleOpenCreate = () => {
    setEditingCollection(null);
    setIsNew(true);
    setDialogOpen(true);
  };

  // Open dialog for editing an existing collection
  const handleOpenEdit = (collection: TokenCollection) => {
    setEditingCollection(collection);
    setIsNew(false);
    setDialogOpen(true);
  };

  // Save handler for dialog
  const handleDialogSave = (collection: TokenCollection) => {
    if (isNew) {
      onUpdate([...collections, collection]);
      toast({ title: 'Collection created', status: 'success', duration: 2000 });
    } else {
      onUpdate(collections.map(c => c.id === collection.id ? collection : c));
      toast({ title: 'Collection updated', status: 'success', duration: 2000 });
    }
    setDialogOpen(false);
  };

  // Close dialog
  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleDeleteCollection = (id: string) => {
    onUpdate(collections.filter(c => c.id !== id));
    toast({ title: 'Collection deleted', status: 'info', duration: 2000 });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Collections</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" onClick={handleOpenCreate} colorScheme="blue" mb={4} leftIcon={<LuPlus />}>
          Create New Collection
        </Button>
        <VStack align="stretch" spacing={2}>
          {collections.map((collection) => (
            <Box 
              key={collection.id} 
              p={3} 
              borderWidth={1} 
              borderRadius="md" 
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <HStack justify="space-between" align="center">
                <Box>
                  <Text fontSize="lg" fontWeight="medium">{collection.name}</Text>
                </Box>
                <HStack>
                  <IconButton aria-label="Edit collection" icon={<LuPencil />} size="sm" onClick={() => handleOpenEdit(collection)} />
                  <IconButton aria-label="Delete collection" icon={<LuTrash2 />} size="sm" colorScheme="red" onClick={() => handleDeleteCollection(collection.id)} />
                </HStack>
              </HStack>
              <VStack align="start" spacing={1} mt={2} ml={2}>
                <Text fontSize="sm" color="gray.600">
                  <b>Value Types:</b> {Array.isArray(collection.resolvedValueTypes) ? collection.resolvedValueTypes.join(', ') : 'None'}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  <b>Mode Priority:</b> {Array.isArray(collection.modeResolutionStrategy?.priorityByType) && collection.modeResolutionStrategy?.priorityByType.length > 0
                    ? collection.modeResolutionStrategy?.priorityByType.join(' > ')
                    : 'None'}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  <b>Fallback Strategy:</b> {collection.modeResolutionStrategy?.fallbackStrategy || 'None'}
                </Text>
                {collection.private && (
                  <Text fontSize="sm" color="gray.500"><b>Private</b></Text>
                )}
                {collection.defaultModeIds && collection.defaultModeIds.length > 0 && (
                  <Text fontSize="sm" color="gray.600">
                    <b>Default Modes:</b> {collection.defaultModeIds.map(id => {
                      const mode = modes.find(m => m.id === id);
                      return mode?.name || id;
                    }).join(', ')}
                  </Text>
                )}
              </VStack>
            </Box>
          ))}
        </VStack>
      </Box>
      <CollectionEditorDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        collection={editingCollection}
        valueTypes={[]}
        isNew={isNew}
      />
    </Box>
  );
} 