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
  const namingRules = StorageService.getNamingRules();
  const dimensionOrder = JSON.parse(localStorage.getItem('token-model:dimension-order') || '[]') as string[];

  // Read root-level data from localStorage
  const root = JSON.parse(localStorage.getItem('token-model:root') || '{}') as Record<string, unknown>;
  const {
    systemName = 'Design System',
    systemId = 'design-system',
    description = 'A comprehensive design system with tokens, dimensions, and themes',
    version = '1.0.0',
    versionHistory = []
  } = root;

  // Compose versionHistory if not present
  const normalizedVersionHistory = (Array.isArray(versionHistory) && versionHistory.length > 0) ? versionHistory : [{
    version,
    dimensions: Array.isArray(dimensions) ? dimensions.map((d) => d.id) : [],
    date: new Date().toISOString().slice(0, 10),
    migrationStrategy: {
      emptyModeIds: 'mapToDefaults',
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
    // If missing, throw an error or surface a warning
    console.error('[createSchemaJsonFromLocalStorage] No resolvedValueTypes found in localStorage. Please ensure your system data includes all value types required by your schema.');
    throw new Error('[createSchemaJsonFromLocalStorage] No resolvedValueTypes found in localStorage. Please ensure your system data includes all value types required by your schema.');
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
    console.error(`[createSchemaJsonFromLocalStorage] The following resolvedValueTypeIds are referenced in dimensions, collections, or tokens but missing from resolvedValueTypes: ${missingTypeIds.join(', ')}`);
    throw new Error(`[createSchemaJsonFromLocalStorage] The following resolvedValueTypeIds are referenced in dimensions, collections, or tokens but missing from resolvedValueTypes: ${missingTypeIds.join(', ')}`);
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

  // Ensure themes array exists and has at least one default theme
  const normalizedThemes = Array.isArray(themes) && themes.length > 0 ? themes : [{
    id: 'default',
    displayName: 'Default Theme',
    description: 'The default theme for the design system',
    isDefault: true
  }];

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
    namingRules: namingRules || {
      taxonomyOrder: []
    }
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