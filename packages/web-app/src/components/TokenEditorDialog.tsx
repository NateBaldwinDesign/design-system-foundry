import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  FormHelperText
} from '@mui/material';
import { ValueByModeTable } from './ValueByModeTable';
import { PlatformOverridesTable } from './PlatformOverridesTable';
import { TokenValuePicker } from './TokenValuePicker';
import { TaxonomyPicker } from './TaxonomyPicker';
import type { Token, TokenCollection, Mode, TokenValue, Dimension, Platform, Taxonomy } from '@token-model/data-model';

// Extend the Token type to include themeable
export type ExtendedToken = Token & { themeable?: boolean };

export interface TokenEditorDialogProps {
  token: ExtendedToken;
  tokens: ExtendedToken[];
  dimensions: Dimension[];
  modes: Mode[];
  platforms: Platform[];
  open: boolean;
  onClose: () => void;
  onSave: (token: ExtendedToken) => void;
  taxonomies: Taxonomy[];
}

export function TokenEditorDialog({ token, tokens, dimensions, modes, platforms, open, onClose, onSave, taxonomies }: TokenEditorDialogProps) {
  const [editedToken, setEditedToken] = useState<ExtendedToken & { constraints?: any[] }>(token);

  useEffect(() => {
    setEditedToken(token);
  }, [token, open]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedToken);
  };

  // ... (handlers for value changes, constraints, etc. can be added here as needed) ...

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Token: {token.displayName}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSave} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Display Name"
                value={editedToken.displayName}
                onChange={(e) => setEditedToken(prev => ({ ...prev, displayName: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Description"
                value={editedToken.description || ''}
                onChange={(e) => setEditedToken(prev => ({ ...prev, description: e.target.value }))}
                multiline
                rows={2}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editedToken.status || ''}
                  label="Status"
                  onChange={(e) => {
                    const allowed = ['experimental', 'stable', 'deprecated'];
                    const val = allowed.includes(e.target.value) ? e.target.value as 'experimental' | 'stable' | 'deprecated' : undefined;
                    setEditedToken(prev => ({ ...prev, status: val }));
                  }}
                >
                  <MenuItem value="experimental">Experimental</MenuItem>
                  <MenuItem value="stable">Stable</MenuItem>
                  <MenuItem value="deprecated">Deprecated</MenuItem>
                </Select>
              </FormControl>
              <FormControl>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>Private:</Typography>
                  <Chip
                    label={editedToken.private ? 'Yes' : 'No'}
                    color={editedToken.private ? 'default' : 'success'}
                    onClick={() => setEditedToken(prev => ({ ...prev, private: !prev.private }))}
                    clickable
                  />
                </Box>
              </FormControl>
              <FormControl>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography>Themeable:</Typography>
                  <Chip
                    label={editedToken.themeable ? 'Yes' : 'No'}
                    color={editedToken.themeable ? 'success' : 'default'}
                    onClick={() => setEditedToken(prev => ({ ...prev, themeable: !prev.themeable }))}
                    clickable
                  />
                </Box>
              </FormControl>
            </Box>
          </Box>

          {/* Taxonomies */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Taxonomies
            </Typography>
            <FormHelperText sx={{ mb: 2 }}>
              Select taxonomies and terms to categorize this token. Each taxonomy can only be selected once.
            </FormHelperText>
            <TaxonomyPicker
              taxonomies={Array.isArray(taxonomies) ? taxonomies : []}
              value={Array.isArray(editedToken.taxonomies) ? editedToken.taxonomies : []}
              onChange={newTaxonomies => setEditedToken(prev => ({ ...prev, taxonomies: newTaxonomies }))}
              disabled={!Array.isArray(taxonomies) || taxonomies.length === 0}
            />
          </Box>

          {/* Values by Mode */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Values by Mode
            </Typography>
            <ValueByModeTable
              valuesByMode={editedToken.valuesByMode}
              modes={modes}
              editable={true}
              onValueChange={(modeIndex, newValue) => setEditedToken(prev => ({
                ...prev,
                valuesByMode: prev.valuesByMode.map((item, i) =>
                  i === modeIndex ? { ...item, value: newValue } : item
                )
              }))}
              getValueEditor={() => null} // Implement as needed
              resolvedValueType={editedToken.resolvedValueType}
              tokens={tokens}
              constraints={(editedToken as any).constraints ?? []}
              excludeTokenId={editedToken.id}
            />
          </Box>

          {/* Platform Overrides */}
          <PlatformOverridesTable
            platforms={platforms}
            valuesByMode={editedToken.valuesByMode}
            modes={modes}
            getValueEditor={() => null} // Implement as needed
            onPlatformOverrideChange={() => {}} // Implement as needed
            resolvedValueType={editedToken.resolvedValueType}
            tokens={tokens}
            constraints={(editedToken as any).constraints ?? []}
            excludeTokenId={editedToken.id}
          />

          {/* Token Information */}
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>
              Token Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ minWidth: 120 }}>Token ID:</Typography>
                <Typography variant="body2">{editedToken.id}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="subtitle2" sx={{ minWidth: 120 }}>Value Type:</Typography>
                <Typography variant="body2">{editedToken.resolvedValueType}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" gutterBottom>Code Syntax:</Typography>
                {Object.entries(editedToken.codeSyntax).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', alignItems: 'baseline', gap: 1, ml: 2, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ minWidth: 100 }}>{key}:</Typography>
                    <Typography variant="body2">{value}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
} 