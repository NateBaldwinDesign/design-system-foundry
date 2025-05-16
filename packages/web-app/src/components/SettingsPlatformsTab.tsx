import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Button
} from '@mui/material';
import { Delete, Add } from '@mui/icons-material';
import { useSchema, ExportConfiguration } from '../hooks/useSchema';

interface Platform {
  id: string;
  displayName: string;
}

export const SettingsPlatformsTab: React.FC = () => {
  const { schema, updateSchema } = useSchema();
  const [newPlatformName, setNewPlatformName] = React.useState('');

  const handleUpdateConfiguration = (
    platformId: string,
    field: keyof ExportConfiguration,
    value: string
  ) => {
    const currentConfig = schema.exportConfigurations?.[platformId] as ExportConfiguration | undefined;
    if (!currentConfig) {
      const updatedConfigurations = {
        ...schema.exportConfigurations,
        [platformId]: {
          prefix: '',
          delimiter: '_',
          capitalization: 'none' as const,
          [field]: value,
        },
      };
      updateSchema({
        ...schema,
        exportConfigurations: updatedConfigurations,
      });
      return;
    }
    const updatedConfigurations = {
      ...schema.exportConfigurations,
      [platformId]: {
        ...currentConfig,
        [field]: value,
      },
    };
    updateSchema({
      ...schema,
      exportConfigurations: updatedConfigurations,
    });
  };

  const handleAddPlatform = () => {
    if (!newPlatformName.trim()) return;
    const newId = newPlatformName.trim().replace(/\s+/g, '_').toLowerCase();
    if (schema.platforms?.some((p: Platform) => p.id === newId)) return;
    const newPlatform: Platform = { id: newId, displayName: newPlatformName.trim() };
    updateSchema({
      ...schema,
      platforms: [...(schema.platforms || []), newPlatform],
    });
    setNewPlatformName('');
  };

  const handleDeletePlatform = (platformId: string) => {
    updateSchema({
      ...schema,
      platforms: (schema.platforms || []).filter((p: Platform) => p.id !== platformId),
      exportConfigurations: Object.fromEntries(
        Object.entries(schema.exportConfigurations || {}).filter(([id]) => id !== platformId)
      ),
    });
  };

  const handleEditPlatformName = (platformId: string, newName: string) => {
    updateSchema({
      ...schema,
      platforms: (schema.platforms || []).map((p: Platform) =>
        p.id === platformId ? { ...p, displayName: newName } : p
      ),
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <TextField
          size="small"
          label="New Platform Name"
          value={newPlatformName}
          onChange={e => setNewPlatformName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddPlatform(); }}
        />
        <Button variant="contained" onClick={handleAddPlatform} startIcon={<Add />}>Add Platform</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Platform Name</TableCell>
              <TableCell>Prefix</TableCell>
              <TableCell>Delimiter</TableCell>
              <TableCell>Capitalization</TableCell>
              <TableCell>Preview</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(schema.platforms || []).map((platform: Platform) => {
              const config = schema.exportConfigurations?.[platform.id] as ExportConfiguration | undefined;
              return (
                <TableRow key={platform.id}>
                  <TableCell>
                    <TextField
                      size="small"
                      value={platform.displayName}
                      onChange={e => handleEditPlatformName(platform.id, e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={config?.prefix ?? ''}
                      onChange={e => handleUpdateConfiguration(platform.id, 'prefix', e.target.value)}
                      placeholder="e.g., TKN_"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={config?.delimiter ?? '_'}
                      onChange={e => handleUpdateConfiguration(platform.id, 'delimiter', e.target.value)}
                      placeholder="e.g., _"
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={config?.capitalization ?? 'none'}
                        onChange={e => handleUpdateConfiguration(platform.id, 'capitalization', e.target.value)}
                      >
                        <MenuItem value="none">None</MenuItem>
                        <MenuItem value="uppercase">UPPERCASE</MenuItem>
                        <MenuItem value="lowercase">lowercase</MenuItem>
                        <MenuItem value="capitalize">Capitalize</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      // Example token name parts
                      const exampleParts = ['primary', 'color', 'background'];
                      let name = exampleParts.join(config?.delimiter ?? '_');
                      switch (config?.capitalization) {
                        case 'uppercase':
                          name = name.toUpperCase();
                          break;
                        case 'lowercase':
                          name = name.toLowerCase();
                          break;
                        case 'capitalize':
                          name = name.replace(/\b\w/g, c => c.toUpperCase());
                          break;
                        default:
                          break;
                      }
                      return `${config?.prefix ?? ''}${name}`;
                    })()}
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleDeletePlatform(platform.id)} color="error">
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}; 