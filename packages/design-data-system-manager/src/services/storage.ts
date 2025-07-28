import type { Token, TokenCollection, Mode, Dimension, Platform, Taxonomy, Theme, ResolvedValueType } from '@token-model/data-model';
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
  PLATFORM_EXTENSION_FILES: 'token-model:platform-extension-files'
} as const;

export class StorageService {
  private static getItem<T>(key: string, defaultValue: T): T {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    return JSON.parse(item);
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
    const valueTypes = this.getItem(STORAGE_KEYS.VALUE_TYPES, DEFAULT_VALUE_TYPES);
    console.debug('[StorageService] Retrieved value types:', valueTypes);
    return valueTypes;
  }

  static setValueTypes(valueTypes: ValueType[]): void {
    console.debug('[StorageService] Setting value types:', valueTypes);
    localStorage.setItem(STORAGE_KEYS.VALUE_TYPES, JSON.stringify(valueTypes));
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

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
} 