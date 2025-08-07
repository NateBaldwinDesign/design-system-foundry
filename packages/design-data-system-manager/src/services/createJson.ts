import { StorageService } from './storage';
import { validateTokenSystem } from '@token-model/data-model';
import type { ResolvedValueType, TokenCollection, Token, Dimension, Platform, Theme, Taxonomy } from '@token-model/data-model';
import type { Algorithm } from '../types/algorithm';

/**
 * Reconstructs a schema-compliant JSON object from localStorage.
 * Returns an object matching the @schema.json structure.
 */
export function createSchemaJsonFromLocalStorage() {
  // Read all relevant data from localStorage
  const tokenCollections = StorageService.getCollections() as TokenCollection[];
  const tokens = StorageService.getTokens() as Token[];
  const dimensions = StorageService.getDimensions() as Dimension[];
  const platforms = StorageService.getPlatforms() as Platform[];
  const themes = StorageService.getThemes() as Theme[];
  const taxonomies = StorageService.getTaxonomies() as Taxonomy[];
  const resolvedValueTypes = StorageService.getValueTypes() as (string | ResolvedValueType)[];
  const taxonomyOrder = StorageService.getTaxonomyOrder();
  const dimensionOrder = JSON.parse(localStorage.getItem('token-model:dimension-order') || '[]') as string[];
  const figmaConfiguration = StorageService.getFigmaConfiguration();

  // Read root-level data from localStorage
  const rootData = StorageService.getRootData();
  const {
    systemName = 'Design System',
    systemId = 'design-system',
    description = 'A comprehensive design system with tokens, dimensions, and themes',
    version = '1.0.0',
    versionHistory = []
  } = rootData;

  // Compose versionHistory if not present
  const normalizedVersionHistory = (Array.isArray(versionHistory) && versionHistory.length > 0) ? versionHistory.map(vh => ({
    ...vh,
    migrationStrategy: vh.migrationStrategy ? {
      ...vh.migrationStrategy,
      emptyModeIds: ['mapToDefaults', 'preserveEmpty', 'requireExplicit'].includes(vh.migrationStrategy.emptyModeIds)
        ? (vh.migrationStrategy.emptyModeIds as 'mapToDefaults' | 'preserveEmpty' | 'requireExplicit')
        : 'mapToDefaults'
    } : undefined
  })) : [{
    version,
    dimensions: Array.isArray(dimensions) ? dimensions.map((d) => d.id) : [],
    date: new Date().toISOString().slice(0, 10),
    migrationStrategy: {
      emptyModeIds: 'mapToDefaults' as const,
      preserveOriginalValues: true
    }
  }];

  // Compose required top-level fields (with defaults if missing)

  // Compose resolvedValueTypes as array of objects if needed
  let resolvedValueTypesArray: ResolvedValueType[] = [];
  if (Array.isArray(resolvedValueTypes) && resolvedValueTypes.length > 0) {
    resolvedValueTypesArray = resolvedValueTypes.map((item) =>
      typeof item === 'string' ? { id: item, displayName: item } : item as ResolvedValueType
    );
  } else {
    // If missing, create a default set of value types
    console.warn('[createSchemaJsonFromLocalStorage] No resolvedValueTypes found in localStorage. Creating default value types.');
    resolvedValueTypesArray = [
      { id: 'color', displayName: 'Color', type: 'COLOR' },
      { id: 'font_family', displayName: 'Font Family', type: 'FONT_FAMILY' },
      { id: 'font_weight', displayName: 'Font Weight', type: 'FONT_WEIGHT' },
      { id: 'font_size', displayName: 'Font Size', type: 'FONT_SIZE' },
      { id: 'line_height', displayName: 'Line Height', type: 'LINE_HEIGHT' },
      { id: 'spacing', displayName: 'Spacing', type: 'SPACING' },
      { id: 'opacity', displayName: 'Opacity' },
      { id: 'shadow', displayName: 'Shadow' },
      { id: 'border', displayName: 'Border' },
      { id: 'radius', displayName: 'Radius', type: 'RADIUS' },
      { id: 'z_index', displayName: 'Z Index' },
      { id: 'dimension', displayName: 'Dimension', type: 'DIMENSION' },
      { id: 'duration', displayName: 'Duration', type: 'DURATION' },
      { id: 'cubic_bezier', displayName: 'Cubic Bezier', type: 'CUBIC_BEZIER' },
      { id: 'blur', displayName: 'Blur', type: 'BLUR' },
      { id: 'spread', displayName: 'Spread', type: 'SPREAD' },
      { id: 'letter_spacing', displayName: 'Letter Spacing', type: 'LETTER_SPACING' }
    ];
  }

  // Validate that all resolvedValueTypeIds referenced in dimensions and collections exist in resolvedValueTypesArray
  const allReferencedTypeIds = new Set<string>();
  dimensions.forEach((dim) => {
    (dim.resolvedValueTypeIds || []).forEach((id) => allReferencedTypeIds.add(id));
  });
  tokenCollections.forEach((col) => {
    (col.resolvedValueTypeIds || []).forEach((id) => allReferencedTypeIds.add(id));
  });
  // Optionally, check tokens as well
  tokens.forEach((token) => {
    if (token.resolvedValueTypeId) allReferencedTypeIds.add(token.resolvedValueTypeId);
  });
  
  const missingTypeIds = Array.from(allReferencedTypeIds).filter(id => !resolvedValueTypesArray.some(vt => vt.id === id));
  
  if (missingTypeIds.length > 0) {
    console.warn(`[createSchemaJsonFromLocalStorage] The following resolvedValueTypeIds are referenced but missing from resolvedValueTypes: ${missingTypeIds.join(', ')}. Auto-adding missing value types.`);
    
    // Auto-add missing value types with sensible defaults
    const standardValueTypes: Record<string, { displayName: string; type?: 'COLOR' | 'DIMENSION' | 'SPACING' | 'FONT_FAMILY' | 'FONT_WEIGHT' | 'FONT_SIZE' | 'LINE_HEIGHT' | 'LETTER_SPACING' | 'DURATION' | 'CUBIC_BEZIER' | 'BLUR' | 'SPREAD' | 'RADIUS' }> = {
      'color': { displayName: 'Color', type: 'COLOR' },
      'font_family': { displayName: 'Font Family', type: 'FONT_FAMILY' },
      'font_weight': { displayName: 'Font Weight', type: 'FONT_WEIGHT' },
      'font_size': { displayName: 'Font Size', type: 'FONT_SIZE' },
      'line_height': { displayName: 'Line Height', type: 'LINE_HEIGHT' },
      'spacing': { displayName: 'Spacing', type: 'SPACING' },
      'opacity': { displayName: 'Opacity' },
      'shadow': { displayName: 'Shadow' },
      'border': { displayName: 'Border' },
      'radius': { displayName: 'Radius', type: 'RADIUS' },
      'z_index': { displayName: 'Z Index' },
      'dimension': { displayName: 'Dimension', type: 'DIMENSION' },
      'duration': { displayName: 'Duration', type: 'DURATION' },
      'cubic_bezier': { displayName: 'Cubic Bezier', type: 'CUBIC_BEZIER' },
      'blur': { displayName: 'Blur', type: 'BLUR' },
      'spread': { displayName: 'Spread', type: 'SPREAD' },
      'letter_spacing': { displayName: 'Letter Spacing', type: 'LETTER_SPACING' }
    };
    
    // Add missing value types to the array
    missingTypeIds.forEach(missingId => {
      const standardType = standardValueTypes[missingId];
      if (standardType) {
        const newValueType = {
          id: missingId,
          displayName: standardType.displayName,
          ...(standardType.type && { type: standardType.type })
        };
        resolvedValueTypesArray.push(newValueType);
        console.log(`[createSchemaJsonFromLocalStorage] Auto-added missing value type: ${missingId}`);
      } else {
        // For unknown types, create a generic one
        const newValueType = {
          id: missingId,
          displayName: missingId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        };
        resolvedValueTypesArray.push(newValueType);
        console.log(`[createSchemaJsonFromLocalStorage] Auto-added generic value type: ${missingId}`);
      }
    });
  }

  // Normalize platforms to always include syntaxPatterns
  const normalizedPlatforms = (platforms || []).map((p) => ({
    ...p,
    syntaxPatterns: {
      prefix: p.syntaxPatterns?.prefix ?? '',
      suffix: p.syntaxPatterns?.suffix ?? '',
      delimiter: p.syntaxPatterns?.delimiter ?? '_',
      capitalization: p.syntaxPatterns?.capitalization ?? 'none',
      formatString: p.syntaxPatterns?.formatString ?? ''
    }
  }));

  // Ensure themes array exists (themes are optional)
  const normalizedThemes = Array.isArray(themes) ? themes : [];

  // Compose the final schema-compliant object
  const schemaJson = {
    systemName,
    systemId,
    description,
    version,
    versionHistory: normalizedVersionHistory,
    tokenCollections,
    dimensions,
    dimensionOrder,
    tokens,
    platforms: normalizedPlatforms,
    themes: normalizedThemes,
    taxonomies,
    resolvedValueTypes: resolvedValueTypesArray,
    taxonomyOrder: taxonomyOrder || [],
    figmaConfiguration: figmaConfiguration || { fileKey: '' },
    // Add missing required fields with empty arrays/objects
    standardPropertyTypes: [],
    propertyTypes: [],
    componentProperties: [],
    componentCategories: [],
    components: []
  };

  return schemaJson;
}

/**
 * Reconstructs an algorithm schema-compliant JSON object from localStorage.
 * Returns an object matching the @algorithm-schema.json structure.
 */
export function createAlgorithmJsonFromLocalStorage() {
  // Read algorithm data from localStorage
  const algorithms = StorageService.getAlgorithms() as Algorithm[];
  
  // Read root-level data from localStorage for metadata
  const root = JSON.parse(localStorage.getItem('token-model:root') || '{}') as Record<string, unknown>;
  const {
    systemName = 'Design System',
    version = '1.0.0'
  } = root;

  // Try to get the complete algorithm file structure first
  const algorithmFile = StorageService.getAlgorithmFile();
  
  if (algorithmFile) {
    // If we have the complete algorithm file, use it as the base and update with current algorithms
    const result = {
      ...algorithmFile,
      algorithms: algorithms.map(algorithm => ({
        id: algorithm.id,
        name: algorithm.name,
        description: algorithm.description || '',
        resolvedValueTypeId: algorithm.resolvedValueTypeId,
        variables: algorithm.variables.map(variable => ({
          id: variable.id,
          name: variable.name,
          type: variable.type,
          defaultValue: variable.defaultValue || '',
          description: variable.description || ''
        })),
        formulas: algorithm.formulas.map(formula => ({
          id: formula.id,
          name: formula.name,
          description: formula.description || '',
          expressions: {
            latex: { value: formula.expressions.latex.value },
            javascript: {
              value: formula.expressions.javascript.value,
              metadata: formula.expressions.javascript.metadata || {
                allowedOperations: ['math']
              }
            },
            ast: formula.expressions.ast || {
              type: 'literal',
              value: formula.expressions.javascript.value,
              metadata: {
                astVersion: '1.0.0',
                validationErrors: [],
                complexity: 'low'
              }
            }
          },
          variableIds: formula.variableIds || []
        })),
        conditions: algorithm.conditions.map(condition => ({
          id: condition.id,
          name: condition.name,
          expression: condition.expression,
          variableIds: condition.variableIds || []
        })),
        steps: algorithm.steps.map(step => ({
          type: step.type,
          id: step.id,
          name: step.name
        }))
      }))
    };
    
    return result;
  }

  // Fallback: reconstruct the algorithm JSON structure if no complete file is stored
  // Extract system variables from the first algorithm's config (if it exists)
  let systemVariables: unknown[] = [];
  if (algorithms && algorithms.length > 0) {
    const firstAlgorithm = algorithms[0] as { config?: { systemVariables?: unknown[] } };
    if (firstAlgorithm.config?.systemVariables) {
      systemVariables = firstAlgorithm.config.systemVariables;
    }
  }

  // Compose the algorithm schema-compliant object
  const algorithmJson = {
    schemaVersion: "5.0.0",
    profile: "basic",
    metadata: {
      name: `${systemName} Algorithm Collection`,
      description: `Algorithm collection for ${systemName}`,
      version: version,
      author: "Design System Manager"
    },
    config: {
      // Include system variables in the config
      systemVariables,
      // Global configuration values can be added here as needed
      defaultBaseValue: 16,
      defaultRatio: 1.25,
      defaultSpacing: 4
    },
    algorithms: algorithms.map(algorithm => ({
      id: algorithm.id,
      name: algorithm.name,
      description: algorithm.description || '',
      resolvedValueTypeId: algorithm.resolvedValueTypeId,
      variables: algorithm.variables.map(variable => ({
        id: variable.id,
        name: variable.name,
        type: variable.type,
        defaultValue: variable.defaultValue || '',
        description: variable.description || ''
      })),
      formulas: algorithm.formulas.map(formula => ({
        id: formula.id,
        name: formula.name,
        description: formula.description || '',
        expressions: {
          latex: { value: formula.expressions.latex.value },
          javascript: {
            value: formula.expressions.javascript.value,
            metadata: formula.expressions.javascript.metadata || {
              allowedOperations: ['math']
            }
          },
          ast: formula.expressions.ast || {
            type: 'literal',
            value: formula.expressions.javascript.value,
            metadata: {
              astVersion: '1.0.0',
              validationErrors: [],
              complexity: 'low'
            }
          }
        },
        variableIds: formula.variableIds || []
      })),
      conditions: algorithm.conditions.map(condition => ({
        id: condition.id,
        name: condition.name,
        expression: condition.expression,
        variableIds: condition.variableIds || []
      })),
      steps: algorithm.steps.map(step => ({
        type: step.type,
        id: step.id,
        name: step.name
      }))
    })),
    execution: {
      order: [],
      parallel: false,
      onError: "stop"
    },
    integration: {
      targetSchema: "https://designsystem.org/schemas/tokens/v1.0.0",
      outputFormat: "design-tokens",
      mergeStrategy: "merge",
      validation: true
    },
    examples: []
  };

  return algorithmJson;
}

/**
 * Validates a schema-compliant JSON object using validateTokenSystem.
 * Returns { valid: boolean, result?: any, error?: any }
 */
export function validateSchemaJson(data: unknown) {
  try {
    const result = validateTokenSystem(data);
    return { valid: true, result };
  } catch (error: unknown) {
    return { valid: false, error: (error as Error).message || error };
  }
}

// Optional: helper to trigger download as JSON file
export function downloadSchemaJsonFromLocalStorage(filename = 'tokens-export.json') {
  const data = createSchemaJsonFromLocalStorage();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
} 