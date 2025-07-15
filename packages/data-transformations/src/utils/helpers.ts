import type { TokenSystem, Token, ResolvedValueType } from '@token-model/data-model';

/**
 * Generate a unique ID for a variable or collection
 */
export function generateUniqueId(prefix: string = 'var'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Sanitize a name for use as a variable name
 */
export function sanitizeVariableName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace invalid characters with underscore
    .replace(/^[0-9]/, '_$&') // Prefix with underscore if starts with number
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase();
}

/**
 * Convert a token name to a variable name
 */
export function tokenToVariableName(token: Token, platformId?: string): string {
  let name = token.displayName || token.id;
  
  // If platform-specific code syntax exists, use it
  if (platformId && token.codeSyntax) {
    const syntax = token.codeSyntax.find(s => s.platformId === platformId);
    if (syntax) {
      name = syntax.formattedName;
    }
  }
  
  return sanitizeVariableName(name);
}

/**
 * Get a resolved value type by ID
 */
export function getResolvedValueType(
  tokenSystem: TokenSystem, 
  typeId: string
): ResolvedValueType | undefined {
  return tokenSystem.resolvedValueTypes?.find(vt => vt.id === typeId);
}

/**
 * Get a token by ID
 */
export function getToken(tokenSystem: TokenSystem, tokenId: string): Token | undefined {
  return tokenSystem.tokens?.find(token => token.id === tokenId);
}

/**
 * Resolve a token value (handle aliases)
 */
export function resolveTokenValue(
  tokenSystem: TokenSystem,
  token: Token,
  modeIds: string[]
): unknown {
  // Find the value for the specified modes
  const valueByMode = token.valuesByMode?.find(vbm => {
    if (vbm.modeIds.length === 0) return true; // Global value
    return modeIds.every(modeId => vbm.modeIds.includes(modeId));
  });

  if (!valueByMode) {
    throw new Error(`No value found for token ${token.id} with modes ${modeIds.join(', ')}`);
  }

  // Check if this is an alias
  if ('tokenId' in valueByMode.value) {
    const referencedToken = getToken(tokenSystem, valueByMode.value.tokenId);
    if (!referencedToken) {
      throw new Error(`Referenced token ${valueByMode.value.tokenId} not found`);
    }
    // Recursively resolve the referenced token
    return resolveTokenValue(tokenSystem, referencedToken, modeIds);
  }

  // Return the direct value
  return valueByMode.value.value;
}

/**
 * Get all mode combinations from dimensions
 */
export function getAllModeCombinations(tokenSystem: TokenSystem): string[][] {
  const dimensions = tokenSystem.dimensions || [];
  
  if (dimensions.length === 0) {
    return [[]]; // No dimensions means global values only
  }

  // Get all modes for each dimension
  const dimensionModes = dimensions.map(dimension => 
    dimension.modes?.map(mode => mode.id) || []
  );

  // Generate all combinations
  function generateCombinations(arrays: string[][], index: number = 0): string[][] {
    if (index === arrays.length) {
      return [[]];
    }

    const currentArray = arrays[index];
    const remainingCombinations = generateCombinations(arrays, index + 1);
    const result: string[][] = [];

    for (const item of currentArray) {
      for (const combination of remainingCombinations) {
        result.push([item, ...combination]);
      }
    }

    return result;
  }

  return generateCombinations(dimensionModes);
}

/**
 * Format a value for display
 */
export function formatValue(value: unknown, type?: string): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value.toString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * Merge two objects deeply
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = deepClone(target);

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
          targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
        result[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>) as T[Extract<keyof T, string>];
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

/**
 * Check if two values are deeply equal
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a string value is a valid hex color
 * Supports formats: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
 */
export function isHexColor(value: string): boolean {
  if (typeof value !== 'string') return false;
  
  // Remove any leading/trailing whitespace
  const trimmed = value.trim();
  
  // Check for hex color patterns
  const hexPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
  return hexPattern.test(trimmed);
} 

// --- Property Type to Figma Scope Mapping Utility ---

/**
 * Canonical mapping from property types to Figma scopes, based on cross-platform-property-types.md
 * Keys are normalized to lowercase, hyphenated or underscored as found in schema and codebase.
 * Values are Figma scope strings (may be arrays for multi-mapped types).
 * Update this mapping as Figma API or property types evolve.
 */
const propertyTypeToFigmaScopeMap: Record<string, string | string[]> = {
  // Color Properties
  'background-color': ['FRAME_FILL', 'SHAPE_FILL'],
  'text-color': 'TEXT_FILL',
  'border-color': 'STROKE_COLOR',
  'shadow-color': 'EFFECT_COLOR',
  // Spacing & Dimensions
  'width-height': 'WIDTH_HEIGHT',
  'border-width': 'STROKE_FLOAT',
  'border-radius': 'CORNER_RADIUS',
  // Spacing
  'padding': 'GAP',
  'margin': 'GAP',
  'gap-spacing': 'GAP',
  // Typography
  'font-family': 'FONT_FAMILY',
  'font-size': 'FONT_SIZE',
  'font-weight': 'FONT_WEIGHT',
  'font-style': 'FONT_STYLE',
  'line-height': 'LINE_HEIGHT',
  'letter-spacing': 'LETTER_SPACING',
  'text-alignment': 'ALL_SCOPES', // Currently Figma doesn't support these
  'text-transform': 'ALL_SCOPES', // Currently Figma doesn't support these
  // Effects & Appearance
  'opacity': 'OPACITY',
  'shadow': ['EFFECT_FLOAT', 'EFFECT_COLOR'],
  'blur': 'EFFECT_FLOAT',
  // Layout & Positioning
  'position': 'ALL_SCOPES',
  'z-index': 'ALL_SCOPES',
  'flex-properties': 'ALL_SCOPES',
  // Animation & Motion
  'duration': 'EFFECT_FLOAT',
  'easing': 'ALL_SCOPES',
  'delay': 'EFFECT_FLOAT',
};

/**
 * Maps PropertyType objects to Figma scopes by extracting from platformMappings.figma.
 * If no propertyTypes are listed, returns ["ALL_SCOPES"].
 * If a PropertyType has no figma mapping, falls back to hardcoded mapping.
 * If any PropertyType maps to multiple scopes, all are included (deduped).
 */
export function mapPropertyTypesToFigmaScopes(propertyTypes: Array<string | { id: string; platformMappings?: { figma?: string[] } }>): string[] {
  if (!propertyTypes || propertyTypes.length === 0 || propertyTypes.some(pt => typeof pt === 'string' && pt === 'ALL_PROPERTY_TYPES')) {
    return ['ALL_SCOPES'];
  }
  
  const scopes = new Set<string>();
  
  for (const pt of propertyTypes) {
    if (typeof pt === 'string') {
      // Handle string property type IDs - use hardcoded mapping as fallback
      const key = pt.toLowerCase().replace(/_/g, '-');
      const mapped = propertyTypeToFigmaScopeMap[key];
      if (Array.isArray(mapped)) {
        mapped.forEach(scope => scopes.add(scope));
      } else if (typeof mapped === 'string') {
        scopes.add(mapped);
      }
    } else {
      // Handle PropertyType objects - extract from platformMappings.figma
      const figmaScopes = pt.platformMappings?.figma;
      if (figmaScopes && Array.isArray(figmaScopes)) {
        figmaScopes.forEach(scope => scopes.add(scope));
      } else {
        // Fallback to hardcoded mapping if no figma mapping found
        const key = pt.id.toLowerCase().replace(/_/g, '-');
        const mapped = propertyTypeToFigmaScopeMap[key];
        if (Array.isArray(mapped)) {
          mapped.forEach(scope => scopes.add(scope));
        } else if (typeof mapped === 'string') {
          scopes.add(mapped);
        }
      }
    }
  }
  
  // Fallback: if nothing mapped, return ALL_SCOPES
  return scopes.size > 0 ? Array.from(scopes) : ['ALL_SCOPES'];
} 