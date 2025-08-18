/**
 * Gemini AI Service
 * Handles communication with Google Gemini API for design system queries
 */

import type { TokenSystem, Token, TokenCollection, Dimension, Component, Taxonomy, ResolvedValueType } from '@token-model/data-model';

export interface AIResponse {
  answer: string;
  cost: number;
  tokensUsed: number;
  confidence: number;
}

export interface DesignSystemContext {
  systemName: string;
  systemId: string;
  coreConcepts: {
    resolvedValueTypes: ResolvedValueType[];
    dimensions: Dimension[];
    modes: Array<{ dimensionId: string; modeId: string; name: string }>;
    tokenCollections: TokenCollection[];
    aliases: Array<{ tokenId: string; referencedTokenId: string }>;
  };
  data: {
    tokens: Token[];
    collections: TokenCollection[];
    dimensions: Dimension[];
    components: Component[];
    taxonomies: Taxonomy[];
  };
  metadata: {
    tokenCount: number;
    collectionCount: number;
    dimensionCount: number;
    componentCount: number;
  };
  // Optional override summary when available
  overrideSummary?: {
    platformOverrides: Array<{ platformId: string; tokenOverridesCount: number; tokenOverrides: string[] }>;
    themeOverrides: Array<{ themeId: string; tokenOverridesCount: number; tokenOverrides: unknown[] }>;
    totalPlatformOverrides: number;
    totalThemeOverrides: number;
  };
}

export interface GeminiAIService {
  query(question: string, context: DesignSystemContext): Promise<AIResponse>;
  buildContext(designSystem: TokenSystem): DesignSystemContext;
  estimateCost(tokens: number): number;
  checkBudget(estimatedCost: number): boolean;
}

class GeminiAIServiceImpl implements GeminiAIService {
  private readonly API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  private readonly COST_PER_1K_TOKENS = 0.001; // Gemini pricing

  // Get API key from multiple sources for flexibility
  private getApiKey(): string {
    // 1. Try environment variable (works in development)
    const envKey = (import.meta as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
    if (envKey) {
      return envKey;
    }
    
    // 2. Try window object (for runtime configuration)
    if (typeof window !== 'undefined') {
      const windowKey = (window as unknown as { GEMINI_API_KEY?: string }).GEMINI_API_KEY;
      if (windowKey) {
        return windowKey;
      }
    }
    
    // 3. Try localStorage (for user-provided key)
    const storedKey = localStorage.getItem('gemini-api-key');
    if (storedKey) {
      return storedKey;
    }
    
    throw new Error('Gemini API key not found. Please configure your API key.');
  }

  async query(question: string, context: DesignSystemContext): Promise<AIResponse> {
    try {
      const apiKey = this.getApiKey();
      
      // Debug: Log the context data being sent to AI
      console.log('[GeminiAIService] Context data being sent to AI:', {
        systemName: context.systemName,
        systemId: context.systemId,
        coreConcepts: {
          resolvedValueTypesCount: context.coreConcepts.resolvedValueTypes.length,
          dimensionsCount: context.coreConcepts.dimensions.length,
          modesCount: context.coreConcepts.modes.length,
          tokenCollectionsCount: context.coreConcepts.tokenCollections.length,
          aliasesCount: context.coreConcepts.aliases.length
        },
        data: {
          tokensCount: context.data.tokens.length,
          collectionsCount: context.data.collections.length,
          dimensionsCount: context.data.dimensions.length,
          componentsCount: context.data.components.length,
          taxonomiesCount: context.data.taxonomies.length
        },
        metadata: context.metadata
      });
      
      const prompt = `You are an expert design system assistant. You have access to a comprehensive design system with the following data (JSON):\n\n` +
        `${JSON.stringify(context, null, 2)}\n\n` +
        `IMPORTANT: When answering questions about platform extensions, theme overrides, or token overrides, ALWAYS check the 'overrideSummary' section in the data. This section contains:\n` +
        `- platformOverrides: Array of platform override information with tokenOverridesCount and tokenOverrides arrays\n` +
        `- themeOverrides: Array of theme override information with tokenOverridesCount and tokenOverrides arrays  \n` +
        `- totalPlatformOverrides: Total count of platform token overrides\n` +
        `- totalThemeOverrides: Total count of theme token overrides\n\n` +
        `If the data contains an overrideSummary, use it to provide accurate information about overrides.\n\n` +
        `Question: ${question}\n\nPlease provide a clear, helpful response based on the available design system data.`;
      const estimatedTokens = this.estimateTokenCount(prompt);
      const estimatedCost = this.estimateCost(estimatedTokens);

      // Check budget before making API call
      if (!this.checkBudget(estimatedCost)) {
        throw new Error('Monthly budget exceeded. Please try again next month or increase your budget.');
      }

      const response = await fetch(`${this.API_BASE_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
            topP: 0.8,
            topK: 40
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received';
      const tokensUsed = data.usageMetadata?.totalTokenCount || estimatedTokens;
      const cost = this.calculateCost(tokensUsed, 0);

      return {
        answer,
        cost,
        tokensUsed,
        confidence: 0.8 // Default confidence for Gemini responses
      };
    } catch (error) {
      console.error('[GeminiAIService] Query failed:', error);
      throw error;
    }
  }

  buildContext(designSystem: TokenSystem): DesignSystemContext {
    // Extract all modes from dimensions
    const allModes = designSystem.dimensions.flatMap(dimension => 
      dimension.modes.map(mode => ({
        dimensionId: dimension.id,
        modeId: mode.id,
        name: mode.name
      }))
    );

    // Extract aliases (tokens that reference other tokens)
    const aliases = designSystem.tokens
      .filter(token => token.valuesByMode && Object.values(token.valuesByMode).some(value => 
        typeof value === 'object' && value && 'tokenId' in value
      ))
      .map(token => {
        const aliasValue = Object.values(token.valuesByMode).find(value => 
          typeof value === 'object' && value && 'tokenId' in value
        );
        return {
          tokenId: token.id,
          referencedTokenId: (aliasValue as { tokenId: string })?.tokenId
        };
      });

    return {
      systemName: designSystem.systemName,
      systemId: designSystem.systemId,
      coreConcepts: {
        resolvedValueTypes: designSystem.resolvedValueTypes || [],
        dimensions: designSystem.dimensions,
        modes: allModes,
        tokenCollections: designSystem.tokenCollections || [],
        aliases
      },
      data: {
        tokens: designSystem.tokens,
        collections: designSystem.tokenCollections || [],
        dimensions: designSystem.dimensions,
        components: designSystem.components || [],
        taxonomies: designSystem.taxonomies || []
      },
      metadata: {
        tokenCount: designSystem.tokens.length,
        collectionCount: (designSystem.tokenCollections || []).length,
        dimensionCount: designSystem.dimensions.length,
        componentCount: (designSystem.components || []).length
      },
      // Pass through overrideSummary when present on the design system object
      overrideSummary: (designSystem as unknown as { overrideSummary?: DesignSystemContext['overrideSummary'] }).overrideSummary
    };
  }

  estimateCost(tokens: number): number {
    return (tokens / 1000) * this.COST_PER_1K_TOKENS;
  }

  checkBudget(estimatedCost: number): boolean {
    const currentUsage = this.getCurrentMonthlyUsage();
    const monthlyBudget = 5.00; // $5 target
    return (currentUsage + estimatedCost) <= monthlyBudget;
  }

  private buildPrompt(question: string, context: DesignSystemContext): string {
    return `You are an AI assistant for a design system application. You have access to the following design system data:

SYSTEM INFORMATION:
- System Name: ${context.systemName}
- System ID: ${context.systemId}

CORE CONCEPTS:
1. Resolved Value Types: These are fundamental types like "color", "font", "gap", "shadow" that correspond to UI development value types.
   Available types: ${context.coreConcepts.resolvedValueTypes.map(t => t.displayName).join(', ')}

2. Dimensions: Groups of mutually exclusive modes with a common conceptual theme.
   Available dimensions: ${context.coreConcepts.dimensions.map(d => d.displayName).join(', ')}

3. Modes: Specific options within a dimension. Each mode exists only within its parent dimension.
   Available modes: ${context.coreConcepts.modes.map(m => `${m.name} (${m.dimensionId})`).join(', ')}

4. Token Collections: Categorization groups that can contain multiple resolved value types.
   Available collections: ${context.coreConcepts.tokenCollections.map(c => c.name).join(', ')}

5. Aliases: Tokens that reference other tokens. The resolved value type of an alias matches the referenced token.
   Aliases: ${context.coreConcepts.aliases.map(a => `${a.tokenId} → ${a.referencedTokenId}`).join(', ')}

DATA SUMMARY:
- ${context.metadata.tokenCount} tokens
- ${context.metadata.collectionCount} collections
- ${context.metadata.dimensionCount} dimensions
- ${context.metadata.componentCount} components

USER QUESTION: ${question}

Please provide a helpful, contextual response about this design system. Focus on the specific concepts and data available. If the question is about something not in the data, explain what information would be needed to answer it.

Response:`;
  }

  private estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const totalTokens = inputTokens + outputTokens;
    return (totalTokens / 1000) * this.COST_PER_1K_TOKENS;
  }

  private getCurrentMonthlyUsage(): number {
    try {
      const usageData = localStorage.getItem('gemini-ai:monthly-usage');
      if (usageData) {
        const usage = JSON.parse(usageData);
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
        
        if (usage.month === currentMonth) {
          return usage.cost || 0;
        }
      }
      return 0;
    } catch (error) {
      console.error('[GeminiAIService] Error reading monthly usage:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const GeminiAIService = new GeminiAIServiceImpl();
