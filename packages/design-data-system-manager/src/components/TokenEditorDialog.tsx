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

// Constraint type matches schema: only 'contrast' type for now
interface Constraint {
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
  valuesByMode: { modeIds: string[]; value: TokenValue }[];
  resolvedValueTypeId: string; // string id, not enum
  constraints?: Constraint[];
};

// Update all usages of resolvedValueType to resolvedValueTypeId
// In all state, props, and helper functions, use resolvedValueTypeId
// For example, in getResolvedValueTypeId, use token.resolvedValueTypeId
function getResolvedValueTypeId(token: ExtendedToken): string {
  return token.resolvedValueTypeId;
}

// Helper function to get a default token value
function getDefaultTokenValue(resolvedValueTypeId: string, resolvedValueTypes: ResolvedValueTypeObj[]): TokenValue {
  const valueType = resolvedValueTypes.find((vt) => typeof vt === 'object' && 'id' in vt && vt.id === resolvedValueTypeId);
  if (!valueType || !('type' in valueType) || !valueType.type) {
    // Fallback to color if not found or type is missing
    return { resolvedValueTypeId: 'color', value: '#000000' };
  }
  switch (valueType.id) {
    case 'color':
      return { resolvedValueTypeId: 'color', value: '#000000' };
    case 'dimension':
      return { resolvedValueTypeId: 'dimension', value: 0 };
    case 'spacing':
      return { resolvedValueTypeId: 'spacing', value: 0 };
    case 'font_family':
      return { resolvedValueTypeId: 'font-family', value: '' };
    case 'font_weight':
      return { resolvedValueTypeId: 'font-weight', value: 400 };
    case 'font_size':
      return { resolvedValueTypeId: 'font-size', value: 16 };
    case 'line_height':
      return { resolvedValueTypeId: 'line-height', value: 1 };
    case 'letter_spacing':
      return { resolvedValueTypeId: 'letter-spacing', value: 0 };
    case 'duration':
      return { resolvedValueTypeId: 'duration', value: 0 };
    case 'cubic_bezier':
      return { resolvedValueTypeId: 'cubic-bezier', value: '0, 0, 1, 1' };
    case 'blur':
      return { resolvedValueTypeId: 'blur', value: 0 };
    case 'spread':
      return { resolvedValueTypeId: 'spread', value: 0 };
    case 'radius':
      return { resolvedValueTypeId: 'radius', value: 0 };
    default:
      // Fallback to color for unknown types
      return { resolvedValueTypeId: 'color', value: '#000000' };
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

// Canonical TokenValue type per schema
export type TokenValue =
  | { resolvedValueTypeId: 'color'; value: string }
  | { resolvedValueTypeId: 'dimension'; value: number }
  | { resolvedValueTypeId: 'spacing'; value: number }
  | { resolvedValueTypeId: 'font-family'; value: string }
  | { resolvedValueTypeId: 'font-weight'; value: number }
  | { resolvedValueTypeId: 'font-size'; value: number }
  | { resolvedValueTypeId: 'line-height'; value: number }
  | { resolvedValueTypeId: 'letter-spacing'; value: number }
  | { resolvedValueTypeId: 'duration'; value: number }
  | { resolvedValueTypeId: 'cubic-bezier'; value: string }
  | { resolvedValueTypeId: 'blur'; value: number }
  | { resolvedValueTypeId: 'spread'; value: number }
  | { resolvedValueTypeId: 'radius'; value: number }
  | { resolvedValueTypeId: 'alias'; tokenId: string };

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

// Update migrateToTokenValue to convert between old and new formats
function migrateToTokenValue(val: unknown): TokenValue {
  if (val && typeof val === 'object') {
    if ('resolvedValueTypeId' in val) {
      const newVal = val as { resolvedValueTypeId: string; value?: unknown; tokenId?: string };
      switch (newVal.resolvedValueTypeId) {
        case 'color': return { resolvedValueTypeId: 'color', value: String(newVal.value) };
        case 'dimension': return { resolvedValueTypeId: 'dimension', value: Number(newVal.value) };
        case 'spacing': return { resolvedValueTypeId: 'spacing', value: Number(newVal.value) };
        case 'font-family': return { resolvedValueTypeId: 'font-family', value: String(newVal.value) };
        case 'font-weight': return { resolvedValueTypeId: 'font-weight', value: Number(newVal.value) };
        case 'font-size': return { resolvedValueTypeId: 'font-size', value: Number(newVal.value) };
        case 'line-height': return { resolvedValueTypeId: 'line-height', value: Number(newVal.value) };
        case 'letter-spacing': return { resolvedValueTypeId: 'letter-spacing', value: Number(newVal.value) };
        case 'duration': return { resolvedValueTypeId: 'duration', value: Number(newVal.value) };
        case 'cubic-bezier': return { resolvedValueTypeId: 'cubic-bezier', value: String(newVal.value) };
        case 'blur': return { resolvedValueTypeId: 'blur', value: Number(newVal.value) };
        case 'spread': return { resolvedValueTypeId: 'spread', value: Number(newVal.value) };
        case 'radius': return { resolvedValueTypeId: 'radius', value: Number(newVal.value) };
        case 'alias': return { resolvedValueTypeId: 'alias', tokenId: String(newVal.tokenId) };
        default: return { resolvedValueTypeId: 'color', value: String(newVal.value) };
      }
    }
    if ('type' in val) {
      const legacyVal = val as { type: string; value: unknown; tokenId?: string };
      switch (legacyVal.type) {
        case 'COLOR': return { resolvedValueTypeId: 'color', value: String(legacyVal.value) };
        case 'DIMENSION': return { resolvedValueTypeId: 'dimension', value: Number(legacyVal.value) };
        case 'SPACING': return { resolvedValueTypeId: 'spacing', value: Number(legacyVal.value) };
        case 'FONT_FAMILY': return { resolvedValueTypeId: 'font-family', value: String(legacyVal.value) };
        case 'FONT_WEIGHT': return { resolvedValueTypeId: 'font-weight', value: Number(legacyVal.value) };
        case 'FONT_SIZE': return { resolvedValueTypeId: 'font-size', value: Number(legacyVal.value) };
        case 'LINE_HEIGHT': return { resolvedValueTypeId: 'line-height', value: Number(legacyVal.value) };
        case 'LETTER_SPACING': return { resolvedValueTypeId: 'letter-spacing', value: Number(legacyVal.value) };
        case 'DURATION': return { resolvedValueTypeId: 'duration', value: Number(legacyVal.value) };
        case 'CUBIC_BEZIER': return { resolvedValueTypeId: 'cubic-bezier', value: String(legacyVal.value) };
        case 'BLUR': return { resolvedValueTypeId: 'blur', value: Number(legacyVal.value) };
        case 'SPREAD': return { resolvedValueTypeId: 'spread', value: Number(legacyVal.value) };
        case 'RADIUS': return { resolvedValueTypeId: 'radius', value: Number(legacyVal.value) };
        case 'ALIAS': return { resolvedValueTypeId: 'alias', tokenId: String(legacyVal.tokenId) };
        default: return { resolvedValueTypeId: 'color', value: String(legacyVal.value) };
      }
    }
  }
  // Fallback
  return { resolvedValueTypeId: 'color', value: String(val) };
}

// Update migrateTokenValuesByMode to handle both old and new formats
function migrateTokenValuesByMode(valuesByMode: unknown[]): { modeIds: string[]; value: TokenValue; metadata?: Record<string, unknown>; platformOverrides?: { platformId: string; value: string }[] }[] {
  return Array.isArray(valuesByMode)
    ? valuesByMode.map(vbm => {
        const valueByMode = vbm as { modeIds?: string[]; value: unknown; metadata?: Record<string, unknown>; platformOverrides?: { platformId: string; value: string }[] };
        return {
          modeIds: Array.isArray(valueByMode.modeIds) ? valueByMode.modeIds : [],
          value: migrateToTokenValue(valueByMode.value),
          metadata: valueByMode.metadata,
          platformOverrides: valueByMode.platformOverrides
        };
      })
    : [];
}

// Update ValueByMode type to match new token value format
export interface ValueByMode {
  modeIds: string[];
  value: TokenValue;
  platformOverrides?: {
    platformId: string;
    value: string;
  }[];
}

export { migrateTokenValuesByMode, migrateToTokenValue };

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
        resolvedValueTypeId: getResolvedValueTypeId(token),
        valuesByMode: migrateTokenValuesByMode(token.valuesByMode),
      };
    }
    return {
      ...token,
      themeable: token.themeable ?? false,
      resolvedValueTypeId: getResolvedValueTypeId(token),
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
        resolvedValueTypeId: getResolvedValueTypeId(token),
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
        dim.modes.some(mode => allModeIds.includes(mode.id))
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
    const modeArrays = activeDims.map(d => d.modes.map(m => m.id));
    const combos = modeArrays.length > 0 ? cartesianProduct(modeArrays) : [[]];
    setEditedToken(prev => {
      const prevMap = new Map(prev.valuesByMode.map(vbm => [vbm.modeIds.slice().sort().join(','), vbm.value]));
      const newValuesByMode = combos.map(modeIds => {
        const key = modeIds.slice().sort().join(',');
        if (prevMap.has(key)) {
          const val = prevMap.get(key);
          return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(getResolvedValueTypeId(prev), resolvedValueTypes) };
        }
        for (let i = 0; i < modeIds.length; i++) {
          const parentIds = modeIds.slice(0, i).concat(modeIds.slice(i + 1));
          const parentKey = parentIds.slice().sort().join(',');
          if (prevMap.has(parentKey)) {
            const val = prevMap.get(parentKey);
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(getResolvedValueTypeId(prev), resolvedValueTypes) };
          }
        }
        return { modeIds, value: getDefaultTokenValue(getResolvedValueTypeId(prev), resolvedValueTypes) };
      });
      return {
        ...prev,
        valuesByMode: migrateTokenValuesByMode(newValuesByMode)
      };
    });
  }, [dimensions, activeDimensionIds, open, resolvedValueTypes]);

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
          if (vbm.modeIds.includes(defaultModeId) || dim.modes.some(mode => vbm.modeIds.includes(mode.id))) {
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
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(getResolvedValueTypeId(prev), resolvedValueTypes) };
          }
          // Find all previous combos that are a superset of modeIds
          const candidates = prev.valuesByMode.filter(vbm =>
            vbm.modeIds.length === modeIds.length + 1 &&
            modeIds.every(id => vbm.modeIds.includes(id))
          );
          let found = candidates.find(vbm => vbm.modeIds.includes(defaultModeId));
          if (!found && candidates.length > 0) found = candidates[0];
          if (found) {
            return { modeIds, value: found.value };
          }
          return { modeIds, value: getDefaultTokenValue(getResolvedValueTypeId(prev), resolvedValueTypes) };
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
            return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(getResolvedValueTypeId(prev), resolvedValueTypes) };
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
              return { modeIds, value: val !== undefined ? val : getDefaultTokenValue(getResolvedValueTypeId(prev), resolvedValueTypes) };
            }
          }
          return { modeIds, value: getDefaultTokenValue(getResolvedValueTypeId(prev), resolvedValueTypes) };
        });
        return {
          ...prev,
          valuesByMode: migrateTokenValuesByMode(newValuesByMode)
        };
      });
    }
    setActiveDimensionIds(newActiveDims);
  };

  // Update getValueEditor to handle both old and new formats
  const getValueEditor = (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => {
    if (typeof value === 'string') {
      return <Text fontSize="sm" color="gray.500">{value}</Text>;
    }

    return (
      <TokenValuePicker
        resolvedValueTypeId={editedToken.resolvedValueTypeId}
        value={value}
        tokens={tokens.map(t => ({
          ...t,
          valuesByMode: t.valuesByMode.map(vbm => ({
            ...vbm,
            value: migrateToTokenValue(vbm.value)
          }))
        }))}
        constraints={constraints}
        excludeTokenId={editedToken.id}
        onChange={newValue => {
          if (onChange) {
            onChange(newValue);
          } else {
            setEditedToken(prev => ({
              ...prev,
              valuesByMode: prev.valuesByMode.map((item, idx) =>
                idx === modeIndex ? { ...item, value: newValue } : item
              )
            }));
          }
        }}
      />
    );
  };

  const handleAddConstraint = () => {
    setConstraints(prev => [...prev, { ...newConstraint }]);
    setNewConstraint(createNewConstraint(resolvedValueTypes));
  };

  const handleRemoveConstraint = (idx: number) => {
    setConstraints(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConstraintChange = (idx: number, field: string, value: unknown) => {
    setConstraints(prev => prev.map((c, i) => {
      if (i !== idx) return c;
      if (field === 'minimum') {
        return { ...c, rule: { ...c.rule, minimum: Number(value) } };
      }
      if (field === 'comparatorValue') {
        return { ...c, rule: { ...c.rule, comparator: { ...c.rule.comparator, value: value as string } } };
      }
      if (field === 'method') {
        return { ...c, rule: { ...c.rule, comparator: { ...c.rule.comparator, method: value as 'WCAG21' | 'APCA' | 'Lstar' } } };
      }
      return c;
    }));
  };

  // Update handleSave to convert values to the correct format
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
          valuesByMode: editedToken.valuesByMode.map(vbm => ({
            ...vbm,
            value: migrateToTokenValue(vbm.value)
          }))
        },
        codeSyntaxSchema
      )
    };
    console.log('[TokenEditorDialog] Calling onSave with updated token:', updatedToken);
    onSave(updatedToken as unknown as Token);
    console.log('[TokenEditorDialog] Calling onClose');
    onClose();
  };

  function handleTaxonomyChange(newTaxonomies: TokenTaxonomyRef[]) {
    setTaxonomyEdits(newTaxonomies);
    const codeSyntaxSchema = { platforms, taxonomies, namingRules: schema.namingRules };
    setEditedToken(prev => ({
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
  const hasRequiredFieldError = !editedToken.displayName || !getResolvedValueTypeId(editedToken);

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
    setEditedToken(prev => ({
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
                      value={getResolvedValueTypeId(editedToken)}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const newType = e.target.value;
                        setEditedToken(prev => ({
                          ...prev,
                          resolvedValueTypeId: newType,
                          valuesByMode: [{ modeIds: [], value: getDefaultTokenValue(newType, resolvedValueTypes) }]
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
                        {resolvedValueTypes.find((vt: ResolvedValueTypeObj) => vt.id === (editedToken as Token).resolvedValueTypeId)?.description}
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleConstraintChange(idx, 'minimum', e.target.value)}
                        size="sm"
                      />
                    </FormControl>
                    <FormControl w="160px">
                      <FormLabel fontSize="xs" mb={0}>Comparator Color</FormLabel>
                      <TokenValuePicker
                        resolvedValueTypeId={findResolvedValueTypeByDisplayName(resolvedValueTypes, 'color') || 'COLOR'}
                        value={{ resolvedValueTypeId: 'color', value: constraint.rule.comparator.value }}
                        tokens={tokens}
                        onChange={(newValue) => {
                          if (newValue.resolvedValueTypeId === 'color' && typeof newValue.value === 'string') {
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewConstraint(nc => ({
                        ...nc,
                        rule: { ...nc.rule, minimum: Number(e.target.value) }
                      }))}
                      size="sm"
                    />
                  </FormControl>
                  <FormControl w="160px">
                    <FormLabel fontSize="xs" mb={0}>Comparator Color</FormLabel>
                    <TokenValuePicker
                      resolvedValueTypeId={findResolvedValueTypeByDisplayName(resolvedValueTypes, 'color') || 'COLOR'}
                      value={{ resolvedValueTypeId: 'color', value: newConstraint.rule.comparator.value }}
                      tokens={tokens}
                      onChange={(newValue) => {
                        if (newValue.resolvedValueTypeId === 'color' && typeof newValue.value === 'string') {
                          setNewConstraint(nc => ({
                            ...nc,
                            rule: {
                              ...nc.rule,
                              comparator: {
                                ...nc.rule.comparator,
                                value: newValue.value,
                                method: nc.rule.comparator.method || 'WCAG21',
                                resolvedValueTypeId: findResolvedValueTypeByDisplayName(resolvedValueTypes, 'color') || 'COLOR'
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
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewConstraint(nc => ({
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
                    const globalValue = editedToken.valuesByMode.find(vbm => Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0);
                    if (!globalValue) {
                      return (
                        <Button
                          variant="outline"
                          onClick={() => setEditedToken(prev => ({
                            ...prev,
                            valuesByMode: [
                              ...prev.valuesByMode,
                              { modeIds: [], value: getDefaultTokenValue(getResolvedValueTypeId(prev), resolvedValueTypes) }
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
                          resolvedValueTypeId={editedToken.resolvedValueTypeId}
                          value={globalValue.value}
                          tokens={tokens}
                          constraints={constraints}
                          excludeTokenId={editedToken.id}
                          onChange={(newValue) => setEditedToken(prev => ({
                            ...prev,
                            valuesByMode: prev.valuesByMode.map((item) =>
                              Array.isArray(item.modeIds) && item.modeIds.length === 0
                                ? { ...item, value: newValue }
                                : item
                            )
                          }))}
                        />
                        <IconButton
                          aria-label="Remove value"
                          icon={<Trash2 />}
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
                    valuesByMode={editedToken.valuesByMode.map(vbm => ({
                      ...vbm,
                      value: migrateToTokenValue(vbm.value)
                    }))}
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
                    valuesByMode={editedToken.valuesByMode.map(vbm => ({
                      ...vbm,
                      value: migrateToTokenValue(vbm.value)
                    }))}
                    modes={modes}
                    getValueEditor={getValueEditor}
                    onPlatformOverrideChange={(platformId: string, modeIndex: number, newValue: TokenValue) => {
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
          <Button colorScheme="blue" onClick={handleSave} disabled={hasError}>
            {isNew ? 'Create token' : 'Save'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 