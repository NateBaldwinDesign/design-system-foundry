import type { 
  TokenSystem, 
  Token, 
  TokenCollection, 
  Dimension, 
  ResolvedValueType, 
  Mode,
  Platform,
  Theme,
  Taxonomy
} from '../index';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  suggestedFix?: string;
}

export interface ValidationWarning {
  path: string;
  message: string;
  suggestedFix?: string;
}

export interface MCPQuery {
  type: 'getResolvedValueTypes' | 'getTokenCollections' | 'getDimensions' | 'getTokens' | 'getPlatforms' | 'getThemes' | 'getTaxonomies';
  filters?: Record<string, unknown>;
}

export interface MCPResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  validationResult?: ValidationResult;
}

/**
 * Core MCP (Model Context Protocol) for Design Token System
 * Provides structured, type-safe access to schema elements
 */
export class TokenSystemMCP {
  private schema: TokenSystem;

  constructor(schema: TokenSystem) {
    this.schema = schema;
  }

  // ============================================================================
  // Schema Query Functions
  // ============================================================================

  /**
   * Get all resolved value types
   */
  getResolvedValueTypes(): ResolvedValueType[] {
    return this.schema.resolvedValueTypes;
  }

  /**
   * Get all token collections
   */
  getTokenCollections(): TokenCollection[] {
    return this.schema.tokenCollections;
  }

  /**
   * Get all dimensions
   */
  getDimensions(): Dimension[] {
    return this.schema.dimensions;
  }

  /**
   * Get all tokens
   */
  getTokens(): Token[] {
    return this.schema.tokens;
  }

  /**
   * Get all platforms
   */
  getPlatforms(): Platform[] {
    return this.schema.platforms;
  }

  /**
   * Get all themes
   */
  getThemes(): Theme[] {
    return this.schema.themes || [];
  }

  /**
   * Get all taxonomies
   */
  getTaxonomies(): Taxonomy[] {
    return this.schema.taxonomies || [];
  }

  /**
   * Get all standard property types
   */
  getStandardPropertyTypes(): unknown[] {
    return this.schema.standardPropertyTypes;
  }

  // ============================================================================
  // Relationship Query Functions
  // ============================================================================

  /**
   * Get tokens by collection ID
   */
  getTokensByCollection(collectionId: string): Token[] {
    return this.schema.tokens.filter(token => 
      token.tokenCollectionId === collectionId
    );
  }

  /**
   * Get tokens by resolved value type ID
   */
  getTokensByValueType(valueTypeId: string): Token[] {
    return this.schema.tokens.filter(token => 
      token.resolvedValueTypeId === valueTypeId
    );
  }

  /**
   * Get collections that support a specific value type
   */
  getCompatibleCollections(valueTypeId: string): TokenCollection[] {
    return this.schema.tokenCollections.filter(collection =>
      collection.resolvedValueTypeIds.includes(valueTypeId)
    );
  }

  /**
   * Get modes for a specific dimension
   */
  getModesByDimension(dimensionId: string): Mode[] {
    const dimension = this.schema.dimensions.find(d => d.id === dimensionId);
    return dimension?.modes || [];
  }

  /**
   * Get tokens by tier (PRIMITIVE, SEMANTIC, COMPONENT)
   */
  getTokensByTier(tier: 'PRIMITIVE' | 'SEMANTIC' | 'COMPONENT'): Token[] {
    return this.schema.tokens.filter(token => token.tokenTier === tier);
  }

  /**
   * Get private tokens
   */
  getPrivateTokens(): Token[] {
    return this.schema.tokens.filter(token => token.private);
  }

  /**
   * Get public tokens
   */
  getPublicTokens(): Token[] {
    return this.schema.tokens.filter(token => !token.private);
  }

  // ============================================================================
  // Search Functions
  // ============================================================================

  /**
   * Search tokens by name or description
   */
  searchTokens(query: string): Token[] {
    const lowerQuery = query.toLowerCase();
    return this.schema.tokens.filter(token => 
      token.displayName.toLowerCase().includes(lowerQuery) ||
      (token.description && token.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Search collections by name or description
   */
  searchCollections(query: string): TokenCollection[] {
    const lowerQuery = query.toLowerCase();
    return this.schema.tokenCollections.filter(collection => 
      collection.name.toLowerCase().includes(lowerQuery) ||
      (collection.description && collection.description.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Search dimensions by name or description
   */
  searchDimensions(query: string): Dimension[] {
    const lowerQuery = query.toLowerCase();
    return this.schema.dimensions.filter(dimension => 
      dimension.displayName.toLowerCase().includes(lowerQuery) ||
      (dimension.description && dimension.description.toLowerCase().includes(lowerQuery))
    );
  }

  // ============================================================================
  // Validation Functions
  // ============================================================================

  /**
   * Validate a token against the schema
   */
  validateToken(token: Partial<Token>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (!token.id) {
      errors.push({
        path: 'id',
        message: 'Token ID is required',
        severity: 'error'
      });
    }

    if (!token.displayName) {
      errors.push({
        path: 'displayName',
        message: 'Token display name is required',
        severity: 'error'
      });
    }

    if (!token.resolvedValueTypeId) {
      errors.push({
        path: 'resolvedValueTypeId',
        message: 'Resolved value type ID is required',
        severity: 'error'
      });
    }

    if (!token.tokenTier) {
      errors.push({
        path: 'tokenTier',
        message: 'Token tier is required',
        severity: 'error'
      });
    }

    // Value type validation
    if (token.resolvedValueTypeId) {
      const valueType = this.schema.resolvedValueTypes.find(vt => vt.id === token.resolvedValueTypeId);
      if (!valueType) {
        errors.push({
          path: 'resolvedValueTypeId',
          message: `Resolved value type '${token.resolvedValueTypeId}' does not exist`,
          severity: 'error'
        });
      }
    }

    // Collection validation
    if (token.tokenCollectionId) {
      const collection = this.schema.tokenCollections.find(c => c.id === token.tokenCollectionId);
      if (!collection) {
        errors.push({
          path: 'tokenCollectionId',
          message: `Token collection '${token.tokenCollectionId}' does not exist`,
          severity: 'error'
        });
      } else if (token.resolvedValueTypeId && !collection.resolvedValueTypeIds.includes(token.resolvedValueTypeId)) {
        errors.push({
          path: 'tokenCollectionId',
          message: `Collection '${collection.name}' does not support value type '${token.resolvedValueTypeId}'`,
          severity: 'error'
        });
      }
    }

    // ID format validation
    if (token.id && !/^[a-zA-Z0-9-_]+$/.test(token.id)) {
      errors.push({
        path: 'id',
        message: 'Token ID must contain only letters, numbers, hyphens, and underscores',
        severity: 'error'
      });
    }

    // Name format validation
    if (token.displayName && token.displayName.length < 2) {
      warnings.push({
        path: 'displayName',
        message: 'Token display name should be at least 2 characters long',
        suggestedFix: 'Use a more descriptive name'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a collection against the schema
   */
  validateCollection(collection: Partial<TokenCollection>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (!collection.id) {
      errors.push({
        path: 'id',
        message: 'Collection ID is required',
        severity: 'error'
      });
    }

    if (!collection.name) {
      errors.push({
        path: 'name',
        message: 'Collection name is required',
        severity: 'error'
      });
    }

    if (!collection.resolvedValueTypeIds || collection.resolvedValueTypeIds.length === 0) {
      errors.push({
        path: 'resolvedValueTypeIds',
        message: 'Collection must support at least one resolved value type',
        severity: 'error'
      });
    }

    // Value type validation
    if (collection.resolvedValueTypeIds) {
      for (const valueTypeId of collection.resolvedValueTypeIds) {
        const valueType = this.schema.resolvedValueTypes.find((vt: ResolvedValueType) => vt.id === valueTypeId);
        if (!valueType) {
          errors.push({
            path: 'resolvedValueTypeIds',
            message: `Resolved value type '${valueTypeId}' does not exist`,
            severity: 'error'
          });
        }
      }
    }

    // ID format validation
    if (collection.id && !/^[a-zA-Z0-9-_]+$/.test(collection.id)) {
      errors.push({
        path: 'id',
        message: 'Collection ID must contain only letters, numbers, hyphens, and underscores',
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate a dimension against the schema
   */
  validateDimension(dimension: Partial<Dimension>): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (!dimension.id) {
      errors.push({
        path: 'id',
        message: 'Dimension ID is required',
        severity: 'error'
      });
    }

    if (!dimension.displayName) {
      errors.push({
        path: 'displayName',
        message: 'Dimension display name is required',
        severity: 'error'
      });
    }

    if (!dimension.modes || dimension.modes.length === 0) {
      errors.push({
        path: 'modes',
        message: 'Dimension must have at least one mode',
        severity: 'error'
      });
    }

    if (!dimension.defaultMode) {
      errors.push({
        path: 'defaultMode',
        message: 'Dimension must have a default mode',
        severity: 'error'
      });
    }

    // Mode validation
    if (dimension.modes && dimension.defaultMode) {
      const modeIds = dimension.modes.map(m => m.id);
      if (!modeIds.includes(dimension.defaultMode)) {
        errors.push({
          path: 'defaultMode',
          message: 'Default mode must be one of the dimension modes',
          severity: 'error'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Get system information
   */
  getSystemInfo(): {
    systemName: string;
    systemId: string;
    version: string;
    tokenCount: number;
    collectionCount: number;
    dimensionCount: number;
    valueTypeCount: number;
  } {
    return {
      systemName: this.schema.systemName,
      systemId: this.schema.systemId,
      version: this.schema.version,
      tokenCount: this.schema.tokens.length,
      collectionCount: this.schema.tokenCollections.length,
      dimensionCount: this.schema.dimensions.length,
      valueTypeCount: this.schema.resolvedValueTypes.length
    };
  }

  /**
   * Get available MCP functions
   */
  getAvailableFunctions(): string[] {
    return [
      'getResolvedValueTypes()',
      'getTokenCollections()',
      'getDimensions()',
      'getTokens()',
      'getPlatforms()',
      'getThemes()',
      'getTaxonomies()',
      'getTokensByCollection(collectionId)',
      'getTokensByValueType(valueTypeId)',
      'getCompatibleCollections(valueTypeId)',
      'getModesByDimension(dimensionId)',
      'getTokensByTier(tier)',
      'getPrivateTokens()',
      'getPublicTokens()',
      'searchTokens(query)',
      'searchCollections(query)',
      'searchDimensions(query)',
      'validateToken(token)',
      'validateCollection(collection)',
      'validateDimension(dimension)',
      'getSystemInfo()'
    ];
  }

  /**
   * Execute a query against the MCP
   */
  executeQuery(query: MCPQuery): MCPResponse {
    try {
      let data: unknown;

      switch (query.type) {
        case 'getResolvedValueTypes':
          data = this.getResolvedValueTypes();
          break;
        case 'getTokenCollections':
          data = this.getTokenCollections();
          break;
        case 'getDimensions':
          data = this.getDimensions();
          break;
        case 'getTokens':
          data = this.getTokens();
          break;
        case 'getPlatforms':
          data = this.getPlatforms();
          break;
        case 'getThemes':
          data = this.getThemes();
          break;
        case 'getTaxonomies':
          data = this.getTaxonomies();
          break;
        default:
          return {
            success: false,
            error: `Unknown query type: ${query.type}`
          };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 