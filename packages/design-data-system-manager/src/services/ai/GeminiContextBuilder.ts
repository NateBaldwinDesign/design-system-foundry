/**
 * Gemini Context Builder
 * Builds optimized context for Gemini AI queries while maintaining schema compliance
 */

import type { TokenSystem, Token, TokenCollection, Dimension, ResolvedValueType } from '@token-model/data-model';
import type { DesignSystemContext } from './GeminiAIService';

export interface CoreConceptsContext {
  resolvedValueTypes: ResolvedValueType[];
  dimensions: Dimension[];
  modes: Array<{ dimensionId: string; modeId: string; name: string }>;
  tokenCollections: TokenCollection[];
  aliases: Array<{ tokenId: string; referencedTokenId: string }>;
}

export class GeminiContextBuilder {
  private readonly MAX_CONTEXT_TOKENS = 8000; // Leave room for response
  private readonly COST_PER_1K_TOKENS = 0.001;

  buildDesignSystemContext(designSystem: TokenSystem): DesignSystemContext {
    console.log('[GeminiContextBuilder] Building context from design system:', {
      systemName: designSystem.systemName,
      systemId: designSystem.systemId,
      tokensCount: designSystem.tokens?.length || 0,
      collectionsCount: designSystem.tokenCollections?.length || 0,
      dimensionsCount: designSystem.dimensions?.length || 0,
      componentsCount: designSystem.components?.length || 0,
      taxonomiesCount: designSystem.taxonomies?.length || 0,
      resolvedValueTypesCount: designSystem.resolvedValueTypes?.length || 0,
      platformsCount: designSystem.platforms?.length || 0,
      themesCount: designSystem.themes?.length || 0,
      componentCategoriesCount: designSystem.componentCategories?.length || 0,
      componentPropertiesCount: designSystem.componentProperties?.length || 0
    });
    
    // Build full context first
    const fullContext = this.buildFullContext(designSystem);
    
    // Optimize for cost while maintaining schema compliance
    return this.optimizeForCost(fullContext);
  }

  private buildFullContext(designSystem: TokenSystem): DesignSystemContext {
    // Extract all modes from dimensions
    const allModes = designSystem.dimensions.flatMap(dimension => 
      dimension.modes.map(mode => ({
        dimensionId: dimension.id,
        modeId: mode.id,
        name: mode.name
      }))
    );

    // Extract aliases (tokens that reference other tokens)
    const aliases = this.extractAliases(designSystem.tokens);

    // Extract overrideSummary if present on the enriched design system object
    const enrichedDesignSystem = designSystem as unknown as { overrideSummary?: DesignSystemContext['overrideSummary'] };
    const overrideSummary = enrichedDesignSystem.overrideSummary;

    console.log('[GeminiContextBuilder] Building full context with overrideSummary:', {
      hasOverrideSummary: !!overrideSummary,
      overrideSummary: overrideSummary
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
      // Include overrideSummary when present
      overrideSummary
    };
  }

  private buildCoreConceptsContext(designSystem: TokenSystem): CoreConceptsContext {
    // Emphasize project philosophy concepts
    const resolvedValueTypes = designSystem.resolvedValueTypes || [];
    const dimensions = designSystem.dimensions;
    const allModes = dimensions.flatMap(dimension => 
      dimension.modes.map(mode => ({
        dimensionId: dimension.id,
        modeId: mode.id,
        name: mode.name
      }))
    );
    const tokenCollections = designSystem.tokenCollections || [];
    const aliases = this.extractAliases(designSystem.tokens);

    return {
      resolvedValueTypes,
      dimensions,
      modes: allModes,
      tokenCollections,
      aliases
    };
  }

  private optimizeForCost(context: DesignSystemContext): DesignSystemContext {
    // Prioritize most relevant data based on query patterns
    const optimizedContext = { ...context };

    // If context is too large, prioritize essential information
    const contextSize = this.estimateContextSize(optimizedContext);
    
    if (contextSize > this.MAX_CONTEXT_TOKENS) {
      // Prioritize core concepts and metadata over detailed data
      optimizedContext.data = {
        tokens: this.prioritizeTokens(context.data.tokens),
        collections: context.data.collections.slice(0, 10), // Top 10 collections
        dimensions: context.data.dimensions, // Keep all dimensions
        components: context.data.components.slice(0, 20), // Top 20 components
        taxonomies: context.data.taxonomies.slice(0, 5) // Top 5 taxonomies
      };
      
      // Always preserve overrideSummary as it's critical for override-related queries
      console.log('[GeminiContextBuilder] Context optimized, preserving overrideSummary:', {
        hasOverrideSummary: !!optimizedContext.overrideSummary,
        overrideSummary: optimizedContext.overrideSummary
      });
    }

    return optimizedContext;
  }

  private extractAliases(tokens: Token[]): Array<{ tokenId: string; referencedTokenId: string }> {
    return tokens
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
  }

  private prioritizeTokens(tokens: Token[]): Token[] {
    // Prioritize tokens by importance (collections, commonly used, etc.)
    const prioritized = [...tokens];
    
    // Sort by collection membership (tokens in collections are more important)
    prioritized.sort((a, b) => {
      const aInCollection = a.tokenCollectionId ? 1 : 0;
      const bInCollection = b.tokenCollectionId ? 1 : 0;
      return bInCollection - aInCollection;
    });

    // Limit to top 50 tokens if too many
    return prioritized.slice(0, 50);
  }

  private estimateContextSize(context: DesignSystemContext): number {
    const contextString = JSON.stringify(context);
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(contextString.length / 4);
  }

  calculateCost(context: DesignSystemContext): number {
    const contextSize = this.estimateContextSize(context);
    return (contextSize / 1000) * this.COST_PER_1K_TOKENS;
  }

  isContextWithinBudget(context: DesignSystemContext): boolean {
    const cost = this.calculateCost(context);
    const monthlyBudget = 5.00; // $5 target
    const currentUsage = this.getCurrentMonthlyUsage();
    
    return (currentUsage + cost) <= monthlyBudget;
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
      console.error('[GeminiContextBuilder] Error reading monthly usage:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const GeminiContextBuilderInstance = new GeminiContextBuilder();
