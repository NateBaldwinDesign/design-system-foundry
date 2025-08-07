import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrideFile 
} from '@token-model/data-model';
import { 
  validateTokenSystem, 
  validatePlatformExtension, 
  validateThemeOverrideFile 
} from '@token-model/data-model';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationSummary {
  core: ValidationResult;
  platforms: Record<string, ValidationResult>;
  themes: Record<string, ValidationResult>;
  overall: ValidationResult;
}

/**
 * Validation Service
 * 
 * Provides comprehensive schema validation for all data sources.
 * Ensures data integrity across core data, platform extensions, and theme overrides.
 */
export class ValidationService {
  /**
   * Validate data against appropriate schema
   */
  static validateData(
    data: Record<string, unknown>,
    sourceType: 'core' | 'platform-extension' | 'theme-override'
  ): ValidationResult {
    try {
      switch (sourceType) {
        case 'core': {
          validateTokenSystem(data as TokenSystem);
          break;
        }
        case 'platform-extension': {
          validatePlatformExtension(data as PlatformExtension);
          break;
        }
        case 'theme-override': {
          validateThemeOverrideFile(data as ThemeOverrideFile);
          break;
        }
      }
      return { isValid: true, errors: [], warnings: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        warnings: []
      };
    }
  }

  /**
   * Validate all data sources
   */
  static validateAllDataSources(
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>,
    themeOverrides: Record<string, ThemeOverrideFile>
  ): ValidationSummary {
    const summary: ValidationSummary = {
      core: { isValid: true, errors: [], warnings: [] },
      platforms: {},
      themes: {},
      overall: { isValid: true, errors: [], warnings: [] }
    };

    // Validate core data
    if (coreData) {
      summary.core = this.validateData(coreData, 'core');
    }

    // Validate platform extensions
    Object.entries(platformExtensions).forEach(([platformId, data]) => {
      summary.platforms[platformId] = this.validateData(data, 'platform-extension');
    });

    // Validate theme overrides
    Object.entries(themeOverrides).forEach(([themeId, data]) => {
      summary.themes[themeId] = this.validateData(data, 'theme-override');
    });

    // Calculate overall validation result
    const allResults = [
      summary.core,
      ...Object.values(summary.platforms),
      ...Object.values(summary.themes)
    ];

    const hasErrors = allResults.some(result => !result.isValid);
    const allErrors = allResults.flatMap(result => result.errors);
    const allWarnings = allResults.flatMap(result => result.warnings);

    summary.overall = {
      isValid: !hasErrors,
      errors: allErrors,
      warnings: allWarnings
    };

    return summary;
  }

  /**
   * Validate data consistency across sources
   */
  static validateDataConsistency(
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>,
    themeOverrides: Record<string, ThemeOverrideFile>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!coreData) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Check platform extension consistency
    Object.entries(platformExtensions).forEach(([platformId, platformData]) => {
      // Check if platform exists in core data
      const platformExists = coreData.platforms?.some(p => p.id === platformId);
      if (!platformExists) {
        errors.push(`Platform extension references non-existent platform: ${platformId}`);
      }

      // Check if platform extension systemId matches core systemId
      if (platformData.systemId !== coreData.systemId) {
        errors.push(`Platform extension systemId mismatch: ${platformData.systemId} vs ${coreData.systemId}`);
      }

      // Check token overrides reference existing tokens
      if (platformData.tokenOverrides) {
        platformData.tokenOverrides.forEach(override => {
          const tokenExists = coreData.tokens?.some(t => t.id === override.tokenId);
          if (!tokenExists) {
            errors.push(`Platform extension references non-existent token: ${override.tokenId}`);
          }
        });
      }
    });

    // Check theme override consistency
    Object.entries(themeOverrides).forEach(([themeId, themeData]) => {
      // Check if theme exists in core data
      const themeExists = coreData.themes?.some(t => t.id === themeId);
      if (!themeExists) {
        errors.push(`Theme override references non-existent theme: ${themeId}`);
      }

      // Check if theme override systemId matches core systemId
      if (themeData.systemId !== coreData.systemId) {
        errors.push(`Theme override systemId mismatch: ${themeData.systemId} vs ${coreData.systemId}`);
      }

      // Check token overrides reference existing tokens
      if (themeData.tokenOverrides) {
        themeData.tokenOverrides.forEach(override => {
          const tokenExists = coreData.tokens?.some(t => t.id === override.tokenId);
          if (!tokenExists) {
            errors.push(`Theme override references non-existent token: ${override.tokenId}`);
          }
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate token references
   */
  static validateTokenReferences(
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>,
    themeOverrides: Record<string, ThemeOverrideFile>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!coreData) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const coreTokenIds = new Set(coreData.tokens?.map(t => t.id) || []);

    // Check platform extension token references
    Object.entries(platformExtensions).forEach(([platformId, platformData]) => {
      if (platformData.tokenOverrides) {
        platformData.tokenOverrides.forEach(override => {
          if (!coreTokenIds.has(override.tokenId)) {
            errors.push(`Platform ${platformId} references non-existent token: ${override.tokenId}`);
          }
        });
      }
    });

    // Check theme override token references
    Object.entries(themeOverrides).forEach(([themeId, themeData]) => {
      if (themeData.tokenOverrides) {
        themeData.tokenOverrides.forEach(override => {
          if (!coreTokenIds.has(override.tokenId)) {
            errors.push(`Theme ${themeId} references non-existent token: ${override.tokenId}`);
          }
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate dimension and mode references
   */
  static validateDimensionModeReferences(
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!coreData) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const coreDimensionIds = new Set(coreData.dimensions?.map(d => d.id) || []);
    const coreModeIds = new Set();
    
    coreData.dimensions?.forEach(dimension => {
      dimension.modes?.forEach(mode => {
        coreModeIds.add(mode.id);
      });
    });

    // Check platform extension dimension and mode references
    Object.entries(platformExtensions).forEach(([platformId, platformData]) => {
      // Check omitted dimensions
      if (platformData.omittedDimensions) {
        platformData.omittedDimensions.forEach(dimensionId => {
          if (!coreDimensionIds.has(dimensionId)) {
            errors.push(`Platform ${platformId} omits non-existent dimension: ${dimensionId}`);
          }
        });
      }

      // Check omitted modes
      if (platformData.omittedModes) {
        platformData.omittedModes.forEach(modeId => {
          if (!coreModeIds.has(modeId)) {
            errors.push(`Platform ${platformId} omits non-existent mode: ${modeId}`);
          }
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate resolved value type references
   */
  static validateResolvedValueTypeReferences(
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!coreData) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const coreValueTypeIds = new Set(coreData.resolvedValueTypes?.map(vt => vt.id) || []);

    // Check platform extension resolved value type references
    Object.entries(platformExtensions).forEach(([platformId, platformData]) => {
      if (platformData.syntaxPatterns) {
        Object.entries(platformData.syntaxPatterns).forEach(([valueTypeId, pattern]) => {
          if (!coreValueTypeIds.has(valueTypeId)) {
            errors.push(`Platform ${platformId} references non-existent resolved value type: ${valueTypeId}`);
          }
        });
      }

      if (platformData.valueFormatters) {
        Object.entries(platformData.valueFormatters).forEach(([valueTypeId, formatter]) => {
          if (!coreValueTypeIds.has(valueTypeId)) {
            errors.push(`Platform ${platformId} references non-existent resolved value type: ${valueTypeId}`);
          }
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get comprehensive validation report
   */
  static getValidationReport(
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>,
    themeOverrides: Record<string, ThemeOverrideFile>
  ): {
    summary: ValidationSummary;
    consistency: ValidationResult;
    tokenReferences: ValidationResult;
    dimensionModeReferences: ValidationResult;
    resolvedValueTypeReferences: ValidationResult;
    overall: ValidationResult;
  } {
    const summary = this.validateAllDataSources(coreData, platformExtensions, themeOverrides);
    const consistency = this.validateDataConsistency(coreData, platformExtensions, themeOverrides);
    const tokenReferences = this.validateTokenReferences(coreData, platformExtensions, themeOverrides);
    const dimensionModeReferences = this.validateDimensionModeReferences(coreData, platformExtensions);
    const resolvedValueTypeReferences = this.validateResolvedValueTypeReferences(coreData, platformExtensions);

    // Calculate overall validation result
    const allResults = [
      summary.overall,
      consistency,
      tokenReferences,
      dimensionModeReferences,
      resolvedValueTypeReferences
    ];

    const hasErrors = allResults.some(result => !result.isValid);
    const allErrors = allResults.flatMap(result => result.errors);
    const allWarnings = allResults.flatMap(result => result.warnings);

    const overall = {
      isValid: !hasErrors,
      errors: allErrors,
      warnings: allWarnings
    };

    return {
      summary,
      consistency,
      tokenReferences,
      dimensionModeReferences,
      resolvedValueTypeReferences,
      overall
    };
  }
} 