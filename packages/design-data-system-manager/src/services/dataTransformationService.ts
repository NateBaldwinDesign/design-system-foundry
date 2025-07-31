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
import type { Algorithm } from '../types/algorithm';
import type { ExtendedToken } from '../components/TokenEditorDialog';

export interface DataSnapshot {
  collections: TokenCollection[];
  modes: any[];
  dimensions: Dimension[];
  resolvedValueTypes: ResolvedValueType[];
  platforms: Platform[];
  themes: Theme[];
  tokens: ExtendedToken[];
  taxonomies: Taxonomy[];
  componentProperties: ComponentProperty[];
  componentCategories: ComponentCategory[];
  components: Component[];
  algorithms: Algorithm[];
  taxonomyOrder: string[];
  dimensionOrder: string[];
  algorithmFile: Record<string, unknown> | null;
  linkedRepositories: Array<{
    id: string;
    type: 'core' | 'platform-extension' | 'theme-override';
    repositoryUri: string;
    branch: string;
    filePath: string;
    platformId?: string;
    themeId?: string;
    lastSync?: string;
    status: 'linked' | 'loading' | 'error' | 'synced';
    error?: string;
  }>;
  platformExtensions: Record<string, unknown>;
  themeOverrides: Record<string, unknown> | null;
  figmaConfiguration: any | null;
}

/**
 * Data Transformation Service
 * 
 * Transforms data between presentation (merged) and storage (schema-compliant) formats.
 * This ensures that data saved to GitHub adheres to the correct schema while
 * maintaining a unified view for the UI.
 */
export class DataTransformationService {
  /**
   * Transform presentation data to schema-compliant storage data
   */
  static transformToStorageFormat(
    presentationData: DataSnapshot,
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId?: string
  ): Record<string, unknown> {
    switch (sourceType) {
      case 'core':
        return this.transformToCoreSchema(presentationData);
      case 'platform-extension':
        return this.transformToPlatformExtensionSchema(presentationData, sourceId!);
      case 'theme-override':
        return this.transformToThemeOverrideSchema(presentationData, sourceId!);
      default:
        throw new Error(`Unknown source type: ${sourceType}`);
    }
  }

  /**
   * Transform storage data to presentation format (merged)
   */
  static transformToPresentationFormat(
    coreData: TokenSystem | null,
    platformExtensions: Record<string, PlatformExtension>,
    themeOverrides: Record<string, ThemeOverrideFile> | null,
    currentPlatform: string | null,
    currentTheme: string | null
  ): DataSnapshot {
    // Start with core data
    let presentationData = this.coreToPresentation(coreData);

    // Merge platform extension if selected
    if (currentPlatform && currentPlatform !== 'none' && platformExtensions[currentPlatform]) {
      presentationData = this.mergePlatformExtension(presentationData, platformExtensions[currentPlatform]);
    }

    // Merge theme override if selected
    if (currentTheme && currentTheme !== 'none' && themeOverrides && themeOverrides[currentTheme]) {
      presentationData = this.mergeThemeOverride(presentationData, themeOverrides[currentTheme]);
    }

    return presentationData;
  }

  /**
   * Transform presentation data to core schema (TokenSystem)
   */
  private static transformToCoreSchema(presentationData: DataSnapshot): TokenSystem {
    return {
      systemName: presentationData.systemName || 'Design System',
      systemId: presentationData.systemId || 'design-system',
      description: presentationData.description || 'A comprehensive design system with tokens, dimensions, and themes',
      version: presentationData.version || '1.0.0',
      versionHistory: presentationData.versionHistory || [],
      tokenCollections: presentationData.collections,
      dimensions: presentationData.dimensions,
      tokens: presentationData.tokens.map(token => this.extractCoreToken(token)),
      platforms: presentationData.platforms,
      themes: presentationData.themes,
      taxonomies: presentationData.taxonomies,
      resolvedValueTypes: presentationData.resolvedValueTypes,
      componentProperties: presentationData.componentProperties,
      componentCategories: presentationData.componentCategories,
      components: presentationData.components,
      figmaConfiguration: presentationData.figmaConfiguration,
      platformExtensions: presentationData.platformExtensions
    };
  }

  /**
   * Transform presentation data to platform extension schema (PlatformExtension)
   */
  private static transformToPlatformExtensionSchema(
    presentationData: DataSnapshot,
    platformId: string
  ): PlatformExtension {
    return {
      systemId: presentationData.systemId || 'design-system',
      platformId: platformId,
      version: presentationData.version || '1.0.0',
      // Extract only platform-specific overrides and additions
      tokenOverrides: this.extractPlatformTokenOverrides(presentationData, platformId),
      algorithmVariableOverrides: this.extractPlatformAlgorithmOverrides(presentationData, platformId),
      omittedModes: this.extractOmittedModes(presentationData, platformId),
      omittedDimensions: this.extractOmittedDimensions(presentationData, platformId),
      syntaxPatterns: this.extractSyntaxPatterns(presentationData, platformId),
      valueFormatters: this.extractValueFormatters(presentationData, platformId),
      figmaFileKey: this.extractFigmaFileKey(presentationData, platformId)
    };
  }

  /**
   * Transform presentation data to theme override schema (ThemeOverrideFile)
   */
  private static transformToThemeOverrideSchema(
    presentationData: DataSnapshot,
    themeId: string
  ): ThemeOverrideFile {
    return {
      systemId: presentationData.systemId || 'design-system',
      themeId: themeId,
      tokenOverrides: this.extractThemeTokenOverrides(presentationData, themeId),
      figmaFileKey: this.extractThemeFigmaFileKey(presentationData, themeId)
    };
  }

  /**
   * Convert core data to presentation format
   */
  private static coreToPresentation(coreData: TokenSystem | null): DataSnapshot {
    if (!coreData) {
      return this.createEmptySnapshot();
    }

    return {
      collections: coreData.tokenCollections || [],
      modes: this.extractModes(coreData),
      dimensions: coreData.dimensions || [],
      resolvedValueTypes: coreData.resolvedValueTypes || [],
      platforms: coreData.platforms || [],
      themes: coreData.themes || [],
      tokens: coreData.tokens.map(token => this.extendToken(token)),
      taxonomies: coreData.taxonomies || [],
      componentProperties: coreData.componentProperties || [],
      componentCategories: coreData.componentCategories || [],
      components: coreData.components || [],
      algorithms: [],
      taxonomyOrder: [],
      dimensionOrder: coreData.dimensions?.map(d => d.id) || [],
      algorithmFile: null,
      linkedRepositories: [],
      platformExtensions: {},
      themeOverrides: null,
      figmaConfiguration: coreData.figmaConfiguration || null,
      systemName: coreData.systemName,
      systemId: coreData.systemId,
      description: coreData.description,
      version: coreData.version,
      versionHistory: coreData.versionHistory
    };
  }

  /**
   * Merge platform extension into presentation data
   */
  private static mergePlatformExtension(
    presentationData: DataSnapshot,
    platformExtension: PlatformExtension
  ): DataSnapshot {
    // Merge token overrides
    if (platformExtension.tokenOverrides) {
      presentationData.tokens = this.mergeTokenOverrides(
        presentationData.tokens,
        platformExtension.tokenOverrides,
        platformExtension.platformId
      );
    }

    // Merge algorithm variable overrides
    if (platformExtension.algorithmVariableOverrides) {
      // This would need to be implemented based on your algorithm structure
      console.log('Algorithm variable overrides merging not yet implemented');
    }

    // Update platform extensions registry
    presentationData.platformExtensions[platformExtension.platformId] = platformExtension;

    return presentationData;
  }

  /**
   * Merge theme override into presentation data
   */
  private static mergeThemeOverride(
    presentationData: DataSnapshot,
    themeOverride: ThemeOverrideFile
  ): DataSnapshot {
    // Merge token overrides
    if (themeOverride.tokenOverrides) {
      presentationData.tokens = this.mergeTokenOverrides(
        presentationData.tokens,
        themeOverride.tokenOverrides,
        themeOverride.themeId
      );
    }

    // Update theme overrides
    presentationData.themeOverrides = {
      ...presentationData.themeOverrides,
      [themeOverride.themeId]: themeOverride
    };

    return presentationData;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Create empty snapshot
   */
  private static createEmptySnapshot(): DataSnapshot {
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
      algorithms: [],
      taxonomyOrder: [],
      dimensionOrder: [],
      algorithmFile: null,
      linkedRepositories: [],
      platformExtensions: {},
      themeOverrides: null,
      figmaConfiguration: null
    };
  }

  /**
   * Extract modes from core data
   */
  private static extractModes(coreData: TokenSystem): any[] {
    const modes: any[] = [];
    coreData.dimensions?.forEach(dimension => {
      dimension.modes?.forEach(mode => {
        modes.push(mode);
      });
    });
    return modes;
  }

  /**
   * Convert Token to ExtendedToken
   */
  private static extendToken(token: Token): ExtendedToken {
    return {
      ...token,
      // Add any ExtendedToken-specific properties here
    } as ExtendedToken;
  }

  /**
   * Extract core token from ExtendedToken
   */
  private static extractCoreToken(token: ExtendedToken): Token {
    // Remove ExtendedToken-specific properties
    const { ...coreToken } = token;
    return coreToken as Token;
  }

  /**
   * Merge token overrides
   */
  private static mergeTokenOverrides(
    tokens: ExtendedToken[],
    overrides: any[],
    sourceId: string
  ): ExtendedToken[] {
    const tokenMap = new Map(tokens.map(token => [token.id, token]));
    
    overrides.forEach(override => {
      const existingToken = tokenMap.get(override.tokenId);
      if (existingToken) {
        // Apply override
        tokenMap.set(override.tokenId, {
          ...existingToken,
          ...override,
          // Mark as overridden
          overriddenBy: sourceId
        });
      }
    });

    return Array.from(tokenMap.values());
  }

  // ============================================================================
  // Platform Extension Extraction Methods
  // ============================================================================

  private static extractPlatformTokenOverrides(
    presentationData: DataSnapshot,
    platformId: string
  ): any[] {
    // Extract tokens that are overridden by this platform
    return presentationData.tokens
      .filter(token => token.overriddenBy === platformId)
      .map(token => ({
        tokenId: token.id,
        // Extract only the override-specific data
        valuesByMode: token.valuesByMode
      }));
  }

  private static extractPlatformAlgorithmOverrides(
    presentationData: DataSnapshot,
    platformId: string
  ): any[] {
    // This would need to be implemented based on your algorithm structure
    return [];
  }

  private static extractOmittedModes(
    presentationData: DataSnapshot,
    platformId: string
  ): string[] {
    // This would need to be implemented based on your mode omission logic
    return [];
  }

  private static extractOmittedDimensions(
    presentationData: DataSnapshot,
    platformId: string
  ): string[] {
    // This would need to be implemented based on your dimension omission logic
    return [];
  }

  private static extractSyntaxPatterns(
    presentationData: DataSnapshot,
    platformId: string
  ): any {
    // Extract syntax patterns for the specific platform
    const platform = presentationData.platforms.find(p => p.id === platformId);
    return platform?.syntaxPatterns || {};
  }

  private static extractValueFormatters(
    presentationData: DataSnapshot,
    platformId: string
  ): any {
    // Extract value formatters for the specific platform
    const platform = presentationData.platforms.find(p => p.id === platformId);
    return platform?.valueFormatters || {};
  }

  private static extractFigmaFileKey(
    presentationData: DataSnapshot,
    platformId: string
  ): string | undefined {
    // Extract Figma file key for the specific platform
    const platform = presentationData.platforms.find(p => p.id === platformId);
    return platform?.figmaFileKey;
  }

  // ============================================================================
  // Theme Override Extraction Methods
  // ============================================================================

  private static extractThemeTokenOverrides(
    presentationData: DataSnapshot,
    themeId: string
  ): any[] {
    // Extract tokens that are overridden by this theme
    return presentationData.tokens
      .filter(token => token.overriddenBy === themeId)
      .map(token => ({
        tokenId: token.id,
        // Extract only the override-specific data
        valuesByMode: token.valuesByMode
      }));
  }

  private static extractThemeFigmaFileKey(
    presentationData: DataSnapshot,
    themeId: string
  ): string | undefined {
    // Extract Figma file key for the specific theme
    const theme = presentationData.themes.find(t => t.id === themeId);
    return theme?.figmaFileKey;
  }
} 