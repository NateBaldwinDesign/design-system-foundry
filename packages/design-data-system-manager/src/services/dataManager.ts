import { StorageService } from './storage';
import { ChangeTrackingService } from './changeTrackingService';
import type { 
  TokenCollection, 
  Mode, 
  Token, 
  Dimension, 
  Platform, 
  Taxonomy, 
  Theme, 
  ResolvedValueType 
} from '@token-model/data-model';
import type { Algorithm } from '../types/algorithm';
import type { ExtendedToken } from '../components/TokenEditorDialog';

export interface DataSnapshot {
  collections: TokenCollection[];
  modes: Mode[];
  dimensions: Dimension[];
  resolvedValueTypes: ResolvedValueType[];
  platforms: Platform[];
  themes: Theme[];
  tokens: ExtendedToken[];
  taxonomies: Taxonomy[];
  algorithms: Algorithm[];
  namingRules: { taxonomyOrder: string[] };
  dimensionOrder: string[];
  algorithmFile: Record<string, unknown> | null;
  // MultiRepositoryManager data
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
}

export interface DataManagerCallbacks {
  onDataLoaded?: (data: DataSnapshot) => void;
  onDataChanged?: (data: DataSnapshot) => void;
  onBaselineUpdated?: (data: DataSnapshot) => void;
}

export class DataManager {
  private static instance: DataManager;
  private callbacks: DataManagerCallbacks = {};
  private isInitialized = false;

  private constructor() {}

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  /**
   * Set callbacks without reinitializing
   */
  setCallbacks(callbacks: DataManagerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Initialize the data manager and load initial data
   */
  async initialize(callbacks: DataManagerCallbacks = {}): Promise<DataSnapshot> {
    this.callbacks = callbacks;
    
    if (this.isInitialized) {
      return this.getCurrentSnapshot();
    }

    console.log('[DataManager] Initializing...');
    
    // Load data from storage
    const snapshot = this.loadFromStorage();
    
    // Set baseline for change tracking
    this.setBaseline(snapshot);
    
    this.isInitialized = true;
    
    // Notify that data has been loaded
    this.callbacks.onDataLoaded?.(snapshot);
    
    console.log('[DataManager] Initialized with data:', {
      tokens: snapshot.tokens.length,
      collections: snapshot.collections.length,
      dimensions: snapshot.dimensions.length
    });
    
    return snapshot;
  }

  /**
   * Load data from GitHub and update storage and state
   */
  async loadFromGitHub(fileContent: Record<string, unknown>, fileType: 'schema' | 'theme-override'): Promise<DataSnapshot> {
    console.log('[DataManager] Loading data from GitHub:', { fileType, fileContent });
    
    try {
      let snapshot: DataSnapshot;
      
      if (fileType === 'schema') {
        snapshot = this.processSchemaData(fileContent);
      } else if (fileType === 'theme-override') {
        snapshot = this.processThemeOverrideData(fileContent);
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
      
      console.log('[DataManager] Processed snapshot:', {
        tokens: snapshot.tokens.length,
        collections: snapshot.collections.length,
        dimensions: snapshot.dimensions.length,
        modes: snapshot.modes.length,
        platforms: snapshot.platforms.length,
        themes: snapshot.themes.length
      });
      
      // Store in localStorage
      this.storeSnapshot(snapshot);
      console.log('[DataManager] Stored snapshot in localStorage');
      
      // Set new baseline for change tracking - this establishes the new "original" state
      this.setBaseline(snapshot);
      console.log('[DataManager] Set new baseline for change tracking');
      
      // Notify that data has been loaded with new baseline
      this.callbacks.onDataLoaded?.(snapshot);
      this.callbacks.onBaselineUpdated?.(snapshot);
      
      console.log('[DataManager] Successfully loaded GitHub data:', {
        tokens: snapshot.tokens.length,
        collections: snapshot.collections.length,
        dimensions: snapshot.dimensions.length
      });
      
      return snapshot;
    } catch (error) {
      console.error('[DataManager] Error loading GitHub data:', error);
      throw error;
    }
  }

  /**
   * Load data from example source and update storage and state
   */
  async loadFromExampleSource(dataSourceKey: string, exampleData: Record<string, unknown>, algorithmData?: Record<string, unknown>): Promise<DataSnapshot> {
    console.log('[DataManager] Loading data from example source:', dataSourceKey);
    
    try {
      const snapshot = this.processExampleData(dataSourceKey, exampleData, algorithmData);
      
      // Store in localStorage
      this.storeSnapshot(snapshot);
      
      // Set new baseline for change tracking - this establishes the new "original" state
      this.setBaseline(snapshot);
      
      // Notify that data has been loaded with new baseline
      this.callbacks.onDataLoaded?.(snapshot);
      this.callbacks.onBaselineUpdated?.(snapshot);
      
      console.log('[DataManager] Successfully loaded example data:', {
        tokens: snapshot.tokens.length,
        collections: snapshot.collections.length,
        dimensions: snapshot.dimensions.length
      });
      
      return snapshot;
    } catch (error) {
      console.error('[DataManager] Error loading example data:', error);
      throw error;
    }
  }

  /**
   * Update specific data and notify listeners
   */
  updateData(updates: Partial<DataSnapshot>): DataSnapshot {
    const currentSnapshot = this.getCurrentSnapshot();
    const updatedSnapshot = { ...currentSnapshot, ...updates };
    
    // Store updated data
    this.storeSnapshot(updatedSnapshot);
    
    // Notify that data has changed
    this.callbacks.onDataChanged?.(updatedSnapshot);
    
    return updatedSnapshot;
  }

  /**
   * Get current data snapshot from storage
   */
  getCurrentSnapshot(): DataSnapshot {
    return this.loadFromStorage();
  }

  /**
   * Check if there's existing data in storage
   */
  hasExistingData(): boolean {
    const tokens = StorageService.getTokens();
    const collections = StorageService.getCollections();
    const dimensions = StorageService.getDimensions();
    
    return tokens.length > 0 || collections.length > 0 || dimensions.length > 0;
  }

  /**
   * Clear all data and reset to empty state
   */
  clearAllData(): DataSnapshot {
    console.log('[DataManager] Clearing all data');
    
    // Clear localStorage
    StorageService.clearAll();
    
    // Create empty snapshot
    const emptySnapshot: DataSnapshot = {
      collections: [],
      modes: [],
      dimensions: [],
      resolvedValueTypes: [],
      platforms: [],
      themes: [],
      tokens: [],
      taxonomies: [],
      algorithms: [],
      namingRules: { taxonomyOrder: [] },
      dimensionOrder: [],
      algorithmFile: null,
      // Clear MultiRepositoryManager data
      linkedRepositories: [],
      platformExtensions: {},
      themeOverrides: null,
    };
    
    // Set new baseline
    this.setBaseline(emptySnapshot);
    
    // Notify listeners
    this.callbacks.onDataLoaded?.(emptySnapshot);
    this.callbacks.onDataChanged?.(emptySnapshot);
    
    return emptySnapshot;
  }

  /**
   * Reset baseline to current data (used after GitHub save operations)
   */
  resetBaselineToCurrent(): void {
    console.log('[DataManager] Resetting baseline to current data');
    
    const currentSnapshot = this.getCurrentSnapshot();
    
    // Set new baseline to current data
    this.setBaseline(currentSnapshot);
    
    // Notify that baseline has been updated
    this.callbacks.onBaselineUpdated?.(currentSnapshot);
  }

  /**
   * Load data from localStorage
   */
  private loadFromStorage(): DataSnapshot {
    return {
      collections: StorageService.getCollections(),
      modes: StorageService.getModes(),
      dimensions: StorageService.getDimensions(),
      resolvedValueTypes: StorageService.getValueTypes(),
      platforms: StorageService.getPlatforms(),
      themes: StorageService.getThemes(),
      tokens: StorageService.getTokens(),
      taxonomies: StorageService.getTaxonomies(),
      algorithms: StorageService.getAlgorithms(),
      namingRules: StorageService.getNamingRules(),
      dimensionOrder: StorageService.getDimensionOrder(),
      algorithmFile: StorageService.getAlgorithmFile(),
      // MultiRepositoryManager data
      linkedRepositories: StorageService.getLinkedRepositories(),
      platformExtensions: StorageService.getPlatformExtensions(),
      themeOverrides: StorageService.getThemeOverrides(),
    };
  }

  /**
   * Store snapshot in localStorage
   */
  private storeSnapshot(snapshot: DataSnapshot): void {
    StorageService.setCollections(snapshot.collections);
    StorageService.setModes(snapshot.modes);
    StorageService.setDimensions(snapshot.dimensions);
    StorageService.setValueTypes(snapshot.resolvedValueTypes);
    StorageService.setTokens(snapshot.tokens);
    StorageService.setPlatforms(snapshot.platforms);
    StorageService.setThemes(snapshot.themes);
    StorageService.setTaxonomies(snapshot.taxonomies);
    StorageService.setAlgorithms(snapshot.algorithms);
    StorageService.setNamingRules(snapshot.namingRules);
    StorageService.setDimensionOrder(snapshot.dimensionOrder);
    
    if (snapshot.algorithmFile) {
      StorageService.setAlgorithmFile(snapshot.algorithmFile);
    }

    // Store MultiRepositoryManager data
    StorageService.setLinkedRepositories(snapshot.linkedRepositories);
    StorageService.setPlatformExtensions(snapshot.platformExtensions);
    StorageService.setThemeOverrides(snapshot.themeOverrides);
  }

  /**
   * Set baseline for change tracking
   */
  private setBaseline(snapshot: DataSnapshot): void {
    const baselineData = {
      collections: snapshot.collections,
      modes: snapshot.modes,
      dimensions: snapshot.dimensions,
      resolvedValueTypes: snapshot.resolvedValueTypes,
      platforms: snapshot.platforms,
      themes: snapshot.themes,
      tokens: snapshot.tokens,
      taxonomies: snapshot.taxonomies,
      algorithms: snapshot.algorithms,
      namingRules: snapshot.namingRules,
      // Include MultiRepositoryManager data in baseline
      linkedRepositories: snapshot.linkedRepositories,
      platformExtensions: snapshot.platformExtensions,
      themeOverrides: snapshot.themeOverrides,
    };
    
    ChangeTrackingService.setBaselineData(baselineData);
    this.callbacks.onBaselineUpdated?.(snapshot);
  }

  /**
   * Process schema data from GitHub
   */
  private processSchemaData(fileContent: Record<string, unknown>): DataSnapshot {
    const normalizedCollections = (fileContent.tokenCollections as TokenCollection[]) ?? [];
    const normalizedDimensions = (fileContent.dimensions as Dimension[]) ?? [];
    const normalizedTokens = ((fileContent.tokens as Token[]) ?? []).map((token: Token) => ({
      ...token,
      valuesByMode: token.valuesByMode
    }));
    const normalizedPlatforms = (fileContent.platforms as Platform[]) ?? [];
    const normalizedThemes = ((fileContent.themes as Theme[]) ?? []).map((theme: Theme) => ({
      id: theme.id,
      displayName: theme.displayName,
      isDefault: theme.isDefault ?? false,
      description: theme.description
    }));
    const normalizedTaxonomies = (fileContent.taxonomies as Taxonomy[]) ?? [];
    const normalizedResolvedValueTypes = (fileContent.resolvedValueTypes as ResolvedValueType[]) ?? [];
    const normalizedNamingRules = {
      taxonomyOrder: ((fileContent.namingRules as { taxonomyOrder?: string[] })?.taxonomyOrder) ?? []
    };

    const allModes: Mode[] = normalizedDimensions.flatMap((d: Dimension) => (d as { modes?: Mode[] }).modes || []);

    // Store root-level data
    const systemName = (fileContent.systemName as string) ?? 'Design System';
    const systemId = (fileContent.systemId as string) ?? 'design-system';
    const description = (fileContent.description as string) ?? 'A comprehensive design system with tokens, dimensions, and themes';
    const version = (fileContent.version as string) ?? '1.0.0';
    const versionHistory = (fileContent.versionHistory ?? []) as Array<{
      version: string;
      dimensions: string[];
      date: string;
      migrationStrategy?: {
        emptyModeIds: string;
        preserveOriginalValues: boolean;
      };
    }>;

    StorageService.setRootData({
      systemName,
      systemId,
      description,
      version,
      versionHistory
    });

    return {
      collections: normalizedCollections,
      modes: allModes,
      dimensions: normalizedDimensions,
      resolvedValueTypes: normalizedResolvedValueTypes,
      platforms: normalizedPlatforms,
      themes: normalizedThemes,
      tokens: normalizedTokens as ExtendedToken[],
      taxonomies: normalizedTaxonomies,
      algorithms: [],
      namingRules: normalizedNamingRules,
      dimensionOrder: normalizedDimensions.map(d => d.id),
      algorithmFile: null,
      // Clear MultiRepositoryManager data when loading from GitHub
      linkedRepositories: [],
      platformExtensions: {},
      themeOverrides: null,
    };
  }

  /**
   * Process theme override data from GitHub
   */
  private processThemeOverrideData(_fileContent: Record<string, unknown>): DataSnapshot {
    // TODO: Implement theme override processing
    console.log('[DataManager] Theme override processing not yet implemented');
    
    // For now, return current data
    return this.getCurrentSnapshot();
  }

  /**
   * Process example data
   */
  private processExampleData(dataSourceKey: string, coreData: Record<string, unknown>, algorithmData?: Record<string, unknown>): DataSnapshot {
    const d = coreData;

    const normalizedCollections = (d.tokenCollections as TokenCollection[]) ?? [];
    const normalizedDimensions = (d.dimensions as Dimension[]) ?? [];
    const normalizedTokens = ((d.tokens as Token[]) ?? []).map((token: Token) => ({
      ...token,
      valuesByMode: token.valuesByMode
    }));
    const normalizedPlatforms = (d.platforms as Platform[]) ?? [];
    const normalizedThemes = ((d.themes as Theme[]) ?? []).map((theme: Theme) => ({
      id: theme.id,
      displayName: theme.displayName,
      isDefault: theme.isDefault ?? false,
      description: theme.description
    }));
    const normalizedTaxonomies = (d.taxonomies as Taxonomy[]) ?? [];
    const normalizedResolvedValueTypes = (d.resolvedValueTypes as ResolvedValueType[]) ?? [];
    const normalizedNamingRules = {
      taxonomyOrder: ((d.namingRules as { taxonomyOrder?: string[] })?.taxonomyOrder) ?? []
    };

    const allModes: Mode[] = normalizedDimensions.flatMap((dimension: Dimension) => (dimension as { modes?: Mode[] }).modes || []);

    // Process algorithm data if available
    let loadedAlgorithms: Algorithm[] = [];
    let algorithmFile: Record<string, unknown> | null = null;
    
    if (algorithmData && algorithmData.default) {
      algorithmFile = algorithmData.default as Record<string, unknown>;
      loadedAlgorithms = ((algorithmData.default as Record<string, unknown>).algorithms || []) as Algorithm[];
    }

    // Store root-level data
    const systemName = (d.systemName as string) ?? 'Design System';
    const systemId = (d.systemId as string) ?? 'design-system';
    const description = (d.description as string) ?? 'A comprehensive design system with tokens, dimensions, and themes';
    const version = (d.version as string) ?? '1.0.0';
    const versionHistory = (d.versionHistory ?? []) as Array<{
      version: string;
      dimensions: string[];
      date: string;
      migrationStrategy?: {
        emptyModeIds: string;
        preserveOriginalValues: boolean;
      };
    }>;

    StorageService.setRootData({
      systemName,
      systemId,
      description,
      version,
      versionHistory
    });

    return {
      collections: normalizedCollections,
      modes: allModes,
      dimensions: normalizedDimensions,
      resolvedValueTypes: normalizedResolvedValueTypes,
      platforms: normalizedPlatforms,
      themes: normalizedThemes,
      tokens: normalizedTokens as ExtendedToken[],
      taxonomies: normalizedTaxonomies,
      algorithms: loadedAlgorithms,
      namingRules: normalizedNamingRules,
      dimensionOrder: normalizedDimensions.map(dimension => dimension.id),
      algorithmFile,
      // Clear MultiRepositoryManager data when loading from example source
      linkedRepositories: [],
      platformExtensions: {},
      themeOverrides: null,
    };
  }
} 