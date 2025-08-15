/**
 * Chord Data Transformer
 * Transforms token system data into chord diagram format for mode/platform analysis
 * Analyzes token values across different mode combinations and platform overrides
 */

import type { TokenSystem, Token, Mode, Platform } from '@token-model/data-model';
import { BaseDataTransformer } from './baseTransformer';
import type {
  TransformOptions
} from '../types/visualization-data';
import type {
  ChordDiagramData,
  ChordNode,
  ChordLink,
  ModeAnalysis,
  PlatformAnalysis,
  ChordStatistics,
  ModeCoupling,
  PlatformDeviation,
  VolatileToken,
  ChordRecommendation
} from '../types/chord-data';

export class ChordDataTransformer extends BaseDataTransformer<TokenSystem, ChordDiagramData> {
  
  constructor() {
    super('ChordDataTransformer');
  }

  /**
   * Transform token system data into chord diagram format
   */
  public async transformData(
    tokenSystem: TokenSystem, 
    options?: TransformOptions
  ): Promise<ChordDiagramData> {
    try {
      this.logProgress('Starting chord diagram transformation');

      // Validate input
      if (!this.validateInput(tokenSystem)) {
        throw new Error('Invalid token system input');
      }

      // Extract data from token system
      const tokens = tokenSystem.tokens || [];
      const modes = this.extractModes(tokenSystem);
      const platforms = tokenSystem.platforms || [];

      this.logProgress('Analyzing mode and platform relationships', {
        tokenCount: tokens.length,
        modeCount: modes.length,
        platformCount: platforms.length,
        tokenSample: tokens.slice(0, 2).map(t => ({
          id: t.id,
          valuesByMode: t.valuesByMode
        })),
        modesSample: modes.slice(0, 3),
        platformsSample: platforms.slice(0, 2)
      });

      // Build analysis data
      const modeAnalysis = this.analyzeModeRelationships(tokens, modes);
      const platformAnalysis = this.analyzePlatformDeviations(tokens, platforms, modes);
      
      // Check if we have enough data to build a meaningful chord diagram
      if (modes.length === 0 && platforms.length === 0) {
        this.logProgress('Warning: No modes or platforms found, creating minimal chord diagram');
        // Create a simple single-node diagram
        const fallbackNode: ChordNode = {
          id: 'tokens-global',
          name: 'All Tokens',
          type: 'token-value-group',
          tokenIds: tokens.map(t => t.id),
          valueCount: tokens.length,
          color: '#A0AEC0',
          conflicts: 0
        };
        
        return {
          nodes: [fallbackNode],
          links: [],
          matrix: [[0]],
          modeAnalysis,
          platformAnalysis,
          statistics: this.calculateChordStatistics(tokens, modes, platforms, modeAnalysis, platformAnalysis, [])
        };
      }

      // Build chord diagram structure
      const nodes = this.buildChordNodes(tokens, modes, platforms, modeAnalysis, platformAnalysis);
      const links = this.buildChordLinks(tokens, modes, platforms, nodes);
      const matrix = this.buildAdjacencyMatrix(nodes, links);
      
      // Calculate statistics
      const statistics = this.calculateChordStatistics(tokens, modes, platforms, modeAnalysis, platformAnalysis, links);

      const result: ChordDiagramData = {
        nodes,
        links,
        matrix,
        modeAnalysis,
        platformAnalysis,
        statistics
      };

      this.logProgress('Chord diagram transformation completed successfully', {
        nodeCount: nodes.length,
        linkCount: links.length,
        conflicts: statistics.totalConflicts
      });

      return result;

    } catch (error) {
      this.handleError(error as Error, 'transformData');
    }
  }

  /**
   * Extract modes from various sources in the token system
   */
  private extractModes(tokenSystem: TokenSystem): Mode[] {
    const modes: Mode[] = [];
    
    // Extract from dimensions
    tokenSystem.dimensions?.forEach(dimension => {
      dimension.modes?.forEach(mode => {
        if (!modes.find(m => m.id === mode.id)) {
          modes.push(mode);
        }
      });
    });

    return modes;
  }

  /**
   * Analyze relationships between modes
   */
  private analyzeModeRelationships(tokens: Token[], modes: Mode[]): ModeAnalysis {
    const modeCouplings: ModeCoupling[] = [];
    const conflictMatrix = this.buildModeConflictMatrix(tokens, modes);
    const mostVolatileTokens = this.findVolatileTokens(tokens, modes);

    // Analyze mode couplings (tokens that change together)
    for (let i = 0; i < modes.length; i++) {
      for (let j = i + 1; j < modes.length; j++) {
        const modeA = modes[i];
        const modeB = modes[j];
        const coupling = this.calculateModeCoupling(tokens, modeA, modeB);
        
        if (coupling.couplingStrength > 0.3) { // Threshold for significant coupling
          modeCouplings.push(coupling);
        }
      }
    }

    return {
      totalModes: modes.length,
      modeCouplings,
      conflictMatrix,
      mostVolatileTokens
    };
  }

  /**
   * Build conflict matrix between modes
   */
  private buildModeConflictMatrix(tokens: Token[], modes: Mode[]) {
    const modeIds = modes.map(m => m.id);
    const conflicts: number[][] = Array(modes.length).fill(null).map(() => Array(modes.length).fill(0));

    tokens.forEach(token => {
      const modeValues = new Map<string, any>();
      
      // Collect values for each mode from valuesByMode entries
      token.valuesByMode?.forEach(modeValue => {
        modeValue.modeIds.forEach(modeId => {
          modeValues.set(modeId, modeValue.value);
        });
      });

      // Compare values between all mode pairs
      for (let i = 0; i < modes.length; i++) {
        for (let j = i + 1; j < modes.length; j++) {
          const valueA = modeValues.get(modes[i].id);
          const valueB = modeValues.get(modes[j].id);
          
          if (valueA && valueB && !this.valuesEqual(valueA, valueB)) {
            conflicts[i][j]++;
            conflicts[j][i]++; // Symmetric matrix
          }
        }
      }
    });

    return {
      modeIds,
      conflicts
    };
  }

  /**
   * Calculate coupling between two modes
   */
  private calculateModeCoupling(tokens: Token[], modeA: Mode, modeB: Mode): ModeCoupling {
    let totalTokens = 0;
    let changedTogether = 0;
    const sharedTokenIds: string[] = [];

    tokens.forEach(token => {
      // Find mode values that include each mode
      const valueA = token.valuesByMode?.find(mv => mv.modeIds.includes(modeA.id))?.value;
      const valueB = token.valuesByMode?.find(mv => mv.modeIds.includes(modeB.id))?.value;
      const baseValue = token.valuesByMode?.[0]?.value; // Use first mode as base

      if (valueA && valueB && baseValue) {
        totalTokens++;
        
        const aChanged = !this.valuesEqual(valueA, baseValue);
        const bChanged = !this.valuesEqual(valueB, baseValue);
        
        if (aChanged && bChanged) {
          changedTogether++;
          sharedTokenIds.push(token.id);
        }
      }
    });

    const couplingStrength = totalTokens > 0 ? changedTogether / totalTokens : 0;
    
    return {
      modeIds: [modeA.id, modeB.id],
      modeNames: [modeA.name, modeB.name],
      couplingStrength,
      sharedTokenIds,
      couplingType: couplingStrength > 0.8 ? 'always-together' : 
                   couplingStrength > 0.5 ? 'conditional' : 'inverse'
    };
  }

  /**
   * Find tokens that change frequently across modes
   */
  private findVolatileTokens(tokens: Token[], modes: Mode[]): VolatileToken[] {
    return tokens.map(token => {
      const values = new Set();
      let platformOverrides = 0;
      
      // Collect all unique values across all mode combinations
      token.valuesByMode?.forEach(modeValue => {
        values.add(JSON.stringify(modeValue.value));
        // Count platform overrides if they exist
        if (modeValue.platformOverrides) {
          platformOverrides += modeValue.platformOverrides.length;
        }
      });

      // Calculate frequency based on value diversity vs mode combinations
      const totalModeCombinations = token.valuesByMode?.length || 1;
      const changeFrequency = totalModeCombinations > 1 ? 
        (values.size - 1) / Math.max(1, totalModeCombinations - 1) : 0;

      return {
        tokenId: token.id,
        tokenName: token.displayName,
        changeFrequency,
        uniqueValues: values.size,
        mostCommonValue: token.valuesByMode?.[0]?.value,
        platformOverrides
      };
    })
    .filter(vt => vt.changeFrequency > 0.1) // Lower threshold to get more tokens
    .sort((a, b) => b.changeFrequency - a.changeFrequency)
    .slice(0, 20); // Top 20 most volatile
  }

  /**
   * Analyze platform deviations from core modes
   */
  private analyzePlatformDeviations(tokens: Token[], platforms: Platform[], modes: Mode[]): PlatformAnalysis {
    const platformDeviations: PlatformDeviation[] = [];
    
    platforms.forEach(platform => {
      const deviation = this.calculatePlatformDeviation(tokens, platform, modes);
      platformDeviations.push(deviation);
    });

    const complexityScore = this.calculatePlatformComplexity(platformDeviations);

    return {
      totalPlatforms: platforms.length,
      platformDeviations,
      overridePatterns: [], // Would be calculated based on specific patterns
      complexityScore
    };
  }

  /**
   * Calculate how much a platform deviates from core modes
   */
  private calculatePlatformDeviation(tokens: Token[], platform: Platform, modes: Mode[]): PlatformDeviation {
    const affectedTokenIds: string[] = [];
    let uniqueOverrides = 0;
    let inheritedValues = 0;

    // This would require analyzing platform-specific token values
    // For now, return a basic structure
    return {
      platformId: platform.id,
      platformName: platform.displayName,
      deviationScore: 0,
      affectedTokenIds,
      uniqueOverrides,
      inheritedValues
    };
  }

  /**
   * Build chord nodes representing modes, platforms, and token value groups
   */
  private buildChordNodes(
    tokens: Token[], 
    modes: Mode[], 
    platforms: Platform[],
    modeAnalysis: ModeAnalysis,
    platformAnalysis: PlatformAnalysis
  ): ChordNode[] {
    const nodes: ChordNode[] = [];

    // Add mode nodes
    modes.forEach((mode, index) => {
      const tokensInMode = tokens.filter(token => 
        token.valuesByMode?.some(mv => mv.modeIds.includes(mode.id))
      );

      const conflicts = modeAnalysis.conflictMatrix.conflicts[index]?.reduce((sum, val) => sum + val, 0) || 0;

      nodes.push({
        id: `mode-${mode.id}`,
        name: mode.name, // Use 'name' property from schema
        type: 'mode',
        modeId: mode.id,
        tokenIds: tokensInMode.map(t => t.id),
        valueCount: tokensInMode.length,
        color: this.getModeColor(index),
        conflicts
      });
    });

    // Add platform nodes
    platforms.forEach((platform, index) => {
      const deviation = platformAnalysis.platformDeviations.find(pd => pd.platformId === platform.id);
      
      nodes.push({
        id: `platform-${platform.id}`,
        name: platform.displayName, // Use 'displayName' property from platform schema
        type: 'platform',
        platformId: platform.id,
        tokenIds: deviation?.affectedTokenIds || [],
        valueCount: deviation?.uniqueOverrides || 0,
        color: this.getPlatformColor(index),
        conflicts: Math.round((deviation?.deviationScore || 0) * 100)
      });
    });

    return nodes;
  }

  /**
   * Build chord links representing relationships between nodes
   */
  private buildChordLinks(tokens: Token[], modes: Mode[], platforms: Platform[], nodes: ChordNode[]): ChordLink[] {
    const links: ChordLink[] = [];

    // Add mode coupling links
    modes.forEach((modeA, i) => {
      modes.forEach((modeB, j) => {
        if (i < j) { // Only create each link once
          const coupling = this.calculateModeCoupling(tokens, modeA, modeB);
          
          if (coupling.couplingStrength > 0.1) {
            const sourceNode = nodes.find(n => n.id === `mode-${modeA.id}`);
            const targetNode = nodes.find(n => n.id === `mode-${modeB.id}`);
            
            if (sourceNode && targetNode) {
              links.push({
                source: sourceNode,
                target: targetNode,
                value: coupling.couplingStrength * 100,
                conflictType: 'mode-coupling',
                tokenIds: coupling.sharedTokenIds,
                examples: [] // Would be populated with specific examples
              });
            }
          }
        }
      });
    });

    return links;
  }

  /**
   * Build adjacency matrix for D3 chord layout
   */
  private buildAdjacencyMatrix(nodes: ChordNode[], links: ChordLink[]): number[][] {
    const size = nodes.length;
    const matrix: number[][] = Array(size).fill(null).map(() => Array(size).fill(0));

    links.forEach(link => {
      const sourceIndex = nodes.findIndex(n => n.id === link.source.id);
      const targetIndex = nodes.findIndex(n => n.id === link.target.id);
      
      if (sourceIndex !== -1 && targetIndex !== -1) {
        matrix[sourceIndex][targetIndex] = link.value;
        matrix[targetIndex][sourceIndex] = link.value; // Symmetric for chord diagram
      }
    });

    return matrix;
  }

  /**
   * Calculate comprehensive statistics
   */
  private calculateChordStatistics(
    tokens: Token[], 
    modes: Mode[], 
    platforms: Platform[],
    modeAnalysis: ModeAnalysis,
    platformAnalysis: PlatformAnalysis,
    links: ChordLink[]
  ): ChordStatistics {
    const totalConflicts = modeAnalysis.conflictMatrix.conflicts
      .flat()
      .reduce((sum, val) => sum + val, 0) / 2; // Divide by 2 since matrix is symmetric

    const recommendations: ChordRecommendation[] = [];

    // Generate recommendations based on analysis
    if (modeAnalysis.modeCouplings.length > modes.length * 0.3) {
      recommendations.push({
        type: 'coupling-reduction',
        severity: 'warning',
        title: 'High Mode Coupling Detected',
        description: `${modeAnalysis.modeCouplings.length} strong mode couplings found, indicating potential over-complexity`,
        affectedItems: modeAnalysis.modeCouplings.flatMap(mc => mc.modeNames),
        estimatedImpact: 'medium',
        suggestedAction: 'Consider consolidating highly coupled modes or restructuring token values'
      });
    }

    return {
      totalTokens: tokens.length,
      totalModes: modes.length,
      totalPlatforms: platforms.length,
      totalConflicts,
      avgConflictsPerToken: tokens.length > 0 ? totalConflicts / tokens.length : 0,
      maxConflictsPerToken: Math.max(...modeAnalysis.mostVolatileTokens.map(vt => vt.uniqueValues)),
      modeCouplingScore: modeAnalysis.modeCouplings.length > 0 ? 
        modeAnalysis.modeCouplings.reduce((sum, mc) => sum + mc.couplingStrength, 0) / modeAnalysis.modeCouplings.length : 0,
      platformComplexityScore: platformAnalysis.complexityScore,
      recommendations
    };
  }

  /**
   * Helper methods
   */
  private valuesEqual(valueA: any, valueB: any): boolean {
    return JSON.stringify(valueA) === JSON.stringify(valueB);
  }

  private calculatePlatformComplexity(platformDeviations: PlatformDeviation[]): number {
    if (platformDeviations.length === 0) return 0;
    return platformDeviations.reduce((sum, pd) => sum + pd.deviationScore, 0) / platformDeviations.length;
  }

  private getModeColor(index: number): string {
    const colors = ['#3182CE', '#38A169', '#D69E2E', '#E53E3E', '#9F7AEA', '#00B5D8'];
    return colors[index % colors.length];
  }

  private getPlatformColor(index: number): string {
    const colors = ['#2B6CB0', '#2F855A', '#B7791F', '#C53030', '#805AD5', '#0987A0'];
    return colors[index % colors.length];
  }
}
