import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Chip
} from '@mui/material';
import { Delete, Add, Edit } from '@mui/icons-material';
import type { Dimension, Mode } from '@token-model/data-model';
import { createUniqueId } from '../utils/id';

interface DimensionsEditorProps {
  dimensions: Dimension[];
  onChange: (dimensions: Dimension[]) => void;
}

export function DimensionsEditor({ dimensions, onChange }: DimensionsEditorProps) {
  const [editedDimensions, setEditedDimensions] = useState<Dimension[]>(dimensions);
  const [editingDimension, setEditingDimension] = useState<Dimension | null>(null);
  const [editingMode, setEditingMode] = useState<{ dimensionId: string; mode: Mode } | null>(null);
  const [isNewDimension, setIsNewDimension] = useState(false);
  const [isNewMode, setIsNewMode] = useState(false);

  useEffect(() => {
    onChange(editedDimensions);
  }, [editedDimensions, onChange]);

  // Ensure a new ID is generated every time the add dialog is opened for a new dimension
  useEffect(() => {
    if (editingDimension && isNewDimension && !editingDimension.id) {
      setEditingDimension(prev => prev ? { ...prev, id: createUniqueId('dimension') } : null);
    }
  }, [editingDimension, isNewDimension]);

  const handleAddDimension = () => {
    const newDimension: Dimension = {
      id: createUniqueId('dimension'),
      type: 'COLOR_SCHEME', // Default type, can be changed in the UI
      displayName: '',
      description: '',
      modes: [],
      defaultMode: '',
      required: false
    };
    setEditingDimension(newDimension);
    setIsNewDimension(true);
  };

  const handleAddMode = (dimensionId: string) => {
    const newMode: Mode = {
      id: createUniqueId('mode'),
      name: '',
      dimensionId,
      description: ''
    };
    setEditingMode({ dimensionId, mode: newMode });
    setIsNewMode(true);
  };

  const handleDeleteDimension = (dimensionId: string) => {
    setEditedDimensions(prev => prev.filter(d => d.id !== dimensionId));
  };

  const handleDeleteMode = (dimensionId: string, modeId: string) => {
    setEditedDimensions(prev =>
      prev.map(dim => {
        if (dim.id !== dimensionId) return dim;
        const updatedModes = dim.modes.filter(m => m.id !== modeId);
        return {
          ...dim,
          modes: updatedModes,
          defaultMode: dim.defaultMode === modeId ? updatedModes[0]?.id || '' : dim.defaultMode
        };
      })
    );
  };

  const handleSaveDimension = () => {
    if (!editingDimension) return;

    if (isNewDimension) {
      setEditedDimensions(prev => [...prev, editingDimension]);
    } else {
      setEditedDimensions(prev =>
        prev.map(d => (d.id === editingDimension.id ? editingDimension : d))
      );
    }
    setEditingDimension(null);
    setIsNewDimension(false);
  };

  const handleSaveMode = () => {
    if (!editingMode) return;

    setEditedDimensions(prev =>
      prev.map(dim => {
        if (dim.id !== editingMode.dimensionId) return dim;

        const updatedModes = isNewMode
          ? [...dim.modes, editingMode.mode]
          : dim.modes.map(m => (m.id === editingMode.mode.id ? editingMode.mode : m));

        // If this is the first mode or the default mode was deleted, set it as default
        const defaultMode = dim.defaultMode && updatedModes.some(m => m.id === dim.defaultMode)
          ? dim.defaultMode
          : updatedModes[0]?.id || '';

        return {
          ...dim,
          modes: updatedModes,
          defaultMode
        };
      })
    );

    setEditingMode(null);
    setIsNewMode(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Dimensions</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddDimension}
        >
          Add Dimension
        </Button>
      </Box>

      <List>
        {editedDimensions.map(dimension => (
          <ListItem
            key={dimension.id}
            sx={{
              flexDirection: 'column',
              alignItems: 'stretch',
              bgcolor: 'background.paper',
              mb: 2,
              borderRadius: 1
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1">{dimension.displayName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {dimension.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ID: {dimension.id}
                </Typography>
              </Box>
              <Box>
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingDimension(dimension);
                    setIsNewDimension(false);
                  }}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteDimension(dimension.id)}
                >
                  <Delete />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ mt: 2, width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Modes</Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => handleAddMode(dimension.id)}
                >
                  Add Mode
                </Button>
              </Box>
              <List dense>
                {dimension.modes.map(mode => (
                  <ListItem key={mode.id}>
                    <ListItemText
                      primary={mode.name}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {mode.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {mode.id}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingMode({ dimensionId: dimension.id, mode });
                          setIsNewMode(false);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteMode(dimension.id, mode.id)}
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          </ListItem>
        ))}
      </List>

      {/* Dimension Editor Dialog */}
      <Dialog open={!!editingDimension} onClose={() => setEditingDimension(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{isNewDimension ? 'Add Dimension' : 'Edit Dimension'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Dimension ID"
              value={editingDimension?.id || ''}
              disabled
              fullWidth
              helperText="Dimension IDs are automatically generated and cannot be edited"
            />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={editingDimension?.type || 'COLOR_SCHEME'}
                label="Type"
                onChange={(e) => setEditingDimension(prev => prev ? { ...prev, type: e.target.value as Dimension['type'] } : null)}
              >
                <MenuItem value="COLOR_SCHEME">Color Scheme</MenuItem>
                <MenuItem value="CONTRAST">Contrast</MenuItem>
                <MenuItem value="DEVICE_TYPE">Device Type</MenuItem>
                <MenuItem value="BRAND">Brand</MenuItem>
                <MenuItem value="THEME">Theme</MenuItem>
                <MenuItem value="MOTION">Motion</MenuItem>
                <MenuItem value="DENSITY">Density</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Display Name"
              value={editingDimension?.displayName || ''}
              onChange={(e) => setEditingDimension(prev => prev ? { ...prev, displayName: e.target.value } : null)}
              fullWidth
            />
            <TextField
              label="Description"
              value={editingDimension?.description || ''}
              onChange={(e) => setEditingDimension(prev => prev ? { ...prev, description: e.target.value } : null)}
              multiline
              rows={2}
              fullWidth
            />
            <FormControl>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography>Required:</Typography>
                <Chip
                  label={editingDimension?.required ? 'Yes' : 'No'}
                  color={editingDimension?.required ? 'success' : 'default'}
                  onClick={() => setEditingDimension(prev => prev ? { ...prev, required: !prev.required } : null)}
                  clickable
                />
              </Box>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingDimension(null)}>Cancel</Button>
          <Button onClick={handleSaveDimension} variant="contained">
            {isNewDimension ? 'Add Dimension' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mode Editor Dialog */}
      <Dialog open={!!editingMode} onClose={() => setEditingMode(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{isNewMode ? 'Add Mode' : 'Edit Mode'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Mode ID"
              value={editingMode?.mode.id || ''}
              disabled
              fullWidth
              helperText="Mode IDs are automatically generated and cannot be edited"
            />
            <TextField
              label="Name"
              value={editingMode?.mode.name || ''}
              onChange={(e) => setEditingMode(prev => prev ? { ...prev, mode: { ...prev.mode, name: e.target.value } } : null)}
              fullWidth
            />
            <TextField
              label="Description"
              value={editingMode?.mode.description || ''}
              onChange={(e) => setEditingMode(prev => prev ? { ...prev, mode: { ...prev.mode, description: e.target.value } } : null)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingMode(null)}>Cancel</Button>
          <Button onClick={handleSaveMode} variant="contained">
            {isNewMode ? 'Add Mode' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 