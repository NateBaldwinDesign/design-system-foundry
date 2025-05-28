import React, { useState, useMemo } from 'react';
import {
  Box,
  Text,
  Table,
  Tbody,
  Td,
  Th,
  Tr,
  Thead,
  Tag,
  HStack,
  IconButton,
  Flex,
  FormControl,
  FormLabel,
  Select,
} from '@chakra-ui/react';
import { EditIcon, DeleteIcon } from '@chakra-ui/icons';
import type { Token, TokenCollection, Mode, TokenValue, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { TokenEditorDialog } from '../../components/TokenEditorDialog';

// Extend the Token type to include themeable
type ExtendedToken = Token & { themeable?: boolean };

interface TokensTabProps {
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  platforms: Platform[];
  onEdit: (token: ExtendedToken) => void;
  onDelete: (tokenId: string) => void;
  taxonomies: Taxonomy[];
  resolvedValueTypes: { id: string; displayName: string }[];
  onViewClassifications?: () => void;
  renderAddTokenButton?: React.ReactNode;
}

interface ContrastConstraint {
  type: 'contrast';
  rule: {
    minimum: number;
    comparator: TokenValue;
    method: 'WCAG21' | 'APCA' | 'Lstar';
  };
}

type Constraint = ContrastConstraint;

export function TokensTab({ tokens, collections, modes, dimensions, platforms, onEdit, onDelete, taxonomies, resolvedValueTypes, onViewClassifications, renderAddTokenButton }: TokensTabProps) {
  // Filter state
  const [collectionFilter, setCollectionFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [privateFilter, setPrivateFilter] = useState<string>('');
  const [themeableFilter, setThemeableFilter] = useState<string>('');

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

  const [selectedToken, setSelectedToken] = useState<ExtendedToken | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleEdit = (token: ExtendedToken) => {
    setSelectedToken(token);
    setIsEditorOpen(true);
  };

  const handleClose = () => {
    setIsEditorOpen(false);
    setSelectedToken(null);
  };

  const handleSave = (token: ExtendedToken) => {
    onEdit(token);
    handleClose();
  };

  const getCollectionName = (tokenCollectionId: string) => {
    return collections.find(c => c.id === tokenCollectionId)?.name || tokenCollectionId;
  };

  const getModeNames = (modeIds: string[]) => {
    return modeIds.map(id => modes.find(m => m.id === id)?.name || id).join(', ');
  };

  const getValueDisplay = (value: TokenValue) => {
    switch (value.type) {
      case 'COLOR':
        return (
          <HStack>
            <Box width="20px" height="20px" borderRadius="sm" backgroundColor={value.value} border="1px solid" borderColor="gray.200" />
            <Text>{value.value}</Text>
          </HStack>
        );
      case 'ALIAS':
        return <Text>{value.tokenId}</Text>;
      case 'FLOAT':
      case 'INTEGER':
        return <Text>{value.value}</Text>;
      case 'STRING':
        return <Text>{value.value}</Text>;
      case 'BOOLEAN':
        return <Tag colorScheme={value.value ? 'green' : 'red'} size="sm">{value.value ? 'True' : 'False'}</Tag>;
      default:
        return 'Unknown value type';
    }
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="2xl" fontWeight="bold">Tokens</Text>
        {renderAddTokenButton}
      </Flex>
      {/* Filter Controls */}
      <HStack spacing={4} wrap="wrap" align="flex-start" mb={4}>
        <FormControl maxW="240px" flex="none">
          <FormLabel>Collection</FormLabel>
          <Select size="sm" value={collectionFilter} onChange={e => setCollectionFilter(e.target.value)}>
            <option key="collection-all" value="">All</option>
            {collections.map(c => (
              <option key={`collection-${c.id}`} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </FormControl>
        <FormControl maxW="240px" flex="none">
          <FormLabel>Type</FormLabel>
          <Select size="sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option key="type-all" value="">All</option>
            {typeOptions.map(type => (
              <option key={`type-${type}`} value={type}>{type}</option>
            ))}
          </Select>
        </FormControl>
        <FormControl maxW="240px" flex="none">
          <FormLabel>Status</FormLabel>
          <Select size="sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option key="status-all" value="">All</option>
            {statusOptions.map(status => (
              <option key={`status-${status}`} value={status}>{status}</option>
            ))}
          </Select>
        </FormControl>
        <FormControl maxW="240px" flex="none">
          <FormLabel>Private</FormLabel>
          <Select size="sm" value={privateFilter} onChange={e => setPrivateFilter(e.target.value)}>
            <option key="private-all" value="">All</option>
            <option key="private-true" value="true">Private</option>
            <option key="private-false" value="false">Public</option>
          </Select>
        </FormControl>
        <FormControl maxW="240px" flex="none">
          <FormLabel>Themeable</FormLabel>
          <Select size="sm" value={themeableFilter} onChange={e => setThemeableFilter(e.target.value)}>
            <option key="themeable-all" value="">All</option>
            <option key="themeable-true" value="true">Yes</option>
            <option key="themeable-false" value="false">No</option>
          </Select>
        </FormControl>
      </HStack>
      {/* Token Table */}
      <Box p={0} borderWidth={0} borderRadius="md">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Collection</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Private</Th>
              <Th>Themeable</Th>
              <Th>Taxonomies</Th>
              <Th>Values by Mode</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredTokens.map((token: ExtendedToken) => (
              <Tr key={token.id}>
                <Td>
                  <Text fontWeight="bold">{token.displayName}</Text>
                  {token.description && (
                    <Text fontSize="sm" color="gray.500">{token.description}</Text>
                  )}
                </Td>
                <Td>{getCollectionName(token.tokenCollectionId)}</Td>
                <Td><Tag colorScheme="blue" size="sm">{token.resolvedValueType}</Tag></Td>
                <Td>{token.status && (<Tag colorScheme={token.status === 'stable' ? 'green' : token.status === 'experimental' ? 'yellow' : 'red'} size="sm">{token.status}</Tag>)}</Td>
                <Td><Tag colorScheme={token.private ? 'gray' : 'green'} size="sm">{token.private ? 'Private' : 'Public'}</Tag></Td>
                <Td><Tag colorScheme={token.themeable ? 'green' : 'gray'} size="sm">{token.themeable ? 'Yes' : 'No'}</Tag></Td>
                <Td>
                  {/* Render taxonomy terms */}
                  {token.taxonomies && token.taxonomies.length > 0 ? (
                    <HStack spacing={1} wrap="wrap">
                      {token.taxonomies.map((ref: { taxonomyId: string; termId: string }) => {
                        const taxonomy = taxonomies.find(tax => tax.id === ref.taxonomyId);
                        const term: { id: string; name: string } | undefined = taxonomy?.terms.find((term: { id: string; name: string }) => term.id === ref.termId);
                        if (!taxonomy || !term) return null;
                        return (
                          <Tag key={`${ref.taxonomyId}-${ref.termId}`} size="sm" colorScheme="blue">
                            {term.name}
                          </Tag>
                        );
                      }).filter(Boolean)}
                    </HStack>
                  ) : null}
                </Td>
                <Td>
                  {token.valuesByMode.map((valueByMode: ValueByMode, index: number) => (
                    <Box key={`${token.id}-${index}`} mb={1}>
                      <Text fontSize="xs" color="gray.500">{getModeNames(valueByMode.modeIds)}:</Text>
                      <Box mt={1}>{getValueDisplay(valueByMode.value)}</Box>
                    </Box>
                  ))}
                </Td>
                <Td>
                  <HStack spacing={1}>
                    <IconButton aria-label="Edit token" icon={<EditIcon />} onClick={() => handleEdit(token)} size="sm" />
                    <IconButton aria-label="Delete token" icon={<DeleteIcon />} onClick={() => onDelete(token.id)} size="sm" />
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
      {selectedToken && (
        <TokenEditorDialog
          token={selectedToken}
          tokens={tokens}
          dimensions={dimensions}
          modes={modes}
          platforms={platforms}
          open={isEditorOpen}
          onClose={handleClose}
          onSave={handleSave}
          taxonomies={taxonomies}
          resolvedValueTypes={resolvedValueTypes}
          onViewClassifications={onViewClassifications}
        />
      )}
    </Box>
  );
} 