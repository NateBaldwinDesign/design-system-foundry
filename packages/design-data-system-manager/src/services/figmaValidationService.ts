import type { SyntaxPatterns } from '../components/shared/SyntaxPatternsEditor';

export interface FigmaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FigmaSettingsValidation {
  accessToken: FigmaValidationResult;
  fileKey: FigmaValidationResult;
  syntaxPatterns: FigmaValidationResult;
  overall: FigmaValidationResult;
}

export class FigmaValidationService {
  /**
   * Validate Figma access token format
   */
  static validateAccessToken(token: string): FigmaValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!token) {
      errors.push('Access token is required');
    } else {
      // Figma access tokens are typically 32 characters long and contain alphanumeric characters
      if (token.length < 32) {
        warnings.push('Access token seems too short for a valid Figma token');
      }
      
      if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
        warnings.push('Access token contains unexpected characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate Figma file key format
   */
  static validateFileKey(fileKey: string): FigmaValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fileKey) {
      errors.push('File key is required');
    } else {
      // Figma file keys are typically 22 characters long and contain alphanumeric characters
      if (fileKey.length !== 22) {
        warnings.push('File key should be 22 characters long');
      }
      
      if (!/^[a-zA-Z0-9]+$/.test(fileKey)) {
        warnings.push('File key should contain only alphanumeric characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate syntax patterns configuration
   */
  static validateSyntaxPatterns(patterns: SyntaxPatterns): FigmaValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate delimiter
    if (patterns.delimiter && !['', '_', '-', '.', '/'].includes(patterns.delimiter)) {
      errors.push('Invalid delimiter value. Must be empty or one of: _, -, ., /');
    }

    // Validate capitalization
    if (patterns.capitalization && !['none', 'uppercase', 'lowercase', 'capitalize'].includes(patterns.capitalization)) {
      errors.push('Invalid capitalization value. Must be one of: none, uppercase, lowercase, capitalize');
    }

    // Validate prefix/suffix length
    if (patterns.prefix && patterns.prefix.length > 10) {
      warnings.push('Prefix is quite long, consider using a shorter prefix');
    }

    if (patterns.suffix && patterns.suffix.length > 10) {
      warnings.push('Suffix is quite long, consider using a shorter suffix');
    }

    // Validate format string
    if (patterns.formatString) {
      // Check for common format string patterns
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
   * Validate complete Figma settings
   */
  static validateFigmaSettings(settings: {
    accessToken: string;
    fileKey: string;
    syntaxPatterns: SyntaxPatterns;
  }): FigmaSettingsValidation {
    const accessTokenValidation = this.validateAccessToken(settings.accessToken);
    const fileKeyValidation = this.validateFileKey(settings.fileKey);
    const syntaxPatternsValidation = this.validateSyntaxPatterns(settings.syntaxPatterns);

    // Overall validation
    const allErrors = [
      ...accessTokenValidation.errors,
      ...fileKeyValidation.errors,
      ...syntaxPatternsValidation.errors
    ];

    const allWarnings = [
      ...accessTokenValidation.warnings,
      ...fileKeyValidation.warnings,
      ...syntaxPatternsValidation.warnings
    ];

    const overallValidation: FigmaValidationResult = {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };

    return {
      accessToken: accessTokenValidation,
      fileKey: fileKeyValidation,
      syntaxPatterns: syntaxPatternsValidation,
      overall: overallValidation
    };
  }

  /**
   * Test Figma API connectivity
   */
  static async testFigmaConnection(accessToken: string, fileKey: string): Promise<{
    success: boolean;
    error?: string;
    fileInfo?: {
      name: string;
      lastModified: string;
      thumbnailUrl?: string;
    };
  }> {
    try {
      // Test file access
      const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': accessToken
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          return {
            success: false,
            error: 'Invalid access token. Please check your Figma access token.'
          };
        } else if (response.status === 404) {
          return {
            success: false,
            error: 'File not found. Please check your file key or ensure you have access to this file.'
          };
        } else {
          return {
            success: false,
            error: `Figma API error: ${response.status} ${response.statusText}`
          };
        }
      }

      const fileData = await response.json();
      
      return {
        success: true,
        fileInfo: {
          name: fileData.name,
          lastModified: fileData.lastModified,
          thumbnailUrl: fileData.thumbnailUrl
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Validate token naming against syntax patterns
   */
  static validateTokenName(name: string, patterns: SyntaxPatterns): {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // Check for invalid characters
    const invalidChars = /[^a-zA-Z0-9_-]/g;
    const matches = name.match(invalidChars);
    if (matches) {
      errors.push(`Token name contains invalid characters: ${matches.join(', ')}`);
      suggestions.push('Use only letters, numbers, hyphens, and underscores');
    }

    // Check length
    if (name.length > 50) {
      suggestions.push('Token name is quite long, consider using a shorter name');
    }

    // Check for reserved words
    const reservedWords = ['null', 'undefined', 'true', 'false', 'import', 'export', 'default'];
    if (reservedWords.includes(name.toLowerCase())) {
      suggestions.push(`"${name}" is a reserved word, consider using a different name`);
    }

    // Generate suggestions based on patterns
    if (patterns.prefix && !name.startsWith(patterns.prefix)) {
      suggestions.push(`Consider adding prefix "${patterns.prefix}"`);
    }

    if (patterns.suffix && !name.endsWith(patterns.suffix)) {
      suggestions.push(`Consider adding suffix "${patterns.suffix}"`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }
} 