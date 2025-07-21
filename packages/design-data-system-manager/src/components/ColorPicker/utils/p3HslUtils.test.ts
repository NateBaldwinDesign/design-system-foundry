import { describe, it, expect } from 'vitest';
import Color from 'colorjs.io';
import {
  p3RgbToHsl,
  p3HslToRgb,
  p3HslToColor,
  colorToP3Hsl,
  getP3HslChannelRange,
  isValidP3Hsl,
  clampP3Hsl,
  p3HslToNormalized,
  normalizedToP3Hsl,
  type P3HslCoords,
  type P3RgbCoords
} from './p3HslUtils';

describe('P3-HSL Utilities', () => {
  describe('p3RgbToHsl', () => {
    it('should convert pure red to correct HSL values', () => {
      const rgb: P3RgbCoords = { r: 1, g: 0, b: 0 };
      const hsl = p3RgbToHsl(rgb);
      
      expect(hsl.h).toBeCloseTo(0, 1);      // Red hue
      expect(hsl.s).toBeCloseTo(100, 1);    // Full saturation
      expect(hsl.l).toBeCloseTo(50, 1);     // Medium lightness
    });

    it('should convert pure green to correct HSL values', () => {
      const rgb: P3RgbCoords = { r: 0, g: 1, b: 0 };
      const hsl = p3RgbToHsl(rgb);
      
      expect(hsl.h).toBeCloseTo(120, 1);    // Green hue
      expect(hsl.s).toBeCloseTo(100, 1);    // Full saturation
      expect(hsl.l).toBeCloseTo(50, 1);     // Medium lightness
    });

    it('should convert pure blue to correct HSL values', () => {
      const rgb: P3RgbCoords = { r: 0, g: 0, b: 1 };
      const hsl = p3RgbToHsl(rgb);
      
      expect(hsl.h).toBeCloseTo(240, 1);    // Blue hue
      expect(hsl.s).toBeCloseTo(100, 1);    // Full saturation
      expect(hsl.l).toBeCloseTo(50, 1);     // Medium lightness
    });

    it('should convert white to correct HSL values', () => {
      const rgb: P3RgbCoords = { r: 1, g: 1, b: 1 };
      const hsl = p3RgbToHsl(rgb);
      
      expect(hsl.h).toBe(0);                // Undefined hue (set to 0)
      expect(hsl.s).toBe(0);                // No saturation
      expect(hsl.l).toBeCloseTo(100, 1);    // Full lightness
    });

    it('should convert black to correct HSL values', () => {
      const rgb: P3RgbCoords = { r: 0, g: 0, b: 0 };
      const hsl = p3RgbToHsl(rgb);
      
      expect(hsl.h).toBe(0);                // Undefined hue (set to 0)
      expect(hsl.s).toBe(0);                // No saturation
      expect(hsl.l).toBe(0);                // No lightness
    });

    it('should convert gray to correct HSL values', () => {
      const rgb: P3RgbCoords = { r: 0.5, g: 0.5, b: 0.5 };
      const hsl = p3RgbToHsl(rgb);
      
      expect(hsl.h).toBe(0);                // Undefined hue (set to 0)
      expect(hsl.s).toBe(0);                // No saturation
      expect(hsl.l).toBeCloseTo(50, 1);     // Medium lightness
    });

    it('should handle negative hue values correctly', () => {
      const rgb: P3RgbCoords = { r: 0, g: 0, b: 1 }; // Blue
      const hsl = p3RgbToHsl(rgb);
      
      expect(hsl.h).toBeGreaterThanOrEqual(0);
      expect(hsl.h).toBeLessThanOrEqual(360);
    });
  });

  describe('p3HslToRgb', () => {
    it('should convert pure red HSL to correct RGB values', () => {
      const hsl: P3HslCoords = { h: 0, s: 100, l: 50 };
      const rgb = p3HslToRgb(hsl);
      
      expect(rgb.r).toBeCloseTo(1, 3);
      expect(rgb.g).toBeCloseTo(0, 3);
      expect(rgb.b).toBeCloseTo(0, 3);
    });

    it('should convert pure green HSL to correct RGB values', () => {
      const hsl: P3HslCoords = { h: 120, s: 100, l: 50 };
      const rgb = p3HslToRgb(hsl);
      
      expect(rgb.r).toBeCloseTo(0, 3);
      expect(rgb.g).toBeCloseTo(1, 3);
      expect(rgb.b).toBeCloseTo(0, 3);
    });

    it('should convert pure blue HSL to correct RGB values', () => {
      const hsl: P3HslCoords = { h: 240, s: 100, l: 50 };
      const rgb = p3HslToRgb(hsl);
      
      expect(rgb.r).toBeCloseTo(0, 3);
      expect(rgb.g).toBeCloseTo(0, 3);
      expect(rgb.b).toBeCloseTo(1, 3);
    });

    it('should convert white HSL to correct RGB values', () => {
      const hsl: P3HslCoords = { h: 0, s: 0, l: 100 };
      const rgb = p3HslToRgb(hsl);
      
      expect(rgb.r).toBeCloseTo(1, 3);
      expect(rgb.g).toBeCloseTo(1, 3);
      expect(rgb.b).toBeCloseTo(1, 3);
    });

    it('should convert black HSL to correct RGB values', () => {
      const hsl: P3HslCoords = { h: 0, s: 0, l: 0 };
      const rgb = p3HslToRgb(hsl);
      
      expect(rgb.r).toBeCloseTo(0, 3);
      expect(rgb.g).toBeCloseTo(0, 3);
      expect(rgb.b).toBeCloseTo(0, 3);
    });

    it('should handle edge cases correctly', () => {
      // Lightness > 50%
      const hsl1: P3HslCoords = { h: 180, s: 100, l: 75 };
      const rgb1 = p3HslToRgb(hsl1);
      expect(rgb1.r).toBeGreaterThanOrEqual(0);
      expect(rgb1.r).toBeLessThanOrEqual(1);
      
      // Lightness < 50%
      const hsl2: P3HslCoords = { h: 180, s: 100, l: 25 };
      const rgb2 = p3HslToRgb(hsl2);
      expect(rgb2.r).toBeGreaterThanOrEqual(0);
      expect(rgb2.r).toBeLessThanOrEqual(1);
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain accuracy through RGB → HSL → RGB conversion', () => {
      const originalRgb: P3RgbCoords = { r: 0.8, g: 0.3, b: 0.9 };
      const hsl = p3RgbToHsl(originalRgb);
      const convertedRgb = p3HslToRgb(hsl);
      
      expect(convertedRgb.r).toBeCloseTo(originalRgb.r, 2);
      expect(convertedRgb.g).toBeCloseTo(originalRgb.g, 2);
      expect(convertedRgb.b).toBeCloseTo(originalRgb.b, 2);
    });

    it('should maintain accuracy through HSL → RGB → HSL conversion', () => {
      const originalHsl: P3HslCoords = { h: 280, s: 75, l: 60 };
      const rgb = p3HslToRgb(originalHsl);
      const convertedHsl = p3RgbToHsl(rgb);
      
      expect(convertedHsl.h).toBeCloseTo(originalHsl.h, 1);
      expect(convertedHsl.s).toBeCloseTo(originalHsl.s, 1);
      expect(convertedHsl.l).toBeCloseTo(originalHsl.l, 1);
    });
  });

  describe('p3HslToColor', () => {
    it('should create valid Color object from HSL coordinates', () => {
      const hsl: P3HslCoords = { h: 120, s: 100, l: 50 };
      const color = p3HslToColor(hsl);
      
      expect(color).toBeInstanceOf(Color);
      expect(color.space.id).toBe('p3');
    });

    it('should create color with correct coordinates', () => {
      const hsl: P3HslCoords = { h: 0, s: 100, l: 50 };
      const color = p3HslToColor(hsl);
      const [r, g, b] = color.coords;
      
      expect(r).toBeCloseTo(1, 3);
      expect(g).toBeCloseTo(0, 3);
      expect(b).toBeCloseTo(0, 3);
    });
  });

  describe('colorToP3Hsl', () => {
    it('should extract HSL coordinates from P3 color', () => {
      const color = new Color('p3', [1, 0, 0]); // Red in P3
      const hsl = colorToP3Hsl(color);
      
      expect(hsl.h).toBeCloseTo(0, 1);
      expect(hsl.s).toBeCloseTo(100, 1);
      expect(hsl.l).toBeCloseTo(50, 1);
    });

    it('should convert sRGB color to P3-HSL correctly', () => {
      const color = new Color('srgb', [0, 1, 0]); // Green in sRGB
      const hsl = colorToP3Hsl(color);
      
      // P3 has different primaries, so sRGB green converts to a different hue in P3
      expect(hsl.h).toBeGreaterThanOrEqual(0);
      expect(hsl.h).toBeLessThanOrEqual(360);
      expect(hsl.s).toBeGreaterThan(0); // Should have some saturation
      expect(hsl.l).toBeGreaterThan(0); // Should have some lightness
    });
  });

  describe('getP3HslChannelRange', () => {
    it('should return correct range for hue channel', () => {
      const range = getP3HslChannelRange('h');
      expect(range.min).toBe(0);
      expect(range.max).toBe(360);
    });

    it('should return correct range for saturation channel', () => {
      const range = getP3HslChannelRange('s');
      expect(range.min).toBe(0);
      expect(range.max).toBe(100);
    });

    it('should return correct range for lightness channel', () => {
      const range = getP3HslChannelRange('l');
      expect(range.min).toBe(0);
      expect(range.max).toBe(100);
    });

    it('should return default range for unknown channel', () => {
      const range = getP3HslChannelRange('unknown');
      expect(range.min).toBe(0);
      expect(range.max).toBe(1);
    });
  });

  describe('isValidP3Hsl', () => {
    it('should validate correct HSL coordinates', () => {
      const hsl: P3HslCoords = { h: 180, s: 50, l: 75 };
      expect(isValidP3Hsl(hsl)).toBe(true);
    });

    it('should reject invalid hue values', () => {
      const hsl1: P3HslCoords = { h: -10, s: 50, l: 75 };
      const hsl2: P3HslCoords = { h: 370, s: 50, l: 75 };
      const hsl3: P3HslCoords = { h: NaN, s: 50, l: 75 };
      
      expect(isValidP3Hsl(hsl1)).toBe(false);
      expect(isValidP3Hsl(hsl2)).toBe(false);
      expect(isValidP3Hsl(hsl3)).toBe(false);
    });

    it('should reject invalid saturation values', () => {
      const hsl1: P3HslCoords = { h: 180, s: -10, l: 75 };
      const hsl2: P3HslCoords = { h: 180, s: 110, l: 75 };
      const hsl3: P3HslCoords = { h: 180, s: NaN, l: 75 };
      
      expect(isValidP3Hsl(hsl1)).toBe(false);
      expect(isValidP3Hsl(hsl2)).toBe(false);
      expect(isValidP3Hsl(hsl3)).toBe(false);
    });

    it('should reject invalid lightness values', () => {
      const hsl1: P3HslCoords = { h: 180, s: 50, l: -10 };
      const hsl2: P3HslCoords = { h: 180, s: 50, l: 110 };
      const hsl3: P3HslCoords = { h: 180, s: 50, l: NaN };
      
      expect(isValidP3Hsl(hsl1)).toBe(false);
      expect(isValidP3Hsl(hsl2)).toBe(false);
      expect(isValidP3Hsl(hsl3)).toBe(false);
    });
  });

  describe('clampP3Hsl', () => {
    it('should clamp values to valid ranges', () => {
      const hsl: P3HslCoords = { h: 400, s: 120, l: -10 };
      const clamped = clampP3Hsl(hsl);
      
      expect(clamped.h).toBe(360);
      expect(clamped.s).toBe(100);
      expect(clamped.l).toBe(0);
    });

    it('should preserve valid values', () => {
      const hsl: P3HslCoords = { h: 180, s: 50, l: 75 };
      const clamped = clampP3Hsl(hsl);
      
      expect(clamped.h).toBe(180);
      expect(clamped.s).toBe(50);
      expect(clamped.l).toBe(75);
    });
  });

  describe('p3HslToNormalized and normalizedToP3Hsl', () => {
    it('should convert HSL to normalized values correctly', () => {
      const hsl: P3HslCoords = { h: 180, s: 50, l: 75 };
      const normalized = p3HslToNormalized(hsl);
      
      expect(normalized[0]).toBeCloseTo(0.5, 3);  // 180/360
      expect(normalized[1]).toBeCloseTo(0.5, 3);  // 50/100
      expect(normalized[2]).toBeCloseTo(0.75, 3); // 75/100
    });

    it('should convert normalized values to HSL correctly', () => {
      const normalized: [number, number, number] = [0.5, 0.5, 0.75];
      const hsl = normalizedToP3Hsl(normalized);
      
      expect(hsl.h).toBeCloseTo(180, 1);
      expect(hsl.s).toBeCloseTo(50, 1);
      expect(hsl.l).toBeCloseTo(75, 1);
    });

    it('should maintain accuracy through round-trip conversion', () => {
      const original: P3HslCoords = { h: 280, s: 75, l: 60 };
      const normalized = p3HslToNormalized(original);
      const converted = normalizedToP3Hsl(normalized);
      
      expect(converted.h).toBeCloseTo(original.h, 1);
      expect(converted.s).toBeCloseTo(original.s, 1);
      expect(converted.l).toBeCloseTo(original.l, 1);
    });
  });

  describe('Performance', () => {
    it('should perform conversions within performance budget', () => {
      const iterations = 1000;
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const hsl: P3HslCoords = { h: i % 360, s: i % 100, l: i % 100 };
        const rgb = p3HslToRgb(hsl);
        const backToHsl = p3RgbToHsl(rgb);
        expect(isValidP3Hsl(backToHsl)).toBe(true);
      }
      
      const endTime = performance.now();
      const avgTime = (endTime - startTime) / iterations;
      
      // Should complete each conversion in under 1ms
      expect(avgTime).toBeLessThan(1);
    });
  });
}); 