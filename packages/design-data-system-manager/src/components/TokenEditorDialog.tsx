import React, { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  Field,
  IconButton,
  Input,
  Select,
  Stack,
  Table,
  Text,
  Box,
  Collapsible,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@chakra-ui/react';
import { Plus, Trash2, X, ChevronDown, MonitorSmartphone, Tags, Palette, Ruler, PencilRuler, Type, Timer, Circle, Expand, Minus, MoveHorizontal, MoveVertical, SquareRoundCorner } from 'lucide-react';
import { TokenValuePicker } from './TokenValuePicker';
import { TaxonomyPicker } from './TaxonomyPicker';
import type { Token, Mode, Dimension, Platform, TokenStatus, TokenTaxonomyRef, validateToken } from '@token-model/data-model';
import type { ResolvedValueType } from '@token-model/data-model';
import { generateTokenName } from '../utils/token-name-generator';
import { ValueByModeTable } from './ValueByModeTable';
import { createUniqueId } from '../utils/id';
import { useSchema } from '../hooks/useSchema';
import { CodeSyntaxService, ensureCodeSyntaxArrayFormat } from '../services/codeSyntax';
import { getDefaultValueForType, getValueTypeFromId } from '../utils/valueTypeUtils';
import { getValueTypeIcon } from '../utils/getValueTypeIcon';
import type { Schema } from '../hooks/useSchema';
import { useColorMode } from '../hooks/useColorMode';
import { useDisclosure } from '@chakra-ui/react';

// Type definitions
interface TokenValue {
  value?: any;
  tokenId?: string;
}

interface PlatformOverride {
  platformId: string;
  value: string;
}

interface ValueByMode {
  modeIds: string[];
  value: TokenValue;
  platformOverrides?: PlatformOverride[];
  metadata?: Record<string, unknown>;
}

export interface ExtendedToken extends Omit<Token, 'valuesByMode' | 'private'> {
  valuesByMode: ValueByMode[];
  themeable: boolean;
  private: boolean;
  tokenCollectionId: string;
  taxonomies: TokenTaxonomyRef[];
}

// Helper function to get a default token value based on schema
function getDefaultTokenValue(resolvedValueTypeId: string, schema: { resolvedValueTypes: ResolvedValueType[] }): TokenValue {
  const defaultValue = getDefaultValueForType(resolvedValueTypeId, schema.resolvedValueTypes);
  return { value: defaultValue };
}

interface Taxonomy {
  id: string;
  name: string;
  description: string;
  terms: { id: string; name: string; description?: string }[];
  resolvedValueTypeIds?: string[];
}

interface ExtendedSchema extends Schema {
  extensions: {
    tokenGroups: Array<{
      id: string;
      tokenIds: string[];
    }>;
    tokenVariants: Record<string, Record<string, { tokenId: string }>>;
  };
  themes: Array<{
    id: string;
    displayName: string;
    isDefault: boolean;
    description?: string;
    overrides: {
      tokenOverrides: Array<{
        tokenId: string;
      }>;
    };
  }>;
}

interface Collection {
  id: string;
  displayName: string;
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
  schema: ExtendedSchema | null;
  onDeleteToken: (tokenId: string) => void;
}

// Helper function to filter taxonomies by value type
function filterTaxonomiesByValueType(taxonomies: Taxonomy[], resolvedValueTypeId: string): Taxonomy[] {
  return taxonomies.filter(taxonomy => 
    Array.isArray(taxonomy.resolvedValueTypeIds) && 
    taxonomy.resolvedValueTypeIds.includes(resolvedValueTypeId)
  );
}

// Helper function to transform platform overrides into ValueByModeTable format
function getPlatformOverridesForTable(
  valuesByMode: ValueByMode[],
  platformId: string,
  modes: Mode[],
  dimensions: Dimension[],
  resolvedValueTypeId: string,
  resolvedValueTypes: ResolvedValueType[]
): ValueByMode[] {
  console.log('getPlatformOverridesForTable input:', {
    valuesByMode: valuesByMode.map(vbm => ({
      modeIds: vbm.modeIds,
      hasOverrides: !!vbm.platformOverrides,
      overrideCount: vbm.platformOverrides?.length || 0,
      overridePlatforms: vbm.platformOverrides?.map(po => po.platformId) || []
    })),
    platformId,
    resolvedValueTypeId
  });

  // First, get all mode combinations that have overrides for this platform
  const modeCombinationsWithOverrides = valuesByMode.filter((vbm: ValueByMode) => {
    const hasOverride = vbm.platformOverrides?.some((po: PlatformOverride) => po.platformId === platformId);
    console.log('Checking modeIds:', vbm.modeIds, 'hasOverride:', hasOverride);
    return hasOverride;
  });

  console.log('Mode combinations with overrides:', modeCombinationsWithOverrides.map(vbm => ({
    modeIds: vbm.modeIds,
    overrides: vbm.platformOverrides
  })));

  // If no overrides exist, return an empty array
  if (modeCombinationsWithOverrides.length === 0) {
    console.log('No overrides found for platform:', platformId);
    return [];
  }

  // Transform each mode combination into a ValueByMode entry
  const transformedOverrides = modeCombinationsWithOverrides.map((vbm: ValueByMode) => {
    const override = vbm.platformOverrides?.find((po: PlatformOverride) => po.platformId === platformId);
    console.log('Processing override:', { 
      modeIds: vbm.modeIds,
      override,
      allOverrides: vbm.platformOverrides
    });

    if (!override) {
      console.log('No override found for modeIds:', vbm.modeIds);
      return {
        modeIds: vbm.modeIds,
        value: getDefaultTokenValue(resolvedValueTypeId, { resolvedValueTypes })
      };
    }

    // Parse the override value based on the value type
    let parsedValue: TokenValue;
    try {
      // For color values, they might be stored directly as strings
      if (resolvedValueTypeId === 'color') {
        parsedValue = { value: override.value };
      } else {
        // For other types, try to parse as JSON
        parsedValue = JSON.parse(override.value);
      }
    } catch (e) {
      console.warn('Failed to parse override value:', override.value, e);
      // If parsing fails, use the raw string value
      parsedValue = { value: override.value };
    }

    const result = {
      modeIds: vbm.modeIds,
      value: parsedValue
    };
    console.log('Transformed override:', result);
    return result;
  });

  console.log('Final transformed overrides:', transformedOverrides);
  return transformedOverrides;
}

// Add type for preserved values
type PreservedValue = {
  modeIds: string[];
  value: TokenValue;
  platformOverrides?: { platformId: string; value: string }[];
};

// Add type for the preserved values ref
type PreservedValuesRef = Record<string, Record<string, PreservedValue>>;

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
    onViewClassifications,
    schema,
    onDeleteToken
  }: TokenEditorDialogProps) {
  console.debug('[TokenEditorDialog] Received resolvedValueTypes:', resolvedValueTypes);

  const { colorMode } = useColorMode();
  
  // Initialize internal state from parent state when dialog opens
  const [editedToken, setEditedToken] = useState<ExtendedToken>(() => {
    if (isNew) {
      return {
        ...token,
        id: createUniqueId('token'),
        themeable: token.themeable ?? false,
        valuesByMode: [{
          modeIds: [],
          value: getDefaultTokenValue(token.resolvedValueTypeId, { resolvedValueTypes })
        }]
      };
    }
    const { valuesByMode, ...rest } = token;
    return {
      ...rest,
      themeable: token.themeable ?? false,
      valuesByMode: valuesByMode.map(vbm => ({
        ...vbm,
        platformOverrides: vbm.platformOverrides ? [...vbm.platformOverrides] : []
      }))
    };
  });

  // Local state for taxonomy edits (not applied to editedToken until save)
  const [taxonomyEdits, setTaxonomyEdits] = useState<TokenTaxonomyRef[]>(() =>
    Array.isArray(token.taxonomies) ? token.taxonomies : []
  );

  // Track which dimensions are active for this token
  const [activeDimensionIds, setActiveDimensionIds] = useState<string[]>([]);
  const preservedValuesByRemovedDimension = useRef<PreservedValuesRef>({});
  const originalTokenRef = useRef<ExtendedToken | null>(null);

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
    if (open && schema) {
      const { valuesByMode, ...rest } = token;
      const newToken = {
        ...rest,
        themeable: token.themeable ?? false,
        valuesByMode: valuesByMode.map(vbm => ({
          ...vbm,
          platformOverrides: vbm.platformOverrides ? [...vbm.platformOverrides] : []
        }))
      };
      setEditedToken(newToken);
      originalTokenRef.current = newToken;
      setTaxonomyEdits(Array.isArray(token.taxonomies) ? token.taxonomies : []);
      setActiveDimensionIds(dimensions.filter(d => d.required).map(d => d.id));

      // Generate code syntax on dialog open
      const codeSyntaxSchema = { 
        platforms, 
        taxonomies, 
        namingRules: schema?.namingRules || { taxonomyOrder: [] }
      };
      const updatedToken = {
        ...newToken,
        taxonomies: Array.isArray(token.taxonomies) ? token.taxonomies : [],
        codeSyntax: CodeSyntaxService.generateAllCodeSyntaxes(
          {
            ...newToken,
            taxonomies: Array.isArray(token.taxonomies) ? token.taxonomies : [],
            valuesByMode: newToken.valuesByMode
          },
          codeSyntaxSchema
        )
      };
      setEditedToken(updatedToken);
    }
  }, [token, open, dimensions, platforms, taxonomies, schema?.namingRules]);

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

  // Add or remove a dimension from the token
  const handleToggleDimension = (dimensionId: string) => {
    const isActive = activeDimensionIds.includes(dimensionId);
    let newActiveDims: string[];
    
    if (isActive) {
      const dim = dimensions.find(d => d.id === dimensionId);
      if (!dim) return;
      
      newActiveDims = activeDimensionIds.filter((id: string) => id !== dimensionId);
      const defaultModeId = dim.defaultMode;
      
      setEditedToken((prev: ExtendedToken) => {
        // Store the original values from localStorage for this dimension
        const originalValues = prev.valuesByMode.reduce((acc: Record<string, PreservedValue>, vbm: ValueByMode) => {
          // Store ALL values that include any mode from this dimension
          if (vbm.modeIds.includes(defaultModeId) || dim.modes.some((mode: Mode) => vbm.modeIds.includes(mode.id))) {
            const key = vbm.modeIds.slice().sort().join(',');
            acc[key] = {
              modeIds: vbm.modeIds,
              value: vbm.value,
              platformOverrides: vbm.platformOverrides ? [...vbm.platformOverrides] : undefined
            };
          }
          return acc;
        }, {} as Record<string, PreservedValue>);

        // Store these original values for potential restoration
        preservedValuesByRemovedDimension.current[dimensionId] = originalValues;

        // For each value that includes the removed dimension's modes,
        // create a new value without those modes
        const newValuesByMode = prev.valuesByMode.flatMap(vbm => {
          // If this value doesn't include any modes from the removed dimension,
          // keep it as is
          if (!vbm.modeIds.includes(defaultModeId) && 
              !dim.modes.some((mode: Mode) => vbm.modeIds.includes(mode.id))) {
            return [vbm];
          }

          // If this value does include modes from the removed dimension,
          // create a new value without those modes
          const remainingModeIds = vbm.modeIds.filter(modeId => 
            modeId !== defaultModeId && 
            !dim.modes.some((mode: Mode) => mode.id === modeId)
          );

          // Only create the new value if there are remaining modes
          return remainingModeIds.length > 0 ? [{
            modeIds: remainingModeIds,
            value: vbm.value,
            platformOverrides: vbm.platformOverrides
          }] : [];
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
      const defaultModeId = dim.defaultMode;
      
      setEditedToken((prev: ExtendedToken) => {
        // First, restore any preserved values for this dimension
        const preservedValues = preservedValuesByRemovedDimension.current[dimensionId] || {};
        
        // Create new combinations with the default mode
        const newCombinations = prev.valuesByMode.flatMap(vbm => {
          const combinations = [];
          
          // Check if we have a preserved value for this combination
          const preservedKey = [...vbm.modeIds, defaultModeId].sort().join(',');
          const preservedValue = preservedValues[preservedKey];
          
          if (preservedValue) {
            // If we have a preserved value, use it
            combinations.push({
              modeIds: [...vbm.modeIds, defaultModeId].sort(),
              value: preservedValue.value,
              platformOverrides: preservedValue.platformOverrides
            });
          } else {
            // Check if we have an original value from the initial token
            const originalValue = originalTokenRef.current?.valuesByMode.find(ovbm => 
              ovbm.modeIds.slice().sort().join(',') === [...vbm.modeIds, defaultModeId].sort().join(',')
            );
            
            if (originalValue) {
              // If we have an original value, use it
              combinations.push({
                modeIds: [...vbm.modeIds, defaultModeId].sort(),
                value: originalValue.value,
                platformOverrides: originalValue.platformOverrides
              });
            } else {
              // Otherwise, use the current value
              combinations.push({
                modeIds: [...vbm.modeIds, defaultModeId].sort(),
                value: vbm.value,
                platformOverrides: vbm.platformOverrides
              });
            }
          }
          
          // Find parent combinations and create new ones with the default mode
          const parentCombinations = vbm.modeIds.map((_, index) => {
            const parentModeIds = vbm.modeIds.filter((_, i) => i !== index);
            const preservedKey = [...parentModeIds, defaultModeId].sort().join(',');
            const preservedValue = preservedValues[preservedKey];
            
            if (preservedValue) {
              // If we have a preserved value, use it
              return {
                modeIds: [...parentModeIds, defaultModeId].sort(),
                value: preservedValue.value,
                platformOverrides: preservedValue.platformOverrides
              };
            } else {
              // Check if we have an original value from the initial token
              const originalValue = originalTokenRef.current?.valuesByMode.find(ovbm => 
                ovbm.modeIds.slice().sort().join(',') === [...parentModeIds, defaultModeId].sort().join(',')
              );
              
              if (originalValue) {
                // If we have an original value, use it
                return {
                  modeIds: [...parentModeIds, defaultModeId].sort(),
                  value: originalValue.value,
                  platformOverrides: originalValue.platformOverrides
                };
              } else {
                // Otherwise, use the current value
                return {
                  modeIds: [...parentModeIds, defaultModeId].sort(),
                  value: vbm.value,
                  platformOverrides: vbm.platformOverrides
                };
              }
            }
          });
          
          return [...combinations, ...parentCombinations];
        });

        // Combine all values, removing duplicates
        const uniqueValues = newCombinations.reduce((acc, curr) => {
          const key = curr.modeIds.sort().join(',');
          if (!acc[key]) {
            acc[key] = curr;
          }
          return acc;
        }, {} as Record<string, ValueByMode>);

        return {
          ...prev,
          valuesByMode: Object.values(uniqueValues)
        };
      });
    }
    setActiveDimensionIds(newActiveDims);
  };

  // Update getValueEditor to use schema-driven value handling
  const getValueEditor = (
    value: TokenValue | string,
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
              valuesByMode: prev.valuesByMode.map((item: ValueByMode) =>
                item.modeIds.slice().sort().join(',') === modeIds.slice().sort().join(',')
                  ? { ...item, value: newValue }
                  : item
              )
            }));
          }
        }}
      />
    );
  };

  // Add this new function for platform override value editing
  const getPlatformOverrideValueEditor = (
    value: string | TokenValue,
    modeIds: string[],
    platformId: string,
    isOverride?: boolean,
    onChange?: (newValue: TokenValue) => void
  ): React.ReactNode => {
    // For platform overrides, we need to handle the value differently
    // since it's stored as a string in the platformOverrides array
    const parsedValue = typeof value === 'string' ? JSON.parse(value) : value;
    
    return (
      <TokenValuePicker
        value={parsedValue}
        tokens={tokens}
        excludeTokenId={editedToken.id}
        modes={modeIds}
        resolvedValueTypeId={editedToken.resolvedValueTypeId}
        resolvedValueTypes={resolvedValueTypes}
        onChange={(newValue: TokenValue) => {
          if (onChange) {
            onChange(newValue);
          } else {
            setEditedToken((prev: ExtendedToken) => {
              const updatedValuesByMode = prev.valuesByMode.map(vbm => {
                if (vbm.modeIds.slice().sort().join(',') === modeIds.slice().sort().join(',')) {
                  return {
                    ...vbm,
                    platformOverrides: [
                      ...(vbm.platformOverrides || []).filter(po => po.platformId !== platformId),
                      {
                        platformId,
                        value: JSON.stringify(newValue)
                      }
                    ]
                  };
                }
                return vbm;
              });
              return {
                ...prev,
                valuesByMode: updatedValuesByMode
              };
            });
          }
        }}
      />
    );
  };

  // Update handleSave to use schema validation
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Compose schema for codeSyntax generation
    const codeSyntaxSchema = { 
      platforms, 
      taxonomies, 
      namingRules: schema?.namingRules || { taxonomyOrder: [] } 
    };
    
    const updatedToken = {
      ...editedToken,
      taxonomies: taxonomyEdits,
      codeSyntax: CodeSyntaxService.generateAllCodeSyntaxes(
        editedToken,
        codeSyntaxSchema
      )
    };

    onSave(updatedToken);
    onClose();
  };

  function handleTaxonomyChange(newTaxonomies: TokenTaxonomyRef[]) {
    setTaxonomyEdits(newTaxonomies);
    const codeSyntaxSchema = { 
      platforms, 
      taxonomies, 
      namingRules: schema?.namingRules || { taxonomyOrder: [] } 
    };
    setEditedToken((prev: ExtendedToken) => ({
      ...prev,
      codeSyntax: CodeSyntaxService.generateAllCodeSyntaxes(
        prev,
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

  const { open: isOpen, onToggle } = useDisclosure();

  // Get the current resolved value type
  const valueTypeType = getValueTypeFromId(editedToken.resolvedValueTypeId, resolvedValueTypes);
  
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteDialogCancelRef = useRef<HTMLButtonElement>(null);

  // Function to find all references to this token
  const findTokenReferences = () => {
    const references = {
      aliases: [] as string[],
      groups: [] as string[],
      variants: [] as string[],
      themeOverrides: [] as string[]
    };

    // Check for aliases in other tokens
    tokens.forEach(t => {
      t.valuesByMode.forEach(vbm => {
        if ('tokenId' in vbm.value && vbm.value.tokenId === token.id) {
          references.aliases.push(t.id);
        }
      });
    });

    // Check for references in token groups
    if (schema?.extensions?.tokenGroups) {
      schema.extensions.tokenGroups.forEach(group => {
        if (group.tokenIds.includes(token.id)) {
          references.groups.push(group.id);
        }
      });
    }

    // Check for references in token variants
    if (schema?.extensions?.tokenVariants) {
      Object.entries(schema.extensions.tokenVariants).forEach(([variantId, variant]) => {
        if (Object.values(variant).some(v => v.tokenId === token.id)) {
          references.variants.push(variantId);
        }
      });
    }

    // Check for references in theme overrides
    if (schema?.themes) {
      schema.themes.forEach(theme => {
        if (theme.overrides?.tokenOverrides?.some(o => o.tokenId === token.id)) {
          references.themeOverrides.push(theme.id);
        }
      });
    }

    return references;
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    onDeleteToken(token.id);
    setIsDeleteDialogOpen(false);
    onClose();
  };

  const references = findTokenReferences();
  const hasReferences = Object.values(references).some(arr => arr.length > 0);

  const handleValueChange = (newValue: { value?: any } | { tokenId: string }) => {
    const tokenValue: TokenValue = {
      value: 'value' in newValue ? newValue.value : undefined,
      tokenId: 'tokenId' in newValue ? newValue.tokenId : undefined
    };
    return tokenValue;
  };

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Content bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
        <Dialog.Header>{isNew ? 'Create Token' : 'Edit Token'}</Dialog.Header>
        <Button
          position="absolute"
          top={2}
          right={2}
          variant="ghost"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </Button>
        <Dialog.Body>
          <Stack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Name</Field.Label>
              <Input
                value={editedToken.displayName}
                onChange={e => setEditedToken((prev: ExtendedToken) => ({ ...prev, displayName: e.target.value }))}
              />
            </Field.Root>
            <Field.Root>
              <Field.Label>Description</Field.Label>
              <Input
                value={editedToken.description || ''}
                onChange={e => setEditedToken((prev: ExtendedToken) => ({ ...prev, description: e.target.value }))}
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>Value Type</Field.Label>
              <Select.Root
                value={[editedToken.resolvedValueTypeId]}
                onValueChange={(details) => {
                  const value = Array.isArray(details.value) ? details.value[0] : details.value;
                  setEditedToken(prev => ({ ...prev, resolvedValueTypeId: value }));
                }}
                collection={{
                  items: resolvedValueTypes.map(type => ({
                    value: type.id,
                    label: type.displayName
                  })),
                  options: {},
                  copy: () => ({ items: [], options: {} }),
                  isEqual: () => false,
                  setItems: () => {},
                  getItems: () => []
                }}
              >
                <Select.Trigger>
                  {resolvedValueTypes.find(type => type.id === editedToken.resolvedValueTypeId)?.displayName || 'Select a value type...'}
                </Select.Trigger>
                <Select.Content>
                  {resolvedValueTypes.map(type => (
                    <Select.Item key={type.id} item={{ value: type.id, label: type.displayName }}>
                      {type.displayName}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Status</Field.Label>
              <Select.Root
                value={[editedToken.status || '']}
                onValueChange={(details) => {
                  const value = Array.isArray(details.value) ? details.value[0] : details.value;
                  setEditedToken(prev => ({ ...prev, status: value as TokenStatus }));
                }}
                collection={{
                  items: [
                    { value: 'experimental', label: 'Experimental' },
                    { value: 'stable', label: 'Stable' },
                    { value: 'deprecated', label: 'Deprecated' }
                  ],
                  options: {},
                  copy: () => ({ items: [], options: {} }),
                  isEqual: () => false,
                  setItems: () => {},
                  getItems: () => []
                }}
              >
                <Select.Trigger>
                  {editedToken.status || 'Select a status...'}
                </Select.Trigger>
                <Select.Content>
                  <Select.Item item={{ value: 'experimental', label: 'Experimental' }}>Experimental</Select.Item>
                  <Select.Item item={{ value: 'stable', label: 'Stable' }}>Stable</Select.Item>
                  <Select.Item item={{ value: 'deprecated', label: 'Deprecated' }}>Deprecated</Select.Item>
                </Select.Content>
              </Select.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Collection</Field.Label>
              <Select.Root
                value={[editedToken.tokenCollectionId]}
                onValueChange={(details) => {
                  const value = Array.isArray(details.value) ? details.value[0] : details.value;
                  setEditedToken(prev => ({ ...prev, tokenCollectionId: value }));
                }}
                collection={{
                  items: collections.map((collection: Collection) => ({
                    value: collection.id,
                    label: collection.displayName
                  })),
                  options: {},
                  copy: () => ({ items: [], options: {} }),
                  isEqual: () => false,
                  setItems: () => {},
                  getItems: () => []
                }}
              >
                <Select.Trigger>
                  {collections.find((c: Collection) => c.id === editedToken.tokenCollectionId)?.displayName || 'Select a collection...'}
                </Select.Trigger>
                <Select.Content>
                  {collections.map((collection: Collection) => (
                    <Select.Item key={collection.id} item={{ value: collection.id, label: collection.displayName }}>
                      {collection.displayName}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Taxonomies</Field.Label>
              <TaxonomyPicker
                taxonomies={filteredTaxonomies}
                selectedTaxonomies={editedToken.taxonomies || []}
                onChange={handleTaxonomyChange}
              />
            </Field.Root>
          </Stack>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorPalette="blue" onClick={handleSave}>
            {isNew ? 'Create' : 'Save'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
} 