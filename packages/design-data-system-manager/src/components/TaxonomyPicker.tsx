import React from "react";
import { useState } from 'react';
import {
  Box,
  Tag,
  TagLabel,
  TagCloseButton,
  HStack,
  Select,
  FormControl,
  FormLabel,
  Button
} from '@chakra-ui/react';
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
      try {
        onChange([...value, { taxonomyId: selectedTaxonomyId, termId: selectedTermId }]);
      } catch (error) {
        console.error('[TaxonomyPicker] Error calling onChange:', error);
      }
      setAdding(false);
      setSelectedTaxonomyId('');
      setSelectedTermId('');
    }
  };

  // Debug: log when chip delete is clicked
  const handleDelete = (idx: number) => {
    try {
      onChange(value.filter((_, i) => i !== idx));
    } catch (error) {
      console.error('[TaxonomyPicker] Error calling onChange:', error);
    }
  };

  return (
    <Box>
      <HStack wrap="wrap" spacing={2} mb={2}>
        {value.map((assignment, idx) => {
          const taxonomy = taxonomies.find(t => t.id === assignment.taxonomyId);
          const term = taxonomy?.terms.find(term => term.id === assignment.termId);
          return (
            <Tag key={`${assignment.taxonomyId}-${assignment.termId}`} size="md" variant="solid" colorScheme="blue" m={1}>
              <TagLabel>{taxonomy && term ? `${taxonomy.name}: ${term.name}` : 'Unknown'}</TagLabel>
              {!disabled && <TagCloseButton onClick={() => handleDelete(idx)} />}
            </Tag>
          );
        })}
      </HStack>
      {adding ? (
        <HStack spacing={2} align="center" mb={2}>
          <FormControl isDisabled={disabled} minW="140px">
            <FormLabel mb={0}>Taxonomy</FormLabel>
            <Select
              value={selectedTaxonomyId}
              placeholder="Select taxonomy"
              onChange={e => {
                setSelectedTaxonomyId(e.target.value);
                setSelectedTermId('');
              }}
              isDisabled={disabled}
              size="sm"
            >
              {availableTaxonomies.map(tax => (
                <option key={tax.id} value={tax.id}>{tax.name}</option>
              ))}
            </Select>
          </FormControl>
          <FormControl isDisabled={!selectedTaxonomyId || disabled} minW="140px">
            <FormLabel mb={0}>Term</FormLabel>
            <Select
              value={selectedTermId}
              placeholder="Select term"
              onChange={e => setSelectedTermId(e.target.value)}
              isDisabled={!selectedTaxonomyId || disabled}
              size="sm"
            >
              {taxonomies.find(t => t.id === selectedTaxonomyId)?.terms?.map(term => (
                <option key={term.id} value={term.id}>{term.name}</option>
              )) || []}
            </Select>
          </FormControl>
          <Button
            colorScheme="blue"
            size="sm"
            onClick={handleAdd}
            isDisabled={!selectedTaxonomyId || !selectedTermId || disabled}
          >
            Add
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAdding(false);
              setSelectedTaxonomyId('');
              setSelectedTermId('');
            }}
          >
            Cancel
          </Button>
        </HStack>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          isDisabled={availableTaxonomies.length === 0 || disabled}
        >
          Add Taxonomy
        </Button>
      )}
    </Box>
  );
} 