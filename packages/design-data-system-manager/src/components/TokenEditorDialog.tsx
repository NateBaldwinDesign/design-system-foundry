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
  Textarea,
  FormControl,
  FormLabel,
  Select,
  Checkbox,
  IconButton,
  VStack,
  HStack,
  Flex,
  useColorMode,

  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay
} from '@chakra-ui/react';
import { 
  Trash2,
  PencilLine,
  Compass,
  Settings
} from 'lucide-react';
import { TokenValuePicker } from './TokenValuePicker';
import { ValueByModeTable } from './ValueByModeTable';
import { TaxonomyPicker } from './TaxonomyPicker';
import { PropertyTypePicker } from './PropertyTypePicker';
import { Token, Mode, Dimension, Platform, TokenStatus, TokenTaxonomyRef, ResolvedValueType, TokenValue, TokenCollection, Taxonomy } from '@token-model/data-model';
import type { PropertyType } from '@token-model/data-model/src/schema';
import { createUniqueId } from '../utils/id';
// Note: CodeSyntaxService has been removed as codeSyntax is no longer part of the schema
import { getDefaultValueForType, getValueTypeFromId } from '../utils/valueTypeUtils';
import { getValueTypeIcon } from '../utils/getValueTypeIcon';
import type { Schema as SchemaType } from '../hooks/useSchema';
import type { DataSourceContext } from '../services/dataSourceManager';
import { OverrideCreationService } from '../services/overrideCreationService';
import { OverrideTrackingService } from '../services/overrideTrackingService';
import { PlatformNamePreview } from './PlatformNamePreview';

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
  generatedByAlgorithm?: boolean;
  algorithmId?: string;
};

// Helper function to get a default token value based on schema
function getDefaultTokenValue(resolvedValueTypeId: string, schema: { resolvedValueTypes: ResolvedValueType[] } | null): TokenValue {
  if (!schema) {
    return { value: '' };
  }
  const defaultValue = getDefaultValueForType(resolvedValueTypeId, schema.resolvedValueTypes);
  return defaultValue;
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
  // NEW: Data source context for override creation
  dataSourceContext?: DataSourceContext;
}

// Helper function to filter taxonomies by value type
function filterTaxonomiesByValueType(taxonomies: Taxonomy[], resolvedValueTypeId: string): Taxonomy[] {
  return taxonomies.filter(taxonomy => 
    Array.isArray(taxonomy.resolvedValueTypeIds) && 
    taxonomy.resolvedValueTypeIds.includes(resolvedValueTypeId)
  );
}



// Add type for preserved values
type PreservedValue = {
  modeIds: string[];
  value: TokenValue;
  platformOverrides?: { platformId: string; value: string }[];
};

// Add type for the preserved values ref
type PreservedValuesRef = Record<string, Record<string, PreservedValue>>;

// Add utility function to filter property types based on resolved value type
const getFilteredPropertyTypes = (resolvedValueTypeId: string, resolvedValueTypes: ResolvedValueType[], standardPropertyTypes: PropertyType[]): PropertyType[] => {
  const resolvedValueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  if (!resolvedValueType) {
    // If resolved value type not found, return empty array
    return [];
  }

  // If this is a custom type (no standard type), handle specially
  if (!resolvedValueType.type) {
    // For custom types, check if there's a matching property type by ID pattern
    const matchingPropertyType = standardPropertyTypes.find(pt => 
      pt.id === resolvedValueTypeId || 
      pt.id === resolvedValueTypeId.replace(/_/g, '-') ||
      pt.id === resolvedValueTypeId.replace(/-/g, '_')
    );
    
    if (matchingPropertyType) {
      // Return the matching property type + both options
      return [
        {
          id: "ANY_PROPERTY",
          displayName: "Any Property (undefined)",
          category: "layout",
          compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
          inheritance: false
        },
        matchingPropertyType,
        {
          id: "ALL",
          displayName: "Select All",
          category: "layout",
          compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
          inheritance: false
        }
      ];
    } else {
      // Return only the options for custom types without matching property types
      return [
        {
          id: "ANY_PROPERTY",
          displayName: "Any Property (undefined)",
          category: "layout",
          compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
          inheritance: false
        },
        {
          id: "ALL",
          displayName: "Select All",
          category: "layout",
          compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
          inheritance: false
        }
      ];
    }
  }

  // For standard types, filter based on compatible value types
  // Note: PropertyType.compatibleValueTypes use hyphens (e.g., "font-family")
  // while ResolvedValueType.id uses underscores (e.g., "font_family")
  
  console.log('[getFilteredPropertyTypes] Debug filtering:', {
    resolvedValueTypeId,
    standardPropertyTypesCount: standardPropertyTypes.length,
    standardPropertyTypes: standardPropertyTypes.map(pt => ({
      id: pt.id,
      displayName: pt.displayName,
      compatibleValueTypes: pt.compatibleValueTypes
    }))
  });
  
  const compatiblePropertyTypes = standardPropertyTypes.filter(pt => 
    pt.compatibleValueTypes.includes(resolvedValueTypeId) ||
    pt.compatibleValueTypes.includes(resolvedValueTypeId.replace(/_/g, '-'))
  );

  // Define the special options
  const anyPropertyOption: PropertyType = {
    id: "ANY_PROPERTY",
    displayName: "Any Property (undefined)",
    category: "layout" as const,
    compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
    inheritance: false
  };

  const selectAllOption: PropertyType = {
    id: "ALL",
    displayName: "Select All",
    category: "layout" as const,
    compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
    inheritance: false
  };

  // If no compatible property types found for a standard type, treat as custom type
  if (compatiblePropertyTypes.length === 0) {
    // Check if there's a matching property type by ID pattern
    const matchingPropertyType = standardPropertyTypes.find(pt => 
      pt.id === resolvedValueTypeId || 
      pt.id === resolvedValueTypeId.replace(/_/g, '-') ||
      pt.id === resolvedValueTypeId.replace(/-/g, '_')
    );
    
    if (matchingPropertyType) {
      // Return matching property type + "Any Property" option only (no "Select All" for single option)
      return [
        anyPropertyOption,
        matchingPropertyType
      ];
    } else {
      // Return only "Any Property" option (no "Select All" for no options)
      return [anyPropertyOption];
    }
  }

  // Return compatible property types + options
  // Only include "Select All" if there are multiple compatible property types
  if (compatiblePropertyTypes.length > 1) {
    return [anyPropertyOption, ...compatiblePropertyTypes, selectAllOption];
  } else {
    return [anyPropertyOption, ...compatiblePropertyTypes];
  }
};

// Add utility function to get default property types for a resolved value type
const getDefaultPropertyTypes = (resolvedValueTypeId: string, resolvedValueTypes: ResolvedValueType[], standardPropertyTypes: PropertyType[]): PropertyType[] => {
  const resolvedValueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  if (!resolvedValueType || !resolvedValueType.type) {
    // If no type is specified, return empty array (no defaults)
    return [];
  }

  // Get filtered property types for this value type
  const filteredPropertyTypes = getFilteredPropertyTypes(resolvedValueTypeId, resolvedValueTypes, standardPropertyTypes);
  
  // For single-option types, return the first compatible property type
  // For multi-option types, return empty array (let user choose)
  const standardType = resolvedValueType.type;
  
  switch (standardType) {
    case 'FONT_FAMILY':
    case 'FONT_WEIGHT':
    case 'FONT_SIZE':
    case 'LINE_HEIGHT':
    case 'LETTER_SPACING':
    case 'DURATION':
    case 'CUBIC_BEZIER':
    case 'BLUR':
    case 'RADIUS':
      // For 1:1 relationships, return the first compatible property type
      return filteredPropertyTypes.slice(0, 1);
    default:
      // For multi-option types like COLOR and DIMENSION, return empty array
      return [];
  }
};

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

// Helper function to get the actual value string for debugging
const getActualValueString = (value: TokenValue | string): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value) {
    if ('value' in value) {
      return value.value;
    } else if ('tokenId' in value) {
      return `alias:${value.tokenId}`;
    }
  }
  return String(value);
};

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
    collections,
    dataSourceContext
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
    const newFilteredTaxonomies = filterTaxonomiesByValueType(taxonomies, editedToken.resolvedValueTypeId);
    setFilteredTaxonomies(newFilteredTaxonomies);

    // Filter out taxonomy assignments that are no longer valid for the new value type
    const validTaxonomyIds = new Set(newFilteredTaxonomies.map(t => t.id));
    const validTaxonomyEdits = taxonomyEdits.filter(edit => validTaxonomyIds.has(edit.taxonomyId));
    
    if (validTaxonomyEdits.length !== taxonomyEdits.length) {
      setTaxonomyEdits(validTaxonomyEdits);
    }
  }, [editedToken.resolvedValueTypeId, taxonomies]);

  // Update property types when resolvedValueTypeId changes
  useEffect(() => {
    const currentPropertyTypes = (editedToken.propertyTypes || []) as PropertyType[];
    const filteredPropertyTypes = getFilteredPropertyTypes(editedToken.resolvedValueTypeId, resolvedValueTypes, schema?.standardPropertyTypes || []);
    
    // Check if current property types are still valid for the new value type
    const validPropertyTypes = currentPropertyTypes.filter(pt => filteredPropertyTypes.includes(pt));
    
    // If no valid property types remain, set to default
    if (validPropertyTypes.length === 0) {
      const defaultPropertyTypes = getDefaultPropertyTypes(editedToken.resolvedValueTypeId, resolvedValueTypes, schema?.standardPropertyTypes || []);
      setEditedToken(prev => ({
        ...prev,
        propertyTypes: defaultPropertyTypes
      }));
    } else if (validPropertyTypes.length !== currentPropertyTypes.length) {
      // If some property types were filtered out, update to only valid ones
      setEditedToken(prev => ({
        ...prev,
        propertyTypes: validPropertyTypes
      }));
    }
  }, [editedToken.resolvedValueTypeId, resolvedValueTypes]);

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
      
      // For new tokens, preserve the unique ID that was generated in the initial state
      if (isNew) {
        setEditedToken(prev => ({
          ...newToken,
          id: prev.id // Preserve the unique ID from initial state
        }));
      } else {
        setEditedToken(newToken);
      }
      
      originalTokenRef.current = newToken;
      setTaxonomyEdits(Array.isArray(token.taxonomies) ? token.taxonomies : []);
      setActiveDimensionIds(dimensions.filter(d => d.required).map(d => d.id));

      // Note: codeSyntax has been removed from the schema - it's now generated on-demand
      
      // For new tokens, preserve the unique ID
      if (isNew) {
        setEditedToken(prev => ({
          ...newToken,
          id: prev.id // Preserve the unique ID
        }));
      } else {
        setEditedToken(newToken);
      }
    }
  }, [token, open, dimensions, platforms, taxonomies, isNew]);

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
    console.log('[handleToggleDimension] Starting dimension toggle:', {
      dimensionId,
      isActive: activeDimensionIds.includes(dimensionId),
      currentActiveDimensions: activeDimensionIds,
      currentValuesByMode: editedToken.valuesByMode.map(vbm => ({
        modeIds: vbm.modeIds,
        value: vbm.value,
        valueType: typeof vbm.value,
        actualValue: getActualValueString(vbm.value),
        valueString: JSON.stringify(vbm.value)
      }))
    });

    const isActive = activeDimensionIds.includes(dimensionId);
    let newActiveDims: string[];
    
    if (isActive) {
      // Removing a dimension - just update the active dimensions list
      console.log('[handleToggleDimension] Removing dimension:', dimensionId);
      newActiveDims = activeDimensionIds.filter((id: string) => id !== dimensionId);
      
      console.log('[handleToggleDimension] After removing dimension:', {
        newActiveDimensions: newActiveDims,
        valuesByMode: editedToken.valuesByMode.map(vbm => ({
          modeIds: vbm.modeIds,
          value: vbm.value,
          valueType: typeof vbm.value,
          actualValue: getActualValueString(vbm.value),
          valueString: JSON.stringify(vbm.value)
        }))
      });
    } else {
      // Adding a dimension - need to handle default mode mapping
      console.log('[handleToggleDimension] Adding dimension:', dimensionId);
      const dim = dimensions.find(d => d.id === dimensionId);
      if (!dim) {
        console.error('[handleToggleDimension] Dimension not found:', dimensionId);
        return;
      }
      
      newActiveDims = [...activeDimensionIds, dimensionId];
      const defaultModeId = dim.defaultMode;
      
      console.log('[handleToggleDimension] Adding dimension details:', {
        dimension: dim,
        defaultModeId,
        newActiveDimensions: newActiveDims
      });
      
      setEditedToken((prev: ExtendedToken) => {
        console.log('[handleToggleDimension] setEditedToken callback - initial state:', {
          prevValuesByMode: prev.valuesByMode.map(vbm => ({
            modeIds: vbm.modeIds,
            value: vbm.value,
            valueType: typeof vbm.value,
            actualValue: getActualValueString(vbm.value),
            valueString: JSON.stringify(vbm.value)
          }))
        });

        // If no dimensions were previously active, create values for each mode in the new dimension
        if (activeDimensionIds.length === 0) {
          console.log('[handleToggleDimension] No previous dimensions active, creating mode values');
          const globalValue = prev.valuesByMode.find(vbm => vbm.modeIds.length === 0);
          const newValuesByMode = dim.modes.map(mode => ({
            modeIds: [mode.id],
            value: globalValue ? globalValue.value : getDefaultTokenValue(prev.resolvedValueTypeId, { resolvedValueTypes }),
            platformOverrides: globalValue ? globalValue.platformOverrides : undefined
          }));
          
          console.log('[handleToggleDimension] Created new values for no previous dimensions:', {
            newValuesByMode: newValuesByMode.map(vbm => ({
              modeIds: vbm.modeIds,
              value: vbm.value,
              valueType: typeof vbm.value,
              actualValue: getActualValueString(vbm.value),
              valueString: JSON.stringify(vbm.value)
            }))
          });
          
          return {
            ...prev,
            valuesByMode: [...prev.valuesByMode, ...newValuesByMode]
          };
        }
        
        // For existing dimensions, map current values to the new dimension's default mode
        const newValuesByMode = [...prev.valuesByMode];
        
        // Get all current values that should be mapped to the default mode
        const currentValues = prev.valuesByMode.filter(vbm => isValueActive(vbm.modeIds));
        
        console.log('[handleToggleDimension] Current active values:', {
          currentValues: currentValues.map(vbm => ({
            modeIds: vbm.modeIds,
            value: vbm.value,
            valueType: typeof vbm.value,
            actualValue: getActualValueString(vbm.value),
            valueString: JSON.stringify(vbm.value)
          }))
        });
        
        // For each current value, create a new combination with the default mode
        currentValues.forEach(currentValue => {
          const newModeIds = [...currentValue.modeIds, defaultModeId].sort();
          const newValueKey = newModeIds.join(',');
          
          // Check if this combination already exists
          const exists = newValuesByMode.some(vbm => vbm.modeIds.slice().sort().join(',') === newValueKey);
          
          if (!exists) {
            console.log('[handleToggleDimension] Creating combinatory value:', {
              newModeIds,
              sourceValue: currentValue.value,
              sourceValueType: typeof currentValue.value,
              sourceActualValue: getActualValueString(currentValue.value),
              sourceValueString: JSON.stringify(currentValue.value)
            });
            
            newValuesByMode.push({
              modeIds: newModeIds,
              value: currentValue.value,
              platformOverrides: currentValue.platformOverrides
            });
          }
        });
        
        // ALSO create non-combinatory values for each mode in the new dimension
        // These should be synchronized with the default mode values
        dim.modes.forEach(mode => {
          const modeValueKey = [mode.id].join(',');
          const exists = newValuesByMode.some(vbm => vbm.modeIds.slice().sort().join(',') === modeValueKey);
          
          if (!exists) {
            // For the default mode, use the same value as the combinatory default combinations
            if (mode.id === defaultModeId) {
              // Find a combinatory value with this default mode to use as the base
              const combinatoryValue = newValuesByMode.find(vbm => 
                vbm.modeIds.includes(defaultModeId) && vbm.modeIds.length > 1
              );
              
              if (combinatoryValue) {
                console.log('[handleToggleDimension] Creating default mode value from combinatory:', {
                  modeId: mode.id,
                  sourceValue: combinatoryValue.value,
                  sourceValueType: typeof combinatoryValue.value,
                  sourceActualValue: getActualValueString(combinatoryValue.value),
                  sourceValueString: JSON.stringify(combinatoryValue.value)
                });
                
                newValuesByMode.push({
                  modeIds: [mode.id],
                  value: combinatoryValue.value,
                  platformOverrides: combinatoryValue.platformOverrides
                });
              } else {
                // Fallback to a current value or default
                const fallbackValue = currentValues.length > 0 ? currentValues[0].value : getDefaultTokenValue(prev.resolvedValueTypeId, { resolvedValueTypes });
                console.log('[handleToggleDimension] Creating default mode value with fallback:', {
                  modeId: mode.id,
                  fallbackValue,
                  fallbackValueType: typeof fallbackValue,
                  fallbackActualValue: getActualValueString(fallbackValue),
                  fallbackValueString: JSON.stringify(fallbackValue)
                });
                
                newValuesByMode.push({
                  modeIds: [mode.id],
                  value: fallbackValue,
                  platformOverrides: currentValues.length > 0 ? currentValues[0].platformOverrides : undefined
                });
              }
            } else {
              // For non-default modes, start with default value (will be empty with "Add value" button)
              const defaultValue = getDefaultTokenValue(prev.resolvedValueTypeId, { resolvedValueTypes });
              console.log('[handleToggleDimension] Creating non-default mode value:', {
                modeId: mode.id,
                defaultValue,
                defaultValueType: typeof defaultValue,
                defaultActualValue: getActualValueString(defaultValue),
                defaultValueString: JSON.stringify(defaultValue)
              });
              
              newValuesByMode.push({
                modeIds: [mode.id],
                value: defaultValue,
                platformOverrides: undefined
              });
            }
          }
        });
        
        console.log('[handleToggleDimension] Final valuesByMode after adding dimension:', {
          finalValuesByMode: newValuesByMode.map(vbm => ({
            modeIds: vbm.modeIds,
            value: vbm.value,
            valueType: typeof vbm.value,
            actualValue: getActualValueString(vbm.value),
            valueString: JSON.stringify(vbm.value)
          }))
        });
        
        return {
          ...prev,
          valuesByMode: newValuesByMode
        };
      });
    }
    
    setActiveDimensionIds(newActiveDims);
  };

  // Helper to check if a value's modeIds are valid for the current active dimensions
  const isValueActive = (modeIds: string[]): boolean => {
    console.log('[isValueActive] Checking value:', {
      modeIds,
      activeDimensionIds,
      dimensions: dimensions.map(d => ({ id: d.id, modes: d.modes.map(m => m.id) }))
    });
    
    if (activeDimensionIds.length === 0) {
      const result = modeIds.length === 0;
      console.log('[isValueActive] No active dimensions, result:', result);
      return result;
    }
    const activeModeIds = dimensions
      .filter(d => activeDimensionIds.includes(d.id))
      .flatMap(d => d.modes.map(m => m.id));
    const result = modeIds.every(id => activeModeIds.includes(id)) &&
      modeIds.length === activeDimensionIds.length;
    
    console.log('[isValueActive] Result:', {
      activeModeIds,
      modeIds,
      everyIdActive: modeIds.every(id => activeModeIds.includes(id)),
      lengthMatch: modeIds.length === activeDimensionIds.length,
      finalResult: result
    });
    
    return result;
  };

  // When adding a value, always add to the superset
  const handleAddValue = (modeIds: string[], value: TokenValue) => {
    setEditedToken((prev: ExtendedToken) => {
      // If a value for this modeIds already exists, replace it
      const exists = prev.valuesByMode.some(vbm => vbm.modeIds.slice().sort().join(',') === modeIds.slice().sort().join(','));
      let newValuesByMode;
      if (exists) {
        newValuesByMode = prev.valuesByMode.map(vbm =>
          vbm.modeIds.slice().sort().join(',') === modeIds.slice().sort().join(',')
            ? { ...vbm, value }
            : vbm
        );
      } else {
        newValuesByMode = [...prev.valuesByMode, { modeIds, value }];
      }
      return { ...prev, valuesByMode: newValuesByMode };
    });
  };

  // When deleting a value, only remove from the superset if it matches the current active dimensions
  const handleDeleteValue = (modeIds: string[]) => {
    setEditedToken((prev: ExtendedToken) => ({
      ...prev,
      valuesByMode: prev.valuesByMode.filter(vbm => vbm.modeIds.slice().sort().join(',') !== modeIds.slice().sort().join(','))
    }));
  };

  // Filter values for display based on active dimensions
  const displayedValuesByMode = editedToken.valuesByMode.filter(vbm => isValueActive(vbm.modeIds));

  console.log('[TokenEditorDialog] Displayed values calculation:', {
    allValuesByMode: editedToken.valuesByMode.map(vbm => ({
      modeIds: vbm.modeIds,
      value: vbm.value,
      valueType: typeof vbm.value,
      actualValue: getActualValueString(vbm.value),
      valueString: JSON.stringify(vbm.value),
      isActive: isValueActive(vbm.modeIds)
    })),
    displayedValuesByMode: displayedValuesByMode.map(vbm => ({
      modeIds: vbm.modeIds,
      value: vbm.value,
      valueType: typeof vbm.value,
      actualValue: getActualValueString(vbm.value),
      valueString: JSON.stringify(vbm.value)
    }))
  });

  // Update getValueEditor to use schema-driven value handling
  const getValueEditor = (
    value: TokenValue | string,
    modeIds: string[],
    isOverride?: boolean,
    onChange?: (newValue: TokenValue) => void
  ): React.ReactNode => {
    console.log('[getValueEditor] Processing value:', {
      value,
      valueType: typeof value,
      actualValue: typeof value === 'string' ? value : getActualValueString(value),
      valueString: JSON.stringify(value),
      modeIds,
      isOverride
    });
    
    if (typeof value === 'string') {
      console.log('[getValueEditor] Value is string, displaying as text:', value);
      return <Text fontSize="sm" color="gray.500">{value}</Text>;
    }
    
    console.log('[getValueEditor] Value is object, using TokenValuePicker:', {
      value,
      valueType: typeof value,
      actualValue: getActualValueString(value),
      valueKeys: value ? Object.keys(value) : 'null/undefined'
    });
    
    return (
      <TokenValuePicker
        value={value}
        tokens={tokens}
        excludeTokenId={editedToken.id}
        modes={modeIds}
        resolvedValueTypeId={editedToken.resolvedValueTypeId}
        resolvedValueTypes={resolvedValueTypes}
        onChange={(newValue: TokenValue) => {
          console.log('[getValueEditor] TokenValuePicker onChange:', {
            newValue,
            newValueType: typeof newValue,
            newActualValue: getActualValueString(newValue),
            newValueString: JSON.stringify(newValue)
          });
          
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

  // On save, filter valuesByMode to only include those matching the current active dimensions/modes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[TokenEditorDialog] handleSave called with editedToken:', editedToken);

    // Validate collection compatibility only if a collection is selected
    if (editedToken.tokenCollectionId) {
      const collectionErrors = validateTokenCollectionCompatibility(editedToken, collections, resolvedValueTypes);
      if (collectionErrors.length > 0) {
        console.log('[TokenEditorDialog] Collection validation errors:', collectionErrors);
        setCollectionErrors(collectionErrors);
        return;
      }
    }

    // Ensure tokenTier is one of the allowed values
    if (editedToken.tokenTier && !['PRIMITIVE', 'SEMANTIC', 'COMPONENT'].includes(editedToken.tokenTier)) {
      editedToken.tokenTier = 'PRIMITIVE';
    }

    // Note: codeSyntax generation is now handled by the CodeSyntaxGenerator service
    
    // Create the final token object, omitting tokenCollectionId if it's not set
    const finalToken = editedToken.tokenCollectionId 
      ? editedToken 
      : (() => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { tokenCollectionId, ...rest } = editedToken;
          return rest;
        })();

    const filteredValuesByMode = editedToken.valuesByMode.filter(vbm => isValueActive(vbm.modeIds));
    const updatedToken = {
      ...finalToken,
      valuesByMode: filteredValuesByMode,
      taxonomies: taxonomyEdits
    };

    // Note: codeSyntax has been removed from the schema - it's now generated on-demand

    console.log('[TokenEditorDialog] Calling onSave with token:', updatedToken);
    
    // NEW: Create override if in edit mode for platform/theme
    if (dataSourceContext?.editMode.isActive && dataSourceContext.editMode.sourceType !== 'core') {
      const originalToken = tokens.find(t => t.id === token.id) || null;
      const overrideResult = OverrideCreationService.createOverrideForContext(
        updatedToken,
        originalToken,
        dataSourceContext
      );
      
      if (!overrideResult.success) {
        console.error('[TokenEditorDialog] Override creation failed:', overrideResult.error);
        // TODO: Show error to user
        return;
      }
      
      if (overrideResult.overrideData) {
        console.log('[TokenEditorDialog] Override created:', overrideResult.overrideData);
        // Store override data for later commit
        OverrideTrackingService.addOverride(
          updatedToken.id,
          overrideResult.overrideData,
          overrideResult.changes
        );
      }
    }
    
    onSave(updatedToken);
    onClose();
  };

  function handleTaxonomyChange(newTaxonomies: TokenTaxonomyRef[]) {
    setTaxonomyEdits(newTaxonomies);
    setEditedToken((prev: ExtendedToken) => ({
      ...prev,
      taxonomies: newTaxonomies
    }));
  }

  // Note: codeSyntax validation has been removed as codeSyntax is no longer part of the schema

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

  const handleStatusChange = (newStatus: TokenStatus) => {
    setEditedToken((prev: ExtendedToken) => ({
      ...prev,
      status: newStatus
    }));
  };



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
    // Note: Theme overrides are not currently supported in the schema
    // if (schema?.themes) {
    //   schema.themes.forEach(theme => {
    //     if (theme.overrides?.tokenOverrides?.some(o => o.tokenId === token.id)) {
    //       references.themeOverrides.push(theme.id);
    //     }
    //   });
    // }

    return references;
  };

  const handleDeleteConfirm = () => {
    onDeleteToken(token.id);
    setIsDeleteDialogOpen(false);
    onClose();
  };

  const references = findTokenReferences();
  const hasReferences = Object.values(references).some(arr => arr.length > 0);

  // Clear preserved values and original token ref when dialog opens for a new token
  useEffect(() => {
    if (open) {
      preservedValuesByRemovedDimension.current = {};
      originalTokenRef.current = null;
    }
  }, [open, token.id]);

  return (
    <>
      <Modal isOpen={open} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent maxW="1200px">
          <ModalHeader>
            {isNew ? 'Create Token' : `Edit Token: ${editedToken.displayName}`}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack gap={6} align="stretch">
              {/* Settings Section */}
              <Box>
                <HStack gap={2} align="center" mb={3}>
                  <Settings size={24} />
                  <Text fontSize="lg" fontWeight="bold">Settings</Text>
                </HStack>
                <Box
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                  <Flex gap={6} align="flex-start">
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
                    <FormControl>
                      <FormLabel>Collection</FormLabel>
                      <Select
                        value={editedToken.tokenCollectionId || ''}
                        onChange={e => {
                          const newValue = e.target.value;
                          setEditedToken(prev => {
                            if (!newValue) {
                              // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                        <option value="">Auto-select</option>
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

                    </FormControl>
                    <FormControl>
                      <FormLabel>Release status</FormLabel>
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
                    <FormControl>
                      <FormLabel>Editability</FormLabel>
                      <HStack spacing={6} align="stretch" flex={1}>
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
                      </HStack>
                    </FormControl>
                  </Flex>
                </Box>
              </Box>

              {/* Naming Section */}
              <Box>
                <HStack gap={2} align="center" mb={3}>
                  <PencilLine size={24} />
                  <Text fontSize="lg" fontWeight="bold">Naming</Text>
                </HStack>
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
                    
                    {/* Taxonomies and Generated names side by side */}
                    <Flex gap={6} align="flex-start">
                      {/* Taxonomies section (left column) */}
                      <Box flex={1} minW={0}>
                        <FormControl isRequired>
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
                      
                      {/* Platform name preview using the new service */}
                      <PlatformNamePreview
                        token={editedToken}
                        platforms={platforms}
                        taxonomies={taxonomies}
                        dataSourceContext={dataSourceContext}
                      />
                    </Flex>
                  </VStack>
                </Box>
              </Box>

              {/* Usage & Context Section */}
              <Box>
                <HStack gap={2} align="center" mb={3}>
                  <Compass size={24} />
                  <Text fontSize="lg" fontWeight="bold">Usage &amp; Context</Text>
                </HStack>
                <Box
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                  <Flex gap={6} align="flex-start">
                    {/* Description section (left column) */}
                    <Box flex={1} minW={0}>
                      <FormControl>
                        <FormLabel>Description</FormLabel>
                        <Textarea
                          value={editedToken.description || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedToken((prev: ExtendedToken) => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter a description for this token..."
                          rows={4}
                          resize="vertical"
                        />
                      </FormControl>
                    </Box>
                    
                    {/* Property types section (right column) */}
                    <Box flex={1} minW={0}>
                      <PropertyTypePicker
                        value={(editedToken.propertyTypes || []) as PropertyType[]}
                        onChange={(propertyTypes) => setEditedToken((prev: ExtendedToken) => ({ ...prev, propertyTypes }))}
                        availablePropertyTypes={getFilteredPropertyTypes(editedToken.resolvedValueTypeId, resolvedValueTypes, schema?.standardPropertyTypes || [])}
                      />
                    </Box>
                  </Flex>
                </Box>
              </Box>



              {/* Values Section */}
              <Box>
                <HStack gap={2} align="center" mb={3}>
                  {getValueTypeIcon(valueTypeType)}
                  <Text fontSize="lg" fontWeight="bold">Values</Text>
                </HStack>
                
                {/* Alert for algorithm-generated tokens */}
                {token.generatedByAlgorithm && token.algorithmId && (
                  <Alert status="info" borderRadius="md" mb={3}>
                    <AlertIcon />
                    <Box flex={1}>
                      <Text fontWeight="bold">
                        Values generated by algorithm
                      </Text>
                      <Text fontSize="sm">
                        This token&apos;s values are automatically generated by the algorithm &ldquo;{token.algorithmId}&rdquo;. 
                        To modify the values, edit the algorithm instead.
                      </Text>
                    </Box>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => {
                        // Navigate to algorithm editor with the specific algorithm
                        window.location.href = `/tokens/algorithms?edit=${token.algorithmId}`;
                      }}
                    >
                      Edit Algorithm
                    </Button>
                  </Alert>
                )}
                
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
                          isDisabled={token.generatedByAlgorithm}
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
                              isDisabled={token.generatedByAlgorithm}
                            />
                            <IconButton
                              aria-label="Remove value"
                              icon={<Trash2 />}
                              onClick={() => setEditedToken((prev: ExtendedToken) => ({
                                ...prev,
                                valuesByMode: prev.valuesByMode.filter(vbm => !(Array.isArray(vbm.modeIds) && vbm.modeIds.length === 0))
                              }))}
                              isDisabled={token.generatedByAlgorithm}
                            />
                          </HStack>
                        );
                      })()
                    ) : (
                      <ValueByModeTable
                        valuesByMode={displayedValuesByMode}
                        modes={modes}
                        dimensions={dimensions.filter(d => activeDimensionIds.includes(d.id))}
                        getValueEditor={getValueEditor}
                        onDeleteValue={handleDeleteValue}
                        resolvedValueTypeId={editedToken.resolvedValueTypeId}
                        resolvedValueTypes={resolvedValueTypes}
                        onAddValue={handleAddValue}
                        isDisabled={token.generatedByAlgorithm}
                      />
                    )}
                  </VStack>
                </Box>
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Flex width="100%" justify="space-between">
              {!isNew && (
                <Button
                  colorScheme="red"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Delete
                </Button>
              )}
              <HStack spacing={3}>
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={handleSave}>
                  {isNew ? 'Create' : 'Save'}
                </Button>
              </HStack>
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
                  Delete &ldquo;{token.displayName}&rdquo;?
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
                  <FormLabel>Type &ldquo;Delete&rdquo; to confirm</FormLabel>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type Delete to confirm"
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
                colorScheme="orange"
                onClick={() => {
                  // Deprecate the token
                  const deprecatedToken = {
                    ...editedToken,
                    status: 'deprecated' as TokenStatus
                  };
                  onSave(deprecatedToken);
                  setIsDeleteDialogOpen(false);
                  onClose();
                }}
                ml={3}
              >
                Deprecate
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                ml={3}
                isDisabled={deleteConfirmText !== 'Delete'}
              >
                Yes, delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
} 