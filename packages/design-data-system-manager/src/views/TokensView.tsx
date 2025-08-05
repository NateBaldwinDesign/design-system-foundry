import React, { useState } from 'react';
import { Box, Text, HStack, Flex, Input, Table, Thead, Tbody, Tr, Th, Td, IconButton, Badge, Button, Popover, PopoverTrigger, PopoverContent, PopoverBody, Checkbox, VStack, Tabs, TabList, Tab, InputGroup, InputRightElement, Center, Icon, InputLeftElement, useColorMode, Switch, FormControl, FormLabel, Select } from '@chakra-ui/react';
import { Edit, Columns, Filter, X, Search } from 'lucide-react';
import type { TokenCollection, ResolvedValueType, Taxonomy, Mode, Dimension } from '@token-model/data-model';
import type { ExtendedToken } from '../components/TokenEditorDialog';
import TokenTag from '../components/TokenTag';
import TokenResolvedValueTag from '../components/TokenResolvedValueTag';
import { formatValueForDisplay } from '../utils/valueTypeUtils';
import { getValueTypeIcon } from '../utils/getValueTypeIcon';
import TokenIcon from '../icons/TokenIcon';
import { PageTemplate } from '../components/PageTemplate';
import type { DataSourceContext } from '../services/dataSourceManager';

interface TokensViewProps {
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  resolvedValueTypes: ResolvedValueType[];
  taxonomies: Taxonomy[];
  modes: Mode[];
  dimensions: Dimension[];
  renderAddTokenButton?: React.ReactNode;
  onEditToken?: (token: ExtendedToken) => void;
  canEdit?: boolean;
  // NEW: Data source context for edit mode filtering
  dataSourceContext?: DataSourceContext;
  // NEW: Dimension order for mode label combinations
  dimensionOrder?: string[];
}

export function TokensView({ 
  tokens, 
  collections, 
  resolvedValueTypes, 
  taxonomies,
  modes,
  dimensions,
  renderAddTokenButton,
  onEditToken,
  canEdit = false, // Changed default to false to respect edit mode state
  dataSourceContext,
  dimensionOrder = []
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
  const [sourceSpecificDataOnly, setSourceSpecificDataOnly] = useState(false);
  
  // NEW: Dimension mode filtering state - initialize with default modes
  const [dimensionModeFilters, setDimensionModeFilters] = useState<Record<string, string>>(() => {
    const initialFilters: Record<string, string> = {};
    dimensions.forEach(dimension => {
      if (dimension.defaultMode) {
        // Find the mode name that matches the defaultMode ID
        const defaultMode = dimension.modes.find(mode => mode.id === dimension.defaultMode);
        if (defaultMode) {
          initialFilters[dimension.id] = dimension.defaultMode;
        }
      }
    });
    return initialFilters;
  });

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
    setSourceSpecificDataOnly(false);
    // Note: dimension mode filters are not cleared as they control value display, not token filtering
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



    // NEW: Apply source-specific data only filter
    const matchesSourceSpecific = !sourceSpecificDataOnly || (() => {
      if (!dataSourceContext?.editMode.isActive) return true;
      
      const { sourceType, sourceId } = dataSourceContext.editMode;
      
      // For platform extensions, check if token has platform overrides or is platform-specific
      if (sourceType === 'platform-extension' && sourceId) {
        // Check if token has platform overrides for this platform
        const hasPlatformOverrides = token.valuesByMode?.some(vbm => 
          vbm.platformOverrides?.some(po => po.platformId === sourceId)
        );
        
        // Check if token is omitted by this platform (would be in omittedTokens)
        // For now, we'll show all tokens and let the user filter manually
        return hasPlatformOverrides;
      }
      
      // For theme overrides, check if token is themeable and has theme overrides
      if (sourceType === 'theme-override' && sourceId) {
        // Only show themeable tokens
        return token.themeable === true;
      }
      
      // For core data, show all tokens
      return true;
    })();

    return matchesSearch && matchesTokenTier && matchesCollection && matchesType && matchesStatus && matchesPrivate && matchesThemeable && matchesSourceSpecific;
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

    // Filter valuesByMode based on dimension mode selections
    const filteredModeValues = token.valuesByMode.filter((modeValue) => {
      // If no dimension mode filters are set, show all values (existing behavior)
      if (Object.keys(dimensionModeFilters).length === 0) {
        return true;
      }

      // If modeIds is empty array [], this value should always be shown (schema validation)
      if (modeValue.modeIds.length === 0) {
        return true;
      }

      // Group modeIds by dimension
      const modeIdsByDimension = new Map<string, string[]>();
      modeValue.modeIds.forEach(modeId => {
        const dimension = dimensions.find(dim => 
          dim.modes.some(mode => mode.id === modeId)
        );
        
        if (dimension) {
          if (!modeIdsByDimension.has(dimension.id)) {
            modeIdsByDimension.set(dimension.id, []);
          }
          modeIdsByDimension.get(dimension.id)!.push(modeId);
        }
      });

      // Check if this modeValue matches the dimension selections
      // Only check dimensions that this value actually has modes for
      for (const [dimensionId, selectedModeId] of Object.entries(dimensionModeFilters)) {
        const modeIdsForDimension = modeIdsByDimension.get(dimensionId);
        
        // If this value doesn't have modes for this dimension, skip it
        // (the value is not affected by this dimension's selection)
        if (!modeIdsForDimension) {
          continue;
        }
        
        if (selectedModeId === '') {
          // "All modes" selected for this dimension - any mode is acceptable
          continue;
        }
        
        // Specific mode selected - check if this value has that mode
        if (!modeIdsForDimension.includes(selectedModeId)) {
          return false;
        }
      }
      
      return true;
    });

    // If no values match the filters, show '-'
    if (filteredModeValues.length === 0) return '-';

    // Helper function to get mode info for a modeId
    const getModeInfo = (modeId: string) => {
      const dimension = dimensions.find(dim => 
        dim.modes.some(mode => mode.id === modeId)
      );
      
      if (dimension) {
        const mode = dimension.modes.find(m => m.id === modeId);
        if (mode) {
          return { dimension, mode };
        }
      }
      return null;
    };

    // Helper function to create combined mode labels
    const createCombinedModeLabels = (modeIds: string[]) => {
      if (modeIds.length === 0) return null;

      // Get all mode info
      const modeInfos = modeIds.map(modeId => getModeInfo(modeId)).filter(Boolean);
      if (modeInfos.length === 0) return null;

      // Check which dimensions have "All modes" selected
      const dimensionsWithAllModes = new Set<string>();
      Object.entries(dimensionModeFilters).forEach(([dimensionId, selectedModeId]) => {
        if (selectedModeId === '') { // Empty string means "All modes"
          dimensionsWithAllModes.add(dimensionId);
        }
      });

      // If no dimensions have "All modes" selected, don't show labels
      if (dimensionsWithAllModes.size === 0) return null;

      // Filter mode infos to only include modes from dimensions with "All modes" selected
      const relevantModeInfos = modeInfos.filter(info => 
        dimensionsWithAllModes.has(info!.dimension.id)
      );

      if (relevantModeInfos.length === 0) return null;

      // Sort dimensions by dimensionOrder
      const sortedModeInfos = relevantModeInfos.sort((a, b) => {
        const aIndex = dimensionOrder.indexOf(a!.dimension.id);
        const bIndex = dimensionOrder.indexOf(b!.dimension.id);
        
        // If both are in dimensionOrder, sort by their position
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        
        // If only one is in dimensionOrder, prioritize it
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        
        // If neither is in dimensionOrder, sort alphabetically by dimension name
        return a!.dimension.displayName.localeCompare(b!.dimension.displayName);
      });

      // Create combined label
      const modeNames = sortedModeInfos.map(info => info!.mode.name);
      return modeNames.join(' + ');
    };

    return filteredModeValues.map((modeValue) => {
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

      // Create combined mode label
      const combinedLabel = createCombinedModeLabels(modeValue.modeIds);

      return (
        <Box key={modeValue.modeIds.join(',')}>
          {combinedLabel ? (
            <HStack spacing={2} align="center">
              <Text fontSize="sm" fontWeight="medium" color="gray.600" minW="fit-content">
                {combinedLabel}:
              </Text>
              {displayValue}
            </HStack>
          ) : (
            displayValue
          )}
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

  const algorightmBgColor = colorMode === 'dark' ? 'purple.800' : 'orange.100';
  const defaultBgColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';

  return (
    <PageTemplate 
      title="Tokens"
      headerComponent={
        <HStack spacing={4} width="auto" justify="space-between">
          {/* NEW: Source-specific data only toggle */}
          {dataSourceContext?.editMode.isActive && dataSourceContext.editMode.sourceType !== 'core' && (
            <FormControl display="flex" alignItems="center" width="auto">
              <FormLabel htmlFor="source-specific-data-only" mb="0" fontSize="sm">
                Source-specific data only
              </FormLabel>
              <Switch
                id="source-specific-data-only"
                isChecked={sourceSpecificDataOnly}
                onChange={(e) => setSourceSpecificDataOnly(e.target.checked)}
                size="sm"
              />
            </FormControl>
          )}

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
          
        </HStack>
      }
      maxWidth="100%"
    >
      {/* NEW: Dimension mode dropdowns */}
      {dimensions.length > 0 && (
        <Box>
          <HStack spacing={4} align="flex-end">
            {dimensions.map(dimension => (
              <FormControl key={dimension.id} width="auto">
                <FormLabel htmlFor={`dimension-${dimension.id}`} mb="0" fontSize="sm">
                  {dimension.displayName}
                </FormLabel>
                <Select
                  id={`dimension-${dimension.id}`}
                  value={dimensionModeFilters[dimension.id] || ''}
                  onChange={(e) => setDimensionModeFilters(prev => ({
                    ...prev,
                    [dimension.id]: e.target.value
                  }))}
                  size="sm"
                  width="150px"
                >
                  <option value="">All modes</option>
                  {dimension.modes.map(mode => (
                    <option key={mode.id} value={mode.id}>
                      {mode.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            ))}
          </HStack>
        </Box>
      )}

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
                  <HStack spacing={2} backgroundColor={token.generatedByAlgorithm ? algorightmBgColor : defaultBgColor} borderRadius="md" p={2} width="fit-content">
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
                    {canEdit && onEditToken && (
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
