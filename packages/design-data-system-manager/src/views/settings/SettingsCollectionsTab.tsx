import React from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  IconButton
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { TokenCollection, DimensionType, FallbackStrategy } from '@token-model/data-model';
import { CollectionEditorDialog } from '../../components/CollectionEditorDialog';

interface SettingsCollectionsTabProps {
  collections: TokenCollection[];
  setCollections: (collections: TokenCollection[]) => void;
  newCollection: Partial<TokenCollection>;
  setNewCollection: (c: Partial<TokenCollection>) => void;
  handleAddCollection: () => void;
  handleDeleteCollection: (id: string) => void;
  resolvedValueTypes: { id: string; displayName: string }[];
}

export function SettingsCollectionsTab({
  collections,
  setCollections,
  newCollection,
  setNewCollection,
  handleAddCollection,
  handleDeleteCollection,
  resolvedValueTypes
}: SettingsCollectionsTabProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCollection, setEditingCollection] = React.useState<TokenCollection | null>(null);
  const [isNew, setIsNew] = React.useState(false);

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
      setCollections([...collections, collection]);
    } else {
      setCollections(collections.map(c => c.id === collection.id ? collection : c));
    }
    setDialogOpen(false);
  };

  // Close dialog
  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Button variant="contained" color="primary" onClick={handleOpenCreate}>
          Create new collection
        </Button>
      </Box>
      <Typography variant="h6" gutterBottom>
        Existing Collections
      </Typography>
      {collections.map((collection) => (
        <Paper key={collection.id} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1">{collection.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={() => handleOpenEdit(collection)}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => handleDeleteCollection(collection.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
          {Array.isArray(resolvedValueTypes) ? (
            <Typography variant="body2" color="text.secondary">
              Value Types: {(() => {
                const ids = Array.isArray((collection as any).resolvedValueTypeIds)
                  ? (collection as any).resolvedValueTypeIds
                  : Array.isArray((collection as any).resolvedValueTypes)
                    ? (collection as any).resolvedValueTypes
                    : [];
                return ids.map((id: string) => {
                  const vt = resolvedValueTypes.find(v => v.id === id);
                  return vt ? vt.displayName : id;
                }).join(', ');
              })()}
            </Typography>
          ) : (
            <Typography variant="body2" color="error">
              Error: No resolved value types available. Please select resolved value types for this collection in the editor above.
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Mode Priority: {Array.isArray(collection.modeResolutionStrategy?.priorityByType)
              ? collection.modeResolutionStrategy?.priorityByType.join(' > ')
              : 'None'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fallback Strategy: {collection.modeResolutionStrategy?.fallbackStrategy || 'None'}
          </Typography>
        </Paper>
      ))}
      <CollectionEditorDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        collection={editingCollection}
        resolvedValueTypes={resolvedValueTypes}
        isNew={isNew}
      />
    </>
  );
} 