import type { Token, TokenCollection, Mode } from '@token-model/data-model';

const DEFAULT_COLLECTIONS: TokenCollection[] = [
  {
    id: "tokenCollection-AAAA-AAAA-AAAA",
    name: "Color",
    resolvedValueTypes: ["COLOR"],
    private: false,
    defaultModeIds: [
      "modeId-0000-0000-0000",
      "modeId-2222-2222-2222"
    ],
    modeResolutionStrategy: {
      priorityByType: [
        "COLOR_SCHEME",
        "CONTRAST"
      ],
      fallbackStrategy: "MOST_SPECIFIC_MATCH"
    }
  }
];

const DEFAULT_MODES: Mode[] = [
  {
    id: "modeId-0000-0000-0000",
    name: "Light",
    dimensionId: "dimensionId-0000-0000-0000"
  },
  {
    id: "modeId-1111-1111-1111",
    name: "Dark",
    dimensionId: "dimensionId-0000-0000-0000"
  },
  {
    id: "modeId-2222-2222-2222",
    name: "Regular",
    dimensionId: "dimensionId-1111-1111-1111"
  },
  {
    id: "modeId-3333-3333-3333",
    name: "Low",
    dimensionId: "dimensionId-1111-1111-1111"
  },
  {
    id: "modeId-4444-4444-4444",
    name: "High",
    dimensionId: "dimensionId-1111-1111-1111"
  }
];

const DEFAULT_TOKENS: Token[] = [
  {
    id: "token-8888-88888-88888",
    displayName: "Blue 500",
    description: "Midtone blue",
    tokenCollectionId: "tokenCollection-AAAA-AAAA-AAAA",
    resolvedValueType: "COLOR",
    private: false,
    taxonomies: {
      concept: "Blue",
      position: "500"
    },
    propertyTypes: ["ALL_PROPERTY_TYPES"],
    codeSyntax: {
      Figma: "Blue/500",
      WEB: "--spectrum-blue-500",
      iOS: "SpBlue500",
      ANDROID: "BLUE_500"
    },
    valuesByMode: [
      {
        modeIds: ["modeId-0000-0000-0000"],
        value: { type: "COLOR", value: "#274DEA" }
      },
      {
        modeIds: ["modeId-1111-1111-1111"],
        value: { type: "COLOR", value: "#6995FE" }
      }
    ]
  },
  {
    id: "token-9999-9999-9999",
    displayName: "Accent text color",
    description: "Color of text using a shade of the accent color hue",
    tokenCollectionId: "tokenCollection-AAAA-AAAA-AAAA",
    resolvedValueType: "COLOR",
    private: false,
    taxonomies: {
      element: "text",
      concept: "accent"
    },
    propertyTypes: ["ALL_PROPERTY_TYPES"],
    codeSyntax: {
      Figma: "Text/accent",
      WEB: "--text-accent",
      iOS: "SpTextAccent",
      ANDROID: "TEXT_ACCENT"
    },
    valuesByMode: [
      {
        modeIds: ["modeId-0000-0000-0000", "modeId-2222-2222-2222"],
        value: {
          type: "ALIAS",
          tokenId: "token-8888-88888-88888"
        }
      },
      {
        modeIds: ["modeId-0000-0000-0000", "modeId-3333-3333-3333"],
        value: { type: "COLOR", value: "#4C6FFE" }
      },
      {
        modeIds: ["modeId-0000-0000-0000", "modeId-4444-4444-4444"],
        value: { type: "COLOR", value: "#092FCC" }
      },
      {
        modeIds: ["modeId-1111-1111-1111", "modeId-2222-2222-2222"],
        value: {
          type: "ALIAS",
          tokenId: "token-8888-88888-88888"
        }
      },
      {
        modeIds: ["modeId-1111-1111-1111", "modeId-3333-3333-3333"],
        value: { type: "COLOR", value: "#346EF9" }
      },
      {
        modeIds: ["modeId-1111-1111-1111", "modeId-4444-4444-4444"],
        value: { type: "COLOR", value: "#A7C1FF" }
      }
    ]
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
  VALUE_TYPES: 'token-model:value-types'
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

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }
} 