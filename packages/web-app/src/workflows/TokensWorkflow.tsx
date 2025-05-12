import { useState } from 'react';
import {
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton,
} from '@mui/material';
import { Token, TokenSchema, TokenCollection } from '@token-model/data-model';
import { ZodError } from 'zod';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

interface TokensWorkflowProps {
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  tokenCollections: TokenCollection[];
}

export default function TokensWorkflow({
  tokens,
  setTokens,
  tokenCollections,
}: TokensWorkflowProps) {
  const [newToken, setNewToken] = useState<Partial<Token>>({
    displayName: '',
    description: '',
    tokenCollectionId: '',
    resolvedValueType: '',
    private: false,
    taxonomies: {},
    propertyTypes: [],
    codeSyntax: {},
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [newTaxonomyKey, setNewTaxonomyKey] = useState('');
  const [newTaxonomyValue, setNewTaxonomyValue] = useState('');
  const [newCodeSyntaxKey, setNewCodeSyntaxKey] = useState('');
  const [newCodeSyntaxValue, setNewCodeSyntaxValue] = useState('');

  const handleAddToken = () => {
    setFieldErrors({});
    try {
      const token = TokenSchema.parse({
        id: crypto.randomUUID(),
        ...newToken,
        propertyTypes: (newToken.propertyTypes || []).filter(Boolean),
      });
      setTokens([...tokens, token]);
      setNewToken({
        displayName: '',
        description: '',
        tokenCollectionId: '',
        resolvedValueType: '',
        private: false,
        taxonomies: {},
        propertyTypes: [],
        codeSyntax: {},
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path && err.path.length > 0) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFieldErrors(errors);
      } else {
        setFieldErrors({ general: 'An unexpected error occurred.' });
      }
    }
  };

  const handleAddTaxonomy = () => {
    if (newTaxonomyKey && newTaxonomyValue) {
      setNewToken({
        ...newToken,
        taxonomies: {
          ...newToken.taxonomies,
          [newTaxonomyKey]: newTaxonomyValue,
        },
      });
      setNewTaxonomyKey('');
      setNewTaxonomyValue('');
    }
  };

  const handleRemoveTaxonomy = (key: string) => {
    const { [key]: removed, ...rest } = newToken.taxonomies || {};
    setNewToken({
      ...newToken,
      taxonomies: rest,
    });
  };

  const handleAddCodeSyntax = () => {
    if (newCodeSyntaxKey && newCodeSyntaxValue) {
      setNewToken({
        ...newToken,
        codeSyntax: {
          ...newToken.codeSyntax,
          [newCodeSyntaxKey]: newCodeSyntaxValue,
        },
      });
      setNewCodeSyntaxKey('');
      setNewCodeSyntaxValue('');
    }
  };

  const handleRemoveCodeSyntax = (key: string) => {
    const { [key]: removed, ...rest } = newToken.codeSyntax || {};
    setNewToken({
      ...newToken,
      codeSyntax: rest,
    });
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Add New Token
          </Typography>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Display Name"
              value={newToken.displayName}
              onChange={(e) => setNewToken({ ...newToken, displayName: e.target.value })}
              error={Boolean(fieldErrors.displayName)}
              helperText={fieldErrors.displayName}
            />
            <TextField
              label="Description"
              value={newToken.description}
              onChange={(e) => setNewToken({ ...newToken, description: e.target.value })}
              error={Boolean(fieldErrors.description)}
              helperText={fieldErrors.description}
            />
            <FormControl fullWidth error={Boolean(fieldErrors.tokenCollectionId)}>
              <InputLabel>Token Collection</InputLabel>
              <Select
                value={newToken.tokenCollectionId || ''}
                label="Token Collection"
                onChange={(e) => setNewToken({ ...newToken, tokenCollectionId: e.target.value })}
              >
                {tokenCollections.map((collection) => (
                  <MenuItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </MenuItem>
                ))}
              </Select>
              {fieldErrors.tokenCollectionId && (
                <Typography color="error" variant="caption">
                  {fieldErrors.tokenCollectionId}
                </Typography>
              )}
            </FormControl>
            <TextField
              label="Resolved Value Type"
              value={newToken.resolvedValueType}
              onChange={(e) => setNewToken({ ...newToken, resolvedValueType: e.target.value })}
              error={Boolean(fieldErrors.resolvedValueType)}
              helperText={fieldErrors.resolvedValueType}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!newToken.private}
                  onChange={(e) => setNewToken({ ...newToken, private: e.target.checked })}
                />
              }
              label="Private"
            />
            <TextField
              label="Property Types (comma separated)"
              value={(newToken.propertyTypes || []).join(',')}
              onChange={(e) => setNewToken({ ...newToken, propertyTypes: e.target.value.split(',').map((v) => v.trim()) })}
              error={Boolean(fieldErrors.propertyTypes)}
              helperText={fieldErrors.propertyTypes}
            />

            <Typography variant="subtitle1">Taxonomies</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Key"
                value={newTaxonomyKey}
                onChange={(e) => setNewTaxonomyKey(e.target.value)}
                size="small"
              />
              <TextField
                label="Value"
                value={newTaxonomyValue}
                onChange={(e) => setNewTaxonomyValue(e.target.value)}
                size="small"
              />
              <IconButton onClick={handleAddTaxonomy} color="primary">
                <AddIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.entries(newToken.taxonomies || {}).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">{key}: {value}</Typography>
                  <IconButton onClick={() => handleRemoveTaxonomy(key)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <Typography variant="subtitle1">Code Syntax</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label="Platform"
                value={newCodeSyntaxKey}
                onChange={(e) => setNewCodeSyntaxKey(e.target.value)}
                size="small"
              />
              <TextField
                label="Syntax"
                value={newCodeSyntaxValue}
                onChange={(e) => setNewCodeSyntaxValue(e.target.value)}
                size="small"
              />
              <IconButton onClick={handleAddCodeSyntax} color="primary">
                <AddIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.entries(newToken.codeSyntax || {}).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">{key}: {value}</Typography>
                  <IconButton onClick={() => handleRemoveCodeSyntax(key)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>

            {fieldErrors.general && (
              <Typography color="error">{fieldErrors.general}</Typography>
            )}
            <Button variant="contained" onClick={handleAddToken}>
              Add Token
            </Button>
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Tokens List
          </Typography>
          <List>
            {tokens.map((token) => {
              const collection = tokenCollections.find((c) => c.id === token.tokenCollectionId);
              return (
                <ListItem key={token.id}>
                  <ListItemText
                    primary={token.displayName}
                    secondary={
                      <>
                        <div>Description: {token.description}</div>
                        <div>Collection: {collection?.name || 'Unknown'}</div>
                        <div>Resolved Value Type: {token.resolvedValueType}</div>
                        <div>Private: {token.private ? 'Yes' : 'No'}</div>
                        <div>Property Types: {token.propertyTypes.join(', ')}</div>
                        <div>Taxonomies: {Object.entries(token.taxonomies).map(([k, v]) => `${k}: ${v}`).join(', ')}</div>
                        <div>Code Syntax: {Object.entries(token.codeSyntax).map(([k, v]) => `${k}: ${v}`).join(', ')}</div>
                      </>
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Paper>
      </Grid>
    </Grid>
  );
} 