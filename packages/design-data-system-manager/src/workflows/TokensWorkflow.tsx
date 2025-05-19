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
import { Token, TokenCollection, Taxonomy, TokenTaxonomyRef } from '@token-model/data-model';
import { Token as TokenSchema } from '../../../data-model/src/schema';
import { ZodError } from 'zod';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { TaxonomyPicker } from '../components/TaxonomyPicker';
import { useSchema } from '../hooks/useSchema';
import { CodeSyntaxService } from '../services/codeSyntax';

interface TokensWorkflowProps {
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  tokenCollections: TokenCollection[];
  taxonomies: Taxonomy[];
}

export default function TokensWorkflow({
  tokens,
  setTokens,
  tokenCollections,
  taxonomies,
}: TokensWorkflowProps) {
  const [newToken, setNewToken] = useState<Partial<Token>>({
    displayName: '',
    description: '',
    tokenCollectionId: '',
    resolvedValueType: 'COLOR',
    private: false,
    taxonomies: [] as TokenTaxonomyRef[],
    propertyTypes: [],
    codeSyntax: {},
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [newTaxonomyKey, setNewTaxonomyKey] = useState('');
  const [newTaxonomyValue, setNewTaxonomyValue] = useState('');
  const { schema } = useSchema();

  const handleAddToken = () => {
    setFieldErrors({});
    try {
      const validTaxonomies = (newToken.taxonomies || []).filter(
        (ref: any) => ref.taxonomyId && ref.termId
      );
      const codeSyntax = CodeSyntaxService.generateAllCodeSyntaxes(
        { ...newToken, taxonomies: validTaxonomies } as any,
        schema as any
      );
      const token = TokenSchema.parse({
        id: crypto.randomUUID(),
        ...newToken,
        resolvedValueType: (newToken.resolvedValueType as Token['resolvedValueType']) || 'COLOR',
        propertyTypes: (newToken.propertyTypes || []).filter(Boolean),
        taxonomies: validTaxonomies,
        codeSyntax
      });
      setTokens([...tokens, token]);
      setNewToken({
        displayName: '',
        description: '',
        tokenCollectionId: '',
        resolvedValueType: 'COLOR',
        private: false,
        taxonomies: [],
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
        taxonomies: [
          ...(newToken.taxonomies || []),
          { taxonomyId: newTaxonomyKey, termId: newTaxonomyValue },
        ],
      });
      setNewTaxonomyKey('');
      setNewTaxonomyValue('');
    }
  };

  const handleRemoveTaxonomy = (index: number) => {
    const newTaxonomies = newToken.taxonomies?.filter((_, i) => i !== index) || [];
    setNewToken({
      ...newToken,
      taxonomies: newTaxonomies,
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
              onChange={(e) => setNewToken({ ...newToken, resolvedValueType: e.target.value as Token['resolvedValueType'] })}
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
            <TaxonomyPicker
              taxonomies={taxonomies}
              value={Array.isArray(newToken.taxonomies) ? newToken.taxonomies : []}
              onChange={newTaxonomies => setNewToken(prev => ({ ...prev, taxonomies: newTaxonomies }))}
              disabled={taxonomies.length === 0}
            />

            <Typography variant="subtitle1">Code Syntax (auto-generated)</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.entries(CodeSyntaxService.generateAllCodeSyntaxes(newToken as any, schema as any)).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">{key}: {value}</Typography>
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
                        <div>
                          Taxonomies: {Array.isArray(token.taxonomies) && token.taxonomies.length > 0
                            ? token.taxonomies.map(ref => {
                                const taxonomy = taxonomies.find(t => t.id === ref.taxonomyId);
                                const term = taxonomy?.terms.find(term => term.id === ref.termId);
                                return taxonomy && term ? `${taxonomy.name}: ${term.name}` : 'Unknown';
                              }).join(', ')
                            : 'None'}
                        </div>
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