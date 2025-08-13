import { dataFlowController } from './dataFlowController';
import { unifiedChangeTrackingService } from './unifiedChangeTrackingService';
import { unifiedStorageService } from './unifiedStorageService';
import { dataValidationService } from './dataValidationService';
import { DataManager } from './dataManager';
import { DataSourceManager } from './dataSourceManager';
import { StorageService } from './storage';
import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrideFile,
  DataSnapshot,
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
import type { DataFlowEvent } from './dataFlowController';
import type { ChangeTrackingEvent } from './unifiedChangeTrackingService';

// Feature flag for gradual rollout
const UNIFIED_UI_INTEGRATION_ENABLED = process.env.REACT_APP_UNIFIED_UI_INTEGRATION_ENABLED === 'true' || false;

// UI component types
export type UIComponentType = 
  | 'TokenEditor'
  | 'TokenView'
  | 'CollectionView'
  | 'DimensionView'
  | 'PlatformView'
  | 'ThemeView'
  | 'TaxonomyView'
  | 'ComponentView'
  | 'AnalysisView'
  | 'DashboardView'
  | 'FigmaConfigView';

// Data access patterns
export type DataAccessPattern = 
  | 'read-only'
  | 'editable'
  | 'create'
  | 'delete'
  | 'merge'
  | 'validate';

// UI update types
export type UIUpdateType = 
  | 'data-changed'
  | 'validation-failed'
  | 'operation-completed'
  | 'error-occurred'
  | 'loading-started'
  | 'loading-completed';

// UI integration options
export interface UIIntegrationOptions {
  enableReactiveUpdates?: boolean;
  enableOptimisticUpdates?: boolean;
  enableValidation?: boolean;
  enableErrorHandling?: boolean;
  enableLoadingStates?: boolean;
  cacheTimeout?: number; // milliseconds
  maxRetries?: number;
}

// Default UI integration options
const DEFAULT_UI_INTEGRATION_OPTIONS: UIIntegrationOptions = {
  enableReactiveUpdates: true,
  enableOptimisticUpdates: true,
  enableValidation: true,
  enableErrorHandling: true,
  enableLoadingStates: true,
  cacheTimeout: 30000, // 30 seconds
  maxRetries: 3
};

// UI update event interface
export interface UIUpdateEvent {
  type: UIUpdateType;
  componentType: UIComponentType;
  data?: unknown;
  error?: string;
  loading?: boolean;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// Cached data entry interface
export interface CachedDataEntry {
  data: unknown;
  timestamp: string;
  componentType: UIComponentType;
  pattern: DataAccessPattern;
}

// Error types for UI integration
export class UIIntegrationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly componentType: UIComponentType,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'UIIntegrationError';
  }
}

/**
 * Unified UI Integration Service - Single data access pattern for all components
 * 
 * This service provides:
 * - Single data access pattern for all components
 * - Reactive updates based on unified state
 * - Consistent error handling and user feedback
 * - Performance optimization for UI updates
 * - Maintain existing UI/UX
 */
export class UnifiedUIIntegrationService {
  private static instance: UnifiedUIIntegrationService;
  private eventListeners: Array<(event: UIUpdateEvent) => void> = [];
  private dataCache: Map<string, CachedDataEntry> = new Map();
  private loadingStates: Map<UIComponentType, boolean> = new Map();
  private options: UIIntegrationOptions;
  private dataFlowListener: ((event: DataFlowEvent) => void) | null = null;
  private changeTrackingListener: ((event: ChangeTrackingEvent) => void) | null = null;

  private constructor() {
    this.options = { ...DEFAULT_UI_INTEGRATION_OPTIONS };
    console.log('[UnifiedUIIntegrationService] Initializing with feature flag:', UNIFIED_UI_INTEGRATION_ENABLED);
    this.setupEventListeners();
    this.startCacheCleanup();
  }

  static getInstance(): UnifiedUIIntegrationService {
    if (!UnifiedUIIntegrationService.instance) {
      UnifiedUIIntegrationService.instance = new UnifiedUIIntegrationService();
    }
    return UnifiedUIIntegrationService.instance;
  }

  /**
   * Check if unified UI integration is enabled
   */
  static isEnabled(): boolean {
    return UNIFIED_UI_INTEGRATION_ENABLED;
  }

  /**
   * Configure UI integration options
   */
  configure(options: Partial<UIIntegrationOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('[UnifiedUIIntegrationService] Configuration updated:', this.options);
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: UIUpdateEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: UIUpdateEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: UIUpdateEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[UnifiedUIIntegrationService] Error in event listener:', error);
      }
    });
  }

  /**
   * Setup event listeners for data flow and change tracking
   */
  private setupEventListeners(): void {
    if (!this.options.enableReactiveUpdates) {
      return;
    }

    // Listen to data flow events
    this.dataFlowListener = (event: DataFlowEvent) => {
      this.handleDataFlowEvent(event);
    };
    dataFlowController.addEventListener(this.dataFlowListener);

    // Listen to change tracking events
    this.changeTrackingListener = (event: ChangeTrackingEvent) => {
      this.handleChangeTrackingEvent(event);
    };
    unifiedChangeTrackingService.addEventListener(this.changeTrackingListener);
  }

  /**
   * Handle data flow events
   */
  private handleDataFlowEvent(event: DataFlowEvent): void {
    const uiEvent: UIUpdateEvent = {
      type: this.mapDataFlowEventToUIUpdate(event),
      componentType: 'TokenView', // Default, will be overridden by specific components
      data: event.data,
      error: event.error,
      loading: event.state.status === 'processing',
      timestamp: new Date().toISOString()
    };

    this.emitEvent(uiEvent);
  }

  /**
   * Handle change tracking events
   */
  private handleChangeTrackingEvent(event: ChangeTrackingEvent): void {
    const uiEvent: UIUpdateEvent = {
      type: this.mapChangeTrackingEventToUIUpdate(event),
      componentType: 'TokenView', // Default, will be overridden by specific components
      data: event.change,
      error: event.error,
      timestamp: new Date().toISOString()
    };

    this.emitEvent(uiEvent);
  }

  /**
   * Map data flow event to UI update type
   */
  private mapDataFlowEventToUIUpdate(event: DataFlowEvent): UIUpdateType {
    switch (event.type) {
      case 'operation-start':
        return 'loading-started';
      case 'operation-complete':
        return 'operation-completed';
      case 'error':
        return 'error-occurred';
      case 'state-change':
        return event.state.status === 'processing' ? 'loading-started' : 'data-changed';
      default:
        return 'data-changed';
    }
  }

  /**
   * Map change tracking event to UI update type
   */
  private mapChangeTrackingEventToUIUpdate(event: ChangeTrackingEvent): UIUpdateType {
    switch (event.type) {
      case 'change-applied':
        return 'data-changed';
      case 'change-committed':
        return 'operation-completed';
      case 'change-rolled-back':
        return 'data-changed';
      case 'validation-failed':
        return 'validation-failed';
      default:
        return 'data-changed';
    }
  }

  /**
   * Get data for UI component
   */
  async getDataForComponent(
    componentType: UIComponentType,
    pattern: DataAccessPattern,
    options?: {
      forceRefresh?: boolean;
      cacheKey?: string;
      filters?: Record<string, unknown>;
    }
  ): Promise<unknown> {
    const cacheKey = options?.cacheKey || `${componentType}_${pattern}`;
    
    console.log('[UnifiedUIIntegrationService] Getting data for component:', {
      componentType,
      pattern,
      cacheKey,
      forceRefresh: options?.forceRefresh
    });

    // Set loading state
    if (this.options.enableLoadingStates) {
      this.setLoadingState(componentType, true);
    }

    try {
      // Check cache first
      if (!options?.forceRefresh && this.isCacheValid(cacheKey)) {
        const cachedData = this.dataCache.get(cacheKey);
        if (cachedData) {
          console.log('[UnifiedUIIntegrationService] Returning cached data for:', cacheKey);
          this.setLoadingState(componentType, false);
          return cachedData.data;
        }
      }

      // Get data based on component type and pattern
      const data = await this.fetchDataForComponent(componentType, pattern, options?.filters);

      // Cache the data
      this.cacheData(cacheKey, data, componentType, pattern);

      // Emit success event
      this.emitEvent({
        type: 'data-changed',
        componentType,
        data,
        timestamp: new Date().toISOString()
      });

      this.setLoadingState(componentType, false);
      return data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Emit error event
      this.emitEvent({
        type: 'error-occurred',
        componentType,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      this.setLoadingState(componentType, false);
      throw new UIIntegrationError(
        `Failed to get data for component ${componentType}: ${errorMessage}`,
        'DATA_FETCH_FAILED',
        componentType,
        { pattern, originalError: error }
      );
    }
  }

  /**
   * Fetch data for specific component type and pattern
   */
  private async fetchDataForComponent(
    componentType: UIComponentType,
    pattern: DataAccessPattern,
    filters?: Record<string, unknown>
  ): Promise<unknown> {
    switch (componentType) {
      case 'TokenView':
      case 'TokenEditor':
        return this.fetchTokenData(pattern, filters);
      
      case 'CollectionView':
        return this.fetchCollectionData(pattern, filters);
      
      case 'DimensionView':
        return this.fetchDimensionData(pattern, filters);
      
      case 'PlatformView':
        return this.fetchPlatformData(pattern, filters);
      
      case 'ThemeView':
        return this.fetchThemeData(pattern, filters);
      
      case 'TaxonomyView':
        return this.fetchTaxonomyData(pattern, filters);
      
      case 'ComponentView':
        return this.fetchComponentData(pattern, filters);
      
      case 'AnalysisView':
        return this.fetchAnalysisData(pattern, filters);
      
      case 'DashboardView':
        return this.fetchDashboardData(pattern, filters);
      
      case 'FigmaConfigView':
        return this.fetchFigmaConfigData(pattern, filters);
      
      default:
        throw new UIIntegrationError(
          `Unknown component type: ${componentType}`,
          'UNKNOWN_COMPONENT_TYPE',
          componentType
        );
    }
  }

  /**
   * Fetch token data
   */
  private async fetchTokenData(pattern: DataAccessPattern, filters?: Record<string, unknown>): Promise<unknown> {
    if (pattern === 'read-only') {
      const dataManager = DataManager.getInstance();
      const snapshot = dataManager.loadFromStorage();
      return filters ? this.filterTokens(snapshot.tokens, filters) : snapshot.tokens;
    }
    
    if (pattern === 'editable') {
      const localEdits = StorageService.getLocalEdits();
      if (localEdits && 'tokens' in localEdits) {
        return filters ? this.filterTokens(localEdits.tokens, filters) : localEdits.tokens;
      }
      return this.fetchTokenData('read-only', filters);
    }

    // For other patterns, use data flow controller
    return dataFlowController.executeOperation('load');
  }

  /**
   * Fetch collection data
   */
  private async fetchCollectionData(pattern: DataAccessPattern, filters?: Record<string, unknown>): Promise<unknown> {
    const dataManager = DataManager.getInstance();
    const snapshot = dataManager.loadFromStorage();
    return filters ? this.filterCollections(snapshot.collections, filters) : snapshot.collections;
  }

  /**
   * Fetch dimension data
   */
  private async fetchDimensionData(pattern: DataAccessPattern, filters?: Record<string, unknown>): Promise<unknown> {
    const dataManager = DataManager.getInstance();
    const snapshot = dataManager.loadFromStorage();
    return filters ? this.filterDimensions(snapshot.dimensions, filters) : snapshot.dimensions;
  }

  /**
   * Fetch platform data
   */
  private async fetchPlatformData(pattern: DataAccessPattern, filters?: Record<string, unknown>): Promise<unknown> {
    const dataManager = DataManager.getInstance();
    const snapshot = dataManager.loadFromStorage();
    return filters ? this.filterPlatforms(snapshot.platforms, filters) : snapshot.platforms;
  }

  /**
   * Fetch theme data
   */
  private async fetchThemeData(pattern: DataAccessPattern, filters?: Record<string, unknown>): Promise<unknown> {
    const dataManager = DataManager.getInstance();
    const snapshot = dataManager.loadFromStorage();
    return filters ? this.filterThemes(snapshot.themes, filters) : snapshot.themes;
  }

  /**
   * Fetch taxonomy data
   */
  private async fetchTaxonomyData(pattern: DataAccessPattern, filters?: Record<string, unknown>): Promise<unknown> {
    const dataManager = DataManager.getInstance();
    const snapshot = dataManager.loadFromStorage();
    return filters ? this.filterTaxonomies(snapshot.taxonomies, filters) : snapshot.taxonomies;
  }

  /**
   * Fetch component data
   */
  private async fetchComponentData(pattern: DataAccessPattern, filters?: Record<string, unknown>): Promise<unknown> {
    const dataManager = DataManager.getInstance();
    const snapshot = dataManager.loadFromStorage();
    return filters ? this.filterComponents(snapshot.components, filters) : snapshot.components;
  }

  /**
   * Fetch analysis data
   */
  private async fetchAnalysisData(pattern: DataAccessPattern, filters?: Record<string, unknown>): Promise<unknown> {
    // Analysis data is typically computed from other data sources
    const dataManager = DataManager.getInstance();
    const snapshot = dataManager.loadFromStorage();
    return {
      tokens: snapshot.tokens,
      collections: snapshot.collections,
      dimensions: snapshot.dimensions,
      platforms: snapshot.platforms,
      themes: snapshot.themes,
      // Add computed statistics here
      statistics: this.computeAnalysisStatistics(snapshot)
    };
  }

  /**
   * Fetch dashboard data
   */
  private async fetchDashboardData(pattern: DataAccessPattern, filters?: Record<string, unknown>): Promise<unknown> {
    const dataManager = DataManager.getInstance();
    const snapshot = dataManager.loadFromStorage();
    return {
      tokens: snapshot.tokens,
      collections: snapshot.collections,
      dimensions: snapshot.dimensions,
      platforms: snapshot.platforms,
      themes: snapshot.themes,
      statistics: this.computeDashboardStatistics(snapshot)
    };
  }

  /**
   * Fetch Figma config data
   */
  private async fetchFigmaConfigData(pattern: DataAccessPattern, filters?: Record<string, unknown>): Promise<unknown> {
    const dataManager = DataManager.getInstance();
    const snapshot = dataManager.loadFromStorage();
    return snapshot.figmaConfiguration || {};
  }

  /**
   * Update data for UI component
   */
  async updateDataForComponent(
    componentType: UIComponentType,
    pattern: DataAccessPattern,
    data: unknown,
    options?: {
      validate?: boolean;
      optimistic?: boolean;
      cacheKey?: string;
    }
  ): Promise<void> {
    const cacheKey = options?.cacheKey || `${componentType}_${pattern}`;
    
    console.log('[UnifiedUIIntegrationService] Updating data for component:', {
      componentType,
      pattern,
      cacheKey,
      optimistic: options?.optimistic
    });

    try {
      // Validate data if enabled
      if (options?.validate !== false && this.options.enableValidation) {
        await this.validateData(data, componentType);
      }

      // Apply optimistic update if enabled
      if (options?.optimistic !== false && this.options.enableOptimisticUpdates) {
        this.cacheData(cacheKey, data, componentType, pattern);
        
        this.emitEvent({
          type: 'data-changed',
          componentType,
          data,
          timestamp: new Date().toISOString()
        });
      }

      // Track change if change tracking is enabled
      if (unifiedChangeTrackingService.isEnabled()) {
        unifiedChangeTrackingService.trackChange(
          'update',
          this.mapComponentTypeToDataType(componentType),
          this.generateEntityId(data),
          data
        );
      }

      // Emit success event
      this.emitEvent({
        type: 'operation-completed',
        componentType,
        data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Emit error event
      this.emitEvent({
        type: 'error-occurred',
        componentType,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      throw new UIIntegrationError(
        `Failed to update data for component ${componentType}: ${errorMessage}`,
        'DATA_UPDATE_FAILED',
        componentType,
        { pattern, originalError: error }
      );
    }
  }

  /**
   * Validate data for component
   */
  private async validateData(data: unknown, componentType: UIComponentType): Promise<void> {
    const dataType = this.mapComponentTypeToDataType(componentType);
    
    switch (dataType) {
      case 'TokenSystem':
        const tokenSystemValidation = dataValidationService.validateTokenSystem(data as TokenSystem);
        if (!tokenSystemValidation.isValid) {
          throw new Error(`TokenSystem validation failed: ${tokenSystemValidation.errors.join(', ')}`);
        }
        break;
      
      case 'PlatformExtension':
        const platformValidation = dataValidationService.validatePlatformExtension(data as PlatformExtension);
        if (!platformValidation.isValid) {
          throw new Error(`PlatformExtension validation failed: ${platformValidation.errors.join(', ')}`);
        }
        break;
      
      case 'ThemeOverrideFile':
        const themeValidation = dataValidationService.validateThemeOverrideFile(data as ThemeOverrideFile);
        if (!themeValidation.isValid) {
          throw new Error(`ThemeOverrideFile validation failed: ${themeValidation.errors.join(', ')}`);
        }
        break;
    }
  }

  /**
   * Map component type to data type
   */
  private mapComponentTypeToDataType(componentType: UIComponentType): 'TokenSystem' | 'PlatformExtension' | 'ThemeOverrideFile' | 'Token' | 'TokenCollection' | 'Dimension' | 'Platform' | 'Theme' | 'Taxonomy' | 'ResolvedValueType' | 'ComponentProperty' | 'ComponentCategory' | 'Component' {
    switch (componentType) {
      case 'TokenView':
      case 'TokenEditor':
        return 'Token';
      case 'CollectionView':
        return 'TokenCollection';
      case 'DimensionView':
        return 'Dimension';
      case 'PlatformView':
        return 'Platform';
      case 'ThemeView':
        return 'Theme';
      case 'TaxonomyView':
        return 'Taxonomy';
      case 'ComponentView':
        return 'Component';
      default:
        return 'TokenSystem';
    }
  }

  /**
   * Generate entity ID from data
   */
  private generateEntityId(data: unknown): string {
    if (data && typeof data === 'object' && 'id' in data) {
      return String(data.id);
    }
    return `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set loading state for component
   */
  private setLoadingState(componentType: UIComponentType, loading: boolean): void {
    this.loadingStates.set(componentType, loading);
    
    this.emitEvent({
      type: loading ? 'loading-started' : 'loading-completed',
      componentType,
      loading,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get loading state for component
   */
  getLoadingState(componentType: UIComponentType): boolean {
    return this.loadingStates.get(componentType) || false;
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const cachedEntry = this.dataCache.get(cacheKey);
    if (!cachedEntry) {
      return false;
    }

    const now = Date.now();
    const cacheTime = new Date(cachedEntry.timestamp).getTime();
    return (now - cacheTime) < this.options.cacheTimeout!;
  }

  /**
   * Cache data
   */
  private cacheData(cacheKey: string, data: unknown, componentType: UIComponentType, pattern: DataAccessPattern): void {
    this.dataCache.set(cacheKey, {
      data,
      timestamp: new Date().toISOString(),
      componentType,
      pattern
    });
  }

  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupCache();
    }, this.options.cacheTimeout!);
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.dataCache.forEach((entry, key) => {
      const cacheTime = new Date(entry.timestamp).getTime();
      if ((now - cacheTime) > this.options.cacheTimeout!) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.dataCache.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(`[UnifiedUIIntegrationService] Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Filter tokens
   */
  private filterTokens(tokens: Token[], filters: Record<string, unknown>): Token[] {
    return tokens.filter(token => {
      return Object.entries(filters).every(([key, value]) => {
        return token[key as keyof Token] === value;
      });
    });
  }

  /**
   * Filter collections
   */
  private filterCollections(collections: TokenCollection[], filters: Record<string, unknown>): TokenCollection[] {
    return collections.filter(collection => {
      return Object.entries(filters).every(([key, value]) => {
        return collection[key as keyof TokenCollection] === value;
      });
    });
  }

  /**
   * Filter dimensions
   */
  private filterDimensions(dimensions: Dimension[], filters: Record<string, unknown>): Dimension[] {
    return dimensions.filter(dimension => {
      return Object.entries(filters).every(([key, value]) => {
        return dimension[key as keyof Dimension] === value;
      });
    });
  }

  /**
   * Filter platforms
   */
  private filterPlatforms(platforms: Platform[], filters: Record<string, unknown>): Platform[] {
    return platforms.filter(platform => {
      return Object.entries(filters).every(([key, value]) => {
        return platform[key as keyof Platform] === value;
      });
    });
  }

  /**
   * Filter themes
   */
  private filterThemes(themes: Theme[], filters: Record<string, unknown>): Theme[] {
    return themes.filter(theme => {
      return Object.entries(filters).every(([key, value]) => {
        return theme[key as keyof Theme] === value;
      });
    });
  }

  /**
   * Filter taxonomies
   */
  private filterTaxonomies(taxonomies: Taxonomy[], filters: Record<string, unknown>): Taxonomy[] {
    return taxonomies.filter(taxonomy => {
      return Object.entries(filters).every(([key, value]) => {
        return taxonomy[key as keyof Taxonomy] === value;
      });
    });
  }

  /**
   * Filter components
   */
  private filterComponents(components: Component[], filters: Record<string, unknown>): Component[] {
    return components.filter(component => {
      return Object.entries(filters).every(([key, value]) => {
        return component[key as keyof Component] === value;
      });
    });
  }

  /**
   * Compute analysis statistics
   */
  private computeAnalysisStatistics(snapshot: DataSnapshot): Record<string, unknown> {
    return {
      totalTokens: snapshot.tokens.length,
      totalCollections: snapshot.collections.length,
      totalDimensions: snapshot.dimensions.length,
      totalPlatforms: snapshot.platforms.length,
      totalThemes: snapshot.themes.length,
      totalTaxonomies: snapshot.taxonomies.length,
      totalComponents: snapshot.components.length
    };
  }

  /**
   * Compute dashboard statistics
   */
  private computeDashboardStatistics(snapshot: DataSnapshot): Record<string, unknown> {
    return {
      totalTokens: snapshot.tokens.length,
      totalCollections: snapshot.collections.length,
      totalDimensions: snapshot.dimensions.length,
      totalPlatforms: snapshot.platforms.length,
      totalThemes: snapshot.themes.length,
      totalTaxonomies: snapshot.taxonomies.length,
      totalComponents: snapshot.components.length,
      // Add more computed statistics as needed
    };
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    cacheSize: number;
    loadingComponents: number;
    eventListeners: number;
    options: UIIntegrationOptions;
  } {
    const loadingComponents = Array.from(this.loadingStates.values()).filter(Boolean).length;
    
    return {
      cacheSize: this.dataCache.size,
      loadingComponents,
      eventListeners: this.eventListeners.length,
      options: this.options
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.dataCache.clear();
    console.log('[UnifiedUIIntegrationService] Cache cleared');
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.clearCache();
    this.loadingStates.clear();
    console.log('[UnifiedUIIntegrationService] Service state reset');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.dataFlowListener) {
      dataFlowController.removeEventListener(this.dataFlowListener);
    }
    if (this.changeTrackingListener) {
      unifiedChangeTrackingService.removeEventListener(this.changeTrackingListener);
    }
    this.eventListeners = [];
    this.clearCache();
    console.log('[UnifiedUIIntegrationService] Cleanup completed');
  }
}

// Export singleton instance
export const unifiedUIIntegrationService = UnifiedUIIntegrationService.getInstance();
