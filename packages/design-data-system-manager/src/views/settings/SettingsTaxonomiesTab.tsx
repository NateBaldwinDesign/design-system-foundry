import React, { useState, useEffect } from 'react';
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
  Alert,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import type { Taxonomy, TaxonomyTerm } from '@token-model/data-model';
import { StorageService } from '../../services/storage';
import { generateId, ID_PREFIXES } from '../../utils/id';
import { cleanupTokenTaxonomyReferences } from '../../utils/taxonomy';
import defaultData from '../../services/data/default-data.json';

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

  // Naming Rules state
  const [taxonomyOrder, setTaxonomyOrder] = useState<string[]>(() => {
    // Try to load from localStorage, fallback to defaultData
    const root = JSON.parse(localStorage.getItem('token-model:root') || '{}');
    return root.namingRules?.taxonomyOrder || defaultData.namingRules?.taxonomyOrder || [];
  });

  // Save taxonomyOrder to localStorage root object
  const saveNamingRules = (newOrder: string[]) => {
    const root = JSON.parse(localStorage.getItem('token-model:root') || '{}');
    const updatedRoot = {
      ...root,
      namingRules: {
        ...(root.namingRules || {}),
        taxonomyOrder: newOrder
      }
    };
    localStorage.setItem('token-model:root', JSON.stringify(updatedRoot));
    setTaxonomyOrder(newOrder);
  };

  // Add taxonomy to order
  const handleAddToOrder = (taxonomyId: string) => {
    if (!taxonomyOrder.includes(taxonomyId)) {
      saveNamingRules([...taxonomyOrder, taxonomyId]);
    }
  };

  // Remove taxonomy from order
  const handleRemoveFromOrder = (taxonomyId: string) => {
    saveNamingRules(taxonomyOrder.filter(id => id !== taxonomyId));
  };

  // Move taxonomy up/down
  const moveTaxonomy = (index: number, direction: -1 | 1) => {
    const newOrder = [...taxonomyOrder];
    const target = newOrder[index];
    newOrder.splice(index, 1);
    newOrder.splice(index + direction, 0, target);
    saveNamingRules(newOrder);
  };

  // Taxonomies not in the order
  const availableToAdd = taxonomies.filter(t => !taxonomyOrder.includes(t.id));

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
      Array.isArray(token.taxonomies) && token.taxonomies.some(ref => ref.termId === term.id)
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

    // Clean up invalid taxonomy/term references from all tokens
    cleanupTokenTaxonomyReferences(taxonomies);
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
                />
              </Box>
            ))}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditTaxonomy(null)}>Cancel</Button>
            <Button onClick={() => {
              setTaxonomies(taxonomies.map(t => t.id === editFields.id ? editFields : t));
              setEditTaxonomy(null);
            }}>Save</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Term Dialog */}
      <Dialog open={deleteTermDialog.open} onClose={() => setDeleteTermDialog({ ...deleteTermDialog, open: false })}>
        <DialogTitle>Delete Term</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            This term is used in {deleteTermDialog.usageCount} tokens. Deleting it will remove these references.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTermDialog({ ...deleteTermDialog, open: false })}>Cancel</Button>
          <Button onClick={confirmDeleteTerm} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Naming Rules: Taxonomy Order Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Naming Rules: Taxonomy Order
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Set the order in which taxonomy terms are used when generating code syntax. The first taxonomy in the list will have its term appear first, and so on.
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxWidth: 500 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Taxonomy</TableCell>
                <TableCell align="center">Order</TableCell>
                <TableCell align="center">Remove</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {taxonomyOrder.map((taxonomyId, idx) => {
                const taxonomy = taxonomies.find(t => t.id === taxonomyId);
                return (
                  <TableRow key={taxonomyId}>
                    <TableCell>
                      <Chip label={taxonomy ? taxonomy.name : taxonomyId} color={taxonomy ? 'primary' : 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <Button size="small" onClick={() => moveTaxonomy(idx, -1)} disabled={idx === 0}>↑</Button>
                      <Button size="small" onClick={() => moveTaxonomy(idx, 1)} disabled={idx === taxonomyOrder.length - 1}>↓</Button>
                    </TableCell>
                    <TableCell align="center">
                      <Button size="small" color="error" onClick={() => handleRemoveFromOrder(taxonomyId)}>Remove</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {availableToAdd.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 500 }}>
            <TextField
              select
              label="Add Taxonomy to Order"
              value=""
              onChange={e => handleAddToOrder(e.target.value)}
              size="small"
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="" disabled>Select taxonomy</MenuItem>
              {availableToAdd.map(t => (
                <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
              ))}
            </TextField>
          </Box>
        )}
      </Box>
    </>
  );
} 