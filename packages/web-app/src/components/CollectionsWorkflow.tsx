import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { TokenCollection, Mode, DimensionType, FallbackStrategy, ResolvedValueType } from '@token-model/data-model';

interface CollectionsWorkflowProps {
  collections: TokenCollection[];
  modes: Mode[];
  onUpdate: (collections: TokenCollection[]) => void;
}

export function CollectionsWorkflow({ collections, modes, onUpdate }: CollectionsWorkflowProps) {
  const [editingCollection, setEditingCollection] = useState<TokenCollection | null>(null);
  const [name, setName] = useState('');
  const [resolvedValueTypes, setResolvedValueTypes] = useState<string[]>([]);
  const [private_, setPrivate] = useState(false);
  const [defaultModeIds, setDefaultModeIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }

    const newCollection: TokenCollection = {
      id: editingCollection?.id || crypto.randomUUID(),
      name: name.trim(),
      resolvedValueTypes: resolvedValueTypes as ResolvedValueType[],
      private: private_,
      defaultModeIds,
      modeResolutionStrategy: {
        priorityByType: [],
        fallbackStrategy: 'MOST_SPECIFIC_MATCH'
      }
    };

    if (editingCollection) {
      onUpdate(collections.map(c => c.id === editingCollection.id ? newCollection : c));
    } else {
      onUpdate([...collections, newCollection]);
    }

    resetForm();
  };

  const handleEdit = (collection: TokenCollection) => {
    setEditingCollection(collection);
    setName(collection.name);
    setResolvedValueTypes(collection.resolvedValueTypes as string[]);
    setPrivate(collection.private);
    setDefaultModeIds(collection.defaultModeIds ?? []);
  };

  const handleDelete = (id: string) => {
    onUpdate(collections.filter(c => c.id !== id));
  };

  const resetForm = () => {
    setEditingCollection(null);
    setName('');
    setResolvedValueTypes([]);
    setPrivate(false);
    setDefaultModeIds([]);
    setErrors({});
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {editingCollection ? 'Edit Collection' : 'Create New Collection'}
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4 }}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
          fullWidth
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Resolved Value Types</InputLabel>
          <Select
            multiple
            value={resolvedValueTypes}
            onChange={(e) => setResolvedValueTypes(e.target.value as string[])}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )}
          >
            <MenuItem value="COLOR">Color</MenuItem>
            <MenuItem value="FLOAT">Float</MenuItem>
            <MenuItem value="INTEGER">Integer</MenuItem>
            <MenuItem value="STRING">String</MenuItem>
            <MenuItem value="BOOLEAN">Boolean</MenuItem>
            <MenuItem value="ALIAS">Alias</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Default Modes</InputLabel>
          <Select
            multiple
            value={defaultModeIds}
            onChange={(e) => setDefaultModeIds(e.target.value as string[])}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((modeId) => {
                  const mode = modes.find(m => m.id === modeId);
                  return (
                    <Chip key={modeId} label={mode?.name || modeId} />
                  );
                })}
              </Box>
            )}
          >
            {modes.map((mode) => (
              <MenuItem key={mode.id} value={mode.id}>
                {mode.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
          >
            {editingCollection ? 'Update Collection' : 'Create Collection'}
          </Button>
          {editingCollection && (
            <Button
              variant="outlined"
              onClick={resetForm}
            >
              Cancel
            </Button>
          )}
        </Box>
      </Box>

      <Typography variant="h6" gutterBottom>
        Collections
      </Typography>

      <List>
        {collections.map((collection) => (
          <ListItem
            key={collection.id}
            sx={{
              border: '1px solid #eee',
              borderRadius: 1,
              mb: 1,
              '&:hover': {
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">{collection.name}</Typography>
                  {collection.private && (
                    <Chip
                      label="Private"
                      size="small"
                      color="default"
                    />
                  )}
                </Box>
              }
              secondary={
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Value Types: {collection.resolvedValueTypes.join(', ')}
                  </Typography>
                  {collection.defaultModeIds && collection.defaultModeIds.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Default Modes: {collection.defaultModeIds?.map(id => {
                        const mode = modes.find(m => m.id === id);
                        return mode?.name || id;
                      }).join(', ')}
                    </Typography>
                  )}
                </Box>
              }
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={() => handleEdit(collection)}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => handleDelete(collection.id)}>
                Delete
              </IconButton>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
} 