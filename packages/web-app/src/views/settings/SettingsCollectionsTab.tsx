import React from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  IconButton
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { TokenCollection, ResolvedValueType, DimensionType, FallbackStrategy } from '@token-model/data-model';

interface SettingsCollectionsTabProps {
  collections: TokenCollection[];
  setCollections: (collections: TokenCollection[]) => void;
  newCollection: Partial<TokenCollection>;
  setNewCollection: (c: Partial<TokenCollection>) => void;
  handleAddCollection: () => void;
  handleDeleteCollection: (id: string) => void;
}

export function SettingsCollectionsTab({
  collections,
  setCollections,
  newCollection,
  setNewCollection,
  handleAddCollection,
  handleDeleteCollection
}: SettingsCollectionsTabProps) {
  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Create New Collection
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 600 }}>
          <TextField
            label="Name"
            value={newCollection.name}
            onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
          />
          <FormControl>
            <InputLabel>Resolved Value Types</InputLabel>
            <Select
              multiple
              value={newCollection.resolvedValueTypes || []}
              onChange={(e) => setNewCollection({
                ...newCollection,
                resolvedValueTypes: e.target.value as ResolvedValueType[]
              })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="COLOR">Color</MenuItem>
              <MenuItem value="DIMENSION">Dimension</MenuItem>
              <MenuItem value="FONT_FAMILY">Font Family</MenuItem>
              <MenuItem value="FONT_WEIGHT">Font Weight</MenuItem>
              <MenuItem value="FONT_STYLE">Font Style</MenuItem>
              <MenuItem value="DURATION">Duration</MenuItem>
              <MenuItem value="CUBIC_BEZIER">Cubic Bezier</MenuItem>
              <MenuItem value="BORDER_WIDTH">Border Width</MenuItem>
              <MenuItem value="CORNER_ROUNDING">Corner Rounding</MenuItem>
              <MenuItem value="ELEVATION">Elevation</MenuItem>
              <MenuItem value="SHADOW">Shadow</MenuItem>
              <MenuItem value="OPACITY">Opacity</MenuItem>
              <MenuItem value="NUMBER">Number</MenuItem>
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>Mode Resolution Priority</InputLabel>
            <Select
              multiple
              value={newCollection.modeResolutionStrategy?.priorityByType ?? []}
              onChange={(e) => setNewCollection({
                ...newCollection,
                modeResolutionStrategy: {
                  priorityByType: e.target.value as DimensionType[],
                  fallbackStrategy: newCollection.modeResolutionStrategy?.fallbackStrategy ?? 'MOST_SPECIFIC_MATCH',
                }
              })}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} />
                  ))}
                </Box>
              )}
            >
              <MenuItem value="COLOR_SCHEME">Color Scheme</MenuItem>
              <MenuItem value="CONTRAST">Contrast</MenuItem>
            </Select>
          </FormControl>
          <FormControl>
            <InputLabel>Fallback Strategy</InputLabel>
            <Select
              value={newCollection.modeResolutionStrategy?.fallbackStrategy ?? 'MOST_SPECIFIC_MATCH'}
              onChange={(e) => setNewCollection({
                ...newCollection,
                modeResolutionStrategy: {
                  priorityByType: newCollection.modeResolutionStrategy?.priorityByType ?? [],
                  fallbackStrategy: e.target.value as FallbackStrategy,
                }
              })}
            >
              <MenuItem value="MOST_SPECIFIC_MATCH">Most Specific Match</MenuItem>
              <MenuItem value="FIRST_MATCH">First Match</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            onClick={handleAddCollection}
          >
            Add Collection
          </Button>
        </Box>
      </Box>
      <Typography variant="h6" gutterBottom>
        Existing Collections
      </Typography>
      {collections.map((collection) => (
        <Paper key={collection.id} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1">{collection.name}</Typography>
            <IconButton onClick={() => handleDeleteCollection(collection.id)}>
              <DeleteIcon />
            </IconButton>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Value Types: {collection.resolvedValueTypes.join(', ')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Mode Priority: {collection.modeResolutionStrategy?.priorityByType.join(' > ') || 'None'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fallback Strategy: {collection.modeResolutionStrategy?.fallbackStrategy || 'None'}
          </Typography>
        </Paper>
      ))}
    </>
  );
} 