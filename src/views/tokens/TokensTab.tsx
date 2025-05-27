import React, { useState, useMemo } from 'react';
import {
  Box,
  Text,
  TableRoot,
  TableBody,
  TableCell,
  TableColumnHeader,
  TableRow,
  TableHeader,
  Tag,
  HStack,
  VStack,
  IconButton,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormControl,
  FormLabel,
  FormErrorMessage,
  useDisclosure,
  Flex,
  NativeSelect
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon, AddIcon } from '@chakra-ui/icons';
import type { Token, TokenCollection, Mode, TokenValue, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { ValueByModeTable } from '../../components/ValueByModeTable';
import type { ValueByMode } from '../../components/ValueByModeTable';
import { PlatformOverridesTable } from '../../components/PlatformOverridesTable';
import { TokenValuePicker } from '../../components/TokenValuePicker';
import { TaxonomyPicker } from '../../components/TaxonomyPicker';
import { TokenEditorDialog } from '../../components/TokenEditorDialog';

// Extend the Token type to include themeable
// ... existing code ...

export function TokensTab({ tokens, collections, modes, dimensions, platforms, onEdit, onDelete, taxonomies, resolvedValueTypes, onViewClassifications, renderAddTokenButton }) {
  // Filter state
  const [collectionFilter, setCollectionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [privateFilter, setPrivateFilter] = useState('');
  const [themeableFilter, setThemeableFilter] = useState('');

  // Filtering logic
  const filteredTokens = useMemo(() => {
    return tokens.filter(token => {
      if (collectionFilter && token.tokenCollectionId !== collectionFilter) return false;
      if (typeFilter && token.resolvedValueType !== typeFilter) return false;
      if (statusFilter && token.status !== statusFilter) return false;
      if (privateFilter && String(token.private) !== privateFilter) return false;
      if (themeableFilter && String(token.themeable) !== themeableFilter) return false;
      return true;
    });
  }, [tokens, collectionFilter, typeFilter, statusFilter, privateFilter, themeableFilter]);

  // Unique values for filters
  const typeOptions = Array.from(new Set(tokens.map(t => t.valueType))).sort();
  const statusOptions = Array.from(new Set(tokens.map(t => t.status).filter(Boolean))).sort();

  // ... rest of the component logic ...

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="2xl" fontWeight="bold">Tokens</Text>
        {renderAddTokenButton}
      </Flex>
      {/* Filter Controls */}
      <HStack spacing={4} wrap="wrap" align="flex-start" mb={4}>
        <FormControl width="240px">
          <FormLabel>Collection</FormLabel>
          <NativeSelect size="sm" value={collectionFilter} onChange={e => setCollectionFilter(e.target.value)}>
            <option value="">All</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </NativeSelect>
        </FormControl>
        <FormControl width="240px">
          <FormLabel>Type</FormLabel>
          <NativeSelect size="sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All</option>
            {typeOptions.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </NativeSelect>
        </FormControl>
        <FormControl width="240px">
          <FormLabel>Status</FormLabel>
          <NativeSelect size="sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </NativeSelect>
        </FormControl>
        <FormControl width="240px">
          <FormLabel>Private</FormLabel>
          <NativeSelect size="sm" value={privateFilter} onChange={e => setPrivateFilter(e.target.value)}>
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </NativeSelect>
        </FormControl>
        <FormControl width="240px">
          <FormLabel>Themeable</FormLabel>
          <NativeSelect size="sm" value={themeableFilter} onChange={e => setThemeableFilter(e.target.value)}>
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </NativeSelect>
        </FormControl>
      </HStack>
      {/* ... rest of the component JSX ... */}
    </Box>
  );
} 