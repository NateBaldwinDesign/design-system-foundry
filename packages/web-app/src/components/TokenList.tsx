import { useState } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  Chip,
  IconButton
} from '@mui/material';
import type { Token, TokenCollection, Mode } from '@token-model/data-model';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface TokenListProps {
  tokens: Token[];
  collections: TokenCollection[];
  modes: Mode[];
  onEdit: (token: Token) => void;
  onDelete: (tokenId: string) => void;
}

export function TokenList({ tokens, collections, modes, onEdit, onDelete }: TokenListProps) {
  const [expandedToken, setExpandedToken] = useState<string | null>(null);

  const handleExpand = (tokenId: string) => {
    setExpandedToken(expandedToken === tokenId ? null : tokenId);
  };

  const getCollectionName = (collectionId: string) => {
    return collections.find(c => c.id === collectionId)?.name || collectionId;
  };

  const getModeNames = (modeIds: string[]) => {
    return modeIds.map(id => modes.find(m => m.id === id)?.name || id).join(', ');
  };

  const getValueTypeName = (type: string) => type;

  const getValueDisplay = (value: any) => {
    switch (typeof value) {
      case 'object':
        return JSON.stringify(value);
      case 'string':
        return value;
      case 'number':
        return value.toString();
      case 'boolean':
        return value ? 'True' : 'False';
      default:
        return 'Unknown value type';
    }
  };

  return (
    <List>
      {tokens.map((token) => (
        <ListItem
          key={token.id}
          sx={{
            border: '1px solid #eee',
            borderRadius: 1,
            mb: 1,
            '&:hover': {
              backgroundColor: '#f5f5f5'
            }
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6">{token.displayName}</Typography>
              {token.private && (
                <Chip
                  label="Private"
                  size="small"
                  color="default"
                />
              )}
              <Chip
                label={getValueTypeName(token.resolvedValueType)}
                size="small"
                color="primary"
              />
            </Box>

            <Box sx={{ color: 'text.secondary' }}>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2">
                  {token.description}
                </Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2">
                  Collection: {getCollectionName(token.tokenCollectionId)}
                </Typography>
              </Box>
              {token.taxonomies && Object.entries(token.taxonomies).length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    Taxonomies: {Object.entries(token.taxonomies).map(([key, value]) => `${key}: ${value}`).join(', ')}
                  </Typography>
                </Box>
              )}
              {token.valuesByMode && token.valuesByMode.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Values by Mode:
                  </Typography>
                  {token.valuesByMode.map((valueByMode, index) => (
                    <Box key={index} sx={{ ml: 2 }}>
                      <Typography variant="body2">
                        {getModeNames(valueByMode.modeIds)}: {getValueDisplay(valueByMode.value)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
              {token.codeSyntax && Object.entries(token.codeSyntax).length > 0 && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    Code Syntax:
                  </Typography>
                  {Object.entries(token.codeSyntax).map(([platform, syntax]) => (
                    <Box key={platform} sx={{ ml: 2 }}>
                      <Typography variant="body2">
                        {platform}: {syntax}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => onEdit(token)}>
              <EditIcon />
            </IconButton>
            <IconButton onClick={() => onDelete(token.id)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </ListItem>
      ))}
    </List>
  );
} 