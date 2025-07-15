import type { TokenSystem } from '@token-model/data-model';
import { TokenSystemMCP } from '@token-model/data-model';
import { TransformationMCP } from '@token-model/data-transformations';

export interface CustomerMCP {
  // Customer-specific queries
  getCustomerTokens(): TokenSystem['tokens'];
  getCustomerCollections(): TokenSystem['tokenCollections'];
  getCustomerDimensions(): TokenSystem['dimensions'];
  getCustomerValueTypes(): TokenSystem['resolvedValueTypes'];
  
  // Customer-specific validations
  validateCustomerToken(token: Partial<TokenSystem['tokens'][0]>): unknown;
  validateCustomerCollection(collection: Partial<TokenSystem['tokenCollections'][0]>): unknown;
  validateCustomerDimension(dimension: Partial<TokenSystem['dimensions'][0]>): unknown;
  
  // Customer-specific transformations
  transformCustomerData(target: string, config?: unknown): Promise<unknown>;
  
  // Customer-specific search
  searchCustomerTokens(query: string): TokenSystem['tokens'];
  searchCustomerCollections(query: string): TokenSystem['tokenCollections'];
  
  // Customer-specific analytics
  getCustomerAnalytics(): {
    tokenCount: number;
    collectionCount: number;
    dimensionCount: number;
    valueTypeCount: number;
    mostUsedCollections: string[];
    tokenDistribution: Record<string, number>;
  };
  
  // Metadata
  metadata: {
    customerId: string;
    customerName: string;
    generatedAt: string;
    version: string;
    schemaVersion: string;
  };
}

export interface MCPGenerationOptions {
  customerId: string;
  customerName: string;
  includeTransformations?: boolean;
  includeAnalytics?: boolean;
  customValidations?: Record<string, unknown>;
  customQueries?: Record<string, unknown>;
}

export interface MCPRepository {
  customerId: string;
  mcp: CustomerMCP;
  schema: TokenSystem;
  version: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Customer-Specific MCP Generator
 * Creates tailored MCPs based on user data loaded into the web application
 */
export class MCPGenerator {
  private repository: MCPRepository[] = [];

  /**
   * Generate a customer-specific MCP
   */
  async generateCustomerMCP(
    customerSchema: TokenSystem,
    options: MCPGenerationOptions
  ): Promise<CustomerMCP> {
    const baseMCP = new TokenSystemMCP(customerSchema);
    const transformationMCP = new TransformationMCP();

    // Generate customer-specific analytics
    const analytics = this.generateCustomerAnalytics(customerSchema);

    // Generate customer-specific validations
    const customValidations = this.generateCustomValidations(customerSchema, options.customValidations);

    // Generate customer-specific queries
    this.generateCustomQueries(customerSchema, options.customQueries);

    const customerMCP: CustomerMCP = {
      // Customer-specific queries
      getCustomerTokens: () => customerSchema.tokens,
      getCustomerCollections: () => customerSchema.tokenCollections,
      getCustomerDimensions: () => customerSchema.dimensions,
      getCustomerValueTypes: () => customerSchema.resolvedValueTypes,
      
      // Customer-specific validations
      validateCustomerToken: (token) => {
        const baseValidation = baseMCP.validateToken(token);
        const customValidation = customValidations.validateToken?.(token);
        
        return {
          ...baseValidation,
          customErrors: customValidation?.errors || [],
          customWarnings: customValidation?.warnings || []
        };
      },
      
      validateCustomerCollection: (collection) => {
        const baseValidation = baseMCP.validateCollection(collection);
        const customValidation = customValidations.validateCollection?.(collection);
        
        return {
          ...baseValidation,
          customErrors: customValidation?.errors || [],
          customWarnings: customValidation?.warnings || []
        };
      },
      
      validateCustomerDimension: (dimension) => {
        const baseValidation = baseMCP.validateDimension(dimension);
        const customValidation = customValidations.validateDimension?.(dimension);
        
        return {
          ...baseValidation,
          customErrors: customValidation?.errors || [],
          customWarnings: customValidation?.warnings || []
        };
      },
      
      // Customer-specific transformations
      transformCustomerData: async (target, config) => {
        if (!options.includeTransformations) {
          throw new Error('Transformations not included in this MCP');
        }
        
        switch (target) {
          case 'figma':
            return await transformationMCP.transformToFigma(customerSchema, config);
          case 'css':
            return await transformationMCP.transformToCSS(customerSchema, config);
          case 'design-tokens':
            return await transformationMCP.transformToDesignTokens(customerSchema, config);
          case 'scss':
            return await transformationMCP.transformToSCSS(customerSchema, config);
          case 'json':
            return await transformationMCP.transformToJSON(customerSchema, config);
          case 'typescript':
            return await transformationMCP.transformToTypeScript(customerSchema, config);
          default:
            throw new Error(`Unsupported transformation target: ${target}`);
        }
      },
      
      // Customer-specific search
      searchCustomerTokens: (query) => baseMCP.searchTokens(query),
      searchCustomerCollections: (query) => baseMCP.searchCollections(query),
      
      // Customer-specific analytics
      getCustomerAnalytics: () => analytics,
      
      // Metadata
      metadata: {
        customerId: options.customerId,
        customerName: options.customerName,
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        schemaVersion: customerSchema.version
      }
    };

    // Save to repository
    await this.saveMCPToRepository(customerMCP, customerSchema, options);

    return customerMCP;
  }

  /**
   * Generate customer-specific analytics
   */
  private generateCustomerAnalytics(schema: TokenSystem) {
    // Calculate most used collections
    const collectionUsage = new Map<string, number>();
    for (const token of schema.tokens) {
      if (token.tokenCollectionId) {
        collectionUsage.set(
          token.tokenCollectionId,
          (collectionUsage.get(token.tokenCollectionId) || 0) + 1
        );
      }
    }

    const mostUsedCollections = Array.from(collectionUsage.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([collectionId]) => {
        const collection = schema.tokenCollections.find(c => c.id === collectionId);
        return collection?.name || collectionId;
      });

    // Calculate token distribution by value type
    const tokenDistribution: Record<string, number> = {};
    for (const token of schema.tokens) {
      const valueType = schema.resolvedValueTypes.find(vt => vt.id === token.resolvedValueTypeId);
      const typeName = valueType?.displayName || token.resolvedValueTypeId;
      tokenDistribution[typeName] = (tokenDistribution[typeName] || 0) + 1;
    }

    return {
      tokenCount: schema.tokens.length,
      collectionCount: schema.tokenCollections.length,
      dimensionCount: schema.dimensions.length,
      valueTypeCount: schema.resolvedValueTypes.length,
      mostUsedCollections,
      tokenDistribution
    };
  }

  /**
   * Generate custom validations based on customer schema
   */
  private generateCustomValidations(schema: TokenSystem, customValidations?: Record<string, unknown>) {
    const validations: Record<string, unknown> = {};

    // Generate collection-specific validations
    validations.validateCollection = (collection: unknown) => {
      const errors: unknown[] = [];
      const warnings: unknown[] = [];

      // Check if collection follows customer naming conventions
      if (collection.name && !collection.name.match(/^[A-Z][a-zA-Z0-9\s]*$/)) {
        warnings.push({
          path: 'name',
          message: 'Collection name should start with a capital letter and use PascalCase',
          severity: 'warning'
        });
      }

      // Check if collection has appropriate value types for customer
      if (collection.resolvedValueTypeIds) {
        const customerValueTypes = schema.resolvedValueTypes.map(vt => vt.id);
        const invalidTypes = collection.resolvedValueTypeIds.filter((id: string) => 
          !customerValueTypes.includes(id)
        );
        
        if (invalidTypes.length > 0) {
          errors.push({
            path: 'resolvedValueTypeIds',
            message: `Invalid value types for this customer: ${invalidTypes.join(', ')}`,
            severity: 'error'
          });
        }
      }

      return { errors, warnings };
    };

    // Generate token-specific validations
    validations.validateToken = (token: unknown) => {
      const errors: unknown[] = [];
      const warnings: unknown[] = [];

      // Check if token follows customer naming conventions
      if (token.displayName && !token.displayName.match(/^[a-z][a-zA-Z0-9\s]*$/)) {
        warnings.push({
          path: 'displayName',
          message: 'Token name should start with a lowercase letter and use camelCase',
          severity: 'warning'
        });
      }

      // Check if token uses customer-specific value types
      const customerValueTypes = schema.resolvedValueTypes.map(vt => vt.id);
      if (token.resolvedValueTypeId && !customerValueTypes.includes(token.resolvedValueTypeId)) {
        errors.push({
          path: 'resolvedValueTypeId',
          message: `Value type '${token.resolvedValueTypeId}' is not available for this customer`,
          severity: 'error'
        });
      }

      return { errors, warnings };
    };

    // Merge with custom validations
    return { ...validations, ...customValidations };
  }

  /**
   * Generate custom queries based on customer schema
   */
  private generateCustomQueries(schema: TokenSystem, customQueries?: Record<string, unknown>) {
    const queries: Record<string, unknown> = {};

    // Generate customer-specific token queries
    queries.getTokensByCustomerTier = (tier: string) => {
      return schema.tokens.filter(token => token.tokenTier === tier);
    };

    queries.getTokensByCustomerCollection = (collectionName: string) => {
      const collection = schema.tokenCollections.find(c => c.name === collectionName);
      if (!collection) return [];
      return schema.tokens.filter(token => token.tokenCollectionId === collection.id);
    };

    queries.getCustomerValueTypeUsage = () => {
      const usage: Record<string, number> = {};
      for (const token of schema.tokens) {
        const valueType = schema.resolvedValueTypes.find(vt => vt.id === token.resolvedValueTypeId);
        const typeName = valueType?.displayName || token.resolvedValueTypeId;
        usage[typeName] = (usage[typeName] || 0) + 1;
      }
      return usage;
    };

    // Merge with custom queries
    return { ...queries, ...customQueries };
  }

  /**
   * Save MCP to repository
   */
  async saveMCPToRepository(
    mcp: CustomerMCP,
    schema: TokenSystem,
    options: MCPGenerationOptions
  ): Promise<void> {
    const existingIndex = this.repository.findIndex(r => r.customerId === options.customerId);
    
    const mcpRepository: MCPRepository = {
      customerId: options.customerId,
      mcp,
      schema,
      version: mcp.metadata.version,
      createdAt: existingIndex >= 0 ? this.repository[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.repository[existingIndex] = mcpRepository;
    } else {
      this.repository.push(mcpRepository);
    }

    // In a real implementation, this would save to a database or file system
    console.log(`[MCPGenerator] Saved MCP for customer: ${options.customerId}`);
  }

  /**
   * Load MCP from repository
   */
  async loadMCPFromRepository(customerId: string): Promise<CustomerMCP | null> {
    const mcpRepository = this.repository.find(r => r.customerId === customerId);
    return mcpRepository?.mcp || null;
  }

  /**
   * List all customer MCPs
   */
  async listCustomerMCPs(): Promise<Array<{
    customerId: string;
    customerName: string;
    version: string;
    createdAt: string;
    updatedAt: string;
  }>> {
    return this.repository.map(r => ({
      customerId: r.customerId,
      customerName: r.mcp.metadata.customerName,
      version: r.version,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  /**
   * Delete MCP from repository
   */
  async deleteMCPFromRepository(customerId: string): Promise<boolean> {
    const index = this.repository.findIndex(r => r.customerId === customerId);
    if (index >= 0) {
      this.repository.splice(index, 1);
      console.log(`[MCPGenerator] Deleted MCP for customer: ${customerId}`);
      return true;
    }
    return false;
  }

  /**
   * Export MCP to JSON
   */
  async exportMCPToJSON(customerId: string): Promise<string> {
    const mcpRepository = this.repository.find(r => r.customerId === customerId);
    if (!mcpRepository) {
      throw new Error(`MCP not found for customer: ${customerId}`);
    }

    return JSON.stringify({
      customerId: mcpRepository.customerId,
      mcp: mcpRepository.mcp,
      schema: mcpRepository.schema,
      version: mcpRepository.version,
      createdAt: mcpRepository.createdAt,
      updatedAt: mcpRepository.updatedAt
    }, null, 2);
  }

  /**
   * Import MCP from JSON
   */
  async importMCPFromJSON(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      const mcpRepository: MCPRepository = {
        customerId: data.customerId,
        mcp: data.mcp,
        schema: data.schema,
        version: data.version,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };

      const existingIndex = this.repository.findIndex(r => r.customerId === data.customerId);
      if (existingIndex >= 0) {
        this.repository[existingIndex] = mcpRepository;
      } else {
        this.repository.push(mcpRepository);
      }

      console.log(`[MCPGenerator] Imported MCP for customer: ${data.customerId}`);
    } catch (error) {
      throw new Error(`Failed to import MCP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 