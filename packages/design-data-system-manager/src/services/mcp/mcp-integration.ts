import type { TokenSystem } from '@token-model/data-model';
import { TokenSystemMCP } from '@token-model/data-model';
import { TransformationMCP } from '@token-model/data-transformations';
import type { CustomerMCP } from './mcp-generator';

export interface MCPContext {
  schemaMCP: TokenSystemMCP;
  transformationMCP: TransformationMCP;
  customerMCP?: CustomerMCP;
  schema: TokenSystem;
  availableFunctions: string[];
  systemInfo: {
    systemName: string;
    systemId: string;
    version: string;
    tokenCount: number;
    collectionCount: number;
    dimensionCount: number;
    valueTypeCount: number;
  };
}

export interface MCPQuery {
  type: 'schema' | 'transformation' | 'customer' | 'validation' | 'analytics';
  operation: string;
  parameters?: Record<string, unknown>;
  context?: string;
}

export interface MCPResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  warnings?: string[];
  metadata?: {
    queryType: string;
    operation: string;
    timestamp: string;
    executionTime: number;
  };
}

export interface MCPPromptTemplate {
  name: string;
  description: string;
  template: string;
  requiredContext: string[];
  examples: Array<{
    query: string;
    response: string;
  }>;
}

/**
 * MCP Integration Service
 * Connects MCPs with Claude AI service for structured, type-safe AI interactions
 */
export class MCPIntegration {
  private context: MCPContext | null = null;
  private promptTemplates: MCPPromptTemplate[] = [];

  constructor() {
    this.initializePromptTemplates();
  }

  /**
   * Initialize MCP context with schema and transformers
   */
  initializeContext(schema: TokenSystem, customerMCP?: CustomerMCP): MCPContext {
    // Use real MCP implementations
    const schemaMCP = new TokenSystemMCP(schema);
    const transformationMCP = new TransformationMCP();
    const systemInfo = schemaMCP.getSystemInfo();

    const availableFunctions = [
      ...schemaMCP.getAvailableFunctions(),
      ...transformationMCP.getAvailableFunctions(),
      ...(customerMCP ? this.getCustomerMCPFunctions() : [])
    ];

    this.context = {
      schemaMCP,
      transformationMCP,
      customerMCP,
      schema,
      availableFunctions,
      systemInfo
    };

    return this.context;
  }



  /**
   * Execute an MCP query
   */
  async executeQuery(query: MCPQuery): Promise<MCPResponse> {
    if (!this.context) {
      return {
        success: false,
        error: 'MCP context not initialized'
      };
    }

    const startTime = Date.now();

    try {
      let data: unknown;
      const warnings: string[] = [];

      switch (query.type) {
        case 'schema':
          data = await this.executeSchemaQuery(query);
          break;
        case 'transformation':
          data = await this.executeTransformationQuery(query);
          break;
        case 'customer':
          if (!this.context.customerMCP) {
            return {
              success: false,
              error: 'Customer MCP not available'
            };
          }
          data = await this.executeCustomerQuery(query);
          break;
        case 'validation':
          data = await this.executeValidationQuery(query);
          break;
        case 'analytics':
          data = await this.executeAnalyticsQuery(query);
          break;
        default:
          return {
            success: false,
            error: `Unknown query type: ${query.type}`
          };
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        data,
        warnings,
        metadata: {
          queryType: query.type,
          operation: query.operation,
          timestamp: new Date().toISOString(),
          executionTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          queryType: query.type,
          operation: query.operation,
          timestamp: new Date().toISOString(),
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Execute schema-related queries
   */
  private async executeSchemaQuery(query: MCPQuery): Promise<unknown> {
    const { schemaMCP } = this.context!;

    switch (query.operation) {
      case 'getResolvedValueTypes':
        return schemaMCP.getResolvedValueTypes();
      case 'getTokenCollections':
        return schemaMCP.getTokenCollections();
      case 'getDimensions':
        return schemaMCP.getDimensions();
      case 'getTokens':
        return schemaMCP.getTokens();
      case 'getPlatforms':
        return schemaMCP.getPlatforms();
      case 'getThemes':
        return schemaMCP.getThemes();
      case 'getTaxonomies':
        return schemaMCP.getTaxonomies();
      case 'getTokensByCollection':
        return schemaMCP.getTokensByCollection(query.parameters?.collectionId as string);
      case 'getTokensByValueType':
        return schemaMCP.getTokensByValueType(query.parameters?.valueTypeId as string);
      case 'getCompatibleCollections':
        return schemaMCP.getCompatibleCollections(query.parameters?.valueTypeId as string);
      case 'getModesByDimension':
        return schemaMCP.getModesByDimension(query.parameters?.dimensionId as string);
      case 'getTokensByTier':
        return schemaMCP.getTokensByTier(query.parameters?.tier as 'PRIMITIVE' | 'SEMANTIC' | 'COMPONENT');
      case 'getPrivateTokens':
        return schemaMCP.getPrivateTokens();
      case 'getPublicTokens':
        return schemaMCP.getPublicTokens();
      case 'searchTokens':
        return schemaMCP.searchTokens(query.parameters?.query as string);
      case 'searchCollections':
        return schemaMCP.searchCollections(query.parameters?.query as string);
      case 'searchDimensions':
        return schemaMCP.searchDimensions(query.parameters?.query as string);
      case 'getSystemInfo':
        return schemaMCP.getSystemInfo();
      default:
        throw new Error(`Unknown schema operation: ${query.operation}`);
    }
  }

  /**
   * Execute transformation-related queries
   */
  private async executeTransformationQuery(query: MCPQuery): Promise<unknown> {
    const { transformationMCP, schema } = this.context!;

    switch (query.operation) {
      case 'getAvailableTransformers':
        return transformationMCP.getAvailableTransformers();
      case 'getTransformerCapabilities':
        return transformationMCP.getTransformerCapabilities(query.parameters?.transformer as string);
              case 'transformToFigma':
          return await transformationMCP.transformToFigma(schema, query.parameters?.config as any);
        case 'transformToCSS':
          return await transformationMCP.transformToCSS(schema, query.parameters?.config as any);
        case 'transformToDesignTokens':
          return await transformationMCP.transformToDesignTokens(schema, query.parameters?.config as any);
        case 'transformToSCSS':
          return await transformationMCP.transformToSCSS(schema, query.parameters?.config as any);
        case 'transformToJSON':
          return await transformationMCP.transformToJSON(schema, query.parameters?.config as any);
        case 'transformToTypeScript':
          return await transformationMCP.transformToTypeScript(schema, query.parameters?.config as any);
      case 'validateTransformationConfig':
        return transformationMCP.validateTransformationConfig(query.parameters?.config as any);
      case 'validateSourceForTransformation':
        return transformationMCP.validateSourceForTransformation(schema, query.parameters?.target as string);
      case 'getTransformationConfig':
        return transformationMCP.getTransformationConfig(query.parameters?.transformer as string);
      default:
        throw new Error(`Unknown transformation operation: ${query.operation}`);
    }
  }

  /**
   * Execute customer-specific queries
   */
  private async executeCustomerQuery(query: MCPQuery): Promise<unknown> {
    const { customerMCP } = this.context!;

    if (!customerMCP) {
      throw new Error('Customer MCP not available');
    }

    switch (query.operation) {
      case 'getCustomerTokens':
        return customerMCP.getCustomerTokens();
      case 'getCustomerCollections':
        return customerMCP.getCustomerCollections();
      case 'getCustomerDimensions':
        return customerMCP.getCustomerDimensions();
      case 'getCustomerValueTypes':
        return customerMCP.getCustomerValueTypes();
      case 'searchCustomerTokens':
        return customerMCP.searchCustomerTokens(query.parameters?.query as string);
      case 'searchCustomerCollections':
        return customerMCP.searchCustomerCollections(query.parameters?.query as string);
      case 'getCustomerAnalytics':
        return customerMCP.getCustomerAnalytics();
      case 'transformCustomerData':
        return await customerMCP.transformCustomerData(
          query.parameters?.target as string,
          query.parameters?.config
        );
      default:
        throw new Error(`Unknown customer operation: ${query.operation}`);
    }
  }

  /**
   * Execute validation queries
   */
  private async executeValidationQuery(query: MCPQuery): Promise<unknown> {
    const { schemaMCP, customerMCP } = this.context!;

    switch (query.operation) {
      case 'validateToken':
        return schemaMCP.validateToken(query.parameters?.token as unknown);
      case 'validateCollection':
        return schemaMCP.validateCollection(query.parameters?.collection as unknown);
      case 'validateDimension':
        return schemaMCP.validateDimension(query.parameters?.dimension as unknown);
      case 'validateCustomerToken':
        if (!customerMCP) {
          throw new Error('Customer MCP not available for validation');
        }
        return customerMCP.validateCustomerToken(query.parameters?.token as unknown);
      case 'validateCustomerCollection':
        if (!customerMCP) {
          throw new Error('Customer MCP not available for validation');
        }
        return customerMCP.validateCustomerCollection(query.parameters?.collection as unknown);
      case 'validateCustomerDimension':
        if (!customerMCP) {
          throw new Error('Customer MCP not available for validation');
        }
        return customerMCP.validateCustomerDimension(query.parameters?.dimension as unknown);
      default:
        throw new Error(`Unknown validation operation: ${query.operation}`);
    }
  }

  /**
   * Execute analytics queries
   */
  private async executeAnalyticsQuery(query: MCPQuery): Promise<unknown> {
    const { customerMCP } = this.context!;

    switch (query.operation) {
      case 'getCustomerAnalytics':
        if (!customerMCP) {
          throw new Error('Customer MCP not available for analytics');
        }
        return customerMCP.getCustomerAnalytics();
      case 'getSystemAnalytics':
        return this.generateSystemAnalytics();
      default:
        throw new Error(`Unknown analytics operation: ${query.operation}`);
    }
  }

  /**
   * Generate system analytics
   */
  private generateSystemAnalytics() {
    const { schema, systemInfo } = this.context!;

    // Calculate token distribution by tier
    const tierDistribution = schema.tokens.reduce((acc, token) => {
      acc[token.tokenTier] = (acc[token.tokenTier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate collection usage
    const collectionUsage = schema.tokens.reduce((acc, token) => {
      if (token.tokenCollectionId) {
        acc[token.tokenCollectionId] = (acc[token.tokenCollectionId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Calculate value type distribution
    const valueTypeDistribution = schema.tokens.reduce((acc, token) => {
      acc[token.resolvedValueTypeId] = (acc[token.resolvedValueTypeId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      systemInfo,
      tierDistribution,
      collectionUsage,
      valueTypeDistribution,
      totalTokens: schema.tokens.length,
      totalCollections: schema.tokenCollections.length,
      totalDimensions: schema.dimensions.length,
      totalValueTypes: schema.resolvedValueTypes.length
    };
  }

  /**
   * Get customer MCP functions
   */
  private getCustomerMCPFunctions(): string[] {
    return [
      'getCustomerTokens()',
      'getCustomerCollections()',
      'getCustomerDimensions()',
      'getCustomerValueTypes()',
      'searchCustomerTokens(query)',
      'searchCustomerCollections(query)',
      'getCustomerAnalytics()',
      'transformCustomerData(target, config)',
      'validateCustomerToken(token)',
      'validateCustomerCollection(collection)',
      'validateCustomerDimension(dimension)'
    ];
  }

  /**
   * Initialize prompt templates for common MCP operations
   */
  private initializePromptTemplates(): void {
    this.promptTemplates = [
      {
        name: 'token_search',
        description: 'Search for tokens by name or description',
        template: `Search for tokens related to "{query}". Use the searchTokens function with the query "{query}".`,
        requiredContext: ['schema'],
        examples: [
          {
            query: 'Find all color tokens',
            response: 'Use searchTokens("color") to find tokens with "color" in their name or description.'
          }
        ]
      },
      {
        name: 'collection_analysis',
        description: 'Analyze token collections',
        template: `Analyze the token collection "{collectionName}". Get the collection details and list all tokens in this collection.`,
        requiredContext: ['schema'],
        examples: [
          {
            query: 'Analyze the colors collection',
            response: 'Use getTokenCollections() to find the collection, then getTokensByCollection(collectionId) to get all tokens in that collection.'
          }
        ]
      },
      {
        name: 'transformation_help',
        description: 'Help with data transformations',
        template: `Help me transform the design tokens to "{target}" format. What transformers are available and what configuration options do I need?`,
        requiredContext: ['transformation'],
        examples: [
          {
            query: 'Transform to CSS',
            response: 'Use getAvailableTransformers() to see options, then transformToCSS(schema, config) with appropriate configuration.'
          }
        ]
      },
      {
        name: 'validation_check',
        description: 'Validate token data',
        template: `Validate this token data: {tokenData}. Check for any errors or warnings.`,
        requiredContext: ['schema'],
        examples: [
          {
            query: 'Validate a new color token',
            response: 'Use validateToken(tokenData) to check for required fields, valid IDs, and proper relationships.'
          }
        ]
      }
    ];
  }

  /**
   * Get prompt template by name
   */
  getPromptTemplate(name: string): MCPPromptTemplate | null {
    return this.promptTemplates.find(template => template.name === name) || null;
  }

  /**
   * Get all prompt templates
   */
  getAllPromptTemplates(): MCPPromptTemplate[] {
    return this.promptTemplates;
  }

  /**
   * Generate MCP context for AI prompts
   */
  generateMCPContext(): string {
    if (!this.context) {
      return 'MCP context not initialized';
    }

    const { systemInfo, availableFunctions } = this.context;

    return `
# MCP Context

## System Information
- System Name: ${systemInfo.systemName}
- System ID: ${systemInfo.systemId}
- Version: ${systemInfo.version}
- Tokens: ${systemInfo.tokenCount}
- Collections: ${systemInfo.collectionCount}
- Dimensions: ${systemInfo.dimensionCount}
- Value Types: ${systemInfo.valueTypeCount}

## Available Functions
${availableFunctions.map(func => `- ${func}`).join('\n')}

## Usage Instructions
1. Use the available functions to query and manipulate the design token system
2. All functions are type-safe and follow the schema structure
3. Customer-specific functions are available when a customer MCP is loaded
4. Transformation functions can convert data to various formats
5. Validation functions ensure data integrity

## Example Queries
- "Get all color tokens" → Use searchTokens("color")
- "Show me the colors collection" → Use getTokenCollections() then getTokensByCollection()
- "Transform to CSS" → Use transformToCSS(schema, config)
- "Validate this token" → Use validateToken(tokenData)
    `;
  }

  /**
   * Get current context
   */
  getContext(): MCPContext | null {
    return this.context;
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.context = null;
  }
} 