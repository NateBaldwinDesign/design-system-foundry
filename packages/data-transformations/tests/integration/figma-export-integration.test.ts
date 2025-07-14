import { FigmaTransformer } from '../../src/transformers/figma';
import type { TokenSystem } from '@token-model/data-model';
import * as fs from 'fs';
import * as path from 'path';

describe('Figma Export Integration', () => {
  let transformer: FigmaTransformer;
  let minimalData: TokenSystem;

  beforeAll(() => {
    // Load canonical example data
    const minimalDataPath = path.resolve(__dirname, '../../../data-model/examples/unthemed/example-minimal-data.json');
    const data = fs.readFileSync(minimalDataPath, 'utf8');
    minimalData = JSON.parse(data);
    transformer = new FigmaTransformer();
  });

  describe('Accent text color token with daisy-chaining', () => {
    it('should create proper daisy-chain structure for multi-dimensional token', async () => {
      const result = await transformer.transform(minimalData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (!result.data) return;

      // Find the "Accent text color" token variables
      const accentTextVariables = result.data.variables.filter(v => 
        v.name.includes('Accent') || v.name.includes('Accent text color')
      );

      console.log('Accent text variables found:', accentTextVariables.map(v => ({
        name: v.name,
        collectionId: v.variableCollectionId,
        action: v.action
      })));

      // Should have multiple variables due to daisy-chaining:
      // 1. Intermediary variables for Color Scheme dimension
      // 2. Reference variable for Contrast dimension  
      // 3. Final token variable
      expect(accentTextVariables.length).toBeGreaterThan(1);

      // Check for Color Scheme intermediaries
      const colorSchemeIntermediaries = accentTextVariables.filter(v => 
        v.name.includes('Color Scheme') && v.variableCollectionId.includes('dimension')
      );
      expect(colorSchemeIntermediaries.length).toBeGreaterThan(0);

      // Check for Contrast reference variable
      const contrastReference = accentTextVariables.find(v => 
        v.name.includes('Contrast') && v.variableCollectionId.includes('dimension')
      );
      expect(contrastReference).toBeDefined();

      // Check for final token variable
      const finalTokenVariable = accentTextVariables.find(v => 
        !v.name.includes('Color Scheme') && !v.name.includes('Contrast') && 
        v.variableCollectionId.includes('tokenCollection')
      );
      expect(finalTokenVariable).toBeDefined();

      // Verify mode values are created correctly
      const accentTextModeValues = result.data.variableModeValues.filter(vmv => 
        accentTextVariables.some(v => v.id === vmv.variableId)
      );

      console.log('Accent text mode values found:', accentTextModeValues.length);
      expect(accentTextModeValues.length).toBeGreaterThan(0);

      // Check that some mode values are aliases (daisy-chaining)
      const aliasModeValues = accentTextModeValues.filter(vmv => 
        typeof vmv.value === 'object' && vmv.value !== null && 'type' in vmv.value && vmv.value.type === 'VARIABLE_ALIAS'
      );
      expect(aliasModeValues.length).toBeGreaterThan(0);
    });

    it('should handle default modes correctly in daisy-chaining', async () => {
      // Create a simplified token system with just the accent text color token
      const simplifiedData: TokenSystem = {
        ...minimalData,
        tokens: minimalData.tokens?.filter(t => t.displayName === 'Accent text color') || []
      };

      const result = await transformer.transform(simplifiedData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (!result.data) return;

      // Should still create proper daisy-chain structure even with single token
      const variables = result.data.variables;
      const modeValues = result.data.variableModeValues;

      console.log('Simplified test variables:', variables.map(v => ({
        name: v.name,
        collectionId: v.variableCollectionId,
        action: v.action
      })));

      // Should have at least 3 variables: intermediaries + reference + final
      expect(variables.length).toBeGreaterThanOrEqual(3);

      // Should have mode values for all variables
      expect(modeValues.length).toBeGreaterThan(0);

      // Verify stats are calculated correctly
      expect(result.data.stats.created).toBeGreaterThan(0);
      expect(result.data.stats.collectionsCreated).toBeGreaterThan(0);
    });
  });

  describe('Export workflow compatibility', () => {
    it('should generate valid FigmaTransformationResult for export components', async () => {
      const result = await transformer.transform(minimalData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (!result.data) return;

      // Verify the result has all required properties for export components
      expect(result.data.variables).toBeDefined();
      expect(result.data.collections).toBeDefined();
      expect(result.data.variableModes).toBeDefined();
      expect(result.data.variableModeValues).toBeDefined();
      expect(result.data.stats).toBeDefined();

      // Verify stats structure
      expect(result.data.stats.created).toBeGreaterThanOrEqual(0);
      expect(result.data.stats.updated).toBeGreaterThanOrEqual(0);
      expect(result.data.stats.deleted).toBeGreaterThanOrEqual(0);
      expect(result.data.stats.collectionsCreated).toBeGreaterThanOrEqual(0);
      expect(result.data.stats.collectionsUpdated).toBeGreaterThanOrEqual(0);

      // Verify all variables have required properties
      for (const variable of result.data.variables) {
        expect(variable.action).toBeDefined();
        expect(variable.id).toBeDefined();
        expect(variable.name).toBeDefined();
        expect(variable.variableCollectionId).toBeDefined();
        expect(variable.resolvedType).toBeDefined();
        expect(variable.scopes).toBeDefined();
        expect(variable.hiddenFromPublishing).toBeDefined();
      }

      // Verify all collections have required properties
      for (const collection of result.data.collections) {
        expect(collection.action).toBeDefined();
        expect(collection.id).toBeDefined();
        expect(collection.name).toBeDefined();
        expect(collection.initialModeId).toBeDefined();
      }

      // Verify all mode values have required properties
      for (const modeValue of result.data.variableModeValues) {
        expect(modeValue.variableId).toBeDefined();
        expect(modeValue.modeId).toBeDefined();
        expect(modeValue.value).toBeDefined();
      }
    });

    it('should handle tokens without dimension dependencies', async () => {
      // Create a token system with only simple tokens (no dimensions)
      const simpleData: TokenSystem = {
        ...minimalData,
        dimensionOrder: [], // No dimensions
        tokens: minimalData.tokens?.slice(0, 2) || [] // Just first 2 tokens
      };

      const result = await transformer.transform(simpleData, {
        fileKey: 'test-file-key',
        accessToken: 'test-token'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (!result.data) return;

      // Should still generate valid structure
      expect(result.data.variables.length).toBeGreaterThan(0);
      expect(result.data.collections.length).toBeGreaterThan(0);
      expect(result.data.variableModeValues.length).toBeGreaterThan(0);
    });
  });
}); 