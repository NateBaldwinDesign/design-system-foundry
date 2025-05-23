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
  Stack,
  Flex,
  TableContainer,
  useColorMode,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td
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
  /**
   * Optional callback to navigate to the Classifications tab in the parent view.
   */
  onViewClassifications?: () => void;
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

export function TokenEditorDialog({ token, tokens, dimensions, modes, platforms, open, onClose, onSave, taxonomies, resolvedValueTypes, isNew = false, onViewClassifications }: TokenEditorDialogProps) {
  console.log('[TokenEditorDialog] onViewClassifications prop:', typeof onViewClassifications, onViewClassifications);
  const { schema } = useSchema();
  const preservedValuesByRemovedDimension = useRef<Record<string, Record<string, TokenValue>>>({});
  const [editedToken, setEditedToken] = useState<ExtendedToken & { constraints?: any[]; themeable?: boolean }>(() => {
    if (isNew) {
      return {
        ...token,
        id: createUniqueId('token'),
        themeable: token.themeable ?? false,
      };
    }
    return { ...token, themeable: token.themeable ?? false };
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

  const { colorMode } = useColorMode();

  // Constraints state
  const [constraints, setConstraints] = useState(() => Array.isArray(token.constraints) ? token.constraints : []);

  // Constraint editing state
  const [newConstraint, setNewConstraint] = useState({
    type: 'contrast',
    rule: {
      minimum: 3,
      comparator: { type: 'COLOR', value: '#ffffff', method: 'WCAG21' },
      method: 'WCAG21',
    }
  });

  useEffect(() => {
    setEditedToken({
      ...token,
      themeable: token.themeable ?? false,
    });
    setTaxonomyEdits(Array.isArray(token.taxonomies) ? token.taxonomies : []);
    setConstraints(Array.isArray(token.constraints) ? token.constraints : []);
  }, [token, open]);

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

  useEffect(() => {
    if (open) {
      setConstraints(Array.isArray(token.constraints) ? token.constraints : []);
    }
  }, [open, token]);

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

  const handleAddConstraint = () => {
    setConstraints(prev => [...prev, JSON.parse(JSON.stringify(newConstraint))]);
    setNewConstraint({
      type: 'contrast',
      rule: {
        minimum: 3,
        comparator: { type: 'COLOR', value: '#ffffff', method: 'WCAG21' },
        method: 'WCAG21',
      }
    });
  };

  const handleRemoveConstraint = (idx: number) => {
    setConstraints(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConstraintChange = (idx: number, field: string, value: any) => {
    setConstraints(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      if (field === 'minimum') {
        return { ...c, rule: { ...c.rule, minimum: Number(value) } };
      }
      if (field === 'comparator') {
        return { ...c, rule: { ...c.rule, comparator: value } };
      }
      if (field === 'method') {
        return { ...c, rule: { ...c.rule, comparator: { ...c.rule.comparator, method: value }, method: value } };
      }
      return c;
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...editedToken, taxonomies: taxonomyEdits, constraints });
    onClose();
  };

  function handleTaxonomyChange(newTaxonomies: any[]) {
    setTaxonomyEdits(newTaxonomies);
  }

  return (
    <Modal isOpen={open} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="900px">
        <ModalHeader>
          {isNew ? 'Create Token' : 'Edit Token'}
          <Text fontSize="xs" color="gray.500" mt={1} fontFamily="mono" wordBreak="break-all">
            {editedToken.id}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Basic Information */}
            <Text fontSize="lg" fontWeight="bold" mb={2}>Basic Information</Text>
            <Box
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <VStack spacing={3} align="stretch">
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
                {/* Taxonomy (left column) */}
                <Box flex={1} minW={0}>
                  <FormControl mb={3}>
                    <TaxonomyPicker
                      taxonomies={Array.isArray(taxonomies) ? taxonomies : []}
                      value={taxonomyEdits}
                      onChange={handleTaxonomyChange}
                      disabled={!Array.isArray(taxonomies) || taxonomies.length === 0}
                      onViewClassifications={onViewClassifications}
                    />
                  </FormControl>
                </Box>
                {/* Generated names by platform (right column) */}
                <Box flex={1} minW={0}>
                  <Text fontSize="sm" fontWeight="medium" mb={1}>Generated names per platform</Text>
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Platform</Th>
                        <Th>Name</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {Object.entries(codeSyntax).map(([platform, name]) => (
                        <Tr key={platform}>
                          <Td>{platform}</Td>
                          <Td><Text fontFamily="mono">{name}</Text></Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              </Flex>
            </Box>

            {/* Settings */}
            <Text fontSize="lg" fontWeight="bold" mb={2}>Settings</Text>
            <Box
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <Flex direction="row" gap={6} align="flex-start">
                {/* ValueType + Status (left column) */}
                <VStack spacing={3} align="stretch" flex={1}>
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
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={editedToken.status || ''}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditedToken(prev => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="">None</option>
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="deprecated">Deprecated</option>
                    </Select>
                  </FormControl>
                </VStack>
                {/* Private + Themeable (right column) */}
                <VStack spacing={3} align="stretch" flex={1}>
                  <Checkbox
                    isChecked={editedToken.private}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedToken(prev => ({ ...prev, private: e.target.checked }))}
                  >
                    Private
                  </Checkbox>
                  <Checkbox
                    isChecked={!!editedToken.themeable}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedToken(prev => ({ ...prev, themeable: e.target.checked }))}
                  >
                    Themeable
                  </Checkbox>
                </VStack>
              </Flex>
            </Box>

            {/* Constraints */}
            <Text fontSize="lg" fontWeight="bold" mb={2}>Constraints</Text>
            <Box
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <VStack spacing={3} align="stretch">
                {constraints.length === 0 && <Text color="gray.500">No constraints added.</Text>}
                {constraints.map((constraint, idx) => (
                  <HStack key={idx} spacing={3} align="center">
                    <Text fontWeight="medium">Contrast</Text>
                    <FormControl w="120px">
                      <FormLabel fontSize="xs" mb={0}>Minimum</FormLabel>
                      <Input
                        type="number"
                        value={constraint.rule.minimum}
                        min={0}
                        step={0.1}
                        onChange={e => handleConstraintChange(idx, 'minimum', e.target.value)}
                        size="sm"
                      />
                    </FormControl>
                    <FormControl w="160px">
                      <FormLabel fontSize="xs" mb={0}>Comparator Color</FormLabel>
                      <TokenValuePicker
                        resolvedValueType="COLOR"
                        value={constraint.rule.comparator}
                        tokens={tokens}
                        onChange={newValue => handleConstraintChange(idx, 'comparator', newValue)}
                        excludeTokenId={editedToken.id}
                      />
                    </FormControl>
                    <FormControl w="120px">
                      <FormLabel fontSize="xs" mb={0}>Method</FormLabel>
                      <Select
                        value={constraint.rule.comparator.method || constraint.rule.method || 'WCAG21'}
                        onChange={e => handleConstraintChange(idx, 'method', e.target.value)}
                        size="sm"
                      >
                        <option value="WCAG21">WCAG21</option>
                        <option value="APCA">APCA</option>
                        <option value="Lstar">Lstar</option>
                      </Select>
                    </FormControl>
                    <IconButton
                      aria-label="Remove constraint"
                      icon={<DeleteIcon />}
                      size="sm"
                      colorScheme="red"
                      onClick={() => handleRemoveConstraint(idx)}
                    />
                  </HStack>
                ))}
                <HStack spacing={3} align="center" mt={2}>
                  <Button size="sm" onClick={handleAddConstraint} colorScheme="blue">
                    Add Constraint
                  </Button>
                  <FormControl w="120px">
                    <FormLabel fontSize="xs" mb={0}>Minimum</FormLabel>
                    <Input
                      type="number"
                      value={newConstraint.rule.minimum}
                      min={0}
                      step={0.1}
                      onChange={e => setNewConstraint(nc => ({
                        ...nc,
                        rule: { ...nc.rule, minimum: Number(e.target.value) }
                      }))}
                      size="sm"
                    />
                  </FormControl>
                  <FormControl w="160px">
                    <FormLabel fontSize="xs" mb={0}>Comparator Color</FormLabel>
                    <TokenValuePicker
                      resolvedValueType="COLOR"
                      value={newConstraint.rule.comparator}
                      tokens={tokens}
                      onChange={newValue => setNewConstraint(nc => ({
                        ...nc,
                        rule: { ...nc.rule, comparator: newValue }
                      }))}
                      excludeTokenId={editedToken.id}
                    />
                  </FormControl>
                  <FormControl w="120px">
                    <FormLabel fontSize="xs" mb={0}>Method</FormLabel>
                    <Select
                      value={newConstraint.rule.comparator.method || newConstraint.rule.method || 'WCAG21'}
                      onChange={e => setNewConstraint(nc => ({
                        ...nc,
                        rule: {
                          ...nc.rule,
                          comparator: { ...nc.rule.comparator, method: e.target.value },
                          method: e.target.value
                        }
                      }))}
                      size="sm"
                    >
                      <option value="WCAG21">WCAG21</option>
                      <option value="APCA">APCA</option>
                      <option value="Lstar">Lstar</option>
                    </Select>
                  </FormControl>
                </HStack>
              </VStack>
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