import { useState, useEffect, useCallback, useRef } from 'react';
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
  FormHelperText,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import { ValueByModeTable } from './ValueByModeTable';
import { PlatformOverridesTable } from './PlatformOverridesTable';
import { TokenValuePicker } from './TokenValuePicker';
import { TaxonomyPicker } from './TaxonomyPicker';
import type { Token, TokenCollection, Mode, TokenValue, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { Delete } from '@mui/icons-material';
import { createUniqueId } from '../utils/id';

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
  resolvedValueTypes: { id: string; displayName: string }[];
  isNew?: boolean;
}

// Helper: get all mode combinations for selected dimensions
function cartesianProduct(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (a, b) => a.flatMap(d => b.map(e => [...d, e])),
    [[]]
  );
}

// Helper: get a valid default TokenValue for a given type
function getDefaultTokenValue(type: string): TokenValue {
  switch (type) {
    case 'COLOR':
      return { type: 'COLOR', value: '#000000' };
    case 'FLOAT':
      return { type: 'FLOAT', value: 0 };
    case 'INTEGER':
      return { type: 'INTEGER', value: 0 };
    case 'STRING':
      return { type: 'STRING', value: '' };
    case 'BOOLEAN':
      return { type: 'BOOLEAN', value: false };
    case 'ALIAS':
      return { type: 'ALIAS', tokenId: '' };
    default:
      return { type: 'STRING', value: '' };
  }
}

// Helper: get the allowed resolved value type union
type AllowedResolvedValueType = Token['resolvedValueType'];

export function TokenEditorDialog({ token, tokens, dimensions, modes, platforms, open, onClose, onSave, taxonomies, resolvedValueTypes, isNew = false }: TokenEditorDialogProps) {
  const preservedValuesByRemovedDimension = useRef<Record<string, Record<string, TokenValue>>>({});
  const [editedToken, setEditedToken] = useState<ExtendedToken & { constraints?: any[] }>(() => {
    if (isNew) {
      return {
        ...token,
        id: createUniqueId('token')
      };
    }
    return token;
  });

  // Track which dimensions are active for this token
  const [activeDimensionIds, setActiveDimensionIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && isNew) {
      setEditedToken({
        ...token,
        id: createUniqueId('token')
      });
    } else if (open && !isNew) {
      setEditedToken(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isNew, token]);

  useEffect(() => {
    // Initialize active dimensions from current valuesByMode
    if (token.valuesByMode && token.valuesByMode.length > 0) {
      // Find all dimension IDs present in modeIds
      const allModeIds = token.valuesByMode.flatMap(v => v.modeIds);
      const presentDims = dimensions.filter(dim =>
        dim.modes.some(mode => allModeIds.includes(mode.id))
      ).map(dim => dim.id);
      setActiveDimensionIds(presentDims);
    } else {
      setActiveDimensionIds([]);
    }
  }, [token, open, dimensions]);

  // When dimensions or their modes change, update valuesByMode to reflect new/removed modes
  useEffect(() => {
    if (!open) return;
    if (activeDimensionIds.length === 0) return;
    const activeDims = dimensions.filter(d => activeDimensionIds.includes(d.id));
    const modeArrays = activeDims.map(d => d.modes.map(m => m.id));
    const combos = modeArrays.length > 0 ? cartesianProduct(modeArrays) : [[]];
    setEditedToken(prev => {
      const prevMap = new Map(prev.valuesByMode.map(vbm => [vbm.modeIds.slice().sort().join(','), vbm.value]));
      const newValuesByMode = combos.map(modeIds => {
        const key = modeIds.slice().sort().join(',');
        if (prevMap.has(key)) {
          const val = prevMap.get(key);
          return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueType) };
        }
        for (let i = 0; i < modeIds.length; i++) {
          const parentIds = modeIds.slice(0, i).concat(modeIds.slice(i + 1));
          const parentKey = parentIds.slice().sort().join(',');
          if (prevMap.has(parentKey)) {
            const val = prevMap.get(parentKey);
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueType) };
          }
        }
        return { modeIds, value: getDefaultTokenValue(prev.resolvedValueType) };
      });
      console.log('[TokenEditorDialog] useEffect valuesByMode update:', {
        prevValuesByMode: prev.valuesByMode,
        combos,
        newValuesByMode
      });
      return {
        ...prev,
        valuesByMode: newValuesByMode
      };
    });
  }, [dimensions, activeDimensionIds, open]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedToken);
  };

  // Add or remove a dimension from the token
  const handleToggleDimension = (dimensionId: string) => {
    const isActive = activeDimensionIds.includes(dimensionId);
    let newActiveDims: string[];
    if (isActive) {
      const dim = dimensions.find(d => d.id === dimensionId);
      if (!dim) return;
      newActiveDims = activeDimensionIds.filter(id => id !== dimensionId);
      const defaultModeId = dim.defaultMode;
      const remainingDims = dimensions.filter(d => newActiveDims.includes(d.id));
      const modeArrays = remainingDims.map(d => d.modes.map(m => m.id));
      const combos = modeArrays.length > 0 ? cartesianProduct(modeArrays) : [[]];
      setEditedToken(prev => {
        // Preserve all values that include the removed dimension
        const removedMap: Record<string, TokenValue> = {};
        prev.valuesByMode.forEach(vbm => {
          if (vbm.modeIds.includes(defaultModeId) || dim.modes.some(m => vbm.modeIds.includes(m.id))) {
            const key = vbm.modeIds.slice().sort().join(',');
            removedMap[key] = vbm.value;
          }
        });
        preservedValuesByRemovedDimension.current[dimensionId] = removedMap;
        const prevMap = new Map(prev.valuesByMode.map(vbm => [vbm.modeIds.slice().sort().join(','), vbm.value]));
        const newValuesByMode = combos.map(modeIds => {
          const key = modeIds.slice().sort().join(',');
          if (prevMap.has(key)) {
            const val = prevMap.get(key);
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueType) };
          }
          // Find all previous combos that are a superset of modeIds (i.e., modeIds + one from removed dimension)
          const candidates = prev.valuesByMode.filter(vbm =>
            vbm.modeIds.length === modeIds.length + 1 &&
            modeIds.every(id => vbm.modeIds.includes(id))
          );
          let found = candidates.find(vbm => vbm.modeIds.includes(defaultModeId));
          if (!found && candidates.length > 0) found = candidates[0];
          if (found) {
            return { modeIds, value: found.value };
          }
          return { modeIds, value: getDefaultTokenValue(prev.resolvedValueType) };
        });
        console.log('[TokenEditorDialog] handleToggleDimension REMOVE:', {
          prevValuesByMode: prev.valuesByMode,
          combos,
          newValuesByMode,
          preserved: preservedValuesByRemovedDimension.current
        });
        return {
          ...prev,
          valuesByMode: newValuesByMode
        };
      });
    } else {
      const dim = dimensions.find(d => d.id === dimensionId);
      if (!dim) return;
      newActiveDims = [...activeDimensionIds, dimensionId];
      const activeDims = dimensions.filter(d => newActiveDims.includes(d.id));
      const modeArrays = activeDims.map(d => d.modes.map(m => m.id));
      const combos = cartesianProduct(modeArrays);
      setEditedToken(prev => {
        const prevMap = new Map(prev.valuesByMode.map(vbm => [vbm.modeIds.slice().sort().join(','), vbm.value]));
        // Try to restore from preserved values if available
        const preserved = preservedValuesByRemovedDimension.current[dimensionId] || {};
        const newValuesByMode = combos.map(modeIds => {
          const key = modeIds.slice().sort().join(',');
          if (prevMap.has(key)) {
            const val = prevMap.get(key);
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueType) };
          }
          // Try to restore from preserved
          if (preserved[key]) {
            return { modeIds, value: preserved[key] };
          }
          // Try to find a parent combo (same as before)
          for (let i = 0; i < modeIds.length; i++) {
            const parentIds = modeIds.slice(0, i).concat(modeIds.slice(i + 1));
            const parentKey = parentIds.slice().sort().join(',');
            if (prevMap.has(parentKey)) {
              const val = prevMap.get(parentKey);
              return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueType) };
            }
          }
          return { modeIds, value: getDefaultTokenValue(prev.resolvedValueType) };
        });
        console.log('[TokenEditorDialog] handleToggleDimension ADD:', {
          prevValuesByMode: prev.valuesByMode,
          combos,
          newValuesByMode,
          restored: preserved
        });
        return {
          ...prev,
          valuesByMode: newValuesByMode
        };
      });
    }
    setActiveDimensionIds(newActiveDims);
  };

  const getValueEditor = (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => {
    if (typeof value === 'string') {
      return <Typography variant="caption" color="text.secondary">{value}</Typography>;
    }

    return (
      <TokenValuePicker
        resolvedValueType={editedToken.resolvedValueType}
        value={value}
        tokens={tokens}
        constraints={(editedToken as any).constraints ?? []}
        excludeTokenId={editedToken.id}
        onChange={newValue => {
          if (onChange) {
            onChange(newValue);
          } else {
            setEditedToken(prev => ({
              ...prev,
              valuesByMode: prev.valuesByMode.map((item, i) =>
                i === modeIndex ? { ...item, value: newValue } : item
              )
            }));
          }
        }}
      />
    );
  };

  // ... (handlers for value changes, constraints, etc. can be added here as needed) ...

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isNew ? 'Create Token' : `Edit Token: ${token.displayName}`}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSave} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Token ID"
                value={editedToken.id}
                disabled
                fullWidth
                helperText="Token IDs are automatically generated and cannot be edited"
              />
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
                <InputLabel id="resolved-value-type-label">Value Type</InputLabel>
                <Select
                  labelId="resolved-value-type-label"
                  value={editedToken.resolvedValueType || ''}
                  label="Value Type"
                  onChange={e => {
                    const newType = e.target.value;
                    setEditedToken(prev => ({
                      ...prev,
                      resolvedValueType: newType as AllowedResolvedValueType,
                      valuesByMode: [{ modeIds: [], value: getDefaultTokenValue(newType as AllowedResolvedValueType) }]
                    }));
                  }}
                >
                  {resolvedValueTypes.map(vt => (
                    <MenuItem key={vt.id} value={vt.id}>{vt.displayName}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select the value type for this token.</FormHelperText>
              </FormControl>
              <FormControl fullWidth sx={{ mt: 2 }}>
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

          {/* Dimensions */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Dimensions
            </Typography>
            <FormHelperText sx={{ mb: 2 }}>
              Select which dimensions (e.g., Color Scheme, Contrast) this token should use. Adding a dimension will create all combinations of its modes with the others. Removing a dimension will remove all values for its modes.
            </FormHelperText>
            <List dense>
              {dimensions.map(dim => (
                <ListItem key={dim.id}>
                  <ListItemText primary={dim.displayName} secondary={dim.description} />
                  <ListItemSecondaryAction>
                    <Checkbox
                      edge="end"
                      checked={activeDimensionIds.includes(dim.id)}
                      onChange={() => handleToggleDimension(dim.id)}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
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
            {activeDimensionIds.length === 0 ? (
              (() => {
                const globalValue = editedToken.valuesByMode.find(vbm => Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0);
                if (!globalValue) {
                  return (
                    <Button
                      variant="outlined"
                      onClick={() => setEditedToken(prev => ({
                        ...prev,
                        valuesByMode: [
                          ...prev.valuesByMode,
                          { modeIds: [], value: getDefaultTokenValue(prev.resolvedValueType) }
                        ]
                      }))}
                    >
                      Add Value
                    </Button>
                  );
                }
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TokenValuePicker
                      resolvedValueType={editedToken.resolvedValueType}
                      value={globalValue.value}
                      tokens={tokens}
                      constraints={(editedToken as any).constraints ?? []}
                      excludeTokenId={editedToken.id}
                      onChange={newValue => setEditedToken(prev => ({
                        ...prev,
                        valuesByMode: prev.valuesByMode.map(vbm =>
                          Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0
                            ? { ...vbm, value: newValue }
                            : vbm
                        )
                      }))}
                    />
                    <IconButton
                      color="error"
                      onClick={() => setEditedToken(prev => ({
                        ...prev,
                        valuesByMode: prev.valuesByMode.filter(vbm => !(Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0))
                      }))}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                );
              })()
            ) : (
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
                getValueEditor={getValueEditor}
                resolvedValueType={editedToken.resolvedValueType}
                tokens={tokens}
                constraints={(editedToken as any).constraints ?? []}
                excludeTokenId={editedToken.id}
              />
            )}
          </Box>

          {/* Platform Overrides */}
          <PlatformOverridesTable
            platforms={platforms}
            valuesByMode={editedToken.valuesByMode}
            modes={modes}
            getValueEditor={getValueEditor}
            onPlatformOverrideChange={(platformId, modeIndex, newValue) => {
              setEditedToken(prev => ({
                ...prev,
                valuesByMode: prev.valuesByMode.map((item, i) =>
                  i === modeIndex
                    ? {
                        ...item,
                        platformOverrides: [
                          ...(item.platformOverrides || []).filter(p => p.platformId !== platformId),
                          {
                            platformId,
                            value: typeof newValue === 'string' ? newValue : JSON.stringify(newValue)
                          }
                        ]
                      }
                    : item
                )
              }));
            }}
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
          {isNew ? 'Create Token' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 