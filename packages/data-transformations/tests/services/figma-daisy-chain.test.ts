import { FigmaDaisyChainService } from '../../src/services/figma-daisy-chain';
import { FigmaIdManager } from '../../src/services/figma-id-manager';
import { FigmaValueConverter } from '../../src/services/figma-value-converter';
import type { TokenSystem, Token } from '@token-model/data-model';
import * as fs from 'fs';
import * as path from 'path';

describe('FigmaDaisyChainService', () => {
  let service: FigmaDaisyChainService;
  let idManager: FigmaIdManager;
  let valueConverter: FigmaValueConverter;
  let minimalData: TokenSystem;
  let accentTextColorToken: Token;

  beforeAll(() => {
    // Load canonical example data
    const minimalDataPath = path.resolve(__dirname, '../../../data-model/examples/unthemed/example-minimal-data.json');
    minimalData = JSON.parse(fs.readFileSync(minimalDataPath, 'utf-8'));
    
    // Find the "Accent text color" token
    accentTextColorToken = minimalData.tokens.find(t => t.displayName === 'Accent text color')!;
    
    idManager = new FigmaIdManager();
    valueConverter = new FigmaValueConverter();
    service = new FigmaDaisyChainService(idManager, valueConverter);
  });

  describe('transformTokenWithDaisyChaining - Accent text color', () => {
    it('should create proper intermediaries for multi-dimensional mode combinations', () => {
      const figmaCodeSyntax = { platformId: 'platform-000000', formattedName: 'Text/Accent' };
      
      const result = service.transformTokenWithDaisyChaining(
        accentTextColorToken,
        minimalData,
        figmaCodeSyntax
      );

      console.log('Generated variables:', result.variables.map(v => ({ name: v.name, collectionId: v.variableCollectionId })));
      console.log('Generated mode values:', result.modeValues.length);

      // Should create intermediaries for Color Scheme dimension
      const colorSchemeVariables = result.variables.filter(v => 
        v.variableCollectionId === 'dimensionId-0000-0000-0000' && 
        v.name.includes('Color Scheme')
      );
      
      // Should create 3 intermediaries for Color Scheme (one for each contrast mode)
      expect(colorSchemeVariables).toHaveLength(3);
      
      // Check for specific intermediaries
      const expectedColorSchemeNames = [
        'Text/Accent (Color Scheme - Low)',
        'Text/Accent (Color Scheme - Regular)', 
        'Text/Accent (Color Scheme - High)'
      ];
      
      const actualNames = colorSchemeVariables.map(v => v.name);
      expectedColorSchemeNames.forEach(expectedName => {
        expect(actualNames).toContain(expectedName);
      });

      // Should create reference variables for Contrast dimension
      const contrastVariables = result.variables.filter(v => 
        v.variableCollectionId === 'dimensionId-1111-1111-1111' && 
        v.name.includes('Contrast')
      );
      
      // Should create 1 reference variable for Contrast
      expect(contrastVariables).toHaveLength(1);
      expect(contrastVariables[0].name).toBe('Text/Accent (Contrast)');

      // Should create final token variable
      const finalVariables = result.variables.filter(v => 
        v.variableCollectionId === 'tokenCollection-AAAA-AAAA-AAAA' && 
        !v.name.includes('Color Scheme') && 
        !v.name.includes('Contrast')
      );
      
      expect(finalVariables).toHaveLength(1);
      expect(finalVariables[0].name).toBe('Text/Accent');

      // Check mode values for proper aliasing
      const contrastModeValues = result.modeValues.filter(mv => 
        contrastVariables.some(v => v.id === mv.variableId)
      );
      
      // Should have mode values for each contrast mode
      expect(contrastModeValues).toHaveLength(3);
      
      // Each contrast mode should alias to the appropriate color scheme variable
      const lowModeValue = contrastModeValues.find(mv => mv.modeId === 'modeId-low');
      const regularModeValue = contrastModeValues.find(mv => mv.modeId === 'modeId-regular');
      const highModeValue = contrastModeValues.find(mv => mv.modeId === 'modeId-high');
      
      expect(lowModeValue).toBeDefined();
      expect(regularModeValue).toBeDefined();
      expect(highModeValue).toBeDefined();
      
      // Check that they alias to different color scheme variables
      const aliasedIds = [
        (lowModeValue!.value as any).id, 
        (regularModeValue!.value as any).id, 
        (highModeValue!.value as any).id
      ];
      expect(new Set(aliasedIds).size).toBe(3); // All should be different
    });

    it('should handle default modes correctly', () => {
      // Create a token that only has ["light"] but not ["light", "regular"]
      const tokenWithDefaults = {
        ...accentTextColorToken,
        valuesByMode: [
          {
            modeIds: ["modeId-light"],
            value: { value: "#4C6FFE" }
          },
          {
            modeIds: ["modeId-dark"],
            value: { value: "#346EF9" }
          }
        ]
      };

      const figmaCodeSyntax = { platformId: 'platform-000000', formattedName: 'Text/Accent' };
      
      const result = service.transformTokenWithDaisyChaining(
        tokenWithDefaults,
        minimalData,
        figmaCodeSyntax
      );

      // Should expand to include default modes
      const colorSchemeVariables = result.variables.filter(v => 
        v.variableCollectionId === 'dimensionId-0000-0000-0000' && 
        v.name.includes('Color Scheme')
      );
      
      // Should create 1 intermediary (for the regular contrast mode)
      expect(colorSchemeVariables).toHaveLength(1);
      
      const expectedNames = [
        'Text/Accent (Color Scheme)' // regular contrast mode
      ];
      
      const actualNames = colorSchemeVariables.map(v => v.name);
      expectedNames.forEach(expectedName => {
        expect(actualNames).toContain(expectedName);
      });
    });

    it('should create proper mode value mappings', () => {
      const figmaCodeSyntax = { platformId: 'platform-000000', formattedName: 'Text/Accent' };
      
      const result = service.transformTokenWithDaisyChaining(
        accentTextColorToken,
        minimalData,
        figmaCodeSyntax
      );

      // Check that mode values are properly created for each variable
      const colorSchemeVariables = result.variables.filter(v => 
        v.variableCollectionId === 'dimensionId-0000-0000-0000' && 
        v.name.includes('Color Scheme')
      );

      // Each color scheme variable should have exactly two mode values (one for each color mode)
      colorSchemeVariables.forEach(variable => {
        const modeValues = result.modeValues.filter(mv => mv.variableId === variable.id);
        expect(modeValues).toHaveLength(2);
      });

      // Check that the mode values contain the correct values
      const lightLowValue = result.modeValues.find(mv => 
        colorSchemeVariables.some(v => v.id === mv.variableId) && 
        mv.modeId === 'modeId-light'
      );
      
      expect(lightLowValue).toBeDefined();
      // Should either reference a token or have a direct color value
      if (lightLowValue!.value && typeof lightLowValue!.value === 'object' && 'type' in lightLowValue!.value) {
        // Token reference
        expect(lightLowValue!.value).toEqual({
          type: 'VARIABLE_ALIAS',
          id: expect.any(String)
        });
      } else {
        // Direct color value
        expect(lightLowValue!.value).toHaveProperty('r');
        expect(lightLowValue!.value).toHaveProperty('g');
        expect(lightLowValue!.value).toHaveProperty('b');
      }
    });
  });

  describe('mode combination handling', () => {
    it('should expand mode combinations with default modes', () => {
      const tokenWithPartialModes = {
        ...accentTextColorToken,
        valuesByMode: [
          {
            modeIds: ["modeId-light", "modeId-low"],
            value: { value: "#FF0000" }
          },
          {
            modeIds: ["modeId-dark", "modeId-high"],
            value: { value: "#00FF00" }
          }
        ]
      };

      const figmaCodeSyntax = { platformId: 'platform-000000', formattedName: 'Text/Accent' };
      
      const result = service.transformTokenWithDaisyChaining(
        tokenWithPartialModes,
        minimalData,
        figmaCodeSyntax
      );

      // Should create intermediaries for the explicit combinations
      const colorSchemeVariables = result.variables.filter(v => 
        v.variableCollectionId === 'dimensionId-0000-0000-0000' && 
        v.name.includes('Color Scheme')
      );
      
      // Should create 3 intermediaries (low, regular, high) - one for each contrast mode
      expect(colorSchemeVariables).toHaveLength(3);
      
      const expectedNames = [
        'Text/Accent (Color Scheme - Low)',     // low contrast
        'Text/Accent (Color Scheme - Regular)', // regular contrast
        'Text/Accent (Color Scheme - High)'     // high contrast
      ];
      
      const actualNames = colorSchemeVariables.map(v => v.name);
      expectedNames.forEach(expectedName => {
        expect(actualNames).toContain(expectedName);
      });
    });
  });

  describe('error handling', () => {
    it('should handle tokens without dimension dependencies', () => {
      const simpleToken = {
        ...accentTextColorToken,
        valuesByMode: [
          {
            modeIds: [],
            value: { value: "#000000" }
          }
        ]
      };

      const figmaCodeSyntax = { platformId: 'platform-000000', formattedName: 'Simple' };
      
      const result = service.transformTokenWithDaisyChaining(
        simpleToken,
        minimalData,
        figmaCodeSyntax
      );

      // Should create only one direct variable
      expect(result.variables).toHaveLength(1);
      expect(result.variables[0].name).toBe('Simple');
      expect(result.modeValues).toHaveLength(0); // No mode values for direct variables
    });
  });

  describe('intermediary variable creation validation', () => {
    it('should create intermediary variables with correct structure and properties', () => {
      const figmaCodeSyntax = { platformId: 'platform-000000', formattedName: 'Text/Accent' };
      
      const result = service.transformTokenWithDaisyChaining(
        accentTextColorToken,
        minimalData,
        figmaCodeSyntax
      );

      console.log('=== COMPREHENSIVE VALIDATION ===');
      console.log('Total variables created:', result.variables.length);
      console.log('Total mode values created:', result.modeValues.length);
      
      // Log all variables with their details
      result.variables.forEach((variable, index) => {
        console.log(`Variable ${index + 1}:`, {
          name: variable.name,
          id: variable.id,
          action: variable.action,
          variableCollectionId: variable.variableCollectionId,
          resolvedType: variable.resolvedType,
          scopes: variable.scopes,
          hiddenFromPublishing: variable.hiddenFromPublishing
        });
      });

      // Validate that we have the expected number of variables
      // Should have: 3 intermediaries + 1 reference + 1 final = 5 total
      expect(result.variables).toHaveLength(5);

      // Validate intermediary variables for Color Scheme dimension
      const colorSchemeIntermediaries = result.variables.filter(v => 
        v.variableCollectionId === 'dimensionId-0000-0000-0000' && 
        v.name.includes('Color Scheme')
      );
      
      expect(colorSchemeIntermediaries).toHaveLength(3);
      
      // Validate each intermediary has correct properties
      colorSchemeIntermediaries.forEach(intermediary => {
        expect(intermediary.action).toBe('CREATE');
        expect(intermediary.resolvedType).toBe('COLOR');
        expect(intermediary.scopes).toEqual(['ALL_SCOPES']);
        expect(intermediary.hiddenFromPublishing).toBe(true);
        expect(intermediary.variableCollectionId).toBe('dimensionId-0000-0000-0000');
        expect(intermediary.name).toMatch(/Text\/Accent \(Color Scheme - (Low|Regular|High)\)/);
      });

      // Validate reference variable for Contrast dimension
      const contrastReference = result.variables.find(v => 
        v.variableCollectionId === 'dimensionId-1111-1111-1111' && 
        v.name.includes('Contrast')
      );
      
      expect(contrastReference).toBeDefined();
      expect(contrastReference!.action).toBe('CREATE');
      expect(contrastReference!.resolvedType).toBe('COLOR');
      expect(contrastReference!.scopes).toEqual(['ALL_SCOPES']);
      expect(contrastReference!.hiddenFromPublishing).toBe(true);
      expect(contrastReference!.name).toBe('Text/Accent (Contrast)');

      // Validate final token variable
      const finalToken = result.variables.find(v => 
        v.variableCollectionId === 'tokenCollection-AAAA-AAAA-AAAA' && 
        !v.name.includes('Color Scheme') && 
        !v.name.includes('Contrast')
      );
      
      expect(finalToken).toBeDefined();
      expect(finalToken!.action).toBe('CREATE');
      expect(finalToken!.resolvedType).toBe('COLOR');
      expect(finalToken!.scopes).toEqual(['ALL_SCOPES']);
      expect(finalToken!.hiddenFromPublishing).toBe(false); // Final token should be visible
      expect(finalToken!.name).toBe('Text/Accent');

      // Validate mode values
      console.log('Mode values by variable:');
      result.variables.forEach(variable => {
        const modeValues = result.modeValues.filter(mv => mv.variableId === variable.id);
        console.log(`  ${variable.name}: ${modeValues.length} mode values`);
        modeValues.forEach(mv => {
          console.log(`    - Mode: ${mv.modeId}, Value:`, mv.value);
        });
      });

      // Each intermediary should have 2 mode values (light and dark)
      colorSchemeIntermediaries.forEach(intermediary => {
        const modeValues = result.modeValues.filter(mv => mv.variableId === intermediary.id);
        expect(modeValues).toHaveLength(2);
        
        // Should have one mode value for light and one for dark
        const modeIds = modeValues.map(mv => mv.modeId);
        expect(modeIds).toContain('modeId-light');
        expect(modeIds).toContain('modeId-dark');
      });

      // Reference variable should have 3 mode values (low, regular, high)
      const contrastModeValues = result.modeValues.filter(mv => mv.variableId === contrastReference!.id);
      expect(contrastModeValues).toHaveLength(3);
      
      const contrastModeIds = contrastModeValues.map(mv => mv.modeId);
      expect(contrastModeIds).toContain('modeId-low');
      expect(contrastModeIds).toContain('modeId-regular');
      expect(contrastModeIds).toContain('modeId-high');

      console.log('=== VALIDATION COMPLETE ===');
    });
  });
}); 