import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrideFile
} from '@token-model/data-model';

export interface OverridePreview {
  tokenId: string;
  tokenName: string;
  originalValue: Record<string, unknown> | null;
  newValue: Record<string, unknown>;
  sourceType: 'platform-extension' | 'theme-override';
  sourceId: string;
  willCreateOverride: boolean;
  validationResult: ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * OverrideManager Service
 * 
 * Handles automatic override creation when editing platform/theme data.
 * Manages theme restrictions and validation for override creation.
 */
export class OverrideManager {
  private static instance: OverrideManager;
  private tokenThemeableCache: Map<string, boolean> = new Map();

  private constructor() {}

  static getInstance(): OverrideManager {
    if (!OverrideManager.instance) {
      OverrideManager.instance = new OverrideManager();
    }
    return OverrideManager.instance;
  }

  /**
   * Create platform override for a token
   */
  createPlatformOverride(
    tokenId: string, 
    newValue: Record<string, unknown>, 
    platformId: string,
    coreData: TokenSystem | null
  ): PlatformExtension {
    // Validate override creation
    const validation = this.validateOverrideCreation(tokenId, 'platform-extension', platformId);
    if (!validation.isValid) {
      throw new Error(`Cannot create platform override: ${validation.errors.join(', ')}`);
    }

    // Find the token in core data to get its properties
    const coreToken = coreData?.tokens.find(t => t.id === tokenId);
    if (!coreToken) {
      throw new Error(`Token ${tokenId} not found in core data`);
    }

    // Create platform extension with token override
    const platformExtension: PlatformExtension = {
      systemId: coreData?.systemId || 'design-system',
      platformId: platformId,
      version: '1.0.0',
      figmaFileKey: `platform-${platformId}-${Date.now()}`,
      tokenOverrides: [
        {
          id: tokenId,
          displayName: coreToken.displayName,
          description: coreToken.description,
          themeable: coreToken.themeable,
          private: coreToken.private,
          tokenTier: coreToken.tokenTier,
          resolvedValueTypeId: coreToken.resolvedValueTypeId,
          generatedByAlgorithm: coreToken.generatedByAlgorithm,
          algorithmId: coreToken.algorithmId,
          taxonomies: coreToken.taxonomies,
          propertyTypes: coreToken.propertyTypes,
          codeSyntax: coreToken.codeSyntax,
          valuesByMode: (newValue.valuesByMode as typeof coreToken.valuesByMode) || coreToken.valuesByMode,
          omit: false
        }
      ]
    };

    return platformExtension;
  }

  /**
   * Create theme override for a token (only for themeable tokens)
   */
  createThemeOverride(
    tokenId: string, 
    newValue: Record<string, unknown>, 
    themeId: string,
    coreData: TokenSystem | null
  ): ThemeOverrideFile {
    // Check if token is themeable
    if (!this.isTokenThemeable(tokenId, coreData)) {
      throw new Error(`Token ${tokenId} is not themeable and cannot be edited in theme mode`);
    }

    // Validate override creation
    const validation = this.validateOverrideCreation(tokenId, 'theme-override', themeId);
    if (!validation.isValid) {
      throw new Error(`Cannot create theme override: ${validation.errors.join(', ')}`);
    }

    // Create theme override file
    const themeOverride: ThemeOverrideFile = {
      systemId: coreData?.systemId || 'design-system',
      themeId: themeId,
      figmaFileKey: `theme-${themeId}-${Date.now()}`,
      tokenOverrides: [
        {
          tokenId: tokenId,
          valuesByMode: (newValue.valuesByMode as unknown[]) || []
        }
      ]
    };

    return themeOverride;
  }

  /**
   * Validate override creation
   */
  validateOverrideCreation(
    tokenId: string, 
    sourceType: 'platform-extension' | 'theme-override', 
    sourceId: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic validation
    if (!tokenId) {
      errors.push('Token ID is required');
    }

    if (!sourceId) {
      errors.push('Source ID is required');
    }

    // Source-specific validation
    if (sourceType === 'theme-override') {
      // Theme-specific validation rules
      if (!this.isTokenThemeable(tokenId)) {
        errors.push(`Token ${tokenId} is not themeable and cannot be edited in theme mode`);
      }
    }

    if (sourceType === 'platform-extension') {
      // Platform-specific validation rules
      if (tokenId.includes('theme-')) {
        warnings.push(`Token ${tokenId} appears to be theme-specific and may not be appropriate for platform override`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if token is themeable
   */
  isTokenThemeable(tokenId: string, coreData?: TokenSystem | null): boolean {
    // Check cache first
    if (this.tokenThemeableCache.has(tokenId)) {
      return this.tokenThemeableCache.get(tokenId)!;
    }

    // If core data is provided, check the token's themeable property
    if (coreData) {
      const token = coreData.tokens.find(t => t.id === tokenId);
      if (token) {
        const isThemeable = token.themeable === true;
        this.tokenThemeableCache.set(tokenId, isThemeable);
        return isThemeable;
      }
    }

    // Default to false if token not found or no core data provided
    this.tokenThemeableCache.set(tokenId, false);
    return false;
  }

  /**
   * Get override preview
   */
  getOverridePreview(
    tokenId: string, 
    newValue: Record<string, unknown>, 
    sourceType: 'platform-extension' | 'theme-override', 
    sourceId: string,
    coreData: TokenSystem | null
  ): OverridePreview {
    const coreToken = coreData?.tokens.find(t => t.id === tokenId);
    const originalValue = coreToken ? { ...coreToken } : null;
    
    const validationResult = this.validateOverrideCreation(tokenId, sourceType, sourceId);
    const willCreateOverride = validationResult.isValid;

    return {
      tokenId,
      tokenName: coreToken?.displayName || tokenId,
      originalValue,
      newValue,
      sourceType,
      sourceId,
      willCreateOverride,
      validationResult
    };
  }

  /**
   * Clear themeable token cache
   */
  clearCache(): void {
    this.tokenThemeableCache.clear();
  }

  /**
   * Update themeable token cache with new data
   */
  updateCache(coreData: TokenSystem): void {
    coreData.tokens.forEach(token => {
      this.tokenThemeableCache.set(token.id, token.themeable === true);
    });
  }
} 