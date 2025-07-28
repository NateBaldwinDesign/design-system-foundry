import { TokenSystem, PlatformExtension, FigmaConfiguration, ThemeOverrideFile } from '../schema';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SchemaValidationResult {
  core: ValidationResult;
  platformExtensions: ValidationResult[];
  overall: ValidationResult;
}

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

export interface PlatformExtensionRegistryEntry {
  platformId: string;
  repositoryUri: string;
  filePath: string;
}

/**
 * Comprehensive validation for the new schema structure
 */
export class SchemaValidationService {
  /**
   * Validates core data against the new schema structure
   */
  static validateCoreData(data: TokenSystem): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate Figma configuration
    if (data.figmaConfiguration) {
      const figmaValidation = this.validateFigmaConfiguration(data.figmaConfiguration);
      errors.push(...figmaValidation.errors);
      warnings.push(...figmaValidation.warnings);
    } else {
      warnings.push('No figmaConfiguration found. Core tokens will not be published to Figma.');
    }

    // Validate platforms (should not contain Figma)
    const figmaPlatform = data.platforms.find(p => p.id === 'platform-figma');
    if (figmaPlatform) {
      errors.push('Figma should not be included in the platforms array. It is now configured separately in figmaConfiguration.');
    }

    // Validate platform extensions registry
    if (data.platformExtensions) {
      const registryValidation = this.validatePlatformExtensionsRegistry(data.platformExtensions);
      errors.push(...registryValidation.errors);
      warnings.push(...registryValidation.warnings);
    }

    // Validate that all platform extensions have corresponding platforms
    if (data.platformExtensions && data.platforms) {
      const platformIds = new Set(data.platforms.map(p => p.id));
      for (const ext of data.platformExtensions) {
        if (!platformIds.has(ext.platformId)) {
          errors.push(`Platform extension references non-existent platform: ${ext.platformId}`);
        }
      }
    }

    // Validate taxonomyOrder if present
    if (data.taxonomyOrder) {
      const taxonomyIds = new Set(data.taxonomies?.map(t => t.id) || []);
      for (const taxonomyId of data.taxonomyOrder) {
        if (!taxonomyIds.has(taxonomyId)) {
          errors.push(`taxonomyOrder contains ID "${taxonomyId}" that does not exist in taxonomies`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates platform extensions against the new schema structure
   */
  static validatePlatformExtensions(extensions: PlatformExtension[]): ValidationResult[] {
    return extensions.map(extension => this.validatePlatformExtension(extension));
  }

  /**
   * Validates a single platform extension
   */
  static validatePlatformExtension(extension: PlatformExtension): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!extension.figmaFileKey) {
      errors.push(`Platform extension ${extension.platformId} must have a figmaFileKey`);
    } else {
      // Validate figmaFileKey format
      if (!/^[a-zA-Z0-9-_]+$/.test(extension.figmaFileKey)) {
        errors.push(`figmaFileKey must contain only alphanumeric characters, hyphens, and underscores: ${extension.figmaFileKey}`);
      }
    }

    // Validate syntax patterns
    if (extension.syntaxPatterns) {
      const syntaxValidation = this.validateSyntaxPatterns(extension.syntaxPatterns);
      errors.push(...syntaxValidation.errors);
      warnings.push(...syntaxValidation.warnings);
    }

    // Validate value formatters
    if (extension.valueFormatters) {
      const formatterValidation = this.validateValueFormatters(extension.valueFormatters);
      errors.push(...formatterValidation.errors);
      warnings.push(...formatterValidation.warnings);
    }

    // Validate token overrides
    if (extension.tokenOverrides) {
      for (const override of extension.tokenOverrides) {
        if (!override.valuesByMode || override.valuesByMode.length === 0) {
          errors.push(`Token override ${override.id} must have at least one value in valuesByMode`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates Figma configuration
   */
  static validateFigmaConfiguration(config: FigmaConfiguration): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate file key
    if (!config.fileKey) {
      errors.push('figmaConfiguration.fileKey is required');
    } else if (!/^[a-zA-Z0-9-_]+$/.test(config.fileKey)) {
      errors.push('figmaConfiguration.fileKey must contain only alphanumeric characters, hyphens, and underscores');
    }

    // Validate syntax patterns
    if (config.syntaxPatterns) {
      const syntaxValidation = this.validateSyntaxPatterns(config.syntaxPatterns);
      errors.push(...syntaxValidation.errors);
      warnings.push(...syntaxValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates syntax patterns
   */
  static validateSyntaxPatterns(patterns: SyntaxPatterns): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate delimiter
    if (patterns.delimiter && !['', '_', '-', '.', '/'].includes(patterns.delimiter)) {
      errors.push(`Invalid delimiter: ${patterns.delimiter}. Must be one of: "", "_", "-", ".", "/"`);
    }

    // Validate capitalization
    if (patterns.capitalization && !['camel', 'uppercase', 'lowercase', 'capitalize'].includes(patterns.capitalization)) {
      errors.push(`Invalid capitalization: ${patterns.capitalization}. Must be one of: "camel", "uppercase", "lowercase", "capitalize"`);
    }

    // Validate format string
    if (patterns.formatString) {
      const validPlaceholders = ['{name}', '{type}', '{category}', '{mode}'];
      const hasValidPlaceholder = validPlaceholders.some(placeholder => 
        patterns.formatString!.includes(placeholder)
      );
      
      if (!hasValidPlaceholder) {
        warnings.push('Format string should include at least one placeholder like {name}, {type}, {category}, or {mode}');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates value formatters
   */
  static validateValueFormatters(formatters: ValueFormatters): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate color format
    if (formatters.color && !['hex', 'rgb', 'rgba', 'hsl', 'hsla'].includes(formatters.color)) {
      errors.push(`Invalid color format: ${formatters.color}. Must be one of: "hex", "rgb", "rgba", "hsl", "hsla"`);
    }

    // Validate dimension unit
    if (formatters.dimension && !['px', 'rem', 'em', 'pt', 'dp', 'sp'].includes(formatters.dimension)) {
      errors.push(`Invalid dimension unit: ${formatters.dimension}. Must be one of: "px", "rem", "em", "pt", "dp", "sp"`);
    }

    // Validate number precision
    if (formatters.numberPrecision !== undefined) {
      if (!Number.isInteger(formatters.numberPrecision) || formatters.numberPrecision < 0 || formatters.numberPrecision > 10) {
        errors.push(`Invalid number precision: ${formatters.numberPrecision}. Must be an integer between 0 and 10`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates platform extensions registry
   */
  static validatePlatformExtensionsRegistry(registry: PlatformExtensionRegistryEntry[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate platform IDs
    const platformIds = new Set<string>();
    for (const entry of registry) {
      if (platformIds.has(entry.platformId)) {
        errors.push(`Duplicate platform ID in registry: ${entry.platformId}`);
      }
      platformIds.add(entry.platformId);
    }

    // Validate required fields
    for (const entry of registry) {
      if (!entry.platformId) {
        errors.push('Platform extension registry entry must have platformId');
      }
      if (!entry.repositoryUri) {
        errors.push(`Platform extension registry entry for ${entry.platformId} must have repositoryUri`);
      }
      if (!entry.filePath) {
        errors.push(`Platform extension registry entry for ${entry.platformId} must have filePath`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates figmaFileKey uniqueness across all platform extensions
   */
  static validateFigmaFileKeyUniqueness(extensions: PlatformExtension[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const fileKeys = new Set<string>();
    for (const extension of extensions) {
      if (extension.figmaFileKey) {
        if (fileKeys.has(extension.figmaFileKey)) {
          errors.push(`Duplicate figmaFileKey found: ${extension.figmaFileKey}. Each platform extension must have a unique Figma file key.`);
        }
        fileKeys.add(extension.figmaFileKey);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates a theme override file
   */
  static validateThemeOverrideFile(file: ThemeOverrideFile): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate figmaFileKey
    if (!file.figmaFileKey) {
      errors.push('Theme override file must have a figmaFileKey');
    } else if (!/^[a-zA-Z0-9-_]+$/.test(file.figmaFileKey)) {
      errors.push('figmaFileKey must contain only alphanumeric characters, hyphens, and underscores');
    }

    // Validate required fields
    if (!file.systemId) {
      errors.push('Theme override file must have a systemId');
    }
    if (!file.themeId) {
      errors.push('Theme override file must have a themeId');
    }

    // Validate token overrides
    if (!file.tokenOverrides || file.tokenOverrides.length === 0) {
      warnings.push('Theme override file has no token overrides');
    } else {
      for (const override of file.tokenOverrides) {
        if (!override.tokenId) {
          errors.push('Token override must have a tokenId');
        }
        if (!override.valuesByMode || override.valuesByMode.length === 0) {
          errors.push(`Token override ${override.tokenId} must have at least one value in valuesByMode`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates figmaFileKey uniqueness across platform extensions and theme override files
   */
  static validateFigmaFileKeyUniquenessAcrossAll(
    platformExtensions: PlatformExtension[],
    themeOverrideFiles: ThemeOverrideFile[] = []
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const fileKeys = new Set<string>();
    
    // Check platform extensions
    for (const extension of platformExtensions) {
      if (extension.figmaFileKey) {
        if (fileKeys.has(extension.figmaFileKey)) {
          errors.push(`Duplicate figmaFileKey found: ${extension.figmaFileKey}. Each platform extension must have a unique Figma file key.`);
        }
        fileKeys.add(extension.figmaFileKey);
      }
    }

    // Check theme override files
    for (const themeFile of themeOverrideFiles) {
      if (themeFile.figmaFileKey) {
        if (fileKeys.has(themeFile.figmaFileKey)) {
          errors.push(`Duplicate figmaFileKey found: ${themeFile.figmaFileKey}. Theme override file ${themeFile.themeId} conflicts with existing file key.`);
        }
        fileKeys.add(themeFile.figmaFileKey);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Comprehensive validation of the entire system
   */
  static validateSystem(
    coreData: TokenSystem,
    platformExtensions: PlatformExtension[],
    themeOverrideFiles: ThemeOverrideFile[] = []
  ): SchemaValidationResult {
    const coreValidation = this.validateCoreData(coreData);
    const platformValidations = this.validatePlatformExtensions(platformExtensions);
    const themeValidations = themeOverrideFiles.map(file => this.validateThemeOverrideFile(file));
    const uniquenessValidation = this.validateFigmaFileKeyUniquenessAcrossAll(platformExtensions, themeOverrideFiles);

    // Combine all errors and warnings
    const allErrors = [
      ...coreValidation.errors,
      ...uniquenessValidation.errors,
      ...platformValidations.flatMap(v => v.errors),
      ...themeValidations.flatMap(v => v.errors)
    ];

    const allWarnings = [
      ...coreValidation.warnings,
      ...uniquenessValidation.warnings,
      ...platformValidations.flatMap(v => v.warnings),
      ...themeValidations.flatMap(v => v.warnings)
    ];

    return {
      core: coreValidation,
      platformExtensions: platformValidations,
      overall: {
        isValid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings
      }
    };
  }
} 