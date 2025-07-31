import { 
  TokenSystem, 
  PlatformExtension, 
  Token, 
  Platform,
  ThemeOverrides,
  ThemeOverride
} from '../schema';

// Type definitions for syntax patterns and value formatters
export interface SyntaxPatterns {
  prefix?: string;
  suffix?: string;
  delimiter?: string;
  capitalization?: string;
  formatString?: string;
}

export interface ValueFormatters {
  color?: string;
  dimension?: string;
  numberPrecision?: number;
}

export interface MergedData {
  core: TokenSystem;
  platformExtensions: PlatformExtension[];
  themeOverrides?: ThemeOverrides;
  mergedTokens: Token[];
  mergedPlatforms: Platform[];
  omittedModes: string[];
  omittedDimensions: string[];
  analytics: {
    totalTokens: number;
    overriddenTokens: number;
    newTokens: number;
    omittedTokens: number;
    platformCount: number;
    themeCount: number;
    excludedThemeOverrides: number;
    validThemeOverrides: number;
    themeOverrideValidationErrors: string[];
  };
}

export interface MergeOptions {
  targetPlatformId?: string;
  targetThemeId?: string;
  includeOmitted?: boolean;
}

/**
 * Merges core data with platform extensions and theme overrides
 * Merge order: core → platform extensions → theme overrides
 */
export function mergeData(
  coreData: TokenSystem,
  platformExtensions: PlatformExtension[] = [],
  themeOverrides?: ThemeOverrides,
  options: MergeOptions = {}
): MergedData {
  const { targetPlatformId, targetThemeId, includeOmitted = false } = options;
  
  // Validate platform extensions for figmaFileKey uniqueness
  validatePlatformExtensions(platformExtensions);
  
  // Filter platform extensions if target platform is specified
  const relevantExtensions = targetPlatformId 
    ? platformExtensions.filter(ext => ext.platformId === targetPlatformId)
    : platformExtensions;

  // Start with core data
  let mergedTokens = [...coreData.tokens];
  let mergedPlatforms = [...coreData.platforms];
  let omittedModes: string[] = [];
  let omittedDimensions: string[] = [];

  // Apply platform extensions
  for (const extension of relevantExtensions) {
    const result = applyPlatformExtension(mergedTokens, mergedPlatforms, extension, includeOmitted);
    mergedTokens = result.tokens;
    mergedPlatforms = result.platforms;
    omittedModes = [...omittedModes, ...(extension.omittedModes || [])];
    omittedDimensions = [...omittedDimensions, ...(extension.omittedDimensions || [])];
  }

  // Track platform-omitted tokens for theme override validation
  const platformOmittedTokens: string[] = [];
  
  // Apply platform extensions
  for (const extension of relevantExtensions) {
    const result = applyPlatformExtension(mergedTokens, mergedPlatforms, extension, includeOmitted);
    mergedTokens = result.tokens;
    mergedPlatforms = result.platforms;
    omittedModes = [...omittedModes, ...(extension.omittedModes || [])];
    omittedDimensions = [...omittedDimensions, ...(extension.omittedDimensions || [])];
    
    // Track omitted tokens for theme override validation
    if (extension.tokenOverrides) {
      for (const tokenOverride of extension.tokenOverrides) {
        if (tokenOverride.omit && !includeOmitted) {
          platformOmittedTokens.push(tokenOverride.id);
        }
      }
    }
  }

  // Apply theme overrides with validation
  let themeOverrideResult = { tokens: mergedTokens, excludedOverrides: 0 };
  if (themeOverrides) {
    const relevantThemes = targetThemeId 
      ? { [targetThemeId]: themeOverrides[targetThemeId] }
      : themeOverrides;
    
    themeOverrideResult = applyThemeOverrides(mergedTokens, relevantThemes, platformOmittedTokens);
    mergedTokens = themeOverrideResult.tokens;
  }

  // Calculate analytics
  const analytics = calculateAnalytics(
    coreData.tokens,
    mergedTokens,
    platformExtensions,
    themeOverrides,
    themeOverrideResult.excludedOverrides
  );

  return {
    core: coreData,
    platformExtensions: relevantExtensions,
    themeOverrides,
    mergedTokens,
    mergedPlatforms,
    omittedModes: [...new Set(omittedModes)],
    omittedDimensions: [...new Set(omittedDimensions)],
    analytics
  };
}

/**
 * Applies a platform extension to the current merged data
 */
function applyPlatformExtension(
  currentTokens: Token[],
  currentPlatforms: Platform[],
  extension: PlatformExtension,
  includeOmitted: boolean
): { tokens: Token[]; platforms: Platform[] } {
  const tokens = [...currentTokens];
  const platforms = [...currentPlatforms];

  // Update platform with syntax patterns and value formatters
  const platformIndex = platforms.findIndex(p => p.id === extension.platformId);
  if (platformIndex !== -1) {
    platforms[platformIndex] = {
      ...platforms[platformIndex],
      syntaxPatterns: extension.syntaxPatterns ? {
        ...extension.syntaxPatterns,
        capitalization: extension.syntaxPatterns.capitalization === 'camel' ? 'none' : extension.syntaxPatterns.capitalization
      } : undefined,
      valueFormatters: extension.valueFormatters || undefined
    };
  }

  // Apply token overrides and additions
  if (extension.tokenOverrides) {
    for (const tokenOverride of extension.tokenOverrides) {
      const existingIndex = tokens.findIndex(t => t.id === tokenOverride.id);
      
      if (existingIndex !== -1) {
        // Override existing token
        if (tokenOverride.omit && !includeOmitted) {
          // Remove token if omitted
          tokens.splice(existingIndex, 1);
        } else {
          // Merge token properties
          tokens[existingIndex] = mergeTokenProperties(tokens[existingIndex], tokenOverride);
        }
      } else {
        // Add new token (if not omitted)
        if (!tokenOverride.omit || includeOmitted) {
          tokens.push(tokenOverride as Token);
        }
      }
    }
  }

  return { tokens, platforms };
}

/**
 * Merges token properties from platform extension into existing token
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeTokenProperties(existingToken: Token, override: any): Token {
  return {
    ...existingToken,
    displayName: override.displayName ?? existingToken.displayName,
    description: override.description ?? existingToken.description,
    themeable: override.themeable ?? existingToken.themeable,
    private: override.private ?? existingToken.private,
    status: override.status ?? existingToken.status,
    tokenTier: override.tokenTier ?? existingToken.tokenTier,
    resolvedValueTypeId: override.resolvedValueTypeId ?? existingToken.resolvedValueTypeId,
    generatedByAlgorithm: override.generatedByAlgorithm ?? existingToken.generatedByAlgorithm,
    algorithmId: override.algorithmId ?? existingToken.algorithmId,
    taxonomies: override.taxonomies ?? existingToken.taxonomies,
    propertyTypes: override.propertyTypes ?? existingToken.propertyTypes,
    codeSyntax: override.codeSyntax ?? existingToken.codeSyntax,
    valuesByMode: override.valuesByMode ?? existingToken.valuesByMode
  };
}

/**
 * Validates if a theme override can be applied to a token
 * Token must exist in merged tokens and not be omitted by platform
 */
function validateThemeOverrideTokenExistence(
  tokenId: string, 
  mergedTokens: Token[], 
  platformOmittedTokens: string[]
): boolean {
  // Token must exist in merged tokens
  const tokenExists = mergedTokens.some(t => t.id === tokenId);
  
  // Token must not be omitted by platform
  const notOmitted = !platformOmittedTokens.includes(tokenId);
  
  return tokenExists && notOmitted;
}

/**
 * Applies theme overrides to tokens with validation
 * Only applies overrides to tokens that exist and are not omitted by platforms
 */
function applyThemeOverrides(
  tokens: Token[], 
  themeOverrides: ThemeOverrides, 
  platformOmittedTokens: string[] = []
): { tokens: Token[]; excludedOverrides: number } {
  const result = [...tokens];
  let excludedOverrides = 0;

  for (const [themeId, overrides] of Object.entries(themeOverrides)) {
    // Validate that overrides is an array
    if (!Array.isArray(overrides)) {
      console.error(`[DataMerger] Theme ${themeId} overrides is not an array:`, overrides);
      continue;
    }
    
    for (const override of overrides) {
      // Validate that the token exists and is not omitted by platform
      if (validateThemeOverrideTokenExistence(override.tokenId, tokens, platformOmittedTokens)) {
        const tokenIndex = result.findIndex(t => t.id === override.tokenId);
        if (tokenIndex !== -1) {
          // Apply theme override to token
          result[tokenIndex] = applyThemeOverrideToToken(result[tokenIndex], override);
        }
      } else {
        excludedOverrides++;
        console.warn(`[DataMerger] Theme override excluded: Token ${override.tokenId} does not exist or was omitted by platform`);
      }
    }
  }

  return { tokens: result, excludedOverrides };
}

/**
 * Applies a single theme override to a token
 */
function applyThemeOverrideToToken(token: Token, override: ThemeOverride): Token {
  const newToken = { ...token };

  // Apply platform-specific overrides if they exist
  if (override.platformOverrides) {
    for (const platformOverride of override.platformOverrides) {
      // For now, we'll apply the first platform override we find
      // In a more sophisticated implementation, we might want to filter by target platform
      newToken.valuesByMode = [{
        value: platformOverride.value,
        modeIds: []
      }];
      break;
    }
  } else {
    // Apply general override
    newToken.valuesByMode = [{
      value: override.value,
      modeIds: []
    }];
  }

  return newToken;
}

/**
 * Calculates analytics for the merged data
 */
function calculateAnalytics(
  originalTokens: Token[],
  mergedTokens: Token[],
  platformExtensions: PlatformExtension[],
  themeOverrides?: ThemeOverrides,
  excludedThemeOverrides: number = 0
): MergedData['analytics'] {
  const totalTokens = originalTokens.length;
  const overriddenTokens = mergedTokens.filter(token => 
    originalTokens.some(original => original.id === token.id && 
      JSON.stringify(original.valuesByMode) !== JSON.stringify(token.valuesByMode))
  ).length;
  
  const newTokens = mergedTokens.filter(token => 
    !originalTokens.some(original => original.id === token.id)
  ).length;
  
  const omittedTokens = originalTokens.length - mergedTokens.length + newTokens;
  
  // Calculate theme override analytics
  const totalThemeOverrides = themeOverrides 
    ? Object.values(themeOverrides).flat().length 
    : 0;
  const validThemeOverrides = totalThemeOverrides - excludedThemeOverrides;
  
  return {
    totalTokens,
    overriddenTokens,
    newTokens,
    omittedTokens,
    platformCount: platformExtensions.length,
    themeCount: themeOverrides ? Object.keys(themeOverrides).length : 0,
    excludedThemeOverrides,
    validThemeOverrides,
    themeOverrideValidationErrors: [] // Will be populated if needed for debugging
  };
}

/**
 * Gets syntax patterns for a specific platform
 */
export function getSyntaxPatternsForPlatform(
  coreData: TokenSystem,
  platformExtensions: PlatformExtension[],
  platformId: string
): SyntaxPatterns | undefined {
  // Platform patterns come from their extensions
  const extension = platformExtensions.find(ext => ext.platformId === platformId);
  return extension?.syntaxPatterns;
}

/**
 * Gets value formatters for a specific platform
 */
export function getValueFormattersForPlatform(
  coreData: TokenSystem,
  platformExtensions: PlatformExtension[],
  platformId: string
): ValueFormatters | undefined {
  // Platform formatters come from their extensions
  const extension = platformExtensions.find(ext => ext.platformId === platformId);
  return extension?.valueFormatters;
}

/**
 * Filters tokens based on omitted modes and dimensions
 */
export function filterTokensByOmissions(
  tokens: Token[],
  omittedModes: string[]
): Token[] {
  return tokens.filter(token => {
    // Check if token has any values in omitted modes
    const hasOmittedModeValues = token.valuesByMode.some(valueByMode =>
      valueByMode.modeIds.some(modeId => omittedModes.includes(modeId))
    );

    return !hasOmittedModeValues;
  });
}

/**
 * Validates platform extensions for figmaFileKey uniqueness
 */
function validatePlatformExtensions(extensions: PlatformExtension[]): void {
  const fileKeys = new Set<string>();
  
  for (const extension of extensions) {
    if (!extension.figmaFileKey) {
      throw new Error(`Platform extension ${extension.platformId} must have a figmaFileKey`);
    }
    
    if (fileKeys.has(extension.figmaFileKey)) {
      throw new Error(`Duplicate figmaFileKey found: ${extension.figmaFileKey}. Each platform extension must have a unique Figma file key.`);
    }
    
    fileKeys.add(extension.figmaFileKey);
  }
}

/**
 * Gets the Figma file key for a specific platform
 */
export function getFigmaFileKeyForPlatform(
  coreData: TokenSystem,
  platformExtensions: PlatformExtension[],
  platformId: string
): string {
  // Core data has default Figma file key for core tokens
  if (!platformId) {
    return coreData.figmaConfiguration?.fileKey || 'default-figma-file';
  }

  // Platform extensions have their own unique file keys
  const extension = platformExtensions.find(ext => ext.platformId === platformId);
  if (!extension?.figmaFileKey) {
    throw new Error(`Platform extension ${platformId} must have a figmaFileKey`);
  }

  return extension.figmaFileKey;
}

/**
 * Gets the Figma file key for a theme override file
 */
export function getFigmaFileKeyForThemeOverride(
  themeOverrideFile: { figmaFileKey: string; themeId: string }
): string {
  if (!themeOverrideFile.figmaFileKey) {
    throw new Error(`Theme override file ${themeOverrideFile.themeId} must have a figmaFileKey`);
  }
  return themeOverrideFile.figmaFileKey;
} 