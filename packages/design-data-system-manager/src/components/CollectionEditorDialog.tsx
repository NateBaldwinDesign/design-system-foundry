import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Checkbox,
  FormControlLabel
} from '@mui/material';
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

export function CollectionEditorDialog({ open, onClose, onSave, collection, valueTypes, isNew = false }: CollectionEditorDialogProps) {
  const [editedCollection, setEditedCollection] = useState<CollectionEditorFormState>({
    name: '',
    description: '',
    resolvedValueTypeIds: [],
    private: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (collection) {
        setEditedCollection({
          name: collection.name || '',
          description: collection.description || '',
          resolvedValueTypeIds: (collection as any).resolvedValueTypeIds || [],
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

  const handleChange = (field: keyof CollectionEditorFormState, value: any) => {
    setEditedCollection(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setErrors({});
    if (!editedCollection.name || !editedCollection.name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }
    if (!Array.isArray(editedCollection.resolvedValueTypeIds) || editedCollection.resolvedValueTypeIds.length === 0) {
      setErrors({ resolvedValueTypeIds: 'At least one value type is required' });
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isNew ? 'Create Collection' : 'Edit Collection'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            value={editedCollection.name || ''}
            onChange={e => handleChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
          />
          <TextField
            label="Description"
            value={editedCollection.description || ''}
            onChange={e => handleChange('description', e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <FormControl fullWidth error={!!errors.resolvedValueTypeIds}>
            <InputLabel>Resolved Value Types</InputLabel>
            <Select
              multiple
              value={editedCollection.resolvedValueTypeIds || []}
              onChange={e => handleChange('resolvedValueTypeIds', e.target.value)}
              renderValue={selected => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {Array.isArray(selected)
                    ? selected.map((id: string) => {
                        const vt = Array.isArray(valueTypes) ? valueTypes.find(v => v.id === id) : undefined;
                        return <Chip key={id} label={vt ? vt.displayName : id} />;
                      })
                    : null}
                </Box>
              )}
            >
              {Array.isArray(valueTypes) && valueTypes.length > 0 ? (
                valueTypes.map(vt => (
                  <MenuItem key={vt.id} value={vt.id}>{vt.displayName}</MenuItem>
                ))
              ) : (
                <MenuItem disabled value="">
                  {valueTypes === undefined
                    ? "No resolved value types available. Please configure them in the editor above."
                    : "No resolved value types found."}
                </MenuItem>
              )}
            </Select>
            {errors.resolvedValueTypeIds && (
              <Typography color="error" variant="caption">{errors.resolvedValueTypeIds}</Typography>
            )}
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={!!editedCollection.private}
                onChange={e => handleChange('private', e.target.checked)}
              />
            }
            label="Private"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {isNew ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 