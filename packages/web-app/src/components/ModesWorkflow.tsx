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
  Chip,
  FormHelperText
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import type { Mode, TokenCollection } from '@token-model/data-model';

interface ModesWorkflowProps {
  modes: Mode[];
  collections: TokenCollection[];
  onUpdate: (modes: Mode[]) => void;
}

export function ModesWorkflow({ modes, collections, onUpdate }: ModesWorkflowProps) {
  const [editingMode, setEditingMode] = useState<Mode | null>(null);
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }

    const newMode: Mode = {
      id: editingMode?.id || crypto.randomUUID(),
      name: name.trim(),
      dimensionId: editingMode?.dimensionId || crypto.randomUUID()
    };

    if (editingMode) {
      onUpdate(modes.map(m => m.id === editingMode.id ? newMode : m));
    } else {
      onUpdate([...modes, newMode]);
    }

    resetForm();
  };

  const handleEdit = (mode: Mode) => {
    setEditingMode(mode);
    setName(mode.name);
  };

  const handleDelete = (id: string) => {
    onUpdate(modes.filter(m => m.id !== id));
  };

  const resetForm = () => {
    setEditingMode(null);
    setName('');
    setErrors({});
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {editingMode ? 'Edit Mode' : 'Create New Mode'}
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

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
          >
            {editingMode ? 'Update Mode' : 'Create Mode'}
          </Button>
          {editingMode && (
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
        Modes
      </Typography>

      <List>
        {modes.map((mode) => (
          <ListItem
            key={mode.id}
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
                  <Typography variant="h6">{mode.name}</Typography>
                </Box>
              }
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={() => handleEdit(mode)}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => handleDelete(mode.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
} 