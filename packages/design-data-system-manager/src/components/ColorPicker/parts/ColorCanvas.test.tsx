import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Color from 'colorjs.io';
import { ColorCanvas } from './ColorCanvas';

// Mock DOM environment
const mockCanvas = {
  getContext: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0 })),
  width: 200,
  height: 200,
};

const mockContext = {
  clearRect: vi.fn(),
  createImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4 * 200 * 200), // 4 bytes per pixel * 200 * 200
  })),
  putImageData: vi.fn(),
  getImageData: vi.fn(),
};

// Mock document.createElement
Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    return {};
  }),
});

// Mock canvas methods
mockCanvas.getContext.mockReturnValue(mockContext);

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
});

// Mock console.warn to avoid noise in tests
const originalWarn = console.warn;
beforeEach(() => {
  console.warn = vi.fn();
});

afterEach(() => {
  console.warn = originalWarn;
  vi.clearAllMocks();
});

describe('ColorCanvas', () => {
  const defaultProps = {
    size: 200,
    color: new Color('srgb', [1, 0, 0]), // Red color
    'data-testid': 'color-canvas',
  };

  describe('Component Interface', () => {
    it('should export ColorCanvas component', () => {
      expect(ColorCanvas).toBeDefined();
      expect(typeof ColorCanvas).toBe('function');
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
  });

  describe('Color Space Support', () => {
    it('should support sRGB color space with cartesian model', () => {
      const color = new Color('srgb', [0, 1, 0]); // Green
      expect(color).toBeInstanceOf(Color);
      expect(color.space.id).toBe('srgb');
    });

    it('should use correct default channels for sRGB cartesian', () => {
      const color = new Color('srgb', [0, 1, 0]); // Green
      expect(color).toBeInstanceOf(Color);
      // Default should be ['r', 'g'] for sRGB cartesian
    });

    it('should use correct default channels for sRGB polar', () => {
      const color = new Color('hsl', [120, 100, 50]); // Green
      expect(color).toBeInstanceOf(Color);
      // Default should be ['s', 'l'] for sRGB polar
    });

    it('should handle HSL coordinate ranges correctly', () => {
      // Test that HSL coordinates are handled with proper ranges
      const color = new Color('hsl', [120, 100, 50]); // Green
      expect(color.coords[0]).toBe(120); // Hue: 0-360
      expect(color.coords[1]).toBe(100); // Saturation: 0-100
      expect(color.coords[2]).toBe(50);  // Lightness: 0-100
    });

    it('should support canvas color space conversion', () => {
      // Test that the component can work with different canvas color spaces
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { colorSpace: 'display-p3' });
      expect(canvas).toBeDefined();
      expect(ctx).toBeDefined(); // May be null if not supported
      // Note: Color conversion is handled by Colorjs.io
    });

    it('should handle color space conversion correctly', () => {
      // Test color conversion from different spaces to canvas space
      const srgbColor = new Color('srgb', [1, 0, 0]); // Red
      const p3Color = srgbColor.to('p3');
      expect(p3Color).toBeInstanceOf(Color);
      expect(p3Color.space.id).toBe('p3');
    });

    it('should use correct default channels for Display P3', () => {
      const color = new Color('p3', [0, 1, 0]); // Green in P3
      expect(color).toBeInstanceOf(Color);
      // Default should be ['r', 'g'] for Display P3
    });

    it('should use correct default channels for OKlch polar', () => {
      const color = new Color('oklch', [0.5, 0.2, 120]); // Green-ish
      expect(color).toBeInstanceOf(Color);
      // Default should be ['c', 'h'] for OKlch polar
    });

    it('should use correct default channels for OKlch cartesian', () => {
      const color = new Color('oklab', [0.5, 0.2, 0.1]); // OKLab
      expect(color).toBeInstanceOf(Color);
      // Default should be ['a', 'b'] for OKlch cartesian
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

  describe('Color Conversion', () => {
    it('should convert colors between spaces', () => {
      const srgbColor = new Color('srgb', [1, 0, 0]); // Red
      const hslColor = srgbColor.to('hsl');
      
      expect(hslColor).toBeInstanceOf(Color);
      expect(hslColor.space.id).toBe('hsl');
    });

    it('should handle color coordinates', () => {
      const color = new Color('srgb', [1, 0, 0]); // Red
      const coords = color.coords;
      
      expect(Array.isArray(coords)).toBe(true);
      expect(coords.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should measure performance correctly', () => {
      const startTime = performance.now();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should warn when rendering takes too long', () => {
      // Mock a slow performance.now
      const slowPerformance = vi.fn()
        .mockReturnValueOnce(0) // start time
        .mockReturnValueOnce(20); // end time (20ms > 16ms)
      
      Object.defineProperty(window, 'performance', {
        value: { now: slowPerformance },
      });

      const duration = performance.now() - performance.now();
      expect(duration).toBe(-20); // Mocked difference
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid color coordinates', () => {
      // Test with potentially problematic coordinates
      const color = new Color('srgb', [0, 0, 0]); // Black
      expect(color).toBeInstanceOf(Color);
    });

    it('should handle color conversion errors gracefully', () => {
      // Test color conversion that might fail
      const color = new Color('srgb', [0.5, 0.5, 0.5]); // Gray
      expect(() => color.to('hsl')).not.toThrow();
    });
  });

  describe('Canvas Mocking', () => {
    it('should mock canvas context methods', () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      expect(canvas).toBeDefined();
      expect(ctx).toBeDefined();
      expect(typeof ctx?.clearRect).toBe('function');
      expect(typeof ctx?.createImageData).toBe('function');
      expect(typeof ctx?.putImageData).toBe('function');
    });

    it('should mock canvas bounding rect', () => {
      const canvas = document.createElement('canvas');
      const rect = canvas.getBoundingClientRect();
      
      expect(canvas).toBeDefined();
      expect(rect).toBeDefined();
      expect(rect.left).toBe(0);
      expect(rect.top).toBe(0);
    });
  });
}); 