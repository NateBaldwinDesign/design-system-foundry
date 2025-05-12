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
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Mode, TokenCollection } from '@token-model/data-model';

interface ModesWorkflowProps {
  modes: Mode[];
  setModes: (modes: Mode[]) => void;
  tokenCollections: TokenCollection[];
}

export default function ModesWorkflow({
  modes,
  setModes,
  tokenCollections,
}: ModesWorkflowProps) {
  const [newMode, setNewMode] = useState<Partial<Mode>>({
    name: '',
    dimensionId: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleAddMode = () => {
    setFieldErrors({});
    try {
      const mode: Mode = {
        id: crypto.randomUUID(),
        name: newMode.name || '',
        dimensionId: newMode.dimensionId || '',
      };
      setModes([...modes, mode]);
      setNewMode({
        name: '',
        dimensionId: '',
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
            Add New Mode
          </Typography>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={newMode.name}
              onChange={(e) => setNewMode({ ...newMode, name: e.target.value })}
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name}
            />
            <FormControl fullWidth error={Boolean(fieldErrors.dimensionId)}>
              <InputLabel>Dimension</InputLabel>
              <Select
                value={newMode.dimensionId || ''}
                label="Dimension"
                onChange={(e) => setNewMode({ ...newMode, dimensionId: e.target.value })}
              >
                {tokenCollections.map((collection) => (
                  <MenuItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </MenuItem>
                ))}
              </Select>
              {fieldErrors.dimensionId && (
                <Typography color="error" variant="caption">
                  {fieldErrors.dimensionId}
                </Typography>
              )}
            </FormControl>
            {fieldErrors.general && (
              <Typography color="error">{fieldErrors.general}</Typography>
            )}
            <Button variant="contained" onClick={handleAddMode}>
              Add Mode
            </Button>
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Modes List
          </Typography>
          <List>
            {modes.map((mode) => {
              const collection = tokenCollections.find(c => c.id === mode.dimensionId);
              return (
                <ListItem key={mode.id}>
                  <ListItemText
                    primary={mode.name}
                    secondary={
                      <>
                        <div>Dimension: {collection?.name || 'Unknown'}</div>
                      </>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      </Grid>
    </Grid>
  );
} 