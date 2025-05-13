import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { Token, TokenCollection, Mode, TokenValue, Dimension, Platform } from '@token-model/data-model';
import { ValueByModeTable } from './ValueByModeTable';
import { PlatformOverridesTable } from './PlatformOverridesTable';
import { TokenValuePicker } from './TokenValuePicker';

// Extend the Token type to include themeable
type ExtendedToken = Token & { themeable?: boolean };

interface TokenListProps {
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  platforms: Platform[];
  onEdit: (token: ExtendedToken) => void;
  onDelete: (tokenId: string) => void;
}

interface TokenEditorProps {
  token: ExtendedToken;
  tokens: ExtendedToken[];
  dimensions: Dimension[];
  modes: Mode[];
  platforms: Platform[];
  open: boolean;
  onClose: () => void;
  onSave: (token: ExtendedToken) => void;
}

interface ContrastConstraint {
  type: 'contrast';
  rule: {
    minimum: number;
    comparator: TokenValue;
    method: 'WCAG21' | 'APCA' | 'Lstar';
  };
}

type Constraint = ContrastConstraint;

function TokenEditor({ token, tokens, dimensions, modes, platforms, open, onClose, onSave }: TokenEditorProps) {
  const [editedToken, setEditedToken] = useState<ExtendedToken & { constraints?: Constraint[] }>(token);
  const [newTaxonomyKey, setNewTaxonomyKey] = useState('');
  const [newTaxonomyValue, setNewTaxonomyValue] = useState('');
  const [newConstraintType, setNewConstraintType] = useState('contrast');
  const [newConstraintMin, setNewConstraintMin] = useState('');
  const [newConstraintComparator, setNewConstraintComparator] = useState('');
  const [newConstraintMethod, setNewConstraintMethod] = useState('WCAG21');

  const handleValueChange = (modeIndex: number, newValue: TokenValue) => {
    setEditedToken(prev => ({
      ...prev,
      valuesByMode: prev.valuesByMode.map((vbm, idx) => 
        idx === modeIndex ? { ...vbm, value: newValue } : vbm
      )
    }));
  };

  const handlePlatformOverrideChange = (platformId: string, modeIndex: number, newValue: TokenValue) => {
    setEditedToken(prev => ({
      ...prev,
      valuesByMode: prev.valuesByMode.map((vbm, idx) => {
        if (idx !== modeIndex) return vbm;
        
        const existingOverrides = vbm.platformOverrides || [];
        const existingOverrideIndex = existingOverrides.findIndex(po => po.platformId === platformId);
        
        // Convert value to string based on type
        let stringValue: string;
        if (newValue.type === 'ALIAS') {
          stringValue = newValue.tokenId;
        } else {
          stringValue = String(newValue.value);
        }
        
        // Create new platform override array
        const newOverrides = [...existingOverrides];
        if (existingOverrideIndex >= 0) {
          // Update existing override
          newOverrides[existingOverrideIndex] = {
            platformId,
            value: stringValue
          };
        } else {
          // Add new override
          newOverrides.push({
            platformId,
            value: stringValue
          });
        }
        
        return {
          ...vbm,
          platformOverrides: newOverrides
        };
      })
    }));
  };

  const handleFieldChange = (field: keyof ExtendedToken, value: any) => {
    setEditedToken(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTaxonomy = () => {
    if (newTaxonomyKey && newTaxonomyValue) {
      setEditedToken(prev => ({
        ...prev,
        taxonomies: {
          ...prev.taxonomies,
          [newTaxonomyKey]: newTaxonomyValue
        }
      }));
      setNewTaxonomyKey('');
      setNewTaxonomyValue('');
    }
  };

  const handleRemoveTaxonomy = (key: string) => {
    setEditedToken(prev => {
      const newTaxonomies = { ...prev.taxonomies };
      delete newTaxonomies[key];
      return {
        ...prev,
        taxonomies: newTaxonomies
      };
    });
  };

  // Constraint handlers
  const handleAddConstraint = () => {
    if (newConstraintType === 'contrast' && newConstraintMin && newConstraintComparator) {
      setEditedToken(prev => ({
        ...prev,
        constraints: [
          ...((prev as any).constraints || []),
          {
            type: 'contrast',
            rule: {
              minimum: Number(newConstraintMin),
              comparator: { type: 'COLOR', value: newConstraintComparator },
              method: newConstraintMethod
            }
          }
        ]
      }));
      setNewConstraintMin('');
      setNewConstraintComparator('');
      setNewConstraintMethod('WCAG21');
    }
  };

  const handleRemoveConstraint = (idx: number) => {
    setEditedToken(prev => ({
      ...prev,
      constraints: (prev.constraints || []).filter((_, i: number) => i !== idx)
    }));
  };

  const handleEditConstraint = (idx: number, field: string, value: any) => {
    setEditedToken(prev => ({
      ...prev,
      constraints: (prev.constraints || []).map((c: Constraint, i: number) =>
        i === idx
          ? {
              ...c,
              rule: {
                ...c.rule,
                [field]: field === 'minimum' ? Number(value) : value
              }
            }
          : c
      )
    }));
  };

  const getValueEditor = (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => {
    if (typeof value === 'string') {
      return <Typography variant="caption" color="text.secondary">{value}</Typography>;
    }
    switch (value.type) {
      case 'COLOR':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: 1,
                border: '1px solid #ccc',
                backgroundColor: value.value
              }}
            />
            <TextField
              size="small"
              value={value.value}
              onChange={(e) => {
                const newValue = { type: 'COLOR' as const, value: e.target.value };
                if (onChange) {
                  onChange(newValue);
                } else {
                  handleValueChange(modeIndex, newValue);
                }
              }}
            />
          </Box>
        );
      case 'ALIAS':
        return (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={value.tokenId}
              onChange={(e) => {
                const newValue = { type: 'ALIAS' as const, tokenId: e.target.value };
                if (onChange) {
                  onChange(newValue);
                } else {
                  handleValueChange(modeIndex, newValue);
                }
              }}
            >
              {tokens
                .filter(t => t.id !== token.id)
                .map(token => (
                  <MenuItem key={token.id} value={token.id}>
                    {token.displayName}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        );
      case 'FLOAT':
        return (
          <TextField
            size="small"
            type="number"
            value={value.value}
            onChange={(e) => {
              const newValue = { type: 'FLOAT' as const, value: Number(e.target.value) };
              if (onChange) {
                onChange(newValue);
              } else {
                handleValueChange(modeIndex, newValue);
              }
            }}
          />
        );
      case 'INTEGER':
        return (
          <TextField
            size="small"
            type="number"
            value={value.value}
            onChange={(e) => {
              const newValue = { type: 'INTEGER' as const, value: Number(e.target.value) };
              if (onChange) {
                onChange(newValue);
              } else {
                handleValueChange(modeIndex, newValue);
              }
            }}
          />
        );
      case 'STRING':
        return (
          <TextField
            size="small"
            value={value.value}
            onChange={(e) => {
              const newValue = { type: 'STRING' as const, value: e.target.value };
              if (onChange) {
                onChange(newValue);
              } else {
                handleValueChange(modeIndex, newValue);
              }
            }}
          />
        );
      case 'BOOLEAN':
        return (
          <Chip
            label={value.value ? 'True' : 'False'}
            color={value.value ? 'success' : 'error'}
            size="small"
            onClick={() => {
              const newValue = { type: 'BOOLEAN' as const, value: !value.value };
              if (onChange) {
                onChange(newValue);
              } else {
                handleValueChange(modeIndex, newValue);
              }
            }}
          />
        );
      default:
        return 'Unknown value type';
    }
  };

  const organizeValuesByDimensions = () => {
    if (!dimensions || dimensions.length === 0) {
      console.log('No dimensions available');
      return null;
    }

    // Find the two dimensions that have the most modes
    const dimensionsWithModes = dimensions
      .map(dim => ({
        dimension: dim,
        modeCount: dim.modes.length
      }))
      .sort((a, b) => b.modeCount - a.modeCount);

    if (dimensionsWithModes.length < 2) {
      console.log('Not enough dimensions with modes');
      return null;
    }

    const [rowDimension, colDimension] = dimensionsWithModes.slice(0, 2);

    // Create a map of mode IDs to their values
    const modeValueMap = new Map(
      editedToken.valuesByMode.map(vbm => [
        vbm.modeIds.sort().join(','),
        vbm
      ])
    );

    return {
      rowDimension: rowDimension.dimension,
      colDimension: colDimension.dimension,
      modeValueMap
    };
  };

  const getModeName = (modeId: string) => modes.find(m => m.id === modeId)?.name || modeId;
  const columns = Array.from(
    new Set(
      editedToken.valuesByMode
        .map(vbm => vbm.modeIds[0])
        .filter(id => !!id)
    )
  );
  columns.sort((a, b) => getModeName(a).localeCompare(getModeName(b)));
  const hasRows = editedToken.valuesByMode.some(vbm => vbm.modeIds.length > 1);
  let rows: string[] = [];
  if (hasRows) {
    rows = Array.from(
      new Set(
        editedToken.valuesByMode
          .map(vbm => vbm.modeIds[1])
          .filter(id => !!id)
      )
    );
    rows.sort((a, b) => getModeName(a).localeCompare(getModeName(b)));
  } else {
    rows = ['single'];
  }
  const valueMap = new Map(
    editedToken.valuesByMode.map((vbm, idx) => [vbm.modeIds.join(','), { vbm, idx }])
  );
  const allGlobal = editedToken.valuesByMode.every(vbm => vbm.modeIds.length === 0);

  const renderValueTable = () => {
    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          {!allGlobal && (
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                {columns.map(colId => {
                  const modeName = getModeName(colId);
                  return (
                    <TableCell key={`header-${colId}`} align="center">
                      {modeName !== colId ? modeName : 'Unknown Mode'}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
          )}
          <TableBody>
            {rows.map(rowId => (
              <TableRow key={`row-${rowId}`}>
                <TableCell component="th" scope="row">{hasRows ? getModeName(rowId) : ''}</TableCell>
                {columns.map(colId => {
                  let key;
                  if (hasRows) {
                    key = [colId, rowId].join(',');
                  } else {
                    key = [colId].join(',');
                  }
                  const entry = valueMap.get(key);
                  const cellKey = `cell-${rowId}-${colId}`;
                  if (!entry) return <TableCell key={cellKey} />;
                  return (
                    <TableCell key={cellKey} align="center">
                      {getValueEditor(entry.vbm.value, entry.idx)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Token: {token.displayName}</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Display Name"
                value={editedToken.displayName}
                onChange={(e) => handleFieldChange('displayName', e.target.value)}
                fullWidth
              />
              <TextField
                label="Description"
                value={editedToken.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                multiline
                rows={2}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editedToken.status || ''}
                  label="Status"
                  onChange={(e) => handleFieldChange('status', e.target.value)}
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
                    onClick={() => handleFieldChange('private', !editedToken.private)}
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
                    onClick={() => handleFieldChange('themeable', !editedToken.themeable)}
                    clickable
                  />
                </Box>
              </FormControl>
            </Box>
          </Box>

          {/* Constraints */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Constraints
            </Typography>
            {(((editedToken as any).constraints) || []).length === 0 && (
              <Typography color="text.secondary" variant="body2">No constraints</Typography>
            )}
            {(((editedToken as any).constraints) || []).map((constraint: any, idx: number) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="body2">{constraint.type}</Typography>
                {constraint.type === 'contrast' && (
                  <>
                    <TextField
                      label="Minimum"
                      type="number"
                      size="small"
                      value={constraint.rule.minimum}
                      onChange={e => handleEditConstraint(idx, 'minimum', e.target.value)}
                      sx={{ width: 100 }}
                    />
                    <TokenValuePicker
                      resolvedValueType="COLOR"
                      value={constraint.rule.comparator}
                      tokens={tokens}
                      onChange={newValue => handleEditConstraint(idx, 'comparator', newValue)}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Method</InputLabel>
                      <Select
                        value={constraint.rule.method || 'WCAG21'}
                        label="Method"
                        onChange={e => handleEditConstraint(idx, 'method', e.target.value)}
                      >
                        <MenuItem value="WCAG21">WCAG 2.1</MenuItem>
                        <MenuItem value="APCA">APCA</MenuItem>
                        <MenuItem value="Lstar">Lightness</MenuItem>
                      </Select>
                    </FormControl>
                  </>
                )}
                <IconButton onClick={() => handleRemoveConstraint(idx)} size="small">
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newConstraintType}
                  label="Type"
                  onChange={e => setNewConstraintType(e.target.value)}
                >
                  <MenuItem value="contrast">Contrast</MenuItem>
                  {/* Add more constraint types here */}
                </Select>
              </FormControl>
              {newConstraintType === 'contrast' && (
                <>
                  <TextField
                    label="Minimum"
                    type="number"
                    size="small"
                    value={newConstraintMin}
                    onChange={e => setNewConstraintMin(e.target.value)}
                    sx={{ width: 100 }}
                  />
                  <TokenValuePicker
                    resolvedValueType="COLOR"
                    value={newConstraintComparator ? { type: 'COLOR', value: newConstraintComparator } : ''}
                    tokens={tokens}
                    onChange={newValue => {
                      if (newValue.type === 'COLOR') {
                        setNewConstraintComparator(newValue.value);
                      }
                    }}
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Method</InputLabel>
                    <Select
                      value={newConstraintMethod}
                      label="Method"
                      onChange={e => setNewConstraintMethod(e.target.value)}
                    >
                      <MenuItem value="WCAG21">WCAG 2.1</MenuItem>
                      <MenuItem value="APCA">APCA</MenuItem>
                      <MenuItem value="Lstar">Lightness</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}
              <Button
                variant="outlined"
                onClick={handleAddConstraint}
                disabled={newConstraintType === 'contrast' && (!newConstraintMin || !newConstraintComparator)}
              >
                Add
              </Button>
            </Box>
          </Box>

          {/* Taxonomies */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Taxonomies
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(editedToken.taxonomies).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextField
                    label="Key"
                    value={key}
                    onChange={(e) => {
                      const newTaxonomies = { ...editedToken.taxonomies };
                      delete newTaxonomies[key];
                      newTaxonomies[e.target.value] = value;
                      handleFieldChange('taxonomies', newTaxonomies);
                    }}
                    size="small"
                  />
                  <TextField
                    label="Value"
                    value={value}
                    onChange={(e) => {
                      handleFieldChange('taxonomies', {
                        ...editedToken.taxonomies,
                        [key]: e.target.value
                      });
                    }}
                    size="small"
                    fullWidth
                  />
                  <IconButton onClick={() => handleRemoveTaxonomy(key)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  label="New Key"
                  value={newTaxonomyKey}
                  onChange={(e) => setNewTaxonomyKey(e.target.value)}
                  size="small"
                />
                <TextField
                  label="New Value"
                  value={newTaxonomyValue}
                  onChange={(e) => setNewTaxonomyValue(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Button
                  variant="outlined"
                  onClick={handleAddTaxonomy}
                  disabled={!newTaxonomyKey || !newTaxonomyValue}
                >
                  Add
                </Button>
              </Box>
            </Box>
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
              onValueChange={handleValueChange}
              getValueEditor={getValueEditor}
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
            getValueEditor={getValueEditor}
            onPlatformOverrideChange={handlePlatformOverrideChange}
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
        <Button onClick={() => onSave(editedToken)} variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function TokenList({ tokens, collections, modes, dimensions, platforms, onEdit, onDelete }: TokenListProps) {
  const [editingToken, setEditingToken] = useState<ExtendedToken | null>(null);

  // Add console logging to debug props
  console.log('TokenList props:', { tokens, collections, modes, dimensions });

  const getCollectionName = (collectionId: string) => {
    return collections.find(c => c.id === collectionId)?.name || collectionId;
  };

  const getModeNames = (modeIds: string[]) => {
    return modeIds.map(id => modes.find(m => m.id === id)?.name || id).join(', ');
  };

  const getValueDisplay = (value: TokenValue) => {
    switch (value.type) {
      case 'COLOR':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 24,
                height: 24,
                borderRadius: 1,
                border: '1px solid #ccc',
                backgroundColor: value.value
              }}
            />
            <Typography variant="body2">{value.value}</Typography>
          </Box>
        );
      case 'ALIAS':
        const aliasToken = tokens.find(t => t.id === value.tokenId);
        return (
          <Typography variant="body2">
            {aliasToken?.displayName || value.tokenId}
          </Typography>
        );
      case 'FLOAT':
      case 'INTEGER':
        return (
          <Typography variant="body2">
            {value.value}
          </Typography>
        );
      case 'STRING':
        return (
          <Typography variant="body2">
            {value.value}
          </Typography>
        );
      case 'BOOLEAN':
        return (
          <Chip
            label={value.value ? 'True' : 'False'}
            color={value.value ? 'success' : 'error'}
            size="small"
          />
        );
      default:
        return 'Unknown value type';
    }
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Collection</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Private</TableCell>
              <TableCell>Themeable</TableCell>
              <TableCell>Values by Mode</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.map((token) => (
              <TableRow key={token.id}>
                <TableCell>
                  <Typography variant="body1">{token.displayName}</Typography>
                  {token.description && (
                    <Typography variant="body2" color="text.secondary">
                      {token.description}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{getCollectionName(token.tokenCollectionId)}</TableCell>
                <TableCell>
                  <Chip
                    label={token.resolvedValueType}
                    size="small"
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  {token.status && (
                    <Chip
                      label={token.status}
                      size="small"
                      color={
                        token.status === 'stable'
                          ? 'success'
                          : token.status === 'experimental'
                          ? 'warning'
                          : 'error'
                      }
                    />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={token.private ? 'Private' : 'Public'}
                    size="small"
                    color={token.private ? 'default' : 'success'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={token.themeable ? 'Yes' : 'No'}
                    size="small"
                    color={token.themeable ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  {token.valuesByMode.map((valueByMode, index) => (
                    <Box key={index} sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {getModeNames(valueByMode.modeIds)}:
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {getValueDisplay(valueByMode.value)}
                      </Box>
                    </Box>
                  ))}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton onClick={() => setEditingToken(token)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => onDelete(token.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {editingToken && (
        <TokenEditor
          token={editingToken}
          tokens={tokens}
          dimensions={dimensions || []} // Provide empty array as fallback
          modes={modes}
          platforms={platforms}
          open={true}
          onClose={() => setEditingToken(null)}
          onSave={(updatedToken) => {
            onEdit(updatedToken);
            setEditingToken(null);
          }}
        />
      )}
    </>
  );
} 