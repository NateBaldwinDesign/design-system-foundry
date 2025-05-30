import { StorageService } from './storage';
import { validateTokenSystem } from '@token-model/data-model';

/**
 * Reconstructs a schema-compliant JSON object from localStorage.
 * Returns an object matching the @schema.json structure.
 */
export function createSchemaJsonFromLocalStorage() {
  // Read all relevant data from localStorage
  const tokenCollections = StorageService.getCollections();
  const tokens = StorageService.getTokens();
  const dimensions = StorageService.getDimensions();
  const platforms = StorageService.getPlatforms();
  const themes = StorageService.getThemes();
  const taxonomies = StorageService.getTaxonomies();
  const resolvedValueTypes = StorageService.getValueTypes();
  const namingRules = StorageService.getNamingRules();

  // Read root-level data from localStorage
  const root = JSON.parse(localStorage.getItem('token-model:root') || '{}');
  const {
    systemName = 'Design System',
    systemId = 'design-system',
    description = 'A comprehensive design system with tokens, dimensions, and themes',
    version = '1.0.0',
    versionHistory = []
  } = root;

  // Compose versionHistory if not present
  const normalizedVersionHistory = versionHistory.length > 0 ? versionHistory : [{
    version,
    dimensions: Array.isArray(dimensions) ? dimensions.map((d: any) => d.id) : [],
    date: new Date().toISOString().slice(0, 10),
    migrationStrategy: {
      emptyModeIds: 'mapToDefaults',
      preserveOriginalValues: true
    }
  }];

  // Compose required top-level fields (with defaults if missing)
  const themeOverrides: Record<string, any> = {};

  // Compose resolvedValueTypes as array of objects if needed
  let resolvedValueTypesArray: any[] = [];
  if (Array.isArray(resolvedValueTypes) && resolvedValueTypes.length > 0) {
    if (typeof resolvedValueTypes[0] === 'string') {
      // If stored as string IDs, convert to objects with displayName = id
      resolvedValueTypesArray = resolvedValueTypes.map((id: string) => ({ id, displayName: id }));
    } else {
      resolvedValueTypesArray = resolvedValueTypes;
    }
  } else {
    // Fallback to standard types
    resolvedValueTypesArray = [
      { id: 'color', displayName: 'Color', type: 'COLOR' },
      { id: 'dimension', displayName: 'Dimension', type: 'DIMENSION' },
      { id: 'spacing', displayName: 'Spacing', type: 'SPACING' },
      { id: 'font-family', displayName: 'Font Family', type: 'FONT_FAMILY' },
      { id: 'font-weight', displayName: 'Font Weight', type: 'FONT_WEIGHT' },
      { id: 'font-size', displayName: 'Font Size', type: 'FONT_SIZE' },
      { id: 'line-height', displayName: 'Line Height', type: 'LINE_HEIGHT' },
      { id: 'letter-spacing', displayName: 'Letter Spacing', type: 'LETTER_SPACING' },
      { id: 'duration', displayName: 'Duration', type: 'DURATION' },
      { id: 'cubic-bezier', displayName: 'Cubic Bezier', type: 'CUBIC_BEZIER' },
      { id: 'blur', displayName: 'Blur', type: 'BLUR' },
      { id: 'spread', displayName: 'Spread', type: 'SPREAD' },
      { id: 'radius', displayName: 'Radius', type: 'RADIUS' }
    ];
  }

  // Normalize platforms to always include syntaxPatterns
  const normalizedPlatforms = (platforms || []).map((p: any) => ({
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
    tokens,
    platforms: normalizedPlatforms,
    themes: normalizedThemes,
    taxonomies,
    resolvedValueTypes: resolvedValueTypesArray,
    themeOverrides,
    namingRules: namingRules || {
      taxonomyOrder: []
    }
  };

  return schemaJson;
}

/**
 * Validates a schema-compliant JSON object using validateTokenSystem.
 * Returns { valid: boolean, result?: any, error?: any }
 */
export function validateSchemaJson(data: any) {
  try {
    const result = validateTokenSystem(data);
    return { valid: true, result };
  } catch (error: any) {
    return { valid: false, error: error.message || error };
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