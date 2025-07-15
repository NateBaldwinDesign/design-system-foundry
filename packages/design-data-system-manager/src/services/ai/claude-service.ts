import Anthropic from '@anthropic-ai/sdk';
import type { TokenSystem, TokenCollection, Dimension, ResolvedValueType, Mode } from '@token-model/data-model';
import type { ExtendedToken } from '../../components/TokenEditorDialog';
import type { Algorithm } from '../../types/algorithm';
import { MCPIntegration, type MCPQuery, type MCPResponse } from '../mcp';

export interface AIContext {
  // Current schema and data
  schema: TokenSystem;
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  dimensions: Dimension[];
  resolvedValueTypes: ResolvedValueType[];
  modes: Mode[];
  algorithms: Algorithm[];
  
  // Current user state
  currentView: string;
  currentCollection?: TokenCollection;
  currentDimension?: Dimension;
  selectedTokens: string[];
  
  // User preferences and history
  recentTokens: string[];
  frequentlyUsedCollections: string[];
  userPreferences: UserPreferences;
  
  // Validation context
  validationErrors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface UserPreferences {
  preferredValueTypes: string[];
  preferredCollections: string[];
  autoSuggestions: boolean;
  validationStrictness: 'strict' | 'moderate' | 'lenient';
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

export interface AIResponse {
  success: boolean;
  content: string;
  suggestions?: Record<string, unknown>[];
  validationResult?: ValidationResult;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  fixes?: Record<string, unknown>;
}

export interface ClaudeServiceOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface ClaudeServiceCallbacks {
  onError?: (error: Error) => void;
  onContextUpdate?: (context: AIContext) => void;
}

/**
 * Claude API Service
 * Provides AI assistance using Claude API with strict schema adherence
 */
export class ClaudeService {
  private client: Anthropic;
  private isInitialized = false;
  private context: AIContext;
  private options: ClaudeServiceOptions;
  private callbacks: ClaudeServiceCallbacks = {};
  private contextSubscribers: ((context: AIContext) => void)[] = [];
  private mcpIntegration: MCPIntegration;

  constructor(
    schema: TokenSystem,
    options: ClaudeServiceOptions = {},
    callbacks: ClaudeServiceCallbacks = {}
  ) {
    this.options = {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4000,
      temperature: 0.3,
      systemPrompt: this.generateSystemPrompt(schema),
      ...options
    };

    this.callbacks = callbacks;
    this.context = this.initializeContext(schema);
    
    // Initialize Claude client
    this.client = new Anthropic({
      apiKey: this.options.apiKey || (typeof process !== 'undefined' ? process.env.ANTHROPIC_API_KEY : undefined),
      dangerouslyAllowBrowser: true, // Required for browser environment
    });

    // Initialize MCP integration
    this.mcpIntegration = new MCPIntegration();
    this.mcpIntegration.initializeContext(schema);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.client.apiKey) {
      throw new Error('Claude API key is required. Please provide an API key in the chat interface or set ANTHROPIC_API_KEY environment variable.');
    }

    // Security note for browser usage
    console.warn('[ClaudeService] Running in browser environment. API key is stored in memory only and not persisted.');

    this.isInitialized = true;
    console.log('[ClaudeService] Initialized successfully');
  }

  /**
   * Update the AI context
   */
  updateContext(updates: Partial<AIContext>): void {
    this.context = { ...this.context, ...updates };
    this.notifyContextSubscribers();
  }

  /**
   * Get current context
   */
  getContext(): AIContext {
    return this.context;
  }

  /**
   * Subscribe to context changes
   */
  subscribeToContext(callback: (context: AIContext) => void): () => void {
    this.contextSubscribers.push(callback);
    return () => {
      const index = this.contextSubscribers.indexOf(callback);
      if (index > -1) {
        this.contextSubscribers.splice(index, 1);
      }
    };
  }

  /**
   * Create a token with AI assistance
   */
  async createToken(userInput: string): Promise<AIResponse> {
    try {
      const prompt = this.generateTokenCreationPrompt(userInput);
      const response = await this.callClaude(prompt);
      
      return {
        success: true,
        content: response,
        suggestions: this.extractSuggestions(response)
      };
    } catch (error) {
      return this.handleError(error, 'Failed to create token');
    }
  }

  /**
   * Suggest a collection for a token
   */
  async suggestCollection(userInput: string): Promise<AIResponse> {
    try {
      const prompt = this.generateCollectionSuggestionPrompt(userInput);
      const response = await this.callClaude(prompt);
      
      return {
        success: true,
        content: response,
        suggestions: this.extractSuggestions(response)
      };
    } catch (error) {
      return this.handleError(error, 'Failed to suggest collection');
    }
  }

  /**
   * Find tokens based on query
   */
  async findTokens(userInput: string): Promise<AIResponse> {
    try {
      const prompt = this.generateTokenSearchPrompt(userInput);
      const response = await this.callClaude(prompt);
      
      return {
        success: true,
        content: response,
        suggestions: this.extractSuggestions(response)
      };
    } catch (error) {
      return this.handleError(error, 'Failed to find tokens');
    }
  }

  /**
   * Explain a concept
   */
  async explainConcept(userInput: string): Promise<AIResponse> {
    try {
      const prompt = this.generateConceptExplanationPrompt(userInput);
      const response = await this.callClaude(prompt);
      
      return {
        success: true,
        content: response
      };
    } catch (error) {
      return this.handleError(error, 'Failed to explain concept');
    }
  }

  /**
   * Validate and fix data
   */
  async validateData(validationErrors: ValidationError[]): Promise<AIResponse> {
    try {
      const prompt = this.generateValidationPrompt(validationErrors);
      const response = await this.callClaude(prompt);
      
      return {
        success: true,
        content: response,
        validationResult: this.parseValidationResult(response)
      };
    } catch (error) {
      return this.handleError(error, 'Failed to validate data');
    }
  }

  /**
   * Execute MCP query for structured data access
   */
  async executeMCPQuery(query: MCPQuery): Promise<MCPResponse> {
    try {
      return await this.mcpIntegration.executeQuery(query);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown MCP error',
        metadata: {
          queryType: query.type,
          operation: query.operation,
          timestamp: new Date().toISOString(),
          executionTime: 0
        }
      };
    }
  }

  /**
   * Get MCP context for AI prompts
   */
  getMCPContext(): string {
    return this.mcpIntegration.generateMCPContext();
  }

  /**
   * Enhanced AI response with MCP integration
   */
  async chatWithMCP(userInput: string): Promise<AIResponse> {
    try {
      // First, try to determine if this is a structured query that can use MCP
      const mcpQuery = this.analyzeForMCPQuery(userInput);
      
      if (mcpQuery) {
        // Execute MCP query and format response
        const mcpResponse = await this.executeMCPQuery(mcpQuery);
        return this.formatMCPResponse(mcpResponse);
      }

      // Fall back to regular Claude response with MCP context
      const prompt = this.generateMCPEnhancedPrompt(userInput);
      const response = await this.callClaude(prompt);
      
      return {
        success: true,
        content: response,
        suggestions: this.extractSuggestions(response)
      };
    } catch (error) {
      return this.handleError(error, 'Failed to process request with MCP');
    }
  }

  /**
   * Analyze user input to determine if it can be handled by MCP
   */
  private analyzeForMCPQuery(userInput: string): MCPQuery | null {
    const lowerInput = userInput.toLowerCase();
    
    // Schema queries
    if (lowerInput.includes('get all tokens') || lowerInput.includes('list tokens') || lowerInput.includes('show tokens')) {
      return { type: 'schema', operation: 'getTokens' };
    }
    if (lowerInput.includes('get collections') || lowerInput.includes('list collections') || lowerInput.includes('show collections')) {
      return { type: 'schema', operation: 'getTokenCollections' };
    }
    if (lowerInput.includes('get dimensions') || lowerInput.includes('list dimensions') || lowerInput.includes('show dimensions')) {
      return { type: 'schema', operation: 'getDimensions' };
    }
    if (lowerInput.includes('get value types') || lowerInput.includes('list value types') || lowerInput.includes('show value types')) {
      return { type: 'schema', operation: 'getResolvedValueTypes' };
    }
    if (lowerInput.includes('system info') || lowerInput.includes('system information')) {
      return { type: 'schema', operation: 'getSystemInfo' };
    }
    
    // Search queries
    if (lowerInput.includes('search tokens') || lowerInput.includes('find tokens')) {
      const searchTerm = userInput.replace(/search tokens|find tokens/gi, '').trim();
      return { 
        type: 'schema', 
        operation: 'searchTokens', 
        parameters: { query: searchTerm }
      };
    }
    if (lowerInput.includes('search collections') || lowerInput.includes('find collections')) {
      const searchTerm = userInput.replace(/search collections|find collections/gi, '').trim();
      return { 
        type: 'schema', 
        operation: 'searchCollections', 
        parameters: { query: searchTerm }
      };
    }
    
    // Filtered queries
    if (lowerInput.includes('tokens by collection')) {
      const match = userInput.match(/collection[:\s]+([^\s]+)/i);
      if (match) {
        return { 
          type: 'schema', 
          operation: 'getTokensByCollection', 
          parameters: { collectionId: match[1] }
        };
      }
    }
    if (lowerInput.includes('tokens by tier')) {
      const tierMatch = userInput.match(/tier[:\s]+(primitive|semantic|component)/i);
      if (tierMatch) {
        return { 
          type: 'schema', 
          operation: 'getTokensByTier', 
          parameters: { tier: tierMatch[1].toUpperCase() }
        };
      }
    }
    
    // Transformation queries
    if (lowerInput.includes('export to figma') || lowerInput.includes('transform to figma')) {
      return { type: 'transformation', operation: 'transformToFigma' };
    }
    if (lowerInput.includes('export to css') || lowerInput.includes('transform to css')) {
      return { type: 'transformation', operation: 'transformToCSS' };
    }
    if (lowerInput.includes('export to design tokens') || lowerInput.includes('transform to design tokens')) {
      return { type: 'transformation', operation: 'transformToDesignTokens' };
    }
    
    // Analytics queries
    if (lowerInput.includes('analytics') || lowerInput.includes('statistics') || lowerInput.includes('stats')) {
      return { type: 'analytics', operation: 'getSystemAnalytics' };
    }
    
    return null;
  }

  /**
   * Format MCP response for chat interface
   */
  private formatMCPResponse(mcpResponse: MCPResponse): AIResponse {
    if (!mcpResponse.success) {
      return {
        success: false,
        content: `I encountered an error while processing your request: ${mcpResponse.error}`,
        error: mcpResponse.error
      };
    }

    let content = '';
    const data = mcpResponse.data;

    // Format based on operation type
    if (Array.isArray(data)) {
      if (data.length === 0) {
        content = 'No results found for your query.';
      } else {
        content = `Found ${data.length} result(s):\n\n`;
        content += data.map((item, index) => {
          if (typeof item === 'object' && item !== null) {
            const itemObj = item as Record<string, unknown>;
            const displayName = (itemObj.displayName as string) || (itemObj.name as string) || (itemObj.id as string) || `Item ${index + 1}`;
            const description = (itemObj.description as string) || '';
            return `**${displayName}**${description ? ` - ${description}` : ''}`;
          }
          return `- ${item}`;
        }).join('\n');
      }
    } else if (typeof data === 'object' && data !== null) {
      content = '**Query Results:**\n\n';
      content += Object.entries(data).map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `**${key}**: ${JSON.stringify(value, null, 2)}`;
        }
        return `**${key}**: ${value}`;
      }).join('\n\n');
    } else {
      content = `Result: ${data}`;
    }

    // Add metadata if available
    if (mcpResponse.metadata) {
      content += `\n\n*Query executed in ${mcpResponse.metadata.executionTime}ms*`;
    }

    return {
      success: true,
      content,
      suggestions: []
    };
  }

  /**
   * Generate MCP-enhanced prompt
   */
  private generateMCPEnhancedPrompt(userInput: string): string {
    const mcpContext = this.getMCPContext();
    const context = this.getContextSummary();
    
    return `User Query: "${userInput}"

MCP Context (Available Structured Queries):
${mcpContext}

Current System Context:
${context}

You have access to structured MCP queries for:
- Schema queries (getTokens, getCollections, searchTokens, etc.)
- Transformation queries (transformToFigma, transformToCSS, etc.)
- Analytics queries (getSystemAnalytics)

If the user's query can be answered with structured data, suggest using MCP queries.
Otherwise, provide a helpful response using the context information.

Please provide a clear, actionable response.`;
  }

  /**
   * Call Claude API
   */
  private async callClaude(prompt: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Claude service not initialized');
    }

    const response = await this.client.messages.create({
      model: this.options.model!,
      max_tokens: this.options.maxTokens!,
      temperature: this.options.temperature!,
      system: this.options.systemPrompt!,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }

  /**
   * Generate system prompt from schema
   */
  private generateSystemPrompt(schema: TokenSystem): string {
    return `You are an AI assistant for a design token management system with MCP (Model Context Protocol) integration. You must strictly adhere to the following schema and rules:

SCHEMA STRUCTURE:
- System: ${schema.systemName} (${schema.systemId})
- Dimensions: ${schema.dimensions.length} dimensions with ${schema.dimensionOrder?.length || 0} ordered dimensions
- Collections: ${schema.tokenCollections.length} token collections
- Tokens: ${schema.tokens.length} tokens
- Resolved Value Types: ${schema.resolvedValueTypes.length} types
- Platforms: ${schema.platforms.length} platforms

MCP CAPABILITIES:
You have access to structured MCP queries for:
- Schema queries: getTokens, getCollections, getDimensions, getValueTypes, searchTokens, searchCollections
- Filtered queries: getTokensByCollection, getTokensByTier, getTokensByValueType
- Transformation queries: transformToFigma, transformToCSS, transformToDesignTokens
- Analytics queries: getSystemAnalytics, getCustomerAnalytics
- Validation queries: validateToken, validateCollection, validateDimension

KEY RULES:
1. All suggestions must conform to the exact schema structure
2. Use only existing resolvedValueTypeIds from the schema
3. Use only existing collectionIds from the schema
4. Use only existing dimensionIds and modeIds from the schema
5. All IDs must be valid UUIDs or follow the established naming pattern
6. Token names must be descriptive and follow kebab-case
7. Values must be appropriate for the resolved value type
8. Collections must group related tokens logically
9. Dimensions must represent mutually exclusive modes
10. When users ask for structured data, suggest using MCP queries

AVAILABLE RESOLVED VALUE TYPES:
${schema.resolvedValueTypes.map(type => `- ${type.id}: ${type.displayName} (${type.type})`).join('\n')}

AVAILABLE COLLECTIONS:
${schema.tokenCollections.map(collection => `- ${collection.id}: ${collection.name}`).join('\n')}

AVAILABLE DIMENSIONS:
${schema.dimensions.map(dim => `- ${dim.id}: ${dim.displayName} (${dim.modes.length} modes)`).join('\n')}

RESPONSE FORMAT:
- Provide clear, actionable responses
- Include specific suggestions with valid IDs
- Explain your reasoning
- Suggest improvements when appropriate
- Always validate against the schema first
- When appropriate, suggest using MCP queries for structured data access`;
  }

  /**
   * Initialize context from schema
   */
  private initializeContext(schema: TokenSystem): AIContext {
    return {
      schema,
      tokens: schema.tokens as ExtendedToken[],
      collections: schema.tokenCollections,
      dimensions: schema.dimensions,
      resolvedValueTypes: schema.resolvedValueTypes,
      modes: schema.dimensions.flatMap(d => d.modes),
      algorithms: [],
      currentView: 'tokens',
      selectedTokens: [],
      recentTokens: [],
      frequentlyUsedCollections: [],
      userPreferences: {
        preferredValueTypes: [],
        preferredCollections: [],
        autoSuggestions: true,
        validationStrictness: 'moderate'
      },
      validationErrors: [],
      warnings: []
    };
  }

  /**
   * Generate token creation prompt
   */
  private generateTokenCreationPrompt(userInput: string): string {
    const context = this.getContextSummary();
    
    return `Create a new design token based on this request: "${userInput}"

Current context:
${context}

Please provide:
1. A suggested token name (kebab-case)
2. The appropriate resolvedValueTypeId
3. A suggested collectionId
4. A sample value appropriate for the type
5. Brief explanation of your choices

Format your response as a clear, structured suggestion.`;
  }

  /**
   * Generate collection suggestion prompt
   */
  private generateCollectionSuggestionPrompt(userInput: string): string {
    const context = this.getContextSummary();
    
    return `Suggest the best collection for this token request: "${userInput}"

Current context:
${context}

Available collections:
${this.context.collections.map(c => `- ${c.id}: ${c.name} (${c.description || 'No description'})`).join('\n')}

Please suggest the most appropriate collection and explain why.`;
  }

  /**
   * Generate token search prompt
   */
  private generateTokenSearchPrompt(userInput: string): string {
    const context = this.getContextSummary();
    
    return `Find tokens that match this query: "${userInput}"

Current context:
${context}

Please search through the existing tokens and suggest the most relevant ones. Include:
1. Token names and IDs
2. Brief descriptions
3. Why they match the query`;
  }

  /**
   * Generate concept explanation prompt
   */
  private generateConceptExplanationPrompt(userInput: string): string {
    return `Explain this design token concept: "${userInput}"

Focus on:
1. What it means in design systems
2. How it relates to the current schema
3. Best practices for implementation
4. Examples from the current system if relevant`;
  }

  /**
   * Generate validation prompt
   */
  private generateValidationPrompt(validationErrors: ValidationError[]): string {
    const context = this.getContextSummary();
    
    return `Fix these validation errors:

Errors:
${validationErrors.map(e => `- ${e.path}: ${e.message}`).join('\n')}

Current context:
${context}

Please provide specific fixes for each error, ensuring they conform to the schema.`;
  }

  /**
   * Get context summary for prompts
   */
  private getContextSummary(): string {
    const { schema, tokens, collections, dimensions } = this.context;
    
    return `
System: ${schema.systemName}
Tokens: ${tokens.length} total
Collections: ${collections.length} total
Dimensions: ${dimensions.length} total
Current view: ${this.context.currentView}
Selected tokens: ${this.context.selectedTokens.length}
Recent tokens: ${this.context.recentTokens.slice(0, 5).join(', ')}
    `.trim();
  }

  /**
   * Extract suggestions from response
   */
  private extractSuggestions(response: string): Record<string, unknown>[] {
    // Simple extraction - can be enhanced with structured parsing
    const suggestions: Record<string, unknown>[] = [];
    
    // Look for JSON-like structures in the response
    const jsonMatches = response.match(/\{[\s\S]*?\}/g);
    if (jsonMatches) {
      jsonMatches.forEach(match => {
        try {
          const parsed = JSON.parse(match) as Record<string, unknown>;
          suggestions.push(parsed);
        } catch {
          // Not valid JSON, skip
        }
      });
    }
    
    return suggestions;
  }

  /**
   * Parse validation result from response
   */
  private parseValidationResult(response: string): ValidationResult {
    // Simple parsing - can be enhanced
    return {
      isValid: !response.toLowerCase().includes('error'),
      errors: [],
      warnings: [],
      fixes: {}
    };
  }

  /**
   * Handle errors consistently
   */
  private handleError(error: unknown, defaultMessage: string): AIResponse {
    const errorMessage = error instanceof Error ? error.message : defaultMessage;
    console.error('[ClaudeService] Error:', error);
    
    this.callbacks.onError?.(error instanceof Error ? error : new Error(errorMessage));
    
    return {
      success: false,
      content: `Sorry, I encountered an error: ${errorMessage}`,
      error: errorMessage
    };
  }

  /**
   * Notify context subscribers
   */
  private notifyContextSubscribers(): void {
    this.contextSubscribers.forEach(callback => {
      try {
        callback(this.context);
      } catch (error) {
        console.error('[ClaudeService] Context subscriber error:', error);
      }
    });
  }
} 