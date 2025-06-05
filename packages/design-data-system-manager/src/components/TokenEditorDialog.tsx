import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Box,
  Text,
  Input,
  FormControl,
  FormLabel,
  Select,
  Checkbox,
  IconButton,
  VStack,
  HStack,
  Flex,
  useColorMode,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { Trash2 } from 'lucide-react';
import { ValueByModeTable } from './ValueByModeTable';
import { PlatformOverridesTable } from './PlatformOverridesTable';
import { TokenValuePicker } from './TokenValuePicker';
import { TaxonomyPicker } from './TaxonomyPicker';
import { Token, Mode, Dimension, Platform, TokenStatus, TokenTaxonomyRef, ResolvedValueType, TokenValue, validateToken } from '@token-model/data-model';
import { createUniqueId } from '../utils/id';
import { useSchema } from '../hooks/useSchema';
import { CodeSyntaxService, ensureCodeSyntaxArrayFormat } from '../services/codeSyntax';
import { ValidationService } from '../services/validation';

// ExtendedToken type to include platformOverrides
export interface ValueByMode {
  modeIds: string[];
  value: TokenValue;
  platformOverrides?: {
    platformId: string;
    value: string;
  }[];
  metadata?: Record<string, unknown>;
}

export type ExtendedToken = Omit<Token, 'valuesByMode'> & {
  valuesByMode: ValueByMode[];
};

// Helper function to get a default token value based on schema
function getDefaultTokenValue(resolvedValueTypeId: string, schema: { resolvedValueTypes: ResolvedValueType[] }): TokenValue {
  const valueType = schema.resolvedValueTypes.find((vt: ResolvedValueType) => vt.id === resolvedValueTypeId);
  if (!valueType) {
    throw new Error(`Unknown value type: ${resolvedValueTypeId}`);
  }

  // Use sensible defaults based on the value type
  switch (valueType.type) {
    case 'COLOR':
      return { value: '#000000' };
    case 'DIMENSION':
    case 'SPACING':
    case 'FONT_SIZE':
    case 'LINE_HEIGHT':
    case 'LETTER_SPACING':
    case 'BLUR':
    case 'SPREAD':
    case 'RADIUS':
      return { value: 0 };
    case 'FONT_WEIGHT':
      return { value: 400 };
    case 'FONT_FAMILY':
      return { value: 'system-ui' };
    case 'DURATION':
      return { value: 0 };
    case 'CUBIC_BEZIER':
      return { value: 'cubic-bezier(0.4, 0, 0.2, 1)' };
    default:
      return { value: '' };
  }
}

interface Taxonomy {
  id: string;
  name: string;
  description: string;
  terms: { id: string; name: string; description?: string }[];
  resolvedValueTypeIds?: string[];
}

export interface TokenEditorDialogProps {
  token: ExtendedToken;
  tokens: ExtendedToken[];
  dimensions: Dimension[];
  modes: Mode[];
  platforms: Platform[];
  open: boolean;
  onClose: () => void;
  onSave: (token: ExtendedToken) => void;
  taxonomies: Taxonomy[];
  resolvedValueTypes: ResolvedValueType[];
  isNew?: boolean;
  onViewClassifications?: () => void;
}

// Helper: get all mode combinations for selected dimensions
function cartesianProduct(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (a, b) => a.flatMap(d => b.map(e => [...d, e])),
    [[]]
  );
}

// Helper function to filter taxonomies by value type
function filterTaxonomiesByValueType(taxonomies: Taxonomy[], resolvedValueTypeId: string): Taxonomy[] {
  return taxonomies.filter(taxonomy => 
    Array.isArray(taxonomy.resolvedValueTypeIds) && 
    taxonomy.resolvedValueTypeIds.includes(resolvedValueTypeId)
  );
}


export function TokenEditorDialog({ 
    token, 
    tokens, 
    dimensions, 
    modes, 
    platforms, 
    open, 
    onClose, 
    onSave, 
    taxonomies, 
    resolvedValueTypes, 
    isNew = false, 
    onViewClassifications 
  }: TokenEditorDialogProps) {
  const { colorMode } = useColorMode();
  const { schema } = useSchema();
  
  // Initialize internal state from parent state when dialog opens
  const [editedToken, setEditedToken] = useState<ExtendedToken>(() => {
    if (isNew) {
      return {
        ...token,
        id: createUniqueId('token'),
        themeable: token.themeable ?? false,
        valuesByMode: [{
          modeIds: [],
          value: getDefaultTokenValue(token.resolvedValueTypeId, schema)
        }]
      };
    }
    return {
      ...token,
      themeable: token.themeable ?? false
    };
  });

  // Local state for taxonomy edits (not applied to editedToken until save)
  const [taxonomyEdits, setTaxonomyEdits] = useState<TokenTaxonomyRef[]>(() =>
    Array.isArray(token.taxonomies) ? token.taxonomies : []
  );

  // Track which dimensions are active for this token
  const [activeDimensionIds, setActiveDimensionIds] = useState<string[]>([]);
  const preservedValuesByRemovedDimension = useRef<Record<string, Record<string, TokenValue>>>({});

  // Add state for filtered taxonomies
  const [filteredTaxonomies, setFilteredTaxonomies] = useState<Taxonomy[]>(() => 
    filterTaxonomiesByValueType(taxonomies, token.resolvedValueTypeId)
  );

  // Update filtered taxonomies when resolvedValueTypeId changes
  useEffect(() => {
    setFilteredTaxonomies(filterTaxonomiesByValueType(taxonomies, editedToken.resolvedValueTypeId));
  }, [editedToken.resolvedValueTypeId, taxonomies]);

  // Reset internal state when dialog opens with new token
  useEffect(() => {
    if (open) {
      setEditedToken({
        ...token,
        themeable: token.themeable ?? false
      });
      setTaxonomyEdits(Array.isArray(token.taxonomies) ? token.taxonomies : []);
      setActiveDimensionIds(dimensions.filter(d => d.required).map(d => d.id));
    }
  }, [token, open, dimensions]);

  // Initialize active dimensions from current valuesByMode
  useEffect(() => {
    if (token.valuesByMode && token.valuesByMode.length > 0) {
      const allModeIds = token.valuesByMode.flatMap(vbm => vbm.modeIds);
      const presentDims = dimensions.filter(dim =>
        dim.modes.some((mode: Mode) => allModeIds.includes(mode.id))
      ).map(dim => dim.id);
      setActiveDimensionIds(presentDims);
    } else {
      setActiveDimensionIds([]);
    }
  }, [token, open, dimensions]);

  // When dimensions or their modes change, update valuesByMode to reflect new/removed modes
  useEffect(() => {
    if (!open || activeDimensionIds.length === 0) return;
    
    const activeDims = dimensions.filter(d => activeDimensionIds.includes(d.id));
    const modeArrays = activeDims.map(d => d.modes.map((m: Mode) => m.id));
    const combos = modeArrays.length > 0 ? cartesianProduct(modeArrays) : [[]];
    
    setEditedToken((prev: ExtendedToken) => {
      const prevMap = new Map(prev.valuesByMode.map((vbm: ValueByMode) => [vbm.modeIds.slice().sort().join(','), vbm.value]));
      const newValuesByMode = combos.map((modeIds: string[]) => {
        const key = modeIds.slice().sort().join(',');
        if (prevMap.has(key)) {
          const val = prevMap.get(key);
          return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueTypeId, schema) };
        }
        for (let i = 0; i < modeIds.length; i++) {
          const parentIds = modeIds.slice(0, i).concat(modeIds.slice(i + 1));
          const parentKey = parentIds.slice().sort().join(',');
          if (prevMap.has(parentKey)) {
            const val = prevMap.get(parentKey);
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueTypeId, schema) };
          }
        }
        return { modeIds, value: getDefaultTokenValue(prev.resolvedValueTypeId, schema) };
      });
      return {
        ...prev,
        valuesByMode: newValuesByMode
      };
    });
  }, [dimensions, activeDimensionIds, open, schema]);

  // Add or remove a dimension from the token
  const handleToggleDimension = (dimensionId: string) => {
    const isActive = activeDimensionIds.includes(dimensionId);
    let newActiveDims: string[];
    
    if (isActive) {
      const dim = dimensions.find(d => d.id === dimensionId);
      if (!dim) return;
      
      newActiveDims = activeDimensionIds.filter((id: string) => id !== dimensionId);
      const defaultModeId = dim.defaultMode;
      const remainingDims = dimensions.filter(d => newActiveDims.includes(d.id));
      const modeArrays = remainingDims.map(d => d.modes.map((m: Mode) => m.id));
      const combos = modeArrays.length > 0 ? cartesianProduct(modeArrays) : [[]];
      
      setEditedToken((prev: ExtendedToken) => {
        // Preserve all values that include the removed dimension
        const removedMap: Record<string, TokenValue> = {};
        prev.valuesByMode.forEach((vbm: ValueByMode) => {
          if (vbm.modeIds.includes(defaultModeId) || dim.modes.some((mode: Mode) => vbm.modeIds.includes(mode.id))) {
            const key = vbm.modeIds.slice().sort().join(',');
            removedMap[key] = vbm.value;
          }
        });
        preservedValuesByRemovedDimension.current[dimensionId] = removedMap;
        
        const prevMap = new Map(prev.valuesByMode.map((vbm: ValueByMode) => [vbm.modeIds.slice().sort().join(','), vbm.value]));
        const newValuesByMode = combos.map((modeIds: string[]) => {
          const key = modeIds.slice().sort().join(',');
          if (prevMap.has(key)) {
            const val = prevMap.get(key);
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueTypeId, schema) };
          }
          // Find all previous combos that are a superset of modeIds
          const candidates = prev.valuesByMode.filter((vbm: ValueByMode) =>
            vbm.modeIds.length === modeIds.length + 1 &&
            modeIds.every((id: string) => vbm.modeIds.includes(id))
          );
          let found = candidates.find((vbm: ValueByMode) => vbm.modeIds.includes(defaultModeId));
          if (!found && candidates.length > 0) found = candidates[0];
          if (found) {
            return { modeIds, value: found.value };
          }
          return { modeIds, value: getDefaultTokenValue(prev.resolvedValueTypeId, schema) };
        });
        return {
          ...prev,
          valuesByMode: newValuesByMode
        };
      });
    } else {
      const dim = dimensions.find(d => d.id === dimensionId);
      if (!dim) return;
      
      newActiveDims = [...activeDimensionIds, dimensionId];
      const activeDims = dimensions.filter(d => newActiveDims.includes(d.id));
      const modeArrays = activeDims.map(d => d.modes.map((m: Mode) => m.id));
      const combos = cartesianProduct(modeArrays);
      
      setEditedToken((prev: ExtendedToken) => {
        const prevMap = new Map(prev.valuesByMode.map((vbm: ValueByMode) => [vbm.modeIds.slice().sort().join(','), vbm.value]));
        // Try to restore from preserved values if available
        const preserved = preservedValuesByRemovedDimension.current[dimensionId] || {};
        const newValuesByMode = combos.map(modeIds => {
          const key = modeIds.slice().sort().join(',');
          if (prevMap.has(key)) {
            const val = prevMap.get(key);
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueTypeId, schema) };
          }
          // Try to restore from preserved
          if (preserved[key]) {
            return { modeIds, value: preserved[key] };
          }
          // Try to find a parent combo
          for (let i = 0; i < modeIds.length; i++) {
            const parentIds = modeIds.slice(0, i).concat(modeIds.slice(i + 1));
            const parentKey = parentIds.slice().sort().join(',');
            if (prevMap.has(parentKey)) {
              const val = prevMap.get(parentKey);
              return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueTypeId, schema) };
            }
          }
          return { modeIds, value: getDefaultTokenValue(prev.resolvedValueTypeId, schema) };
        });
        return {
          ...prev,
          valuesByMode: newValuesByMode
        };
      });
    }
    setActiveDimensionIds(newActiveDims);
  };

  // Update getValueEditor to use schema-driven value handling
  const getValueEditor = (
    value: TokenValue | string,
    modeIndex: number,
    modeIds: string[],
    isOverride?: boolean,
    onChange?: (newValue: TokenValue) => void
  ): React.ReactNode => {
    if (typeof value === 'string') {
      return <Text fontSize="sm" color="gray.500">{value}</Text>;
    }
    
    return (
      <TokenValuePicker
        value={value}
        tokens={tokens}
        excludeTokenId={editedToken.id}
        modes={modeIds}
        resolvedValueTypeId={editedToken.resolvedValueTypeId}
        resolvedValueTypes={resolvedValueTypes}
        onChange={(newValue: TokenValue) => {
          if (onChange) {
            onChange(newValue);
          } else {
            setEditedToken((prev: ExtendedToken) => ({
              ...prev,
              valuesByMode: prev.valuesByMode.map((item: ValueByMode, idx: number) =>
                idx === modeIndex ? { ...item, value: newValue } : item
              )
            }));
          }
        }}
      />
    );
  };

  // Update handleSave to use schema validation
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Compose schema for codeSyntax generation
    const codeSyntaxSchema = { platforms, taxonomies, namingRules: schema.namingRules };
    
    const updatedToken = {
      ...editedToken,
      taxonomies: taxonomyEdits,
      codeSyntax: CodeSyntaxService.generateAllCodeSyntaxes(
        {
          ...editedToken,
          taxonomies: taxonomyEdits,
          valuesByMode: editedToken.valuesByMode
        },
        codeSyntaxSchema
      )
    };
    
    // Validate against schema
    try {
      const validatedToken = validateToken(updatedToken);
      onSave(validatedToken);
      onClose();
    } catch (error) {
      console.error('Token validation failed:', error);
      return;
    }
  };

  function handleTaxonomyChange(newTaxonomies: TokenTaxonomyRef[]) {
    setTaxonomyEdits(newTaxonomies);
    const codeSyntaxSchema = { platforms, taxonomies, namingRules: schema.namingRules };
    setEditedToken((prev: ExtendedToken) => ({
      ...prev,
      codeSyntax: CodeSyntaxService.generateAllCodeSyntaxes(
        { ...prev, taxonomies: newTaxonomies },
        codeSyntaxSchema
      )
    }));
  }

  // Validation: required fields and taxonomy error
  const codeSyntaxArray = ensureCodeSyntaxArrayFormat(editedToken.codeSyntax);
  const hasTaxonomyError = codeSyntaxArray.some(name => name === undefined);
  const hasRequiredFieldError = !editedToken.displayName || !editedToken.resolvedValueTypeId;

  // Check for duplicate taxonomy assignments
  function taxonomySet(arr: TokenTaxonomyRef[]) {
    return new Set(arr.map(ref => `${ref.taxonomyId}:${ref.termId}`));
  }
  const currentTaxonomySet = taxonomySet(taxonomyEdits);
  const duplicateTaxonomyToken = tokens.find(t =>
    t.id !== editedToken.id &&
    Array.isArray(t.taxonomies) &&
    t.taxonomies.length === taxonomyEdits.length &&
    taxonomySet(t.taxonomies).size === currentTaxonomySet.size &&
    Array.from(currentTaxonomySet).every(pair => taxonomySet(t.taxonomies).has(pair))
  );
  const hasDuplicateTaxonomy = !!duplicateTaxonomyToken;

  const hasError = hasTaxonomyError || hasRequiredFieldError || hasDuplicateTaxonomy;

  const handleStatusChange = (newStatus: TokenStatus) => {
    setEditedToken((prev: ExtendedToken) => ({
      ...prev,
      status: newStatus
    }));
  };

  return (
    <Modal isOpen={open} onClose={onClose} isCentered size="xl">
      <ModalOverlay />
      <ModalContent maxW="900px">
        <ModalHeader>
          {isNew ? 'Create Token' : `Edit Token: ${editedToken.displayName}`}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack gap={4} align="stretch">
            <Box
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <VStack gap={3} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Display Name</FormLabel>
                  <Input
                    value={editedToken.displayName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedToken((prev: ExtendedToken) => ({ ...prev, displayName: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Input
                    value={editedToken.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedToken((prev: ExtendedToken) => ({ ...prev, description: e.target.value }))}
                  />
                </FormControl>

                <Flex direction="row" gap={6} align="flex-start">
                  <FormControl isRequired>
                    <FormLabel>Value Type</FormLabel>
                    <Select
                      value={editedToken.resolvedValueTypeId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const newType = e.target.value;
                        setEditedToken((prev: ExtendedToken) => ({
                          ...prev,
                          resolvedValueTypeId: newType,
                          valuesByMode: [{ modeIds: [], value: getDefaultTokenValue(newType, schema) }]
                        }));
                      }}
                    >
                      {resolvedValueTypes.map((vt: ResolvedValueType) => (
                        <option key={vt.id} value={vt.id}>
                          {vt.type ? `${vt.displayName} (${vt.type})` : `${vt.displayName} (custom)`}
                        </option>
                      ))}
                    </Select>
                    {editedToken.resolvedValueTypeId && (
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        {resolvedValueTypes.find((vt: ResolvedValueType) => vt.id === editedToken.resolvedValueTypeId)?.description}
                      </Text>
                    )}
                  </FormControl>
                  <FormControl>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={editedToken.status || ''}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusChange(e.target.value as TokenStatus)}
                    >
                      <option value="">None</option>
                      <option value="experimental">Experimental</option>
                      <option value="stable">Stable</option>
                      <option value="deprecated">Deprecated</option>
                    </Select>
                  </FormControl>
                  <VStack mt={2} spacing={3} align="stretch" flex={1}>
                    <Checkbox
                      isChecked={editedToken.private}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedToken((prev: ExtendedToken) => ({ ...prev, private: e.target.checked }))}
                    >
                      Private
                    </Checkbox>
                    <Checkbox
                      isChecked={!!editedToken.themeable}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedToken((prev: ExtendedToken) => ({ ...prev, themeable: e.target.checked }))}
                    >
                      Themeable
                    </Checkbox>
                  </VStack>
                </Flex>
              </VStack>
            </Box>

            {/* Classification */}
            <Text fontSize="lg" fontWeight="bold" mb={2}>Classification</Text>
            <Box
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <Flex direction="row" gap={6} align="flex-start">
                <Box flex={1} minW={0}>
                  <FormControl isRequired mb={3}>
                    <FormLabel>
                      Taxonomies <Box as="span" color="red.500" aria-label="required">*</Box>
                    </FormLabel>
                    <TaxonomyPicker
                      taxonomies={filteredTaxonomies}
                      value={taxonomyEdits}
                      onChange={handleTaxonomyChange}
                      disabled={filteredTaxonomies.length === 0}
                      onViewClassifications={onViewClassifications}
                    />
                    {filteredTaxonomies.length === 0 && (
                      <Alert status="warning" mt={2}>
                        <AlertIcon />
                        No taxonomies available for this value type. Please select a different value type or add taxonomies for this type.
                      </Alert>
                    )}
                    {hasDuplicateTaxonomy && (
                      <Alert status="error" mt={2}>
                        <AlertIcon />
                        Another token already uses this exact set of taxonomy assignments. Please choose a unique combination.
                      </Alert>
                    )}
                  </FormControl>
                </Box>
                {/* Generated names by platform (right column) */}
                <Box flex={1} minW={0}>
                  {hasTaxonomyError && (
                    <Alert status="error" mb={2}>
                      <AlertIcon />
                      You must apply taxonomies to this token before a platform name can be generated.
                    </Alert>
                  )}
                  <Text fontSize="sm" fontWeight="medium" mb={1}>Generated names per platform</Text>
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Platform</Th>
                        <Th>Name</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {platforms.map(platform => {
                        const syntaxEntry = codeSyntaxArray.find(cs => cs.platformId === platform.id);
                        return (
                          <Tr key={platform.id}>
                            <Td>{platform.displayName}</Td>
                            <Td>
                              <Text fontFamily="mono" fontSize="sm">
                                {syntaxEntry?.formattedName || '—'}
                              </Text>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              </Flex>
            </Box>

            {/* Values */}
            <Text fontSize="lg" fontWeight="bold" mb={2}>Values</Text>
            <Box
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <VStack gap={3}>
                <HStack gap={4} align="center">
                  <Text fontSize="sm" fontWeight="medium">Dimensions</Text>
                  {dimensions.map(dim => (
                    <Checkbox
                      key={dim.id}
                      isChecked={activeDimensionIds.includes(dim.id)}
                      onChange={() => handleToggleDimension(dim.id)}
                    >
                      {dim.displayName}
                    </Checkbox>
                  ))}
                </HStack>
                {activeDimensionIds.length === 0 ? (
                  (() => {
                    const globalValue = editedToken.valuesByMode.find((vbm: ValueByMode) => Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0);
                    if (!globalValue) {
                      return (
                        <Button
                          variant="outline"
                          onClick={() => setEditedToken((prev: ExtendedToken) => ({
                            ...prev,
                            valuesByMode: [
                              ...prev.valuesByMode,
                              { modeIds: [], value: getDefaultTokenValue(prev.resolvedValueTypeId, schema) }
                            ]
                          }))}
                        >
                          Add Value
                        </Button>
                      );
                    }
                    return (
                      <HStack gap={2}>
                        <TokenValuePicker
                          value={globalValue.value}
                          tokens={tokens}
                          excludeTokenId={editedToken.id}
                          modes={[]}
                          resolvedValueTypeId={editedToken.resolvedValueTypeId}
                          resolvedValueTypes={resolvedValueTypes}
                          onChange={(newValue: TokenValue) => setEditedToken((prev: ExtendedToken) => ({
                            ...prev,
                            valuesByMode: prev.valuesByMode.map((item: ValueByMode) =>
                              Array.isArray(item.modeIds) && item.modeIds.length === 0
                                ? { ...item, value: newValue }
                                : item
                            )
                          }))}
                        />
                        <IconButton
                          aria-label="Remove value"
                          icon={<Trash2 />}
                          onClick={() => setEditedToken((prev: ExtendedToken) => ({
                            ...prev,
                            valuesByMode: prev.valuesByMode.filter(vbm => !(Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0))
                          }))}
                        />
                      </HStack>
                    );
                  })()
                ) : (
                  <ValueByModeTable
                    valuesByMode={editedToken.valuesByMode}
                    modes={modes}
                    getValueEditor={getValueEditor}
                  />
                )}
                {/* Platform Overrides as a nested box */}
                <Text fontSize="md" fontWeight="bold" mb={2} mt={4}>Platform overrides</Text>
                <Box
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                  <PlatformOverridesTable
                    platforms={platforms}
                    valuesByMode={editedToken.valuesByMode}
                    modes={modes}
                    getValueEditor={getValueEditor}
                    onPlatformOverrideChange={(platformId: string, modeIndex: number, newValue: TokenValue) => {
                      setEditedToken((prev: ExtendedToken) => ({
                        ...prev,
                        valuesByMode: prev.valuesByMode.map((item: ValueByMode, i: number) =>
                          i === modeIndex
                            ? {
                                ...item,
                                platformOverrides: [
                                  ...(item.platformOverrides || []).filter((p) => p.platformId !== platformId),
                                  {
                                    platformId,
                                    value: typeof newValue === 'string' ? newValue : JSON.stringify(newValue)
                                  }
                                ]
                              }
                            : item
                        )
                      }));
                    }}
                  />
                  {editedToken.valuesByMode.every((vbm: ValueByMode) => !vbm.platformOverrides || vbm.platformOverrides.length === 0) && (
                    <Button variant="outline" mt={2}>
                      Add override
                    </Button>
                  )}
                </Box>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave} disabled={hasError}>
            {isNew ? 'Create token' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 