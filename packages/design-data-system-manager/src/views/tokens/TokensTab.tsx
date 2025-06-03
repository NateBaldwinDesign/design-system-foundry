import React, { useState } from 'react';
import { Box, Text, HStack, Flex, FormControl, FormLabel, Select, Input, Table, Thead, Tbody, Tr, Th, Td, IconButton, Badge } from '@chakra-ui/react';
import { Edit, Trash2 } from 'lucide-react';
import type { TokenCollection, ResolvedValueType, Mode, Taxonomy } from '@token-model/data-model';
import type { ExtendedToken } from '../../components/TokenEditorDialog';

interface TokensTabProps {
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  resolvedValueTypes: ResolvedValueType[];
  modes: Mode[];
  taxonomies: Taxonomy[];
  renderAddTokenButton?: React.ReactNode;
  onEditToken?: (token: ExtendedToken) => void;
  onDeleteToken?: (tokenId: string) => void;
}

export function TokensTab({ 
  tokens, 
  collections, 
  resolvedValueTypes, 
  modes,
  taxonomies,
  renderAddTokenButton,
  onEditToken,
  onDeleteToken 
}: TokensTabProps) {
  // Filter state
  const [collectionFilter, setCollectionFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Unique values for filters
  const statusOptions = Array.from(new Set(tokens.map(t => t.status).filter(Boolean))).sort();

  // Filter tokens based on search term and filters
  const filteredTokens = tokens.filter(token => {
    const matchesSearch = token.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCollection = !collectionFilter || token.tokenCollectionId === collectionFilter;
    const matchesType = !typeFilter || token.resolvedValueTypeId === typeFilter;
    const matchesStatus = !statusFilter || token.status === statusFilter;

    return matchesSearch && matchesCollection && matchesType && matchesStatus;
  });

  // Get display name for a value type
  const getTypeDisplay = (typeId: string) => {
    const typeObj = resolvedValueTypes.find(vt => vt.id === typeId);
    if (!typeObj) return typeId;
    return typeObj.displayName;
  };

  // Helper to get mode name(s) from modeIds
  const getModeNames = (modeIds: string[]): string => {
    if (!modeIds || modeIds.length === 0) return 'Global';
    if (!modes || !Array.isArray(modes)) return modeIds.join(' / ');
    const names = modeIds.map(modeId => {
      const mode = modes.find(m => m.id === modeId);
      return mode ? mode.name : modeId;
    });
    return names.join(' / ');
  };

  // Get display for a token value
  const getValueDisplay = (token: ExtendedToken) => {
    if (!token.valuesByMode?.length) return '-';

    return token.valuesByMode.map((modeValue, idx) => {
      const value = modeValue.value;
      if (!value) return null;

      let displayValue: React.ReactNode;
      switch (value.type) {
        case 'COLOR':
          displayValue = (
            <HStack spacing={2}>
              <Box
                w={4}
                h={4}
                borderRadius="sm"
                bg={value.value}
                border="1px solid"
                borderColor="gray.200"
              />
              <Text>{value.value}</Text>
            </HStack>
          );
          break;
        case 'DIMENSION':
        case 'SPACING':
        case 'FONT_SIZE':
        case 'LINE_HEIGHT':
        case 'LETTER_SPACING':
        case 'DURATION':
        case 'BLUR':
        case 'SPREAD':
        case 'RADIUS':
          displayValue = `${value.value}px`;
          break;
        case 'FONT_WEIGHT':
          displayValue = value.value.toString();
          break;
        case 'FONT_FAMILY':
        case 'CUBIC_BEZIER':
          displayValue = value.value;
          break;
        case 'ALIAS': {
          const aliasToken = tokens.find(t => t.id === value.tokenId);
          displayValue = aliasToken ? aliasToken.displayName : value.tokenId;
          break;
        }
        default:
          displayValue = '-';
      }

      return (
        <Box key={idx}>
          <Text fontSize="sm" color="gray.500">
            {getModeNames(modeValue.modeIds)}:
          </Text>
          {displayValue}
        </Box>
      );
    }).filter(Boolean);
  };

  // Helper to get taxonomy term names for a token
  const getTaxonomyNames = (token: ExtendedToken): string => {
    if (!token.taxonomies || !Array.isArray(token.taxonomies) || token.taxonomies.length === 0) return '';
    return token.taxonomies.map(ref => {
      const taxonomy = taxonomies.find(t => t.id === ref.taxonomyId);
      if (!taxonomy) {
        console.warn('Taxonomy not found for id:', ref.taxonomyId, 'in', taxonomies);
        return ref.taxonomyId;
      }
      const term = taxonomy.terms?.find(term => term.id === ref.termId);
      if (!term) {
        console.warn('Term not found for id:', ref.termId, 'in taxonomy', taxonomy);
        return `${taxonomy.name}: ${ref.termId}`;
      }
      return `${taxonomy.name}: ${term.name}`;
    }).join('\n');
  };

  // Handler for editing a token
  const handleEditToken = (token: ExtendedToken) => {
    if (onEditToken) onEditToken(token);
  };

  // Handler for deleting a token
  const handleDeleteToken = (tokenId: string) => {
    if (onDeleteToken) onDeleteToken(tokenId);
  };

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

      {/* Token Table */}
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Collection</Th>
            <Th>Type</Th>
            <Th>Value</Th>
            <Th>Status</Th>
            <Th>Themeable</Th>
            <Th>Private</Th>
            <Th>Taxonomies</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredTokens.map(token => (
            <Tr key={token.id}>
              <Td>
                <Text fontWeight="medium">{token.displayName}</Text>
                {token.description && (
                  <Text fontSize="sm" color="gray.500">
                    {token.description}
                  </Text>
                )}
              </Td>
              <Td>{collections.find(c => c.id === token.tokenCollectionId)?.name || token.tokenCollectionId}</Td>
              <Td>{getTypeDisplay(token.resolvedValueTypeId || '')}</Td>
              <Td>{getValueDisplay(token)}</Td>
              <Td>
                <Badge
                  colorScheme={
                    token.status === 'stable' ? 'green' :
                    token.status === 'deprecated' ? 'red' :
                    'yellow'
                  }
                >
                  {token.status || 'experimental'}
                </Badge>
              </Td>
              <Td>{token.themeable ? 'Yes' : 'No'}</Td>
              <Td>{token.private ? 'Yes' : 'No'}</Td>
              <Td>
                {getTaxonomyNames(token).split('\n').map((line, idx) => (
                  <Text key={idx} fontSize="sm">{line}</Text>
                ))}
              </Td>
              <Td>
                <HStack spacing={2}>
                  {onEditToken && (
                    <IconButton
                      aria-label="Edit token"
                      icon={<Edit size={16} />}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditToken(token)}
                    />
                  )}
                  {onDeleteToken && (
                    <IconButton
                      aria-label="Delete token"
                      icon={<Trash2 size={16} />}
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => handleDeleteToken(token.id)}
                    />
                  )}
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
