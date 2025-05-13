import { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Typography,
  IconButton,
  FormControlLabel,
  Switch,
  Grid,
  Chip,
  SelectChangeEvent,
  FormHelperText
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { Token, TokenCollection, Mode, TokenValue, Dimension } from '@token-model/data-model';

interface TokenFormProps {
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  tokens: Token[];
  onSubmit: (token: Omit<Token, 'id'>) => void;
  initialData?: Token;
}

export function TokenForm({ collections, modes, dimensions, tokens, onSubmit, initialData }: TokenFormProps) {
  const [formData, setFormData] = useState<Omit<Token, 'id'>>({
    displayName: '',
    description: '',
    tokenCollectionId: '',
    resolvedValueType: 'COLOR',
    private: false,
    taxonomies: {},
    propertyTypes: ['ALL_PROPERTY_TYPES'],
    codeSyntax: {},
    valuesByMode: []
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleInputChange = (field: keyof Omit<Token, 'id'>, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTaxonomyChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      taxonomies: {
        ...prev.taxonomies,
        [key]: value
      }
    }));
  };

  const handleCodeSyntaxChange = (platform: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      codeSyntax: {
        ...prev.codeSyntax,
        [platform]: value
      }
    }));
  };

  const getAvailableModes = (selectedModeIds: string[]) => {
    const requiredDimensions = dimensions.filter(d => d.required);
    const optionalDimensions = dimensions.filter(d => !d.required);
    
    // Get modes for required dimensions that haven't been selected yet
    const requiredModes = requiredDimensions
      .flatMap(d => modes.filter(m => m.dimensionId === d.id))
      .filter(m => !selectedModeIds.includes(m.id));

    // Get modes for optional dimensions
    const optionalModes = optionalDimensions
      .flatMap(d => modes.filter(m => m.dimensionId === d.id));

    return [...requiredModes, ...optionalModes];
  };

  const handleValueByModeChange = (index: number, field: 'modeIds' | 'value', value: any) => {
    setFormData(prev => ({
      ...prev,
      valuesByMode: (prev.valuesByMode || []).map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addValueByMode = () => {
    // Start with required dimensions
    const requiredModeIds = dimensions
      .filter(d => d.required)
      .map(d => modes.find(m => m.dimensionId === d.id && m.name === d.defaultMode)?.id)
      .filter(Boolean) as string[];

    setFormData(prev => ({
      ...prev,
      valuesByMode: [...(prev.valuesByMode || []), { 
        modeIds: requiredModeIds,
        value: { type: 'COLOR', value: '' } 
      }]
    }));
  };

  const removeValueByMode = (index: number) => {
    setFormData(prev => ({
      ...prev,
      valuesByMode: (prev.valuesByMode || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getValueInput = (value: TokenValue, onChange: (value: TokenValue) => void) => {
    switch (value.type) {
      case 'COLOR':
        return (
          <TextField
            label="Color Value"
            value={value.value}
            onChange={(e) => onChange({ type: 'COLOR', value: e.target.value })}
            type="color"
          />
        );
      case 'FLOAT':
        return (
          <TextField
            label="Float Value"
            value={value.value}
            onChange={(e) => onChange({ type: 'FLOAT', value: parseFloat(e.target.value) })}
            type="number"
            inputProps={{ step: '0.1' }}
          />
        );
      case 'INTEGER':
        return (
          <TextField
            label="Integer Value"
            value={value.value}
            onChange={(e) => onChange({ type: 'INTEGER', value: parseInt(e.target.value) })}
            type="number"
          />
        );
      case 'STRING':
        return (
          <TextField
            label="String Value"
            value={value.value}
            onChange={(e) => onChange({ type: 'STRING', value: e.target.value })}
          />
        );
      case 'BOOLEAN':
        return (
          <FormControl>
            <InputLabel>Boolean Value</InputLabel>
            <Select
              value={value.value ? 'true' : 'false'}
              label="Boolean Value"
              onChange={(e) => onChange({ type: 'BOOLEAN', value: e.target.value === 'true' })}
            >
              <MenuItem value="true">True</MenuItem>
              <MenuItem value="false">False</MenuItem>
            </Select>
          </FormControl>
        );
      case 'ALIAS':
        return (
          <FormControl>
            <InputLabel>Token Reference</InputLabel>
            <Select
              value={value.tokenId}
              label="Token Reference"
              onChange={(e) => onChange({ type: 'ALIAS', tokenId: e.target.value })}
            >
              {tokens.map(token => (
                <MenuItem key={token.id} value={token.id}>
                  {token.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      default:
        return null;
    }
  };

  const handleValueTypeChange = (index: number, type: TokenValue['type']) => {
    setFormData(prev => ({
      ...prev,
      valuesByMode: (prev.valuesByMode || []).map((item, i) => 
        i === index ? { 
          ...item, 
          value: type === 'COLOR' 
            ? { type: 'COLOR', value: '' }
            : type === 'FLOAT'
            ? { type: 'FLOAT', value: 0 }
            : type === 'INTEGER'
            ? { type: 'INTEGER', value: 0 }
            : type === 'STRING'
            ? { type: 'STRING', value: '' }
            : type === 'ALIAS'
            ? { type: 'ALIAS', tokenId: '' }
            : { type: 'BOOLEAN', value: false }
        } : item
      )
    }));
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 800 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Display Name"
            value={formData.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            required
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            multiline
            rows={2}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Collection</InputLabel>
            <Select
              value={formData.tokenCollectionId}
              label="Collection"
              onChange={(e) => handleInputChange('tokenCollectionId', e.target.value)}
            >
              {collections.map(collection => (
                <MenuItem key={collection.id} value={collection.id}>
                  {collection.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Value Type</InputLabel>
            <Select
              value={formData.resolvedValueType}
              label="Value Type"
              onChange={(e) => handleInputChange('resolvedValueType', e.target.value)}
            >
              {['COLOR', 'FLOAT', 'INTEGER', 'STRING', 'BOOLEAN', 'ALIAS'].map(type => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.private}
                onChange={(e) => handleInputChange('private', e.target.checked)}
              />
            }
            label="Private Token"
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Taxonomies
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(formData.taxonomies).map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Key"
                  value={key}
                  onChange={(e) => {
                    const newKey = e.target.value;
                    const newTaxonomies = { ...formData.taxonomies };
                    delete newTaxonomies[key];
                    newTaxonomies[newKey] = value;
                    handleInputChange('taxonomies', newTaxonomies);
                  }}
                />
                <TextField
                  label="Value"
                  value={value}
                  onChange={(e) => handleTaxonomyChange(key, e.target.value)}
                />
                <IconButton
                  onClick={() => {
                    const newTaxonomies = { ...formData.taxonomies };
                    delete newTaxonomies[key];
                    handleInputChange('taxonomies', newTaxonomies);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={() => handleTaxonomyChange('', '')}
            >
              Add Taxonomy
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Code Syntax
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(formData.codeSyntax).map(([platform, syntax]) => (
              <Box key={platform} sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Platform"
                  value={platform}
                  onChange={(e) => {
                    const newPlatform = e.target.value;
                    const newCodeSyntax = { ...formData.codeSyntax };
                    delete newCodeSyntax[platform];
                    newCodeSyntax[newPlatform] = syntax;
                    handleInputChange('codeSyntax', newCodeSyntax);
                  }}
                />
                <TextField
                  label="Syntax"
                  value={syntax}
                  onChange={(e) => handleCodeSyntaxChange(platform, e.target.value)}
                />
                <IconButton
                  onClick={() => {
                    const newCodeSyntax = { ...formData.codeSyntax };
                    delete newCodeSyntax[platform];
                    handleInputChange('codeSyntax', newCodeSyntax);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={() => handleCodeSyntaxChange('', '')}
            >
              Add Code Syntax
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Values by Mode
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {(formData.valuesByMode || []).map((valueByMode, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 2 }}>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Modes</InputLabel>
                  <Select
                    multiple
                    value={valueByMode.modeIds}
                    label="Modes"
                    onChange={(e) => handleValueByModeChange(index, 'modeIds', e.target.value)}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((modeId) => {
                          const mode = modes.find(m => m.id === modeId);
                          const dimension = dimensions.find(d => d.id === mode?.dimensionId);
                          return (
                            <Chip 
                              key={modeId} 
                              label={`${dimension?.displayName || 'Unknown'}: ${mode?.name || modeId}`}
                              color={dimension?.required ? 'primary' : 'default'}
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {getAvailableModes(valueByMode.modeIds).map(mode => {
                      const dimension = dimensions.find(d => d.id === mode.dimensionId);
                      return (
                        <MenuItem key={mode.id} value={mode.id}>
                          {dimension?.displayName || 'Unknown'}: {mode.name}
                          {dimension?.required && ' (Required)'}
                        </MenuItem>
                      );
                    })}
                  </Select>
                  <FormHelperText>
                    Required dimensions are marked with (Required)
                  </FormHelperText>
                </FormControl>
                <FormControl sx={{ minWidth: 200 }}>
                  <InputLabel>Value Type</InputLabel>
                  <Select
                    value={valueByMode.value.type}
                    label="Value Type"
                    onChange={(e) => handleValueTypeChange(index, e.target.value as TokenValue['type'])}
                  >
                    <MenuItem value="COLOR">Color</MenuItem>
                    <MenuItem value="FLOAT">Float</MenuItem>
                    <MenuItem value="INTEGER">Integer</MenuItem>
                    <MenuItem value="STRING">String</MenuItem>
                    <MenuItem value="BOOLEAN">Boolean</MenuItem>
                    <MenuItem value="ALIAS">Alias</MenuItem>
                  </Select>
                </FormControl>
                {getValueInput(valueByMode.value, (value) => handleValueByModeChange(index, 'value', value))}
                <IconButton onClick={() => removeValueByMode(index)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={addValueByMode}
            >
              Add Value by Mode
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
          >
            {initialData ? 'Update Token' : 'Create Token'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
} 