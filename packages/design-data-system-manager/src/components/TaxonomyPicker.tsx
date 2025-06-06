import React from "react";
import { useState } from 'react';
import {
  Box,
  Tag,
  TagLabel,
  CloseButton,
  HStack,
  Select,
  Field,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Text,
  VStack,
  Tooltip,
  Icon,
  createListCollection,
} from '@chakra-ui/react';
import { AlertCircle, X } from 'lucide-react';
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
    return taxonomy?.terms.some(term => term.id === termId) ?? false;
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
          disabled={availableTaxonomies.length === 0 || disabled}
        >
          Add Taxonomy
        </Button>
      )}
      {adding ? (
        <HStack gap={2} align="center" mb={2}>
          <Field.Root disabled={disabled} minW="140px">
            <Select.Root
              value={[selectedTaxonomyId]}
              onValueChange={(details) => {
                const value = Array.isArray(details.value) ? details.value[0] : details.value;
                setSelectedTaxonomyId(value);
                setSelectedTermId('');
              }}
              disabled={disabled}
              size="sm"
              collection={createListCollection({
                items: availableTaxonomies.map(tax => ({
                  value: tax.id,
                  label: tax.name
                }))
              })}
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Select taxonomy" />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {availableTaxonomies.map(tax => (
                    <Select.Item key={tax.id} item={{ value: tax.id, label: tax.name }}>
                      {tax.name}
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Field.Root>
          <Field.Root disabled={!selectedTaxonomyId || disabled} minW="140px">
            <Select.Root
              value={[selectedTermId]}
              onValueChange={(details) => {
                const value = Array.isArray(details.value) ? details.value[0] : details.value;
                setSelectedTermId(value);
              }}
              disabled={!selectedTaxonomyId || disabled}
              size="sm"
              collection={createListCollection({
                items: taxonomies.find(t => t.id === selectedTaxonomyId)?.terms?.map(term => ({
                  value: term.id,
                  label: term.name
                })) || []
              })}
            >
              <Select.HiddenSelect />
              <Select.Control>
                <Select.Trigger>
                  <Select.ValueText placeholder="Select term" />
                </Select.Trigger>
                <Select.IndicatorGroup>
                  <Select.Indicator />
                </Select.IndicatorGroup>
              </Select.Control>
              <Select.Positioner>
                <Select.Content>
                  {taxonomies.find(t => t.id === selectedTaxonomyId)?.terms?.map((term: Taxonomy["terms"][number]) => (
                    <Select.Item key={term.id} item={{ value: term.id, label: term.name }}>
                      {term.name}
                      <Select.ItemIndicator />
                    </Select.Item>
                  )) || []}
                </Select.Content>
              </Select.Positioner>
            </Select.Root>
          </Field.Root>
          <Button
            colorPalette="blue"
            size="sm"
            onClick={handleAdd}
            disabled={!selectedTaxonomyId || !selectedTermId || disabled}
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
      <HStack wrap="wrap" gap={2} mb={2}>
        {value.map((assignment, idx) => {
          const taxonomy = taxonomies.find(t => t.id === assignment.taxonomyId);
          const term = taxonomy?.terms.find((term: Taxonomy["terms"][number]) => term.id === assignment.termId);
          const tagId = `${assignment.taxonomyId}-${assignment.termId}`;
          const isValid = isTermValid(assignment.taxonomyId, assignment.termId);
          
          return (
            <Popover.Root>
              <Popover.Trigger>
                <Tag.Root
                  size="md"
                  variant="solid"
                  colorPalette={isValid ? "blue" : "red"}
                  m={1}
                  tabIndex={0}
                >
                  <Tag.Label>
                    {taxonomy && term ? `${taxonomy.name}: ${term.name}` : 'Unknown'}
                    {!isValid && (
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <Icon as={AlertCircle} ml={1} boxSize={3} />
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                          <Tooltip.Arrow />
                          <Text>This term is no longer valid for the current value type</Text>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    )}
                  </Tag.Label>
                  {!disabled && (
                    <Button
                      variant="ghost"
                      size="xs"
                      p={0}
                      minW="auto"
                      h="auto"
                      onClick={() => handleDelete(idx)}
                    >
                      <Icon as={X} boxSize={3} />
                    </Button>
                  )}
                </Tag.Root>
              </Popover.Trigger>
              <Popover.Positioner>
                <Popover.Content width="300px">
                  <PopoverBody p={4}>
                    <VStack align="stretch" gap={3}>
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
                          variant="ghost"
                          color="blue.500"
                          onClick={onViewClassifications}
                        >
                          View Classifications
                        </Button>
                      </Box>
                    </VStack>
                  </PopoverBody>
                </Popover.Content>
              </Popover.Positioner>
            </Popover.Root>
          );
        })}
      </HStack>
    </Box>
  );
} 