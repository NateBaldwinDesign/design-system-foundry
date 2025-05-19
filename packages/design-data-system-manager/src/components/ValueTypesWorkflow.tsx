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
  FormHelperText
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';

interface ValueTypesWorkflowProps {
  valueTypes: string[];
  onUpdate: (valueTypes: string[]) => void;
}

export function ValueTypesWorkflow({ valueTypes, onUpdate }: ValueTypesWorkflowProps) {
  const [editingType, setEditingType] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!name.trim()) {
      setErrors({ name: 'Name is required' });
      return;
    }

    if (!type) {
      setErrors({ type: 'Type is required' });
      return;
    }

    const newType: string = name.trim();
    if (!newType) return;
    if (editingType) {
      onUpdate(valueTypes.map(t => t === editingType ? newType : t));
    } else {
      onUpdate([...valueTypes, newType]);
    }

    resetForm();
  };

  const handleEdit = (valueType: string) => {
    setEditingType(valueType);
  };

  const handleDelete = (valueType: string) => {
    onUpdate(valueTypes.filter(t => t !== valueType));
  };

  const resetForm = () => {
    setEditingType(null);
    setName('');
    setType('');
    setErrors({});
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {editingType ? 'Edit Value Type' : 'Create New Value Type'}
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
          <InputLabel>Type</InputLabel>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            error={!!errors.type}
          >
            <MenuItem value="COLOR">Color</MenuItem>
            <MenuItem value="FLOAT">Float</MenuItem>
            <MenuItem value="INTEGER">Integer</MenuItem>
            <MenuItem value="STRING">String</MenuItem>
            <MenuItem value="BOOLEAN">Boolean</MenuItem>
            <MenuItem value="ALIAS">Alias</MenuItem>
          </Select>
          {errors.type && (
            <FormHelperText error>{errors.type}</FormHelperText>
          )}
        </FormControl>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
          >
            {editingType ? 'Update Value Type' : 'Create Value Type'}
          </Button>
          {editingType && (
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
        Value Types
      </Typography>

      <List>
        {valueTypes.map((valueType) => (
          <ListItem key={valueType}>
            <ListItemText primary={valueType} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={() => handleEdit(valueType)}>
                <EditIcon />
              </IconButton>
              <IconButton onClick={() => handleDelete(valueType)}>
                <DeleteIcon />
              </IconButton>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
} 