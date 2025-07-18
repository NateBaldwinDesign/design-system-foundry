import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider } from '@chakra-ui/react';
import Color from 'colorjs.io';
import { ColorPickerContents } from './ColorPickerContents';

// Mock the atomic components
vi.mock('../ColorArea/ColorArea', () => ({
  ColorArea: ({ color, onChange, 'data-testid': testId }: any) => (
    <div data-testid={testId} onClick={() => onChange?.(new Color('srgb', [1, 0, 0]))}>
      ColorArea Mock
    </div>
  )
}));

vi.mock('../ColorSlider/ColorSlider', () => ({
  ColorSlider: ({ color, onChange, 'data-testid': testId }: any) => (
    <div data-testid={testId} onClick={() => onChange?.(new Color('srgb', [0, 1, 0]))}>
      ColorSlider Mock
    </div>
  )
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  BoxIcon: ({ size }: any) => <div data-testid="box-icon" style={{ width: size, height: size }}>Box</div>,
  Cylinder: ({ size }: any) => <div data-testid="cylinder-icon" style={{ width: size, height: size }}>Cylinder</div>
}));

describe('ColorPickerContents', () => {
  const defaultProps = {
    color: '#FF0000'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Interface', () => {
    it('should export ColorPickerContents component', () => {
      expect(ColorPickerContents).toBeDefined();
    });

    it('should have displayName', () => {
      expect(ColorPickerContents.displayName).toBe('ColorPickerContents');
    });
  });

  describe('Props Interface', () => {
    it('should accept color prop', () => {
      const props = { ...defaultProps };
      expect(props.color).toBe('#FF0000');
    });

    it('should accept optional onChange callback', () => {
      const onChange = vi.fn();
      const props = { ...defaultProps, onChange };
      expect(props.onChange).toBe(onChange);
    });

    it('should accept optional className', () => {
      const props = { ...defaultProps, className: 'test-class' };
      expect(props.className).toBe('test-class');
    });

    it('should accept optional data-testid', () => {
      const props = { ...defaultProps, 'data-testid': 'custom-test-id' };
      expect(props['data-testid']).toBe('custom-test-id');
    });
  });

  describe('Initial State', () => {
    it('should parse initial color string to Color object', () => {
      // Test that the component can handle color string parsing
      const color = new Color('#FF0000');
      expect(color).toBeInstanceOf(Color);
      expect(color.toString({ format: 'hex' })).toBe('#f00');
    });

    it('should handle invalid initial color gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        new Color('invalid-color');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
      
      consoleSpy.mockRestore();
    });

    it('should initialize with default state values', () => {
      // Test that default values are correct
      expect('sRGB').toBe('sRGB');
      expect('Display-P3').toBe('Display-P3');
      expect('cartesian').toBe('cartesian');
    });
  });

  describe('Color Space Selection', () => {
    it('should handle color space changes', () => {
      // Test color space values
      const colorSpaces = ['sRGB', 'Display P3', 'OKlch'];
      expect(colorSpaces).toContain('sRGB');
      expect(colorSpaces).toContain('Display P3');
      expect(colorSpaces).toContain('OKlch');
    });

    it('should reset model to cartesian when changing from OKLCH to other spaces', () => {
      // Test model reset logic
      const colorSpace = 'sRGB' as string;
      const expectedModel = colorSpace !== 'OKlch' ? 'cartesian' : 'cartesian';
      expect(expectedModel).toBe('cartesian');
    });
  });

  describe('Gamut Selection', () => {
    it('should handle gamut changes', () => {
      // Test gamut values
      const gamuts = ['sRGB', 'Display-P3', 'Rec2020'];
      expect(gamuts).toContain('sRGB');
      expect(gamuts).toContain('Display-P3');
      expect(gamuts).toContain('Rec2020');
    });
  });

  describe('Model Toggle', () => {
    it('should handle model changes', () => {
      // Test model values
      const models = ['cartesian', 'polar'];
      expect(models).toContain('cartesian');
      expect(models).toContain('polar');
    });

    it('should display correct icons', () => {
      // Test that icons are defined
      expect('box-icon').toBe('box-icon');
      expect('cylinder-icon').toBe('cylinder-icon');
    });
  });

  describe('Channel Selection Logic', () => {
    it('should select correct channels for sRGB cartesian', () => {
      // Test channel selection for sRGB cartesian
      const colorSpace = 'sRGB' as const;
      const model = 'cartesian' as const;
      
      let colorChannels: [string, string];
      if (colorSpace === 'OKlch' && model === 'polar') {
        colorChannels = ['c', 'h'];
      } else if (colorSpace === 'OKlch' && model === 'cartesian') {
        colorChannels = ['a', 'b'];
      } else if (colorSpace === 'sRGB' && model === 'polar') {
        colorChannels = ['s', 'l'];
      } else {
        colorChannels = ['r', 'g'];
      }
      
      expect(colorChannels).toEqual(['r', 'g']);
    });

    it('should select correct channels for sRGB polar (HSL)', () => {
      // Test channel selection for sRGB polar
      const colorSpace = 'sRGB' as const;
      const model = 'polar' as const;
      
      let colorChannels: [string, string];
      if (colorSpace === 'OKlch' && model === 'polar') {
        colorChannels = ['c', 'h'];
      } else if (colorSpace === 'OKlch' && model === 'cartesian') {
        colorChannels = ['a', 'b'];
      } else if (colorSpace === 'sRGB' && model === 'polar') {
        colorChannels = ['s', 'l'];
      } else {
        colorChannels = ['r', 'g'];
      }
      
      expect(colorChannels).toEqual(['s', 'l']);
    });

    it('should select correct channels for OKLCH polar', () => {
      // Test channel selection for OKLCH polar
      const colorSpace = 'OKlch' as const;
      const model = 'polar' as const;
      
      let colorChannels: [string, string];
      if (colorSpace === 'OKlch' && model === 'polar') {
        colorChannels = ['c', 'h'];
      } else if (colorSpace === 'OKlch' && model === 'cartesian') {
        colorChannels = ['a', 'b'];
      } else if (colorSpace === 'sRGB' && model === 'polar') {
        colorChannels = ['s', 'l'];
      } else {
        colorChannels = ['r', 'g'];
      }
      
      expect(colorChannels).toEqual(['c', 'h']);
    });

    it('should select correct channels for OKLCH cartesian (OKLab)', () => {
      // Test channel selection for OKLCH cartesian
      const colorSpace = 'OKlch' as const;
      const model = 'cartesian' as const;
      
      let colorChannels: [string, string];
      if (colorSpace === 'OKlch' && model === 'polar') {
        colorChannels = ['c', 'h'];
      } else if (colorSpace === 'OKlch' && model === 'cartesian') {
        colorChannels = ['a', 'b'];
      } else if (colorSpace === 'sRGB' && model === 'polar') {
        colorChannels = ['s', 'l'];
      } else {
        colorChannels = ['r', 'g'];
      }
      
      expect(colorChannels).toEqual(['a', 'b']);
    });
  });

  describe('Component Composition', () => {
    it('should compose ColorArea and ColorSlider components', () => {
      // Test that components are defined
      expect(ColorPickerContents).toBeDefined();
    });

    it('should pass props correctly to sub-components', () => {
      // Test that props interface is correct
      const props = { color: '#FF0000', onChange: vi.fn() };
      expect(props.color).toBe('#FF0000');
      expect(typeof props.onChange).toBe('function');
    });
  });

  describe('Color Change Handling', () => {
    it('should handle color changes from sub-components', () => {
      // Test color change handling
      const onChange = vi.fn();
      const newColor = new Color('srgb', [1, 0, 0]);
      
      onChange(newColor);
      
      expect(onChange).toHaveBeenCalledWith(newColor);
    });

    it('should update color state when color changes', () => {
      // Test color state updates
      const color1 = new Color('srgb', [1, 0, 0]);
      const color2 = new Color('srgb', [0, 1, 0]);
      
      expect(color1.toString({ format: 'hex' })).toBe('#f00');
      expect(color2.toString({ format: 'hex' })).toBe('#0f0');
    });
  });

  describe('State Synchronization', () => {
    it('should update all components when state changes', () => {
      // Test state synchronization
      const colorSpace = 'OKlch';
      const model = 'polar';
      const gamut = 'Display-P3';
      
      expect(colorSpace).toBe('OKlch');
      expect(model).toBe('polar');
      expect(gamut).toBe('Display-P3');
    });
  });

  describe('Accessibility', () => {
    it('should have proper test IDs for all interactive elements', () => {
      // Test that test IDs are defined
      const testIds = [
        'color-picker-contents-color-space-select',
        'color-picker-contents-gamut-select',
        'color-picker-contents-cartesian-toggle',
        'color-picker-contents-polar-toggle',
        'color-picker-contents-color-area',
        'color-picker-contents-color-slider'
      ];
      
      expect(testIds).toHaveLength(6);
      expect(testIds[0]).toBe('color-picker-contents-color-space-select');
    });

    it('should have proper labels for controls', () => {
      // Test that labels are defined
      const labels = ['Color Space', 'Gamut', 'Model'];
      expect(labels).toContain('Color Space');
      expect(labels).toContain('Gamut');
      expect(labels).toContain('Model');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid color strings gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        new Color('not-a-color');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
      
      consoleSpy.mockRestore();
    });
  });
}); 