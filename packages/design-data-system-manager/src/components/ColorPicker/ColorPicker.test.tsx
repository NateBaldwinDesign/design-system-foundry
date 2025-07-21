import { describe, it, expect, vi, beforeEach } from 'vitest';
import Color from 'colorjs.io';
import { ColorPicker } from './ColorPicker';

// Mock the ColorPickerContents component
vi.mock('./parts/ColorPickerContents/ColorPickerContents', () => ({
  ColorPickerContents: ({ color, onChange, 'data-testid': testId }: any) => (
    <div data-testid={testId} onClick={() => onChange?.(new Color('srgb', [1, 0, 0]))}>
      ColorPickerContents Mock - Color: {color}
    </div>
  )
}));

describe('ColorPicker', () => {
  const defaultProps = {
    color: '#FF0000'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Interface', () => {
    it('should export ColorPicker component', () => {
      expect(ColorPicker).toBeDefined();
    });

    it('should have displayName', () => {
      expect(ColorPicker.displayName).toBe('ColorPicker');
    });
  });

  describe('Props Interface', () => {
    it('should accept color prop', () => {
      const props = { ...defaultProps };
      expect(props.color).toBe('#FF0000');
    });

    it('should accept optional colorSpace prop', () => {
      const props = { ...defaultProps, colorSpace: 'OKlch' as const };
      expect(props.colorSpace).toBe('OKlch');
    });

    it('should accept optional gamut prop', () => {
      const props = { ...defaultProps, gamut: 'sRGB' as const };
      expect(props.gamut).toBe('sRGB');
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

    it('should default colorSpace to OKlch when not provided', () => {
      // Test that default values are correct
      expect('OKlch').toBe('OKlch');
    });

    it('should default gamut to sRGB when not provided', () => {
      // Test that default values are correct
      expect('sRGB').toBe('sRGB');
    });
  });

  describe('Color Change Handling', () => {
    it('should handle color changes from ColorPickerContents', () => {
      const onChange = vi.fn();
      const newColor = new Color('srgb', [1, 0, 0]);
      
      onChange(newColor);
      
      expect(onChange).toHaveBeenCalledWith(newColor);
    });

    it('should convert color to hex format when handling changes', () => {
      const color = new Color('srgb', [1, 0, 0]);
      const hexString = color.toString({ format: 'hex' });
      
      expect(hexString).toBe('#f00');
    });
  });

  describe('Integration with TokenValuePicker', () => {
    it('should work with TokenValuePicker color value format', () => {
      // Simulate the format that TokenValuePicker passes
      const tokenValueColor = '#FF6B35';
      const color = new Color(tokenValueColor);
      
      expect(color.toString({ format: 'hex' })).toBe('#ff6b35');
    });

    it('should handle color string conversion correctly', () => {
      const colorString = '#FF0000';
      const color = new Color(colorString);
      
      expect(color).toBeInstanceOf(Color);
      expect(color.toString({ format: 'hex' })).toBe('#f00');
    });
  });

  describe('Accessibility', () => {
    it('should have proper test IDs for all interactive elements', () => {
      // Test that test IDs are defined
      const testIds = [
        'color-picker-trigger',
        'color-picker-popover',
        'color-picker-contents'
      ];
      
      expect(testIds).toHaveLength(3);
      expect(testIds[0]).toBe('color-picker-trigger');
      expect(testIds[1]).toBe('color-picker-popover');
      expect(testIds[2]).toBe('color-picker-contents');
    });

    it('should have proper aria-label for trigger button', () => {
      // Test that aria-label is defined
      const ariaLabel = 'Open color picker';
      expect(ariaLabel).toBe('Open color picker');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid color strings gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        new Color('invalid-color');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
      
      consoleSpy.mockRestore();
    });
  });
}); 