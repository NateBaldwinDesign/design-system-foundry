import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import type { Taxonomy, TaxonomyTerm } from '@token-model/data-model';
import { StorageService } from '../../services/storage';
import { generateId, ID_PREFIXES } from '../../utils/id';

interface SettingsTaxonomiesTabProps {
  taxonomies: Taxonomy[];
  setTaxonomies: (taxonomies: Taxonomy[]) => void;
}

export function SettingsTaxonomiesTab({ taxonomies, setTaxonomies }: SettingsTaxonomiesTabProps) {
  const [editTaxonomy, setEditTaxonomy] = useState<Taxonomy | null>(null);
  const [editFields, setEditFields] = useState<Taxonomy | null>(null);
  const [deleteTermDialog, setDeleteTermDialog] = useState<{
    open: boolean;
    taxonomyId: string;
    termId: string;
    termName: string;
    usageCount: number;
  }>({
    open: false,
    taxonomyId: '',
    termId: '',
    termName: '',
    usageCount: 0
  });

  const handleAddTerm = (taxonomyId: string) => {
    const taxonomy = taxonomies.find(t => t.id === taxonomyId);
    if (!taxonomy) return;

    const newTerm: TaxonomyTerm = {
      id: generateId(ID_PREFIXES.TAXONOMY_TERM),
      name: '',
      description: ''
    };

    const updatedTaxonomy = {
      ...taxonomy,
      terms: [...taxonomy.terms, newTerm]
    };

    setTaxonomies(taxonomies.map(t => t.id === taxonomyId ? updatedTaxonomy : t));
  };

  const handleDeleteTerm = (taxonomyId: string, termId: string) => {
    const taxonomy = taxonomies.find(t => t.id === taxonomyId);
    if (!taxonomy) return;

    const term = taxonomy.terms.find(t => t.id === termId);
    if (!term) return;

    // Check for token usage
    const tokens = StorageService.getTokens();
    const usageCount = tokens.filter(token => 
      Object.values(token.taxonomies).includes(term.id)
    ).length;

    setDeleteTermDialog({
      open: true,
      taxonomyId,
      termId,
      termName: term.name,
      usageCount
    });
  };

  const confirmDeleteTerm = () => {
    const { taxonomyId, termId } = deleteTermDialog;
    const taxonomy = taxonomies.find(t => t.id === taxonomyId);
    if (!taxonomy) return;

    const updatedTaxonomy = {
      ...taxonomy,
      terms: taxonomy.terms.filter(t => t.id !== termId)
    };

    setTaxonomies(taxonomies.map(t => t.id === taxonomyId ? updatedTaxonomy : t));
    setDeleteTermDialog({ ...deleteTermDialog, open: false });
  };

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Taxonomies
      </Typography>
      <Paper sx={{ width: '100%', overflowX: 'auto', mb: 2 }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
          <Box component="thead">
            <Box component="tr">
              <Box component="th" sx={{ textAlign: 'left', p: 1 }}>ID</Box>
              <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Name</Box>
              <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Description</Box>
              <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Terms</Box>
              <Box component="th" sx={{ textAlign: 'left', p: 1 }}>Actions</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {taxonomies.map((taxonomy: Taxonomy) => (
              <Box component="tr" key={taxonomy.id}>
                <Box component="td" sx={{ p: 1 }}>{taxonomy.id}</Box>
                <Box component="td" sx={{ p: 1 }}>{taxonomy.name}</Box>
                <Box component="td" sx={{ p: 1 }}>{taxonomy.description}</Box>
                <Box component="td" sx={{ p: 1 }}>
                  {taxonomy.terms.map((term: TaxonomyTerm) => (
                    <Chip
                      key={term.id}
                      label={term.name}
                      sx={{ mr: 0.5, mb: 0.5 }}
                      title={term.description || ''}
                    />
                  ))}
                </Box>
                <Box component="td" sx={{ p: 1 }}>
                  <IconButton onClick={() => { setEditTaxonomy(taxonomy); setEditFields({ ...taxonomy, terms: taxonomy.terms.map(term => ({ ...term })) }); }} size="small">
                    <EditIcon />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Edit Taxonomy Dialog */}
      {editTaxonomy && editFields && (
        <Dialog open={!!editTaxonomy} onClose={() => setEditTaxonomy(null)}>
          <DialogTitle>Edit Taxonomy</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
            <TextField
              label="Name"
              value={editFields.name}
              onChange={e => setEditFields({ ...editFields, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Description"
              value={editFields.description}
              onChange={e => setEditFields({ ...editFields, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">Terms</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  if (!editFields) return;
                  const newTerm: TaxonomyTerm = {
                    id: generateId(ID_PREFIXES.TAXONOMY_TERM),
                    name: '',
                    description: ''
                  };
                  setEditFields({
                    ...editFields,
                    terms: [...editFields.terms, newTerm]
                  });
                }}
                size="small"
              >
                Add Term
              </Button>
            </Box>
            {editFields.terms.map((term: TaxonomyTerm, idx: number) => (
              <Box key={term.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                <TextField
                  label="Term Name"
                  value={term.name}
                  onChange={e => {
                    const newTerms = [...editFields.terms];
                    newTerms[idx] = { ...term, name: e.target.value };
                    setEditFields({ ...editFields, terms: newTerms });
                  }}
                  size="small"
                />
                <TextField
                  label="Description"
                  value={term.description || ''}
                  onChange={e => {
                    const newTerms = [...editFields.terms];
                    newTerms[idx] = { ...term, description: e.target.value };
                    setEditFields({ ...editFields, terms: newTerms });
                  }}
                  size="small"
                  fullWidth
                />
                <IconButton
                  onClick={() => handleDeleteTerm(editTaxonomy.id, term.id)}
                  size="small"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditTaxonomy(null)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                setTaxonomies(taxonomies.map(t => t.id === editTaxonomy.id ? editFields : t));
                setEditTaxonomy(null);
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Term Confirmation Dialog */}
      <Dialog open={deleteTermDialog.open} onClose={() => setDeleteTermDialog({ ...deleteTermDialog, open: false })}>
        <DialogTitle>Delete Term</DialogTitle>
        <DialogContent>
          {deleteTermDialog.usageCount > 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              This term is used in {deleteTermDialog.usageCount} token{deleteTermDialog.usageCount === 1 ? '' : 's'}.
              Deleting it will require updating those tokens.
            </Alert>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              This term is not used in any tokens.
            </Alert>
          )}
          <Typography>
            Are you sure you want to delete the term "{deleteTermDialog.termName}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTermDialog({ ...deleteTermDialog, open: false })}>
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteTerm}
            color="error"
            variant="contained"
          >
            Delete Anyway
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 