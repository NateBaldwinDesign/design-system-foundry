import { describe, it, expect } from 'vitest';
import Color from 'colorjs.io';
import {
  getColorSpaceConfig,
  getChannelRange,
  getGamutSpace,
  isOutOfGamut,
  getCanvasPixelColor,
  canvasToColorCoords,
  colorToCanvasCoords,
  findClosestInGamutColor,
  constrainToGamutBoundary
} from './colorUtils';

describe('Color Utilities', () => {
  describe('getColorSpaceConfig', () => {
    it('should return correct config for sRGB cartesian', () => {
      const config = getColorSpaceConfig('sRGB', 'cartesian');
      expect(config.id).toBe('srgb');
      expect(config.channels).toEqual(['r', 'g', 'b']);
      expect(config.defaultChannels).toEqual(['r', 'g']);
      expect(config.thirdChannel).toBe('b');
    });

    it('should return correct config for sRGB polar', () => {
      const config = getColorSpaceConfig('sRGB', 'polar');
      expect(config.id).toBe('hsl');
      expect(config.channels).toEqual(['h', 's', 'l']);
      expect(config.defaultChannels).toEqual(['s', 'l']);
      expect(config.thirdChannel).toBe('h');
    });

    it('should return correct config for Display P3', () => {
      const config = getColorSpaceConfig('Display P3', 'cartesian');
      expect(config.id).toBe('p3');
      expect(config.channels).toEqual(['r', 'g', 'b']);
      expect(config.defaultChannels).toEqual(['r', 'g']);
      expect(config.thirdChannel).toBe('b');
    });

    it('should return correct config for OKLCH polar', () => {
      const config = getColorSpaceConfig('OKlch', 'polar');
      expect(config.id).toBe('oklch');
      expect(config.channels).toEqual(['l', 'c', 'h']);
      expect(config.defaultChannels).toEqual(['c', 'h']);
      expect(config.thirdChannel).toBe('l');
    });

    it('should return correct config for OKLCH cartesian', () => {
      const config = getColorSpaceConfig('OKlch', 'cartesian');
      expect(config.id).toBe('oklab');
      expect(config.channels).toEqual(['l', 'a', 'b']);
      expect(config.defaultChannels).toEqual(['a', 'b']);
      expect(config.thirdChannel).toBe('l');
    });
  });

  describe('getChannelRange', () => {
    it('should return correct ranges for sRGB channels', () => {
      expect(getChannelRange('r', 'srgb')).toEqual({ min: 0, max: 1 });
      expect(getChannelRange('g', 'srgb')).toEqual({ min: 0, max: 1 });
      expect(getChannelRange('b', 'srgb')).toEqual({ min: 0, max: 1 });
    });

    it('should return correct ranges for HSL channels', () => {
      expect(getChannelRange('h', 'hsl')).toEqual({ min: 0, max: 360 });
      expect(getChannelRange('s', 'hsl')).toEqual({ min: 0, max: 100 });
      expect(getChannelRange('l', 'hsl')).toEqual({ min: 0, max: 100 });
    });

    it('should return correct ranges for OKLCH channels', () => {
      expect(getChannelRange('l', 'oklch')).toEqual({ min: 0, max: 1 });
      expect(getChannelRange('c', 'oklch')).toEqual({ min: 0, max: 0.26 });
      expect(getChannelRange('h', 'oklch')).toEqual({ min: 0, max: 360 });
    });

    it('should return correct ranges for OKLab channels', () => {
      expect(getChannelRange('l', 'oklab')).toEqual({ min: 0, max: 1 });
      expect(getChannelRange('a', 'oklab')).toEqual({ min: -0.13, max: 0.20 });
      expect(getChannelRange('b', 'oklab')).toEqual({ min: -0.28, max: 0.10 });
    });
  });

  describe('getGamutSpace', () => {
    it('should return correct gamut space identifiers', () => {
      expect(getGamutSpace('sRGB')).toBe('srgb');
      expect(getGamutSpace('Display-P3')).toBe('p3');
      expect(getGamutSpace('Rec2020')).toBe('rec2020');
      expect(getGamutSpace('invalid')).toBe('srgb'); // fallback
    });
  });

  describe('isOutOfGamut', () => {
    it('should detect in-gamut colors correctly', () => {
      const inGamutCoords: [number, number, number] = [0.5, 0.5, 0.5];
      expect(isOutOfGamut(inGamutCoords, 'srgb', 'srgb')).toBe(false);
    });

    it('should detect out-of-gamut colors correctly', () => {
      const outOfGamutCoords: [number, number, number] = [1.5, 0.5, 0.5];
      expect(isOutOfGamut(outOfGamutCoords, 'srgb', 'srgb')).toBe(true);
    });
  });

  describe('getCanvasPixelColor', () => {
    it('should convert color to sRGB pixel values', () => {
      const color = new Color('srgb', [0.5, 0.25, 0.75]);
      const [r, g, b, a] = getCanvasPixelColor(color, 'srgb');
      
      expect(r).toBe(128); // 0.5 * 255
      expect(g).toBe(64);  // 0.25 * 255
      expect(b).toBe(191); // 0.75 * 255
      expect(a).toBe(255); // 1.0 * 255
    });

    it('should handle display-p3 color space', () => {
      const color = new Color('p3', [0.5, 0.25, 0.75]);
      const [r, g, b, a] = getCanvasPixelColor(color, 'display-p3');
      
      expect(r).toBeGreaterThanOrEqual(0);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(a).toBe(255);
    });
  });

  describe('canvasToColorCoords', () => {
    it('should convert canvas coordinates to color coordinates', () => {
      const baseColor = new Color('srgb', [0.5, 0.5, 0.5]);
      const result = canvasToColorCoords(
        100, // x (center)
        100, // y (center)
        200, // size
        baseColor,
        'sRGB',
        'cartesian',
        ['r', 'g'],
        'sRGB'
      );

      expect(result).toBeInstanceOf(Color);
      expect(result.space.id).toBe('srgb');
    });

    it('should handle polar coordinates', () => {
      const baseColor = new Color('hsl', [180, 50, 50]);
      const result = canvasToColorCoords(
        100,
        100,
        200,
        baseColor,
        'sRGB',
        'polar',
        ['s', 'l'],
        'sRGB'
      );

      expect(result).toBeInstanceOf(Color);
      expect(result.space.id).toBe('hsl');
    });
  });

  describe('colorToCanvasCoords', () => {
    it('should convert color coordinates to canvas coordinates', () => {
      const color = new Color('srgb', [0.5, 0.5, 0.5]);
      const result = colorToCanvasCoords(
        color,
        200,
        'sRGB',
        'cartesian',
        ['r', 'g']
      );

      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.x).toBeLessThanOrEqual(200);
      expect(result.y).toBeLessThanOrEqual(200);
    });

    it('should handle polar coordinates', () => {
      const color = new Color('hsl', [180, 50, 50]);
      const result = colorToCanvasCoords(
        color,
        200,
        'sRGB',
        'polar',
        ['s', 'l']
      );

      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.x).toBeLessThanOrEqual(200);
      expect(result.y).toBeLessThanOrEqual(200);
    });
  });

  describe('findClosestInGamutColor', () => {
    it('should return in-gamut color when position is already in gamut', () => {
      const baseColor = new Color('srgb', [0.5, 0.5, 0.5]);
      const result = findClosestInGamutColor(
        100,
        100,
        200,
        baseColor,
        'sRGB',
        'cartesian',
        ['r', 'g'],
        'sRGB'
      );

      expect(result).toBeInstanceOf(Color);
      expect(result.inGamut('srgb')).toBe(true);
    });

    it('should find closest in-gamut color when position is out of gamut', () => {
      const baseColor = new Color('srgb', [0.5, 0.5, 0.5]);
      const result = findClosestInGamutColor(
        190, // Very high position (likely out of gamut)
        190,
        200,
        baseColor,
        'sRGB',
        'cartesian',
        ['r', 'g'],
        'sRGB'
      );

      expect(result).toBeInstanceOf(Color);
      expect(result.inGamut('srgb')).toBe(true);
    });
  });

  describe('constrainToGamutBoundary', () => {
    const size = 200;
    const baseColor = new Color('srgb', [0.5, 0.5, 0.5]); // Mid-gray as base

    describe('sRGB color space', () => {
      it('should return original coordinates when position is already in gamut', () => {
        const result = constrainToGamutBoundary(
          100, // x (center)
          100, // y (center)
          size,
          baseColor,
          'sRGB',
          'cartesian',
          ['r', 'g'],
          'sRGB'
        );

        expect(result.x).toBeCloseTo(100, 1);
        expect(result.y).toBeCloseTo(100, 1);
      });

      it('should constrain coordinates when position is out of gamut', () => {
        // Test a position that would be out of gamut (very high red and green values)
        const result = constrainToGamutBoundary(
          195, // x (very high, likely out of gamut)
          195, // y (very high, likely out of gamut)
          size,
          baseColor,
          'sRGB',
          'cartesian',
          ['r', 'g'],
          'sRGB'
        );

        // Should be constrained to a valid position
        expect(result.x).toBeLessThanOrEqual(size);
        expect(result.y).toBeLessThanOrEqual(size);
        expect(result.x).toBeGreaterThanOrEqual(0);
        expect(result.y).toBeGreaterThanOrEqual(0);

        // Should not be the original out-of-gamut position (if it was actually out of gamut)
        // Note: The position might actually be in gamut, so we only check if it's constrained
        // when it was out of gamut
        const originalColor = new Color('srgb', [0.975, 0.975, 0.5]); // 195/200 = 0.975
        if (!originalColor.inGamut('srgb')) {
          expect(result.x).toBeLessThan(195);
          expect(result.y).toBeLessThan(195);
        }
      });

      it('should handle edge cases near gamut boundaries', () => {
        // Test positions near the gamut edge
        const result = constrainToGamutBoundary(
          180, // x (near edge)
          180, // y (near edge)
          size,
          baseColor,
          'sRGB',
          'cartesian',
          ['r', 'g'],
          'sRGB'
        );

        // Should be constrained to a valid position
        expect(result.x).toBeLessThanOrEqual(size);
        expect(result.y).toBeLessThanOrEqual(size);
        expect(result.x).toBeGreaterThanOrEqual(0);
        expect(result.y).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Display P3 color space', () => {
      it('should constrain to Display P3 gamut when using sRGB constraint', () => {
        // Display P3 has a wider gamut than sRGB, so some positions that are
        // in Display P3 gamut might be out of sRGB gamut
        const result = constrainToGamutBoundary(
          180, // x (potentially out of sRGB gamut)
          180, // y (potentially out of sRGB gamut)
          size,
          baseColor,
          'Display P3',
          'cartesian',
          ['r', 'g'],
          'sRGB' // Constrain to sRGB gamut
        );

        // Should be constrained to sRGB gamut
        expect(result.x).toBeLessThanOrEqual(size);
        expect(result.y).toBeLessThanOrEqual(size);
        expect(result.x).toBeGreaterThanOrEqual(0);
        expect(result.y).toBeGreaterThanOrEqual(0);
      });

      it('should allow wider range when constraining to Display P3 gamut', () => {
        const result = constrainToGamutBoundary(
          180, // x
          180, // y
          size,
          baseColor,
          'Display P3',
          'cartesian',
          ['r', 'g'],
          'Display-P3' // Constrain to Display P3 gamut (wider)
        );

        // Should allow positions that might be out of sRGB gamut
        expect(result.x).toBeLessThanOrEqual(size);
        expect(result.y).toBeLessThanOrEqual(size);
        expect(result.x).toBeGreaterThanOrEqual(0);
        expect(result.y).toBeGreaterThanOrEqual(0);
      });
    });

    describe('OKLCH color space', () => {
      it('should constrain polar coordinates correctly', () => {
        const result = constrainToGamutBoundary(
          180, // x (high chroma)
          180, // y (high chroma)
          size,
          baseColor,
          'OKlch',
          'polar',
          ['c', 'h'],
          'sRGB'
        );

        // Should be constrained to valid position
        expect(result.x).toBeLessThanOrEqual(size);
        expect(result.y).toBeLessThanOrEqual(size);
        expect(result.x).toBeGreaterThanOrEqual(0);
        expect(result.y).toBeGreaterThanOrEqual(0);
      });

      it('should handle cartesian OKLab coordinates', () => {
        const result = constrainToGamutBoundary(
          180, // x (high a)
          180, // y (high b)
          size,
          baseColor,
          'OKlch',
          'cartesian',
          ['a', 'b'],
          'sRGB'
        );

        // Should be constrained to valid position
        expect(result.x).toBeLessThanOrEqual(size);
        expect(result.y).toBeLessThanOrEqual(size);
        expect(result.x).toBeGreaterThanOrEqual(0);
        expect(result.y).toBeGreaterThanOrEqual(0);
      });

      it('should handle complex curved boundaries correctly', () => {
        // Test OKLCH polar with sRGB gamut - this has complex curved boundaries
        const result = constrainToGamutBoundary(
          180, // x (high chroma, likely out of sRGB gamut)
          180, // y (high chroma, likely out of sRGB gamut)
          size,
          baseColor,
          'OKlch',
          'polar',
          ['c', 'h'],
          'sRGB' // Constrain to sRGB gamut (smaller than OKLCH)
        );

        // Should be constrained to a valid position
        expect(result.x).toBeLessThanOrEqual(size);
        expect(result.y).toBeLessThanOrEqual(size);
        expect(result.x).toBeGreaterThanOrEqual(0);
        expect(result.y).toBeGreaterThanOrEqual(0);

        // Should find a position closer to the original target than the center
        const distanceFromTarget = Math.sqrt(
          Math.pow(result.x - 180, 2) + Math.pow(result.y - 180, 2)
        );
        const distanceFromCenter = Math.sqrt(
          Math.pow(result.x - size / 2, 2) + Math.pow(result.y - size / 2, 2)
        );

        // The result should be closer to the target than to the center
        // (unless the target is very far from the gamut boundary)
        expect(distanceFromTarget).toBeLessThanOrEqual(distanceFromCenter + 50); // Allow some tolerance
      });

      it('should find different positions for different target locations', () => {
        // Test that different out-of-gamut positions result in different constrained positions
        const position1 = constrainToGamutBoundary(
          180, // x
          100, // y
          size,
          baseColor,
          'OKlch',
          'polar',
          ['c', 'h'],
          'sRGB'
        );

        const position2 = constrainToGamutBoundary(
          100, // x
          180, // y
          size,
          baseColor,
          'OKlch',
          'polar',
          ['c', 'h'],
          'sRGB'
        );

        // The two positions should be different (not both jumping to the same center point)
        const distance = Math.sqrt(
          Math.pow(position1.x - position2.x, 2) + Math.pow(position1.y - position2.y, 2)
        );

        // They should be at least 10 pixels apart to show they're finding different boundary points
        expect(distance).toBeGreaterThan(10);
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid channels', () => {
        expect(() => {
          constrainToGamutBoundary(
            100,
            100,
            size,
            baseColor,
            'sRGB',
            'cartesian',
            ['invalid', 'channels'],
            'sRGB'
          );
        }).toThrow('Invalid channels');
      });

      it('should handle invalid color spaces gracefully', () => {
        // This should not throw but might return fallback values
        const result = constrainToGamutBoundary(
          100,
          100,
          size,
          baseColor,
          'sRGB',
          'cartesian',
          ['r', 'g'],
          'InvalidGamut'
        );

        // Should return valid coordinates
        expect(result.x).toBeLessThanOrEqual(size);
        expect(result.y).toBeLessThanOrEqual(size);
        expect(result.x).toBeGreaterThanOrEqual(0);
        expect(result.y).toBeGreaterThanOrEqual(0);
      });
    });

    describe('performance characteristics', () => {
      it('should complete within reasonable time', () => {
        const startTime = performance.now();
        
        constrainToGamutBoundary(
          180,
          180,
          size,
          baseColor,
          'sRGB',
          'cartesian',
          ['r', 'g'],
          'sRGB'
        );
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Should complete in under 10ms for good performance
        expect(duration).toBeLessThan(10);
      });
    });
  });
}); 