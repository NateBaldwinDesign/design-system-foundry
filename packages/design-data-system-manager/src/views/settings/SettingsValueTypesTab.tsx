import React, { useState } from 'react';
import { Box, Typography, Chip, TextField, Button, Stack, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

const ENUM_VALUE_TYPE_OPTIONS = [
  'color',
  'dimension',
  'spacing',
  'fontFamily',
  'fontWeight',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'duration',
  'cubicBezier',
  'blur',
  'spread',
  'radius',
];

interface SettingsValueTypesTabProps {
  resolvedValueTypes?: { id: string; displayName: string }[];
  setResolvedValueTypes: (types: { id: string; displayName: string }[]) => void;
}

export function SettingsValueTypesTab({ resolvedValueTypes = [], setResolvedValueTypes }: SettingsValueTypesTabProps) {
  const [selectedId, setSelectedId] = useState('');
  const [customId, setCustomId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const id = selectedId === '__custom__' ? customId.trim() : selectedId;
    if (!id || !newDisplayName.trim()) {
      setError('Both ID and Display Name are required.');
      return;
    }
    if (resolvedValueTypes.some(vt => vt.id === id)) {
      setError('ID must be unique.');
      return;
    }
    setResolvedValueTypes([...resolvedValueTypes, { id, displayName: newDisplayName }]);
    setSelectedId('');
    setCustomId('');
    setNewDisplayName('');
    setError('');
  };

  const handleDelete = (id: string) => {
    setResolvedValueTypes(resolvedValueTypes.filter(vt => vt.id !== id));
  };

  const availableOptions = ENUM_VALUE_TYPE_OPTIONS.filter(
    opt => !resolvedValueTypes.some(vt => vt.id === opt)
  );

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Value Types
      </Typography>
      <Typography>
        Currently supported value types:
      </Typography>
      <Box sx={{ mt: 2, mb: 2 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {resolvedValueTypes.map(vt => (
            <Chip
              key={vt.id}
              label={`${vt.displayName} (${vt.id})`}
              onDelete={() => handleDelete(vt.id)}
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>
      </Box>
      <Typography variant="subtitle1" sx={{ mt: 2 }}>
        Add a new value type
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 1, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={selectedId}
            label="Type"
            onChange={e => setSelectedId(e.target.value)}
          >
            {availableOptions.map(opt => (
              <MenuItem key={opt} value={opt}>{opt}</MenuItem>
            ))}
            <MenuItem value="__custom__">Custom...</MenuItem>
          </Select>
        </FormControl>
        {selectedId === '__custom__' && (
          <TextField
            label="Custom ID"
            value={customId}
            onChange={e => setCustomId(e.target.value)}
            size="small"
            sx={{ minWidth: 120 }}
          />
        )}
        <TextField
          label="Display Name"
          value={newDisplayName}
          onChange={e => setNewDisplayName(e.target.value)}
          size="small"
        />
        <Button variant="contained" onClick={handleAdd} size="small">
          Add
        </Button>
      </Box>
      {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
    </>
  );
} 