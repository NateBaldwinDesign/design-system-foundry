import { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import type { Taxonomy } from '@token-model/data-model';

interface TaxonomyPickerProps {
  taxonomies: Taxonomy[];
  value: { taxonomyId: string; termId: string }[];
  onChange: (value: { taxonomyId: string; termId: string }[]) => void;
  disabled?: boolean;
}

export function TaxonomyPicker({ taxonomies, value, onChange, disabled = false }: TaxonomyPickerProps) {
  // State for adding a new taxonomy assignment
  const [adding, setAdding] = useState(false);
  const [selectedTaxonomyId, setSelectedTaxonomyId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');

  // Only allow taxonomies not already assigned
  const availableTaxonomies = taxonomies.filter(
    t => !value.some(v => v.taxonomyId === t.id)
  );

  const handleAdd = () => {
    if (selectedTaxonomyId && selectedTermId) {
      onChange([...value, { taxonomyId: selectedTaxonomyId, termId: selectedTermId }]);
      setAdding(false);
      setSelectedTaxonomyId('');
      setSelectedTermId('');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {value.map((assignment, idx) => {
          const taxonomy = taxonomies.find(t => t.id === assignment.taxonomyId);
          const term = taxonomy?.terms.find(term => term.id === assignment.termId);
          return (
            <Chip
              key={assignment.taxonomyId}
              label={taxonomy && term ? `${taxonomy.name}: ${term.name}` : 'Unknown'}
              onDelete={disabled ? undefined : () => onChange(value.filter((_, i) => i !== idx))}
              sx={{ fontSize: 14 }}
              disabled={disabled}
            />
          );
        })}
      </Box>
      {adding ? (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Taxonomy</InputLabel>
            <Select
              value={selectedTaxonomyId}
              label="Taxonomy"
              onChange={e => {
                setSelectedTaxonomyId(e.target.value);
                setSelectedTermId('');
              }}
              disabled={disabled}
            >
              {availableTaxonomies.map(tax => (
                <MenuItem key={tax.id} value={tax.id}>{tax.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }} disabled={!selectedTaxonomyId}>
            <InputLabel>Term</InputLabel>
            <Select
              value={selectedTermId}
              label="Term"
              onChange={e => setSelectedTermId(e.target.value)}
              disabled={!selectedTaxonomyId || disabled}
            >
              {taxonomies.find(t => t.id === selectedTaxonomyId)?.terms.map(term => (
                <MenuItem key={term.id} value={term.id}>{term.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="small"
            onClick={handleAdd}
            disabled={!selectedTaxonomyId || !selectedTermId || disabled}
          >
            Add
          </Button>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              setAdding(false);
              setSelectedTaxonomyId('');
              setSelectedTermId('');
            }}
          >
            Cancel
          </Button>
        </Box>
      ) : (
        <Button
          variant="outlined"
          size="small"
          onClick={() => setAdding(true)}
          disabled={availableTaxonomies.length === 0 || disabled}
        >
          Add Taxonomy
        </Button>
      )}
    </Box>
  );
} 