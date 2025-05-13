import React, { useState } from 'react';
import {
  Box,
  Button,
  Popover,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  TextField
} from '@mui/material';
import type { Token, TokenValue } from '@token-model/data-model';
import Color from 'colorjs.io';

interface TokenValuePickerProps {
  resolvedValueType: string;
  value: TokenValue | string;
  tokens: Token[];
  constraints?: any[];
  onChange: (newValue: TokenValue) => void;
  excludeTokenId?: string;
}

function satisfiesConstraints(token: Token, constraints?: any[]): boolean {
  if (!constraints || constraints.length === 0) return true;
  for (const constraint of constraints) {
    if (constraint.type === 'contrast') {
      // Find the color value for this token (global or first mode)
      let color: string | undefined;
      if (token.valuesByMode && token.valuesByMode.length > 0) {
        const vbm = token.valuesByMode[0];
        if (vbm.value && typeof vbm.value === 'object' && vbm.value.type === 'COLOR') {
          color = vbm.value.value;
        }
      }
      if (!color) return false;
      const comparator = constraint.rule.comparator.value;
      const min = constraint.rule.minimum;
      const method = constraint.rule.method || 'WCAG21';
      let colorjsMethod: string;
      if (method === 'WCAG21') colorjsMethod = 'WCAG21';
      else if (method === 'APCA') colorjsMethod = 'APCA';
      else if (method === 'Lstar') colorjsMethod = 'Lstar';
      else colorjsMethod = 'WCAG21';
      try {
        // @ts-ignore colorjs.io types mismatch runtime for constructor
        const c1 = new Color(color);
        // @ts-ignore colorjs.io types mismatch runtime for constructor
        const c2 = new Color(comparator);
        // @ts-ignore colorjs.io types mismatch runtime for contrast
        if (c1.contrast(c2, colorjsMethod) < min) return false;
      } catch {
        return false;
      }
    }
    // Add more constraint types here as needed
  }
  return true;
}

export const TokenValuePicker: React.FC<TokenValuePickerProps> = ({
  resolvedValueType,
  value,
  tokens,
  constraints,
  onChange,
  excludeTokenId
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tab, setTab] = useState(0);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  const open = Boolean(anchorEl);

  // Filter tokens for the "token" tab
  const filteredTokens = tokens.filter(
    t =>
      t.resolvedValueType === resolvedValueType &&
      t.id !== excludeTokenId &&
      satisfiesConstraints(t, constraints)
  );

  // Render the value for the button
  let buttonLabel = '';
  if (typeof value === 'string') {
    buttonLabel = value;
  } else if (value.type === 'COLOR') {
    buttonLabel = value.value;
  } else if (value.type === 'ALIAS') {
    const aliasToken = tokens.find(t => t.id === value.tokenId);
    buttonLabel = aliasToken ? `Alias: ${aliasToken.displayName}` : `Alias: ${value.tokenId}`;
  } else if (value.type === 'FLOAT' || value.type === 'INTEGER') {
    buttonLabel = String(value.value);
  } else if (value.type === 'STRING') {
    buttonLabel = value.value;
  } else if (value.type === 'BOOLEAN') {
    buttonLabel = value.value ? 'True' : 'False';
  } else {
    buttonLabel = JSON.stringify(value);
  }

  return (
    <>
      <Button variant="outlined" onClick={handleOpen} sx={{ minWidth: 120 }}>
        {buttonLabel || 'Set value'}
      </Button>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ width: 320, p: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Custom" />
            <Tab label="Token" />
          </Tabs>
          {tab === 0 && (
            <Box sx={{ mt: 2 }}>
              {resolvedValueType === 'COLOR' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input
                    type="color"
                    value={typeof value === 'object' && value.type === 'COLOR' ? value.value : '#000000'}
                    onChange={e => onChange({ type: 'COLOR', value: e.target.value })}
                  />
                  <TextField
                    size="small"
                    value={typeof value === 'object' && value.type === 'COLOR' ? value.value : ''}
                    onChange={e => onChange({ type: 'COLOR', value: e.target.value })}
                  />
                </Box>
              )}
              {(resolvedValueType === 'FLOAT' || resolvedValueType === 'INTEGER') && (
                <TextField
                  type="number"
                  size="small"
                  value={typeof value === 'object' && (value.type === 'FLOAT' || value.type === 'INTEGER') ? value.value : ''}
                  onChange={e => onChange({ type: resolvedValueType as 'FLOAT' | 'INTEGER', value: Number(e.target.value) })}
                  fullWidth
                />
              )}
              {resolvedValueType === 'STRING' && (
                <TextField
                  size="small"
                  value={typeof value === 'object' && value.type === 'STRING' ? value.value : ''}
                  onChange={e => onChange({ type: 'STRING', value: e.target.value })}
                  fullWidth
                />
              )}
              {resolvedValueType === 'BOOLEAN' && (
                <Button
                  variant="contained"
                  color={typeof value === 'object' && value.type === 'BOOLEAN' && value.value ? 'success' : 'error'}
                  onClick={() => onChange({ type: 'BOOLEAN', value: !(typeof value === 'object' && value.type === 'BOOLEAN' ? value.value : false) })}
                  fullWidth
                >
                  {typeof value === 'object' && value.type === 'BOOLEAN' && value.value ? 'True' : 'False'}
                </Button>
              )}
              {/* Add more types as needed */}
            </Box>
          )}
          {tab === 1 && (
            <Box sx={{ mt: 2 }}>
              {filteredTokens.length === 0 ? (
                <Typography color="text.secondary">No matching tokens available.</Typography>
              ) : (
                <List dense>
                  {filteredTokens.map(token => (
                    <ListItem key={token.id} disablePadding>
                      <ListItemButton
                        onClick={() => {
                          onChange({ type: 'ALIAS', tokenId: token.id });
                          handleClose();
                        }}
                      >
                        <ListItemText primary={token.displayName} secondary={token.description} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}; 