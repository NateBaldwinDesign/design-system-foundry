import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrideFile,
  Token,
  Platform,
  Theme
} from '@token-model/data-model';
import type { DataSourceContext } from './dataSourceManager';

export interface MergeAnalytics {
  totalTokens: number;
  overriddenTokens: number;
  newTokens: number;
  omittedTokens: number;
  platformCount: number;
  themeCount: number;
  overridePercentages: {
    platform: number;
    theme: number;
    combined: number;
  };
  dataSourceUsage: {
    core: boolean;
    platform: string | null;
    theme: string | null;
  };
  tokenDistribution: {
    core: number;
    platformOverrides: number;
    themeOverrides: number;
    combinedOverrides: number;
  };
}

export interface DataSourceComparison {
  core: {
    totalTokens: number;
    totalCollections: number;
    totalDimensions: number;
  };
  platform: {
    totalOverrides: number;
    totalOmitted: number;
    overridePercentage: number;
  };
  theme: {
    totalOverrides: number;
    overridePercentage: number;
  };
  merged: {
    totalTokens: number;
    overriddenTokens: number;
    newTokens: number;
    omittedTokens: number;
  };
}

/**
 * Enhanced Analytics Service
 * 
 * Provides analytics for merged data across core, platform extensions, and theme overrides.
 * Calculates statistics for current data source combinations and provides comparison analytics.
 */
export class EnhancedAnalyticsService {
  /**
   * Calculate analytics for merged data
   */
  static calculateMergedAnalytics(
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>,
    themeOverrides: Record<string, ThemeOverrideFile>,
    dataSourceContext: DataSourceContext
  ): MergeAnalytics {
    if (!coreData) {
      return this.createEmptyAnalytics();
    }

    const currentPlatform = dataSourceContext.currentPlatform;
    const currentTheme = dataSourceContext.currentTheme;
    
    const currentPlatformExtension = currentPlatform && currentPlatform !== 'none' 
      ? platformExtensions[currentPlatform] 
      : null;
    const currentThemeOverride = currentTheme && currentTheme !== 'none' 
      ? themeOverrides[currentTheme] 
      : null;

    // Calculate token statistics
    const coreTokens = coreData.tokens || [];
    const platformTokenOverrides = currentPlatformExtension?.tokenOverrides || [];
    const themeTokenOverrides = currentThemeOverride?.tokenOverrides || [];

    // Count overridden tokens
    const platformOverriddenTokenIds = new Set(platformTokenOverrides.map(o => o.tokenId));
    const themeOverriddenTokenIds = new Set(themeTokenOverrides.map(o => o.tokenId));
    const combinedOverriddenTokenIds = new Set([
      ...platformOverriddenTokenIds,
      ...themeOverriddenTokenIds
    ]);

    const overriddenTokens = combinedOverriddenTokenIds.size;
    const totalTokens = coreTokens.length;
    const newTokens = this.calculateNewTokens(coreTokens, platformTokenOverrides, themeTokenOverrides);
    const omittedTokens = this.calculateOmittedTokens(coreTokens, currentPlatformExtension);

    // Calculate override percentages
    const platformOverridePercentage = totalTokens > 0 ? (platformOverriddenTokenIds.size / totalTokens) * 100 : 0;
    const themeOverridePercentage = totalTokens > 0 ? (themeOverriddenTokenIds.size / totalTokens) * 100 : 0;
    const combinedOverridePercentage = totalTokens > 0 ? (combinedOverriddenTokenIds.size / totalTokens) * 100 : 0;

    // Calculate token distribution
    const tokenDistribution = {
      core: totalTokens - overriddenTokens,
      platformOverrides: platformOverriddenTokenIds.size,
      themeOverrides: themeOverriddenTokenIds.size,
      combinedOverrides: combinedOverriddenTokenIds.size
    };

    return {
      totalTokens,
      overriddenTokens,
      newTokens,
      omittedTokens,
      platformCount: Object.keys(platformExtensions).length,
      themeCount: Object.keys(themeOverrides).length,
      overridePercentages: {
        platform: platformOverridePercentage,
        theme: themeOverridePercentage,
        combined: combinedOverridePercentage
      },
      dataSourceUsage: {
        core: true,
        platform: currentPlatform,
        theme: currentTheme
      },
      tokenDistribution
    };
  }

  /**
   * Compare data sources
   */
  static compareDataSources(
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>,
    themeOverrides: Record<string, ThemeOverrideFile>,
    dataSourceContext: DataSourceContext
  ): DataSourceComparison {
    if (!coreData) {
      return this.createEmptyComparison();
    }

    const currentPlatform = dataSourceContext.currentPlatform;
    const currentTheme = dataSourceContext.currentTheme;
    
    const currentPlatformExtension = currentPlatform && currentPlatform !== 'none' 
      ? platformExtensions[currentPlatform] 
      : null;
    const currentThemeOverride = currentTheme && currentTheme !== 'none' 
      ? themeOverrides[currentTheme] 
      : null;

    // Core data statistics
    const core = {
      totalTokens: coreData.tokens?.length || 0,
      totalCollections: coreData.tokenCollections?.length || 0,
      totalDimensions: coreData.dimensions?.length || 0
    };

    // Platform extension statistics
    const platform = {
      totalOverrides: currentPlatformExtension?.tokenOverrides?.length || 0,
      totalOmitted: (currentPlatformExtension?.omittedModes?.length || 0) + 
                   (currentPlatformExtension?.omittedDimensions?.length || 0),
      overridePercentage: core.totalTokens > 0 
        ? ((currentPlatformExtension?.tokenOverrides?.length || 0) / core.totalTokens) * 100 
        : 0
    };

    // Theme override statistics
    const theme = {
      totalOverrides: currentThemeOverride?.tokenOverrides?.length || 0,
      overridePercentage: core.totalTokens > 0 
        ? ((currentThemeOverride?.tokenOverrides?.length || 0) / core.totalTokens) * 100 
        : 0
    };

    // Merged data statistics
    const mergedAnalytics = this.calculateMergedAnalytics(
      coreData, 
      platformExtensions, 
      themeOverrides, 
      dataSourceContext
    );

    const merged = {
      totalTokens: mergedAnalytics.totalTokens,
      overriddenTokens: mergedAnalytics.overriddenTokens,
      newTokens: mergedAnalytics.newTokens,
      omittedTokens: mergedAnalytics.omittedTokens
    };

    return {
      core,
      platform,
      theme,
      merged
    };
  }

  /**
   * Get data source usage patterns
   */
  static getDataSourceUsagePatterns(
    dataSourceContext: DataSourceContext
  ): {
    mostUsedPlatform: string | null;
    mostUsedTheme: string | null;
    usageFrequency: {
      core: number;
      platforms: Record<string, number>;
      themes: Record<string, number>;
    };
  } {
    // This would typically come from persistent storage tracking usage
    // For now, return current selections as most used
    return {
      mostUsedPlatform: dataSourceContext.currentPlatform,
      mostUsedTheme: dataSourceContext.currentTheme,
      usageFrequency: {
        core: 1,
        platforms: dataSourceContext.currentPlatform && dataSourceContext.currentPlatform !== 'none' 
          ? { [dataSourceContext.currentPlatform]: 1 }
          : {},
        themes: dataSourceContext.currentTheme && dataSourceContext.currentTheme !== 'none'
          ? { [dataSourceContext.currentTheme]: 1 }
          : {}
      }
    };
  }

  /**
   * Calculate override impact analysis
   */
  static calculateOverrideImpact(
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>,
    themeOverrides: Record<string, ThemeOverrideFile>,
    dataSourceContext: DataSourceContext
  ): {
    highImpactOverrides: string[];
    lowImpactOverrides: string[];
    criticalTokens: string[];
    overrideDependencies: Record<string, string[]>;
  } {
    if (!coreData) {
      return {
        highImpactOverrides: [],
        lowImpactOverrides: [],
        criticalTokens: [],
        overrideDependencies: {}
      };
    }

    const currentPlatform = dataSourceContext.currentPlatform;
    const currentTheme = dataSourceContext.currentTheme;
    
    const currentPlatformExtension = currentPlatform && currentPlatform !== 'none' 
      ? platformExtensions[currentPlatform] 
      : null;
    const currentThemeOverride = currentTheme && currentTheme !== 'none' 
      ? themeOverrides[currentTheme] 
      : null;

    const highImpactOverrides: string[] = [];
    const lowImpactOverrides: string[] = [];
    const criticalTokens: string[] = [];
    const overrideDependencies: Record<string, string[]> = {};

    // Analyze platform overrides
    if (currentPlatformExtension?.tokenOverrides) {
      currentPlatformExtension.tokenOverrides.forEach(override => {
        const token = coreData.tokens?.find(t => t.id === override.tokenId);
        if (token) {
          // Determine impact based on token usage and type
          const impact = this.calculateTokenImpact(token, coreData);
          
          if (impact > 0.7) {
            highImpactOverrides.push(override.tokenId);
          } else if (impact < 0.3) {
            lowImpactOverrides.push(override.tokenId);
          }

          // Check if token is critical (used in many places)
          if (this.isCriticalToken(token, coreData)) {
            criticalTokens.push(override.tokenId);
          }

          // Track dependencies
          overrideDependencies[override.tokenId] = this.getTokenDependencies(token, coreData);
        }
      });
    }

    // Analyze theme overrides
    if (currentThemeOverride?.tokenOverrides) {
      currentThemeOverride.tokenOverrides.forEach(override => {
        const token = coreData.tokens?.find(t => t.id === override.tokenId);
        if (token) {
          const impact = this.calculateTokenImpact(token, coreData);
          
          if (impact > 0.7) {
            highImpactOverrides.push(override.tokenId);
          } else if (impact < 0.3) {
            lowImpactOverrides.push(override.tokenId);
          }

          if (this.isCriticalToken(token, coreData)) {
            criticalTokens.push(override.tokenId);
          }

          overrideDependencies[override.tokenId] = this.getTokenDependencies(token, coreData);
        }
      });
    }

    return {
      highImpactOverrides: [...new Set(highImpactOverrides)],
      lowImpactOverrides: [...new Set(lowImpactOverrides)],
      criticalTokens: [...new Set(criticalTokens)],
      overrideDependencies
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private static createEmptyAnalytics(): MergeAnalytics {
    return {
      totalTokens: 0,
      overriddenTokens: 0,
      newTokens: 0,
      omittedTokens: 0,
      platformCount: 0,
      themeCount: 0,
      overridePercentages: {
        platform: 0,
        theme: 0,
        combined: 0
      },
      dataSourceUsage: {
        core: false,
        platform: null,
        theme: null
      },
      tokenDistribution: {
        core: 0,
        platformOverrides: 0,
        themeOverrides: 0,
        combinedOverrides: 0
      }
    };
  }

  private static createEmptyComparison(): DataSourceComparison {
    return {
      core: {
        totalTokens: 0,
        totalCollections: 0,
        totalDimensions: 0
      },
      platform: {
        totalOverrides: 0,
        totalOmitted: 0,
        overridePercentage: 0
      },
      theme: {
        totalOverrides: 0,
        overridePercentage: 0
      },
      merged: {
        totalTokens: 0,
        overriddenTokens: 0,
        newTokens: 0,
        omittedTokens: 0
      }
    };
  }

  private static calculateNewTokens(
    coreTokens: Token[],
    platformOverrides: any[],
    themeOverrides: any[]
  ): number {
    // This would need to be implemented based on your token structure
    // For now, return 0 as new tokens are typically not added in overrides
    return 0;
  }

  private static calculateOmittedTokens(
    coreTokens: Token[],
    platformExtension: PlatformExtension | null
  ): number {
    if (!platformExtension) return 0;
    
    const omittedModes = platformExtension.omittedModes || [];
    const omittedDimensions = platformExtension.omittedDimensions || [];
    
    // Count tokens that are omitted due to mode/dimension omissions
    let omittedCount = 0;
    
    coreTokens.forEach(token => {
      // Check if token is omitted due to mode omission
      const isOmittedByMode = token.valuesByMode?.some(vm => 
        vm.modeIds?.some(modeId => omittedModes.includes(modeId))
      );
      
      // Check if token is omitted due to dimension omission
      const isOmittedByDimension = token.dimensionIds?.some(dimensionId => 
        omittedDimensions.includes(dimensionId)
      );
      
      if (isOmittedByMode || isOmittedByDimension) {
        omittedCount++;
      }
    });
    
    return omittedCount;
  }

  private static calculateTokenImpact(token: Token, coreData: TokenSystem): number {
    // Calculate impact based on token usage and importance
    // This is a simplified calculation - you might want to make this more sophisticated
    
    let impact = 0;
    
    // Base impact from token type
    if (token.resolvedValueTypeIds?.includes('color')) impact += 0.3;
    if (token.resolvedValueTypeIds?.includes('spacing')) impact += 0.2;
    if (token.resolvedValueTypeIds?.includes('typography')) impact += 0.3;
    
    // Impact from collection importance
    const collection = coreData.tokenCollections?.find(c => c.id === token.collectionId);
    if (collection) {
      if (collection.displayName?.toLowerCase().includes('brand')) impact += 0.2;
      if (collection.displayName?.toLowerCase().includes('semantic')) impact += 0.2;
    }
    
    return Math.min(impact, 1.0);
  }

  private static isCriticalToken(token: Token, coreData: TokenSystem): boolean {
    // Determine if a token is critical based on its usage and importance
    // This is a simplified check - you might want to make this more sophisticated
    
    // Check if token is in a critical collection
    const collection = coreData.tokenCollections?.find(c => c.id === token.collectionId);
    if (collection?.displayName?.toLowerCase().includes('brand')) return true;
    if (collection?.displayName?.toLowerCase().includes('semantic')) return true;
    
    // Check if token is a color or typography token (typically more critical)
    if (token.resolvedValueTypeIds?.includes('color')) return true;
    if (token.resolvedValueTypeIds?.includes('typography')) return true;
    
    return false;
  }

  private static getTokenDependencies(token: Token, coreData: TokenSystem): string[] {
    // Get tokens that depend on this token (aliases)
    const dependencies: string[] = [];
    
    coreData.tokens?.forEach(t => {
      if (t.value?.tokenId === token.id) {
        dependencies.push(t.id);
      }
    });
    
    return dependencies;
  }
} 