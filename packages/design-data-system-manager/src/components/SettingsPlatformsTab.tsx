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
  description?: string;
  syntaxPatterns?: {
    prefix?: string;
    suffix?: string;
    delimiter?: string;
    capitalization?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    formatString?: string;
  };
}

export const SettingsPlatformsTab: React.FC = () => {
  const { schema, updateSchema } = useSchema();
  const [newPlatformName, setNewPlatformName] = React.useState('');

  const handleUpdatePlatform = (
    platformId: string,
    field: keyof NonNullable<Platform['syntaxPatterns']>,
    value: string
  ) => {
    updateSchema({
      ...schema,
      platforms: (schema.platforms || []).map((p: Platform) =>
        p.id === platformId
          ? {
              ...p,
              syntaxPatterns: {
                ...p.syntaxPatterns,
                [field]: value
              }
            }
          : p
      )
    });
  };

  const handleAddPlatform = () => {
    if (!newPlatformName.trim()) return;
    const newId = newPlatformName.trim().replace(/\s+/g, '_').toLowerCase();
    if (schema.platforms?.some((p: Platform) => p.id === newId)) return;
    const newPlatform: Platform = {
      id: newId,
      displayName: newPlatformName.trim(),
      syntaxPatterns: {
        prefix: '',
        suffix: '',
        delimiter: '_',
        capitalization: 'none',
        formatString: ''
      }
    };
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
              <TableCell>Suffix</TableCell>
              <TableCell>Delimiter</TableCell>
              <TableCell>Capitalization</TableCell>
              <TableCell>Format String</TableCell>
              <TableCell>Preview</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(schema.platforms || []).map((platform: Platform) => {
              const syntax = platform.syntaxPatterns || {};
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
                      value={syntax.prefix ?? ''}
                      onChange={e => handleUpdatePlatform(platform.id, 'prefix', e.target.value)}
                      placeholder="e.g., TKN_"
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={syntax.suffix ?? ''}
                      onChange={e => handleUpdatePlatform(platform.id, 'suffix', e.target.value)}
                      placeholder="e.g., _SUF"
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={syntax.delimiter ?? ''}
                        onChange={e => handleUpdatePlatform(platform.id, 'delimiter', e.target.value)}
                      >
                        <MenuItem value="">None (no delimiter)</MenuItem>
                        <MenuItem value="_">Underscore (_)</MenuItem>
                        <MenuItem value="-">Hyphen (-)</MenuItem>
                        <MenuItem value=".">Dot (.)</MenuItem>
                        <MenuItem value="/">Forward slash (/)</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={syntax.capitalization ?? 'none'}
                        onChange={e => handleUpdatePlatform(platform.id, 'capitalization', e.target.value)}
                      >
                        <MenuItem value="none">None</MenuItem>
                        <MenuItem value="uppercase">UPPERCASE</MenuItem>
                        <MenuItem value="lowercase">lowercase</MenuItem>
                        <MenuItem value="capitalize">Capitalize</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={syntax.formatString ?? ''}
                      onChange={e => handleUpdatePlatform(platform.id, 'formatString', e.target.value)}
                      placeholder="e.g., {prefix}{name}{suffix}"
                    />
                  </TableCell>
                  <TableCell>
                    {(() => {
                      // Example token name parts
                      const exampleParts = ['primary', 'color', 'background'];
                      let name = exampleParts.join(syntax.delimiter ?? '_');
                      switch (syntax.capitalization) {
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
                      let preview = `${syntax.prefix ?? ''}${name}${syntax.suffix ?? ''}`;
                      if (syntax.formatString) {
                        preview = syntax.formatString
                          .replace('{prefix}', syntax.prefix ?? '')
                          .replace('{name}', name)
                          .replace('{suffix}', syntax.suffix ?? '');
                      }
                      return preview;
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