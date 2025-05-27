// Node.js script to generate a comprehensive sample data set for the design token system
// Outputs core-data.json in the examples directory

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate IDs
let idCounter = 0;
function id(prefix) {
  return `${prefix}-${(++idCounter).toString().padStart(4, '0')}`;
}

// --- Define core entities (collections, dimensions, taxonomies, platforms, etc.) ---
// These should be adapted to match your schema and requirements

const resolvedValueTypes = [
  { id: 'COLOR', displayName: 'Color' },
  { id: 'DIMENSION', displayName: 'Dimension' },
  { id: 'FONT_FAMILY', displayName: 'Font Family' },
  { id: 'FONT_WEIGHT', displayName: 'Font Weight' },
  { id: 'DURATION', displayName: 'Duration' },
  { id: 'BORDER', displayName: 'Border' },
  { id: 'SHADOW', displayName: 'Shadow' },
  { id: 'OPACITY', displayName: 'Opacity' },
  { id: 'NUMBER', displayName: 'Number' },
  { id: 'TYPOGRAPHY', displayName: 'Typography' }
];

const platforms = [
  { id: 'platform-figma', displayName: 'Figma' },
  { id: 'platform-web', displayName: 'Web' },
  { id: 'platform-ios', displayName: 'iOS' },
  { id: 'platform-android', displayName: 'Android' }
];

const dimensions = [
  {
    id: 'dimension-color-scheme',
    type: 'COLOR_SCHEME',
    displayName: 'Color Scheme',
    modes: [
      { id: 'mode-light', name: 'Light', dimensionId: 'dimension-color-scheme' },
      { id: 'mode-dark', name: 'Dark', dimensionId: 'dimension-color-scheme' }
    ],
    required: true,
    defaultMode: 'mode-light',
    resolvedValueTypeIds: ['COLOR', 'OPACITY']
  },
  {
    id: 'dimension-contrast',
    type: 'CONTRAST',
    displayName: 'Contrast',
    modes: [
      { id: 'mode-regular', name: 'Regular', dimensionId: 'dimension-contrast' },
      { id: 'mode-high', name: 'High', dimensionId: 'dimension-contrast' }
    ],
    required: false,
    defaultMode: 'mode-regular',
    resolvedValueTypeIds: ['COLOR']
  }
];

const taxonomies = [
  {
    id: 'taxonomy-color-family',
    name: 'Color Family',
    description: 'Hue families',
    terms: [
      { id: 'term-blue', name: 'Blue', description: '' },
      { id: 'term-red', name: 'Red', description: '' },
      { id: 'term-green', name: 'Green', description: '' },
      { id: 'term-gray', name: 'Gray', description: '' }
    ]
  },
  {
    id: 'taxonomy-element',
    name: 'Element',
    description: 'UI element type',
    terms: [
      { id: 'term-text', name: 'Text', description: '' },
      { id: 'term-bg', name: 'Background', description: '' },
      { id: 'term-border', name: 'Border', description: '' }
    ]
  },
  {
    id: 'taxonomy-scale',
    name: 'Scale',
    description: 'Numeric scale',
    terms: [
      { id: 'term-50', name: '50', description: '' },
      { id: 'term-100', name: '100', description: '' },
      { id: 'term-200', name: '200', description: '' },
      { id: 'term-300', name: '300', description: '' },
      { id: 'term-400', name: '400', description: '' },
      { id: 'term-500', name: '500', description: '' }
    ]
  }
];

const tokenCollections = [
  {
    id: 'collection-color',
    name: 'Color',
    resolvedValueTypeIds: ['COLOR'],
    private: false,
    supportedDimensionIds: ['dimension-color-scheme', 'dimension-contrast'],
    defaultModeIds: ['mode-light', 'mode-regular'],
    modeResolutionStrategy: {
      priorityByType: ['COLOR_SCHEME', 'CONTRAST'],
      fallbackStrategy: 'MOST_SPECIFIC_MATCH'
    }
  },
  {
    id: 'collection-spacing',
    name: 'Spacing',
    resolvedValueTypeIds: ['DIMENSION'],
    private: false,
    supportedDimensionIds: [],
    defaultModeIds: [],
    modeResolutionStrategy: {
      priorityByType: [],
      fallbackStrategy: 'MOST_SPECIFIC_MATCH'
    }
  },
  {
    id: 'collection-typography',
    name: 'Typography',
    resolvedValueTypeIds: ['FONT_FAMILY', 'FONT_WEIGHT', 'TYPOGRAPHY'],
    private: false,
    supportedDimensionIds: [],
    defaultModeIds: [],
    modeResolutionStrategy: {
      priorityByType: [],
      fallbackStrategy: 'MOST_SPECIFIC_MATCH'
    }
  }
];

const themes = [
  {
    id: 'theme-default',
    displayName: 'Default Theme',
    platforms: platforms.map(p => p.id),
    isDefault: true
  }
];

const namingRules = {
  taxonomyOrder: ['taxonomy-element', 'taxonomy-color-family', 'taxonomy-scale']
};

const version = '1.0.0';
const versionHistory = [
  {
    version: '1.0.0',
    dimensions: dimensions.map(d => d.id),
    date: new Date().toISOString().slice(0, 10)
  }
];

// --- Generate tokens ---
const tokens = [];

// Color tokens (Blue, Red, Green, Gray, each with 50-500 scale)
const colorFamilies = taxonomies[0].terms;
const scales = taxonomies[2].terms;
const elements = taxonomies[1].terms;

colorFamilies.forEach(family => {
  scales.forEach(scale => {
    const idStr = `${family.name.toLowerCase()}-${scale.name}`;
    tokens.push({
      id: `token-${idStr}`,
      displayName: `${family.name} ${scale.name}`,
      description: `${family.name} color, scale ${scale.name}`,
      tokenCollectionId: 'collection-color',
      resolvedValueType: 'COLOR',
      private: false,
      status: 'stable',
      themeable: true,
      taxonomies: [
        { taxonomyId: 'taxonomy-color-family', termId: family.id },
        { taxonomyId: 'taxonomy-scale', termId: scale.id }
      ],
      propertyTypes: ['ALL_PROPERTY_TYPES'],
      codeSyntax: {
        Figma: `${family.name}/${scale.name}`,
        WEB: `--${family.name.toLowerCase()}-${scale.name}`,
        iOS: `${family.name}${scale.name}`,
        ANDROID: `${family.name.toUpperCase()}_${scale.name}`
      },
      valuesByMode: [
        {
          modeIds: [],
          value: { type: 'COLOR', value: `#${(Math.floor(Math.random()*16777215)).toString(16).padStart(6, '0')}` }
        }
      ]
    });
  });
});

// Spacing tokens (8, 16, 24, 32, 40)
[8, 16, 24, 32, 40].forEach(size => {
  tokens.push({
    id: `token-spacing-${size}`,
    displayName: `Spacing ${size}`,
    description: `Spacing of ${size}px`,
    tokenCollectionId: 'collection-spacing',
    resolvedValueType: 'DIMENSION',
    private: false,
    status: 'stable',
    themeable: false,
    taxonomies: [],
    propertyTypes: ['ALL_PROPERTY_TYPES'],
    codeSyntax: {
      Figma: `Spacing/${size}`,
      WEB: `--spacing-${size}`,
      iOS: `Spacing${size}`,
      ANDROID: `SPACING_${size}`
    },
    valuesByMode: [
      {
        modeIds: [],
        value: { type: 'DIMENSION', value: `${size}px` }
      }
    ]
  });
});

// Typography tokens (font families, weights, etc.)
['Inter', 'Roboto', 'SF Pro'].forEach(font => {
  tokens.push({
    id: `token-font-${font.toLowerCase().replace(/\s/g, '-')}`,
    displayName: `Font Family ${font}`,
    description: `Font family: ${font}`,
    tokenCollectionId: 'collection-typography',
    resolvedValueType: 'FONT_FAMILY',
    private: false,
    status: 'stable',
    themeable: false,
    taxonomies: [],
    propertyTypes: ['font-family'],
    codeSyntax: {
      Figma: font,
      WEB: font.toLowerCase().replace(/\s/g, '-'),
      iOS: font.replace(/\s/g, ''),
      ANDROID: font.toUpperCase().replace(/\s/g, '_')
    },
    valuesByMode: [
      {
        modeIds: [],
        value: { type: 'FONT_FAMILY', value: font }
      }
    ]
  });
});

// --- Compose the full data object ---
const data = {
  systemName: 'Example Token System',
  systemId: 'example-token-system',
  tokenCollections,
  dimensions,
  tokens,
  platforms,
  taxonomies,
  themes,
  namingRules,
  resolvedValueTypes,
  version,
  versionHistory
};

// --- Write to file ---
const outPath = path.resolve(__dirname, '../examples/core-data.json');
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`✅ Generated core-data.json with ${tokens.length} tokens.`); 