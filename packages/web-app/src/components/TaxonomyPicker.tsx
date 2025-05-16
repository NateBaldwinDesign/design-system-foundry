import React from 'react';
import { Box, Button, FormControl, InputLabel, Select, MenuItem, IconButton, FormHelperText, Typography } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Warning as WarningIcon } from '@mui/icons-material';
import type { Taxonomy, TokenTaxonomyRef } from '@token-model/data-model';

interface TaxonomyPickerProps {
  taxonomies: Taxonomy[];
  value: TokenTaxonomyRef[];
  onChange: (newValue: TokenTaxonomyRef[]) => void;
  disabled?: boolean;
}

export function TaxonomyPicker({ taxonomies, value, onChange, disabled }: TaxonomyPickerProps) {
  // Ensure value is always an array
  const safeValue = Array.isArray(value) ? value : [];

  // Remove any taxonomy/term pairs that are no longer valid (terms only, not taxonomyId)
  React.useEffect(() => {
    const filtered = safeValue.filter(ref =>
      // Always keep if taxonomyId is present (even if not in top-level list)
      ref.taxonomyId &&
      (ref.termId === '' || taxonomies.find(tax => tax.id === ref.taxonomyId)?.terms.some(term => term.id === ref.termId) || !taxonomies.find(tax => tax.id === ref.taxonomyId))
    );
    if (JSON.stringify(filtered) !== JSON.stringify(safeValue)) {
      onChange(filtered);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxonomies]);

  const handleTaxonomyRefChange = (index: number, field: 'taxonomyId' | 'termId', fieldValue: string) => {
    onChange(
      safeValue.map((ref, i) =>
        i === index
          ? field === 'taxonomyId'
            ? { taxonomyId: fieldValue, termId: '' } // Reset termId if taxonomy changes
            : { ...ref, termId: fieldValue }
          : ref
      )
    );
  };

  const handleAddTaxonomyRef = () => {
    // Only allow adding taxonomies that haven't been selected yet
    const availableTaxonomies = taxonomies.filter(tax =>
      !safeValue.some(ref => ref.taxonomyId === tax.id)
    );
    if (availableTaxonomies.length === 0) return;
    onChange([
      ...safeValue,
      { taxonomyId: '', termId: '' }
    ]);
  };

  const handleRemoveTaxonomyRef = (index: number) => {
    onChange(safeValue.filter((_, i) => i !== index));
  };

  // Check if all taxonomies are already assigned (only those present in the top-level list)
  const allTaxonomiesAssigned = taxonomies.length > 0 && taxonomies.every(tax =>
    safeValue.some(ref => ref.taxonomyId === tax.id)
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {safeValue.map((ref, idx: number) => {
        const selectedTaxonomy = taxonomies.find(t => t.id === ref.taxonomyId);
        const taxonomyMissing = !selectedTaxonomy;
        const termMissing = ref.termId && selectedTaxonomy && !selectedTaxonomy.terms.some(term => term.id === ref.termId);
        return (
          <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <FormControl sx={{ minWidth: 200 }} disabled={disabled} error={!!taxonomyMissing}>
              <InputLabel>Taxonomy</InputLabel>
              <Select
                value={ref.taxonomyId}
                label="Taxonomy"
                onChange={e => handleTaxonomyRefChange(idx, 'taxonomyId', e.target.value)}
              >
                <MenuItem value=""><em>Select a taxonomy</em></MenuItem>
                {taxonomies.map(tax => (
                  <MenuItem 
                    key={tax.id} 
                    value={tax.id} 
                    title={tax.description || ''}
                    disabled={safeValue.some((r, i) => i !== idx && r.taxonomyId === tax.id)}
                  >
                    {tax.name}
                  </MenuItem>
                ))}
                {taxonomyMissing && ref.taxonomyId && (
                  <MenuItem value={ref.taxonomyId} disabled>
                    <WarningIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
                    Missing taxonomy ({ref.taxonomyId})
                  </MenuItem>
                )}
              </Select>
              {taxonomyMissing && ref.taxonomyId && (
                <FormHelperText error>
                  <WarningIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  This taxonomy is missing from the current settings.
                </FormHelperText>
              )}
              {selectedTaxonomy?.description && !taxonomyMissing && (
                <FormHelperText>{selectedTaxonomy.description}</FormHelperText>
              )}
            </FormControl>
            <FormControl sx={{ minWidth: 200 }} disabled={!ref.taxonomyId || disabled || taxonomyMissing} error={!!termMissing}>
              <InputLabel>Term</InputLabel>
              <Select
                value={ref.termId}
                label="Term"
                onChange={e => handleTaxonomyRefChange(idx, 'termId', e.target.value)}
              >
                <MenuItem value=""><em>Select a term</em></MenuItem>
                {selectedTaxonomy?.terms.map(term => (
                  <MenuItem key={term.id} value={term.id} title={term.description || ''}>
                    {term.name}
                  </MenuItem>
                ))}
                {termMissing && ref.termId && (
                  <MenuItem value={ref.termId} disabled>
                    <WarningIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} />
                    Missing term ({ref.termId})
                  </MenuItem>
                )}
              </Select>
              {termMissing && ref.termId && (
                <FormHelperText error>
                  <WarningIcon fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                  This term is missing from the selected taxonomy.
                </FormHelperText>
              )}
              {selectedTaxonomy?.terms.find(t => t.id === ref.termId)?.description && !termMissing && (
                <FormHelperText>
                  {selectedTaxonomy.terms.find(t => t.id === ref.termId)?.description}
                </FormHelperText>
              )}
            </FormControl>
            <IconButton onClick={() => handleRemoveTaxonomyRef(idx)} sx={{ mt: 1 }} disabled={disabled}>
              <DeleteIcon />
            </IconButton>
          </Box>
        );
      })}
      <Button
        startIcon={<AddIcon />}
        onClick={handleAddTaxonomyRef}
        disabled={disabled || allTaxonomiesAssigned}
      >
        Add Taxonomy
      </Button>
      {allTaxonomiesAssigned && (
        <FormHelperText>
          All available taxonomies have been added.
        </FormHelperText>
      )}
      {taxonomies.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No taxonomies are defined in settings.
        </Typography>
      )}
    </Box>
  );
} 