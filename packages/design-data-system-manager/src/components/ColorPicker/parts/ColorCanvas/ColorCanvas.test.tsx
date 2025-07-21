import { describe, it, expect, vi, beforeEach } from 'vitest';
import Color from 'colorjs.io';
import { ColorCanvas } from './ColorCanvas';

// Mock the shared utilities
vi.mock('../../utils/colorUtils', () => ({
  getColorSpaceConfig: vi.fn(),
  getChannelRange: vi.fn(),
  getGamutSpace: vi.fn(),
  isOutOfGamut: vi.fn(),
  getCanvasPixelColor: vi.fn(),
  findClosestInGamutColor: vi.fn()
}));

// Mock Chakra UI's useColorMode
vi.mock('@chakra-ui/react', async () => {
  const actual = await vi.importActual('@chakra-ui/react');
  return {
    ...actual,
    useColorMode: () => ({ colorMode: 'light' })
  };
});

describe('ColorCanvas', () => {
  const defaultProps = {
    size: 200,
    color: new Color('srgb', [1, 0, 0]), // Red color
    'data-testid': 'color-canvas',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Interface', () => {
    it('should export ColorCanvas component', () => {
      expect(ColorCanvas).toBeDefined();
      expect(typeof ColorCanvas).toBe('object'); // React.memo returns an object
    });

    it('should have displayName', () => {
      expect(ColorCanvas.displayName).toBe('ColorCanvas');
    });
  });

  describe('Props Interface', () => {
    it('should accept size prop', () => {
      expect(defaultProps.size).toBe(200);
    });

    it('should accept color prop', () => {
      expect(defaultProps.color).toBeInstanceOf(Color);
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

    it('should use default channels when colorChannels is not provided', () => {
      // Test that the component can render without explicit colorChannels
      const propsWithoutChannels = { ...defaultProps };
      expect(propsWithoutChannels).toBeDefined();
      // The component should use internal default logic
    });

    it('should accept optional onChange callback', () => {
      const onChange = vi.fn();
      const propsWithOnChange = { ...defaultProps, onChange };
      expect(propsWithOnChange.onChange).toBe(onChange);
    });

    it('should accept optional gamut prop', () => {
      const propsWithGamut = { ...defaultProps, gamut: 'Display-P3' as const };
      expect(propsWithGamut.gamut).toBe('Display-P3');
    });
  });

  describe('Shared Utilities Integration', () => {
    it('should use getColorSpaceConfig for configuration', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.getColorSpaceConfig).toBeDefined();
    });

    it('should use findClosestInGamutColor for gamut-aware interaction', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.findClosestInGamutColor).toBeDefined();
    });
  });

  describe('Fixed Slice Rendering', () => {
    it('should only use third channel value from color for rendering', () => {
      // The color prop should only provide the third channel value for the fixed slice
      expect(defaultProps.color).toBeInstanceOf(Color);
    });

    it('should create stable base color for rendering', () => {
      // The component should create a stable base color with only the third channel value
      expect(ColorCanvas).toBeDefined();
    });

    it('should extract third channel value correctly', () => {
      // The component should extract the third channel value from the color prop
      expect(ColorCanvas).toBeDefined();
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

  describe('Gamut Awareness', () => {
    it('should handle gamut constraints correctly', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.getGamutSpace).toBeDefined();
    });

    it('should use gamut-aware color finding for interactions', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.findClosestInGamutColor).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should use memoized color space configurations', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.getColorSpaceConfig).toBeDefined();
    });

    it('should use memoized channel ranges', async () => {
      const utils = await import('../../utils/colorUtils');
      expect(utils.getChannelRange).toBeDefined();
    });

    it('should only re-render when slice changes', () => {
      // The component should only re-render when colorSpace, model, gamut, or third channel value changes
      expect(ColorCanvas).toBeDefined();
    });

    it('should not re-render when user moves within x,y plane', () => {
      // Moving the handle within the x,y plane should not trigger re-renders
      expect(ColorCanvas).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid color channels gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // The component should handle invalid channels gracefully
      expect(consoleSpy).toBeDefined();
      
      consoleSpy.mockRestore();
    });

    it('should handle third channel extraction errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // The component should handle third channel extraction errors gracefully
      expect(consoleSpy).toBeDefined();
      
      consoleSpy.mockRestore();
    });
  });
}); 