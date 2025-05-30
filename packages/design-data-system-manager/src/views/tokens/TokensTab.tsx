import React, { useState } from 'react';
import { Box, Text, HStack, Flex, FormControl, FormLabel, Select, Input } from '@chakra-ui/react';
import type { TokenCollection, ResolvedValueType } from '@token-model/data-model';
import type { ExtendedToken } from '../../components/TokenEditorDialog';

interface TokensTabProps {
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  resolvedValueTypes: ResolvedValueType[];
  renderAddTokenButton?: React.ReactNode;
}

export function TokensTab({ tokens, collections, resolvedValueTypes, renderAddTokenButton }: TokensTabProps) {
  // Filter state
  const [collectionFilter, setCollectionFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Unique values for filters
  const statusOptions = Array.from(new Set(tokens.map(t => t.status).filter(Boolean))).sort();

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="2xl" fontWeight="bold">Tokens</Text>
        {renderAddTokenButton}
      </Flex>
      <Flex justify="space-between" align="center" mb={4}>
        <Input
          placeholder="Search tokens..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          maxW="320px"
        />
      </Flex>
      {/* Filter Controls */}
      <HStack spacing={4} wrap="nowrap" align="flex-start" mb={4}>
        <FormControl maxW="240px" flex="none">
          <FormLabel>Collection</FormLabel>
          <Select size="sm" value={collectionFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCollectionFilter(e.target.value)}>
            <option key="collection-all" value="">All</option>
            {collections.map(c => (
              <option key={`collection-${c.id}`} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormControl>
        <FormControl maxW="240px" flex="none">
          <FormLabel>Type</FormLabel>
          <Select size="sm" value={typeFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value)}>
            <option key="type-all" value="">All</option>
            {resolvedValueTypes.map(typeObj => (
              <option key={`type-${typeObj.id}`} value={typeObj.id}>{typeObj.displayName}</option>
            ))}
          </Select>
        </FormControl>
        <FormControl maxW="240px" flex="none">
          <FormLabel>Status</FormLabel>
          <Select size="sm" value={statusFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}>
            <option key="status-all" value="">All</option>
            {statusOptions.map(status => (
              <option key={`status-${status}`} value={status}>{status}</option>
            ))}
          </Select>
        </FormControl>
      </HStack>
    </Box>
  );
}
