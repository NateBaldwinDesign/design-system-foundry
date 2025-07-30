import React, { useState } from 'react';
import { Box, Text, HStack, Flex, Input, Table, Thead, Tbody, Tr, Th, Td, IconButton, Badge, Button, Popover, PopoverTrigger, PopoverContent, PopoverBody, Checkbox, VStack, Tabs, TabList, Tab, InputGroup, InputRightElement, Center, Icon, InputLeftElement, useColorMode } from '@chakra-ui/react';
import { Edit, Columns, Filter, X, Search } from 'lucide-react';
import type { TokenCollection, ResolvedValueType, Taxonomy, Mode } from '@token-model/data-model';
import type { ExtendedToken } from '../components/TokenEditorDialog';
import TokenTag from '../components/TokenTag';
import TokenResolvedValueTag from '../components/TokenResolvedValueTag';
import { formatValueForDisplay } from '../utils/valueTypeUtils';
import { getValueTypeIcon } from '../utils/getValueTypeIcon';
import TokenIcon from '../icons/TokenIcon';
import { PageTemplate } from '../components/PageTemplate';

interface TokensViewProps {
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  resolvedValueTypes: ResolvedValueType[];
  taxonomies: Taxonomy[];
  modes: Mode[];
  renderAddTokenButton?: React.ReactNode;
  onEditToken?: (token: ExtendedToken) => void;
  canEdit?: boolean;
}

export function TokensView({ 
  tokens, 
  collections, 
  resolvedValueTypes, 
  taxonomies,
  renderAddTokenButton,
  onEditToken
}: TokensViewProps) {
  // Filter state
  const [activeTab, setActiveTab] = useState<string>('PRIMITIVE');
  const { colorMode } = useColorMode();
  const [collectionFilters, setCollectionFilters] = useState<string[]>([]);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [privateFilters, setPrivateFilters] = useState<boolean[]>([]);
  const [themeableFilters, setThemeableFilters] = useState<boolean[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    tokenTier: false,
    propertyTypes: false,
    codeSyntax: false,
    taxonomies: false,
    private: false,
    themeable: true,
    status: true,
    collection: false,
    generatedByAlgorithm: false,
    algorithm: false
  });

  // Handler for clearing all filters
  const handleClearFilters = () => {
    setCollectionFilters([]);
    setTypeFilters([]);
    setStatusFilters([]);
    setPrivateFilters([]);
    setThemeableFilters([]);
    setSearchTerm('');
  };

  // Unique values for filters
  const statusOptions = Array.from(new Set(tokens.map(t => t.status || 'experimental'))).sort();

  // Filter tokens based on search term and filters
  const filteredTokens = tokens.filter(token => {
    const matchesSearch = token.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Only apply token tier filtering if there's no search term
    const matchesTokenTier = searchTerm ? true : token.tokenTier === activeTab;
    
    // Updated collection filter logic
    const matchesCollection = collectionFilters.length === 0 || collectionFilters.some(collectionId => {
      const collection = collections.find(c => c.id === collectionId);
      if (!collection) return false;
      
      // Match if token is explicitly assigned to this collection
      if (token.tokenCollectionId === collectionId) return true;
      
      // Match if token has no collection and matches collection's value types
      if (!token.tokenCollectionId && collection.resolvedValueTypeIds.includes(token.resolvedValueTypeId)) return true;
      
      return false;
    });
    
    const matchesType = typeFilters.length === 0 || typeFilters.includes(token.resolvedValueTypeId ?? '');
    const matchesStatus = statusFilters.length === 0 || statusFilters.includes(token.status || 'experimental');
    const matchesPrivate = privateFilters.length === 0 || privateFilters.includes(token.private);
    const matchesThemeable = themeableFilters.length === 0 || themeableFilters.includes(token.themeable);

    return matchesSearch && matchesTokenTier && matchesCollection && matchesType && matchesStatus && matchesPrivate && matchesThemeable;
  });

  // Get type from ID
  const getTypeFromId = (typeId: string) => {
    const type = resolvedValueTypes.find(t => t.id === typeId);
    return type?.type || typeId;
  };

  // Get type name from ID
  const getTypeNameFromId = (typeId: string) => {
    const type = resolvedValueTypes.find(t => t.id === typeId);
    return type?.displayName || typeId;
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
        
        displayValue = (
          <TokenResolvedValueTag
            resolvedValueType={valueType.type || 'UNKNOWN'}
            rawValue={rawValue}
            formattedValue={formattedValue}
          />
        );
      } else {
        displayValue = String(value);
      }

      return (
        <Box key={modeValue.modeIds.join(',')}>
          {displayValue}
        </Box>
      );
    });
  };

  // Get taxonomy names for a token
  const getTaxonomyNames = (token: ExtendedToken): string => {
    if (!token.taxonomies?.length) return '-';
    return token.taxonomies.map(ref => {
      const taxonomy = taxonomies.find(t => t.id === ref.taxonomyId);
      const term = taxonomy?.terms.find(t => t.id === ref.termId);
      return `${taxonomy?.name || ref.taxonomyId}: ${term?.name || ref.termId}`;
    }).join('\n');
  };

  // Get algorithm display name
  const getAlgorithmDisplay = (token: ExtendedToken): string => {
    if (!token.generatedByAlgorithm || !token.algorithmId) return '-';
    return token.algorithmId;
  };

  // Handle edit token
  const handleEditToken = (token: ExtendedToken) => {
    if (onEditToken) {
      onEditToken(token);
    }
  };

  // Handle column toggle
  const handleColumnToggle = (column: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  return (
    <PageTemplate 
      title="Tokens"
      headerComponent={
        <InputGroup width="300px">
          <InputLeftElement pointerEvents='none'>
            <Search size={16} />
          </InputLeftElement>
          <Input
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <InputRightElement>
              <IconButton
                aria-label="Clear search"
                icon={<X size={14} />}
                size="sm"
                variant="ghost"
                onClick={() => setSearchTerm('')}
              />
            </InputRightElement>
          )}
        </InputGroup>
      }
      maxWidth="100%"
    >
      <Tabs 
        onChange={(index) => {
          const tabs = ['PRIMITIVE', 'SEMANTIC', 'COMPONENT'];
          setActiveTab(tabs[index]);
        }} 
        mb={4}
        variant={searchTerm ? "unstyled" : "line"}
        opacity={searchTerm ? 0.5 : 1}
      >
        <TabList>
          <Tab isDisabled={!!searchTerm}>Primitive</Tab>
          <Tab isDisabled={!!searchTerm}>Semantic</Tab>
          <Tab isDisabled={!!searchTerm}>Component</Tab>
        </TabList>
      </Tabs>

      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>      
        <Flex gap={2} mb={4} justify="space-between" width="100%">
          {renderAddTokenButton}
          <HStack spacing={4}>
            <Popover placement="bottom-end">
              <PopoverTrigger>
                <Button leftIcon={<Filter size={16} />} size="sm" variant="outline">
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent width="200px">
                <PopoverBody>
                  <VStack align="start" spacing={4}>
                    <Box>
                      <Text fontWeight="medium" mb={2}>Collection</Text>
                      <VStack align="start" spacing={1}>
                        {collections.map(collection => (
                          <Checkbox
                            key={collection.id}
                            isChecked={collectionFilters.includes(collection.id)}
                            onChange={(e) => {
                              setCollectionFilters(prev => 
                                e.target.checked 
                                  ? [...prev, collection.id]
                                  : prev.filter(v => v !== collection.id)
                              );
                            }}
                          >
                            {collection.name}
                          </Checkbox>
                        ))}
                      </VStack>
                    </Box>

                    <Box>
                      <Text fontWeight="medium" mb={2}>Type</Text>
                      <VStack align="start" spacing={1}>
                        {resolvedValueTypes.map(type => (
                          <Checkbox
                            key={type.id}
                            isChecked={typeFilters.includes(type.id)}
                            onChange={(e) => {
                              setTypeFilters(prev => 
                                e.target.checked 
                                  ? [...prev, type.id]
                                  : prev.filter(v => v !== type.id)
                              );
                            }}
                          >
                            {type.displayName}
                          </Checkbox>
                        ))}
                      </VStack>
                    </Box>

                    <Box>
                      <Text fontWeight="medium" mb={2}>Status</Text>
                      <VStack align="start" spacing={1}>
                        {statusOptions.map(status => (
                          <Checkbox
                            key={status}
                            isChecked={statusFilters.includes(status)}
                            onChange={(e) => {
                              setStatusFilters(prev => 
                                e.target.checked 
                                  ? [...prev, status]
                                  : prev.filter(v => v !== status)
                              );
                            }}
                          >
                            {status}
                          </Checkbox>
                        ))}
                      </VStack>
                    </Box>

                    <Box>
                      <Text fontWeight="medium" mb={2}>Private</Text>
                      <VStack align="start" spacing={1}>
                        <Checkbox
                          isChecked={privateFilters.includes(true)}
                          onChange={(e) => {
                            setPrivateFilters(prev => 
                              e.target.checked 
                                ? [...prev, true]
                                : prev.filter(v => v !== true)
                            );
                          }}
                        >
                          Yes
                        </Checkbox>
                        <Checkbox
                          isChecked={privateFilters.includes(false)}
                          onChange={(e) => {
                            setPrivateFilters(prev => 
                              e.target.checked 
                                ? [...prev, false]
                                : prev.filter(v => v !== false)
                            );
                          }}
                        >
                          No
                        </Checkbox>
                      </VStack>
                    </Box>

                    <Box>
                      <Text fontWeight="medium" mb={2}>Themeable</Text>
                      <VStack align="start" spacing={1}>
                        <Checkbox
                          isChecked={themeableFilters.includes(true)}
                          onChange={(e) => {
                            setThemeableFilters(prev => 
                              e.target.checked 
                                ? [...prev, true]
                                : prev.filter(v => v !== true)
                            );
                          }}
                        >
                          Yes
                        </Checkbox>
                        <Checkbox
                          isChecked={themeableFilters.includes(false)}
                          onChange={(e) => {
                            setThemeableFilters(prev => 
                              e.target.checked 
                                ? [...prev, false]
                                : prev.filter(v => v !== false)
                            );
                          }}
                        >
                          No
                        </Checkbox>
                      </VStack>
                    </Box>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearFilters}
                      width="100%"
                    >
                      Clear filters
                    </Button>
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>

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
                    <Checkbox
                      isChecked={visibleColumns.generatedByAlgorithm}
                      onChange={() => handleColumnToggle('generatedByAlgorithm')}
                    >
                      Generated By Algorithm
                    </Checkbox>
                    <Checkbox
                      isChecked={visibleColumns.algorithm}
                      onChange={() => handleColumnToggle('algorithm')}
                    >
                      Algorithm
                    </Checkbox>
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          </HStack>
        </Flex>
      {filteredTokens.length === 0 ? (
        <Center 
          p={8} 

        >
          <VStack spacing={4}>
            <Box color="gray.400">
              <Icon as={TokenIcon} size={48} />
            </Box>
            <VStack spacing={2}>
              <Text fontSize="lg" fontWeight="medium">
                {tokens.length === 0 
                  ? "No tokens found"
                  : "No matching tokens"}
              </Text>
              <Text color="gray.500" textAlign="center">
                {tokens.length === 0 
                  ? "Get started by adding your first token"
                  : "Try adjusting your filters or search term"}
              </Text>
            </VStack>
            {tokens.length === 0 && renderAddTokenButton && (
              <Box mt={2}>
                {renderAddTokenButton}
              </Box>
            )}
          </VStack>
        </Center>
      ) : (
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
              {visibleColumns.generatedByAlgorithm && <Th>Generated By Algorithm</Th>}
              {visibleColumns.algorithm && <Th>Algorithm</Th>}
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredTokens.map(token => (
              <Tr key={token.id}>
                <Td>
                  <HStack spacing={2} backgroundColor={token.generatedByAlgorithm ? "orange.100" : "gray.100"} borderRadius="md" p={2} width="fit-content">
                    {getValueTypeIcon(getTypeFromId(token.resolvedValueTypeId), 20, 'currentColor', token.generatedByAlgorithm, getTypeNameFromId(token.resolvedValueTypeId))}
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
                <Td>
                  <VStack align="start" spacing={1}>
                    {getValueDisplay(token)}
                  </VStack>
                </Td>
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
                      <Badge key={idx} mr={1} mb={1} colorScheme="purple">{type.displayName}</Badge>
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
                {visibleColumns.generatedByAlgorithm && (
                  <Td>
                    {token.generatedByAlgorithm ? 'Yes' : 'No'}
                  </Td>
                )}
                {visibleColumns.algorithm && (
                  <Td>
                    {getAlgorithmDisplay(token)}
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
      )}
      </Box>
    </PageTemplate>
  );
}
