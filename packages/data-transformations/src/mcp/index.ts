import type { TokenSystem } from '@token-model/data-model';

// Define transformation output types
export interface FigmaData {
  variables: Array<{
    id: string;
    name: string;
    description: string;
    resolvedType: string;
  }>;
  collections: unknown[];
  modes: unknown[];
}

export interface CSSData {
  variables: Array<{
    name: string;
    value: string;
    comment?: string;
  }>;
  classes: unknown[];
  utilities: unknown[];
}

export interface DesignTokensData {
  tokens: Record<string, Record<string, {
    value: string;
    type: string;
    description?: string;
  }>>;
  metadata: {
    name: string;
    version: string;
  };
}

export interface TransformationConfig {
  transformer: string;
  options: Record<string, unknown>;
  outputFormat: string;
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  pattern?: string;
  min?: number;
  max?: number;
}

export interface TransformationResult {
  success: boolean;
  data?: unknown;
  error?: string;
  warnings?: string[];
  metadata?: {
    transformer: string;
    timestamp: string;
    inputSize: number;
    outputSize: number;
  };
}

export interface TransformationValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * MCP (Model Context Protocol) for Data Transformations
 * Provides structured access to transformation operations
 */
export class TransformationMCP {
  private availableTransformers: string[] = [
    'figma',
    'css',
    'design-tokens',
    'scss',
    'json',
    'typescript'
  ];

  constructor() {
    // Initialize transformation capabilities
  }

  // ============================================================================
  // Transformer Discovery
  // ============================================================================

  /**
   * Get all available transformers
   */
  getAvailableTransformers(): string[] {
    return this.availableTransformers;
  }

  /**
   * Get transformer capabilities
   */
  getTransformerCapabilities(transformer: string): {
    supportedFormats: string[];
    supportedValueTypes: string[];
    configurationOptions: string[];
  } {
    const capabilities: Record<string, {
      supportedFormats: string[];
      supportedValueTypes: string[];
      configurationOptions: string[];
    }> = {
      figma: {
        supportedFormats: ['json'],
        supportedValueTypes: ['color', 'dimension', 'typography', 'spacing'],
        configurationOptions: ['prefix', 'suffix', 'namingConvention']
      },
      css: {
        supportedFormats: ['css', 'scss'],
        supportedValueTypes: ['color', 'dimension', 'typography', 'spacing', 'shadow'],
        configurationOptions: ['prefix', 'suffix', 'namingConvention', 'outputFormat']
      },
      'design-tokens': {
        supportedFormats: ['json', 'yaml'],
        supportedValueTypes: ['color', 'dimension', 'typography', 'spacing', 'shadow', 'border'],
        configurationOptions: ['format', 'namingConvention', 'grouping']
      },
      scss: {
        supportedFormats: ['scss'],
        supportedValueTypes: ['color', 'dimension', 'typography', 'spacing'],
        configurationOptions: ['prefix', 'suffix', 'namingConvention', 'useVariables']
      },
      json: {
        supportedFormats: ['json'],
        supportedValueTypes: ['color', 'dimension', 'typography', 'spacing', 'shadow', 'border'],
        configurationOptions: ['format', 'indentation', 'sortKeys']
      },
      typescript: {
        supportedFormats: ['ts', 'js'],
        supportedValueTypes: ['color', 'dimension', 'typography', 'spacing', 'shadow', 'border'],
        configurationOptions: ['exportType', 'namingConvention', 'includeTypes']
      }
    };

    return capabilities[transformer] || {
      supportedFormats: [],
      supportedValueTypes: [],
      configurationOptions: []
    };
  }

  // ============================================================================
  // Transformation Operations
  // ============================================================================

  /**
   * Transform to Figma format
   */
  async transformToFigma(schema: TokenSystem, config?: Partial<TransformationConfig>): Promise<TransformationResult> {
    try {
      // This would integrate with the actual Figma transformer
      const figmaData: FigmaData = {
        variables: [],
        collections: [],
        modes: []
      };

      // Transform tokens to Figma variables
      for (const token of schema.tokens) {
        // Transform logic would go here
        figmaData.variables.push({
          id: token.id,
          name: token.displayName,
          description: token.description || '',
          resolvedType: token.resolvedValueTypeId,
          // Add more transformation logic
        });
      }

      return {
        success: true,
        data: figmaData,
        metadata: {
          transformer: 'figma',
          timestamp: new Date().toISOString(),
          inputSize: JSON.stringify(schema).length,
          outputSize: JSON.stringify(figmaData).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during Figma transformation'
      };
    }
  }

  /**
   * Transform to CSS format
   */
  async transformToCSS(schema: TokenSystem, config?: Partial<TransformationConfig>): Promise<TransformationResult> {
    try {
      const cssData: CSSData = {
        variables: [],
        classes: [],
        utilities: []
      };

      // Transform tokens to CSS custom properties
      for (const token of schema.tokens) {
        cssData.variables.push({
          name: `--${token.id}`,
          value: this.getTokenValue(token),
          comment: token.description || ''
        });
      }

      return {
        success: true,
        data: cssData,
        metadata: {
          transformer: 'css',
          timestamp: new Date().toISOString(),
          inputSize: JSON.stringify(schema).length,
          outputSize: JSON.stringify(cssData).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during CSS transformation'
      };
    }
  }

  /**
   * Transform to Design Tokens format
   */
  async transformToDesignTokens(schema: TokenSystem, config?: Partial<TransformationConfig>): Promise<TransformationResult> {
    try {
      const designTokensData: DesignTokensData = {
        tokens: {},
        metadata: {
          name: schema.systemName,
          version: schema.version
        }
      };

      // Group tokens by collection
      for (const collection of schema.tokenCollections) {
        const collectionTokens = schema.tokens.filter(token => 
          token.tokenCollectionId === collection.id
        );

        designTokensData.tokens[collection.name] = {};
        
        for (const token of collectionTokens) {
          designTokensData.tokens[collection.name][token.displayName] = {
            value: this.getTokenValue(token),
            type: token.resolvedValueTypeId,
            description: token.description
          };
        }
      }

      return {
        success: true,
        data: designTokensData,
        metadata: {
          transformer: 'design-tokens',
          timestamp: new Date().toISOString(),
          inputSize: JSON.stringify(schema).length,
          outputSize: JSON.stringify(designTokensData).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during Design Tokens transformation'
      };
    }
  }

  /**
   * Transform to SCSS format
   */
  async transformToSCSS(schema: TokenSystem, config?: Partial<TransformationConfig>): Promise<TransformationResult> {
    try {
      const scssData = {
        variables: [] as Array<{ name: string; value: string; comment?: string }>,
        mixins: [] as Array<{ name: string; content: string }>,
        functions: [] as Array<{ name: string; content: string }>
      };

      // Transform tokens to SCSS variables
      for (const token of schema.tokens) {
        scssData.variables.push({
          name: `$${token.id}`,
          value: this.getTokenValue(token),
          comment: token.description
        });
      }

      return {
        success: true,
        data: scssData,
        metadata: {
          transformer: 'scss',
          timestamp: new Date().toISOString(),
          inputSize: JSON.stringify(schema).length,
          outputSize: JSON.stringify(scssData).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during SCSS transformation'
      };
    }
  }

  /**
   * Transform to JSON format
   */
  async transformToJSON(schema: TokenSystem, config?: Partial<TransformationConfig>): Promise<TransformationResult> {
    try {
      const jsonData = {
        system: {
          name: schema.systemName,
          id: schema.systemId,
          version: schema.version
        },
        tokens: schema.tokens,
        collections: schema.tokenCollections,
        dimensions: schema.dimensions,
        valueTypes: schema.resolvedValueTypes
      };

      return {
        success: true,
        data: jsonData,
        metadata: {
          transformer: 'json',
          timestamp: new Date().toISOString(),
          inputSize: JSON.stringify(schema).length,
          outputSize: JSON.stringify(jsonData).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during JSON transformation'
      };
    }
  }

  /**
   * Transform to TypeScript format
   */
  async transformToTypeScript(schema: TokenSystem, config?: Partial<TransformationConfig>): Promise<TransformationResult> {
    try {
      const tsData = {
        interfaces: [] as string[],
        constants: [] as string[],
        types: [] as string[]
      };

      // Generate TypeScript interfaces
      tsData.interfaces.push(`
export interface TokenSystem {
  systemName: string;
  systemId: string;
  version: string;
  tokens: Token[];
  collections: TokenCollection[];
  dimensions: Dimension[];
  valueTypes: ResolvedValueType[];
}
      `);

      // Generate token constants
      for (const token of schema.tokens) {
        tsData.constants.push(`
export const ${token.id.toUpperCase()} = '${token.id}' as const;
        `);
      }

      return {
        success: true,
        data: tsData,
        metadata: {
          transformer: 'typescript',
          timestamp: new Date().toISOString(),
          inputSize: JSON.stringify(schema).length,
          outputSize: JSON.stringify(tsData).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during TypeScript transformation'
      };
    }
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================

  /**
   * Validate transformation configuration
   */
  validateTransformationConfig(config: TransformationConfig): TransformationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check if transformer is supported
    if (!this.availableTransformers.includes(config.transformer)) {
      errors.push(`Transformer '${config.transformer}' is not supported`);
    }

    // Validate required options
    if (!config.outputFormat) {
      errors.push('Output format is required');
    }

    // Check for common configuration issues
    if (config.options.prefix && typeof config.options.prefix !== 'string') {
      errors.push('Prefix must be a string');
    }

    if (config.options.suffix && typeof config.options.suffix !== 'string') {
      errors.push('Suffix must be a string');
    }

    // Provide suggestions
    if (config.transformer === 'figma' && !config.options.namingConvention) {
      suggestions.push('Consider adding a naming convention for Figma variables');
    }

    if (config.transformer === 'css' && !config.options.prefix) {
      suggestions.push('Consider adding a prefix to avoid CSS variable conflicts');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Validate source schema for transformation
   */
  validateSourceForTransformation(source: TokenSystem, target: string): TransformationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check if schema has required elements
    if (!source.tokens || source.tokens.length === 0) {
      errors.push('Schema must contain at least one token');
    }

    if (!source.tokenCollections || source.tokenCollections.length === 0) {
      errors.push('Schema must contain at least one collection');
    }

    if (!source.resolvedValueTypes || source.resolvedValueTypes.length === 0) {
      errors.push('Schema must contain at least one resolved value type');
    }

    // Target-specific validation
    if (target === 'figma') {
      // Figma-specific validation
      const unsupportedTokens = source.tokens.filter(token => 
        !['color', 'dimension', 'typography', 'spacing'].includes(token.resolvedValueTypeId)
      );
      
      if (unsupportedTokens.length > 0) {
        warnings.push(`Some tokens may not be fully supported in Figma: ${unsupportedTokens.map(t => t.displayName).join(', ')}`);
      }
    }

    if (target === 'css') {
      // CSS-specific validation
      const invalidNames = source.tokens.filter(token => 
        !/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(token.id)
      );
      
      if (invalidNames.length > 0) {
        errors.push(`Some token IDs are not valid CSS variable names: ${invalidNames.map(t => t.id).join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  // ============================================================================
  // Configuration Functions
  // ============================================================================

  /**
   * Get transformation configuration for a specific transformer
   */
  getTransformationConfig(transformer: string): TransformationConfig {
    const defaultConfigs: Record<string, TransformationConfig> = {
      figma: {
        transformer: 'figma',
        options: {
          prefix: 'ds-',
          suffix: '',
          namingConvention: 'kebab-case'
        },
        outputFormat: 'json',
        validationRules: [
          { field: 'prefix', required: false, type: 'string' },
          { field: 'namingConvention', required: true, type: 'string' }
        ]
      },
      css: {
        transformer: 'css',
        options: {
          prefix: '--',
          suffix: '',
          namingConvention: 'kebab-case',
          outputFormat: 'css'
        },
        outputFormat: 'css',
        validationRules: [
          { field: 'prefix', required: true, type: 'string' },
          { field: 'namingConvention', required: true, type: 'string' }
        ]
      },
      'design-tokens': {
        transformer: 'design-tokens',
        options: {
          format: 'json',
          namingConvention: 'camelCase',
          grouping: 'by-collection'
        },
        outputFormat: 'json',
        validationRules: [
          { field: 'format', required: true, type: 'string' },
          { field: 'namingConvention', required: true, type: 'string' }
        ]
      }
    };

    return defaultConfigs[transformer] || {
      transformer,
      options: {},
      outputFormat: 'json',
      validationRules: []
    };
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Get available MCP functions
   */
  getAvailableFunctions(): string[] {
    return [
      'getAvailableTransformers()',
      'getTransformerCapabilities(transformer)',
      'transformToFigma(schema, config)',
      'transformToCSS(schema, config)',
      'transformToDesignTokens(schema, config)',
      'transformToSCSS(schema, config)',
      'transformToJSON(schema, config)',
      'transformToTypeScript(schema, config)',
      'validateTransformationConfig(config)',
      'validateSourceForTransformation(source, target)',
      'getTransformationConfig(transformer)'
    ];
  }

  /**
   * Helper function to get token value
   */
  private getTokenValue(token: any): string {
    // This is a simplified version - in practice, this would handle
    // different value types and modes more comprehensively
    if (token.valuesByMode && Object.keys(token.valuesByMode).length > 0) {
      const firstMode = Object.keys(token.valuesByMode)[0];
      return token.valuesByMode[firstMode].value || '';
    }
    return '';
  }
} 