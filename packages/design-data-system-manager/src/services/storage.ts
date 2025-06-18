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
  NAMING_RULES: 'token-model:naming-rules'
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

  static getNamingRules(): { taxonomyOrder: string[] } {
    return this.getItem(STORAGE_KEYS.NAMING_RULES, { taxonomyOrder: [] });
  }

  static setNamingRules(rules: { taxonomyOrder: string[] }): void {
    this.setItem(STORAGE_KEYS.NAMING_RULES, rules);
  }

  static getAlgorithms(): Algorithm[] {
    const stored = localStorage.getItem('token-model:algorithms');
    return stored ? JSON.parse(stored) : [];
  }

  static setAlgorithms(algorithms: Algorithm[]): void {
    localStorage.setItem('token-model:algorithms', JSON.stringify(algorithms));
  }

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
} 