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
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Text,
  VStack,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import { AlertCircle } from 'lucide-react';
import type { Taxonomy } from '@token-model/data-model';

interface TaxonomyPickerProps {
  taxonomies: Taxonomy[];
  value: { taxonomyId: string; termId: string }[];
  onChange: (value: { taxonomyId: string; termId: string }[]) => void;
  disabled?: boolean;
  onViewClassifications?: () => void;
}

export function TaxonomyPicker({ taxonomies, value, onChange, disabled = false, onViewClassifications }: TaxonomyPickerProps) {
  // State for adding a new taxonomy assignment
  const [adding, setAdding] = useState(false);
  const [selectedTaxonomyId, setSelectedTaxonomyId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');

  // Only allow taxonomies not already assigned
  const availableTaxonomies = taxonomies.filter(
    t => !value.some(v => v.taxonomyId === t.id)
  );

  // Helper to check if a term is valid
  const isTermValid = (taxonomyId: string, termId: string) => {
    const taxonomy = taxonomies.find(t => t.id === taxonomyId);
    if (!taxonomy) return false;
    
    // Check if the term exists in the taxonomy
    const termExists = taxonomy.terms.some(term => term.id === termId);
    if (!termExists) return false;
    
    // If the taxonomy has resolvedValueTypeIds, it must be in the filtered taxonomies
    // This ensures the taxonomy is compatible with the current value type
    return taxonomies.some(t => t.id === taxonomyId);
  };

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

  const handleDelete = (idx: number) => {
    try {
      onChange(value.filter((_, i) => i !== idx));
    } catch (error) {
      console.error('[TaxonomyPicker] Error calling onChange:', error);
    }
  };

  // If there are no taxonomies, show an informative message
  if (taxonomies.length === 0) {
    return (
      <Box p={2} color="gray.500" fontStyle="italic">
        Must have at least one taxonomy term
      </Box>
    );
  }

  return (
    <Box>
      {!adding && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          isDisabled={availableTaxonomies.length === 0 || disabled}
        >
          Add Taxonomy
        </Button>
      )}
      {adding ? (
        <HStack spacing={2} align="center" mb={2}>
          <FormControl isDisabled={disabled} minW="140px">
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
            <Select
              value={selectedTermId}
              placeholder="Select term"
              onChange={e => setSelectedTermId(e.target.value)}
              isDisabled={!selectedTaxonomyId || disabled}
              size="sm"
            >
              {taxonomies.find(t => t.id === selectedTaxonomyId)?.terms?.map((term: Taxonomy["terms"][number]) => (
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
      ) : null}
      <HStack wrap="wrap" spacing={2} mb={2}>
        {value.map((assignment, idx) => {
          const taxonomy = taxonomies.find(t => t.id === assignment.taxonomyId);
          const term = taxonomy?.terms.find((term: Taxonomy["terms"][number]) => term.id === assignment.termId);
          const tagId = `${assignment.taxonomyId}-${assignment.termId}`;
          const isValid = isTermValid(assignment.taxonomyId, assignment.termId);
          
          return (
            <Popover key={tagId} placement="top" closeOnBlur={true}>
              <PopoverTrigger>
                <Tag
                  size="md"
                  variant="solid"
                  colorScheme={isValid ? "blue" : "red"}
                  m={1}
                  tabIndex={0}
                >
                  <TagLabel>
                    {taxonomy && term ? `${taxonomy.name}: ${term.name}` : 'Unknown'}
                    {!isValid && (
                      <Tooltip label="This term is no longer valid for the current value type">
                        <Icon as={AlertCircle} ml={1} boxSize={3} />
                      </Tooltip>
                    )}
                  </TagLabel>
                  {!disabled && <TagCloseButton onClick={() => handleDelete(idx)} />}
                </Tag>
              </PopoverTrigger>
              <PopoverContent width="300px">
                <PopoverBody p={4}>
                  <VStack align="stretch" spacing={3}>
                    {taxonomy && (
                      <>
                        <Box>
                          <Text fontWeight="bold" fontSize="sm">{taxonomy.name}</Text>
                          {taxonomy.description && (
                            <Text fontSize="sm" color="gray.400">{taxonomy.description}</Text>
                          )}
                        </Box>
                        {term && (
                          <Box>
                            <Text fontWeight="bold" fontSize="sm">{term.name}</Text>
                            {term.description && (
                              <Text fontSize="sm" color="gray.400">{term.description}</Text>
                            )}
                            {!isValid && (
                              <Text fontSize="sm" color="red.400" mt={1}>
                                This term is no longer valid for the current value type
                              </Text>
                            )}
                          </Box>
                        )}
                      </>
                    )}
                    <Box pt={2}>
                      <Button
                        variant="link"
                        color="blue.500"
                        fontWeight="semibold"
                        tabIndex={0}
                        _hover={{ textDecoration: 'underline' }}
                        onMouseDown={() => {
                          console.log('[TaxonomyPicker] View all classifications link mousedown');
                          if (onViewClassifications) onViewClassifications();
                        }}
                      >
                        View all classifications
                      </Button>
                    </Box>
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          );
        })}
      </HStack>
      
    </Box>
  );
} 