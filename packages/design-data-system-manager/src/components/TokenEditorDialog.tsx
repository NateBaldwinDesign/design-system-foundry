import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  IconButton,
  FormControlLabel
} from '@mui/material';
import { ValueByModeTable } from './ValueByModeTable';
import { PlatformOverridesTable } from './PlatformOverridesTable';
import { TokenValuePicker } from './TokenValuePicker';
import { TaxonomyPicker } from './TaxonomyPicker';
import type { Token, TokenCollection, Mode, TokenValue, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { Delete } from '@mui/icons-material';
import { createUniqueId } from '../utils/id';
import { useSchema } from '../hooks/useSchema';
import { CodeSyntaxService } from '../services/codeSyntax';

// Extend the Token type to include themeable
export type ExtendedToken = Token & { themeable?: boolean; codeSyntax?: Record<string, string> };

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
  const { schema } = useSchema();
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

  // Only add taxonomies to schemaForSyntax if needed
  const schemaForSyntax = {
    ...schema,
    taxonomies: taxonomies ?? (schema as any).taxonomies
  };

  // Local state for taxonomy edits (not applied to editedToken until save)
  const [taxonomyEdits, setTaxonomyEdits] = useState<any[]>(() =>
    Array.isArray(token.taxonomies) ? token.taxonomies : []
  );
  
  const codeSyntax = useMemo(() => {
    const tokenForSyntax = { ...token, ...editedToken, taxonomies: taxonomyEdits };
    return CodeSyntaxService.generateAllCodeSyntaxes(tokenForSyntax, schemaForSyntax);
  }, [token, editedToken, taxonomyEdits, schemaForSyntax]);

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
      return {
        ...prev,
        valuesByMode: newValuesByMode
      };
    });
  }, [dimensions, activeDimensionIds, open]);

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...editedToken, taxonomies: taxonomyEdits });
  };

  function handleTaxonomyChange(newTaxonomies: any[]) {
    setTaxonomyEdits(newTaxonomies);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isNew ? 'Create token' : `Edit token: ${token.displayName}`}</DialogTitle>
      <DialogContent>
        {/* Token ID below heading */}
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, ml: 0.5 }}>
          Token ID: {editedToken.id}
        </Typography>

        {/* Display Name and Description */}
        <TextField
          label="Display Name"
          value={editedToken.displayName}
          onChange={(e) => setEditedToken(prev => ({ ...prev, displayName: e.target.value }))}
          fullWidth
          sx={{ mb: 2 }}
        />
        <TextField
          label="Description"
          value={editedToken.description || ''}
          onChange={(e) => setEditedToken(prev => ({ ...prev, description: e.target.value }))}
          multiline
          rows={2}
          fullWidth
          sx={{ mb: 3 }}
        />

        {/* Classification Section */}
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-start', mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>Classification</Typography>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Taxonomy</Typography>
            <TaxonomyPicker
              taxonomies={Array.isArray(taxonomies) ? taxonomies : []}
              value={taxonomyEdits}
              onChange={handleTaxonomyChange}
              disabled={!Array.isArray(taxonomies) || taxonomies.length === 0}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Generated names per platform</Typography>
            <Box>
              {Object.entries(codeSyntax).map(([platform, name]) => (
                <Box key={platform} sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ minWidth: 80 }}>{platform}</Typography>
                  <Typography variant="body2">{name}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Settings Section */}
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'flex-end', mb: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>Settings</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="resolved-value-type-label">Value type</InputLabel>
              <Select
                labelId="resolved-value-type-label"
                value={editedToken.resolvedValueType || ''}
                label="Value type"
                onChange={e => {
                  const newType = e.target.value;
                  setEditedToken(prev => ({
                    ...prev,
                    resolvedValueType: newType as AllowedResolvedValueType,
                    valuesByMode: [{ modeIds: [], value: getDefaultTokenValue(newType as AllowedResolvedValueType) }]
                  }));
                }}
              >
                {Array.isArray(resolvedValueTypes) && resolvedValueTypes.length > 0 ? (
                  resolvedValueTypes.map(vt => (
                    <MenuItem key={vt.id} value={vt.id}>{vt.displayName}</MenuItem>
                  ))
                ) : (
                  <MenuItem disabled value="">
                    {resolvedValueTypes === undefined
                      ? "No resolved value types available. Please configure them in the editor above."
                      : "No resolved value types found."}
                  </MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
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
          </Box>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
            <Typography variant="subtitle2">Extensibility</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={<Checkbox checked={!!editedToken.private} onChange={() => setEditedToken(prev => ({ ...prev, private: !prev.private }))} />}
                label="Private"
              />
              <FormControlLabel
                control={<Checkbox checked={!!editedToken.themeable} onChange={() => setEditedToken(prev => ({ ...prev, themeable: !prev.themeable }))} />}
                label="Theme-able"
              />
            </Box>
          </Box>
        </Box>

        {/* Values Section */}
        <Box>
          <Typography variant="h6" gutterBottom>Values</Typography>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mr: 2 }}>Dimensions</Typography>
            {dimensions.map(dim => (
              <FormControlLabel
                key={dim.id}
                control={
                  <Checkbox
                    checked={activeDimensionIds.includes(dim.id)}
                    onChange={() => handleToggleDimension(dim.id)}
                  />
                }
                label={dim.displayName}
              />
            ))}
          </Box>
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

        {/* Platform Overrides Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>Platform overrides</Typography>
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
          {/* Add override button if no overrides exist */}
          {editedToken.valuesByMode.every(vbm => !vbm.platformOverrides || vbm.platformOverrides.length === 0) && (
            <Button variant="outlined" sx={{ mt: 2 }}>
              Add override
            </Button>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          {isNew ? 'Create token' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 