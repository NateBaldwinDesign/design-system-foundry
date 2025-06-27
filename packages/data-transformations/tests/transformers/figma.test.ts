import { FigmaTransformer } from '../../src/transformers/figma';
import type { TokenSystem } from '@token-model/data-model';
import fs from 'fs';
import path from 'path';

// Load canonical example data for all tests
const minimalDataPath = path.resolve(__dirname, '../../../data-model/examples/unthemed/example-minimal-data.json');
const minimalData: TokenSystem = JSON.parse(fs.readFileSync(minimalDataPath, 'utf-8'));

describe('FigmaTransformer', () => {
  let transformer: FigmaTransformer;

  beforeEach(() => {
    transformer = new FigmaTransformer();
  });

  describe('constructor', () => {
    it('should create a transformer with correct properties', () => {
      expect(transformer.id).toBe('figma-variables');
      expect(transformer.displayName).toBe('Figma Variables');
      expect(transformer.description).toBe('Transform design tokens to Figma Variables API format');
      expect(transformer.version).toBe('1.0.0');
    });
  });

  describe('getInfo', () => {
    it('should return transformer information', () => {
      const info = transformer.getInfo();
      
      expect(info.id).toBe('figma-variables');
      expect(info.displayName).toBe('Figma Variables');
      expect(info.description).toBe('Transform design tokens to Figma Variables API format');
      expect(info.version).toBe('1.0.0');
      expect(info.supportedInputTypes).toContain('TokenSystem');
      expect(info.supportedOutputTypes).toContain('FigmaTransformationResult');
      // fileKey and accessToken are optional for export generation, only required for publishing
      expect(info.requiredOptions).toHaveLength(0);
    });
  });

  describe('validate', () => {
    it('should validate empty input', async () => {
      const result = await transformer.validate({} as TokenSystem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate core-data example', async () => {
      const result = await transformer.validate(minimalData);
      if (!result.isValid) {
        console.log('Validation errors:', result.errors);
      }
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Figma options', async () => {
      const result = await transformer.validate(minimalData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });
      if (!result.isValid) {
        console.log('Validation errors:', result.errors);
      }
      expect(result.isValid).toBe(true);
    });

    it('should warn about missing Figma options but not fail validation', async () => {
      const result = await transformer.validate(minimalData, {
        fileKey: '',
        accessToken: ''
      });
      // Validation should still pass, but with warnings
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'MISSING_FIGMA_CREDENTIALS')).toBe(true);
    });
  });

  describe('transform', () => {
    it('should transform the minimal example data', async () => {
      const result = await transformer.transform(minimalData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });
      if (!result.success) {
        console.log('Transform error:', result.error);
      }
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.collections.length).toBeGreaterThan(0);
        expect(result.data.variables.length).toBeGreaterThan(0);
        expect(result.data.stats.created).toBeGreaterThan(0);
        expect(result.data.stats.collectionsCreated).toBeGreaterThan(0);
      }
    });

    it('should transform a complete token system', async () => {
      const completeTokenSystem: TokenSystem = {
        systemId: 'design-system',
        systemName: 'Design System',
        version: '1.0.0',
        versionHistory: [],
        taxonomies: [],
        platforms: [
          {
            id: 'figma',
            displayName: 'Figma',
            description: 'Figma design tool'
          }
        ],
        resolvedValueTypes: [
          {
            id: 'color',
            displayName: 'Color',
            type: 'COLOR'
          },
          {
            id: 'spacing',
            displayName: 'Spacing',
            type: 'SPACING'
          }
        ],
        dimensions: [
          {
            id: 'theme',
            displayName: 'Theme',
            description: 'Light and dark themes',
            modes: [
              {
                id: 'light',
                name: 'Light',
                dimensionId: 'theme'
              },
              {
                id: 'dark',
                name: 'Dark',
                dimensionId: 'theme'
              }
            ],
            required: true,
            defaultMode: 'light'
          }
        ],
        tokenCollections: [
          {
            id: 'colors',
            name: 'Colors',
            description: 'Color tokens',
            resolvedValueTypeIds: ['color'],
            private: false
          },
          {
            id: 'spacing',
            name: 'Spacing',
            description: 'Spacing tokens',
            resolvedValueTypeIds: ['spacing'],
            private: false
          }
        ],
        tokens: [
          {
            id: 'primary-color',
            displayName: 'Primary Color',
            description: 'Primary brand color',
            resolvedValueTypeId: 'color',
            tokenCollectionId: 'colors',
            tokenTier: "PRIMITIVE",
            private: false,
            themeable: false,
            generatedByAlgorithm: false,
            taxonomies: [],
            propertyTypes: [],
            valuesByMode: [
              {
                modeIds: ['light'],
                value: { value: '#007AFF' }
              },
              {
                modeIds: ['dark'],
                value: { value: '#0A84FF' }
              }
            ],
            codeSyntax: [
              {
                platformId: 'figma',
                formattedName: 'primary-color'
              }
            ]
          },
          {
            id: 'spacing-small',
            displayName: 'Small Spacing',
            description: 'Small spacing unit',
            resolvedValueTypeId: 'spacing',
            tokenCollectionId: 'spacing',
            tokenTier: "PRIMITIVE",
            private: false,
            themeable: false,
            generatedByAlgorithm: false,
            taxonomies: [],
            propertyTypes: [],
            valuesByMode: [
              {
                modeIds: [],
                value: { value: '8px' }
              }
            ],
            codeSyntax: [
              {
                platformId: 'figma',
                formattedName: 'spacing-small'
              }
            ]
          }
        ]
      };

      const result = await transformer.transform(completeTokenSystem, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        // Should create collections for each dimension
        expect(result.data.collections.length).toBeGreaterThan(0);
        
        // Should create variables for tokens with Figma code syntax
        expect(result.data.variables.length).toBeGreaterThan(0);
        
        // Should have statistics
        expect(result.data.stats.created).toBeGreaterThan(0);
        expect(result.data.stats.collectionsCreated).toBeGreaterThan(0);
      }
    });

    it('should handle tokens without Figma code syntax', async () => {
      const tokenSystemWithoutFigma: TokenSystem = {
        systemId: 'test-system',
        systemName: 'Test System',
        version: '1.0.0',
        versionHistory: [],
        taxonomies: [],
        platforms: [
          {
            id: 'web',
            displayName: 'Web'
          }
        ],
        resolvedValueTypes: [
          {
            id: 'color',
            displayName: 'Color',
            type: 'COLOR'
          }
        ],
        dimensions: [
          {
            id: 'theme',
            displayName: 'Theme',
            modes: [
              { id: 'light', name: 'Light', dimensionId: 'theme' }
            ],
            required: true,
            defaultMode: 'light',
            resolvedValueTypeIds: ['color']
          }
        ],
        tokenCollections: [
          {
            id: 'colors',
            name: 'Colors',
            resolvedValueTypeIds: ['color'],
            private: false
          }
        ],
        tokens: [
          {
            id: 'test-color',
            displayName: 'Test Color',
            resolvedValueTypeId: 'color',
            tokenCollectionId: 'colors',
            tokenTier: "PRIMITIVE",
            private: false,
            themeable: false,
            generatedByAlgorithm: false,
            taxonomies: [],
            propertyTypes: [],
            valuesByMode: [
              {
                modeIds: ['light'],
                value: { value: '#FF0000' }
              }
            ],
            codeSyntax: [] // No Figma code syntax
          }
        ]
      };

      const result = await transformer.transform(tokenSystemWithoutFigma, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });

      if (!result.success) {
        console.log('Transform error:', result.error);
        console.log('Validation errors details:', JSON.stringify(result.error?.details?.validationErrors, null, 2));
      }

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        // Should not create variables for tokens without Figma code syntax
        expect(result.data.variables.length).toBe(0);
        expect(result.data.stats.created).toBe(0);
      }
    });

    it('should handle alias tokens', async () => {
      const tokenSystemWithAlias: TokenSystem = {
        systemId: 'test-system',
        systemName: 'Test System',
        version: '1.0.0',
        versionHistory: [],
        taxonomies: [],
        platforms: [
          {
            id: 'figma',
            displayName: 'Figma'
          }
        ],
        resolvedValueTypes: [
          {
            id: 'color',
            displayName: 'Color',
            type: 'COLOR'
          }
        ],
        dimensions: [
          {
            id: 'theme',
            displayName: 'Theme',
            modes: [
              { id: 'light', name: 'Light', dimensionId: 'theme' }
            ],
            required: true,
            defaultMode: 'light',
            resolvedValueTypeIds: ['color']
          }
        ],
        tokenCollections: [
          {
            id: 'colors',
            name: 'Colors',
            resolvedValueTypeIds: ['color'],
            private: false
          }
        ],
        tokens: [
          {
            id: 'base-color',
            displayName: 'Base Color',
            resolvedValueTypeId: 'color',
            tokenCollectionId: 'colors',
            tokenTier: "PRIMITIVE",
            private: false,
            themeable: false,
            generatedByAlgorithm: false,
            taxonomies: [],
            propertyTypes: [],
            valuesByMode: [
              {
                modeIds: ['light'],
                value: { value: '#007AFF' }
              }
            ],
            codeSyntax: [
              {
                platformId: 'figma',
                formattedName: 'base-color'
              }
            ]
          },
          {
            id: 'alias-color',
            displayName: 'Alias Color',
            resolvedValueTypeId: 'color',
            tokenCollectionId: 'colors',
            tokenTier: "SEMANTIC",
            private: false,
            themeable: false,
            generatedByAlgorithm: false,
            taxonomies: [],
            propertyTypes: [],
            valuesByMode: [
              {
                modeIds: ['light'],
                value: { tokenId: 'base-color' } // Alias to base-color
              }
            ],
            codeSyntax: [
              {
                platformId: 'figma',
                formattedName: 'alias-color'
              }
            ]
          }
        ]
      };

      const result = await transformer.transform(tokenSystemWithAlias, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });

      if (!result.success) {
        console.log('Transform error:', result.error);
        console.log('Validation errors details:', JSON.stringify(result.error?.details?.validationErrors, null, 2));
      }

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        // Should create variables for both tokens
        expect(result.data.variables.length).toBeGreaterThan(0);
      }
    });

    it('should determine CREATE vs UPDATE actions based on existing data', async () => {
      const tokenSystem: TokenSystem = {
        systemId: 'test-system',
        systemName: 'Test System',
        version: '1.0.0',
        versionHistory: [],
        taxonomies: [],
        platforms: [
          {
            id: 'figma',
            displayName: 'Figma'
          }
        ],
        resolvedValueTypes: [
          {
            id: 'color',
            displayName: 'Color',
            type: 'COLOR'
          }
        ],
        dimensions: [
          {
            id: 'theme',
            displayName: 'Theme',
            modes: [
              { id: 'light', name: 'Light', dimensionId: 'theme' }
            ],
            required: true,
            defaultMode: 'light',
            resolvedValueTypeIds: ['color']
          }
        ],
        tokenCollections: [
          {
            id: 'colors',
            name: 'Colors',
            resolvedValueTypeIds: ['color'],
            private: false
          }
        ],
        tokens: [
          {
            id: 'test-color',
            displayName: 'Test Color',
            resolvedValueTypeId: 'color',
            tokenCollectionId: 'colors',
            tokenTier: "PRIMITIVE",
            private: false,
            themeable: false,
            generatedByAlgorithm: false,
            taxonomies: [],
            propertyTypes: [],
            valuesByMode: [
              {
                modeIds: ['light'],
                value: { value: '#FF0000' }
              }
            ],
            codeSyntax: [
              {
                platformId: 'figma',
                formattedName: 'test-color'
              }
            ]
          }
        ]
      };

      // Mock existing Figma data with one matching collection and variable
      const existingFigmaData: import('../../src/types/figma').FigmaFileVariablesResponse = {
        variableCollections: {
          'figma-collection-id': {
            action: 'UPDATE',
            id: 'figma-collection-id',
            name: 'Colors',
            initialModeId: 'mode-colors'
          }
        },
        variables: {
          'figma-variable-id': {
            action: 'UPDATE',
            id: 'figma-variable-id',
            name: 'test-color',
            variableCollectionId: 'figma-collection-id',
            resolvedType: 'COLOR',
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: false
          }
        }
      };

      const result = await transformer.transform(tokenSystem, {
        fileKey: 'test-file-key',
        accessToken: 'test-token',
        existingFigmaData
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        // Should have collections with UPDATE action for existing items
        const colorsCollection = result.data.collections.find(c => c.name === 'Colors');
        expect(colorsCollection?.action).toBe('UPDATE');
        expect(colorsCollection?.id).toBe('figma-collection-id');

        // Should have variables with UPDATE action for existing items
        const testColorVariable = result.data.variables.find(v => v.name === 'test-color');
        expect(testColorVariable?.action).toBe('UPDATE');
        expect(testColorVariable?.id).toBe('figma-variable-id');

        // Should have CREATE action for new items
        const themeCollection = result.data.collections.find(c => c.name === 'Theme');
        expect(themeCollection?.action).toBe('CREATE');
      }
    });

    it('should support alpha values in colors (by modifying example data)', async () => {
      // Clone and inject an alpha color value
      const testData: TokenSystem = JSON.parse(JSON.stringify(minimalData));
      // Find a color token with a Figma codeSyntax entry
      const figmaPlatform = testData.platforms.find((p: any) => p.displayName === 'Figma');
      if (!figmaPlatform) throw new Error('Figma platform not found in test data');
      const colorToken = testData.tokens.find((t: any) => t.resolvedValueTypeId === 'color' && t.codeSyntax.some((cs: any) => cs.platformId === figmaPlatform.id));
      if (!colorToken) throw new Error('No color token with Figma codeSyntax found in test data');
      
      // Find a valueByMode entry with a single mode (e.g., 'light' or 'dark')
      const singleModeValue = colorToken.valuesByMode.find((vbm: any) => Array.isArray(vbm.modeIds) && vbm.modeIds.length === 1);
      if (!singleModeValue) {
        // If no single-mode entry exists, create one for testing
        const firstMode = testData.dimensions[0]?.modes[0];
        if (!firstMode) throw new Error('No modes found in test data');
        colorToken.valuesByMode.push({
          modeIds: [firstMode.id],
          value: { value: '#FF000080' }
        });
      } else if ('value' in singleModeValue.value) {
        singleModeValue.value.value = '#FF000080';
      }
      
      const result = await transformer.transform(testData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        // Find the color variable - use the Figma codeSyntax entry for the name
        const figmaSyntax = colorToken.codeSyntax.find((cs: any) => cs.platformId === figmaPlatform.id);
        if (!figmaSyntax) throw new Error('Figma codeSyntax not found in test data');
        const colorVariable = result.data.variables.find(v => v.name === figmaSyntax.formattedName);
        expect(colorVariable).toBeDefined();
      }
    });

    it('should properly map token IDs to existing Figma variable IDs for aliases (by modifying example data)', async () => {
      // Clone and inject an alias value
      const testData: TokenSystem = JSON.parse(JSON.stringify(minimalData));
      // Add an alias to the second token, referencing the first
      testData.tokens[1].valuesByMode[0].value = { tokenId: testData.tokens[0].id };
      // Simulate existing Figma data
      const existingData: import('../../src/types/figma').FigmaFileVariablesResponse = {
        variables: {
          'figma-var-123': {
            action: 'UPDATE',
            id: 'figma-var-123',
            name: testData.tokens[0].codeSyntax[0].formattedName,
            variableCollectionId: testData.tokenCollections[0].id,
            resolvedType: 'COLOR',
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: false
          }
        },
        variableCollections: {
          [testData.tokenCollections[0].id]: {
            action: 'UPDATE',
            id: testData.tokenCollections[0].id,
            name: testData.tokenCollections[0].name,
            initialModeId: testData.dimensions[0]?.defaultMode || ''
          }
        }
      };
      const result = await transformer.transform(testData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token',
        existingFigmaData: existingData
      });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        // Find the alias mode value
        const aliasModeValue = result.data.variableModeValues.find(mv => 
          typeof mv.value === 'object' && mv.value !== null && 'type' in mv.value && mv.value.type === 'VARIABLE_ALIAS'
        );
        expect(aliasModeValue).toBeDefined();
        // Verify the alias references the existing Figma variable ID, not the token ID
        if (aliasModeValue && typeof aliasModeValue.value === 'object' && aliasModeValue.value !== null) {
          const aliasValue = aliasModeValue.value as { type: 'VARIABLE_ALIAS'; id: string };
          expect(aliasValue.id).toBe('figma-var-123'); // Should use existing Figma ID
          expect(aliasValue.id).not.toBe(testData.tokens[0].id); // Should not use token ID
        }
      }
    });
  });

  describe('Color conversion', () => {
    it('should convert hex colors to 0-1 range RGB values', async () => {
      const transformer = new FigmaTransformer();
      
      // Test with a hex color
      const result = await transformer.transform(minimalData, {
        fileKey: 'test-file',
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (!result.data) return;

      // Find a color variable and check its value
      const colorVariable = result.data.variables.find(v => v.resolvedType === 'COLOR');
      expect(colorVariable).toBeDefined();

      // Check that the variable mode values have 0-1 range colors
      const colorModeValues = result.data.variableModeValues.filter(vmv => vmv.variableId === colorVariable?.id);
      expect(colorModeValues.length).toBeGreaterThan(0);

      for (const modeValue of colorModeValues) {
        if (typeof modeValue.value === 'object' && modeValue.value !== null && 'r' in modeValue.value) {
          const colorValue = modeValue.value as { r: number; g: number; b: number; a?: number };
          
          // Verify values are in 0-1 range
          expect(colorValue.r).toBeGreaterThanOrEqual(0);
          expect(colorValue.r).toBeLessThanOrEqual(1);
          expect(colorValue.g).toBeGreaterThanOrEqual(0);
          expect(colorValue.g).toBeLessThanOrEqual(1);
          expect(colorValue.b).toBeGreaterThanOrEqual(0);
          expect(colorValue.b).toBeLessThanOrEqual(1);
          
          if (colorValue.a !== undefined) {
            expect(colorValue.a).toBeGreaterThanOrEqual(0);
            expect(colorValue.a).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    it('should handle alpha colors correctly', async () => {
      const transformer = new FigmaTransformer();
      
      // Create test data with alpha color
      const testData = JSON.parse(JSON.stringify(minimalData));
      const alphaToken = testData.tokens.find((t: any) => t.resolvedValueTypeId === 'color');
      if (alphaToken) {
        alphaToken.valuesByMode[0].value = { value: '#ff000080' }; // Red with 50% alpha
      }

      const result = await transformer.transform(testData, {
        fileKey: 'test-file',
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (!result.data) return;

      // Find the alpha color variable
      const alphaVariable = result.data.variables.find(v => v.resolvedType === 'COLOR' && v.name.includes(alphaToken?.name || ''));
      expect(alphaVariable).toBeDefined();

      const alphaModeValues = result.data.variableModeValues.filter(vmv => vmv.variableId === alphaVariable?.id);
      expect(alphaModeValues.length).toBeGreaterThan(0);

      for (const modeValue of alphaModeValues) {
        if (typeof modeValue.value === 'object' && modeValue.value !== null && 'a' in modeValue.value) {
          const colorValue = modeValue.value as { r: number; g: number; b: number; a?: number };
          
          // Verify alpha is in 0-1 range
          expect(colorValue.a).toBeGreaterThanOrEqual(0);
          expect(colorValue.a).toBeLessThanOrEqual(1);
          expect(colorValue.a).toBeCloseTo(0.5, 2); // Should be approximately 0.5 (50% alpha)
        }
      }
    });
  });
}); 