import { 
  TokenSystem, 
  PlatformExtension, 
  ComponentProperty,
  ComponentCategory,
  Component,
  ComponentImplementation,
  FigmaConfiguration,
  ThemeOverrideFile,
  Token
} from '../schema';

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

    // Validate component properties if present
    if (data.componentProperties) {
      const componentPropertiesValidation = this.validateComponentProperties(data.componentProperties);
      errors.push(...componentPropertiesValidation.errors);
      warnings.push(...componentPropertiesValidation.warnings);
    }

    // Validate component categories if present
    if (data.componentCategories) {
      const componentCategoriesValidation = this.validateComponentCategories(data.componentCategories);
      errors.push(...componentCategoriesValidation.errors);
      warnings.push(...componentCategoriesValidation.warnings);
    }

    // Validate components if present
    if (data.components) {
      const componentsValidation = this.validateComponents(
        data.components, 
        data.componentCategories || [], 
        data.componentProperties || []
      );
      errors.push(...componentsValidation.errors);
      warnings.push(...componentsValidation.warnings);
    }

    // Validate cross-references between components and component properties
    if (data.components && data.componentProperties) {
      const crossReferenceValidation = this.validateComponentCrossReferences(
        data.components,
        data.componentProperties,
        data.componentCategories || []
      );
      errors.push(...crossReferenceValidation.errors);
      warnings.push(...crossReferenceValidation.warnings);
    }

    // Validate default values consistency
    if (data.componentProperties) {
      const defaultValueValidation = this.validateComponentPropertyDefaults(data.componentProperties);
      errors.push(...defaultValueValidation.errors);
      warnings.push(...defaultValueValidation.warnings);
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
    if (!extension.systemId) {
      errors.push('Platform extension must have a systemId');
    }
    if (!extension.platformId) {
      errors.push('Platform extension must have a platformId');
    }
    if (!extension.version) {
      errors.push('Platform extension must have a version');
    }
    if (!extension.figmaFileKey) {
      errors.push('Platform extension must have a figmaFileKey');
    } else if (!/^[a-zA-Z0-9-_]+$/.test(extension.figmaFileKey)) {
      errors.push('figmaFileKey must contain only alphanumeric characters, hyphens, and underscores');
    }

    // Validate URLs if present
    if (extension.packageUri || extension.documentationUri) {
      const urlValidation = this.validatePlatformExtensionUrls(
        extension.packageUri,
        extension.documentationUri
      );
      errors.push(...urlValidation.errors);
      warnings.push(...urlValidation.warnings);
      }

    // Validate component implementations if present
    if (extension.componentImplementations) {
      const componentValidation = this.validateComponentImplementations(
        extension.componentImplementations
      );
      errors.push(...componentValidation.errors);
      warnings.push(...componentValidation.warnings);
    }

    // Validate syntax patterns if present
    if (extension.syntaxPatterns) {
      const syntaxValidation = this.validateSyntaxPatterns(extension.syntaxPatterns);
      errors.push(...syntaxValidation.errors);
      warnings.push(...syntaxValidation.warnings);
    }

    // Validate value formatters if present
    if (extension.valueFormatters) {
      const formatterValidation = this.validateValueFormatters(extension.valueFormatters);
      errors.push(...formatterValidation.errors);
      warnings.push(...formatterValidation.warnings);
    }

    // Validate algorithm variable overrides if present
    if (extension.algorithmVariableOverrides) {
      for (const override of extension.algorithmVariableOverrides) {
        if (!override.algorithmId) {
          errors.push('Algorithm variable override must have an algorithmId');
        }
        if (!override.variableId) {
          errors.push('Algorithm variable override must have a variableId');
        }
        if (!override.valuesByMode || override.valuesByMode.length === 0) {
          errors.push(`Algorithm variable override for ${override.algorithmId}:${override.variableId} must have at least one value in valuesByMode`);
        }
      }
    }

    // Validate token overrides if present
    if (extension.tokenOverrides) {
      for (const override of extension.tokenOverrides) {
        if (!override.id) {
          errors.push('Token override must have an id');
        }
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
   * Validates platform extensions registry entries
   */
  static validatePlatformExtensionsRegistry(registry: PlatformExtensionRegistryEntry[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate entries
    const entries = new Set<string>();
    for (const entry of registry) {
      const key = `${entry.platformId}:${entry.repositoryUri}:${entry.filePath}`;
      if (entries.has(key)) {
        errors.push(`Duplicate platform extension registry entry: ${entry.platformId}`);
      }
      entries.add(key);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates component properties
   */
  static validateComponentProperties(componentProperties: ComponentProperty[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate component property IDs
    const ids = new Set<string>();
    for (const cp of componentProperties) {
      if (ids.has(cp.id)) {
        errors.push(`Duplicate component property ID: ${cp.id}`);
      }
      ids.add(cp.id);
      
      // Type-specific validation
      if (cp.type === 'list') {
        // Check for duplicate option IDs within each list component property
        const optionIds = new Set<string>();
        for (const option of cp.options) {
          if (optionIds.has(option.id)) {
            errors.push(`Duplicate option ID '${option.id}' in component property '${cp.id}'`);
          }
          optionIds.add(option.id);
        }
        
        // Validate that default references an existing option
        if (!cp.options.some(option => option.id === cp.default)) {
          errors.push(`Default value '${cp.default}' in component property '${cp.id}' does not reference an existing option`);
        }
      } else if (cp.type === 'boolean') {
        // Boolean properties should not have options
        if ('options' in cp) {
          errors.push(`Boolean component property '${cp.id}' cannot have options`);
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
   * Validates component categories
   */
  static validateComponentCategories(componentCategories: ComponentCategory[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate component category IDs
    const ids = new Set<string>();
    for (const cc of componentCategories) {
      if (ids.has(cc.id)) {
        errors.push(`Duplicate component category ID: ${cc.id}`);
      }
      ids.add(cc.id);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates components with referential integrity checks
   */
  static validateComponents(
    components: Component[], 
    componentCategories: ComponentCategory[], 
    componentProperties: ComponentProperty[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Create lookup sets for referential integrity
    const categoryIds = new Set(componentCategories.map(cc => cc.id));
    const propertyIds = new Set(componentProperties.map(cp => cp.id));

    // Check for duplicate component IDs
    const componentIds = new Set<string>();
    for (const component of components) {
      if (componentIds.has(component.id)) {
        errors.push(`Duplicate component ID: ${component.id}`);
    }
      componentIds.add(component.id);

      // Validate componentCategoryId reference
      if (!categoryIds.has(component.componentCategoryId)) {
        errors.push(`Component '${component.id}' references non-existent component category: ${component.componentCategoryId}`);
      }

      // Validate component properties
      for (const cp of component.componentProperties) {
        // Validate componentPropertyId reference
        if (!propertyIds.has(cp.componentPropertyId)) {
          errors.push(`Component '${component.id}' references non-existent component property: ${cp.componentPropertyId}`);
        }

        // Validate supportedOptionIds if present
        if (cp.supportedOptionIds) {
          const referencedProperty = componentProperties.find(p => p.id === cp.componentPropertyId);
          if (referencedProperty && referencedProperty.type === 'list') {
            const validOptionIds = new Set(referencedProperty.options.map(o => o.id));
            for (const optionId of cp.supportedOptionIds) {
              if (!validOptionIds.has(optionId)) {
                errors.push(`Component '${component.id}' references non-existent option '${optionId}' for property '${cp.componentPropertyId}'`);
              }
            }
          } else if (referencedProperty && referencedProperty.type === 'boolean') {
            errors.push(`Component '${component.id}' specifies supportedOptionIds for boolean property '${cp.componentPropertyId}'`);
          }
        }

        // Validate default value if present
        if (cp.default !== undefined) {
          const referencedProperty = componentProperties.find(p => p.id === cp.componentPropertyId);
          if (referencedProperty) {
            if (referencedProperty.type === 'boolean' && typeof cp.default !== 'boolean') {
              errors.push(`Component '${component.id}' has invalid default value type for boolean property '${cp.componentPropertyId}'`);
            } else if (referencedProperty.type === 'list' && typeof cp.default === 'string') {
              const validOptionIds = new Set(referencedProperty.options.map(o => o.id));
              if (!validOptionIds.has(cp.default)) {
                errors.push(`Component '${component.id}' has invalid default option '${cp.default}' for property '${cp.componentPropertyId}'`);
      }
            }
          }
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
   * Validates cross-references between components and component properties
   */
  static validateComponentCrossReferences(
    components: Component[],
    componentProperties: ComponentProperty[],
    componentCategories: ComponentCategory[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Create lookup sets for referential integrity
    const categoryIds = new Set(componentCategories.map(cc => cc.id));
    const propertyIds = new Set(componentProperties.map(cp => cp.id));

    for (const component of components) {
      // Validate componentCategoryId reference
      if (!categoryIds.has(component.componentCategoryId)) {
        errors.push(`Component '${component.id}' references non-existent component category: ${component.componentCategoryId}`);
      }

      // Validate component properties
      for (const cp of component.componentProperties) {
        // Validate componentPropertyId reference
        if (!propertyIds.has(cp.componentPropertyId)) {
          errors.push(`Component '${component.id}' references non-existent component property: ${cp.componentPropertyId}`);
        }

        // Validate supportedOptionIds if present
        if (cp.supportedOptionIds) {
          const referencedProperty = componentProperties.find(p => p.id === cp.componentPropertyId);
          if (referencedProperty && referencedProperty.type === 'list') {
            const validOptionIds = new Set(referencedProperty.options.map(o => o.id));
            for (const optionId of cp.supportedOptionIds) {
              if (!validOptionIds.has(optionId)) {
                errors.push(`Component '${component.id}' references non-existent option '${optionId}' for property '${cp.componentPropertyId}'`);
              }
            }
          } else if (referencedProperty && referencedProperty.type === 'boolean') {
            errors.push(`Component '${component.id}' specifies supportedOptionIds for boolean property '${cp.componentPropertyId}'`);
          }
        }

        // Validate default value if present
        if (cp.default !== undefined) {
          const referencedProperty = componentProperties.find(p => p.id === cp.componentPropertyId);
          if (referencedProperty) {
            if (referencedProperty.type === 'boolean' && typeof cp.default !== 'boolean') {
              errors.push(`Component '${component.id}' has invalid default value type for boolean property '${cp.componentPropertyId}'`);
            } else if (referencedProperty.type === 'list' && typeof cp.default === 'string') {
              const validOptionIds = new Set(referencedProperty.options.map(o => o.id));
              if (!validOptionIds.has(cp.default)) {
                errors.push(`Component '${component.id}' has invalid default option '${cp.default}' for property '${cp.componentPropertyId}'`);
              }
            }
          }
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
   * Validates default values consistency
   */
  static validateComponentPropertyDefaults(componentProperties: ComponentProperty[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const cp of componentProperties) {
      if (cp.default !== undefined) {
        const referencedProperty = componentProperties.find(p => p.id === cp.id); // Find the property itself to check its type
        if (referencedProperty) {
          if (referencedProperty.type === 'boolean' && typeof cp.default !== 'boolean') {
            errors.push(`Component property '${cp.id}' has invalid default value type: expected boolean, got ${typeof cp.default}`);
          } else if (referencedProperty.type === 'list' && typeof cp.default === 'string') {
            const validOptionIds = new Set(referencedProperty.options.map(o => o.id));
            if (!validOptionIds.has(cp.default)) {
              errors.push(`Component property '${cp.id}' has invalid default option: ${cp.default}`);
            }
          }
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
   * Validates component implementations in platform extensions
   */
  static validateComponentImplementations(
    componentImplementations: ComponentImplementation[],
    coreComponents: Component[] = []
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Create lookup set for core component IDs
    const coreComponentIds = new Set(coreComponents.map(c => c.id));

    for (const impl of componentImplementations) {
      // Validate componentId reference if it's not empty (platform-only components can have empty componentId)
      if (impl.componentId && !coreComponentIds.has(impl.componentId)) {
        warnings.push(`Component implementation '${impl.componentName}' references non-existent core component: ${impl.componentId}`);
      }

      // Validate URLs if present
      if (impl.storybookStory && !this.isValidUrl(impl.storybookStory)) {
        errors.push(`Invalid storybookStory URL for component '${impl.componentName}': ${impl.storybookStory}`);
      }

      if (impl.playgroundUrl && !this.isValidUrl(impl.playgroundUrl)) {
        errors.push(`Invalid playgroundUrl for component '${impl.componentName}': ${impl.playgroundUrl}`);
      }

      if (impl.imageUrl && !this.isValidUrl(impl.imageUrl)) {
        errors.push(`Invalid imageUrl for component '${impl.componentName}': ${impl.imageUrl}`);
      }

      // Validate examples URLs if present
      if (impl.examples) {
        if (impl.examples.documentationUri && !this.isValidUrl(impl.examples.documentationUri)) {
          errors.push(`Invalid documentationUri for component '${impl.componentName}': ${impl.examples.documentationUri}`);
        }
      }

      // Validate token usage if present
      if (impl.tokenUsage) {
        for (const usage of impl.tokenUsage) {
          if (!usage.attribute || usage.attribute.trim() === '') {
            errors.push(`Component '${impl.componentName}' has token usage with empty attribute`);
          }
          if (!usage.tokenTypes || usage.tokenTypes.length === 0) {
            errors.push(`Component '${impl.componentName}' has token usage with empty tokenTypes`);
          }
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
   * Validates URLs for platform extension metadata
   */
  static validatePlatformExtensionUrls(
    packageUri?: string,
    documentationUri?: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (packageUri && !this.isValidUrl(packageUri)) {
      errors.push(`Invalid packageUri: ${packageUri}`);
    }

    if (documentationUri && !this.isValidUrl(documentationUri)) {
      errors.push(`Invalid documentationUri: ${documentationUri}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Helper method to validate URLs
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
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

    // Cross-validation between core data and platform extensions
    const crossValidation = this.validateCrossReferences(coreData, platformExtensions);

    // Combine all errors and warnings
    const allErrors = [
      ...coreValidation.errors,
      ...uniquenessValidation.errors,
      ...crossValidation.errors,
      ...platformValidations.flatMap(v => v.errors),
      ...themeValidations.flatMap(v => v.errors)
    ];

    const allWarnings = [
      ...coreValidation.warnings,
      ...uniquenessValidation.warnings,
      ...crossValidation.warnings,
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

  /**
   * Validates cross-references between core data and platform extensions
   */
  static validateCrossReferences(
    coreData: TokenSystem,
    platformExtensions: PlatformExtension[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate platform extension systemId references
    for (const extension of platformExtensions) {
      if (extension.systemId !== coreData.systemId) {
        errors.push(`Platform extension ${extension.platformId} references non-existent system: ${extension.systemId}`);
      }
    }

    // Validate platform extension platformId references
    const platformIds = new Set(coreData.platforms.map(p => p.id));
    for (const extension of platformExtensions) {
      if (!platformIds.has(extension.platformId)) {
        errors.push(`Platform extension references non-existent platform: ${extension.platformId}`);
      }
    }

    // Validate component implementations against core components
    for (const extension of platformExtensions) {
      if (extension.componentImplementations && coreData.components) {
        const componentValidation = this.validateComponentImplementations(
          extension.componentImplementations,
          coreData.components
        );
        errors.push(...componentValidation.errors);
        warnings.push(...componentValidation.warnings);
      }
    }

    // Validate token references in component implementations
    for (const extension of platformExtensions) {
      if (extension.componentImplementations && coreData.tokens) {
        const tokenValidation = this.validateComponentImplementationTokens(
          extension.componentImplementations,
          coreData.tokens
        );
        errors.push(...tokenValidation.errors);
        warnings.push(...tokenValidation.warnings);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates token references in component implementations
   */
  static validateComponentImplementationTokens(
    componentImplementations: ComponentImplementation[],
    tokens: Token[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const tokenIds = new Set(tokens.map(t => t.id));

    for (const impl of componentImplementations) {
      if (impl.tokenUsage) {
        for (const usage of impl.tokenUsage) {
          if (usage.defaultTokenId && !tokenIds.has(usage.defaultTokenId)) {
            errors.push(`Component '${impl.componentName}' references non-existent token: ${usage.defaultTokenId}`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
} 