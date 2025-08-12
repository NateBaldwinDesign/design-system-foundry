import { StorageService } from './storage';
import { ChangeTrackingService } from './changeTrackingService';
import { GitHubApiService } from './githubApi';
import { GitHubAuthService } from './githubAuth';
import { PlatformExtensionDataService } from './platformExtensionDataService';
import { PlatformExtensionAnalyticsService } from './platformExtensionAnalyticsService';
import { ThemeOverrideDataService } from './themeOverrideDataService';
import { EnhancedDataMerger } from './enhancedDataMerger';
import { 
  SchemaValidationService,
  type ValidationResult 
} from '@token-model/data-model';
import type { 
  TokenCollection, 
  Mode, 
  Token, 
  Dimension, 
  Platform, 
  Taxonomy, 
  Theme, 
  ResolvedValueType,
  FigmaConfiguration,
  ComponentProperty,
  ComponentCategory,
  Component,
  TokenSystem,
  PlatformExtension,
  ThemeOverrideFile
} from '@token-model/data-model';
import type { Algorithm } from '../types/algorithm';
import type { ExtendedToken } from '../components/TokenEditorDialog';

export interface URLConfig {
  repo: string;           // "owner/repo"
  path?: string;          // "schema.json" (default)
  branch?: string;        // "main" (default)
}

export interface DataSnapshot {
  collections: TokenCollection[];
  modes: Mode[];
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
  figmaConfiguration: FigmaConfiguration | null;
}

export interface DataManagerCallbacks {
  onDataLoaded?: (data: DataSnapshot) => void;
  onDataChanged?: (data: DataSnapshot) => void;
  onBaselineUpdated?: (data: DataSnapshot) => void;
}

// Schema-aware storage interfaces
export interface StorageData {
  core: TokenSystem | null;
  platformExtensions: Record<string, PlatformExtension>;
  themeOverrides: Record<string, ThemeOverrideFile>;
}

export interface DataManagerState {
  // Presentation data (merged for UI)
  presentationData: DataSnapshot;
  
  // Storage data (schema-compliant for each source)
  storageData: StorageData;
  
  // Current data source context (will be integrated with DataSourceManager)
  currentSourceType: 'core' | 'platform-extension' | 'theme-override';
  currentSourceId?: string;
}

export class DataManager {
  private static instance: DataManager;
  private callbacks: DataManagerCallbacks = {};
  private isInitialized = false;
  private isPreloadingPlatformExtensions = false;
  private isPreloadingThemeOverrides = false;
  
  // Schema-aware storage state
  private state: DataManagerState = {
    presentationData: {
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
    },
    storageData: {
      core: null,
      platformExtensions: {},
      themeOverrides: {}
    },
    currentSourceType: 'core',
    currentSourceId: undefined
  };

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
   * Initialize the data manager and load data from storage
   */
  async initialize(callbacks: DataManagerCallbacks = {}): Promise<DataSnapshot> {
    this.callbacks = callbacks;
    
    if (this.isInitialized) {
      return this.getCurrentSnapshot();
    }

    console.log('[DataManager] Initializing...');
    
    // Load data from storage
    const snapshot = this.loadFromStorage();
    
    // Pre-load platform extension data if user is authenticated
    if (snapshot.platforms.length > 0) {
      await this.preloadPlatformExtensions(snapshot.platforms);
    }
    
    // Pre-load theme override data if themes have external sources
    if (snapshot.themes.length > 0) {
      await this.preloadThemeOverrides(snapshot.themes);
    }
    
    // Pre-load theme override data if themes have external sources
    if (snapshot.themes.length > 0) {
      await this.preloadThemeOverrides(snapshot.themes);
    }
    
    // Set baseline for change tracking
    this.setBaseline(snapshot);
    
    // Update presentation data to ensure merged data is available
    this.updatePresentationData();
    
    this.isInitialized = true;
    
    // Notify that data has been loaded
    this.callbacks.onDataLoaded?.(this.state.presentationData);
    
    console.log('[DataManager] Initialized with data:', {
      tokens: this.state.presentationData.tokens.length,
      collections: this.state.presentationData.collections.length,
      dimensions: this.state.presentationData.dimensions.length,
      platforms: this.state.presentationData.platforms.length
    });
    
    return this.state.presentationData;
  }

  /**
   * Load data from GitHub and update storage and state
   */
  async loadFromGitHub(fileContent: Record<string, unknown>, fileType: 'schema' | 'theme-override' | 'platform-extension'): Promise<DataSnapshot> {
    console.log('[DataManager] Loading GitHub data, file type:', fileType);
    
    try {
      let snapshot: DataSnapshot;
      
      if (fileType === 'schema') {
        snapshot = this.processSchemaData(fileContent);
      } else if (fileType === 'theme-override') {
        snapshot = this.processThemeOverrideData(fileContent);
      } else if (fileType === 'platform-extension') {
        // For platform extension files, treat them as schema files for now
        // This allows the "Select new repository" action to work properly
        console.log('[DataManager] Treating platform extension as schema file for repository selection');
        snapshot = this.processSchemaData(fileContent);
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
      
      // Pre-load platform extension data if user is authenticated
      if (snapshot.platforms.length > 0) {
        await this.preloadPlatformExtensions(snapshot.platforms);
      }
      
      // Store in localStorage
      this.storeSnapshot(snapshot);
      console.log('[DataManager] Stored snapshot in localStorage');
      
      // Set new baseline for change tracking - this establishes the new "original" state
      this.setBaseline(snapshot);
      console.log('[DataManager] Set new baseline for change tracking');
      
      // Update presentation data to ensure merged data is available
      this.updatePresentationData();
      
      // Notify that data has been loaded with new baseline
      this.callbacks.onDataLoaded?.(this.state.presentationData);
      this.callbacks.onBaselineUpdated?.(this.state.presentationData);
      
      console.log('[DataManager] Successfully loaded GitHub data:', {
        tokens: this.state.presentationData.tokens.length,
        collections: this.state.presentationData.collections.length,
        dimensions: this.state.presentationData.dimensions.length
      });
      
      return this.state.presentationData;
    } catch (error) {
      console.error('[DataManager] Error loading GitHub data:', error);
      throw error;
    }
  }

  /**
   * Load data from example source and update storage and state
   */
  async loadFromExampleSource(dataSourceKey: string, exampleData: Record<string, unknown>, algorithmData?: Record<string, unknown>): Promise<DataSnapshot> {
    console.log('[DataManager] Loading example data from source:', dataSourceKey);
    
    try {
      const snapshot = this.processExampleData(dataSourceKey, exampleData, algorithmData);
      
      // Pre-load platform extension data if user is authenticated
      if (snapshot.platforms.length > 0) {
        await this.preloadPlatformExtensions(snapshot.platforms);
      }
      
      // Store in localStorage
      this.storeSnapshot(snapshot);
      console.log('[DataManager] Stored example data snapshot in localStorage');
      
      // Set new baseline for change tracking - this establishes the new "original" state
      this.setBaseline(snapshot);
      console.log('[DataManager] Set new baseline for change tracking');
      
      // Update presentation data to ensure merged data is available
      this.updatePresentationData();
      
      // Notify that data has been loaded with new baseline
      this.callbacks.onDataLoaded?.(this.state.presentationData);
      this.callbacks.onBaselineUpdated?.(this.state.presentationData);
      
      console.log('[DataManager] Successfully loaded example data:', {
        tokens: this.state.presentationData.tokens.length,
        collections: this.state.presentationData.collections.length,
        dimensions: this.state.presentationData.dimensions.length
      });
      
      return this.state.presentationData;
    } catch (error) {
      console.error('[DataManager] Error loading example data:', error);
      throw error;
    }
  }

  /**
   * Load data from URL configuration (public repository access)
   */
  async loadFromURLConfig(config: URLConfig): Promise<DataSnapshot> {
    console.log('[DataManager] Loading data from URL config:', config);
    
    try {
      const path = config.path || 'schema.json';
      const branch = config.branch || 'main';
      
      // Check if user is authenticated for private repository access
      const isAuthenticated = GitHubAuthService.isAuthenticated();
      
      let fileContent;
      if (isAuthenticated) {
        // Use authenticated access for private repositories
        console.log('[DataManager] Using authenticated access for repository:', config.repo);
        fileContent = await GitHubApiService.getFileContent(
          config.repo,
          path,
          branch
        );
      } else {
        // Use public access (will fail for private repositories)
        console.log('[DataManager] Using public access for repository:', config.repo);
        fileContent = await GitHubApiService.getPublicFileContent(
          config.repo,
          path,
          branch
        );
      }
      
      // Parse the file content
      const parsedData = JSON.parse(fileContent.content);
      console.log('[DataManager] Parsed data themes:', parsedData.themes);
      
      // Process the data using existing logic
      const snapshot = this.processSchemaData(parsedData);
      
      // Store in localStorage
      this.storeSnapshot(snapshot);
      
      // Set new baseline for change tracking
      this.setBaseline(snapshot);
      
      // Update presentation data to ensure merged data is available
      this.updatePresentationData();
      
      // Notify that data has been loaded with new baseline
      this.callbacks.onDataLoaded?.(this.state.presentationData);
      this.callbacks.onBaselineUpdated?.(this.state.presentationData);
      
      console.log('[DataManager] Successfully loaded URL config data:', {
        repo: config.repo,
        path,
        branch,
        tokens: this.state.presentationData.tokens.length,
        collections: this.state.presentationData.collections.length,
        dimensions: this.state.presentationData.dimensions.length
      });
      
      return this.state.presentationData;
    } catch (error) {
      console.error('[DataManager] Error loading URL config data:', error);
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
      componentProperties: [],
      componentCategories: [],
      components: [],
      algorithms: [],
      taxonomyOrder: [],
      dimensionOrder: [],
      algorithmFile: null,
      // Clear MultiRepositoryManager data
      linkedRepositories: [],
      platformExtensions: {},
      themeOverrides: null,
      figmaConfiguration: null,
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
    const snapshot = {
      collections: StorageService.getCollections(),
      modes: StorageService.getModes(),
      dimensions: StorageService.getDimensions(),
      resolvedValueTypes: StorageService.getValueTypes(),
      platforms: StorageService.getPlatforms(),
      themes: StorageService.getThemes(),
      tokens: StorageService.getTokens(),
      taxonomies: StorageService.getTaxonomies(),
      componentProperties: StorageService.getComponentProperties(),
      componentCategories: StorageService.getComponentCategories(),
      components: StorageService.getComponents(),
      algorithms: StorageService.getAlgorithms(),
      taxonomyOrder: StorageService.getTaxonomyOrder(),
      dimensionOrder: StorageService.getDimensionOrder(),
      algorithmFile: StorageService.getAlgorithmFile(),
      // MultiRepositoryManager data
      linkedRepositories: StorageService.getLinkedRepositories(),
      platformExtensions: StorageService.getPlatformExtensions(),
      themeOverrides: StorageService.getThemeOverrides(),
      figmaConfiguration: StorageService.getFigmaConfiguration(),
    };

    // Update state.storageData with loaded data
    this.state.storageData = {
      core: {
        systemName: 'Design System',
        systemId: 'design-system',
        version: '1.0.0',
        versionHistory: [],
        dimensions: snapshot.dimensions,
        dimensionOrder: snapshot.dimensionOrder,
        taxonomyOrder: snapshot.taxonomyOrder,
        tokenCollections: snapshot.collections,
        tokens: snapshot.tokens,
        platforms: snapshot.platforms,
        themes: snapshot.themes || [],
        taxonomies: snapshot.taxonomies,
        standardPropertyTypes: [],
        propertyTypes: [],
        resolvedValueTypes: snapshot.resolvedValueTypes,
        componentProperties: snapshot.componentProperties,
        componentCategories: snapshot.componentCategories,
        components: snapshot.components,
        figmaConfiguration: snapshot.figmaConfiguration || { fileKey: '', fileColorProfile: 'srgb' }
      },
      platformExtensions: (snapshot.platformExtensions || {}) as Record<string, PlatformExtension>,
      themeOverrides: (snapshot.themeOverrides || {}) as Record<string, ThemeOverrideFile>
    };

    return snapshot;
  }

  /**
   * Store snapshot in localStorage
   */
  private storeSnapshot(snapshot: DataSnapshot): void {
    console.log('[DataManager] storeSnapshot called at:', new Date().toISOString());
    console.log('[DataManager] Storing themes:', snapshot.themes);
    
    StorageService.setCollections(snapshot.collections);
    StorageService.setModes(snapshot.modes);
    StorageService.setDimensions(snapshot.dimensions);
    StorageService.setValueTypes(snapshot.resolvedValueTypes);
    StorageService.setTokens(snapshot.tokens);
    StorageService.setPlatforms(snapshot.platforms);
    StorageService.setThemes(snapshot.themes);
    StorageService.setTaxonomies(snapshot.taxonomies);
    StorageService.setComponentProperties(snapshot.componentProperties);
    StorageService.setComponentCategories(snapshot.componentCategories);
    StorageService.setComponents(snapshot.components);
    StorageService.setAlgorithms(snapshot.algorithms);
    StorageService.setTaxonomyOrder(snapshot.taxonomyOrder);
    StorageService.setDimensionOrder(snapshot.dimensionOrder);
    
    if (snapshot.algorithmFile) {
      StorageService.setAlgorithmFile(snapshot.algorithmFile);
    }

    // Store MultiRepositoryManager data
    StorageService.setLinkedRepositories(snapshot.linkedRepositories);
    StorageService.setPlatformExtensions(snapshot.platformExtensions);
    StorageService.setThemeOverrides(snapshot.themeOverrides);
    StorageService.setFigmaConfiguration(snapshot.figmaConfiguration);
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
      componentProperties: snapshot.componentProperties,
      componentCategories: snapshot.componentCategories,
      components: snapshot.components,
      algorithms: snapshot.algorithms,
      taxonomyOrder: snapshot.taxonomyOrder,
      // Include MultiRepositoryManager data in baseline
      linkedRepositories: snapshot.linkedRepositories,
      platformExtensions: snapshot.platformExtensions,
      themeOverrides: snapshot.themeOverrides,
      figmaConfiguration: snapshot.figmaConfiguration,
    };
    
    ChangeTrackingService.setBaselineData(baselineData);
    this.callbacks.onBaselineUpdated?.(snapshot);
  }

  /**
   * Process schema data from GitHub
   */
  private processSchemaData(fileContent: Record<string, unknown>): DataSnapshot {
    console.log('[DataManager] processSchemaData called at:', new Date().toISOString());
    console.log('[DataManager] Raw themes from fileContent:', fileContent.themes);
    
    const normalizedCollections = (fileContent.tokenCollections as TokenCollection[]) ?? [];
    const normalizedDimensions = (fileContent.dimensions as Dimension[]) ?? [];
    const normalizedTokens = ((fileContent.tokens as Token[]) ?? []).map((token: Token) => ({
      ...token,
      valuesByMode: token.valuesByMode
    }));
    const normalizedPlatforms = (fileContent.platforms as Platform[]) ?? [];
    const normalizedThemes = ((fileContent.themes as Theme[]) ?? []).map((theme: Theme) => {
      console.log(`[DataManager] Processing theme ${theme.id}:`, theme);
      return {
        id: theme.id,
        displayName: theme.displayName,
        description: theme.description,
        overrideSource: theme.overrideSource,
        status: theme.status
      };
    });
    
    console.log('[DataManager] Normalized themes:', normalizedThemes);
    const normalizedTaxonomies = (fileContent.taxonomies as Taxonomy[]) ?? [];
    const normalizedResolvedValueTypes = (fileContent.resolvedValueTypes as ResolvedValueType[]) ?? [];
    const normalizedTaxonomyOrder = ((fileContent.taxonomyOrder as string[]) ?? normalizedTaxonomies.map(t => t.id));
    const normalizedComponentProperties = (fileContent.componentProperties as ComponentProperty[]) ?? [];
    const normalizedComponentCategories = (fileContent.componentCategories as ComponentCategory[]) ?? [];
    const normalizedComponents = (fileContent.components as Component[]) ?? [];

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

    // Process figmaConfiguration from schema
    const figmaConfiguration = (fileContent.figmaConfiguration as FigmaConfiguration) ?? null;

    return {
      collections: normalizedCollections,
      modes: allModes,
      dimensions: normalizedDimensions,
      resolvedValueTypes: normalizedResolvedValueTypes,
      platforms: normalizedPlatforms,
      themes: normalizedThemes,
      tokens: normalizedTokens as ExtendedToken[],
      taxonomies: normalizedTaxonomies,
      componentProperties: normalizedComponentProperties,
      componentCategories: normalizedComponentCategories,
      components: normalizedComponents,
      algorithms: [],
      taxonomyOrder: normalizedTaxonomyOrder,
      dimensionOrder: normalizedDimensions.map(d => d.id),
      algorithmFile: null,
      // Clear MultiRepositoryManager data when loading from GitHub
      linkedRepositories: [],
      platformExtensions: {},
      themeOverrides: null,
      figmaConfiguration,
    };
  }

  /**
   * Process theme override data from GitHub
   */
  private processThemeOverrideData(fileContent: Record<string, unknown>): DataSnapshot {
    // TODO: Implement theme override processing
    console.log('[DataManager] Theme override processing not yet implemented for:', fileContent);
    
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
      description: theme.description,
      overrideSource: theme.overrideSource,
      status: theme.status
    }));
    const normalizedTaxonomies = (d.taxonomies as Taxonomy[]) ?? [];
    const normalizedResolvedValueTypes = (d.resolvedValueTypes as ResolvedValueType[]) ?? [];
    const normalizedTaxonomyOrder = ((d.taxonomyOrder as string[]) ?? normalizedTaxonomies.map(t => t.id));
    const normalizedComponentProperties = (d.componentProperties as ComponentProperty[]) ?? [];
    const normalizedComponentCategories = (d.componentCategories as ComponentCategory[]) ?? [];
    const normalizedComponents = (d.components as Component[]) ?? [];

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
      componentProperties: normalizedComponentProperties,
      componentCategories: normalizedComponentCategories,
      components: normalizedComponents,
      algorithms: loadedAlgorithms,
      taxonomyOrder: normalizedTaxonomyOrder,
      dimensionOrder: normalizedDimensions.map(dimension => dimension.id),
      algorithmFile,
      // Clear MultiRepositoryManager data when loading from example source
      linkedRepositories: [],
      platformExtensions: {},
      themeOverrides: null,
      figmaConfiguration: null,
    };
  }

  /**
   * Pre-load platform extension data for all platforms with extension sources
   */
  private async preloadPlatformExtensions(platforms: Platform[]): Promise<void> {
    const platformsWithExtensions = platforms.filter(p => p.extensionSource);
    if (platformsWithExtensions.length === 0) {
      console.log('[DataManager] No platforms with extensions to pre-load');
      return;
    }

    // Prevent duplicate preloading by checking if we're already in progress
    if (this.isPreloadingPlatformExtensions) {
      console.log('[DataManager] Platform extension preloading already in progress, skipping');
      return;
    }

    this.isPreloadingPlatformExtensions = true;
    console.log('[DataManager] Pre-loading platform extensions for', platformsWithExtensions.length, 'platforms');
    
    // Clear existing cache to ensure fresh data
    PlatformExtensionDataService.clearAllCache();
    PlatformExtensionAnalyticsService.getInstance().clearCache();
    
    // Pre-load all platform extensions in parallel
    const preloadPromises = platformsWithExtensions.map(async (platform) => {
      try {
        const { repositoryUri, filePath } = platform.extensionSource!;
        console.log(`[DataManager] Pre-loading platform extension for ${platform.id} (${platform.displayName}) from ${repositoryUri}/${filePath}`);
        
        const result = await PlatformExtensionDataService.getPlatformExtensionData(
          repositoryUri,
          filePath,
          'main', // Default branch
          platform.id
        );
        
        if (result.error) {
          // Check if this is an authentication-related error for private repositories
          const isPrivateRepoPattern = platform.extensionSource?.repositoryUri.match(/^company\/design-system-/);
          const isAuthError = result.error.includes('Private repository') || result.error.includes('authentication required') || result.error.includes('access not available');
          
          if (isPrivateRepoPattern && isAuthError) {
            console.log(`[DataManager] Skipping private platform extension ${platform.id} (${platform.displayName}) - authentication required`);
          } else {
            console.warn(`[DataManager] Platform extension ${platform.id} (${platform.displayName}) returned error:`, result.error);
          }
        } else {
          console.log(`[DataManager] Successfully pre-loaded platform extension for ${platform.id} (${platform.displayName})`);
        }
      } catch (error) {
        console.error(`[DataManager] Failed to pre-load platform extension for ${platform.id} (${platform.displayName}):`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          platform: {
            id: platform.id,
            displayName: platform.displayName,
            extensionSource: platform.extensionSource
          }
        });
        // Don't throw here - we want to continue loading other extensions even if one fails
      }
    });

    try {
      await Promise.allSettled(preloadPromises);
      console.log('[DataManager] Completed platform extension pre-loading');
    } catch (error) {
      console.error('[DataManager] Error during platform extension pre-loading:', error);
      // Don't throw here - this is a best-effort operation
    } finally {
      this.isPreloadingPlatformExtensions = false;
    }
  }

  /**
   * Pre-load theme override data for themes with external sources
   */
  private async preloadThemeOverrides(themes: Theme[]): Promise<void> {
    const themesWithOverrides = themes.filter(t => t.overrideSource);
    if (themesWithOverrides.length === 0) {
      console.log('[DataManager] No themes with external sources to pre-load');
      return;
    }

    // Prevent duplicate preloading by checking if we're already in progress
    if (this.isPreloadingThemeOverrides) {
      console.log('[DataManager] Theme override preloading already in progress, skipping');
      return;
    }

    this.isPreloadingThemeOverrides = true;
    console.log('[DataManager] Pre-loading theme overrides for', themesWithOverrides.length, 'themes');
    
    // Clear existing cache to ensure fresh data
    ThemeOverrideDataService.clearAllCache();
    
    // Pre-load all theme overrides in parallel
    const preloadPromises = themesWithOverrides.map(async (theme) => {
      try {
        const { repositoryUri, filePath } = theme.overrideSource!;
        console.log(`[DataManager] Pre-loading theme override for ${theme.id} (${theme.displayName}) from ${repositoryUri}/${filePath}`);
        
        const result = await ThemeOverrideDataService.getThemeOverrideData(
          repositoryUri,
          filePath,
          'main', // Default branch
          theme.id
        );
        
        if (result.error) {
          // Check if this is an authentication-related error for private repositories
          const isPrivateRepoPattern = theme.overrideSource?.repositoryUri.match(/^company\/design-system-/);
          const isAuthError = result.error.includes('Private repository') || result.error.includes('authentication required') || result.error.includes('access not available') || result.error.includes('404');
          
          if (isPrivateRepoPattern && isAuthError) {
            console.log(`[DataManager] Skipping private theme override ${theme.id} (${theme.displayName}) - authentication required`);
          } else {
            console.warn(`[DataManager] Theme override ${theme.id} (${theme.displayName}) returned error:`, result.error);
          }
        } else {
          console.log(`[DataManager] Successfully pre-loaded theme override for ${theme.id} (${theme.displayName})`);
        }
      } catch (error) {
        console.error(`[DataManager] Failed to pre-load theme override for ${theme.id} (${theme.displayName}):`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          theme: {
            id: theme.id,
            displayName: theme.displayName,
            overrideSource: theme.overrideSource
          }
        });
        // Don't throw here - we want to continue loading other overrides even if one fails
      }
    });

    try {
      await Promise.allSettled(preloadPromises);
      console.log('[DataManager] Completed theme override pre-loading');
    } catch (error) {
      console.error('[DataManager] Error during theme override pre-loading:', error);
      // Don't throw here - this is a best-effort operation
    } finally {
      this.isPreloadingThemeOverrides = false;
    }
  }

  // ============================================================================
  // Schema-Aware Storage Methods (Phase 4.1)
  // ============================================================================

  /**
   * Get data for presentation (merged)
   */
  getPresentationSnapshot(): DataSnapshot {
    return this.state.presentationData;
  }

  /**
   * Get data for storage (schema-compliant)
   */
  getStorageDataForSource(
    sourceType: 'core' | 'platform-extension' | 'theme-override', 
    sourceId?: string
  ): Record<string, unknown> {
    switch (sourceType) {
      case 'core':
        return this.state.storageData.core || {};
      case 'platform-extension':
        if (!sourceId) {
          throw new Error('Platform ID required for platform extension data');
        }
        return this.state.storageData.platformExtensions[sourceId] || {};
      case 'theme-override':
        if (!sourceId) {
          throw new Error('Theme ID required for theme override data');
        }
        return this.state.storageData.themeOverrides[sourceId] || {};
      default:
        throw new Error(`Unknown source type: ${sourceType}`);
    }
  }

  /**
   * Update data with schema validation
   */
  updateDataWithSchemaValidation(
    updates: Partial<DataSnapshot>, 
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId?: string
  ): ValidationResult {
    try {
      // Validate the updates against the appropriate schema
      const validationResult = this.validateDataForStorage(updates, sourceType);
      if (!validationResult.isValid) {
        return validationResult;
      }

      // Update the storage data
      switch (sourceType) {
        case 'core':
          this.state.storageData.core = { ...this.state.storageData.core, ...updates } as TokenSystem;
          break;
        case 'platform-extension':
          if (!sourceId) {
            throw new Error('Platform ID required for platform extension update');
          }
          this.state.storageData.platformExtensions[sourceId] = {
            ...this.state.storageData.platformExtensions[sourceId],
            ...updates
          } as PlatformExtension;
          break;
        case 'theme-override':
          if (!sourceId) {
            throw new Error('Theme ID required for theme override update');
          }
          this.state.storageData.themeOverrides[sourceId] = {
            ...this.state.storageData.themeOverrides[sourceId],
            ...updates
          } as ThemeOverrideFile;
          break;
      }

      // Update presentation data (this will trigger a merge)
      this.updatePresentationData();

      return { isValid: true, errors: [], warnings: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Update failed'],
        warnings: []
      };
    }
  }

  /**
   * Validate storage data against appropriate schema
   */
  validateStorageData(
    data: Record<string, unknown>,
    sourceType: 'core' | 'platform-extension' | 'theme-override'
  ): ValidationResult {
    return this.validateDataForStorage(data, sourceType);
  }

  /**
   * Set current data source context
   */
  setCurrentDataSource(
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId?: string
  ): void {
    this.state.currentSourceType = sourceType;
    this.state.currentSourceId = sourceId;
  }

  /**
   * Get current data source context
   */
  getCurrentDataSource(): { sourceType: 'core' | 'platform-extension' | 'theme-override'; sourceId?: string } {
    return {
      sourceType: this.state.currentSourceType,
      sourceId: this.state.currentSourceId
    };
  }

  // ============================================================================
  // NEW: Edit/View Distinction Methods
  // ============================================================================

  /**
   * Get edit data for specific source (source-specific data for changes)
   */
  getEditData(
    sourceType: 'core' | 'platform-extension' | 'theme-override', 
    sourceId?: string
  ): Record<string, unknown> {
    return this.getStorageDataForSource(sourceType, sourceId);
  }

  /**
   * Get view data (merged data for display)
   */
  getViewData(): DataSnapshot {
    return this.getPresentationSnapshot();
  }

  /**
   * Update edit data with validation and override creation
   */
  async updateEditData(
    updates: Partial<DataSnapshot>, 
    sourceType: 'core' | 'platform-extension' | 'theme-override', 
    sourceId?: string
  ): Promise<ValidationResult> {
    try {
      // Import OverrideManager dynamically to avoid circular dependencies
      const { OverrideManager } = await import('./overrideManager');
      const overrideManager = OverrideManager.getInstance();

      // Validate the updates against the appropriate schema
      const validationResult = this.validateDataForStorage(updates, sourceType);
      if (!validationResult.isValid) {
        return validationResult;
      }

      // Handle override creation for platform/theme editing
      if (sourceType === 'platform-extension' && sourceId) {
        // Check if any token changes would create overrides
        const tokenUpdates = updates.tokens;
        if (tokenUpdates) {
          for (const token of tokenUpdates) {
            // Track override changes
            const originalToken = this.findTokenInCoreData(token.id);
            if (originalToken) {
              ChangeTrackingService.trackOverrideChanges(
                token.id,
                originalToken,
                token,
                sourceType,
                sourceId
              );
            }
          }
        }
      } else if (sourceType === 'theme-override' && sourceId) {
        // Check if any token changes would create theme overrides
        const tokenUpdates = updates.tokens;
        if (tokenUpdates) {
          for (const token of tokenUpdates) {
            // Validate that token is themeable
            if (!overrideManager.isTokenThemeable(token.id, this.state.storageData.core)) {
              return {
                isValid: false,
                errors: [`Token ${token.id} is not themeable and cannot be edited in theme mode`],
                warnings: []
              };
            }

            // Track override changes
            const originalToken = this.findTokenInCoreData(token.id);
            if (originalToken) {
              ChangeTrackingService.trackOverrideChanges(
                token.id,
                originalToken,
                token,
                sourceType,
                sourceId
              );
            }
          }
        }
      }

      // Update the storage data using existing method
      return this.updateDataWithSchemaValidation(updates, sourceType, sourceId);
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Update failed'],
        warnings: []
      };
    }
  }

  /**
   * Find token in core data
   */
  private findTokenInCoreData(tokenId: string): Token | null {
    if (!this.state.storageData.core?.tokens) {
      return null;
    }
    return this.state.storageData.core.tokens.find(t => t.id === tokenId) || null;
  }

  /**
   * Get pending overrides for current edit source
   */
  getPendingOverrides(): Array<{tokenId: string, override: Record<string, unknown>}> {
    return ChangeTrackingService.getOverrideChanges().map(change => ({
      tokenId: change.tokenId,
      override: change.newValue
    }));
  }

  /**
   * Clear pending overrides
   */
  clearPendingOverrides(): void {
    ChangeTrackingService.clearOverrideChanges();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate data for storage against appropriate schema
   */
  private validateDataForStorage(
    data: Record<string, unknown>,
    sourceType: 'core' | 'platform-extension' | 'theme-override'
  ): ValidationResult {
    try {
      switch (sourceType) {
        case 'core':
          SchemaValidationService.validateCoreData(data as TokenSystem);
          break;
        case 'platform-extension':
          SchemaValidationService.validatePlatformExtension(data as PlatformExtension);
          break;
        case 'theme-override':
          SchemaValidationService.validateThemeOverrideFile(data as ThemeOverrideFile);
          break;
      }
      return { isValid: true, errors: [], warnings: [] };
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
        warnings: []
      };
    }
  }

  /**
   * Update presentation data by merging storage data
   */
  private updatePresentationData(): void {
    // Guard against null core data
    if (!this.state.storageData.core) {
      console.log('[DataManager] Skipping updatePresentationData - no core data available');
      return;
    }

    // Use EnhancedDataMerger to merge data with override support
    const enhancedMerger = EnhancedDataMerger.getInstance();
    
    // Get current data source context from DataSourceManager
    import('./dataSourceManager').then(({ DataSourceManager }) => {
      const dataSourceManager = DataSourceManager.getInstance();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const context = dataSourceManager.getCurrentContext();
      
      // Get pending overrides
      const pendingOverrides = this.getPendingOverrides();
      
      // Merge data with overrides
      const mergedSnapshot = enhancedMerger.mergeWithOverrides(
        this.state.storageData.core,
        this.state.storageData.platformExtensions,
        this.state.storageData.themeOverrides,
        pendingOverrides
      );
      
      // Convert MergedDataSnapshot to DataSnapshot format
      this.state.presentationData = {
        collections: mergedSnapshot.collections,
        modes: mergedSnapshot.modes,
        dimensions: mergedSnapshot.dimensions,
        resolvedValueTypes: mergedSnapshot.resolvedValueTypes,
        platforms: mergedSnapshot.platforms,
        themes: mergedSnapshot.themes,
        tokens: mergedSnapshot.tokens,
        taxonomies: mergedSnapshot.taxonomies,
        componentProperties: mergedSnapshot.componentProperties,
        componentCategories: mergedSnapshot.componentCategories,
        components: mergedSnapshot.components,
        algorithms: [], // TODO: Add algorithms support
        taxonomyOrder: mergedSnapshot.taxonomyOrder,
        dimensionOrder: mergedSnapshot.dimensionOrder,
        algorithmFile: mergedSnapshot.algorithmFile,
        linkedRepositories: [], // TODO: Add linked repositories support
        platformExtensions: this.state.storageData.platformExtensions,
        themeOverrides: this.state.storageData.themeOverrides,
        figmaConfiguration: mergedSnapshot.figmaConfiguration
      };
      
      // Trigger callbacks
      this.callbacks.onDataChanged?.(this.state.presentationData);
    }).catch(error => {
      console.error('Failed to update presentation data:', error);
    });
  }
} 