import { useState, useEffect, useMemo } from 'react';
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
  Tooltip,
  FormHelperText
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { Token, TokenCollection, Mode, TokenValue, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { ValueByModeTable } from './ValueByModeTable';
import { PlatformOverridesTable } from './PlatformOverridesTable';
import { TokenValuePicker } from './TokenValuePicker';
import { TaxonomyPicker } from './TaxonomyPicker';
import { TokenEditorDialog } from './TokenEditorDialog';

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
  taxonomies: Taxonomy[];
  resolvedValueTypes: { id: string; displayName: string }[];
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
  taxonomies: Taxonomy[];
  resolvedValueTypes: { id: string; displayName: string }[];
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

function TokenEditor({ token, tokens, dimensions, modes, platforms, open, onClose, onSave, taxonomies, resolvedValueTypes }: TokenEditorProps) {
  const [editedToken, setEditedToken] = useState<ExtendedToken & { constraints?: Constraint[] }>(token);
  const [newTaxonomyKey, setNewTaxonomyKey] = useState('');
  const [newTaxonomyValue, setNewTaxonomyValue] = useState('');
  const [newConstraintType, setNewConstraintType] = useState('contrast');
  const [newConstraintMin, setNewConstraintMin] = useState('');
  const [newConstraintComparator, setNewConstraintComparator] = useState('');
  const [newConstraintMethod, setNewConstraintMethod] = useState('WCAG21');

  // Only reset local state when the token or dialog open state changes
  useEffect(() => {
    setEditedToken(token);
  }, [token, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedToken);
  };

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
      delete (newTaxonomies as any)[key];
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(editedToken);
  };

  return (
    <TokenEditorDialog
      token={token}
      tokens={tokens}
      dimensions={dimensions}
      modes={modes}
      platforms={platforms}
      open={open}
      onClose={onClose}
      onSave={onSave}
      taxonomies={taxonomies}
      isNew={false}
      resolvedValueTypes={resolvedValueTypes}
    />
  );
}

export function TokenList({ tokens, collections, modes, dimensions, platforms, onEdit, onDelete, taxonomies, resolvedValueTypes }: TokenListProps) {
  const [editingToken, setEditingToken] = useState<ExtendedToken | null>(null);

  // Filter state
  const [collectionFilter, setCollectionFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [privateFilter, setPrivateFilter] = useState<string>('');
  const [themeableFilter, setThemeableFilter] = useState<string>('');

  // Filtering logic
  const filteredTokens = useMemo(() => {
    return tokens.filter(token => {
      if (collectionFilter && token.tokenCollectionId !== collectionFilter) return false;
      if (typeFilter && token.resolvedValueType !== typeFilter) return false;
      if (statusFilter && token.status !== statusFilter) return false;
      if (privateFilter && String(token.private) !== privateFilter) return false;
      if (themeableFilter && String(token.themeable) !== themeableFilter) return false;
      return true;
    });
  }, [tokens, collectionFilter, typeFilter, statusFilter, privateFilter, themeableFilter]);

  // Unique values for filters
  const typeOptions = Array.from(new Set(tokens.map(t => t.resolvedValueType))).sort();
  const statusOptions = Array.from(new Set(tokens.map(t => t.status).filter(Boolean))).sort();

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
      {/* Filter Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Collection</InputLabel>
          <Select
            value={collectionFilter}
            label="Collection"
            onChange={e => setCollectionFilter(e.target.value)}
            displayEmpty
          >
            <MenuItem value=""><em>All</em></MenuItem>
            {collections.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={typeFilter}
            label="Type"
            onChange={e => setTypeFilter(e.target.value)}
            displayEmpty
          >
            <MenuItem value=""><em>All</em></MenuItem>
            {typeOptions.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={e => setStatusFilter(e.target.value)}
            displayEmpty
          >
            <MenuItem value=""><em>All</em></MenuItem>
            {statusOptions.map(status => (
              <MenuItem key={status} value={status}>{status}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Private</InputLabel>
          <Select
            value={privateFilter}
            label="Private"
            onChange={e => setPrivateFilter(e.target.value)}
            displayEmpty
          >
            <MenuItem value=""><em>All</em></MenuItem>
            <MenuItem value="true">Private</MenuItem>
            <MenuItem value="false">Public</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Themeable</InputLabel>
          <Select
            value={themeableFilter}
            label="Themeable"
            onChange={e => setThemeableFilter(e.target.value)}
            displayEmpty
          >
            <MenuItem value=""><em>All</em></MenuItem>
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {/* Token Table */}
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
            {filteredTokens.map((token) => (
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
          dimensions={dimensions || []}
          modes={modes}
          platforms={platforms}
          taxonomies={taxonomies}
          open={true}
          onClose={() => setEditingToken(null)}
          onSave={(updatedToken) => {
            onEdit(updatedToken);
            setEditingToken(null);
          }}
          resolvedValueTypes={resolvedValueTypes || []}
        />
      )}
    </>
  );
} 