import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  IconButton,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import type { Dimension, Mode, DimensionType } from '@token-model/data-model';
import { generateId, ID_PREFIXES } from '../utils/id';

interface DimensionsWorkflowProps {
  dimensions: Dimension[];
  setDimensions: (dims: Dimension[]) => void;
  modes: Mode[];
  setModes: (modes: Mode[]) => void;
}

const DIMENSION_TYPES: DimensionType[] = [
  'COLOR_SCHEME',
  'CONTRAST',
  'DEVICE_TYPE',
  'BRAND',
  'THEME',
  'MOTION',
  'DENSITY'
];

interface DimensionFormData {
  id: string;
  type: DimensionType;
  displayName: string;
  description: string;
  modes: Mode[];
}

export function DimensionsWorkflow({ dimensions, setDimensions, modes, setModes }: DimensionsWorkflowProps) {
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<DimensionFormData>({
    id: '',
    type: 'COLOR_SCHEME',
    displayName: '',
    description: '',
    modes: []
  });
  const [modeForm, setModeForm] = useState({ id: '', name: '', description: '' });
  const [modeDialogOpen, setModeDialogOpen] = useState(false);
  const [modeEditIndex, setModeEditIndex] = useState<number | null>(null);
  const [newModeName, setNewModeName] = useState('');

  const handleOpen = (index: number | null = null) => {
    setEditingIndex(index);
    if (index !== null) {
      const dim = dimensions[index];
      setForm({
        id: dim.id,
        type: dim.type,
        displayName: dim.displayName,
        description: dim.description || '',
        modes: dim.modes
      });
    } else {
      setForm({
        id: '',
        type: 'COLOR_SCHEME',
        displayName: '',
        description: '',
        modes: []
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIndex(null);
  };

  const handleFormChange = (field: keyof DimensionFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.id || !form.displayName) return;
    const newDims = [...dimensions];
    const dimToSave = {
      ...form,
      modes: form.modes || []
    } as Dimension;
    if (editingIndex !== null) {
      newDims[editingIndex] = dimToSave;
    } else {
      newDims.push(dimToSave);
    }
    setDimensions(newDims);
    setOpen(false);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    setDimensions(dimensions.filter((_, i) => i !== index));
  };

  // Mode management for a dimension
  const handleModeDialogOpen = (index: number | null = null) => {
    setModeEditIndex(index);
    if (index !== null && form.modes) {
      const m = form.modes[index];
      setModeForm({ id: m.id, name: m.name, description: m.description || '' });
    } else {
      setModeForm({ id: '', name: '', description: '' });
    }
    setModeDialogOpen(true);
  };

  const handleModeDialogClose = () => {
    setModeDialogOpen(false);
    setModeEditIndex(null);
  };

  const handleModeFormChange = (field: keyof typeof modeForm, value: any) => {
    setModeForm(prev => ({ ...prev, [field]: value }));
  };

  const handleModeSave = () => {
    if (!modeForm.id || !modeForm.name) return;
    const newModes = form.modes ? [...form.modes] : [];
    if (modeEditIndex !== null) {
      newModes[modeEditIndex] = { ...modeForm, dimensionId: form.id! };
    } else {
      newModes.push({ ...modeForm, dimensionId: form.id! });
    }
    setForm(prev => ({ ...prev, modes: newModes }));
    setModeDialogOpen(false);
    setModeEditIndex(null);
  };

  const handleModeDelete = (index: number) => {
    setForm(prev => ({ ...prev, modes: (prev.modes || []).filter((_, i) => i !== index) }));
  };

  const handleAddDimension = () => {
    if (!form.type || !form.displayName) {
      return; // Don't add if required fields are missing
    }
    const newDimension: Dimension = {
      id: generateId(ID_PREFIXES.DIMENSION),
      type: form.type,
      displayName: form.displayName,
      description: form.description,
      modes: form.modes
    };
    setDimensions([...dimensions, newDimension]);
    handleClose();
  };

  const handleAddMode = (dimensionId: string) => {
    if (!newModeName) {
      return; // Don't add if name is missing
    }
    const newMode: Mode = {
      id: generateId(ID_PREFIXES.MODE),
      name: newModeName,
      dimensionId
    };
    setModes([...modes, newMode]);
    setNewModeName('');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Dimensions</Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Button startIcon={<AddIcon />} onClick={() => handleOpen(null)} variant="contained">
          Add Dimension
        </Button>
        <List>
          {dimensions.map((dim, i) => (
            <ListItem key={dim.id}>
              <ListItemText
                primary={`${dim.displayName} (${dim.type})`}
                secondary={
                  <>
                    Modes: {dim.modes.map(m => m.name).join(', ')}
                  </>
                }
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => handleOpen(i)}><EditIcon /></IconButton>
                <IconButton onClick={() => handleDelete(i)}><DeleteIcon /></IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIndex !== null ? 'Edit Dimension' : 'Add Dimension'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="ID"
                value={form.id}
                onChange={e => handleFormChange('id', e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Type</InputLabel>
                <Select
                  value={form.type}
                  label="Type"
                  onChange={e => handleFormChange('type', e.target.value)}
                >
                  {DIMENSION_TYPES.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Display Name"
                value={form.displayName}
                onChange={e => handleFormChange('displayName', e.target.value)}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={form.description}
                onChange={e => handleFormChange('description', e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={modeDialogOpen} onClose={handleModeDialogClose} maxWidth="xs" fullWidth>
        <DialogTitle>{modeEditIndex !== null ? 'Edit Mode' : 'Add Mode'}</DialogTitle>
        <DialogContent>
          <TextField
            label="ID"
            value={modeForm.id}
            onChange={e => handleModeFormChange('id', e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Name"
            value={modeForm.name}
            onChange={e => handleModeFormChange('name', e.target.value)}
            fullWidth
            required
            sx={{ mt: 2 }}
          />
          <TextField
            label="Description"
            value={modeForm.description}
            onChange={e => handleModeFormChange('description', e.target.value)}
            fullWidth
            multiline
            rows={2}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleModeDialogClose}>Cancel</Button>
          <Button onClick={handleModeSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 