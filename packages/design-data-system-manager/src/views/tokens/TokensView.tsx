import React, { useState } from 'react';
import { Box, Text, HStack, Flex, FormControl, FormLabel, Select, Input, Table, Thead, Tbody, Tr, Th, Td, IconButton, Badge, Button, Popover, PopoverTrigger, PopoverContent, PopoverBody, Checkbox, VStack } from '@chakra-ui/react';
import { Edit, Trash2, Columns } from 'lucide-react';
import type { TokenCollection, ResolvedValueType, Taxonomy } from '@token-model/data-model';
import type { ExtendedToken } from '../../components/TokenEditorDialog';
import TokenTag from '../../components/TokenTag';
import { formatValueForDisplay } from '../../utils/valueTypeUtils';
import { getValueTypeIcon } from '../../utils/getValueTypeIcon';

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
  const [tokenTierFilter, setTokenTierFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    tokenTier: false,
    propertyTypes: false,
    codeSyntax: false,
    taxonomies: true,
    private: true,
    themeable: true,
    status: true,
    collection: true
  });

  // Handler for clearing all filters
  const handleClearFilters = () => {
    setCollectionFilter('');
    setTypeFilter('');
    setStatusFilter('');
    setTokenTierFilter('');
    setSearchTerm('');
  };

  // Unique values for filters
  const statusOptions = Array.from(new Set(tokens.map(t => t.status).filter(Boolean))).sort();

  // Filter tokens based on search term and filters
  const filteredTokens = tokens.filter(token => {
    const matchesSearch = token.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCollection = !collectionFilter || token.tokenCollectionId === collectionFilter;
    const matchesType = !typeFilter || token.resolvedValueTypeId === typeFilter;
    const matchesStatus = !statusFilter || token.status === statusFilter;
    const matchesTokenTier = !tokenTierFilter || token.tokenTier === tokenTierFilter;

    return matchesSearch && matchesCollection && matchesType && matchesStatus && matchesTokenTier;
  });

  // Get display name for a value type
  const getTypeDisplay = (typeId: string) => {
    const typeObj = resolvedValueTypes.find(vt => vt.id === typeId);
    if (!typeObj) return typeId;
    return typeObj.displayName;
  };

  // Get type from resolved value type id
  const getTypeFromId = (typeId: string) => {
    const typeObj = resolvedValueTypes.find(vt => vt.id === typeId);
    if (!typeObj) return typeId;
    return typeObj.type;
  };

  // Get display for a token value
  const getValueDisplay = (token: ExtendedToken) => {
    if (!token.valuesByMode?.length) return '-';

    return token.valuesByMode.map((modeValue) => {
      const value = modeValue.value;
      if (!value) return null;

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
                isPill={true}
              />
            );
          } else {
            displayValue = aliasToken.displayName;
          }
        } else {
          displayValue = tokenId;
        }

      }
      // Handle direct values based on resolvedValueTypeId
      else if (typeof value === 'object' && value !== null && 'value' in value) {
        // Extract the actual value, handling nested structure
        const rawValue = typeof value.value === 'object' && value.value !== null && 'value' in value.value
          ? (value.value as { value: string | number }).value
          : value.value;

        
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

  // Handler for toggling column visibility
  const handleColumnToggle = (column: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
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
        <Popover placement="bottom-end">
          <PopoverTrigger>
            <Button leftIcon={<Columns size={16} />} size="sm" variant="outline">
              Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent width="200px">
            <PopoverBody>
              <VStack align="start" spacing={2}>
                <Checkbox
                  isChecked={visibleColumns.collection}
                  onChange={() => handleColumnToggle('collection')}
                >
                  Collection
                </Checkbox>
                <Checkbox
                  isChecked={visibleColumns.status}
                  onChange={() => handleColumnToggle('status')}
                >
                  Status
                </Checkbox>
                <Checkbox
                  isChecked={visibleColumns.themeable}
                  onChange={() => handleColumnToggle('themeable')}
                >
                  Themeable
                </Checkbox>
                <Checkbox
                  isChecked={visibleColumns.private}
                  onChange={() => handleColumnToggle('private')}
                >
                  Private
                </Checkbox>
                <Checkbox
                  isChecked={visibleColumns.taxonomies}
                  onChange={() => handleColumnToggle('taxonomies')}
                >
                  Taxonomies
                </Checkbox>
                <Checkbox
                  isChecked={visibleColumns.tokenTier}
                  onChange={() => handleColumnToggle('tokenTier')}
                >
                  Token Tier
                </Checkbox>
                <Checkbox
                  isChecked={visibleColumns.propertyTypes}
                  onChange={() => handleColumnToggle('propertyTypes')}
                >
                  Property Types
                </Checkbox>
                <Checkbox
                  isChecked={visibleColumns.codeSyntax}
                  onChange={() => handleColumnToggle('codeSyntax')}
                >
                  Code Syntax
                </Checkbox>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>
      </Flex>
      {/* Filter Controls */}
      <HStack spacing={4} wrap="nowrap" align="flex-start" mb={4}>
        <FormControl maxW="240px" flex="none">
          <FormLabel>Token Tier</FormLabel>
          <Select size="sm" value={tokenTierFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTokenTierFilter(e.target.value)}>
            <option key="tier-all" value="">All</option>
            <option key="tier-primitive" value="PRIMITIVE">Primitive</option>
            <option key="tier-semantic" value="SEMANTIC">Semantic</option>
            <option key="tier-component" value="COMPONENT">Component</option>
          </Select>
        </FormControl>
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
        <Button
          size="sm"
          variant="ghost"
          onClick={handleClearFilters}
          alignSelf="flex-end"
          mb={1}
        >
          Clear filters
        </Button>
      </HStack>

      

      {/* Token Table */}
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Type</Th>
            <Th>Name</Th>
            {visibleColumns.collection && <Th>Collection</Th>}
            <Th>Value</Th>
            {visibleColumns.status && <Th>Status</Th>}
            {visibleColumns.themeable && <Th>Themeable</Th>}
            {visibleColumns.private && <Th>Private</Th>}
            {visibleColumns.taxonomies && <Th>Taxonomies</Th>}
            {visibleColumns.tokenTier && <Th>Token Tier</Th>}
            {visibleColumns.propertyTypes && <Th>Property Types</Th>}
            {visibleColumns.codeSyntax && <Th>Code Syntax</Th>}
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredTokens.map(token => (
            <Tr key={token.id}>
              <Td>
                <HStack spacing={2}>
                  {getValueTypeIcon(getTypeFromId(token.resolvedValueTypeId), 20)}
                </HStack>
              </Td>
              <Td>
                <Text fontWeight="medium">{token.displayName}</Text>
                {token.description && (
                  <Text fontSize="sm" color="gray.500">
                    {token.description}
                  </Text>
                )}
              </Td>
              {visibleColumns.collection && (
                <Td>{collections.find(c => c.id === token.tokenCollectionId)?.name || token.tokenCollectionId}</Td>
              )}
              <Td>{getValueDisplay(token)}</Td>
              {visibleColumns.status && (
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
              )}
              {visibleColumns.themeable && (
                <Td>{token.themeable ? 'Yes' : 'No'}</Td>
              )}
              {visibleColumns.private && (
                <Td>{token.private ? 'Yes' : 'No'}</Td>
              )}
              {visibleColumns.taxonomies && (
                <Td>
                  {getTaxonomyNames(token).split('\n').map((line, idx) => (
                    <Text key={idx} fontSize="sm">{line}</Text>
                  ))}
                </Td>
              )}
              {visibleColumns.tokenTier && (
                <Td>
                  <Badge colorScheme="blue">{token.tokenTier}</Badge>
                </Td>
              )}
              {visibleColumns.propertyTypes && (
                <Td>
                  {token.propertyTypes?.map((type, idx) => (
                    <Badge key={idx} mr={1} mb={1} colorScheme="purple">{type}</Badge>
                  ))}
                </Td>
              )}
              {visibleColumns.codeSyntax && (
                <Td>
                  {token.codeSyntax?.map((syntax, idx) => (
                    <Text key={idx} fontSize="sm">
                      {syntax.platformId}: {syntax.formattedName}
                    </Text>
                  ))}
                </Td>
              )}
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
                </HStack>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
