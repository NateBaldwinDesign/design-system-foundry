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
import type { Token, TokenCollection, Mode, TokenValue, Dimension } from '@token-model/data-model';

interface TokenListProps {
  tokens: Token[];
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  onEdit: (token: Token) => void;
  onDelete: (tokenId: string) => void;
}

interface TokenEditorProps {
  token: Token;
  tokens: Token[];
  dimensions: Dimension[];
  modes: Mode[];
  open: boolean;
  onClose: () => void;
  onSave: (token: Token) => void;
}

function TokenEditor({ token, tokens, dimensions, modes, open, onClose, onSave }: TokenEditorProps) {
  const [editedToken, setEditedToken] = useState(token);
  const [newTaxonomyKey, setNewTaxonomyKey] = useState('');
  const [newTaxonomyValue, setNewTaxonomyValue] = useState('');

  const handleValueChange = (modeIndex: number, newValue: TokenValue) => {
    setEditedToken(prev => ({
      ...prev,
      valuesByMode: prev.valuesByMode.map((vbm, idx) => 
        idx === modeIndex ? { ...vbm, value: newValue } : vbm
      )
    }));
  };

  const handleFieldChange = (field: keyof Token, value: any) => {
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

  const getValueEditor = (value: TokenValue, modeIndex: number) => {
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
              onChange={(e) => handleValueChange(modeIndex, { type: 'COLOR' as const, value: e.target.value })}
            />
          </Box>
        );
      case 'ALIAS':
        return (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              value={value.tokenId}
              onChange={(e) => handleValueChange(modeIndex, { type: 'ALIAS' as const, tokenId: e.target.value })}
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
            onChange={(e) => handleValueChange(modeIndex, { type: 'FLOAT' as const, value: Number(e.target.value) })}
          />
        );
      case 'INTEGER':
        return (
          <TextField
            size="small"
            type="number"
            value={value.value}
            onChange={(e) => handleValueChange(modeIndex, { type: 'INTEGER' as const, value: Number(e.target.value) })}
          />
        );
      case 'STRING':
        return (
          <TextField
            size="small"
            value={value.value}
            onChange={(e) => handleValueChange(modeIndex, { type: 'STRING' as const, value: e.target.value })}
          />
        );
      case 'BOOLEAN':
        return (
          <Chip
            label={value.value ? 'True' : 'False'}
            color={value.value ? 'success' : 'error'}
            size="small"
            onClick={() => handleValueChange(modeIndex, { type: 'BOOLEAN' as const, value: !value.value })}
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

  const renderValueTable = () => {
    // 1. Extract unique columns and rows from valuesByMode
    const columns = Array.from(new Set(editedToken.valuesByMode.map(vbm => vbm.modeIds[0])));
    const hasRows = editedToken.valuesByMode.some(vbm => vbm.modeIds.length > 1);
    let rows: string[] = [];
    if (hasRows) {
      rows = Array.from(new Set(editedToken.valuesByMode.map(vbm => vbm.modeIds[1])));
    } else {
      rows = ['single']; // single row case
    }

    // Optionally sort columns and rows by mode name for user-friendliness
    const getModeName = (modeId: string) => modes.find(m => m.id === modeId)?.name || modeId;
    columns.sort((a, b) => getModeName(a).localeCompare(getModeName(b)));
    if (hasRows) {
      rows.sort((a, b) => getModeName(a).localeCompare(getModeName(b)));
    }

    // 2. Build a lookup for quick access
    const valueMap = new Map(
      editedToken.valuesByMode.map((vbm, idx) => [vbm.modeIds.join(','), { vbm, idx }])
    );

    return (
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              {columns.map(colId => (
                <TableCell key={colId} align="center">{getModeName(colId)}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(rowId => (
              <TableRow key={rowId}>
                <TableCell component="th" scope="row">{hasRows ? getModeName(rowId) : ''}</TableCell>
                {columns.map(colId => {
                  let key;
                  if (hasRows) {
                    key = [colId, rowId].join(',');
                  } else {
                    key = [colId].join(',');
                  }
                  const entry = valueMap.get(key);
                  if (!entry) return <TableCell key={colId} />;
                  return (
                    <TableCell key={colId} align="center">
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
            {renderValueTable()}
          </Box>

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

export function TokenList({ tokens, collections, modes, dimensions, onEdit, onDelete }: TokenListProps) {
  const [editingToken, setEditingToken] = useState<Token | null>(null);

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