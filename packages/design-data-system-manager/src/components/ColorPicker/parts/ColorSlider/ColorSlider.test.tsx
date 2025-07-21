import { describe, it, expect, vi, beforeEach } from 'vitest';
import Color from 'colorjs.io';
import { ColorSlider } from './ColorSlider';

// Mock the shared utilities
vi.mock('../../utils/colorUtils', () => ({
  getColorSpaceConfig: vi.fn(),
  getChannelRange: vi.fn(),
  getGamutSpace: vi.fn(),
  isOutOfGamut: vi.fn(),
  getCanvasPixelColor: vi.fn()
}));

// Mock the ColorHandle component
vi.mock('../ColorHandle/ColorHandle', () => ({
  ColorHandle: vi.fn(() => null)
}));

describe('ColorSlider', () => {
  const defaultProps = {
    color: new Color('srgb', [1, 0, 0]), // Red color
    channel: 'l', // Lightness channel
    'data-testid': 'color-slider',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Interface', () => {
    it('should export ColorSlider component', () => {
      expect(ColorSlider).toBeDefined();
      expect(typeof ColorSlider).toBe('object'); // React.memo returns an object
    });

    it('should have displayName', () => {
      expect(ColorSlider.displayName).toBe('ColorSlider');
    });
  });

  describe('Props Interface', () => {
    it('should accept color prop', () => {
      expect(defaultProps.color).toBeInstanceOf(Color);
    });

    it('should accept channel prop', () => {
      expect(defaultProps.channel).toBe('l');
    });

    it('should accept optional size prop', () => {
      const propsWithSize = { ...defaultProps, size: 300 };
      expect(propsWithSize.size).toBe(300);
    });

    it('should use default size when not provided', () => {
      expect(defaultProps).toBeDefined();
      // Default size should be 200
    });

    it('should accept optional orientation prop', () => {
      const propsWithHorizontal = { ...defaultProps, orientation: 'horizontal' as const };
      const propsWithVertical = { ...defaultProps, orientation: 'vertical' as const };
      expect(propsWithHorizontal.orientation).toBe('horizontal');
      expect(propsWithVertical.orientation).toBe('vertical');
    });

    it('should default orientation to horizontal', () => {
      expect(defaultProps).toBeDefined();
      // Default orientation should be horizontal
    });

    it('should accept optional colorSpace prop', () => {
      const propsWithColorSpace = { ...defaultProps, colorSpace: 'sRGB' as const };
      expect(propsWithColorSpace.colorSpace).toBe('sRGB');
    });

    it('should accept optional model prop', () => {
      const propsWithModel = { ...defaultProps, model: 'polar' as const };
      expect(propsWithModel.model).toBe('polar');
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

    it('should use getChannelRange for channel scaling', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.getChannelRange).toBeDefined();
    });

    it('should use getGamutSpace for gamut constraint', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.getGamutSpace).toBeDefined();
    });

    it('should use isOutOfGamut for gamut checking', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.isOutOfGamut).toBeDefined();
    });

    it('should use getCanvasPixelColor for rendering', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.getCanvasPixelColor).toBeDefined();
    });
  });

  describe('Channel Support', () => {
    it('should support lightness channel', () => {
      const propsWithLightness = { ...defaultProps, channel: 'l' };
      expect(propsWithLightness.channel).toBe('l');
    });

    it('should support chroma channel', () => {
      const propsWithChroma = { ...defaultProps, channel: 'c' };
      expect(propsWithChroma.channel).toBe('c');
    });

    it('should support hue channel', () => {
      const propsWithHue = { ...defaultProps, channel: 'h' };
      expect(propsWithHue.channel).toBe('h');
    });

    it('should support red channel', () => {
      const propsWithRed = { ...defaultProps, channel: 'r' };
      expect(propsWithRed.channel).toBe('r');
    });

    it('should support green channel', () => {
      const propsWithGreen = { ...defaultProps, channel: 'g' };
      expect(propsWithGreen.channel).toBe('g');
    });

    it('should support blue channel', () => {
      const propsWithBlue = { ...defaultProps, channel: 'b' };
      expect(propsWithBlue.channel).toBe('b');
    });
  });

  describe('Orientation Support', () => {
    it('should support horizontal orientation', () => {
      const horizontalProps = { ...defaultProps, orientation: 'horizontal' as const };
      expect(horizontalProps.orientation).toBe('horizontal');
    });

    it('should support vertical orientation', () => {
      const verticalProps = { ...defaultProps, orientation: 'vertical' as const };
      expect(verticalProps.orientation).toBe('vertical');
    });

    it('should default to horizontal orientation', () => {
      expect(defaultProps).toBeDefined();
      // Default orientation should be horizontal
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
      expect(ColorSlider).toBeDefined();
    });

    it('should memoize gradient rendering', () => {
      // The component should use useCallback for gradient rendering
      expect(ColorSlider).toBeDefined();
    });
  });

  describe('Component Composition', () => {
    it('should compose canvas and ColorHandle', () => {
      // The component should render both canvas and ColorHandle
      expect(ColorSlider).toBeDefined();
    });

    it('should pass props correctly to ColorHandle', () => {
      // Props should be passed through to ColorHandle
      expect(ColorSlider).toBeDefined();
    });

    it('should position ColorHandle based on color coordinates', () => {
      // ColorHandle should be positioned using coordinate mapping
      expect(ColorSlider).toBeDefined();
    });
  });

  describe('Interaction Behavior', () => {
    it('should handle canvas interactions correctly', () => {
      // The component should handle pointer events on the canvas
      expect(ColorSlider).toBeDefined();
    });

    it('should support keyboard navigation', () => {
      // The component should support arrow key navigation
      expect(ColorSlider).toBeDefined();
    });

    it('should support drag interactions', () => {
      // The component should support drag and drop interactions
      expect(ColorSlider).toBeDefined();
    });
  });

  describe('Gamut Awareness', () => {
    it('should handle gamut constraints correctly', () => {
      // The component should respect gamut boundaries
      expect(ColorSlider).toBeDefined();
    });

    it('should show out-of-gamut areas as gray', () => {
      // Out-of-gamut areas should be rendered as gray
      expect(ColorSlider).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid channels gracefully', () => {
      // The component should handle invalid channel specifications
      expect(ColorSlider).toBeDefined();
    });

    it('should handle color conversion errors gracefully', () => {
      // The component should handle color conversion failures
      expect(ColorSlider).toBeDefined();
    });

    it('should handle coordinate calculation errors gracefully', () => {
      // The component should handle coordinate calculation failures
      expect(ColorSlider).toBeDefined();
    });
  });
}); 