import type { Token, TokenCollection, Mode, Dimension, Platform, Taxonomy } from '@token-model/data-model';

const DEFAULT_MODES: Mode[] = [
  {
    id: "modeId-light",
    name: "Light",
    dimensionId: "dimensionId-0000-0000-0000"
  },
  {
    id: "modeId-dark",
    name: "Dark",
    dimensionId: "dimensionId-0000-0000-0000"
  },
  {
    id: "modeId-regular",
    name: "Regular",
    dimensionId: "dimensionId-1111-1111-1111"
  },
  {
    id: "modeId-low",
    name: "Low",
    dimensionId: "dimensionId-1111-1111-1111"
  },
  {
    id: "modeId-high",
    name: "High",
    dimensionId: "dimensionId-1111-1111-1111"
  }
];

const DEFAULT_VALUE_TYPES: string[] = [
  "valueType-0000-0000-0000",
  "valueType-1111-1111-1111"
];

const STORAGE_KEYS = {
  TOKENS: 'token-model:tokens',
  COLLECTIONS: 'token-model:collections',
  MODES: 'token-model:modes',
  VALUE_TYPES: 'token-model:value-types',
  DIMENSIONS: 'token-model:dimensions',
  PLATFORMS: 'token-model:platforms',
  THEMES: 'token-model:themes',
  TAXONOMIES: 'token-model:taxonomies'
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

  static getTokens(): any[] {
    return this.getItem(STORAGE_KEYS.TOKENS, []);
  }

  static setTokens(tokens: any[]): void {
    localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
  }

  static getCollections(): any[] {
    return this.getItem(STORAGE_KEYS.COLLECTIONS, []);
  }

  static setCollections(collections: any[]): void {
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
  }

  static getModes(): any[] {
    return this.getItem(STORAGE_KEYS.MODES, []);
  }

  static setModes(modes: any[]): void {
    localStorage.setItem(STORAGE_KEYS.MODES, JSON.stringify(modes));
  }

  static getValueTypes(): string[] {
    return this.getItem(STORAGE_KEYS.VALUE_TYPES, DEFAULT_VALUE_TYPES);
  }

  static setValueTypes(valueTypes: string[]): void {
    this.setItem(STORAGE_KEYS.VALUE_TYPES, valueTypes);
  }

  static getDimensions(): any[] {
    return this.getItem(STORAGE_KEYS.DIMENSIONS, []);
  }

  static setDimensions(dimensions: any[]): void {
    localStorage.setItem(STORAGE_KEYS.DIMENSIONS, JSON.stringify(dimensions));
  }

  static getPlatforms(): any[] {
    return this.getItem(STORAGE_KEYS.PLATFORMS, []);
  }

  static setPlatforms(platforms: any[]): void {
    localStorage.setItem(STORAGE_KEYS.PLATFORMS, JSON.stringify(platforms));
  }

  static getThemes(): any[] {
    return this.getItem(STORAGE_KEYS.THEMES, []);
  }

  static setThemes(themes: any[]): void {
    localStorage.setItem(STORAGE_KEYS.THEMES, JSON.stringify(themes));
  }

  static getTaxonomies(): any[] {
    return this.getItem(STORAGE_KEYS.TAXONOMIES, []);
  }

  static setTaxonomies(taxonomies: any[]): void {
    localStorage.setItem(STORAGE_KEYS.TAXONOMIES, JSON.stringify(taxonomies));
  }

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
} 