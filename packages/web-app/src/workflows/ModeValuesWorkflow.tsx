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
  Radio,
  RadioGroup,
} from '@mui/material';
import { Token, Mode } from '@token-model/data-model';

interface VariableModeValue {
  id: string;
  modeIds: string[];
  tokenId: string;
  value: string | { type: 'ALIAS'; tokenId: string };
}

interface ModeValuesWorkflowProps {
  modeValues: VariableModeValue[];
  setModeValues: (modeValues: VariableModeValue[]) => void;
  tokens: Token[];
  modes: Mode[];
}

type ValueType = 'string' | 'alias';

function isAliasValue(value: string | { type: 'ALIAS'; tokenId: string }): value is { type: 'ALIAS'; tokenId: string } {
  return typeof value === 'object' && value !== null && 'type' in value && value.type === 'ALIAS';
}

export default function ModeValuesWorkflow({
  modeValues,
  setModeValues,
  tokens,
  modes,
}: ModeValuesWorkflowProps) {
  const [newModeValue, setNewModeValue] = useState<Partial<VariableModeValue>>({
    modeIds: [],
    tokenId: '',
    value: '',
  });
  const [valueType, setValueType] = useState<ValueType>('string');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleAddModeValue = () => {
    setFieldErrors({});
    try {
      const value = valueType === 'string' 
        ? newModeValue.value as string
        : { type: 'ALIAS' as const, tokenId: newModeValue.value as string };

      const modeValue: VariableModeValue = {
        id: crypto.randomUUID(),
        modeIds: newModeValue.modeIds || [],
        tokenId: newModeValue.tokenId || '',
        value,
      };
      setModeValues([...modeValues, modeValue]);
      setNewModeValue({
        modeIds: [],
        tokenId: '',
        value: '',
      });
      setValueType('string');
    } catch (error: unknown) {
      if (error instanceof Error) {
        setFieldErrors({ general: error.message });
      } else {
        setFieldErrors({ general: 'An unexpected error occurred.' });
      }
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Add New Mode Value
          </Typography>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth error={Boolean(fieldErrors.tokenId)}>
              <InputLabel>Token</InputLabel>
              <Select
                value={newModeValue.tokenId || ''}
                label="Token"
                onChange={(e) => setNewModeValue({ ...newModeValue, tokenId: e.target.value })}
              >
                {tokens.map((token) => (
                  <MenuItem key={token.id} value={token.id}>
                    {token.displayName}
                  </MenuItem>
                ))}
              </Select>
              {fieldErrors.tokenId && (
                <Typography color="error" variant="caption">
                  {fieldErrors.tokenId}
                </Typography>
              )}
            </FormControl>

            <FormControl fullWidth error={Boolean(fieldErrors.modeIds)}>
              <InputLabel>Modes</InputLabel>
              <Select
                multiple
                value={newModeValue.modeIds || []}
                label="Modes"
                onChange={(e) => setNewModeValue({ ...newModeValue, modeIds: e.target.value as string[] })}
              >
                {modes.map((mode) => (
                  <MenuItem key={mode.id} value={mode.id}>
                    {mode.name}
                  </MenuItem>
                ))}
              </Select>
              {fieldErrors.modeIds && (
                <Typography color="error" variant="caption">
                  {fieldErrors.modeIds}
                </Typography>
              )}
            </FormControl>

            <FormControl component="fieldset">
              <Typography variant="subtitle1">Value Type</Typography>
              <RadioGroup
                value={valueType}
                onChange={(e) => setValueType(e.target.value as ValueType)}
              >
                <FormControlLabel value="string" control={<Radio />} label="String Value" />
                <FormControlLabel value="alias" control={<Radio />} label="Token Alias" />
              </RadioGroup>
            </FormControl>

            {valueType === 'string' ? (
              <TextField
                label="Value"
                value={newModeValue.value as string}
                onChange={(e) => setNewModeValue({ ...newModeValue, value: e.target.value })}
                error={Boolean(fieldErrors.value)}
                helperText={fieldErrors.value}
              />
            ) : (
              <FormControl fullWidth error={Boolean(fieldErrors.value)}>
                <InputLabel>Alias Token</InputLabel>
                <Select
                  value={newModeValue.value as string}
                  label="Alias Token"
                  onChange={(e) => setNewModeValue({ ...newModeValue, value: e.target.value })}
                >
                  {tokens.map((token) => (
                    <MenuItem key={token.id} value={token.id}>
                      {token.displayName}
                    </MenuItem>
                  ))}
                </Select>
                {fieldErrors.value && (
                  <Typography color="error" variant="caption">
                    {fieldErrors.value}
                  </Typography>
                )}
              </FormControl>
            )}

            {fieldErrors.general && (
              <Typography color="error">{fieldErrors.general}</Typography>
            )}
            <Button variant="contained" onClick={handleAddModeValue}>
              Add Mode Value
            </Button>
          </Box>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Mode Values List
          </Typography>
          <List>
            {modeValues.map((modeValue) => {
              const token = tokens.find((t) => t.id === modeValue.tokenId);
              const modeNames = modeValue.modeIds
                .map((id: string) => modes.find((m) => m.id === id)?.name || 'Unknown')
                .join(', ');
              const valueDisplay = typeof modeValue.value === 'string'
                ? modeValue.value
                : (modeValue.value as { type: 'ALIAS'; tokenId: string }).type === 'ALIAS'
                  ? `Alias to: ${tokens.find((t) => t.id === (modeValue.value as { type: 'ALIAS'; tokenId: string }).tokenId)?.displayName || 'Unknown'}`
                  : 'Invalid value type';

              return (
                <ListItem key={modeValue.id}>
                  <ListItemText
                    primary={`${token?.displayName || 'Unknown Token'} - ${modeNames}`}
                    secondary={`Value: ${valueDisplay}`}
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