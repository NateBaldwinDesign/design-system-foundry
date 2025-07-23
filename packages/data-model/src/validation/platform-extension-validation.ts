import { z } from 'zod';
import { 
  PlatformExtension, 
  TokenSystem, 
  validatePlatformExtension
} from '../schema';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PlatformExtensionValidationContext {
  coreData: TokenSystem;
  platformExtension: PlatformExtension;
}

/**
 * Validates a platform extension file for standalone validity
 */
export function validatePlatformExtensionStandalone(
  data: unknown
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const extension = validatePlatformExtension(data);
    
    // Basic validation
    if (!extension.systemId) {
      errors.push('systemId is required');
    }
    
    if (!extension.platformId) {
      errors.push('platformId is required');
    }
    
    if (!extension.version) {
      errors.push('version is required');
    }

    // Validate platform ID format
    if (extension.platformId && !extension.platformId.startsWith('platform-')) {
      warnings.push('Platform ID should follow the pattern "platform-{name}"');
    }

    // Validate that this is not a Figma platform extension with syntax patterns
    if (extension.platformId === 'platform-figma' && extension.syntaxPatterns) {
      errors.push('Figma platform extensions should not include syntaxPatterns (these belong in core data)');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        warnings: []
      };
    }
    return {
      isValid: false,
      errors: ['Unknown validation error'],
      warnings: []
    };
  }
}

/**
 * Validates a platform extension against core data for referential integrity
 */
export function validatePlatformExtensionWithCore(
  context: PlatformExtensionValidationContext
): ValidationResult {
  const { coreData, platformExtension } = context;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate system ID matches
  if (platformExtension.systemId !== coreData.systemId) {
    errors.push(`System ID mismatch: extension has "${platformExtension.systemId}", core has "${coreData.systemId}"`);
  }

  // Validate platform exists in core data
  const platformExists = coreData.platforms.some(p => p.id === platformExtension.platformId);
  if (!platformExists) {
    errors.push(`Platform "${platformExtension.platformId}" not found in core data platforms`);
  }

  // Validate token overrides referential integrity
  if (platformExtension.tokenOverrides) {
    for (const tokenOverride of platformExtension.tokenOverrides) {
      // Check if token exists in core data
      const coreToken = coreData.tokens.find(t => t.id === tokenOverride.id);
      
      if (!coreToken) {
        // This is a new token for the platform
        if (!tokenOverride.resolvedValueTypeId) {
          errors.push(`New token "${tokenOverride.id}" must specify resolvedValueTypeId`);
        }
        
        // Validate resolved value type exists
        const valueTypeExists = coreData.resolvedValueTypes.some(vt => vt.id === tokenOverride.resolvedValueTypeId);
        if (tokenOverride.resolvedValueTypeId && !valueTypeExists) {
          errors.push(`Resolved value type "${tokenOverride.resolvedValueTypeId}" not found in core data for token "${tokenOverride.id}"`);
        }
      } else {
        // This is an override of an existing token
        if (tokenOverride.resolvedValueTypeId && tokenOverride.resolvedValueTypeId !== coreToken.resolvedValueTypeId) {
          warnings.push(`Token "${tokenOverride.id}" overrides resolvedValueTypeId from "${coreToken.resolvedValueTypeId}" to "${tokenOverride.resolvedValueTypeId}"`);
        }
      }

      // Validate mode IDs in valuesByMode
      if (tokenOverride.valuesByMode) {
        for (const valueByMode of tokenOverride.valuesByMode) {
          for (const modeId of valueByMode.modeIds) {
            const modeExists = coreData.dimensions.some(d => 
              d.modes.some(m => m.id === modeId)
            );
            if (!modeExists) {
              errors.push(`Mode "${modeId}" not found in core data for token "${tokenOverride.id}"`);
            }
          }
        }
      }
    }
  }

  // Validate algorithm variable overrides
  if (platformExtension.algorithmVariableOverrides) {
    for (const algOverride of platformExtension.algorithmVariableOverrides) {
      // Validate mode IDs in algorithm overrides
      for (const valueByMode of algOverride.valuesByMode) {
        for (const modeId of valueByMode.modeIds) {
          const modeExists = coreData.dimensions.some(d => 
            d.modes.some(m => m.id === modeId)
          );
          if (!modeExists) {
            errors.push(`Mode "${modeId}" not found in core data for algorithm override "${algOverride.algorithmId}.${algOverride.variableId}"`);
          }
        }
      }
    }
  }

  // Validate omitted modes and dimensions
  if (platformExtension.omittedModes) {
    for (const modeId of platformExtension.omittedModes) {
      const modeExists = coreData.dimensions.some(d => 
        d.modes.some(m => m.id === modeId)
      );
      if (!modeExists) {
        errors.push(`Omitted mode "${modeId}" not found in core data`);
      }
    }
  }

  if (platformExtension.omittedDimensions) {
    for (const dimensionId of platformExtension.omittedDimensions) {
      const dimensionExists = coreData.dimensions.some(d => d.id === dimensionId);
      if (!dimensionExists) {
        errors.push(`Omitted dimension "${dimensionId}" not found in core data`);
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
 * Validates that syntax patterns are correctly owned (Figma in core, others in extensions)
 */
export function validateSyntaxPatternOwnership(
  coreData: TokenSystem,
  platformExtensions: PlatformExtension[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check that Figma platform in core data has syntax patterns
  const figmaPlatform = coreData.platforms.find(p => p.id === 'platform-figma');
  if (!figmaPlatform?.syntaxPatterns) {
    warnings.push('Figma platform in core data should include syntaxPatterns');
  }

  // Check that no platform extension has Figma syntax patterns
  for (const extension of platformExtensions) {
    if (extension.platformId === 'platform-figma' && extension.syntaxPatterns) {
      errors.push(`Figma platform extension "${extension.platformId}" should not include syntaxPatterns (these belong in core data)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates the platform extensions registry in core data
 */
export function validatePlatformExtensionsRegistry(
  coreData: TokenSystem
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Find platforms with extension sources
  const platformsWithExtensions = coreData.platforms.filter(p => p.extensionSource);

  for (const platform of platformsWithExtensions) {
    // Validate required fields
    if (!platform.extensionSource?.repositoryUri) {
      errors.push(`Platform "${platform.id}" missing repositoryUri in extensionSource`);
    }
    
    if (!platform.extensionSource?.filePath) {
      errors.push(`Platform "${platform.id}" missing filePath in extensionSource`);
    }

    // Validate platform ID format
    if (platform.id && !platform.id.startsWith('platform-')) {
      warnings.push(`Platform ID "${platform.id}" should follow the pattern "platform-{name}"`);
    }

    // Validate repository URI format
    if (platform.extensionSource?.repositoryUri && !platform.extensionSource.repositoryUri.includes('/')) {
      errors.push(`Repository URI "${platform.extensionSource.repositoryUri}" should be in format "owner/repo"`);
    }

    // Check for duplicate platform IDs
    const duplicateCount = coreData.platforms.filter(
      p => p.id === platform.id
    ).length;
    if (duplicateCount > 1) {
      errors.push(`Duplicate platform ID "${platform.id}" in platforms array`);
    }

    // Validate that platforms with extensionSource don't have syntaxPatterns or valueFormatters
    if (platform.syntaxPatterns) {
      errors.push(`Platform "${platform.id}" has extensionSource but also includes syntaxPatterns in core data`);
    }
    if (platform.valueFormatters) {
      errors.push(`Platform "${platform.id}" has extensionSource but also includes valueFormatters in core data`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Comprehensive validation of platform extension data
 */
export function validatePlatformExtensionComprehensive(
  context: PlatformExtensionValidationContext
): ValidationResult {
  const standaloneResult = validatePlatformExtensionStandalone(context.platformExtension);
  const coreResult = validatePlatformExtensionWithCore(context);

  return {
    isValid: standaloneResult.isValid && coreResult.isValid,
    errors: [...standaloneResult.errors, ...coreResult.errors],
    warnings: [...standaloneResult.warnings, ...coreResult.warnings]
  };
} 