/**
 * Token Dependency Transformer
 * Transforms token system data into network graph format for visualization
 * Extends BaseDataTransformer and follows schema.json compliance
 */

import type { TokenSystem, Token, ResolvedValueType } from '@token-model/data-model';
import { BaseDataTransformer } from './baseTransformer';
import { TokenDependencyAnalyzer } from '../analyzers/tokenDependencyAnalyzer';
import type {
  TransformOptions,
  VisualizationResult
} from '../types/visualization-data';
import type {
  TokenDependencyGraph,
  TokenNode,
  DependencyEdge,
  ClusterInfo,
  DependencyStatistics
} from '../types/network-data';

export class TokenDependencyTransformer extends BaseDataTransformer<TokenSystem, TokenDependencyGraph> {
  private analyzer: TokenDependencyAnalyzer;

  constructor() {
    super('TokenDependencyTransformer');
    this.analyzer = new TokenDependencyAnalyzer();
  }

  /**
   * Transform token system data into network graph format
   */
  public async transformData(
    tokenSystem: TokenSystem, 
    options?: TransformOptions
  ): Promise<TokenDependencyGraph> {
    try {
      this.logProgress('Starting token dependency transformation');

      // Validate input
      if (!this.validateInput(tokenSystem)) {
        throw new Error('Invalid token system input');
      }

      // Extract data from token system
      const tokens = tokenSystem.tokens || [];
      const resolvedValueTypes = tokenSystem.resolvedValueTypes || [];

      this.logProgress('Analyzing dependencies', {
        tokenCount: tokens.length,
        valueTypeCount: resolvedValueTypes.length
      });

      // Perform dependency analysis
      const analysisResult = await this.analyzer.analyzeDependencies(tokenSystem);

      // Apply filters if specified
      let filteredTokens = tokens;
      if (options?.filters) {
        filteredTokens = this.applyFilters(tokens, options.filters);
        this.logProgress('Applied filters', { 
          originalCount: tokens.length, 
          filteredCount: filteredTokens.length 
        });
      }

      // Build network graph data
      const nodes = this.buildTokenNodes(filteredTokens, resolvedValueTypes, analysisResult);
      const edges = this.buildDependencyEdges(filteredTokens, nodes);
      const clusters = this.buildClusters(nodes, resolvedValueTypes, options);
      const statistics = this.calculateStatistics(nodes, edges, analysisResult);

      // Find circular dependencies in the filtered set
      const circularDependencies = analysisResult.circularDependencies.filter(circular =>
        circular.tokenIds.some(tokenId => filteredTokens.some(token => token.id === tokenId))
      );

      const result: TokenDependencyGraph = {
        nodes,
        edges,
        clusters,
        circularDependencies,
        statistics
      };

      this.logProgress('Transformation completed successfully', {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        clusterCount: clusters.length,
        circularDependencies: circularDependencies.length
      });

      return result;

    } catch (error) {
      this.handleError(error as Error, 'transformData');
    }
  }

  /**
   * Validate token system input structure
   */
  protected validateInput(tokenSystem: TokenSystem): boolean {
    if (!super.validateInput(tokenSystem)) {
      return false;
    }

    if (!tokenSystem.tokens || !Array.isArray(tokenSystem.tokens)) {
      console.error(`[${this.transformerName}] Invalid tokens array`);
      return false;
    }

    if (!tokenSystem.resolvedValueTypes || !Array.isArray(tokenSystem.resolvedValueTypes)) {
      console.error(`[${this.transformerName}] Invalid resolvedValueTypes array`);
      return false;
    }

    return true;
  }

  /**
   * Build TokenNode objects from token data
   */
  private buildTokenNodes(
    tokens: Token[], 
    resolvedValueTypes: ResolvedValueType[],
    analysisResult: any
  ): TokenNode[] {
    return tokens.map(token => {
      const valueType = resolvedValueTypes.find(vt => vt.id === token.resolvedValueTypeId);
      const tokenAnalysis = this.analyzer.analyzeTokenDependencies(token.id);
      
      // Determine token type based on whether it's an alias
      let tokenType: 'base' | 'alias' | 'circular' = 'base';
      
      // Check if any of the token's values contain tokenId references (making it an alias)
      const hasTokenReference = token.valuesByMode?.some(modeValue => {
        const value = modeValue.value;
        return value && typeof value === 'object' && 'tokenId' in value;
      });

      if (hasTokenReference) {
        tokenType = 'alias';
      }

      // Check if it's part of a circular dependency
      if (tokenAnalysis?.hasCircularDependency) {
        tokenType = 'circular';
      }

      return {
        id: token.id,
        name: token.displayName,
        displayName: token.displayName,
        tokenId: token.id,
        type: tokenType,
        resolvedValueTypeId: token.resolvedValueTypeId,
        resolvedValueTypeName: valueType?.displayName || 'Unknown',
        resolvedValueTypeCategory: valueType?.type || 'Unknown',
        collectionIds: token.collectionIds || [],
        dependencyDepth: tokenAnalysis?.dependencyDepth || 0,
        usageCount: tokenAnalysis?.usageCount || 0,
        hasCircularDependency: tokenAnalysis?.hasCircularDependency || false,
        value: token.valuesByMode?.[0]?.value // Include the first mode's value for reference
      };
    });
  }

  /**
   * Build DependencyEdge objects from token relationships
   */
  private buildDependencyEdges(tokens: Token[], nodes: TokenNode[]): DependencyEdge[] {
    const edges: DependencyEdge[] = [];
    const edgeSet = new Set<string>(); // To avoid duplicate edges

    tokens.forEach(token => {
      const sourceNode = nodes.find(n => n.id === token.id);
      if (!sourceNode) return;

      // Analyze each mode's value for token references
      token.valuesByMode?.forEach(modeValue => {
        const value = modeValue.value;
        
        // Check if value contains a token reference
        if (value && typeof value === 'object' && 'tokenId' in value) {
          const targetTokenId = value.tokenId as string;
          const targetNode = nodes.find(n => n.id === targetTokenId);
          
          if (targetNode) {
            // Create a unique edge ID to prevent duplicates
            const edgeId = `${sourceNode.id}->${targetNode.id}`;
            if (!edgeSet.has(edgeId)) {
              edgeSet.add(edgeId);

              // Determine edge type
              let edgeType: 'direct' | 'indirect' | 'circular' = 'direct';
              if (sourceNode.hasCircularDependency && targetNode.hasCircularDependency) {
                edgeType = 'circular';
              }

              edges.push({
                id: edgeId,
                source: sourceNode,
                target: targetNode,
                type: edgeType,
                strength: 1, // Could be calculated based on usage frequency
                distance: this.calculateEdgeDistance(sourceNode, targetNode),
                platformSpecific: false, // Could be enhanced to detect platform-specific references
                themeSpecific: false // Could be enhanced to detect theme-specific references
              });
            }
          }
        }
      });
    });

    return edges;
  }

  /**
   * Build cluster information for grouping nodes
   */
  private buildClusters(
    nodes: TokenNode[], 
    resolvedValueTypes: ResolvedValueType[],
    options?: TransformOptions
  ): ClusterInfo[] {
    const clusters: ClusterInfo[] = [];

    // Cluster by resolved value type
    const valueTypeGroups = new Map<string, TokenNode[]>();
    nodes.forEach(node => {
      const typeId = node.resolvedValueTypeId;
      if (!valueTypeGroups.has(typeId)) {
        valueTypeGroups.set(typeId, []);
      }
      valueTypeGroups.get(typeId)!.push(node);
    });

    // Create cluster info for each value type group
    valueTypeGroups.forEach((groupNodes, typeId) => {
      const valueType = resolvedValueTypes.find(vt => vt.id === typeId);
      if (valueType && groupNodes.length > 1) { // Only create clusters with multiple nodes
        clusters.push({
          id: `cluster-${typeId}`,
          type: 'resolvedValueType',
          name: valueType.displayName,
          nodeIds: groupNodes.map(n => n.id),
          color: this.getValueTypeColor(valueType.type || 'Unknown')
        });
      }
    });

    // Could add more cluster types (collections, platforms, themes) based on options
    return clusters;
  }

  /**
   * Calculate dependency statistics
   */
  private calculateStatistics(
    nodes: TokenNode[], 
    edges: DependencyEdge[],
    analysisResult: any
  ): DependencyStatistics {
    const referenceCounts = nodes.map(node => node.usageCount);
    const depths = nodes.map(node => node.dependencyDepth);
    
    const mostReferenced = nodes
      .filter(node => node.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)[0];

    const deepestNode = nodes
      .sort((a, b) => b.dependencyDepth - a.dependencyDepth)[0];

    return {
      totalTokens: nodes.length,
      totalDependencies: edges.length,
      circularDependencies: analysisResult.circularDependencies?.length || 0,
      maxDependencyDepth: Math.max(...depths, 0),
      avgDependencyDepth: depths.reduce((a, b) => a + b, 0) / depths.length || 0,
      isolatedTokens: nodes.filter(n => n.usageCount === 0 && n.dependencyDepth === 0).length,
      mostReferencedToken: mostReferenced ? {
        tokenId: mostReferenced.id,
        name: mostReferenced.name,
        referenceCount: mostReferenced.usageCount
      } : undefined,
      deepestDependencyChain: deepestNode ? {
        tokenIds: [deepestNode.id], // Would be enhanced to show full chain
        depth: deepestNode.dependencyDepth
      } : undefined
    };
  }

  /**
   * Calculate appropriate edge distance based on node properties
   */
  private calculateEdgeDistance(source: TokenNode, target: TokenNode): number {
    // Base distance
    let distance = 100;

    // Increase distance for different value types
    if (source.resolvedValueTypeId !== target.resolvedValueTypeId) {
      distance += 50;
    }

    // Decrease distance for same collections
    const sharedCollections = source.collectionIds.filter(id => 
      target.collectionIds.includes(id)
    );
    if (sharedCollections.length > 0) {
      distance -= 25;
    }

    return Math.max(50, distance); // Minimum distance of 50
  }

  /**
   * Get color for value type (reusing existing TokenAnalysis color scheme)
   */
  private getValueTypeColor(valueTypeCategory: string): string {
    const colorMap: Record<string, string> = {
      'COLOR': '#48BB78',
      'DIMENSION': '#4299E1',
      'SPACING': '#667EEA',
      'FONT_FAMILY': '#9F7AEA',
      'FONT_WEIGHT': '#ED64A6',
      'FONT_SIZE': '#F56565',
      'LINE_HEIGHT': '#ED8936',
      'LETTER_SPACING': '#ECC94B',
      'DURATION': '#38B2AC',
      'CUBIC_BEZIER': '#4FD1C5',
      'BLUR': '#4A5568',
      'SPREAD': '#718096',
      'RADIUS': '#A0AEC0'
    };

    return colorMap[valueTypeCategory] || '#A0AEC0';
  }
}
