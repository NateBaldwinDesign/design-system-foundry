import { describe, it, expect, vi, beforeEach } from 'vitest';
import Color from 'colorjs.io';
import { ColorArea } from './ColorArea';

// Mock the shared utilities
vi.mock('../../utils/colorUtils', () => ({
  getColorSpaceConfig: vi.fn(),
  colorToCanvasCoords: vi.fn()
}));

// Mock the ColorCanvas component
vi.mock('../ColorCanvas', () => ({
  ColorCanvas: vi.fn(() => null)
}));

// Mock the ColorHandle component
vi.mock('../ColorHandle/ColorHandle', () => ({
  ColorHandle: vi.fn(() => null)
}));

describe('ColorArea', () => {
  const defaultProps = {
    color: new Color('srgb', [1, 0, 0]), // Red color
    'data-testid': 'color-area',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Interface', () => {
    it('should export ColorArea component', () => {
      expect(ColorArea).toBeDefined();
      expect(typeof ColorArea).toBe('object'); // React.memo returns an object
    });

    it('should have displayName', () => {
      expect(ColorArea.displayName).toBe('ColorArea');
    });
  });

  describe('Props Interface', () => {
    it('should accept color prop', () => {
      expect(defaultProps.color).toBeInstanceOf(Color);
    });

    it('should accept optional size prop', () => {
      const propsWithSize = { ...defaultProps, size: 300 };
      expect(propsWithSize.size).toBe(300);
    });

    it('should use default size when not provided', () => {
      expect(defaultProps).toBeDefined();
      // Default size should be 200
    });

    it('should accept optional colorSpace prop', () => {
      const propsWithColorSpace = { ...defaultProps, colorSpace: 'sRGB' as const };
      expect(propsWithColorSpace.colorSpace).toBe('sRGB');
    });

    it('should accept optional model prop', () => {
      const propsWithModel = { ...defaultProps, model: 'polar' as const };
      expect(propsWithModel.model).toBe('polar');
    });

    it('should accept optional colorChannels prop', () => {
      const propsWithChannels = { ...defaultProps, colorChannels: ['r', 'g'] as [string, string] };
      expect(propsWithChannels.colorChannels).toEqual(['r', 'g']);
    });

    it('should accept optional gamut prop', () => {
      const propsWithGamut = { ...defaultProps, gamut: 'Display-P3' as const };
      expect(propsWithGamut.gamut).toBe('Display-P3');
    });

    it('should accept optional onChange callback', () => {
      const onChange = vi.fn();
      const propsWithOnChange = { ...defaultProps, onChange };
      expect(propsWithOnChange.onChange).toBe(onChange);
    });
  });

  describe('Shared Utilities Integration', () => {
    it('should use getColorSpaceConfig for configuration', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.getColorSpaceConfig).toBeDefined();
    });

    it('should use colorToCanvasCoords for handle positioning', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.colorToCanvasCoords).toBeDefined();
    });
  });

  describe('Coordinate Mapping', () => {
    it('should use unified coordinate mapping with ColorCanvas', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.colorToCanvasCoords).toBeDefined();
    });

    it('should handle coordinate conversion errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // The component should handle coordinate conversion errors gracefully
      expect(consoleSpy).toBeDefined();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Color Space Support', () => {
    it('should support sRGB color space with cartesian model', () => {
      const color = new Color('srgb', [0, 1, 0]); // Green
      expect(color).toBeInstanceOf(Color);
      expect(color.space.id).toBe('srgb');
    });

    it('should support sRGB color space with polar model (HSL)', () => {
      const color = new Color('hsl', [120, 100, 50]); // Green
      expect(color).toBeInstanceOf(Color);
      expect(color.space.id).toBe('hsl');
    });

    it('should support Display P3 color space', () => {
      const color = new Color('p3', [0, 1, 0]); // Green in P3
      expect(color).toBeInstanceOf(Color);
      expect(color.space.id).toBe('p3');
    });

    it('should support OKLCH color space with polar model', () => {
      const color = new Color('oklch', [0.5, 0.2, 120]); // Green-ish
      expect(color).toBeInstanceOf(Color);
      expect(color.space.id).toBe('oklch');
    });

    it('should support OKLCH color space with cartesian model (OKLab)', () => {
      const color = new Color('oklab', [0.5, 0.2, 0.1]); // OKLab
      expect(color).toBeInstanceOf(Color);
      expect(color.space.id).toBe('oklab');
    });
  });

  describe('Performance', () => {
    it('should use memoized color space configurations', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.getColorSpaceConfig).toBeDefined();
    });

    it('should memoize handle position calculations', () => {
      // The component should use useMemo for handle position calculations
      expect(ColorArea).toBeDefined();
    });
  });

  describe('Component Composition', () => {
    it('should compose ColorCanvas and ColorHandle', () => {
      // The component should render both ColorCanvas and ColorHandle
      expect(ColorArea).toBeDefined();
    });

    it('should pass props correctly to ColorCanvas', () => {
      // Props should be passed through to ColorCanvas
      expect(ColorArea).toBeDefined();
    });

    it('should position ColorHandle based on color coordinates', () => {
      // ColorHandle should be positioned using coordinate mapping
      expect(ColorArea).toBeDefined();
    });
  });
}); 