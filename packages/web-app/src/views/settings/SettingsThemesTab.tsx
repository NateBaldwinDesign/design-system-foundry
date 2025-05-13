import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { StorageService } from '../../services/storage';

interface SettingsThemesTabProps {
  themes: any[];
  setThemes: (themes: any[]) => void;
}

export function SettingsThemesTab({ themes, setThemes }: SettingsThemesTabProps) {
  const [editTheme, setEditTheme] = useState<any | null>(null);
  const [editThemeFields, setEditThemeFields] = useState<any | null>(null);

  // Local state for table (to allow editing before persisting)
  const [themeList, setThemeList] = useState<any[]>(themes);
  // Keep themeList in sync with prop changes
  useEffect(() => {
    setThemeList(themes);
  }, [themes]);

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Themes
      </Typography>
      {/* Default Theme Picker */}
      <Box sx={{ mb: 2, maxWidth: 400 }}>
        <FormControl fullWidth>
          <InputLabel id="default-theme-label">Default Theme</InputLabel>
          <Select
            labelId="default-theme-label"
            value={themeList.find(t => t.isDefault)?.id || ''}
            label="Default Theme"
            onChange={e => {
              const selectedId = e.target.value;
              const updatedThemes = themeList.map(t => ({ ...t, isDefault: t.id === selectedId }));
              setThemeList(updatedThemes);
              setThemes(updatedThemes);
              StorageService.setThemes(updatedThemes);
            }}
          >
            {themeList.map(theme => (
              <MenuItem key={theme.id} value={theme.id}>{theme.displayName}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Paper sx={{ width: '100%', overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
          <Box component="thead">
            <Box component="tr">
              <Box component="th" sx={{ textAlign: 'left', p: 1 }}>ID</Box>
              <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Display Name</Box>
              <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Description</Box>
              <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Default</Box>
              <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Actions</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {themeList.map(theme => (
              <Box component="tr" key={theme.id}>
                <Box component="td" sx={{ p: 1 }}>{theme.id}</Box>
                <Box component="td" sx={{ p: 1 }}>{theme.displayName}</Box>
                <Box component="td" sx={{ p: 1 }}>{theme.description || ''}</Box>
                <Box component="td" sx={{ p: 1 }}>
                  {theme.isDefault ? (
                    <Chip label="Default" color="success" size="small" />
                  ) : ''}
                </Box>
                <Box component="td" sx={{ p: 1 }}>
                  <IconButton onClick={() => { setEditTheme(theme); setEditThemeFields({ ...theme }); }} size="small">
                    <EditIcon />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>
      {/* Edit Theme Dialog */}
      {editTheme && (
        <Dialog open={!!editTheme} onClose={() => setEditTheme(null)}>
          <DialogTitle>Edit Theme</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
            <TextField
              label="Display Name"
              value={editThemeFields.displayName}
              onChange={e => setEditThemeFields({ ...editThemeFields, displayName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={editThemeFields.description || ''}
              onChange={e => setEditThemeFields({ ...editThemeFields, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditTheme(null)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                let updatedThemes = themeList.map(t =>
                  t.id === editTheme.id ? { ...t, ...editThemeFields } : t
                );
                setThemeList(updatedThemes);
                setThemes(updatedThemes);
                StorageService.setThemes(updatedThemes);
                setEditTheme(null);
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
} 