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
  AlertIcon,
  Collapse,
  useDisclosure,
  Tab,
  TabList,
  Tabs,
  TabPanel,
  TabPanels,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay
} from '@chakra-ui/react';
import { 
  Trash2, 
  ChevronDown, 
  MonitorSmartphone, 
  Tags, 
  Palette, 
  Ruler, 
  PencilRuler,
  Type,
  Timer,
  Circle,
  Expand,
  Minus,
  Plus,
  MoveHorizontal,
  MoveVertical,
  SquareRoundCorner
} from 'lucide-react';
import { ValueByModeTable } from './ValueByModeTable';
import { TokenValuePicker } from './TokenValuePicker';
import { TaxonomyPicker } from './TaxonomyPicker';
import { Token, Mode, Dimension, Platform, TokenStatus, TokenTaxonomyRef, ResolvedValueType, TokenValue, validateToken, TokenCollection } from '@token-model/data-model';
import { createUniqueId } from '../utils/id';
import { useSchema } from '../hooks/useSchema';
import { CodeSyntaxService, ensureCodeSyntaxArrayFormat } from '../services/codeSyntax';
import { getDefaultValueForType, getValueTypeFromId } from '../utils/valueTypeUtils';
import { getValueTypeIcon } from '../utils/getValueTypeIcon';
import type { Schema as SchemaType } from '../hooks/useSchema';

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

// Update ExtendedToken type to include tokenTier
export type ExtendedToken = Omit<Token, 'valuesByMode'> & {
  valuesByMode: ValueByMode[];
  tokenTier?: 'PRIMITIVE' | 'SEMANTIC' | 'COMPONENT';
};

// Helper function to get a default token value based on schema
function getDefaultTokenValue(resolvedValueTypeId: string, schema: { resolvedValueTypes: ResolvedValueType[] } | null): TokenValue {
  if (!schema) {
    return { value: '' };
  }
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
  schema: SchemaType | null;
  onDeleteToken: (tokenId: string) => void;
  collections: TokenCollection[];
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
  const modeCombinationsWithOverrides = valuesByMode.filter(vbm => {
    const hasOverride = vbm.platformOverrides?.some(po => po.platformId === platformId);
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
  const transformedOverrides = modeCombinationsWithOverrides.map(vbm => {
    const override = vbm.platformOverrides?.find(po => po.platformId === platformId);
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

// Add validation functions since they're not exported from data-model
function validateTokenCollectionCompatibility(
  token: Token,
  collections: TokenCollection[],
  resolvedValueTypes: ResolvedValueType[]
): string[] {
  const errors: string[] = [];
  if (!token.tokenCollectionId) return errors;
  const collection = (collections ?? []).find(c => c.id === token.tokenCollectionId);
  if (!collection) {
    errors.push(`Token '${token.displayName}' references non-existent collection id '${token.tokenCollectionId}'`);
    return errors;
  }
  if (!collection.resolvedValueTypeIds.includes(token.resolvedValueTypeId)) {
    errors.push(
      `Token '${token.displayName}' has type '${resolvedValueTypes.find(t => t.id === token.resolvedValueTypeId)?.displayName || token.resolvedValueTypeId}' which is not supported by collection '${collection.name}'`
    );
  }
  return errors;
}

function findCompatibleCollection(
  token: Token,
  collections: TokenCollection[]
): TokenCollection | undefined {
  return collections.find(c => c.resolvedValueTypeIds.includes(token.resolvedValueTypeId));
}

// Update schema types
interface TokenGroup {
  id: string;
  name: string;
  description?: string;
  tokenCollectionId: string;
  tokens: Token[];
}

interface TokenVariant {
  id: string;
  name: string;
  description?: string;
  tokenCollectionId: string;
  tokens: Token[];
}

interface Theme {
  id: string;
  name: string;
  description?: string;
  overrides?: {
    tokenOverrides?: Array<{
      tokenId: string;
      value: string;
    }>;
  };
}

// Update Schema type to include namingRules
interface Schema extends SchemaType {
  extensions?: {
    tokenGroups?: TokenGroup[];
    tokenVariants?: Record<string, TokenVariant>;
  };
  themes?: Theme[];
  namingRules?: Record<string, unknown>;
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
    onViewClassifications,
    schema,
    onDeleteToken,
    collections
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
        const originalValues = prev.valuesByMode.reduce((acc, vbm) => {
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

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [collectionErrors, setCollectionErrors] = useState<string[]>([]);

  // Add effect to validate collection compatibility when tokenCollectionId or resolvedValueTypeId changes
  useEffect(() => {
    if (editedToken.tokenCollectionId) {
      const errors = validateTokenCollectionCompatibility(editedToken, collections, resolvedValueTypes);
      setCollectionErrors(errors);
    } else {
      setCollectionErrors([]);
    }
  }, [editedToken.tokenCollectionId, editedToken.resolvedValueTypeId, collections, resolvedValueTypes]);

  // Add function to find compatible collections
  const getCompatibleCollections = () => {
    console.debug('[TokenEditorDialog] Collections:', collections);
    console.debug('[TokenEditorDialog] Current resolvedValueTypeId:', editedToken.resolvedValueTypeId);
    
    if (!collections || !editedToken.resolvedValueTypeId) {
      return [];
    }

    const compatibleCollections = collections.filter(c => {
      const isCompatible = c.resolvedValueTypeIds.includes(editedToken.resolvedValueTypeId);
      console.debug(`[TokenEditorDialog] Collection ${c.name} (${c.id}) compatible:`, isCompatible);
      return isCompatible;
    });

    console.debug('[TokenEditorDialog] Compatible collections:', compatibleCollections);
    return compatibleCollections;
  };

  // Update handleSave to use schema validation
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validate collection compatibility only if a collection is selected
    if (editedToken.tokenCollectionId) {
      const collectionErrors = validateTokenCollectionCompatibility(editedToken, collections, resolvedValueTypes);
      if (collectionErrors.length > 0) {
        setCollectionErrors(collectionErrors);
        return;
      }
    }

    // Ensure tokenTier is one of the allowed values
    if (editedToken.tokenTier && !['PRIMITIVE', 'SEMANTIC', 'COMPONENT'].includes(editedToken.tokenTier)) {
      editedToken.tokenTier = 'PRIMITIVE';
    }

    // Compose schema for codeSyntax generation
    const codeSyntaxSchema = { 
      platforms, 
      taxonomies, 
      namingRules: schema?.namingRules || { taxonomyOrder: [] } 
    };
    
    // Create the final token object, omitting tokenCollectionId if it's not set
    const finalToken = editedToken.tokenCollectionId 
      ? editedToken 
      : (() => {
          const { tokenCollectionId, ...rest } = editedToken;
          return rest;
        })();

    const updatedToken = {
      ...finalToken,
      taxonomies: taxonomyEdits,
      codeSyntax: CodeSyntaxService.generateAllCodeSyntaxes(
        finalToken,
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

  const { isOpen, onToggle } = useDisclosure();

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

    // Check for references in other tokens
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
        if (group.tokens.some(t => t.id === token.id)) {
          references.groups.push(group.id);
        }
      });
    }

    // Check for references in token variants
    if (schema?.extensions?.tokenVariants) {
      Object.entries(schema.extensions.tokenVariants).forEach(([variantId, variant]) => {
        if (variant.tokens.some(t => t.id === token.id)) {
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

  return (
    <>
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
                            valuesByMode: [{ modeIds: [], value: getDefaultTokenValue(newType, { resolvedValueTypes }) }]
                          }));
                        }}
                      >
                        {resolvedValueTypes.map((vt: ResolvedValueType) => (
                          <option key={vt.id} value={vt.id}>
                            {vt.displayName}
                          </option>
                        ))}
                      </Select>
                      {editedToken.resolvedValueTypeId && (
                        <Text fontSize="sm" color="gray.500" mt={1}>
                          {resolvedValueTypes.find((vt: ResolvedValueType) => vt.id === editedToken.resolvedValueTypeId)?.description}
                        </Text>
                      )}
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Token Tier</FormLabel>
                      <Select
                        value={editedToken.tokenTier || 'PRIMITIVE'}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          setEditedToken((prev: ExtendedToken) => ({
                            ...prev,
                            tokenTier: e.target.value as 'PRIMITIVE' | 'SEMANTIC' | 'COMPONENT'
                          }));
                        }}
                      >
                        <option value="PRIMITIVE">Primitive</option>
                        <option value="SEMANTIC">Semantic</option>
                        <option value="COMPONENT">Component</option>
                      </Select>
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
                    {/* Update collection selection to be optional */}
                    <FormControl>
                      <FormLabel>Collection</FormLabel>
                      <Select
                        value={editedToken.tokenCollectionId || ''}
                        onChange={e => {
                          const newValue = e.target.value;
                          setEditedToken(prev => {
                            if (!newValue) {
                              const { tokenCollectionId, ...rest } = prev;
                              return rest as ExtendedToken;
                            }
                            return {
                              ...prev,
                              tokenCollectionId: newValue
                            };
                          });
                        }}
                      >
                        <option value="">Select a collection</option>
                        {getCompatibleCollections().map(collection => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </Select>
                      {collectionErrors.length > 0 && (
                        <Alert status="error" mt={2}>
                          <AlertIcon />
                          <VStack align="start" spacing={1}>
                            {collectionErrors.map((error, index) => (
                              <Text key={index} fontSize="sm">{error}</Text>
                            ))}
                          </VStack>
                        </Alert>
                      )}
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        If no collection is selected, a compatible collection will be automatically assigned.
                      </Text>
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
              <HStack gap={2} align="center" mt={3}>
                <Tags size={24} />
                <Text fontSize="lg" fontWeight="bold">Classification</Text>
              </HStack>
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
                        Taxonomies 
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
              <HStack gap={2} align="center" mt={3}>
                {getValueTypeIcon(valueTypeType)}
                <Text fontSize="lg" fontWeight="bold">Values</Text>
              </HStack>
              <Box
                p={3}
                borderWidth={1}
                borderRadius="md"
                bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
              >
                <VStack gap={8} justify="flex-start" align="stretch">
                  <HStack gap={4} align="center" width="100%">
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
                        <HStack gap={2} width="100%">
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
                      dimensions={dimensions.filter(d => activeDimensionIds.includes(d.id))}
                      getValueEditor={getValueEditor}
                      onDeleteValue={(modeIds: string[]) => {
                        setEditedToken((prev: ExtendedToken) => ({
                          ...prev,
                          valuesByMode: prev.valuesByMode.filter(vbm => 
                            vbm.modeIds.slice().sort().join(',') !== modeIds.slice().sort().join(',')
                          )
                        }));
                      }}
                      resolvedValueTypeId={editedToken.resolvedValueTypeId}
                      resolvedValueTypes={resolvedValueTypes}
                      onAddValue={(modeIds: string[], value: TokenValue) => {
                        setEditedToken((prev: ExtendedToken) => ({
                          ...prev,
                          valuesByMode: [
                            ...prev.valuesByMode,
                            { modeIds, value }
                          ]
                        }));
                      }}
                    />
                  )}

                  
                </VStack>
              </Box>
              <Box>
                <VStack gap={2} justify="flex-start" align="stretch">
                  {/* Platform Overrides as a nested box */}
                  <Button
                    variant="ghost"
                    onClick={onToggle}
                    width="fit-content"
                    gap={2}
                    justifyContent="space-between"
                    mb={2}
                  >
                    <MonitorSmartphone size={24} />
                    <Text fontSize="md" fontWeight="bold">Platform overrides</Text>
                    <ChevronDown size={16}
                      style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s'
                      }}
                    />
                  </Button>
                  <Collapse in={isOpen} animateOpacity>
                    <Box
                      p={3}
                      borderWidth={1}
                      borderRadius="md"
                      bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                      borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                    >
                      <Tabs size="sm">
                        <TabList>
                          {platforms.map(platform => (
                            <Tab key={platform.id}>{platform.displayName}</Tab>
                          ))}
                        </TabList>
                        <TabPanels>
                          {platforms.map(platform => {
                            console.log('Rendering tab for platform:', platform.id);
                            const platformOverrides = getPlatformOverridesForTable(
                              editedToken.valuesByMode,
                              platform.id,
                              modes,
                              dimensions.filter(d => activeDimensionIds.includes(d.id)),
                              editedToken.resolvedValueTypeId,
                              resolvedValueTypes
                            );
                            console.log('Platform overrides for table:', platformOverrides);

                            return (
                              <TabPanel key={platform.id}>
                                {platformOverrides.length > 0 ? (
                                  <ValueByModeTable
                                    valuesByMode={platformOverrides}
                                    modes={modes}
                                    dimensions={dimensions.filter(d => activeDimensionIds.includes(d.id))}
                                    getValueEditor={(value: TokenValue | string, modeIds: string[], isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => 
                                      getPlatformOverrideValueEditor(value, modeIds, platform.id, isOverride, onChange)
                                    }
                                    onDeleteValue={(modeIds: string[]) => {
                                      console.log('Deleting override for modeIds:', modeIds);
                                      setEditedToken((prev: ExtendedToken) => {
                                        const updatedValuesByMode = prev.valuesByMode.map(vbm => {
                                          if (vbm.modeIds.slice().sort().join(',') === modeIds.slice().sort().join(',')) {
                                            return {
                                              ...vbm,
                                              platformOverrides: vbm.platformOverrides?.filter(po => po.platformId !== platform.id)
                                            };
                                          }
                                          return vbm;
                                        });
                                        return {
                                          ...prev,
                                          valuesByMode: updatedValuesByMode
                                        };
                                      });
                                    }}
                                    resolvedValueTypeId={editedToken.resolvedValueTypeId}
                                    resolvedValueTypes={resolvedValueTypes}
                                    onAddValue={(modeIds: string[], value: TokenValue) => {
                                      console.log('Adding override for modeIds:', modeIds, value);
                                      setEditedToken((prev: ExtendedToken) => {
                                        const updatedValuesByMode = prev.valuesByMode.map(vbm => {
                                          if (vbm.modeIds.slice().sort().join(',') === modeIds.slice().sort().join(',')) {
                                            return {
                                              ...vbm,
                                              platformOverrides: [
                                                ...(vbm.platformOverrides || []).filter(po => po.platformId !== platform.id),
                                                {
                                                  platformId: platform.id,
                                                  value: JSON.stringify(value)
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
                                    }}
                                  />
                                ) : (
                                  <Box textAlign="center" py={4}>
                                    <Text color="gray.500">No overrides for this platform</Text>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      mt={2}
                                      onClick={() => {
                                        // Add a default override for the first mode combination
                                        setEditedToken((prev: ExtendedToken) => ({
                                          ...prev,
                                          valuesByMode: prev.valuesByMode.map((vbm, index) => {
                                            if (index === 0) {
                                              return {
                                                ...vbm,
                                                platformOverrides: [
                                                  ...(vbm.platformOverrides || []),
                                                  {
                                                    platformId: platform.id,
                                                    value: JSON.stringify(getDefaultTokenValue(prev.resolvedValueTypeId, { resolvedValueTypes }))
                                                  }
                                                ]
                                              };
                                            }
                                            return vbm;
                                          })
                                        }));
                                      }}
                                    >
                                      Add override
                                    </Button>
                                  </Box>
                                )}
                              </TabPanel>
                            );
                          })}
                        </TabPanels>
                      </Tabs>
                    </Box>
                  </Collapse>
                </VStack>
              </Box>

              
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Flex width="100%" justify="space-between">
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleSave}>
                {isNew ? 'Create' : 'Save'}
              </Button>
            </Flex>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={deleteDialogCancelRef}
        onClose={() => setIsDeleteDialogOpen(false)}
        isCentered
      >
        <AlertDialogOverlay
          bg="blackAlpha.300"
          backdropFilter="blur(2px)"
        >
          <AlertDialogContent
            maxW="500px"
            mx="auto"
            my="auto"
            borderRadius="lg"
            boxShadow="xl"
          >
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Token
            </AlertDialogHeader>

            <AlertDialogBody>
              <VStack align="stretch" spacing={4}>
                <Text>
                  Are you sure you want to delete the token &ldquo;{token.displayName}&rdquo;? This action cannot be undone.
                </Text>

                {hasReferences && (
                  <Alert status="warning" borderRadius="md">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="bold">Warning: This token is referenced in:</Text>
                      {references.aliases.length > 0 && (
                        <Text>• {references.aliases.length} other token(s) as aliases</Text>
                      )}
                      {references.groups.length > 0 && (
                        <Text>• {references.groups.length} token group(s)</Text>
                      )}
                      {references.variants.length > 0 && (
                        <Text>• {references.variants.length} token variant(s)</Text>
                      )}
                      {references.themeOverrides.length > 0 && (
                        <Text>• {references.themeOverrides.length} theme override(s)</Text>
                      )}
                    </VStack>
                  </Alert>
                )}

                <FormControl>
                  <FormLabel>Type "delete" to confirm</FormLabel>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type delete to confirm"
                    autoFocus
                  />
                </FormControl>
              </VStack>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={deleteDialogCancelRef} onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                ml={3}
                isDisabled={deleteConfirmText !== 'delete'}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
} 