import type { DataSnapshot } from './dataManager';

export interface TransformedData {
  data: any;
  schemaType: 'schema' | 'platform-extension' | 'theme-override';
  validationResult: ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SchemaTransformer {
  private static instance: SchemaTransformer;

  private constructor() {}

  static getInstance(): SchemaTransformer {
    if (!SchemaTransformer.instance) {
      SchemaTransformer.instance = new SchemaTransformer();
    }
    return SchemaTransformer.instance;
  }

  /**
   * Transform data according to target schema
   */
  transformForTarget(
    data: DataSnapshot, 
    targetSchema: 'schema' | 'platform-extension' | 'theme-override',
    sourceContext?: { sourceId: string; sourceName: string }
  ): TransformedData {
    console.log('[SchemaTransformer] Transforming data for schema:', targetSchema);

    let transformedData: any;
    let validationResult: ValidationResult;

    switch (targetSchema) {
      case 'platform-extension':
        transformedData = this.transformToPlatformExtension(data, sourceContext);
        validationResult = this.validatePlatformExtension(transformedData);
        break;
      case 'theme-override':
        transformedData = this.transformToThemeOverride(data, sourceContext);
        validationResult = this.validateThemeOverride(transformedData);
        break;
      case 'schema':
      default:
        transformedData = this.transformToCoreSchema(data);
        validationResult = this.validateCoreSchema(transformedData);
        break;
    }

    return {
      data: transformedData,
      schemaType: targetSchema,
      validationResult
    };
  }

  /**
   * Transform data to platform extension schema
   */
  private transformToPlatformExtension(
    data: DataSnapshot, 
    sourceContext?: { sourceId: string; sourceName: string }
  ): any {
    console.log('[SchemaTransformer] Transforming to platform extension schema');

    if (!sourceContext?.sourceId) {
      throw new Error('Platform source context required for platform extension transformation');
    }

    // Get the platform from the data
    const platform = data.platforms.find(p => p.id === sourceContext.sourceId);
    if (!platform) {
      throw new Error(`Platform with ID ${sourceContext.sourceId} not found in data`);
    }

    // Transform to platform extension schema
    const platformExtension = {
      systemId: data.systemId || 'design-system',
      platformId: sourceContext.sourceId,
      version: platform.version || '1.0.0',
      status: platform.status || 'active',
      figmaPlatformMapping: platform.figmaPlatformMapping || null,
      figmaFileKey: platform.figmaFileKey || `platform-${sourceContext.sourceId}`,
      fileColorProfile: platform.fileColorProfile || 'srgb',
      syntaxPatterns: platform.syntaxPatterns || {},
      valueFormatters: platform.valueFormatters || {},
      algorithmVariableOverrides: platform.algorithmVariableOverrides || [],
      tokenOverrides: this.transformTokensForPlatform(data.tokens, sourceContext.sourceId),
      omittedModes: platform.omittedModes || [],
      omittedDimensions: platform.omittedDimensions || [],
      packageUri: platform.packageUri || '',
      documentationUri: platform.documentationUri || '',
      componentImplementations: platform.componentImplementations || []
    };

    return platformExtension;
  }

  /**
   * Transform data to theme override schema
   */
  private transformToThemeOverride(
    data: DataSnapshot, 
    sourceContext?: { sourceId: string; sourceName: string }
  ): any {
    console.log('[SchemaTransformer] Transforming to theme override schema');

    if (!sourceContext?.sourceId) {
      throw new Error('Theme source context required for theme override transformation');
    }

    // Get the theme from the data
    const theme = data.themes.find(t => t.id === sourceContext.sourceId);
    if (!theme) {
      throw new Error(`Theme with ID ${sourceContext.sourceId} not found in data`);
    }

    // Transform to theme override schema
    const themeOverride = {
      systemId: data.systemId || 'design-system',
      themeId: sourceContext.sourceId,
      figmaFileKey: theme.figmaFileKey || `theme-${sourceContext.sourceId}`,
      fileColorProfile: theme.fileColorProfile || 'srgb',
      tokenOverrides: this.transformTokensForTheme(data.tokens, sourceContext.sourceId)
    };

    return themeOverride;
  }

  /**
   * Transform data to core schema
   */
  private transformToCoreSchema(data: DataSnapshot): any {
    console.log('[SchemaTransformer] Transforming to core schema');

    // Core schema is the full design system data
    return {
      systemId: data.systemId || 'design-system',
      systemName: data.systemName || 'Design System',
      version: data.version || '1.0.0',
      tokenCollections: data.collections || [],
      dimensions: data.dimensions || [],
      tokens: data.tokens || [],
      platforms: data.platforms || [],
      themes: data.themes || [],
      taxonomies: data.taxonomies || [],
      resolvedValueTypes: data.resolvedValueTypes || [],
      componentProperties: data.componentProperties || [],
      componentCategories: data.componentCategories || [],
      components: data.components || [],
      taxonomyOrder: data.taxonomyOrder || [],
      versionHistory: data.versionHistory || []
    };
  }

  /**
   * Transform tokens for platform extension
   */
  private transformTokensForPlatform(tokens: any[], platformId: string): any[] {
    return tokens
      .filter(token => {
        // Filter tokens that are relevant for this platform
        // This is a simplified implementation - should be enhanced based on platform-specific logic
        return !token.omit || !token.omit[platformId];
      })
      .map(token => ({
        id: token.id,
        displayName: token.displayName,
        description: token.description,
        themeable: token.themeable,
        private: token.private,
        status: token.status,
        tokenTier: token.tokenTier,
        resolvedValueTypeId: token.resolvedValueTypeId,
        generatedByAlgorithm: token.generatedByAlgorithm,
        algorithmId: token.algorithmId,
        taxonomies: token.taxonomies || [],
        propertyTypes: token.propertyTypes || [],
        valuesByMode: token.valuesByMode || [],
        omit: token.omit?.[platformId] || false
      }));
  }

  /**
   * Transform tokens for theme override
   */
  private transformTokensForTheme(tokens: any[], themeId: string): any[] {
    return tokens
      .filter(token => {
        // Filter tokens that have theme-specific overrides
        return token.valuesByMode?.some((mode: any) => 
          mode.platformOverrides?.some((override: any) => override.platformId === themeId)
        );
      })
      .map(token => ({
        tokenId: token.id,
        valuesByMode: token.valuesByMode
          .filter((mode: any) => 
            mode.platformOverrides?.some((override: any) => override.platformId === themeId)
          )
          .map((mode: any) => ({
            modeIds: mode.modeIds,
            value: mode.value,
            platformOverrides: mode.platformOverrides?.filter((override: any) => 
              override.platformId === themeId
            ) || [],
            metadata: mode.metadata
          }))
      }));
  }

  /**
   * Validate data against platform extension schema
   */
  validatePlatformExtension(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.systemId) errors.push('systemId is required');
    if (!data.platformId) errors.push('platformId is required');
    if (!data.version) errors.push('version is required');
    if (!data.figmaFileKey) errors.push('figmaFileKey is required');

    // Pattern validation
    if (data.figmaFileKey && !/^[a-zA-Z0-9-_]+$/.test(data.figmaFileKey)) {
      errors.push('figmaFileKey must match pattern ^[a-zA-Z0-9-_]+$');
    }

    // Enum validation
    if (data.status && !['active', 'deprecated'].includes(data.status)) {
      errors.push('status must be either "active" or "deprecated"');
    }

    if (data.figmaPlatformMapping && !['WEB', 'iOS', 'ANDROID'].includes(data.figmaPlatformMapping)) {
      errors.push('figmaPlatformMapping must be one of: WEB, iOS, ANDROID');
    }

    if (data.fileColorProfile && !['srgb', 'display-p3'].includes(data.fileColorProfile)) {
      errors.push('fileColorProfile must be either "srgb" or "display-p3"');
    }

    // Token overrides validation
    if (data.tokenOverrides && !Array.isArray(data.tokenOverrides)) {
      errors.push('tokenOverrides must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate data against theme override schema
   */
  validateThemeOverride(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.systemId) errors.push('systemId is required');
    if (!data.themeId) errors.push('themeId is required');

    // Pattern validation
    if (data.figmaFileKey && !/^[a-zA-Z0-9-_]+$/.test(data.figmaFileKey)) {
      errors.push('figmaFileKey must match pattern ^[a-zA-Z0-9-_]+$');
    }

    // Enum validation
    if (data.fileColorProfile && !['srgb', 'display-p3'].includes(data.fileColorProfile)) {
      errors.push('fileColorProfile must be either "srgb" or "display-p3"');
    }

    // Token overrides validation
    if (!data.tokenOverrides || !Array.isArray(data.tokenOverrides)) {
      errors.push('tokenOverrides is required and must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate data against core schema
   */
  validateCoreSchema(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.systemId) errors.push('systemId is required');
    if (!data.systemName) errors.push('systemName is required');

    // Array validations
    if (!Array.isArray(data.tokenCollections)) errors.push('tokenCollections must be an array');
    if (!Array.isArray(data.dimensions)) errors.push('dimensions must be an array');
    if (!Array.isArray(data.tokens)) errors.push('tokens must be an array');
    if (!Array.isArray(data.platforms)) errors.push('platforms must be an array');
    if (!Array.isArray(data.themes)) errors.push('themes must be an array');
    if (!Array.isArray(data.taxonomies)) errors.push('taxonomies must be an array');
    if (!Array.isArray(data.resolvedValueTypes)) errors.push('resolvedValueTypes must be an array');

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate data for target schema
   */
  validateForSchema(
    data: any, 
    schema: 'schema' | 'platform-extension' | 'theme-override'
  ): ValidationResult {
    switch (schema) {
      case 'platform-extension':
        return this.validatePlatformExtension(data);
      case 'theme-override':
        return this.validateThemeOverride(data);
      case 'schema':
      default:
        return this.validateCoreSchema(data);
    }
  }
}
