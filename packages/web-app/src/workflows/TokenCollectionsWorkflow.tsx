import { useState } from 'react';
import {
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';
import { TokenCollection, DimensionType, FallbackStrategy, ResolvedValueType } from '@token-model/data-model';

interface TokenCollectionsWorkflowProps {
  tokenCollections: TokenCollection[];
  setTokenCollections: (collections: TokenCollection[]) => void;
}

const defaultModeResolutionStrategy = {
  priorityByType: [] as DimensionType[],
  fallbackStrategy: 'MOST_SPECIFIC_MATCH' as FallbackStrategy,
};

export default function TokenCollectionsWorkflow({
  tokenCollections,
  setTokenCollections,
}: TokenCollectionsWorkflowProps) {
  const [newCollection, setNewCollection] = useState<Partial<TokenCollection>>({
    name: '',
    resolvedValueTypes: [] as ResolvedValueType[],
    private: false,
    defaultModeIds: [],
    modeResolutionStrategy: defaultModeResolutionStrategy,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleAddCollection = () => {
    setFieldErrors({});
    try {
      const collection: TokenCollection = {
        id: crypto.randomUUID(),
        name: newCollection.name || '',
        resolvedValueTypes: (newCollection.resolvedValueTypes || []).filter(Boolean) as ResolvedValueType[],
        private: newCollection.private || false,
        defaultModeIds: (newCollection.defaultModeIds || []).filter(Boolean),
        modeResolutionStrategy: {
          priorityByType: (newCollection.modeResolutionStrategy?.priorityByType || []).filter(Boolean) as DimensionType[],
          fallbackStrategy: newCollection.modeResolutionStrategy?.fallbackStrategy || 'MOST_SPECIFIC_MATCH',
        },
      };
      setTokenCollections([...tokenCollections, collection]);
      setNewCollection({
        name: '',
        resolvedValueTypes: [] as ResolvedValueType[],
        private: false,
        defaultModeIds: [],
        modeResolutionStrategy: defaultModeResolutionStrategy,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        setFieldErrors({ general: error.message });
      } else {
        setFieldErrors({ general: 'An unexpected error occurred.' });
      }
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Add New Token Collection
          </Typography>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={newCollection.name}
              onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name}
            />
            <TextField
              label="Resolved Value Types (comma separated)"
              value={(newCollection.resolvedValueTypes || []).join(',')}
              onChange={(e) => setNewCollection({ ...newCollection, resolvedValueTypes: e.target.value.split(',').map((v) => v.trim()) as ResolvedValueType[] })}
              error={Boolean(fieldErrors.resolvedValueTypes)}
              helperText={fieldErrors.resolvedValueTypes}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!newCollection.private}
                  onChange={(e) => setNewCollection({ ...newCollection, private: e.target.checked })}
                />
              }
              label="Private"
            />
            <TextField
              label="Default Mode IDs (comma separated)"
              value={(newCollection.defaultModeIds || []).join(',')}
              onChange={(e) => setNewCollection({ ...newCollection, defaultModeIds: e.target.value.split(',').map((v) => v.trim()) })}
              error={Boolean(fieldErrors.defaultModeIds)}
              helperText={fieldErrors.defaultModeIds}
            />
            <TextField
              label="Mode Resolution Priority By Type (comma separated)"
              value={(newCollection.modeResolutionStrategy?.priorityByType || []).join(',')}
              onChange={(e) => setNewCollection({
                ...newCollection,
                modeResolutionStrategy: {
                  priorityByType: e.target.value.split(',').map((v) => v.trim()) as DimensionType[],
                  fallbackStrategy: newCollection.modeResolutionStrategy?.fallbackStrategy || 'MOST_SPECIFIC_MATCH',
                },
              })}
              error={Boolean(fieldErrors['modeResolutionStrategy'])}
              helperText={fieldErrors['modeResolutionStrategy']}
            />
            <TextField
              label="Mode Resolution Fallback Strategy"
              value={newCollection.modeResolutionStrategy?.fallbackStrategy || ''}
              onChange={(e) => setNewCollection({
                ...newCollection,
                modeResolutionStrategy: {
                  priorityByType: newCollection.modeResolutionStrategy?.priorityByType || [],
                  fallbackStrategy: e.target.value as FallbackStrategy,
                },
              })}
              error={Boolean(fieldErrors['modeResolutionStrategy'])}
              helperText={fieldErrors['modeResolutionStrategy']}
            />
            {fieldErrors.general && (
              <Typography color="error">{fieldErrors.general}</Typography>
            )}
            <Button variant="contained" onClick={handleAddCollection}>
              Add Collection
            </Button>
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Token Collections List
          </Typography>
          <List>
            {tokenCollections.map((collection) => (
              <ListItem key={collection.id}>
                <ListItemText
                  primary={collection.name}
                  secondary={
                    <>
                      <div>Resolved Value Types: {collection.resolvedValueTypes.join(', ')}</div>
                      <div>Private: {collection.private ? 'Yes' : 'No'}</div>
                      <div>Default Mode IDs: {collection.defaultModeIds?.join(', ') || 'None'}</div>
                      <div>Mode Resolution Strategy: Priority By Type: {collection.modeResolutionStrategy?.priorityByType.join(', ') || 'None'}, Fallback: {collection.modeResolutionStrategy?.fallbackStrategy || 'None'}</div>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Grid>
    </Grid>
  );
} 