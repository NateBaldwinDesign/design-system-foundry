import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

interface ValueTypeManagerProps {
  onSave: (valueTypes: string[]) => void;
}

export function ValueTypeManager({ onSave }: ValueTypeManagerProps) {
  const [valueTypes, setValueTypes] = useState<string[]>(['COLOR', 'FLOAT', 'INTEGER', 'STRING', 'BOOLEAN', 'ALIAS']);
  const [newValueType, setNewValueType] = useState('');

  const handleAddValueType = () => {
    if (newValueType && !valueTypes.includes(newValueType)) {
      const updatedTypes = [...valueTypes, newValueType];
      setValueTypes(updatedTypes);
      onSave(updatedTypes);
      setNewValueType('');
    }
  };

  const handleDeleteValueType = (type: string) => {
    const updatedTypes = valueTypes.filter(t => t !== type);
    setValueTypes(updatedTypes);
    onSave(updatedTypes);
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Value Types
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            label="New Value Type"
            value={newValueType}
            onChange={(e) => setNewValueType(e.target.value)}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleAddValueType}
            disabled={!newValueType || valueTypes.includes(newValueType)}
          >
            Add
          </Button>
        </Box>
        <List>
          {valueTypes.map((type) => (
            <ListItem
              key={type}
              secondaryAction={
                <IconButton edge="end" onClick={() => handleDeleteValueType(type)}>
                  <DeleteIcon />
                </IconButton>
              }
            >
              <ListItemText primary={type} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
} 