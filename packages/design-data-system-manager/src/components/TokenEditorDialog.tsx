import { useState, useEffect, useRef, useMemo } from 'react';
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
  useDisclosure,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer
} from '@chakra-ui/react';
import { DeleteIcon } from '@chakra-ui/icons';
import { ValueByModeTable } from './ValueByModeTable';
import { PlatformOverridesTable } from './PlatformOverridesTable';
import { TokenValuePicker } from './TokenValuePicker';
import { TaxonomyPicker } from './TaxonomyPicker';
import type { Token, TokenCollection, Mode, TokenValue, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import { createUniqueId } from '../utils/id';
import { useSchema } from '../hooks/useSchema';
import { CodeSyntaxService } from '../services/codeSyntax';

// Extend the Token type to include themeable
export type ExtendedToken = Token & { themeable?: boolean; codeSyntax?: Record<string, string> };

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
  resolvedValueTypes: { id: string; displayName: string }[];
  isNew?: boolean;
}

// Helper: get all mode combinations for selected dimensions
function cartesianProduct(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (a, b) => a.flatMap(d => b.map(e => [...d, e])),
    [[]]
  );
}

// Helper: get a valid default TokenValue for a given type
function getDefaultTokenValue(type: string): TokenValue {
  switch (type) {
    case 'COLOR':
      return { type: 'COLOR', value: '#000000' };
    case 'FLOAT':
      return { type: 'FLOAT', value: 0 };
    case 'INTEGER':
      return { type: 'INTEGER', value: 0 };
    case 'STRING':
      return { type: 'STRING', value: '' };
    case 'BOOLEAN':
      return { type: 'BOOLEAN', value: false };
    case 'ALIAS':
      return { type: 'ALIAS', tokenId: '' };
    default:
      return { type: 'STRING', value: '' };
  }
}

export function TokenEditorDialog({ token, tokens, dimensions, modes, platforms, open, onClose, onSave, taxonomies, resolvedValueTypes, isNew = false }: TokenEditorDialogProps) {
  const { schema } = useSchema();
  const preservedValuesByRemovedDimension = useRef<Record<string, Record<string, TokenValue>>>({});
  const [editedToken, setEditedToken] = useState<ExtendedToken & { constraints?: any[] }>(() => {
    if (isNew) {
      return {
        ...token,
        id: createUniqueId('token')
      };
    }
    return token;
  });

  const schemaForSyntax = {
    ...schema,
    taxonomies: taxonomies ?? (schema as any).taxonomies
  };

  // Local state for taxonomy edits (not applied to editedToken until save)
  const [taxonomyEdits, setTaxonomyEdits] = useState<any[]>(() =>
    Array.isArray(token.taxonomies) ? token.taxonomies : []
  );
  
  const codeSyntax = useMemo(() => {
    const tokenForSyntax = { ...token, ...editedToken, taxonomies: taxonomyEdits };
    return CodeSyntaxService.generateAllCodeSyntaxes(tokenForSyntax, schemaForSyntax);
  }, [token, editedToken, taxonomyEdits, schemaForSyntax]);

  // Track which dimensions are active for this token
  const [activeDimensionIds, setActiveDimensionIds] = useState<string[]>([]);

  useEffect(() => {
    if (open && isNew) {
      setEditedToken({
        ...token,
        id: createUniqueId('token')
      });
    } else if (open && !isNew) {
      setEditedToken(token);
    }
  }, [open, isNew, token]);

  useEffect(() => {
    // Initialize active dimensions from current valuesByMode
    if (token.valuesByMode && token.valuesByMode.length > 0) {
      // Find all dimension IDs present in modeIds
      const allModeIds = token.valuesByMode.flatMap(v => v.modeIds);
      const presentDims = dimensions.filter(dim =>
        dim.modes.some(mode => allModeIds.includes(mode.id))
      ).map(dim => dim.id);
      setActiveDimensionIds(presentDims);
    } else {
      setActiveDimensionIds([]);
    }
  }, [token, open, dimensions]);

  // When dimensions or their modes change, update valuesByMode to reflect new/removed modes
  useEffect(() => {
    if (!open) return;
    if (activeDimensionIds.length === 0) return;
    const activeDims = dimensions.filter(d => activeDimensionIds.includes(d.id));
    const modeArrays = activeDims.map(d => d.modes.map(m => m.id));
    const combos = modeArrays.length > 0 ? cartesianProduct(modeArrays) : [[]];
    setEditedToken(prev => {
      const prevMap = new Map(prev.valuesByMode.map(vbm => [vbm.modeIds.slice().sort().join(','), vbm.value]));
      const newValuesByMode = combos.map(modeIds => {
        const key = modeIds.slice().sort().join(',');
        if (prevMap.has(key)) {
          const val = prevMap.get(key);
          return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueType) };
        }
        for (let i = 0; i < modeIds.length; i++) {
          const parentIds = modeIds.slice(0, i).concat(modeIds.slice(i + 1));
          const parentKey = parentIds.slice().sort().join(',');
          if (prevMap.has(parentKey)) {
            const val = prevMap.get(parentKey);
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueType) };
          }
        }
        return { modeIds, value: getDefaultTokenValue(prev.resolvedValueType) };
      });
      return {
        ...prev,
        valuesByMode: newValuesByMode
      };
    });
  }, [dimensions, activeDimensionIds, open]);

  // Add or remove a dimension from the token
  const handleToggleDimension = (dimensionId: string) => {
    const isActive = activeDimensionIds.includes(dimensionId);
    let newActiveDims: string[];
    if (isActive) {
      const dim = dimensions.find(d => d.id === dimensionId);
      if (!dim) return;
      newActiveDims = activeDimensionIds.filter(id => id !== dimensionId);
      const defaultModeId = dim.defaultMode;
      const remainingDims = dimensions.filter(d => newActiveDims.includes(d.id));
      const modeArrays = remainingDims.map(d => d.modes.map(m => m.id));
      const combos = modeArrays.length > 0 ? cartesianProduct(modeArrays) : [[]];
      setEditedToken(prev => {
        // Preserve all values that include the removed dimension
        const removedMap: Record<string, TokenValue> = {};
        prev.valuesByMode.forEach(vbm => {
          if (vbm.modeIds.includes(defaultModeId) || dim.modes.some(m => vbm.modeIds.includes(m.id))) {
            const key = vbm.modeIds.slice().sort().join(',');
            removedMap[key] = vbm.value;
          }
        });
        preservedValuesByRemovedDimension.current[dimensionId] = removedMap;
        const prevMap = new Map(prev.valuesByMode.map(vbm => [vbm.modeIds.slice().sort().join(','), vbm.value]));
        const newValuesByMode = combos.map(modeIds => {
          const key = modeIds.slice().sort().join(',');
          if (prevMap.has(key)) {
            const val = prevMap.get(key);
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueType) };
          }
          // Find all previous combos that are a superset of modeIds (i.e., modeIds + one from removed dimension)
          const candidates = prev.valuesByMode.filter(vbm =>
            vbm.modeIds.length === modeIds.length + 1 &&
            modeIds.every(id => vbm.modeIds.includes(id))
          );
          let found = candidates.find(vbm => vbm.modeIds.includes(defaultModeId));
          if (!found && candidates.length > 0) found = candidates[0];
          if (found) {
            return { modeIds, value: found.value };
          }
          return { modeIds, value: getDefaultTokenValue(prev.resolvedValueType) };
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
      const modeArrays = activeDims.map(d => d.modes.map(m => m.id));
      const combos = cartesianProduct(modeArrays);
      setEditedToken(prev => {
        const prevMap = new Map(prev.valuesByMode.map(vbm => [vbm.modeIds.slice().sort().join(','), vbm.value]));
        // Try to restore from preserved values if available
        const preserved = preservedValuesByRemovedDimension.current[dimensionId] || {};
        const newValuesByMode = combos.map(modeIds => {
          const key = modeIds.slice().sort().join(',');
          if (prevMap.has(key)) {
            const val = prevMap.get(key);
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueType) };
          }
          // Try to restore from preserved
          if (preserved[key]) {
            return { modeIds, value: preserved[key] };
          }
          // Try to find a parent combo (same as before)
          for (let i = 0; i < modeIds.length; i++) {
            const parentIds = modeIds.slice(0, i).concat(modeIds.slice(i + 1));
            const parentKey = parentIds.slice().sort().join(',');
            if (prevMap.has(parentKey)) {
              const val = prevMap.get(parentKey);
              return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueType) };
            }
          }
          return { modeIds, value: getDefaultTokenValue(prev.resolvedValueType) };
        });
        return {
          ...prev,
          valuesByMode: newValuesByMode
        };
      });
    }
    setActiveDimensionIds(newActiveDims);
  };

  const getValueEditor = (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => {
    if (typeof value === 'string') {
      return <Text fontSize="sm" color="gray.500">{value}</Text>;
    }

    return (
      <TokenValuePicker
        resolvedValueType={editedToken.resolvedValueType}
        value={value}
        tokens={tokens}
        constraints={(editedToken as any).constraints ?? []}
        excludeTokenId={editedToken.id}
        onChange={newValue => {
          if (onChange) {
            onChange(newValue);
          } else {
            setEditedToken(prev => ({
              ...prev,
              valuesByMode: prev.valuesByMode.map((item, i) =>
                i === modeIndex ? { ...item, value: newValue } : item
              )
            }));
          }
        }}
      />
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...editedToken, taxonomies: taxonomyEdits });
  };

  function handleTaxonomyChange(newTaxonomies: any[]) {
    setTaxonomyEdits(newTaxonomies);
  }

  return (
    <Modal isOpen={open} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {isNew ? 'Create Token' : 'Edit Token'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Basic Information */}
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2}>Basic Information</Text>
              <VStack spacing={3}>
                <FormControl>
                  <FormLabel>Display Name</FormLabel>
                  <Input
                    value={editedToken.displayName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedToken(prev => ({ ...prev, displayName: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Input
                    value={editedToken.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedToken(prev => ({ ...prev, description: e.target.value }))}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Value Type</FormLabel>
                  <Select
                    value={editedToken.resolvedValueType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const newType = e.target.value;
                      setEditedToken(prev => ({
                        ...prev,
                        resolvedValueType: newType,
                        valuesByMode: [{ modeIds: [], value: getDefaultTokenValue(newType) }]
                      }));
                    }}
                  >
                    {resolvedValueTypes.map(vt => (
                      <option key={vt.id} value={vt.id}>{vt.displayName}</option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <Checkbox
                    isChecked={editedToken.private}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedToken(prev => ({ ...prev, private: e.target.checked }))}
                  >
                    Private
                  </Checkbox>
                </FormControl>
              </VStack>
            </Box>

            {/* Classification */}
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2}>Classification</Text>
              <VStack spacing={3}>
                <FormControl>
                  <FormLabel>Taxonomy</FormLabel>
                  <TaxonomyPicker
                    taxonomies={Array.isArray(taxonomies) ? taxonomies : []}
                    value={taxonomyEdits}
                    onChange={handleTaxonomyChange}
                    disabled={!Array.isArray(taxonomies) || taxonomies.length === 0}
                  />
                </FormControl>
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>Generated names per platform</Text>
                  <VStack align="stretch" spacing={1}>
                    {Object.entries(codeSyntax).map(([platform, name]) => (
                      <HStack key={platform} spacing={2}>
                        <Text fontSize="sm" minW="80px">{platform}</Text>
                        <Text fontSize="sm">{name}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </Box>

            {/* Values */}
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2}>Values</Text>
              <VStack spacing={3}>
                <HStack spacing={4} align="center">
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
                    const globalValue = editedToken.valuesByMode.find(vbm => Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0);
                    if (!globalValue) {
                      return (
                        <Button
                          variant="outline"
                          onClick={() => setEditedToken(prev => ({
                            ...prev,
                            valuesByMode: [
                              ...prev.valuesByMode,
                              { modeIds: [], value: getDefaultTokenValue(prev.resolvedValueType) }
                            ]
                          }))}
                        >
                          Add Value
                        </Button>
                      );
                    }
                    return (
                      <HStack spacing={2}>
                        <TokenValuePicker
                          resolvedValueType={editedToken.resolvedValueType}
                          value={globalValue.value}
                          tokens={tokens}
                          constraints={(editedToken as any).constraints ?? []}
                          excludeTokenId={editedToken.id}
                          onChange={newValue => setEditedToken(prev => ({
                            ...prev,
                            valuesByMode: prev.valuesByMode.map(vbm =>
                              Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0
                                ? { ...vbm, value: newValue }
                                : vbm
                            )
                          }))}
                        />
                        <IconButton
                          aria-label="Remove value"
                          icon={<DeleteIcon />}
                          onClick={() => setEditedToken(prev => ({
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
                    editable={true}
                    onValueChange={(modeIndex, newValue) => setEditedToken(prev => ({
                      ...prev,
                      valuesByMode: prev.valuesByMode.map((item, i) =>
                        i === modeIndex ? { ...item, value: newValue } : item
                      )
                    }))}
                    getValueEditor={getValueEditor}
                    resolvedValueType={editedToken.resolvedValueType}
                    tokens={tokens}
                    constraints={(editedToken as any).constraints ?? []}
                    excludeTokenId={editedToken.id}
                  />
                )}
              </VStack>
            </Box>

            {/* Platform Overrides */}
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2}>Platform overrides</Text>
              <PlatformOverridesTable
                platforms={platforms}
                valuesByMode={editedToken.valuesByMode}
                modes={modes}
                getValueEditor={getValueEditor}
                onPlatformOverrideChange={(platformId, modeIndex, newValue) => {
                  setEditedToken(prev => ({
                    ...prev,
                    valuesByMode: prev.valuesByMode.map((item, i) =>
                      i === modeIndex
                        ? {
                            ...item,
                            platformOverrides: [
                              ...(item.platformOverrides || []).filter(p => p.platformId !== platformId),
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
                resolvedValueType={editedToken.resolvedValueType}
                tokens={tokens}
                constraints={(editedToken as any).constraints ?? []}
                excludeTokenId={editedToken.id}
              />
              {editedToken.valuesByMode.every(vbm => !vbm.platformOverrides || vbm.platformOverrides.length === 0) && (
                <Button variant="outline" mt={2}>
                  Add override
                </Button>
              )}
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave}>
            {isNew ? 'Create token' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 