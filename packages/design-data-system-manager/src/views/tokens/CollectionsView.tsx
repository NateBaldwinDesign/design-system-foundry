import React, { useState } from 'react';
import {
  Box,
  Text,
  Button,
  IconButton,
  VStack,
  HStack,
  useToast,
  useColorMode,
  Tag,
  TagLabel,
  Wrap,
  Alert,
  AlertIcon,
  Tooltip
} from '@chakra-ui/react';
import { LuTrash2, LuPencil, LuPlus } from 'react-icons/lu';
import type { TokenCollection, Token, ResolvedValueType } from '@token-model/data-model';
import { CollectionEditorDialog } from '../../components/CollectionEditorDialog';
import { CardTitle } from '../../components/CardTitle';

interface CollectionsViewProps {
  collections: TokenCollection[];
  onUpdate: (collections: TokenCollection[]) => void;
  tokens: Token[];
  resolvedValueTypes: ResolvedValueType[];
}

export function CollectionsView({ collections, onUpdate, tokens, resolvedValueTypes }: CollectionsViewProps) {
  const { colorMode } = useColorMode();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<TokenCollection | null>(null);
  const [isNew, setIsNew] = useState(false);
  const toast = useToast();

  // Helper: Get count of tokens with unsupported value types
  function getMismatchedTokenCount(collection: TokenCollection) {
    return tokens.filter(t => 
      t.tokenCollectionId === collection.id && 
      !collection.resolvedValueTypeIds.includes(t.resolvedValueTypeId)
    ).length;
  }

  // Helper: Get mismatched token details
  function getMismatchedTokenDetails(collection: TokenCollection) {
    return tokens.filter(t => 
      t.tokenCollectionId === collection.id && 
      !collection.resolvedValueTypeIds.includes(t.resolvedValueTypeId)
    ).map(t => {
      const type = resolvedValueTypes.find(rt => rt.id === t.resolvedValueTypeId);
      return {
        name: t.displayName,
        type: type?.displayName || t.resolvedValueTypeId
      };
    });
  }

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
    let newCollections: TokenCollection[];
    if (isNew) {
      newCollections = [...collections, collection];
    } else {
      newCollections = collections.map(c => c.id === collection.id ? collection : c);
    }
    
    // Update state
    onUpdate(newCollections);
    
    toast({ 
      title: isNew ? 'Collection created' : 'Collection updated', 
      status: 'success', 
      duration: 2000 
    });
    setDialogOpen(false);
  };

  // Close dialog
  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleDeleteCollection = (id: string) => {
    const newCollections = collections.filter(c => c.id !== id);
    
    // Update state
    onUpdate(newCollections);
    
    toast({ 
      title: 'Collection deleted', 
      status: 'info', 
      duration: 2000 
    });
  };

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={4}>Collections</Text>
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Button size="sm" onClick={handleOpenCreate} colorScheme="blue" mb={4} leftIcon={<LuPlus />}>
          Create New Collection
        </Button>
        <VStack align="stretch" spacing={2}>
          {collections.map((collection) => {
            const isTypeBased = collection.resolvedValueTypeIds.length === 1;
            return (
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
                    <HStack>
                      <CardTitle title={collection.name} cardType="collection" />
                    {isTypeBased && (
                        <Tooltip label="Type-based collections support only one resolved value type" placement="top">
                          <Tag size="sm" colorScheme="blackAlpha" ml={2}>Type-based</Tag>
                        </Tooltip>
                      )}
                    </HStack>
                  </Box>
                  <HStack>
                    <IconButton aria-label="Edit collection" icon={<LuPencil />} size="sm" onClick={() => handleOpenEdit(collection)} />
                    <IconButton aria-label="Delete collection" icon={<LuTrash2 />} size="sm" colorScheme="red" onClick={() => handleDeleteCollection(collection.id)} />
                  </HStack>
                </HStack>
                <VStack align="start" spacing={1} mt={2} ml={2}>
                  <Text fontSize="sm" color="gray.600">
                    <b>Value Types:</b>
                  </Text>
                  <Wrap spacing={2}>
                    {Array.isArray(collection.resolvedValueTypeIds) && collection.resolvedValueTypeIds.map((typeId: string) => {
                      const type = resolvedValueTypes.find((t: ResolvedValueType) => t.id === typeId);
                      // Count tokens that are either:
                      // 1. Explicitly assigned to this collection
                      // 2. Have a matching resolvedValueTypeId but no collection assignment
                      const explicitCount = tokens.filter(t => t.tokenCollectionId === collection.id && t.resolvedValueTypeId === typeId).length;
                      const implicitCount = tokens.filter(t => !t.tokenCollectionId && t.resolvedValueTypeId === typeId).length;
                      const totalCount = explicitCount + implicitCount;

                      // Create human-friendly tooltip text
                      const tooltipText = [
                        explicitCount > 0 ? `${explicitCount} ${explicitCount === 1 ? 'token is' : 'tokens are'} assigned to this collection` : null,
                        implicitCount > 0 ? `${implicitCount} ${implicitCount === 1 ? 'token is' : 'tokens are'} compatible but not assigned` : null
                      ].filter(Boolean).join('\n');

                      return type ? (
                        <Tooltip 
                          key={typeId}
                          label={tooltipText}
                          placement="top"
                          hasArrow
                        >
                          <Tag size="md" borderRadius="full" variant="subtle" colorScheme="blue">
                            <TagLabel>{type.displayName} ({totalCount})</TagLabel>
                          </Tag>
                        </Tooltip>
                      ) : null;
                    })}
                  </Wrap>
                  {getMismatchedTokenCount(collection) > 0 && (
                    <Alert status="warning" size="sm" mt={2} borderRadius="md">
                      <AlertIcon />
                      {getMismatchedTokenDetails(collection).map((token, index) => (
                        <Text key={index} fontSize="sm">
                          Token &apos;{token.name}&apos; has type &apos;{token.type}&apos; which is not supported by collection &apos;{collection.name}&apos;
                        </Text>
                      ))}
                    </Alert>
                  )}
                  {collection.private && (
                    <Text fontSize="sm" color="gray.500"><b>Private</b></Text>
                  )}
                </VStack>
              </Box>
            );
          })}
        </VStack>
      </Box>
      <CollectionEditorDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        collection={editingCollection}
        isNew={isNew}
        resolvedValueTypes={resolvedValueTypes}
      />
    </Box>
  );
} 