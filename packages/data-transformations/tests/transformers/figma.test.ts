/**
 * @jest-environment node
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const exampleMinimalData = require('../../../data-model/examples/unthemed/example-minimal-data.json');

import { FigmaTransformer } from '../../src/transformers/figma';
import type { TokenSystem } from '@token-model/data-model';

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
      expect(info.requiredOptions).toHaveLength(0);
    });
  });

  describe('validate', () => {
    it('should validate empty input', async () => {
      const result = await transformer.validate({} as TokenSystem);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate example minimal data', async () => {
      const result = await transformer.validate(exampleMinimalData);
      if (!result.isValid) {
        console.log('Validation errors:', result.errors);
      }
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate Figma options', async () => {
      const result = await transformer.validate(exampleMinimalData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });
      if (!result.isValid) {
        console.log('Validation errors:', result.errors);
      }
      expect(result.isValid).toBe(true);
    });

    it('should warn about missing Figma options but not fail validation', async () => {
      const result = await transformer.validate(exampleMinimalData, {
        fileKey: '',
        accessToken: ''
      });
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'MISSING_FIGMA_CREDENTIALS')).toBe(true);
    });
  });

  describe('transform', () => {
    it('should transform the example minimal data', async () => {
      const result = await transformer.transform(exampleMinimalData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });
      if (!result.success) {
        console.error('Transformer failed with error:', result.error);
        if (result.error?.details?.validationErrors) {
          console.error('Validation errors:', JSON.stringify(result.error.details.validationErrors, null, 2));
        }
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

    it('should handle tokens without Figma code syntax', async () => {
      // Clone example data - codeSyntax has been removed from schema
      const testData: TokenSystem = JSON.parse(JSON.stringify(exampleMinimalData));
      
      // Note: codeSyntax is no longer part of the schema, so this test is now about
      // handling tokens that don't have platform extensions for Figma

      const result = await transformer.transform(testData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });

      if (!result.success) {
        console.error('Transformer failed with error:', result.error);
        if (result.error?.details?.validationErrors) {
          console.error('Validation errors:', JSON.stringify(result.error.details.validationErrors, null, 2));
        }
      }

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        // Should still create variables since codeSyntax is now generated on-demand
        expect(result.data.variables.length).toBeGreaterThan(0);
      }
    });

    it('should handle alias tokens', async () => {
      // Clone example data and create an alias token
      const testData: TokenSystem = JSON.parse(JSON.stringify(exampleMinimalData));
      
      // Find a color token to reference
      const baseToken = testData.tokens.find((t: any) => t.resolvedValueTypeId === 'color');
      expect(baseToken).toBeDefined();
      
      // Create an alias token that references the base token
      const aliasToken = {
        id: 'alias-token-test',
        displayName: 'Alias Color',
        description: 'Alias to base color',
        resolvedValueTypeId: 'color',
        private: false,
        status: 'stable' as const,
        tokenTier: 'SEMANTIC' as const,
        themeable: false,
        generatedByAlgorithm: false,
        taxonomies: [],
        propertyTypes: [],
        // Note: codeSyntax has been removed from schema - it's now generated on-demand
        valuesByMode: [
          {
            modeIds: [],
            value: { tokenId: baseToken!.id }
          }
        ]
      };
      
      testData.tokens.push(aliasToken);

      const result = await transformer.transform(testData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });

      if (!result.success) {
        console.error('Transformer failed with error:', result.error);
        if (result.error?.details?.validationErrors) {
          console.error('Validation errors:', JSON.stringify(result.error.details.validationErrors, null, 2));
        }
      }

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        // Should create variables for both tokens
        expect(result.data.variables.length).toBeGreaterThan(0);
      }
    });

    it('should determine CREATE vs UPDATE actions based on existing data', async () => {
      // Clone the example data
      const testData: any = JSON.parse(JSON.stringify(exampleMinimalData));
      
      // Pick real tokens from the example data that have Figma code syntax
      const mappedToken = testData.tokens.find((t: any) => t.id === 'token-8888-88888-88888'); // Blue/500
      const unmappedToken = testData.tokens.find((t: any) => t.id === 'token-9999-9999-9999'); // Text/Accent
      expect(mappedToken).toBeDefined();
      expect(unmappedToken).toBeDefined();
      
      // Set up tempToRealId mapping for the mapped token
      const tempToRealId = { 'token-8888-88888-88888': 'VariableID:123:456' };
      
      // Set up existing Figma data to indicate the mapped variable exists
      const existingFigmaData = {
        variables: {
          'VariableID:123:456': {
            id: 'VariableID:123:456',
            name: mappedToken.displayName
          } as any
        },
        variableCollections: {
          'collection-1': {
            id: 'collection-1',
            name: 'Color'
          } as any
        }
      };
      
      // Run the transformer
      const result = await transformer.transform(testData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token',
        tempToRealId,
        existingFigmaData
      });
      
      if (!result.success) {
        console.error('Transformer failed with error:', result.error);
        if (result.error?.details?.validationErrors) {
          console.error('Validation errors:', JSON.stringify(result.error.details.validationErrors, null, 2));
        }
      }
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        // Debug: Log all variables to see what's actually created
        console.log('All variables:', result.data.variables.map(v => ({ id: v.id, name: v.name, action: v.action })));
        
        // The mapped token should have UPDATE and the mapped Figma ID
        const mappedVar = result.data.variables.find(v => v.id === 'VariableID:123:456');
        if (!mappedVar) {
          console.log('Mapped variable not found. Looking for variables with mapped token name...');
          const mappedTokenName = mappedToken.displayName;
          const varsWithMappedName = result.data.variables.filter(v => v.name.includes(mappedTokenName));
          console.log('Variables with mapped token name:', varsWithMappedName);
        }
        expect(mappedVar?.action).toBe('UPDATE');
        
        // The unmapped token should have CREATE and its own ID
        const unmappedVar = result.data.variables.find(v => v.id === 'token-9999-9999-9999');
        if (!unmappedVar) {
          console.log('Unmapped variable not found. Looking for variables with unmapped token name...');
          const unmappedTokenName = unmappedToken.displayName;
          const varsWithUnmappedName = result.data.variables.filter(v => v.name.includes(unmappedTokenName));
          console.log('Variables with unmapped token name:', varsWithUnmappedName);
        }
        expect(unmappedVar?.action).toBe('CREATE');
      }
    });

    it('should support alpha values in colors', async () => {
      // Clone and modify example data to add alpha color
      const testData: TokenSystem = JSON.parse(JSON.stringify(exampleMinimalData));
      
      // Find a color token and modify its value to include alpha
      const colorToken = testData.tokens.find((t: any) => t.resolvedValueTypeId === 'color');
      expect(colorToken).toBeDefined();
      
      if (colorToken) {
        // Modify the first valueByMode to include alpha
        if (colorToken.valuesByMode[0] && 'value' in colorToken.valuesByMode[0].value) {
          colorToken.valuesByMode[0].value.value = '#FF000080'; // Red with 50% alpha
        }
      }
      
      const result = await transformer.transform(testData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        // Should create variables for color tokens
        expect(result.data.variables.length).toBeGreaterThan(0);
      }
    });

    it('should properly map token IDs to existing Figma variable IDs for aliases', async () => {
      // Clone example data and create an alias
      const testData: TokenSystem = JSON.parse(JSON.stringify(exampleMinimalData));
      
      // Find two tokens to work with
      const baseToken = testData.tokens[1]; // token-8888-88888-88888 (Blue 500)
      const aliasToken = testData.tokens[2]; // token-9999-9999-9999 (Accent text color)
      expect(baseToken).toBeDefined();
      expect(aliasToken).toBeDefined();
      
      // Make the third token an alias to the second
      if (aliasToken.valuesByMode[0]) {
        aliasToken.valuesByMode[0].value = { tokenId: baseToken.id };
      }
      
      // Set up existing Figma data to indicate the referenced variable exists
      const existingFigmaData = {
        variables: {
          'figma-var-123': {
            id: 'figma-var-123',
            name: baseToken.displayName
          } as any
        },
        variableCollections: {
          'figma-collection-123': {
            id: 'figma-collection-123',
            name: 'Test Collection',
            initialModeId: 'figma-mode-123',
            action: 'UPDATE' as const,
            modes: {
              'figma-mode-123': {
                name: 'Value',
                modeId: 'figma-mode-123'
              }
            }
          }
        }
      };
      
      // Use tempToRealId mapping to indicate existing Figma variable ID for the referenced token
      // Also map the collection ID to the Figma collection ID so initial mode IDs can be found
      const result = await transformer.transform(testData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token',
        tempToRealId: {
          [baseToken.id]: 'figma-var-123',
          'collection-66wmnw': 'figma-collection-123'  // Map collection ID to Figma collection ID
        },
        existingFigmaData
      });

      // Debug: Print the tempToRealId mapping from the idManager after initialization
      // @ts-ignore: Accessing private property for debugging
      if (transformer.idManager && typeof transformer.idManager.getTempToRealIdMapping === 'function') {
        // @ts-ignore
        const tempToRealIdDebug = transformer.idManager.getTempToRealIdMapping();
        console.log('DEBUG tempToRealId mapping after initialization:', tempToRealIdDebug);
      }
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        // Find the alias mode value that references the mapped Figma ID
        const aliasModeValue = result.data.variableModeValues.find(mv => 
          typeof mv.value === 'object' && mv.value !== null && 'type' in mv.value && mv.value.type === 'VARIABLE_ALIAS' &&
          (mv.value as any).id === 'figma-var-123'
        );
        expect(aliasModeValue).toBeDefined();
        
        // Verify the alias references the existing Figma variable ID, not the token ID
        if (aliasModeValue && typeof aliasModeValue.value === 'object' && aliasModeValue.value !== null) {
          const aliasValue = aliasModeValue.value as { type: 'VARIABLE_ALIAS'; id: string };
          expect(aliasValue.id).toBe('figma-var-123'); // Should use existing Figma ID
          expect(aliasValue.id).not.toBe(baseToken.id); // Should not use token ID
        }
      }
    });
  });

  describe('Color conversion', () => {
    it('should convert hex colors to 0-1 range RGB values', async () => {
      const result = await transformer.transform(exampleMinimalData, {
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
      // Create test data with alpha color
      const testData = JSON.parse(JSON.stringify(exampleMinimalData));
      const alphaToken = testData.tokens.find((t: any) => t.resolvedValueTypeId === 'color');
      expect(alphaToken).toBeDefined();
      
      if (alphaToken && alphaToken.valuesByMode[0] && 'value' in alphaToken.valuesByMode[0].value) {
        alphaToken.valuesByMode[0].value.value = '#ff000080'; // Red with 50% alpha
      }

      const result = await transformer.transform(testData, {
        fileKey: 'test-file',
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (!result.data) return;

      // Find the alpha color variable
      const alphaVariable = result.data.variables.find(v => v.resolvedType === 'COLOR');
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