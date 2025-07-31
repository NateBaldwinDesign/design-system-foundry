import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrideFile,
  Token,
  TokenCollection,
  Dimension,
  Platform,
  Theme,
  Taxonomy,
  ResolvedValueType,
  ComponentProperty,
  ComponentCategory,
  Component
} from '@token-model/data-model';
import type { DataSourceContext } from './dataSourceManager';

export interface MergedDataSnapshot {
  collections: TokenCollection[];
  modes: any[];
  dimensions: Dimension[];
  resolvedValueTypes: ResolvedValueType[];
  platforms: Platform[];
  themes: Theme[];
  tokens: Token[];
  taxonomies: Taxonomy[];
  componentProperties: ComponentProperty[];
  componentCategories: ComponentCategory[];
  components: Component[];
  taxonomyOrder: string[];
  dimensionOrder: string[];
  algorithmFile: Record<string, unknown> | null;
  systemName: string;
  systemId: string;
  version: string;
  figmaConfiguration: any;
}

export interface DataSourceInfo {
  sourceType: 'core' | 'platform-extension' | 'theme-override';
  sourceId: string | null;
  isOverride: boolean;
  originalValue?: any;
}

export interface MergeAnalytics {
  totalTokens: number;
  overriddenTokens: number;
  newTokens: number;
  omittedTokens: number;
  platformCount: number;
  themeCount: number;
  sourceBreakdown: {
    core: number;
    platformExtensions: Record<string, number>;
    themeOverrides: Record<string, number>;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class EnhancedDataMerger {
  private static instance: EnhancedDataMerger;
  private sourceTracking: Map<string, DataSourceInfo> = new Map();

  private constructor() {}

  static getInstance(): EnhancedDataMerger {
    if (!EnhancedDataMerger.instance) {
      EnhancedDataMerger.instance = new EnhancedDataMerger();
    }
    return EnhancedDataMerger.instance;
  }

  /**
   * Merge data based on current data source context
   */
  mergeData(
    context: DataSourceContext,
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>,
    themeOverrides: Record<string, ThemeOverrideFile>
  ): MergedDataSnapshot {
    try {
      // Start with core data
      let mergedData = this.coreToMergedSnapshot(coreData);

      // Merge platform extension if selected
      if (context.currentPlatform && context.currentPlatform !== 'none') {
        const platformExtension = platformExtensions[context.currentPlatform];
        if (platformExtension) {
          mergedData = this.mergePlatformExtension(mergedData, platformExtension, context.currentPlatform);
        }
      }

      // Merge theme override if selected
      if (context.currentTheme && context.currentTheme !== 'none') {
        const themeOverride = themeOverrides[context.currentTheme];
        if (themeOverride) {
          mergedData = this.mergeThemeOverride(mergedData, themeOverride, context.currentTheme);
        }
      }

      return mergedData;
    } catch (error) {
      console.error('Error merging data:', error);
      throw new Error('Failed to merge data sources');
    }
  }

  /**
   * Get source information for a specific token
   */
  getSourceInfo(tokenId: string): DataSourceInfo | null {
    return this.sourceTracking.get(tokenId) || null;
  }

  /**
   * Get analytics for merged data
   */
  getAnalytics(
    context: DataSourceContext,
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>,
    themeOverrides: Record<string, ThemeOverrideFile>
  ): MergeAnalytics {
    const analytics: MergeAnalytics = {
      totalTokens: 0,
      overriddenTokens: 0,
      newTokens: 0,
      omittedTokens: 0,
      platformCount: 0,
      themeCount: 0,
      sourceBreakdown: {
        core: 0,
        platformExtensions: {},
        themeOverrides: {}
      }
    };

    // Count core tokens
    if (coreData?.tokens) {
      analytics.sourceBreakdown.core = coreData.tokens.length;
      analytics.totalTokens += coreData.tokens.length;
    }

    // Count platform extension tokens
    if (context.currentPlatform && context.currentPlatform !== 'none') {
      const platformExtension = platformExtensions[context.currentPlatform];
      if (platformExtension?.tokenOverrides) {
        const platformTokenCount = platformExtension.tokenOverrides.length;
        analytics.sourceBreakdown.platformExtensions[context.currentPlatform] = platformTokenCount;
        analytics.overriddenTokens += platformTokenCount;
      }
    }

    // Count theme override tokens
    if (context.currentTheme && context.currentTheme !== 'none') {
      const themeOverride = themeOverrides[context.currentTheme];
      if (themeOverride?.tokenOverrides) {
        const themeTokenCount = themeOverride.tokenOverrides.length;
        analytics.sourceBreakdown.themeOverrides[context.currentTheme] = themeTokenCount;
        analytics.overriddenTokens += themeTokenCount;
      }
    }

    // Count platforms and themes
    analytics.platformCount = Object.keys(platformExtensions).length;
    analytics.themeCount = Object.keys(themeOverrides).length;

    return analytics;
  }

  /**
   * Validate merged data
   */
  validateMergedData(mergedData: MergedDataSnapshot): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic validation
      if (!mergedData.systemId) {
        errors.push('Missing systemId');
      }

      if (!mergedData.systemName) {
        errors.push('Missing systemName');
      }

      if (!mergedData.version) {
        errors.push('Missing version');
      }

      // Token validation
      if (mergedData.tokens) {
        for (const token of mergedData.tokens) {
          if (!token.id) {
            errors.push(`Token missing ID: ${token.displayName || 'Unknown'}`);
          }
          if (!token.resolvedValueTypeId) {
            errors.push(`Token missing resolvedValueTypeId: ${token.id}`);
          }
        }
      }

      // Collection validation
      if (mergedData.collections) {
        for (const collection of mergedData.collections) {
          if (!collection.id) {
            errors.push(`Collection missing ID: ${collection.displayName || 'Unknown'}`);
          }
        }
      }

      // Dimension validation
      if (mergedData.dimensions) {
        for (const dimension of mergedData.dimensions) {
          if (!dimension.id) {
            errors.push(`Dimension missing ID: ${dimension.displayName || 'Unknown'}`);
          }
        }
      }

      // Check for duplicate IDs
      const tokenIds = new Set<string>();
      const collectionIds = new Set<string>();
      const dimensionIds = new Set<string>();

      mergedData.tokens?.forEach(token => {
        if (tokenIds.has(token.id)) {
          warnings.push(`Duplicate token ID: ${token.id}`);
        }
        tokenIds.add(token.id);
      });

      mergedData.collections?.forEach(collection => {
        if (collectionIds.has(collection.id)) {
          warnings.push(`Duplicate collection ID: ${collection.id}`);
        }
        collectionIds.add(collection.id);
      });

      mergedData.dimensions?.forEach(dimension => {
        if (dimensionIds.has(dimension.id)) {
          warnings.push(`Duplicate dimension ID: ${dimension.id}`);
        }
        dimensionIds.add(dimension.id);
      });

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convert core data to merged snapshot
   */
  private coreToMergedSnapshot(coreData: TokenSystem | null): MergedDataSnapshot {
    if (!coreData) {
      return {
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        tokens: [],
        taxonomies: [],
        componentProperties: [],
        componentCategories: [],
        components: [],
        taxonomyOrder: [],
        dimensionOrder: [],
        algorithmFile: null,
        systemName: 'Design System',
        systemId: 'design-system',
        version: '1.0.0',
        figmaConfiguration: null
      };
    }

    // Track source for all core tokens
    coreData.tokens?.forEach(token => {
      this.sourceTracking.set(token.id, {
        sourceType: 'core',
        sourceId: null,
        isOverride: false
      });
    });

    return {
      collections: coreData.tokenCollections || [],
      modes: this.extractModes(coreData.dimensions || []),
      dimensions: coreData.dimensions || [],
      resolvedValueTypes: coreData.resolvedValueTypes || [],
      platforms: coreData.platforms || [],
      themes: coreData.themes || [],
      tokens: coreData.tokens || [],
      taxonomies: coreData.taxonomies || [],
      componentProperties: coreData.componentProperties || [],
      componentCategories: coreData.componentCategories || [],
      components: coreData.components || [],
      taxonomyOrder: coreData.taxonomyOrder || [],
      dimensionOrder: coreData.dimensionOrder || [],
      algorithmFile: null,
      systemName: coreData.systemName || 'Design System',
      systemId: coreData.systemId || 'design-system',
      version: coreData.version || '1.0.0',
      figmaConfiguration: coreData.figmaConfiguration || null
    };
  }

  /**
   * Merge platform extension data
   */
  private mergePlatformExtension(
    mergedData: MergedDataSnapshot,
    platformExtension: PlatformExtension,
    platformId: string
  ): MergedDataSnapshot {
    const result = { ...mergedData };

    // Merge token overrides
    if (platformExtension.tokenOverrides) {
      for (const override of platformExtension.tokenOverrides) {
        const existingTokenIndex = result.tokens.findIndex(t => t.id === override.id);
        
        if (existingTokenIndex >= 0) {
          // Override existing token
          result.tokens[existingTokenIndex] = {
            ...result.tokens[existingTokenIndex],
            ...override,
            omit: override.omit || false
          };
          
          this.sourceTracking.set(override.id, {
            sourceType: 'platform-extension',
            sourceId: platformId,
            isOverride: true,
            originalValue: result.tokens[existingTokenIndex]
          });
        } else {
          // Add new token
          result.tokens.push(override as Token);
          
          this.sourceTracking.set(override.id, {
            sourceType: 'platform-extension',
            sourceId: platformId,
            isOverride: false
          });
        }
      }
    }

    // Filter out omitted tokens
    result.tokens = result.tokens.filter(token => !token.omit);

    // Handle omitted modes and dimensions
    if (platformExtension.omittedModes) {
      result.modes = result.modes.filter(mode => !platformExtension.omittedModes!.includes(mode.id));
    }

    if (platformExtension.omittedDimensions) {
      result.dimensions = result.dimensions.filter(dimension => !platformExtension.omittedDimensions!.includes(dimension.id));
    }

    return result;
  }

  /**
   * Merge theme override data
   */
  private mergeThemeOverride(
    mergedData: MergedDataSnapshot,
    themeOverride: ThemeOverrideFile,
    themeId: string
  ): MergedDataSnapshot {
    const result = { ...mergedData };

    // Merge token overrides
    if (themeOverride.tokenOverrides) {
      for (const override of themeOverride.tokenOverrides) {
        const existingTokenIndex = result.tokens.findIndex(t => t.id === override.tokenId);
        
        if (existingTokenIndex >= 0) {
          // Override token values
          const existingToken = result.tokens[existingTokenIndex];
          result.tokens[existingTokenIndex] = {
            ...existingToken,
            valuesByMode: override.valuesByMode
          };
          
          this.sourceTracking.set(override.tokenId, {
            sourceType: 'theme-override',
            sourceId: themeId,
            isOverride: true,
            originalValue: existingToken
          });
        }
      }
    }

    return result;
  }

  /**
   * Extract modes from dimensions
   */
  private extractModes(dimensions: Dimension[]): any[] {
    const modes: any[] = [];
    dimensions.forEach(dimension => {
      if (dimension.modes) {
        modes.push(...dimension.modes);
      }
    });
    return modes;
  }

  /**
   * Clear source tracking
   */
  clearSourceTracking(): void {
    this.sourceTracking.clear();
  }

  /**
   * Get all source tracking information
   */
  getAllSourceInfo(): Map<string, DataSourceInfo> {
    return new Map(this.sourceTracking);
  }
} 