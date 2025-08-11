/**
 * Data Transformation Service
 * Main orchestrator for all visualization data transformations
 * Implements the transformer registry pattern from the plan
 */

import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrides 
} from '@token-model/data-model';
import type {
  VisualizationType,
  TransformOptions,
  DataTransformer,
  VisualizationResult
} from './types/visualization-data';
import type { TokenDependencyGraph } from './types/network-data';
import { TokenDependencyTransformer } from './transformers/tokenDependencyTransformer';
import { ChordDataTransformer } from './transformers/chordDataTransformer';

export class DataTransformationService {
  private static instance: DataTransformationService;
  private transformers: Map<VisualizationType, DataTransformer> = new Map();

  private constructor() {
    this.initializeDefaultTransformers();
  }

  public static getInstance(): DataTransformationService {
    if (!DataTransformationService.instance) {
      DataTransformationService.instance = new DataTransformationService();
    }
    return DataTransformationService.instance;
  }

  /**
   * Transform merged data (schema.json compliant) for visualizations
   */
  public async transformMergedData<T>(
    data: TokenSystem, 
    transformType: VisualizationType,
    options?: TransformOptions
  ): Promise<T> {
    console.log('[DataTransformationService] Transforming merged data:', {
      transformType,
      tokenCount: data.tokens?.length || 0,
      hasOptions: !!options
    });

    const transformer = this.getTransformer(transformType);
    const result = await transformer.transformData(data, options);
    
    console.log('[DataTransformationService] Merge data transformation completed');
    return result as T;
  }

  /**
   * Transform platform extension data for visualizations
   */
  public async transformPlatformData<T>(
    platformData: PlatformExtension,
    transformType: VisualizationType,
    options?: TransformOptions
  ): Promise<T> {
    console.log('[DataTransformationService] Transforming platform data:', {
      transformType,
      platformId: platformData.id,
      hasTokens: !!platformData.tokens
    });

    // Convert platform extension to TokenSystem format for processing
    const tokenSystemData: TokenSystem = {
      systemName: platformData.name,
      systemId: platformData.id,
      version: '1.0.0',
      versionHistory: [],
      tokens: platformData.tokens || [],
      resolvedValueTypes: platformData.resolvedValueTypes || [],
      tokenCollections: platformData.tokenCollections || [],
      dimensions: [],
      platforms: [],
      taxonomies: [],
      themes: []
    };

    const transformer = this.getTransformer(transformType);
    const result = await transformer.transformData(tokenSystemData, options);
    
    console.log('[DataTransformationService] Platform data transformation completed');
    return result as T;
  }

  /**
   * Transform theme override data for visualizations
   */
  public async transformThemeData<T>(
    themeData: ThemeOverrides,
    transformType: VisualizationType,
    options?: TransformOptions
  ): Promise<T> {
    console.log('[DataTransformationService] Transforming theme data:', {
      transformType,
      themeId: themeData.id,
      hasOverrides: !!themeData.overrides
    });

    // Convert theme overrides to TokenSystem format for processing
    // Note: This is a simplified conversion - in practice, themes would need
    // to be applied on top of core data to get meaningful dependency analysis
    const tokenSystemData: TokenSystem = {
      systemName: themeData.name,
      systemId: themeData.id,
      version: '1.0.0',
      versionHistory: [],
      tokens: Object.values(themeData.overrides || {}),
      resolvedValueTypes: [],
      tokenCollections: [],
      dimensions: [],
      platforms: [],
      taxonomies: [],
      themes: []
    };

    const transformer = this.getTransformer(transformType);
    const result = await transformer.transformData(tokenSystemData, options);
    
    console.log('[DataTransformationService] Theme data transformation completed');
    return result as T;
  }

  /**
   * Register a new transformer for a specific visualization type
   */
  public registerTransformer(
    type: VisualizationType,
    transformer: DataTransformer
  ): void {
    console.log(`[DataTransformationService] Registering transformer for type: ${type}`);
    this.transformers.set(type, transformer);
  }

  /**
   * Get transformer for a specific visualization type
   */
  private getTransformer(type: VisualizationType): DataTransformer {
    const transformer = this.transformers.get(type);
    if (!transformer) {
      throw new Error(`No transformer registered for visualization type: ${type}`);
    }
    return transformer;
  }

  /**
   * Initialize default transformers
   */
  private initializeDefaultTransformers(): void {
    console.log('[DataTransformationService] Initializing default transformers');
    
    // Register the token dependency transformer for network visualizations
    this.registerTransformer('network', new TokenDependencyTransformer());
    
    // Register the chord diagram transformer for mode/platform analysis
    this.registerTransformer('chord', new ChordDataTransformer());
    
    // Future transformers would be registered here:
    // this.registerTransformer('hierarchical', new HierarchicalTransformer());
    // this.registerTransformer('sankey', new SankeyTransformer());
    // etc.
  }

  /**
   * Get list of available visualization types
   */
  public getAvailableTypes(): VisualizationType[] {
    return Array.from(this.transformers.keys());
  }

  /**
   * Check if a transformer is available for a given type
   */
  public isTypeSupported(type: VisualizationType): boolean {
    return this.transformers.has(type);
  }

  /**
   * Clear all registered transformers (useful for testing)
   */
  public clearTransformers(): void {
    this.transformers.clear();
  }

  /**
   * Get transformer statistics
   */
  public getTransformerStats(): Record<string, unknown> {
    return {
      registeredTypes: Array.from(this.transformers.keys()),
      totalTransformers: this.transformers.size
    };
  }
}
