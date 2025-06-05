import React, { useState } from 'react';
import { Box, Text, HStack, Flex, FormControl, FormLabel, Select, Input, Table, Thead, Tbody, Tr, Th, Td, IconButton, Badge } from '@chakra-ui/react';
import { Edit, Trash2 } from 'lucide-react';
import type { TokenCollection, ResolvedValueType, Taxonomy } from '@token-model/data-model';
import type { ExtendedToken } from '../../components/TokenEditorDialog';
import TokenTag from '../../components/TokenTag';
import { formatValueForDisplay } from '../../utils/valueTypeUtils';

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

  // Get display for a token value
  const getValueDisplay = (token: ExtendedToken) => {
    if (!token.valuesByMode?.length) return '-';

    return token.valuesByMode.map((modeValue) => {
      const value = modeValue.value;
      if (!value) return null;

      // Debug logging for value structure
      console.log('Token Value Debug:', {
        tokenId: token.id,
        tokenName: token.displayName,
        resolvedValueTypeId: token.resolvedValueTypeId,
        modeValue,
        rawValue: value
      });

      // Get the resolved value type for this token
      const valueType = resolvedValueTypes.find(vt => vt.id === token.resolvedValueTypeId);
      if (!valueType) {
        console.warn('No resolved value type found for token:', {
          tokenId: token.id,
          resolvedValueTypeId: token.resolvedValueTypeId
        });
        return '-';
      }

      let displayValue: React.ReactNode;

      // Helper function to extract tokenId from nested structure
      const extractTokenId = (val: unknown): string | null => {
        if (!val || typeof val !== 'object') return null;
        
        const obj = val as Record<string, unknown>;
        if ('tokenId' in obj && typeof obj.tokenId === 'string') {
          return obj.tokenId;
        }
        
        if ('value' in obj && obj.value && typeof obj.value === 'object') {
          return extractTokenId(obj.value);
        }
        
        return null;
      };

      // Check for tokenId in the value structure
      const tokenId = extractTokenId(value);
      if (tokenId) {
        const aliasToken = tokens.find(t => t.id === tokenId);
        if (aliasToken) {
          // Get the actual value from the alias token
          const aliasValue = aliasToken.valuesByMode?.[0]?.value;
          if (aliasValue && 'value' in aliasValue) {
            const rawAliasValue = typeof aliasValue.value === 'object' && aliasValue.value !== null && 'value' in aliasValue.value
              ? (aliasValue.value as { value: string | number }).value
              : aliasValue.value;

            displayValue = (
              <TokenTag
                displayName={aliasToken.displayName}
                resolvedValueTypeId={aliasToken.resolvedValueTypeId}
                resolvedValueTypes={resolvedValueTypes}
                value={rawAliasValue}
              />
            );
          } else {
            displayValue = aliasToken.displayName;
          }
        } else {
          displayValue = tokenId;
        }
        console.log('Alias value resolved:', {
          tokenId: token.id,
          aliasTokenId: tokenId,
          displayValue
        });
      }
      // Handle direct values based on resolvedValueTypeId
      else if (typeof value === 'object' && value !== null && 'value' in value) {
        // Extract the actual value, handling nested structure
        const rawValue = typeof value.value === 'object' && value.value !== null && 'value' in value.value
          ? (value.value as { value: string | number }).value
          : value.value;

        console.log('Direct value processing:', {
          tokenId: token.id,
          valueType: valueType.type,
          rawValue,
          rawValueType: typeof rawValue
        });
        
        const formattedValue = formatValueForDisplay(rawValue, token.resolvedValueTypeId, resolvedValueTypes);
        
        switch (valueType.type) {
          case 'COLOR':
            displayValue = (
              <HStack spacing={2}>
                <Box
                  w={4}
                  h={4}
                  borderRadius="sm"
                  bg={typeof rawValue === 'string' ? rawValue : String(rawValue)}
                  border="1px solid"
                  borderColor="gray.200"
                />
                <Text>{formattedValue}</Text>
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
            displayValue = `${typeof rawValue === 'number' ? rawValue : Number(rawValue)}px`;
            break;
          case 'FONT_WEIGHT':
            displayValue = typeof rawValue === 'number' ? rawValue.toString() : String(rawValue);
            break;
          case 'FONT_FAMILY':
          case 'CUBIC_BEZIER':
            displayValue = typeof rawValue === 'string' ? rawValue : String(rawValue);
            break;
          default:
            displayValue = formattedValue;
        }
      }

      return displayValue;
    });
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
