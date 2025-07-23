// No imports needed for this service

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates platform extension data against the platform-extension-schema.json
 */
export class PlatformExtensionValidationService {
  /**
   * Validate platform extension data structure
   */
  static validatePlatformExtension(data: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.systemId || typeof data.systemId !== 'string') {
      errors.push('systemId is required and must be a string');
    }

    if (!data.platformId || typeof data.platformId !== 'string') {
      errors.push('platformId is required and must be a string');
    }

    if (!data.version || typeof data.version !== 'string') {
      errors.push('version is required and must be a string');
    }

    // Syntax patterns validation
    if (data.syntaxPatterns && typeof data.syntaxPatterns === 'object') {
      const syntax = data.syntaxPatterns as Record<string, unknown>;
      
      if (syntax.delimiter && typeof syntax.delimiter === 'string') {
        const validDelimiters = ['', '_', '-', '.', '/'];
        if (!validDelimiters.includes(syntax.delimiter)) {
          errors.push('syntaxPatterns.delimiter must be one of: "", "_", "-", ".", "/"');
        }
      }

      if (syntax.capitalization && typeof syntax.capitalization === 'string') {
        const validCapitalizations = ['camel', 'uppercase', 'lowercase', 'capitalize'];
        if (!validCapitalizations.includes(syntax.capitalization)) {
          errors.push('syntaxPatterns.capitalization must be one of: "camel", "uppercase", "lowercase", "capitalize"');
        }
      }
    }

    // Value formatters validation
    if (data.valueFormatters && typeof data.valueFormatters === 'object') {
      const formatters = data.valueFormatters as Record<string, unknown>;
      
      if (formatters.color && typeof formatters.color === 'string') {
        const validColorFormats = ['hex', 'rgb', 'rgba', 'hsl', 'hsla'];
        if (!validColorFormats.includes(formatters.color)) {
          errors.push('valueFormatters.color must be one of: "hex", "rgb", "rgba", "hsl", "hsla"');
        }
      }

      if (formatters.dimension && typeof formatters.dimension === 'string') {
        const validDimensionUnits = ['px', 'rem', 'em', 'pt', 'dp', 'sp'];
        if (!validDimensionUnits.includes(formatters.dimension)) {
          errors.push('valueFormatters.dimension must be one of: "px", "rem", "em", "pt", "dp", "sp"');
        }
      }

      if (formatters.numberPrecision !== undefined) {
        if (typeof formatters.numberPrecision !== 'number' || 
            formatters.numberPrecision < 0 || 
            formatters.numberPrecision > 10) {
          errors.push('valueFormatters.numberPrecision must be a number between 0 and 10');
        }
      }
    }

    // Algorithm variable overrides validation
    if (data.algorithmVariableOverrides && Array.isArray(data.algorithmVariableOverrides)) {
      const overrides = data.algorithmVariableOverrides as unknown[];
      overrides.forEach((override, index) => {
        if (typeof override !== 'object' || override === null) {
          errors.push(`algorithmVariableOverrides[${index}] must be an object`);
          return;
        }

        const overrideObj = override as Record<string, unknown>;
        
        if (!overrideObj.algorithmId || typeof overrideObj.algorithmId !== 'string') {
          errors.push(`algorithmVariableOverrides[${index}].algorithmId is required and must be a string`);
        }

        if (!overrideObj.variableId || typeof overrideObj.variableId !== 'string') {
          errors.push(`algorithmVariableOverrides[${index}].variableId is required and must be a string`);
        }

        if (!overrideObj.valuesByMode || !Array.isArray(overrideObj.valuesByMode)) {
          errors.push(`algorithmVariableOverrides[${index}].valuesByMode is required and must be an array`);
        }
      });
    }

    // Token overrides validation
    if (data.tokenOverrides && Array.isArray(data.tokenOverrides)) {
      const overrides = data.tokenOverrides as unknown[];
      overrides.forEach((override, index) => {
        if (typeof override !== 'object' || override === null) {
          errors.push(`tokenOverrides[${index}] must be an object`);
          return;
        }

        const overrideObj = override as Record<string, unknown>;
        
        if (!overrideObj.id || typeof overrideObj.id !== 'string') {
          errors.push(`tokenOverrides[${index}].id is required and must be a string`);
        }

        if (!overrideObj.valuesByMode || !Array.isArray(overrideObj.valuesByMode)) {
          errors.push(`tokenOverrides[${index}].valuesByMode is required and must be an array`);
        }
      });
    }

    // Omitted modes validation
    if (data.omittedModes && Array.isArray(data.omittedModes)) {
      const omittedModes = data.omittedModes as unknown[];
      omittedModes.forEach((modeId, index) => {
        if (typeof modeId !== 'string') {
          errors.push(`omittedModes[${index}] must be a string`);
        }
      });
    }

    // Omitted dimensions validation
    if (data.omittedDimensions && Array.isArray(data.omittedDimensions)) {
      const omittedDimensions = data.omittedDimensions as unknown[];
      omittedDimensions.forEach((dimensionId, index) => {
        if (typeof dimensionId !== 'string') {
          errors.push(`omittedDimensions[${index}] must be a string`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate that platform extension data is compatible with core data
   */
  static validateCompatibility(
    extensionData: Record<string, unknown>,
    coreData: Record<string, unknown>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check systemId compatibility
    const extensionSystemId = extensionData.systemId as string;
    const coreSystemId = coreData.systemId as string;
    
    if (extensionSystemId && coreSystemId && extensionSystemId !== coreSystemId) {
      errors.push(`Extension systemId (${extensionSystemId}) does not match core systemId (${coreSystemId})`);
    }

    // Check platformId exists in core platforms
    const extensionPlatformId = extensionData.platformId as string;
    const corePlatforms = coreData.platforms as Array<{ id: string }> || [];
    
    if (extensionPlatformId && !corePlatforms.find(p => p.id === extensionPlatformId)) {
      errors.push(`Extension platformId (${extensionPlatformId}) not found in core platforms`);
    }

    // Check token overrides reference valid core tokens
    if (extensionData.tokenOverrides && Array.isArray(extensionData.tokenOverrides)) {
      const coreTokens = coreData.tokens as Array<{ id: string }> || [];
      const tokenOverrides = extensionData.tokenOverrides as Array<{ id: string }>;
      
      tokenOverrides.forEach(override => {
        if (override.id && !coreTokens.find(t => t.id === override.id)) {
          warnings.push(`Token override references non-existent core token: ${override.id}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
} 