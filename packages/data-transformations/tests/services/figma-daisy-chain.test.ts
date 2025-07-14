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
      
      // Should create 6 intermediaries for Color Scheme (2 color modes × 3 contrast modes)
      expect(colorSchemeVariables).toHaveLength(6);
      
      // Check for specific intermediaries
      const expectedColorSchemeNames = [
        'Text/Accent (Color Scheme - Low)',
        'Text/Accent (Color Scheme - Regular)', 
        'Text/Accent (Color Scheme - High)',
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
      
      // Should create 2 intermediaries (light + regular default, dark + regular default)
      expect(colorSchemeVariables).toHaveLength(2);
      
      const expectedNames = [
        'Text/Accent (Color Scheme)', // light + regular default
        'Text/Accent (Color Scheme)'  // dark + regular default
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

      // Each color scheme variable should have exactly one mode value
      colorSchemeVariables.forEach(variable => {
        const modeValues = result.modeValues.filter(mv => mv.variableId === variable.id);
        expect(modeValues).toHaveLength(1);
      });

      // Check that the mode values contain the correct values
      const lightLowValue = result.modeValues.find(mv => 
        colorSchemeVariables.some(v => v.id === mv.variableId) && 
        mv.modeId === 'modeId-light'
      );
      
      expect(lightLowValue).toBeDefined();
      // Should reference the Blue 500 token
      expect(lightLowValue!.value).toEqual({
        type: 'VARIABLE_ALIAS',
        id: expect.any(String)
      });
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
      
      // Should create 2 intermediaries (light+low, dark+high)
      expect(colorSchemeVariables).toHaveLength(2);
      
      const expectedNames = [
        'Text/Accent (Color Scheme - Low)',   // light + low
        'Text/Accent (Color Scheme - High)'  // dark + high
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
}); 