/**
 * Token Dependency Analyzer
 * Analyzes token alias relationships, circular dependencies, and dependency depth
 * Based on schema.json token structure and existing FormulaDependencyService patterns
 */

import type { TokenSystem, Token } from '@token-model/data-model';
import type {
  TokenDependencyAnalysisResult,
  CircularDependencyAnalysisResult,
  DependencyDepthAnalysisResult,
  GlobalDependencyAnalysis,
  BlastRadiusAnalysis,
  AnalysisRecommendation,
  DependencyValidationResult,
  DependencyValidationError,
  DependencyValidationWarning,
  UnresolvedReference
} from '../types/analysis-results';

export class TokenDependencyAnalyzer {
  private tokens: Token[] = [];
  private dependencyMap: Map<string, Set<string>> = new Map(); // tokenId -> Set of referenced tokenIds
  private reverseDependencyMap: Map<string, Set<string>> = new Map(); // tokenId -> Set of tokens that reference it
  private memoizedDepths: Map<string, number> = new Map();
  private memoizedCircularPaths: Map<string, string[][]> = new Map();

  /**
   * Analyze dependencies for a specific token system (merged, platform, or theme data)
   */
  public async analyzeDependencies(tokenSystem: TokenSystem): Promise<GlobalDependencyAnalysis> {
    try {
      console.log('[TokenDependencyAnalyzer] Starting dependency analysis');
      
      this.tokens = tokenSystem.tokens || [];
      this.buildDependencyMaps();
      
      const circularDependencies = this.detectCircularDependencies();
      const depthAnalysis = this.analyzeDepths();
      const isolatedTokens = this.findIsolatedTokens();
      const rootTokens = this.findRootTokens();
      const leafTokens = this.findLeafTokens();
      const mostReferenced = this.findMostReferencedTokens();
      const deepestChains = this.findDeepestDependencyChains();
      const complexity = this.calculateComplexityMetrics();
      const recommendations = this.generateRecommendations(circularDependencies, depthAnalysis);

      const result: GlobalDependencyAnalysis = {
        totalTokens: this.tokens.length,
        totalDependencies: this.getTotalDependencyCount(),
        circularDependencies,
        maxDependencyDepth: Math.max(...depthAnalysis.map(d => d.depth), 0),
        averageDependencyDepth: this.calculateAverageDependencyDepth(depthAnalysis),
        isolatedTokens,
        rootTokens,
        leafTokens,
        mostReferencedTokens: mostReferenced,
        deepestDependencyChains: deepestChains,
        complexityMetrics: complexity,
        recommendations
      };

      console.log('[TokenDependencyAnalyzer] Analysis completed:', {
        totalTokens: result.totalTokens,
        totalDependencies: result.totalDependencies,
        circularCount: result.circularDependencies.length,
        maxDepth: result.maxDependencyDepth
      });

      return result;
    } catch (error) {
      console.error('[TokenDependencyAnalyzer] Error during analysis:', error);
      throw error;
    }
  }

  /**
   * Analyze dependencies for a single token
   */
  public analyzeTokenDependencies(tokenId: string): TokenDependencyAnalysisResult | null {
    const token = this.tokens.find(t => t.id === tokenId);
    if (!token) {
      console.warn(`[TokenDependencyAnalyzer] Token not found: ${tokenId}`);
      return null;
    }

    const dependencies = this.getTokenDependencies(tokenId);
    const dependents = this.getTokenDependents(tokenId);
    const depth = this.calculateDependencyDepth(tokenId);
    const usageCount = dependents.length;
    const circularPaths = this.findCircularPathsForToken(tokenId);
    const hasCircularDependency = circularPaths.length > 0;
    const blastRadius = this.calculateBlastRadius(tokenId);

    return {
      tokenId,
      tokenName: token.displayName,
      dependencies,
      dependents,
      dependencyDepth: depth,
      usageCount,
      hasCircularDependency,
      circularDependencyPaths: hasCircularDependency ? circularPaths : undefined,
      blastRadius
    };
  }

  /**
   * Validate token dependencies and detect issues
   */
  public validateDependencies(): DependencyValidationResult {
    const errors: DependencyValidationError[] = [];
    const warnings: DependencyValidationWarning[] = [];
    const unresolvedReferences: UnresolvedReference[] = [];
    const circularDependencies = this.detectCircularDependencies();

    // Check for unresolved references
    this.tokens.forEach(token => {
      token.valuesByMode?.forEach(modeValue => {
        const value = modeValue.value;
        if (value && typeof value === 'object' && 'tokenId' in value) {
          const referencedTokenId = value.tokenId as string;
          const referencedToken = this.tokens.find(t => t.id === referencedTokenId);
          
          if (!referencedToken) {
            unresolvedReferences.push({
              tokenId: token.id,
              tokenName: token.displayName,
              referencedTokenId,
              modeId: modeValue.modeId,
              context: `Mode: ${modeValue.modeId}`
            });

            errors.push({
              tokenId: token.id,
              tokenName: token.displayName,
              errorType: 'missing_reference',
              message: `Token references non-existent token: ${referencedTokenId}`,
              referencedTokenId
            });
          }
        }
      });
    });

    // Check for deep nesting warnings
    this.tokens.forEach(token => {
      const depth = this.calculateDependencyDepth(token.id);
      if (depth > 5) {
        warnings.push({
          tokenId: token.id,
          tokenName: token.displayName,
          warningType: 'deep_nesting',
          message: `Token has deep dependency nesting (depth: ${depth})`,
          details: { depth }
        });
      }
    });

    // Check for unused tokens
    const unusedTokens = this.findIsolatedTokens();
    unusedTokens.forEach(tokenId => {
      const token = this.tokens.find(t => t.id === tokenId);
      if (token) {
        warnings.push({
          tokenId: token.id,
          tokenName: token.displayName,
          warningType: 'unused_token',
          message: 'Token is not referenced by any other tokens',
          details: { isolated: true }
        });
      }
    });

    return {
      isValid: errors.length === 0 && circularDependencies.length === 0,
      errors,
      warnings,
      circularDependencies,
      unresolvedReferences
    };
  }

  /**
   * Build internal dependency maps from token data
   */
  private buildDependencyMaps(): void {
    this.dependencyMap.clear();
    this.reverseDependencyMap.clear();
    this.memoizedDepths.clear();
    this.memoizedCircularPaths.clear();

    this.tokens.forEach(token => {
      const dependencies = new Set<string>();
      
      // Parse valuesByMode for token references
      token.valuesByMode?.forEach(modeValue => {
        const value = modeValue.value;
        // Check if value is an object with tokenId property (alias reference)
        if (value && typeof value === 'object' && 'tokenId' in value) {
          const referencedTokenId = value.tokenId as string;
          dependencies.add(referencedTokenId);
          
          // Update reverse dependency map
          if (!this.reverseDependencyMap.has(referencedTokenId)) {
            this.reverseDependencyMap.set(referencedTokenId, new Set());
          }
          this.reverseDependencyMap.get(referencedTokenId)!.add(token.id);
        }
      });

      this.dependencyMap.set(token.id, dependencies);
    });

    console.log('[TokenDependencyAnalyzer] Built dependency maps:', {
      totalTokens: this.tokens.length,
      dependencyMapSize: this.dependencyMap.size,
      reverseDependencyMapSize: this.reverseDependencyMap.size
    });
  }

  /**
   * Calculate dependency depth for a token (how many levels deep it depends on others)
   */
  private calculateDependencyDepth(tokenId: string, visited: Set<string> = new Set()): number {
    // Check memoized result
    if (this.memoizedDepths.has(tokenId)) {
      return this.memoizedDepths.get(tokenId)!;
    }

    // Detect circular dependency
    if (visited.has(tokenId)) {
      return 0; // Return 0 for circular references to avoid infinite recursion
    }

    visited.add(tokenId);
    const dependencies = this.dependencyMap.get(tokenId) || new Set();
    
    if (dependencies.size === 0) {
      // Leaf token (no dependencies)
      this.memoizedDepths.set(tokenId, 0);
      return 0;
    }

    // Calculate max depth of dependencies + 1
    let maxDepth = 0;
    for (const depId of dependencies) {
      const depDepth = this.calculateDependencyDepth(depId, new Set(visited));
      maxDepth = Math.max(maxDepth, depDepth);
    }

    const depth = maxDepth + 1;
    this.memoizedDepths.set(tokenId, depth);
    return depth;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private detectCircularDependencies(): CircularDependencyAnalysisResult[] {
    const circularDeps: CircularDependencyAnalysisResult[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (tokenId: string, path: string[]): boolean => {
      if (recursionStack.has(tokenId)) {
        // Found a cycle
        const cycleStart = path.indexOf(tokenId);
        const cyclePath = [...path.slice(cycleStart), tokenId];
        
        const id = `circular-${cyclePath.join('-')}`;
        const tokens = cyclePath.map(id => this.tokens.find(t => t.id === id)?.displayName || id);
        
        circularDeps.push({
          id,
          tokenIds: cyclePath,
          dependencyChain: cyclePath,
          severity: 'error',
          description: `Circular dependency detected: ${tokens.join(' → ')}`,
          affectedPlatforms: [], // Could be enhanced to detect platform-specific cycles
          affectedThemes: [], // Could be enhanced to detect theme-specific cycles
          suggestedResolution: `Break the circular dependency by removing one of the references in the chain: ${tokens.join(' → ')}`
        });

        return true;
      }

      if (visited.has(tokenId)) {
        return false;
      }

      visited.add(tokenId);
      recursionStack.add(tokenId);
      path.push(tokenId);

      const dependencies = this.dependencyMap.get(tokenId) || new Set();
      for (const depId of dependencies) {
        if (dfs(depId, [...path])) {
          // Continue to find all cycles
        }
      }

      recursionStack.delete(tokenId);
      return false;
    };

    // Check each token for cycles
    this.tokens.forEach(token => {
      if (!visited.has(token.id)) {
        dfs(token.id, []);
      }
    });

    return circularDeps;
  }

  /**
   * Get direct and indirect dependencies for a token
   */
  private getTokenDependencies(tokenId: string) {
    // Implementation would return TokenDependency[] objects
    // For now, return empty array as the structure is complex
    return [];
  }

  /**
   * Get direct and indirect dependents for a token
   */
  private getTokenDependents(tokenId: string) {
    // Implementation would return TokenDependent[] objects
    // For now, return empty array as the structure is complex
    return [];
  }

  /**
   * Find tokens that are not referenced by any other tokens and don't reference others
   */
  private findIsolatedTokens(): string[] {
    return this.tokens
      .filter(token => {
        const hasNoDependencies = (this.dependencyMap.get(token.id) || new Set()).size === 0;
        const hasNoDependents = (this.reverseDependencyMap.get(token.id) || new Set()).size === 0;
        return hasNoDependencies && hasNoDependents;
      })
      .map(token => token.id);
  }

  /**
   * Find root tokens (not referenced by others)
   */
  private findRootTokens(): string[] {
    return this.tokens
      .filter(token => (this.reverseDependencyMap.get(token.id) || new Set()).size === 0)
      .map(token => token.id);
  }

  /**
   * Find leaf tokens (don't reference others)
   */
  private findLeafTokens(): string[] {
    return this.tokens
      .filter(token => (this.dependencyMap.get(token.id) || new Set()).size === 0)
      .map(token => token.id);
  }

  /**
   * Find most referenced tokens
   */
  private findMostReferencedTokens() {
    return this.tokens
      .map(token => ({
        tokenId: token.id,
        tokenName: token.displayName,
        referenceCount: (this.reverseDependencyMap.get(token.id) || new Set()).size
      }))
      .filter(item => item.referenceCount > 0)
      .sort((a, b) => b.referenceCount - a.referenceCount)
      .slice(0, 10); // Top 10 most referenced
  }

  /**
   * Find deepest dependency chains
   */
  private findDeepestDependencyChains() {
    // Implementation would find the longest dependency chains
    // For now, return empty array as this is complex
    return [];
  }

  /**
   * Calculate various complexity metrics
   */
  private calculateComplexityMetrics() {
    const referenceCounts = this.tokens.map(token => 
      (this.dependencyMap.get(token.id) || new Set()).size
    );

    const dependencyDistribution: Record<number, number> = {};
    this.tokens.forEach(token => {
      const depth = this.calculateDependencyDepth(token.id);
      dependencyDistribution[depth] = (dependencyDistribution[depth] || 0) + 1;
    });

    return {
      averageReferences: referenceCounts.reduce((a, b) => a + b, 0) / referenceCounts.length,
      maxReferences: Math.max(...referenceCounts),
      dependencyDistribution
    };
  }

  /**
   * Generate analysis recommendations
   */
  private generateRecommendations(
    circularDeps: CircularDependencyAnalysisResult[],
    depthAnalysis: DependencyDepthAnalysisResult[]
  ): AnalysisRecommendation[] {
    const recommendations: AnalysisRecommendation[] = [];

    // Circular dependency recommendations
    circularDeps.forEach(circular => {
      recommendations.push({
        type: 'circular_dependency',
        severity: 'error',
        title: 'Circular Dependency Detected',
        description: circular.description,
        affectedTokens: circular.tokenIds,
        suggestedAction: circular.suggestedResolution || 'Break the circular dependency chain',
        estimatedEffort: 'medium'
      });
    });

    // Deep nesting recommendations
    const deepTokens = depthAnalysis.filter(d => d.depth > 5);
    if (deepTokens.length > 0) {
      recommendations.push({
        type: 'deep_nesting',
        severity: 'warning',
        title: 'Deep Token Dependencies Detected',
        description: `${deepTokens.length} tokens have dependency depth greater than 5 levels`,
        affectedTokens: deepTokens.map(d => d.tokenId),
        suggestedAction: 'Consider flattening the dependency hierarchy by creating intermediate tokens',
        estimatedEffort: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  private getTotalDependencyCount(): number {
    let total = 0;
    this.dependencyMap.forEach(deps => total += deps.size);
    return total;
  }

  private analyzeDepths(): DependencyDepthAnalysisResult[] {
    return this.tokens.map(token => ({
      tokenId: token.id,
      tokenName: token.displayName,
      depth: this.calculateDependencyDepth(token.id),
      dependencyChain: [], // Would be implemented to show full chain
      isLeaf: (this.dependencyMap.get(token.id) || new Set()).size === 0,
      isRoot: (this.reverseDependencyMap.get(token.id) || new Set()).size === 0
    }));
  }

  private calculateAverageDependencyDepth(analysis: DependencyDepthAnalysisResult[]): number {
    if (analysis.length === 0) return 0;
    const total = analysis.reduce((sum, item) => sum + item.depth, 0);
    return total / analysis.length;
  }

  private findCircularPathsForToken(tokenId: string): string[][] {
    // Implementation would find all circular paths involving this token
    return [];
  }

  private calculateBlastRadius(tokenId: string): BlastRadiusAnalysis {
    const directlyAffected = Array.from(this.reverseDependencyMap.get(tokenId) || new Set());
    
    // For now, simplified blast radius calculation
    return {
      directlyAffected,
      indirectlyAffected: [], // Would be calculated recursively
      totalAffected: directlyAffected.length,
      maxDepth: 1, // Would be calculated by following the dependency chain
      estimatedImpact: directlyAffected.length > 10 ? 'high' : directlyAffected.length > 5 ? 'medium' : 'low',
      affectedPlatforms: [],
      affectedThemes: [],
      affectedCollections: []
    };
  }
}
