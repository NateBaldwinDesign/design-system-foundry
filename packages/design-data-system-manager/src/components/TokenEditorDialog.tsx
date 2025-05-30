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
import type { Token, Mode, Dimension, Platform, TokenStatus, TokenTaxonomyRef } from '@token-model/data-model';
import { createUniqueId } from '../utils/id';
import { useSchema } from '../hooks/useSchema';
import { CodeSyntaxService, ensureCodeSyntaxArrayFormat } from '../services/codeSyntax';
import type { TokenValue } from '@token-model/data-model';

// Constraint type matches schema: only 'contrast' type for now
interface Constraint {
  type: 'contrast';
  resolvedValueTypeId: string; // e.g. 'contrast'
  rule: {
    minimum: number;
    comparator: {
      resolvedValueTypeId: string;
      value: string;
      method: 'WCAG21' | 'APCA' | 'Lstar';
    };
  };
}

// Redefine ExtendedToken to override valuesByMode and resolvedValueTypeId
export type ExtendedToken = Omit<Token, 'valuesByMode' | 'resolvedValueTypeId'> & {
  valuesByMode: ValueByMode[];
  resolvedValueTypeId: string; // string id, not enum
  constraints?: Constraint[];
};

// Helper function to get a default token value
function getDefaultTokenValue(resolvedValueTypeId: string): TokenValue {
  switch (resolvedValueTypeId) {
    case 'color':
      return { type: 'COLOR', value: '#000000' };
    case 'dimension':
      return { type: 'DIMENSION', value: 0 };
    case 'spacing':
      return { type: 'SPACING', value: 0 };
    case 'font-family':
      return { type: 'FONT_FAMILY', value: '' };
    case 'font-weight':
      return { type: 'FONT_WEIGHT', value: 400 };
    case 'font-size':
      return { type: 'FONT_SIZE', value: 16 };
    case 'line-height':
      return { type: 'LINE_HEIGHT', value: 1 };
    case 'letter-spacing':
      return { type: 'LETTER_SPACING', value: 0 };
    case 'duration':
      return { type: 'DURATION', value: 0 };
    case 'cubic-bezier':
      return { type: 'CUBIC_BEZIER', value: '0, 0, 1, 1' };
    case 'blur':
      return { type: 'BLUR', value: 0 };
    case 'spread':
      return { type: 'SPREAD', value: 0 };
    case 'radius':
      return { type: 'RADIUS', value: 0 };
    case 'alias':
      return { type: 'ALIAS', tokenId: '' };
    default:
      // Fallback to color for unknown types
      return { type: 'COLOR', value: '#000000' };
  }
}

// Helper function to find a resolvedValueType by display name pattern
function findResolvedValueTypeByDisplayName(resolvedValueTypes: ResolvedValueTypeObj[], pattern: string): string | undefined {
  const typeObj = resolvedValueTypes.find((vt) => vt.displayName?.toLowerCase().includes(pattern.toLowerCase()));
  return typeObj?.id;
}

// Helper function to create a new constraint
function createNewConstraint(resolvedValueTypes: ResolvedValueTypeObj[]): Constraint {
  const contrastTypeId = findResolvedValueTypeByDisplayName(resolvedValueTypes, 'contrast');
  const colorTypeId = findResolvedValueTypeByDisplayName(resolvedValueTypes, 'color');
  
  if (!contrastTypeId || !colorTypeId) {
    // Instead of throwing an error, create a default constraint with the first available types
    const firstTypeId = resolvedValueTypes[0]?.id;
    if (!firstTypeId) {
      throw new Error('No resolved value types available');
    }
    return {
      type: 'contrast',
      resolvedValueTypeId: firstTypeId,
      rule: {
        minimum: 3,
        comparator: { 
          resolvedValueTypeId: firstTypeId, 
          value: '#ffffff', 
          method: 'WCAG21' 
        }
      }
    };
  }

  return {
    type: 'contrast',
    resolvedValueTypeId: contrastTypeId,
    rule: {
      minimum: 3,
      comparator: { 
        resolvedValueTypeId: colorTypeId, 
        value: '#ffffff', 
        method: 'WCAG21' 
      }
    }
  };
}

interface Taxonomy {
  id: string;
  name: string;
  description: string;
  terms: { id: string; name: string; description?: string }[];
}

interface ResolvedValueTypeObj {
  id: string;
  displayName: string;
  type?: string;
  description?: string;
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
  resolvedValueTypes: ResolvedValueTypeObj[];
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

// Update migrateToTokenValue to convert legacy type-based values to canonical format
function migrateToTokenValue(val: unknown): TokenValue {
  if (val && typeof val === 'object') {
    if ('type' in val) {
      // Already canonical
      return val as TokenValue;
    }
    if ('resolvedValueTypeId' in val) {
      const legacyVal = val as { resolvedValueTypeId: string; value?: unknown; tokenId?: string };
      if (legacyVal.resolvedValueTypeId === 'alias') {
        return { type: 'ALIAS', tokenId: String(legacyVal.tokenId ?? '') };
      }
      switch (legacyVal.resolvedValueTypeId) {
        case 'color': return { type: 'COLOR', value: String(legacyVal.value ?? '') };
        case 'dimension': return { type: 'DIMENSION', value: Number(legacyVal.value ?? 0) };
        case 'spacing': return { type: 'SPACING', value: Number(legacyVal.value ?? 0) };
        case 'font-family': return { type: 'FONT_FAMILY', value: String(legacyVal.value ?? '') };
        case 'font-weight': return { type: 'FONT_WEIGHT', value: Number(legacyVal.value ?? 0) };
        case 'font-size': return { type: 'FONT_SIZE', value: Number(legacyVal.value ?? 0) };
        case 'line-height': return { type: 'LINE_HEIGHT', value: Number(legacyVal.value ?? 0) };
        case 'letter-spacing': return { type: 'LETTER_SPACING', value: Number(legacyVal.value ?? 0) };
        case 'duration': return { type: 'DURATION', value: Number(legacyVal.value ?? 0) };
        case 'cubic-bezier': return { type: 'CUBIC_BEZIER', value: String(legacyVal.value ?? '0, 0, 1, 1') };
        case 'blur': return { type: 'BLUR', value: Number(legacyVal.value ?? 0) };
        case 'spread': return { type: 'SPREAD', value: Number(legacyVal.value ?? 0) };
        case 'radius': return { type: 'RADIUS', value: Number(legacyVal.value ?? 0) };
        default: return { type: 'COLOR', value: String(legacyVal.value ?? '') };
      }
    }
  }
  // Fallback
  return { type: 'COLOR', value: String(val ?? '') };
}

// Update migrateTokenValuesByMode to handle both old and new formats
function migrateTokenValuesByMode(valuesByMode: unknown[]): { modeIds: string[]; value: TokenValue; metadata?: Record<string, unknown>; platformOverrides?: { platformId: string; value: string }[] }[] {
  return Array.isArray(valuesByMode)
    ? valuesByMode.map(vbm => {
        const valueByMode = vbm as { modeIds?: string[]; value: unknown; metadata?: Record<string, unknown>; platformOverrides?: { platformId: string; value: string }[] };
        const canonicalValue = migrateToTokenValue(valueByMode.value);
        // Type guard: only access .value for non-ALIAS
        if (canonicalValue.type === 'ALIAS') {
          return {
            modeIds: Array.isArray(valueByMode.modeIds) ? valueByMode.modeIds : [],
            value: { type: 'ALIAS', tokenId: canonicalValue.tokenId },
            metadata: valueByMode.metadata,
            platformOverrides: valueByMode.platformOverrides
          };
        } else {
          return {
            modeIds: Array.isArray(valueByMode.modeIds) ? valueByMode.modeIds : [],
            value: canonicalValue,
            metadata: valueByMode.metadata,
            platformOverrides: valueByMode.platformOverrides
          };
        }
      })
    : [];
}

// Update ValueByMode type to include platformOverrides
export interface ValueByMode {
  modeIds: string[];
  value: TokenValue;
  platformOverrides?: {
    platformId: string;
    value: string;
  }[];
  metadata?: Record<string, unknown>;
}

export { migrateTokenValuesByMode, migrateToTokenValue };

// Helper: convert schema-compliant TokenValue to legacy type-based TokenValue for canonical Token
function toLegacyTokenValue(val: TokenValue): TokenValue {
  switch (val.type) {
    case 'COLOR': return { type: 'COLOR', value: val.value };
    case 'DIMENSION': return { type: 'DIMENSION', value: val.value };
    case 'SPACING': return { type: 'SPACING', value: val.value };
    case 'FONT_FAMILY': return { type: 'FONT_FAMILY', value: val.value };
    case 'FONT_WEIGHT': return { type: 'FONT_WEIGHT', value: val.value };
    case 'FONT_SIZE': return { type: 'FONT_SIZE', value: val.value };
    case 'LINE_HEIGHT': return { type: 'LINE_HEIGHT', value: val.value };
    case 'LETTER_SPACING': return { type: 'LETTER_SPACING', value: val.value };
    case 'DURATION': return { type: 'DURATION', value: val.value };
    case 'CUBIC_BEZIER': return { type: 'CUBIC_BEZIER', value: val.value };
    case 'BLUR': return { type: 'BLUR', value: val.value };
    case 'SPREAD': return { type: 'SPREAD', value: val.value };
    case 'RADIUS': return { type: 'RADIUS', value: val.value };
    case 'ALIAS': return { type: 'ALIAS', tokenId: val.tokenId };
    default: return { type: 'COLOR', value: '' };
  }
}

// Helper: convert legacy type-based TokenValue to schema-compliant TokenValue
function toCanonicalTokenValue(val: TokenValue): TokenValue {
  return toLegacyTokenValue(val); // Already canonical
}

export function TokenEditorDialog({ token, tokens, dimensions, modes, platforms, open, onClose, onSave, taxonomies, resolvedValueTypes, isNew = false, onViewClassifications }: TokenEditorDialogProps) {
  const { schema } = useSchema();
  const preservedValuesByRemovedDimension = useRef<Record<string, Record<string, TokenValue>>>({});
  
  // Initialize internal state from parent state when dialog opens
  const [editedToken, setEditedToken] = useState<ExtendedToken>(() => {
    if (isNew) {
      return {
        ...token,
        id: createUniqueId('token'),
        themeable: token.themeable ?? false,
        resolvedValueTypeId: token.resolvedValueTypeId,
        valuesByMode: migrateTokenValuesByMode(token.valuesByMode),
      };
    }
    return {
      ...token,
      themeable: token.themeable ?? false,
      resolvedValueTypeId: token.resolvedValueTypeId,
      valuesByMode: migrateTokenValuesByMode(token.valuesByMode),
    };
  });

  // Local state for taxonomy edits (not applied to editedToken until save)
  const [taxonomyEdits, setTaxonomyEdits] = useState<TokenTaxonomyRef[]>(() =>
    Array.isArray(token.taxonomies) ? token.taxonomies : []
  );

  // Track which dimensions are active for this token
  const [activeDimensionIds, setActiveDimensionIds] = useState<string[]>([]);

  const { colorMode } = useColorMode();

  // Constraints state
  const [constraints, setConstraints] = useState<Constraint[]>(() => Array.isArray(token.constraints) ? token.constraints : []);

  // Reset internal state when dialog opens with new token
  useEffect(() => {
    console.log('[TokenEditorDialog] useEffect triggered - open:', open, 'token:', token);
    if (open) {
      setEditedToken({
        ...token,
        themeable: token.themeable ?? false,
        resolvedValueTypeId: token.resolvedValueTypeId,
        valuesByMode: migrateTokenValuesByMode(token.valuesByMode),
      });
      setTaxonomyEdits(Array.isArray(token.taxonomies) ? token.taxonomies : []);
      setConstraints(Array.isArray(token.constraints) ? token.constraints : []);
      setActiveDimensionIds(dimensions.filter(d => d.required).map(d => d.id));
    }
  }, [token, open, dimensions]);

  // Initialize active dimensions from current valuesByMode
  useEffect(() => {
    console.log('[TokenEditorDialog] Initializing active dimensions - token:', token);
    if (token.valuesByMode && token.valuesByMode.length > 0) {
      const allModeIds = token.valuesByMode.flatMap(vbm => vbm.modeIds);
      const presentDims = dimensions.filter(dim =>
        dim.modes.some((mode: Mode) => allModeIds.includes(mode.id))
      ).map(dim => dim.id);
      console.log('[TokenEditorDialog] Setting active dimensions:', presentDims);
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
    const modeArrays = activeDims.map(d => d.modes.map((m: Mode) => m.id));
    const combos = modeArrays.length > 0 ? cartesianProduct(modeArrays) : [[]];
    setEditedToken((prev: ExtendedToken) => {
      const prevMap = new Map(prev.valuesByMode.map((vbm: ValueByMode) => [vbm.modeIds.slice().sort().join(','), vbm.value]));
      const newValuesByMode = combos.map((modeIds: string[]) => {
        const key = modeIds.slice().sort().join(',');
        if (prevMap.has(key)) {
          const val = prevMap.get(key);
          return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueTypeId) };
        }
        for (let i = 0; i < modeIds.length; i++) {
          const parentIds = modeIds.slice(0, i).concat(modeIds.slice(i + 1));
          const parentKey = parentIds.slice().sort().join(',');
          if (prevMap.has(parentKey)) {
            const val = prevMap.get(parentKey);
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueTypeId) };
          }
        }
        return { modeIds, value: getDefaultTokenValue(prev.resolvedValueTypeId) };
      });
      return {
        ...prev,
        valuesByMode: migrateTokenValuesByMode(newValuesByMode)
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
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueTypeId) };
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
          return { modeIds, value: getDefaultTokenValue(prev.resolvedValueTypeId) };
        });
        return {
          ...prev,
          valuesByMode: migrateTokenValuesByMode(newValuesByMode)
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
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueTypeId) };
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
              return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(prev.resolvedValueTypeId) };
            }
          }
          return { modeIds, value: getDefaultTokenValue(prev.resolvedValueTypeId) };
        });
        return {
          ...prev,
          valuesByMode: migrateTokenValuesByMode(newValuesByMode)
        };
      });
    }
    setActiveDimensionIds(newActiveDims);
  };

  // Update getValueEditor to use canonical TokenValue
  const getValueEditor = (
    value: TokenValue | string,
    modeIndex: number,
    isOverride?: boolean,
    onChange?: (newValue: TokenValue) => void
  ): React.ReactNode => {
    if (typeof value === 'string') {
      return <Text fontSize="sm" color="gray.500">{value}</Text>;
    }
    const canonicalValue = toCanonicalTokenValue(value);
    return (
      <TokenValuePicker
        value={canonicalValue}
        tokens={tokens}
        constraints={constraints}
        excludeTokenId={editedToken.id}
        onChange={(newValue: TokenValue) => {
          if (onChange) {
            onChange(toLegacyTokenValue(newValue));
          } else {
            setEditedToken((prev: ExtendedToken) => ({
              ...prev,
              valuesByMode: prev.valuesByMode.map((item: ValueByMode, idx: number) =>
                idx === modeIndex ? { ...item, value: toLegacyTokenValue(newValue) } : item
              )
            }));
          }
        }}
      />
    );
  };

  const handleAddConstraint = () => {
    setConstraints((prev: Constraint[]) => [...prev, { ...newConstraint }]);
    setNewConstraint(createNewConstraint(resolvedValueTypes));
  };

  const handleRemoveConstraint = (idx: number) => {
    setConstraints((prev: Constraint[]) => prev.filter((_: unknown, i: number) => i !== idx));
  };

  const handleConstraintChange = (idx: number, field: string, value: unknown) => {
    setConstraints((prev: Constraint[]) => prev.map((c: Constraint, i: number) => {
      if (i !== idx) return c;
      if (field === 'minimum') {
        return { ...c, rule: { ...c.rule, minimum: Number(value) } };
      }
      if (field === 'comparatorValue') {
        return { 
          ...c, 
          rule: { 
            ...c.rule, 
            comparator: { 
              ...c.rule.comparator, 
              value: value as string,
              resolvedValueTypeId: c.rule.comparator.resolvedValueTypeId || findResolvedValueTypeByDisplayName(resolvedValueTypes, 'color') || 'color',
              method: c.rule.comparator.method || 'WCAG21'
            } 
          } 
        };
      }
      if (field === 'method') {
        return { 
          ...c, 
          rule: { 
            ...c.rule, 
            comparator: { 
              ...c.rule.comparator, 
              method: value as 'WCAG21' | 'APCA' | 'Lstar',
              resolvedValueTypeId: c.rule.comparator.resolvedValueTypeId || findResolvedValueTypeByDisplayName(resolvedValueTypes, 'color') || 'color'
            } 
          } 
        };
      }
      return c;
    }));
  };

  // Update handleSave to convert the entire ExtendedToken to canonical Token type
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[TokenEditorDialog] handleSave called with token:', editedToken);
    // Compose schema for codeSyntax generation
    const codeSyntaxSchema = { platforms, taxonomies, namingRules: schema.namingRules };
    const updatedToken: ExtendedToken = {
      ...editedToken,
      taxonomies: taxonomyEdits,
      constraints,
      codeSyntax: CodeSyntaxService.generateAllCodeSyntaxes(
        {
          ...editedToken,
          taxonomies: taxonomyEdits,
          valuesByMode: editedToken.valuesByMode
        },
        codeSyntaxSchema
      )
    };
    // Call onSave with canonical ExtendedToken type
    onSave(updatedToken);
    console.log('[TokenEditorDialog] Calling onClose');
    onClose();
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

  const [newConstraint, setNewConstraint] = useState<Constraint>(() => createNewConstraint(resolvedValueTypes));

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
                  <FormControl isRequired mb={3}>
                    <FormLabel>
                      Taxonomies <Box as="span" color="red.500" aria-label="required">*</Box>
                    </FormLabel>
                    <TaxonomyPicker
                      taxonomies={Array.isArray(taxonomies) ? taxonomies : []}
                      value={taxonomyEdits}
                      onChange={handleTaxonomyChange}
                      disabled={!Array.isArray(taxonomies) || taxonomies.length === 0}
                      onViewClassifications={onViewClassifications}
                    />
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
                  <FormControl isRequired>
                    <FormLabel>Value Type</FormLabel>
                    <Select
                      value={editedToken.resolvedValueTypeId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const newType = e.target.value;
                        setEditedToken((prev: ExtendedToken) => ({
                          ...prev,
                          resolvedValueTypeId: newType,
                          valuesByMode: [{ modeIds: [], value: getDefaultTokenValue(newType) }]
                        }));
                      }}
                    >
                      {resolvedValueTypes.map((vt: ResolvedValueTypeObj) => (
                        <option key={vt.id} value={vt.id}>
                          {vt.type ? `${vt.displayName} (${vt.type})` : `${vt.displayName} (custom)`}
                        </option>
                      ))}
                    </Select>
                    {editedToken.resolvedValueTypeId && (
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        {resolvedValueTypes.find((vt: ResolvedValueTypeObj) => vt.id === editedToken.resolvedValueTypeId)?.description}
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
                </VStack>
                {/* Private + Themeable (right column) */}
                <VStack spacing={3} align="stretch" flex={1}>
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
                {constraints.map((constraint: Constraint, idx: number) => (
                  <HStack key={idx} spacing={3} align="center">
                    <Text fontWeight="medium">Contrast</Text>
                    <FormControl w="120px">
                      <FormLabel fontSize="xs" mb={0}>Minimum</FormLabel>
                      <Input
                        type="number"
                        value={constraint.rule.minimum}
                        min={0}
                        step={0.1}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConstraintChange(idx, 'minimum', e.target.value)}
                        size="sm"
                      />
                    </FormControl>
                    <FormControl w="160px">
                      <FormLabel fontSize="xs" mb={0}>Comparator Color</FormLabel>
                      <TokenValuePicker
                        value={toCanonicalTokenValue({ type: 'COLOR', value: constraint.rule.comparator.value })}
                        tokens={tokens}
                        onChange={(newValue: TokenValue) => {
                          if (newValue.type === 'COLOR') {
                            handleConstraintChange(idx, 'comparatorValue', newValue.value);
                          }
                        }}
                        excludeTokenId={editedToken.id}
                      />
                    </FormControl>
                    <FormControl w="120px">
                      <FormLabel fontSize="xs" mb={0}>Method</FormLabel>
                      <Select
                        value={constraint.rule.comparator.method}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleConstraintChange(idx, 'method', e.target.value)}
                        size="sm"
                      >
                        <option value="WCAG21">WCAG21</option>
                        <option value="APCA">APCA</option>
                        <option value="Lstar">Lstar</option>
                      </Select>
                    </FormControl>
                    <IconButton
                      aria-label="Remove constraint"
                      icon={<Trash2 />}
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewConstraint((nc: Constraint) => ({
                        ...nc,
                        rule: { ...nc.rule, minimum: Number(e.target.value) }
                      }))}
                      size="sm"
                    />
                  </FormControl>
                  <FormControl w="160px">
                    <FormLabel fontSize="xs" mb={0}>Comparator Color</FormLabel>
                    <TokenValuePicker
                      value={toCanonicalTokenValue({ type: 'COLOR', value: newConstraint.rule.comparator.value })}
                      tokens={tokens}
                      onChange={(newValue: TokenValue) => {
                        if (newValue.type === 'COLOR') {
                          setNewConstraint((nc: Constraint) => ({
                            ...nc,
                            rule: {
                              ...nc.rule,
                              comparator: {
                                ...nc.rule.comparator,
                                value: newValue.value,
                                method: nc.rule.comparator.method || 'WCAG21',
                                resolvedValueTypeId: 'color'
                              }
                            }
                          }));
                        }
                      }}
                      excludeTokenId={editedToken.id}
                    />
                  </FormControl>
                  <FormControl w="120px">
                    <FormLabel fontSize="xs" mb={0}>Method</FormLabel>
                    <Select
                      value={newConstraint.rule.comparator.method}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewConstraint((nc: Constraint) => ({
                        ...nc,
                        rule: {
                          ...nc.rule,
                          comparator: {
                            ...nc.rule.comparator,
                            method: e.target.value as 'WCAG21' | 'APCA' | 'Lstar',
                            resolvedValueTypeId: findResolvedValueTypeByDisplayName(resolvedValueTypes, 'color') || 'COLOR',
                          }
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
                    const globalValue = editedToken.valuesByMode.find((vbm: ValueByMode) => Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0);
                    if (!globalValue) {
                      return (
                        <Button
                          variant="outline"
                          onClick={() => setEditedToken((prev: ExtendedToken) => ({
                            ...prev,
                            valuesByMode: [
                              ...prev.valuesByMode,
                              { modeIds: [], value: getDefaultTokenValue(prev.resolvedValueTypeId) }
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
                          value={toCanonicalTokenValue(globalValue.value)}
                          tokens={tokens}
                          constraints={constraints}
                          excludeTokenId={editedToken.id}
                          onChange={(newValue: TokenValue) => setEditedToken((prev: ExtendedToken) => ({
                            ...prev,
                            valuesByMode: prev.valuesByMode.map((item: ValueByMode) =>
                              Array.isArray(item.modeIds) && item.modeIds.length === 0
                                ? { ...item, value: toLegacyTokenValue(newValue) }
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