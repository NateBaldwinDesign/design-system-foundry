import React, { useState } from 'react';
import { Box, Text, HStack, Flex, Field, Input, Button, Badge, IconButton, createListCollection } from '@chakra-ui/react';
import { Table } from '@chakra-ui/react';
import { Select } from '@chakra-ui/react';
import { Edit, Trash2 } from 'lucide-react';
import type { TokenCollection, ResolvedValueType, Taxonomy, TokenTaxonomyRef, TokenStatus, TokenValue } from '@token-model/data-model';
import type { ExtendedToken } from '../../components/TokenEditorDialog';
import TokenTag from '../../components/TokenTag';
import { formatValueForDisplay } from '../../utils/valueTypeUtils';
import { getValueTypeIcon } from '../../utils/getValueTypeIcon';
import { getValueTypeFromId } from '../../utils/valueTypeUtils';

interface TokensViewProps {
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  resolvedValueTypes: ResolvedValueType[];
  taxonomies: Taxonomy[];
  renderAddTokenButton?: React.ReactNode;
  onEditToken?: (token: ExtendedToken) => void;
  onDeleteToken?: (tokenId: string) => void;
}

export function TokensView({
  tokens,
  collections,
  resolvedValueTypes,
  taxonomies,
  renderAddTokenButton,
  onEditToken,
  onDeleteToken
}: TokensViewProps) {
  const [collectionFilter, setCollectionFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const statusOptions: TokenStatus[] = ['experimental', 'stable', 'deprecated'];

  const handleClearFilters = () => {
    setCollectionFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setSearchTerm('');
  };

  const handleEditToken = (token: ExtendedToken) => {
    if (onEditToken) {
      onEditToken(token);
    }
  };

  const handleDeleteToken = (tokenId: string) => {
    if (onDeleteToken) {
      onDeleteToken(tokenId);
    }
  };

  const getTypeDisplay = (typeId: string) => {
    const type = resolvedValueTypes.find(t => t.id === typeId);
    return type ? type.displayName : typeId;
  };

  const getValueDisplay = (token: ExtendedToken) => {
    if (!token.valuesByMode || token.valuesByMode.length === 0) return '-';
    const value = token.valuesByMode[0].value;
    if ('tokenId' in value && typeof value.tokenId === 'string') {
      return formatValueForDisplay({ tokenId: value.tokenId }, token.resolvedValueTypeId, resolvedValueTypes);
    } else if ('value' in value && (typeof value.value === 'string' || typeof value.value === 'number')) {
      return formatValueForDisplay({ value: value.value }, token.resolvedValueTypeId, resolvedValueTypes);
    } else if (typeof value === 'string' || typeof value === 'number') {
      return formatValueForDisplay({ value }, token.resolvedValueTypeId, resolvedValueTypes);
    } else {
      return '-';
    }
  };

  const getTaxonomyNames = (token: ExtendedToken) => {
    if (!token.taxonomies || token.taxonomies.length === 0) return '-';
    return token.taxonomies.map((ref: TokenTaxonomyRef) => {
      const taxonomy = taxonomies.find(t => t.id === ref.taxonomyId);
      const term = taxonomy?.terms.find(t => t.id === ref.termId);
      return `${taxonomy?.name || ref.taxonomyId}: ${term?.name || ref.termId}`;
    }).join('\n');
  };

  const filteredTokens = tokens.filter(token => {
    const matchesCollection = !collectionFilter || token.tokenCollectionId === collectionFilter;
    const matchesType = !typeFilter || token.resolvedValueTypeId === typeFilter;
    const matchesStatus = !statusFilter || token.status === statusFilter;
    const matchesSearch = !searchTerm || 
      token.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesCollection && matchesType && matchesStatus && matchesSearch;
  });

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="2xl" fontWeight="bold">Tokens</Text>
        {renderAddTokenButton}
      </Flex>
      <Flex gap={4} mb={4}>
        <Field.Root>
          <Field.Label>Collection</Field.Label>
          <Select.Root
            value={[collectionFilter]}
            onValueChange={(details) => {
              const value = Array.isArray(details.value) ? details.value[0] : details.value;
              setCollectionFilter(value);
            }}
            collection={createListCollection({
              items: [
                { value: '', label: 'All Collections' },
                ...collections.map(collection => ({ value: collection.id, label: collection.name }))
              ]
            })}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="All Collections" />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                <Select.Item item={{ value: '', label: 'All Collections' }}>All Collections</Select.Item>
                {collections.map(collection => (
                  <Select.Item key={collection.id} item={{ value: collection.id, label: collection.name }}>
                    {collection.name}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Field.Root>

        <Field.Root>
          <Field.Label>Type</Field.Label>
          <Select.Root
            value={[typeFilter]}
            onValueChange={(details) => {
              const value = Array.isArray(details.value) ? details.value[0] : details.value;
              setTypeFilter(value);
            }}
            collection={createListCollection({
              items: [
                { value: '', label: 'All Types' },
                ...resolvedValueTypes.map(type => ({ value: type.id, label: type.displayName }))
              ]
            })}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="All Types" />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                <Select.Item item={{ value: '', label: 'All Types' }}>All Types</Select.Item>
                {resolvedValueTypes.map(type => (
                  <Select.Item key={type.id} item={{ value: type.id, label: type.displayName }}>
                    {type.displayName}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Field.Root>

        <Field.Root>
          <Field.Label>Status</Field.Label>
          <Select.Root
            value={[statusFilter]}
            onValueChange={(details) => {
              const value = Array.isArray(details.value) ? details.value[0] : details.value;
              setStatusFilter(value);
            }}
            collection={createListCollection({
              items: [
                { value: '', label: 'All Statuses' },
                ...statusOptions.map(status => ({ value: status, label: status }))
              ]
            })}
          >
            <Select.HiddenSelect />
            <Select.Control>
              <Select.Trigger>
                <Select.ValueText placeholder="All Statuses" />
              </Select.Trigger>
              <Select.IndicatorGroup>
                <Select.Indicator />
              </Select.IndicatorGroup>
            </Select.Control>
            <Select.Positioner>
              <Select.Content>
                <Select.Item item={{ value: '', label: 'All Statuses' }}>All Statuses</Select.Item>
                {statusOptions.map(status => (
                  <Select.Item key={status} item={{ value: status, label: status }}>
                    {status}
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Select.Root>
        </Field.Root>

        <Field.Root>
          <Field.Label>Search</Field.Label>
          <Input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search tokens..."
          />
        </Field.Root>

        <Button onClick={handleClearFilters}>Clear Filters</Button>
      </Flex>

      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Name</Table.ColumnHeader>
            <Table.ColumnHeader>Type</Table.ColumnHeader>
            <Table.ColumnHeader>Value</Table.ColumnHeader>
            <Table.ColumnHeader>Collection</Table.ColumnHeader>
            <Table.ColumnHeader>Status</Table.ColumnHeader>
            <Table.ColumnHeader>Taxonomies</Table.ColumnHeader>
            <Table.ColumnHeader>Actions</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {filteredTokens.map(token => (
            <Table.Row key={token.id}>
              <Table.Cell>
                <HStack gap={2}>
                  {getValueTypeIcon(getValueTypeFromId(token.resolvedValueTypeId, resolvedValueTypes), 16)}
                  <Text>{token.displayName}</Text>
                </HStack>
              </Table.Cell>
              <Table.Cell>{getTypeDisplay(token.resolvedValueTypeId)}</Table.Cell>
              <Table.Cell>{getValueDisplay(token)}</Table.Cell>
              <Table.Cell>
                {collections.find(c => c.id === token.tokenCollectionId)?.name || '-'}
              </Table.Cell>
              <Table.Cell>
                {token.status && (
                  <Badge colorScheme={token.status === 'experimental' ? 'yellow' : token.status === 'stable' ? 'green' : 'red'}>
                    {token.status}
                  </Badge>
                )}
              </Table.Cell>
              <Table.Cell>
                <Text whiteSpace="pre-line">{getTaxonomyNames(token)}</Text>
              </Table.Cell>
              <Table.Cell>
                <HStack gap={2}>
                  <IconButton
                    aria-label="Edit token"
                    size="sm"
                    onClick={() => handleEditToken(token)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    aria-label="Delete token"
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleDeleteToken(token.id)}
                  >
                    <Trash2 />
                  </IconButton>
                </HStack>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
