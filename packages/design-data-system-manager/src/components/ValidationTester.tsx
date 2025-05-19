import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import type { Token, TokenCollection, Mode } from '@token-model/data-model';

interface ValidationTesterProps {
  tokens: Token[];
  collections: TokenCollection[];
  modes: Mode[];
  onValidate: (token: Token) => void;
}

export function ValidationTester({ tokens = [], collections = [], modes = [], onValidate }: ValidationTesterProps) {
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [validationResult, setValidationResult] = useState<string | null>(null);

  const handleTokenSelect = (tokenId: string) => {
    const token = tokens.find(t => t.id === tokenId);
    setSelectedToken(token || null);
    setValidationResult(null);
  };

  const handleValidate = () => {
    if (selectedToken) {
      onValidate(selectedToken);
      setValidationResult('Validation completed. Check console for details.');
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Token Validation Tester
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Select Token</InputLabel>
            <Select
              value={selectedToken?.id || ''}
              onChange={(e) => handleTokenSelect(e.target.value)}
              label="Select Token"
            >
              {tokens?.map((token) => (
                <MenuItem key={token.id} value={token.id}>
                  {token.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedToken && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Selected Token Details
              </Typography>
              <Typography variant="body2">
                Name: {selectedToken.displayName}
              </Typography>
              <Typography variant="body2">
                Collection: {collections?.find(c => c.id === selectedToken.tokenCollectionId)?.name}
              </Typography>
              <Typography variant="body2">
                Value Type: {selectedToken.resolvedValueType}
              </Typography>
              <Button
                variant="contained"
                onClick={handleValidate}
                sx={{ mt: 2 }}
              >
                Validate Token
              </Button>
            </Box>
          )}

          {validationResult && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {validationResult}
            </Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
} 