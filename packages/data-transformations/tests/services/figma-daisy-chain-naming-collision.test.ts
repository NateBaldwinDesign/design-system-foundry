// eslint-disable-next-line @typescript-eslint/no-var-requires
const exampleMinimalData = require('../../../data-model/examples/unthemed/example-minimal-data.json');

import { FigmaDaisyChainService } from '../../src/services/figma-daisy-chain';
import { FigmaIdManager } from '../../src/services/figma-id-manager';
import { FigmaValueConverter } from '../../src/services/figma-value-converter';
import type { TokenSystem, Token } from '@token-model/data-model';
import type { FigmaFileVariablesResponse } from '../../src/types/figma';

describe('FigmaDaisyChainService - Naming Collision Prevention', () => {
  let service: FigmaDaisyChainService;
  let idManager: FigmaIdManager;
  let valueConverter: FigmaValueConverter;
  let minimalData: TokenSystem;
  let accentTextColorToken: Token | undefined;
  let colorSchemeDimension: any;
  let contrastDimension: any;
  let colorCollection: any;

  beforeAll(() => {
    minimalData = exampleMinimalData;
    accentTextColorToken = minimalData.tokens.find((t: any) => t.displayName === 'Accent text color');
    colorSchemeDimension = minimalData.dimensions.find((d: any) => d.displayName === 'Color Scheme');
    contrastDimension = minimalData.dimensions.find((d: any) => d.displayName === 'Contrast');
    colorCollection = minimalData.tokenCollections.find((c: any) => c.name === 'Color');
    if (!accentTextColorToken) throw new Error('Accent text color token not found in example data');
    if (!colorSchemeDimension) throw new Error('Color Scheme dimension not found in example data');
    if (!contrastDimension) throw new Error('Contrast dimension not found in example data');
    idManager = new FigmaIdManager();
    valueConverter = new FigmaValueConverter();
    service = new FigmaDaisyChainService(idManager, valueConverter);
  });

  describe('naming collision prevention', () => {
    it('should reuse existing variables by name instead of creating duplicates', () => {
      // Simulate existing Figma variables with the same names as our intermediary variables
      const existingFigmaData: FigmaFileVariablesResponse = {
        variables: {
          'existing-var-1': {
            id: 'existing-var-1',
            name: 'Text/Accent (Color Scheme - Low)',
            variableCollectionId: colorSchemeDimension.id,
            resolvedType: 'COLOR',
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: true,
            action: 'UPDATE'
          },
          'existing-var-2': {
            id: 'existing-var-2',
            name: 'Text/Accent (Color Scheme - Regular)',
            variableCollectionId: colorSchemeDimension.id,
            resolvedType: 'COLOR',
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: true,
            action: 'UPDATE'
          },
          'existing-var-3': {
            id: 'existing-var-3',
            name: 'Text/Accent (Color Scheme - High)',
            variableCollectionId: colorSchemeDimension.id,
            resolvedType: 'COLOR',
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: true,
            action: 'UPDATE'
          },
          'existing-var-4': {
            id: 'existing-var-4',
            name: 'Text/Accent (Contrast)',
            variableCollectionId: contrastDimension.id,
            resolvedType: 'COLOR',
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: true,
            action: 'UPDATE'
          }
        },
        variableCollections: {
          [colorSchemeDimension.id]: {
            id: colorSchemeDimension.id,
            name: colorSchemeDimension.displayName,
            initialModeId: colorSchemeDimension.defaultMode,
            action: 'UPDATE'
          },
          [contrastDimension.id]: {
            id: contrastDimension.id,
            name: contrastDimension.displayName,
            initialModeId: contrastDimension.defaultMode,
            action: 'UPDATE'
          }
        }
      };

      // Initialize the ID manager with existing data
      idManager.initialize(existingFigmaData, {}, undefined);

      // Transform the token
      const result = service.transformTokenWithDaisyChaining(
        accentTextColorToken!,
        minimalData,
        { platformId: 'platform-000000', formattedName: 'Text/Accent' }
      );

      // Verify that existing variables are reused (UPDATE action) instead of creating new ones (CREATE action)
      const colorSchemeLowVar = result.variables.find(v => v.name === 'Text/Accent (Color Scheme - Low)');
      const colorSchemeRegularVar = result.variables.find(v => v.name === 'Text/Accent (Color Scheme - Regular)');
      const colorSchemeHighVar = result.variables.find(v => v.name === 'Text/Accent (Color Scheme - High)');
      const contrastVar = result.variables.find(v => v.name === 'Text/Accent (Contrast)');

      // These should be UPDATE actions because they already exist
      expect(colorSchemeLowVar?.action).toBe('UPDATE');
      expect(colorSchemeRegularVar?.action).toBe('UPDATE');
      expect(colorSchemeHighVar?.action).toBe('UPDATE');
      expect(contrastVar?.action).toBe('UPDATE');

      // The IDs should match the existing variable IDs
      expect(colorSchemeLowVar?.id).toBe('existing-var-1');
      expect(colorSchemeRegularVar?.id).toBe('existing-var-2');
      expect(colorSchemeHighVar?.id).toBe('existing-var-3');
      expect(contrastVar?.id).toBe('existing-var-4');

      // The final token variable should still be CREATE since it doesn't exist
      const finalTokenVar = result.variables.find(v => v.name === 'Text/Accent');
      expect(finalTokenVar?.action).toBe('CREATE');
    });

    it('should handle mixed existing and new variables correctly', () => {
      // Use the "Accent text color" token but only simulate one existing intermediary
      const existingFigmaData: FigmaFileVariablesResponse = {
        variables: {
          'existing-var-1': {
            id: 'existing-var-1',
            name: 'Text/Accent (Color Scheme - Low)',
            variableCollectionId: colorSchemeDimension.id,
            resolvedType: 'COLOR',
            scopes: ['ALL_SCOPES'],
            hiddenFromPublishing: true,
            action: 'UPDATE'
          }
        },
        variableCollections: {
          [colorSchemeDimension.id]: {
            id: colorSchemeDimension.id,
            name: colorSchemeDimension.displayName,
            initialModeId: colorSchemeDimension.defaultMode,
            action: 'UPDATE'
          },
          [contrastDimension.id]: {
            id: contrastDimension.id,
            name: contrastDimension.displayName,
            initialModeId: contrastDimension.defaultMode,
            action: 'UPDATE'
          }
        }
      };

      // Initialize the ID manager with existing data
      idManager.initialize(existingFigmaData, {}, undefined);

      // Transform the token
      const result = service.transformTokenWithDaisyChaining(
        accentTextColorToken!,
        minimalData,
        { platformId: 'platform-000000', formattedName: 'Text/Accent' }
      );

      // Find the variables
      const colorSchemeLowVar = result.variables.find(v => v.name === 'Text/Accent (Color Scheme - Low)');
      const colorSchemeHighVar = result.variables.find(v => v.name === 'Text/Accent (Color Scheme - High)');
      const contrastVar = result.variables.find(v => v.name === 'Text/Accent (Contrast)');

      // The existing variable should be UPDATE
      expect(colorSchemeLowVar?.action).toBe('UPDATE');
      expect(colorSchemeLowVar?.id).toBe('existing-var-1');

      // The new variables should be CREATE
      expect(colorSchemeHighVar?.action).toBe('CREATE');
      expect(contrastVar?.action).toBe('CREATE');

      // New variables should have generated IDs (not existing ones)
      expect(colorSchemeHighVar?.id).not.toBe('existing-var-1');
      expect(contrastVar?.id).not.toBe('existing-var-1');
    });
  });
}); 