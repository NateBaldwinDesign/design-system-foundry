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
  NAMING_RULES: 'token-model:naming-rules',
  ALGORITHMS: 'token-model:algorithms'
} as const;

// TEMPORARY: Test data for algorithm debugging
const TEMP_TEST_ALGORITHMS: Algorithm[] = [
  {
    id: 'test-algo-1',
    name: 'Test Algorithm 1',
    variables: [
      { id: 'var1', name: 'x', type: 'number', defaultValue: '0' },
      { id: 'var2', name: 'y', type: 'number', defaultValue: '0' }
    ],
    formulas: [
      {
        id: 'formula1',
        name: 'Sum',
        expression: 'x + y',
        latexExpression: '{x} + {y}',
        description: 'Adds two numbers',
        variableIds: ['var1', 'var2']
      },
      {
        id: 'formula2',
        name: 'Product',
        expression: 'x * y',
        latexExpression: '{x} \\times {y}',
        description: 'Multiplies two numbers',
        variableIds: ['var1', 'var2']
      }
    ],
    conditions: [
      {
        id: 'cond1',
        name: 'Is Positive',
        expression: 'x > 0',
        variableIds: ['var1']
      }
    ],
    steps: [
      { type: 'formula', id: 'formula1', name: 'Sum' },
      { type: 'condition', id: 'cond1', name: 'Is Positive' },
      { type: 'formula', id: 'formula2', name: 'Product' }
    ]
  },
  {
    "id": "new-algorithm",
    "name": "New Algorithm",
    "variables": [
      {
        "id": "var_1750285023050",
        "name": "Base",
        "type": "number",
        "defaultValue": "14"
      },
      {
        "id": "var_1750285027835",
        "name": "Ratio",
        "type": "number",
        "defaultValue": "1.125"
      },
      {
        "id": "var_1750285031421",
        "name": "Increment",
        "type": "number",
        "defaultValue": ""
      },
      {
        "id": "var_1750285142309",
        "name": "TextSize",
        "type": "number",
        "defaultValue": ""
      },
      {
        "id": "var_1750285199085",
        "name": "RatioMin",
        "type": "number",
        "defaultValue": "1.075"
      },
      {
        "id": "var_1750285226254",
        "name": "Ratio max",
        "type": "number",
        "defaultValue": "1.015"
      },
      {
        "id": "var_1750285274964",
        "name": "Percent",
        "type": "number",
        "defaultValue": "1"
      }
    ],
    "formulas": [
      {
        "id": "formula-1750285032878",
        "name": "Typescale",
        "expression": "TextSize = Base * Ratio ^ Increment",
        "latexExpression": "\\mathit{TextSize} = \\mathit{Base} \\times \\mathit{Ratio}^{\\mathit{Increment}}",
        "description": "",
        "variableIds": []
      },
      {
        "id": "formula-1750285160745",
        "name": "Ratio scale",
        "expression": "Ratio = RatioMin * (1 - Percent) + Ratiomax * Percent",
        "latexExpression": "\\mathit{Ratio} = \\mathit {RatioMin} \\times {(1} - \\mathit{Percent)} + \\mathit{Ratio}{max} \\times \\mathit{Percent}",
        "description": "",
        "variableIds": []
      }
    ],
    "conditions": [],
    "steps": [
      {
        "type": "formula",
        "id": "formula-1750285160745",
        "name": "Ratio scale"
      },
      {
        "type": "formula",
        "id": "formula-1750285032878",
        "name": "Typescale"
      }
    ]
  }
];

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
    // TEMPORARY: Return test data for debugging
    return TEMP_TEST_ALGORITHMS;
    
    // Original implementation (commented out for now)
    // const stored = localStorage.getItem(STORAGE_KEYS.ALGORITHMS);
    // return stored ? JSON.parse(stored) : [];
  }

  static setAlgorithms(algorithms: Algorithm[]): void {
    this.setItem(STORAGE_KEYS.ALGORITHMS, algorithms);
  }

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
} 