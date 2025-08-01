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
import { generateDefaultValueTypes } from '../utils/defaultValueTypes';
import { Algorithm } from '../types/algorithm';

type ValueType = ResolvedValueType;

const DEFAULT_VALUE_TYPES = generateDefaultValueTypes();

console.debug('[StorageService] Initialized default value types:', DEFAULT_VALUE_TYPES);

const STORAGE_KEYS = {
  TOKENS: 'token-model:tokens',
  COLLECTIONS: 'token-model:collections',
  MODES: 'token-model:modes',
  VALUE_TYPES: 'token-model:value-types',
  DIMENSIONS: 'token-model:dimensions',
  DIMENSION_ORDER: 'token-model:dimension-order',
  PLATFORMS: 'token-model:platforms',
  THEMES: 'token-model:themes',
  TAXONOMIES: 'token-model:taxonomies',
  TAXONOMY_ORDER: 'token-model:taxonomy-order',
  ALGORITHMS: 'token-model:algorithms',
  ALGORITHM_FILE: 'token-model:algorithm-file',
  ROOT_DATA: 'token-model:root-data',
  // MultiRepositoryManager storage keys
  LINKED_REPOSITORIES: 'token-model:linked-repositories',
  PLATFORM_EXTENSIONS: 'token-model:platform-extensions',
  THEME_OVERRIDES: 'token-model:theme-overrides',
  // Platform extension files storage
  PLATFORM_EXTENSION_FILES: 'token-model:platform-extension-files',
  FIGMA_CONFIGURATION: 'token-model:figma-configuration',
  COMPONENT_PROPERTIES: 'token-model:component-properties',
  COMPONENT_CATEGORIES: 'token-model:component-categories',
  COMPONENTS: 'token-model:components',
  // Schema-specific storage keys (Phase 4.3)
  CORE_DATA: 'token-model:core-data',
  PLATFORM_EXTENSION_DATA: 'token-model:platform-extension-data',
  THEME_OVERRIDE_DATA: 'token-model:theme-override-data',
  PRESENTATION_DATA: 'token-model:presentation-data'
} as const;

export class StorageService {
  private static valueTypesCache: ValueType[] | null = null;

  private static getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`[StorageService] Error parsing item for key ${key}:`, error);
      return defaultValue;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  static getTokens(): Token[] {
    return this.getItem(STORAGE_KEYS.TOKENS, []);
  }

  static setTokens(tokens: Token[]): void {
    localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
  }

  static getCollections(): TokenCollection[] {
    return this.getItem(STORAGE_KEYS.COLLECTIONS, []);
  }

  static setCollections(collections: TokenCollection[]): void {
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
  }

  static getModes(): Mode[] {
    return this.getItem(STORAGE_KEYS.MODES, []);
  }

  static setModes(modes: Mode[]): void {
    localStorage.setItem(STORAGE_KEYS.MODES, JSON.stringify(modes));
  }

  static getValueTypes(): ValueType[] {
    // Use cache if available
    if (this.valueTypesCache !== null) {
      return this.valueTypesCache;
    }
    
    const valueTypes = this.getItem(STORAGE_KEYS.VALUE_TYPES, DEFAULT_VALUE_TYPES);
    console.debug('[StorageService] Retrieved value types:', valueTypes);
    
    // Cache the result
    this.valueTypesCache = valueTypes;
    return valueTypes;
  }

  static setValueTypes(valueTypes: ValueType[]): void {
    console.debug('[StorageService] Setting value types:', valueTypes);
    localStorage.setItem(STORAGE_KEYS.VALUE_TYPES, JSON.stringify(valueTypes));
    // Clear cache when setting new values
    this.valueTypesCache = null;
  }

  static getDimensions(): Dimension[] {
    return this.getItem(STORAGE_KEYS.DIMENSIONS, []);
  }

  static setDimensions(dimensions: Dimension[]): void {
    localStorage.setItem(STORAGE_KEYS.DIMENSIONS, JSON.stringify(dimensions));
  }

  static getDimensionOrder(): string[] {
    return this.getItem(STORAGE_KEYS.DIMENSION_ORDER, []);
  }

  static setDimensionOrder(order: string[]): void {
    localStorage.setItem(STORAGE_KEYS.DIMENSION_ORDER, JSON.stringify(order));
  }

  static getPlatforms(): Platform[] {
    return this.getItem(STORAGE_KEYS.PLATFORMS, []);
  }

  static setPlatforms(platforms: Platform[]): void {
    localStorage.setItem(STORAGE_KEYS.PLATFORMS, JSON.stringify(platforms));
  }

  static getThemes(): Theme[] {
    return this.getItem(STORAGE_KEYS.THEMES, []);
  }

  static setThemes(themes: Theme[]): void {
    localStorage.setItem(STORAGE_KEYS.THEMES, JSON.stringify(themes));
  }

  static getTaxonomies(): Taxonomy[] {
    return this.getItem(STORAGE_KEYS.TAXONOMIES, []);
  }

  static setTaxonomies(taxonomies: Taxonomy[]): void {
    localStorage.setItem(STORAGE_KEYS.TAXONOMIES, JSON.stringify(taxonomies));
  }

  static getTaxonomyOrder(): string[] {
    return this.getItem(STORAGE_KEYS.TAXONOMY_ORDER, []);
  }

  static setTaxonomyOrder(taxonomyOrder: string[]): void {
    // Clean up taxonomy order by removing references to non-existent taxonomies
    const taxonomies = this.getTaxonomies();
    const taxonomyIds = new Set(taxonomies.map(t => t.id));
    const cleanedTaxonomyOrder = taxonomyOrder.filter(id => taxonomyIds.has(id));
    
    if (cleanedTaxonomyOrder.length !== taxonomyOrder.length) {
      console.warn('[StorageService] Removed invalid taxonomy IDs from taxonomy order:', 
        taxonomyOrder.filter(id => !taxonomyIds.has(id)));
    }
    
    this.setItem(STORAGE_KEYS.TAXONOMY_ORDER, cleanedTaxonomyOrder);
  }

  static getAlgorithms(): Algorithm[] {
    return this.getItem(STORAGE_KEYS.ALGORITHMS, []);
  }

  static setAlgorithms(algorithms: Algorithm[]): void {
    this.setItem(STORAGE_KEYS.ALGORITHMS, algorithms);
  }

  static getAlgorithmFile(): Record<string, unknown> | null {
    const item = localStorage.getItem(STORAGE_KEYS.ALGORITHM_FILE);
    return item ? JSON.parse(item) : null;
  }

  static setAlgorithmFile(algorithmFile: Record<string, unknown>): void {
    this.setItem(STORAGE_KEYS.ALGORITHM_FILE, algorithmFile);
  }

  static getRootData(): {
    systemName?: string;
    systemId?: string;
    description?: string;
    version?: string;
    versionHistory?: Array<{
      version: string;
      dimensions: string[];
      date: string;
      migrationStrategy?: {
        emptyModeIds: string;
        preserveOriginalValues: boolean;
      };
    }>;
  } {
    return this.getItem(STORAGE_KEYS.ROOT_DATA, {});
  }

  static setRootData(rootData: {
    systemName?: string;
    systemId?: string;
    description?: string;
    version?: string;
    versionHistory?: Array<{
      version: string;
      dimensions: string[];
      date: string;
      migrationStrategy?: {
        emptyModeIds: string;
        preserveOriginalValues: boolean;
      };
    }>;
  }): void {
    this.setItem(STORAGE_KEYS.ROOT_DATA, rootData);
  }

  // MultiRepositoryManager storage methods
  static getLinkedRepositories(): Array<{
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
  }> {
    return this.getItem(STORAGE_KEYS.LINKED_REPOSITORIES, []);
  }

  static setLinkedRepositories(repositories: Array<{
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
  }>): void {
    this.setItem(STORAGE_KEYS.LINKED_REPOSITORIES, repositories);
  }

  static getPlatformExtensions(): Record<string, unknown> {
    return this.getItem(STORAGE_KEYS.PLATFORM_EXTENSIONS, {});
  }

  static setPlatformExtensions(extensions: Record<string, unknown>): void {
    this.setItem(STORAGE_KEYS.PLATFORM_EXTENSIONS, extensions);
  }

  static getThemeOverrides(): Record<string, unknown> | null {
    return this.getItem(STORAGE_KEYS.THEME_OVERRIDES, null);
  }

  static setThemeOverrides(overrides: Record<string, unknown> | null): void {
    this.setItem(STORAGE_KEYS.THEME_OVERRIDES, overrides);
  }

  static getFigmaConfiguration(): FigmaConfiguration | null {
    return this.getItem(STORAGE_KEYS.FIGMA_CONFIGURATION, null);
  }

  static setFigmaConfiguration(config: FigmaConfiguration | null): void {
    this.setItem(STORAGE_KEYS.FIGMA_CONFIGURATION, config);
  }

  // Platform extension files storage methods
  static getPlatformExtensionFiles(): Record<string, Record<string, unknown>> {
    return this.getItem(STORAGE_KEYS.PLATFORM_EXTENSION_FILES, {});
  }

  static setPlatformExtensionFiles(files: Record<string, Record<string, unknown>>): void {
    this.setItem(STORAGE_KEYS.PLATFORM_EXTENSION_FILES, files);
  }

  static getPlatformExtensionFile(platformId: string): Record<string, unknown> | null {
    const files = this.getPlatformExtensionFiles();
    return files[platformId] || null;
  }

  static setPlatformExtensionFile(platformId: string, fileData: Record<string, unknown>): void {
    const files = this.getPlatformExtensionFiles();
    files[platformId] = fileData;
    this.setPlatformExtensionFiles(files);
  }

  static removePlatformExtensionFile(platformId: string): void {
    const files = this.getPlatformExtensionFiles();
    delete files[platformId];
    this.setPlatformExtensionFiles(files);
  }

  // Get the actual file content for a platform extension file
  static getPlatformExtensionFileContent(platformId: string): string | null {
    const fileKey = `token-model:platform-extension-file:${platformId}`;
    return localStorage.getItem(fileKey);
  }

  // Set the actual file content for a platform extension file
  static setPlatformExtensionFileContent(platformId: string, content: string): void {
    const fileKey = `token-model:platform-extension-file:${platformId}`;
    localStorage.setItem(fileKey, content);
  }

  // Remove the actual file content for a platform extension file
  static removePlatformExtensionFileContent(platformId: string): void {
    const fileKey = `token-model:platform-extension-file:${platformId}`;
    localStorage.removeItem(fileKey);
  }

  static getComponentProperties(): ComponentProperty[] {
    return this.getItem(STORAGE_KEYS.COMPONENT_PROPERTIES, []);
  }

  static setComponentProperties(properties: ComponentProperty[]): void {
    this.setItem(STORAGE_KEYS.COMPONENT_PROPERTIES, properties);
  }

  static getComponentCategories(): ComponentCategory[] {
    return this.getItem(STORAGE_KEYS.COMPONENT_CATEGORIES, []);
  }

  static setComponentCategories(categories: ComponentCategory[]): void {
    this.setItem(STORAGE_KEYS.COMPONENT_CATEGORIES, categories);
  }

  static getComponents(): Component[] {
    return this.getItem(STORAGE_KEYS.COMPONENTS, []);
  }

  static setComponents(components: Component[]): void {
    this.setItem(STORAGE_KEYS.COMPONENTS, components);
  }

  static clearAll(): void {
    // Preserve GitHub authentication data
    const githubToken = localStorage.getItem('github_token_encrypted');
    const githubUser = localStorage.getItem('github_user');
    const githubRepo = localStorage.getItem('github_repo');
    
    // Clear all localStorage
    localStorage.clear();
    
    // Restore GitHub authentication data
    if (githubToken) {
      localStorage.setItem('github_token_encrypted', githubToken);
    }
    if (githubUser) {
      localStorage.setItem('github_user', githubUser);
    }
    if (githubRepo) {
      localStorage.setItem('github_repo', githubRepo);
    }
    
    // Clear caches
    this.valueTypesCache = null;
  }

  /**
   * Clear only schema-related data, preserving GitHub authentication
   */
  static clearSchemaData(): void {
    // Clear all schema-related keys, preserving GitHub authentication
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Clear caches
    this.valueTypesCache = null;
  }

  // ============================================================================
  // Schema-Specific Storage Methods (Phase 4.3)
  // ============================================================================

  /**
   * Core data storage (TokenSystem schema)
   */
  static getCoreData(): TokenSystem | null {
    return this.getItem(STORAGE_KEYS.CORE_DATA, null);
  }

  static setCoreData(data: TokenSystem): void {
    this.setItem(STORAGE_KEYS.CORE_DATA, data);
  }

  /**
   * Platform extension storage (PlatformExtension schema)
   */
  static getPlatformExtensionData(platformId: string): PlatformExtension | null {
    const key = this.getStorageKey('platform-extension', platformId);
    return this.getItem(key, null);
  }

  static setPlatformExtensionData(platformId: string, data: PlatformExtension): void {
    const key = this.getStorageKey('platform-extension', platformId);
    this.setItem(key, data);
  }

  static getAllPlatformExtensionData(): Record<string, PlatformExtension> {
    const allData: Record<string, PlatformExtension> = {};
    const platformExtensions = this.getPlatformExtensions();
    
    Object.keys(platformExtensions).forEach(platformId => {
      const data = this.getPlatformExtensionData(platformId);
      if (data) {
        allData[platformId] = data;
      }
    });
    
    return allData;
  }

  /**
   * Theme override storage (ThemeOverrideFile schema)
   */
  static getThemeOverrideData(themeId: string): ThemeOverrideFile | null {
    const key = this.getStorageKey('theme-override', themeId);
    return this.getItem(key, null);
  }

  static setThemeOverrideData(themeId: string, data: ThemeOverrideFile): void {
    const key = this.getStorageKey('theme-override', themeId);
    this.setItem(key, data);
  }

  static getAllThemeOverrideData(): Record<string, ThemeOverrideFile> {
    const allData: Record<string, ThemeOverrideFile> = {};
    const themes = this.getThemes();
    
    themes.forEach(theme => {
      const data = this.getThemeOverrideData(theme.id);
      if (data) {
        allData[theme.id] = data;
      }
    });
    
    return allData;
  }

  /**
   * Presentation data storage (merged for UI)
   */
  static getPresentationData(): Record<string, unknown> | null {
    return this.getItem(STORAGE_KEYS.PRESENTATION_DATA, null);
  }

  static setPresentationData(data: Record<string, unknown>): void {
    this.setItem(STORAGE_KEYS.PRESENTATION_DATA, data);
  }

  /**
   * Clear schema-specific storage
   */
  static clearSchemaStorage(): void {
    // Clear core data
    localStorage.removeItem(STORAGE_KEYS.CORE_DATA);
    
    // Clear platform extension data
    const platformExtensions = this.getPlatformExtensions();
    Object.keys(platformExtensions).forEach(platformId => {
      const key = this.getStorageKey('platform-extension', platformId);
      localStorage.removeItem(key);
    });
    
    // Clear theme override data
    const themes = this.getThemes();
    themes.forEach(theme => {
      const key = this.getStorageKey('theme-override', theme.id);
      localStorage.removeItem(key);
    });
    
    // Clear presentation data
    localStorage.removeItem(STORAGE_KEYS.PRESENTATION_DATA);
  }

  /**
   * Get storage key for schema-specific data
   */
  private static getStorageKey(type: 'core' | 'platform-extension' | 'theme-override', id?: string): string {
    switch (type) {
      case 'core':
        return STORAGE_KEYS.CORE_DATA;
      case 'platform-extension':
        return `${STORAGE_KEYS.PLATFORM_EXTENSION_DATA}:${id}`;
      case 'theme-override':
        return `${STORAGE_KEYS.THEME_OVERRIDE_DATA}:${id}`;
      default:
        throw new Error(`Unknown storage type: ${type}`);
    }
  }
} 