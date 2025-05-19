import type { Token, TokenCollection, Mode, Dimension, Platform, Taxonomy } from '@token-model/data-model';
import defaultData from './data/default-data.json';

const DEFAULT_COLLECTIONS = defaultData.tokenCollections as TokenCollection[];
const DEFAULT_DIMENSIONS = defaultData.dimensions as Dimension[];
const DEFAULT_TOKENS = defaultData.tokens as Token[];
const DEFAULT_PLATFORMS = defaultData.platforms as Platform[];
const DEFAULT_THEMES = defaultData.themes;
const DEFAULT_TAXONOMIES = defaultData.taxonomies as Taxonomy[];

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

  static getTokens(): Token[] {
    return this.getItem(STORAGE_KEYS.TOKENS, DEFAULT_TOKENS);
  }

  static setTokens(tokens: Token[]): void {
    this.setItem(STORAGE_KEYS.TOKENS, tokens);
  }

  static getCollections(): TokenCollection[] {
    return this.getItem(STORAGE_KEYS.COLLECTIONS, DEFAULT_COLLECTIONS);
  }

  static setCollections(collections: TokenCollection[]): void {
    this.setItem(STORAGE_KEYS.COLLECTIONS, collections);
  }

  static getModes(): Mode[] {
    return this.getItem(STORAGE_KEYS.MODES, DEFAULT_MODES);
  }

  static setModes(modes: Mode[]): void {
    this.setItem(STORAGE_KEYS.MODES, modes);
  }

  static getValueTypes(): string[] {
    return this.getItem(STORAGE_KEYS.VALUE_TYPES, DEFAULT_VALUE_TYPES);
  }

  static setValueTypes(valueTypes: string[]): void {
    this.setItem(STORAGE_KEYS.VALUE_TYPES, valueTypes);
  }

  static getDimensions(): Dimension[] {
    return this.getItem(STORAGE_KEYS.DIMENSIONS, DEFAULT_DIMENSIONS);
  }

  static setDimensions(dimensions: Dimension[]): void {
    this.setItem(STORAGE_KEYS.DIMENSIONS, dimensions);
  }

  static getPlatforms(): Platform[] {
    return this.getItem(STORAGE_KEYS.PLATFORMS, DEFAULT_PLATFORMS);
  }

  static setPlatforms(platforms: Platform[]): void {
    this.setItem(STORAGE_KEYS.PLATFORMS, platforms);
  }

  static getThemes() {
    return this.getItem(STORAGE_KEYS.THEMES, DEFAULT_THEMES);
  }

  static setThemes(themes: any[]) {
    this.setItem(STORAGE_KEYS.THEMES, themes);
  }

  static getTaxonomies(): Taxonomy[] {
    return this.getItem(STORAGE_KEYS.TAXONOMIES, DEFAULT_TAXONOMIES);
  }

  static setTaxonomies(taxonomies: Taxonomy[]): void {
    this.setItem(STORAGE_KEYS.TAXONOMIES, taxonomies);
  }

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
} 