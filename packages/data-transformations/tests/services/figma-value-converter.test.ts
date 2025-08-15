import { FigmaValueConverter } from '../../src/services/figma-value-converter';
import type { TokenSystem } from '@token-model/data-model';

describe('FigmaValueConverter', () => {
  let converter: FigmaValueConverter;
  let mockTokenSystem: TokenSystem;

  beforeEach(() => {
    converter = new FigmaValueConverter();
    mockTokenSystem = {
      systemName: 'Test System',
      systemId: 'test-system',
      version: '1.0.0',
      dimensions: [],
      tokenCollections: [],
      tokens: [],
      platforms: [],
      taxonomies: [],
      standardPropertyTypes: [],
      propertyTypes: [],
      resolvedValueTypes: [],
      componentProperties: [],
      componentCategories: [],
      components: [],
      versionHistory: []
    };
  });

  describe('Display-P3 color conversion', () => {
    it('should correctly convert Display-P3 colors when fileColorProfile is display-p3', () => {
      // Test the specific case mentioned in the issue
      const result = converter.convertToFigmaColor('color(display-p3 1 0 0)', 'display-p3');
      
      expect(result).toEqual({
        r: 1,
        g: 0,
        b: 0
      });
    });

    it('should handle Display-P3 colors with alpha when fileColorProfile is display-p3', () => {
      const result = converter.convertToFigmaColor('color(display-p3 1 0 0 / 0.5)', 'display-p3');
      
      expect(result).toEqual({
        r: 1,
        g: 0,
        b: 0,
        a: 0.5
      });
    });

    it('should handle object format with Display-P3 colors when fileColorProfile is display-p3', () => {
      const result = converter.convertToFigmaColor({ value: 'color(display-p3 1 0 0)' }, 'display-p3');
      
      expect(result).toEqual({
        r: 1,
        g: 0,
        b: 0
      });
    });

    it('should convert Display-P3 colors to sRGB when fileColorProfile is srgb', () => {
      const result = converter.convertToFigmaColor('color(display-p3 1 0 0)', 'srgb');
      
      // Display-P3 to sRGB conversion should now be clamped to 0-1 range
      // using colorjs.io's toGamut() function
      expect(typeof result.r).toBe('number');
      expect(typeof result.g).toBe('number');
      expect(typeof result.b).toBe('number');
      expect(result.r).not.toBeNaN();
      expect(result.g).not.toBeNaN();
      expect(result.b).not.toBeNaN();
      
      // Values should be clamped to 0-1 range
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.g).toBeGreaterThanOrEqual(0);
      expect(result.b).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(1);
      expect(result.g).toBeLessThanOrEqual(1);
      expect(result.b).toBeLessThanOrEqual(1);
      
      // The values should be different from the original P3 values
      expect(result.r).not.toBe(1);
      expect(result.g).not.toBe(0);
      expect(result.b).not.toBe(0);
    });

    it('should clamp out-of-gamut Display-P3 colors when converting to sRGB', () => {
      // This is a known out-of-gamut Display-P3 color (bright cyan)
      const result = converter.convertToFigmaColor('color(display-p3 0 1 1)', 'srgb');
      
      // Values should be clamped to 0-1 range
      expect(result.r).toBeGreaterThanOrEqual(0);
      expect(result.g).toBeGreaterThanOrEqual(0);
      expect(result.b).toBeGreaterThanOrEqual(0);
      expect(result.r).toBeLessThanOrEqual(1);
      expect(result.g).toBeLessThanOrEqual(1);
      expect(result.b).toBeLessThanOrEqual(1);
      
      // The values should be valid numbers
      expect(result.r).not.toBeNaN();
      expect(result.g).not.toBeNaN();
      expect(result.b).not.toBeNaN();
    });
  });
});
