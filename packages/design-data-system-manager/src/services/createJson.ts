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

  // Compose version and versionHistory
  const version = '1.0.0';
  const versionHistory = [
    {
      version,
      dimensions: Array.isArray(dimensions) ? dimensions.map((d: any) => d.id) : [],
      date: new Date().toISOString().slice(0, 10),
    },
  ];

  // Compose required top-level fields (with defaults if missing)
  const tokenGroups: any[] = [];
  const tokenVariants: any[] = [];
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
      { id: 'COLOR', displayName: 'Color' },
      { id: 'DIMENSION', displayName: 'Dimension' },
      { id: 'FONT_FAMILY', displayName: 'Font Family' },
      { id: 'FONT_WEIGHT', displayName: 'Font Weight' },
      { id: 'DURATION', displayName: 'Duration' },
      { id: 'BORDER', displayName: 'Border' },
      { id: 'SHADOW', displayName: 'Shadow' },
      { id: 'OPACITY', displayName: 'Opacity' },
      { id: 'NUMBER', displayName: 'Number' },
      { id: 'TYPOGRAPHY', displayName: 'Typography' }
    ];
  }

  // Compose the final schema-compliant object
  const schemaJson = {
    version,
    versionHistory,
    tokenCollections,
    dimensions,
    tokens,
    platforms,
    themes,
    taxonomies,
    resolvedValueTypes: resolvedValueTypesArray,
    tokenGroups,
    tokenVariants,
    themeOverrides
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