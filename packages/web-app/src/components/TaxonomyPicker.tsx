import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import { Delete, Add, Edit } from '@mui/icons-material';
import type { Taxonomy, TaxonomyTerm } from '@token-model/data-model';
import { createUniqueId } from '../utils/id';

interface TaxonomyPickerProps {
  taxonomies: Taxonomy[];
  value: { taxonomyId: string; termId: string }[];
  onChange: (value: { taxonomyId: string; termId: string }[]) => void;
  disabled?: boolean;
}

export function TaxonomyPicker({ taxonomies, value, onChange, disabled = false }: TaxonomyPickerProps) {
  const [editingTaxonomy, setEditingTaxonomy] = useState<Taxonomy | null>(null);
  const [editingTerm, setEditingTerm] = useState<{ taxonomyId: string; term: TaxonomyTerm } | null>(null);
  const [isNewTaxonomy, setIsNewTaxonomy] = useState(false);
  const [isNewTerm, setIsNewTerm] = useState(false);

  const handleAddTaxonomy = () => {
    const newTaxonomy: Taxonomy = {
      id: createUniqueId('taxonomy'),
      name: '',
      description: '',
      terms: []
    };
    setEditingTaxonomy(newTaxonomy);
    setIsNewTaxonomy(true);
  };

  const handleAddTerm = (taxonomyId: string) => {
    const newTerm: TaxonomyTerm = {
      id: createUniqueId('term'),
      name: '',
      description: ''
    };
    setEditingTerm({ taxonomyId, term: newTerm });
    setIsNewTerm(true);
  };

  const handleSaveTaxonomy = () => {
    if (!editingTaxonomy) return;

    if (isNewTaxonomy) {
      taxonomies.push(editingTaxonomy);
    } else {
      const index = taxonomies.findIndex(t => t.id === editingTaxonomy.id);
      if (index !== -1) {
        taxonomies[index] = editingTaxonomy;
      }
    }
    setEditingTaxonomy(null);
    setIsNewTaxonomy(false);
  };

  const handleSaveTerm = () => {
    if (!editingTerm) return;

    const taxonomy = taxonomies.find(t => t.id === editingTerm.taxonomyId);
    if (!taxonomy) return;

    if (isNewTerm) {
      taxonomy.terms.push(editingTerm.term);
    } else {
      const index = taxonomy.terms.findIndex(t => t.id === editingTerm.term.id);
      if (index !== -1) {
        taxonomy.terms[index] = editingTerm.term;
      }
    }
    setEditingTerm(null);
    setIsNewTerm(false);
  };

  const handleDeleteTaxonomy = (taxonomyId: string) => {
    const index = taxonomies.findIndex(t => t.id === taxonomyId);
    if (index !== -1) {
      taxonomies.splice(index, 1);
      // Remove any selected terms from this taxonomy
      onChange(value.filter(v => v.taxonomyId !== taxonomyId));
    }
  };

  const handleDeleteTerm = (taxonomyId: string, termId: string) => {
    const taxonomy = taxonomies.find(t => t.id === taxonomyId);
    if (!taxonomy) return;

    const index = taxonomy.terms.findIndex(t => t.id === termId);
    if (index !== -1) {
      taxonomy.terms.splice(index, 1);
      // Remove this term from selected values
      onChange(value.filter(v => !(v.taxonomyId === taxonomyId && v.termId === termId)));
    }
  };

  const handleToggleTerm = (taxonomyId: string, termId: string) => {
    const isSelected = value.some(v => v.taxonomyId === taxonomyId && v.termId === termId);
    if (isSelected) {
      onChange(value.filter(v => !(v.taxonomyId === taxonomyId && v.termId === termId)));
    } else {
      // Check if we already have a term from this taxonomy
      const existingIndex = value.findIndex(v => v.taxonomyId === taxonomyId);
      if (existingIndex !== -1) {
        // Replace the existing term
        const newValue = [...value];
        newValue[existingIndex] = { taxonomyId, termId };
        onChange(newValue);
      } else {
        // Add new term
        onChange([...value, { taxonomyId, termId }]);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Taxonomies</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddTaxonomy}
          disabled={disabled}
        >
          Add Taxonomy
        </Button>
      </Box>

      <List>
        {taxonomies.map(taxonomy => (
          <ListItem
            key={taxonomy.id}
            sx={{
              flexDirection: 'column',
              alignItems: 'stretch',
              bgcolor: 'background.paper',
              mb: 2,
              borderRadius: 1
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1">{taxonomy.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {taxonomy.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ID: {taxonomy.id}
                </Typography>
              </Box>
              <Box>
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingTaxonomy(taxonomy);
                    setIsNewTaxonomy(false);
                  }}
                  disabled={disabled}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteTaxonomy(taxonomy.id)}
                  disabled={disabled}
                >
                  <Delete />
                </IconButton>
              </Box>
            </Box>

            <Box sx={{ mt: 2, width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">Terms</Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => handleAddTerm(taxonomy.id)}
                  disabled={disabled}
                >
                  Add Term
                </Button>
              </Box>
              <List dense>
                {taxonomy.terms.map(term => (
                  <ListItem key={term.id}>
                    <ListItemText
                      primary={term.name}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {term.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {term.id}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingTerm({ taxonomyId: taxonomy.id, term });
                          setIsNewTerm(false);
                        }}
                        disabled={disabled}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteTerm(taxonomy.id, term.id)}
                        disabled={disabled}
                      >
                        <Delete />
                      </IconButton>
                      <Chip
                        label={value.some(v => v.taxonomyId === taxonomy.id && v.termId === term.id) ? 'Selected' : 'Not Selected'}
                        color={value.some(v => v.taxonomyId === taxonomy.id && v.termId === term.id) ? 'primary' : 'default'}
                        onClick={() => handleToggleTerm(taxonomy.id, term.id)}
                        disabled={disabled}
                        sx={{ ml: 1 }}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          </ListItem>
        ))}
      </List>

      {/* Taxonomy Editor Dialog */}
      <Dialog open={!!editingTaxonomy} onClose={() => setEditingTaxonomy(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{isNewTaxonomy ? 'Add Taxonomy' : 'Edit Taxonomy'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Taxonomy ID"
              value={editingTaxonomy?.id || ''}
              disabled
              fullWidth
              helperText="Taxonomy IDs are automatically generated and cannot be edited"
            />
            <TextField
              label="Name"
              value={editingTaxonomy?.name || ''}
              onChange={(e) => setEditingTaxonomy(prev => prev ? { ...prev, name: e.target.value } : null)}
              fullWidth
            />
            <TextField
              label="Description"
              value={editingTaxonomy?.description || ''}
              onChange={(e) => setEditingTaxonomy(prev => prev ? { ...prev, description: e.target.value } : null)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingTaxonomy(null)}>Cancel</Button>
          <Button onClick={handleSaveTaxonomy} variant="contained">
            {isNewTaxonomy ? 'Add Taxonomy' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Term Editor Dialog */}
      <Dialog open={!!editingTerm} onClose={() => setEditingTerm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{isNewTerm ? 'Add Term' : 'Edit Term'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Term ID"
              value={editingTerm?.term.id || ''}
              disabled
              fullWidth
              helperText="Term IDs are automatically generated and cannot be edited"
            />
            <TextField
              label="Name"
              value={editingTerm?.term.name || ''}
              onChange={(e) => setEditingTerm(prev => prev ? { ...prev, term: { ...prev.term, name: e.target.value } } : null)}
              fullWidth
            />
            <TextField
              label="Description"
              value={editingTerm?.term.description || ''}
              onChange={(e) => setEditingTerm(prev => prev ? { ...prev, term: { ...prev.term, description: e.target.value } } : null)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingTerm(null)}>Cancel</Button>
          <Button onClick={handleSaveTerm} variant="contained">
            {isNewTerm ? 'Add Term' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 