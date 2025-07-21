import Color from 'colorjs.io';

/**
 * P3-HSL Color Space Utilities
 * 
 * Provides cylindrical coordinate transformation for Display-P3 color space,
 * similar to HSL but operating within P3 primaries and gamut boundaries.
 * 
 * This follows the same mathematical principles as HSL but is specifically
 * designed for Display-P3 color space characteristics.
 */

export interface P3HslCoords {
  h: number; // Hue: 0-360 degrees
  s: number; // Saturation: 0-100 percentage
  l: number; // Lightness: 0-100 percentage
}

export interface P3RgbCoords {
  r: number; // Red: 0-1
  g: number; // Green: 0-1
  b: number; // Blue: 0-1
}

/**
 * Convert Display-P3 RGB coordinates to P3-HSL coordinates
 * 
 * @param rgb - RGB coordinates in Display-P3 space (0-1 range)
 * @returns HSL coordinates (H: 0-360, S: 0-100, L: 0-100)
 */
export function p3RgbToHsl(rgb: P3RgbCoords): P3HslCoords {
  const { r, g, b } = rgb;
  
  // Find min and max values
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  // Calculate lightness (0-100)
  const l = (max + min) / 2 * 100;
  
  // If delta is 0, we have a grayscale color
  if (delta === 0) {
    return { h: 0, s: 0, l };
  }
  
  // Calculate saturation (0-100)
  const s = l > 50 ? delta / (2 - max - min) * 100 : delta / (max + min) * 100;
  
  // Calculate hue (0-360)
  let h: number;
  if (max === r) {
    h = ((g - b) / delta) % 6;
  } else if (max === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }
  
  h = h * 60;
  if (h < 0) h += 360;
  
  return { h, s, l };
}

/**
 * Convert P3-HSL coordinates to Display-P3 RGB coordinates
 * 
 * @param hsl - HSL coordinates (H: 0-360, S: 0-100, L: 0-100)
 * @returns RGB coordinates in Display-P3 space (0-1 range)
 */
export function p3HslToRgb(hsl: P3HslCoords): P3RgbCoords {
  const { h, s, l } = hsl;
  
  // Normalize values
  const hue = h / 360;
  const saturation = s / 100;
  const lightness = l / 100;
  
  // If saturation is 0, we have a grayscale color
  if (saturation === 0) {
    return { r: lightness, g: lightness, b: lightness };
  }
  
  // Helper function to convert hue to RGB
  const hueToRgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  
  const r = hueToRgb(p, q, hue + 1/3);
  const g = hueToRgb(p, q, hue);
  const b = hueToRgb(p, q, hue - 1/3);
  
  return { r, g, b };
}

/**
 * Create a Colorjs.io Color object from P3-HSL coordinates
 * 
 * @param hsl - HSL coordinates (H: 0-360, S: 0-100, L: 0-100)
 * @returns Color object in Display-P3 space
 */
export function p3HslToColor(hsl: P3HslCoords): Color {
  const rgb = p3HslToRgb(hsl);
  return new Color('p3', [rgb.r, rgb.g, rgb.b]);
}

/**
 * Extract P3-HSL coordinates from a Colorjs.io Color object
 * 
 * @param color - Color object (will be converted to P3 if needed)
 * @returns HSL coordinates (H: 0-360, S: 0-100, L: 0-100)
 */
export function colorToP3Hsl(color: Color): P3HslCoords {
  // Convert to P3 space
  const p3Color = color.to('p3');
  const [r, g, b] = p3Color.coords;
  
  return p3RgbToHsl({ r, g, b });
}

/**
 * Get channel range for P3-HSL color space
 * 
 * @param channel - Channel name ('h', 's', or 'l')
 * @returns Range object with min and max values
 */
export function getP3HslChannelRange(channel: string): { min: number; max: number } {
  switch (channel) {
    case 'h':
      return { min: 0, max: 360 }; // Hue: 0-360 degrees
    case 's':
    case 'l':
      return { min: 0, max: 100 }; // Saturation and Lightness: 0-100 percentage
    default:
      return { min: 0, max: 1 };
  }
}

/**
 * Validate P3-HSL coordinates
 * 
 * @param hsl - HSL coordinates to validate
 * @returns True if coordinates are valid
 */
export function isValidP3Hsl(hsl: P3HslCoords): boolean {
  const { h, s, l } = hsl;
  
  return (
    h >= 0 && h <= 360 &&
    s >= 0 && s <= 100 &&
    l >= 0 && l <= 100 &&
    !isNaN(h) && !isNaN(s) && !isNaN(l)
  );
}

/**
 * Clamp P3-HSL coordinates to valid ranges
 * 
 * @param hsl - HSL coordinates to clamp
 * @returns Clamped HSL coordinates
 */
export function clampP3Hsl(hsl: P3HslCoords): P3HslCoords {
  return {
    h: Math.max(0, Math.min(360, hsl.h)),
    s: Math.max(0, Math.min(100, hsl.s)),
    l: Math.max(0, Math.min(100, hsl.l))
  };
}

/**
 * Convert P3-HSL coordinates to normalized values (0-1 range)
 * 
 * @param hsl - HSL coordinates
 * @returns Normalized coordinates (0-1 range)
 */
export function p3HslToNormalized(hsl: P3HslCoords): [number, number, number] {
  return [
    hsl.h / 360,  // Hue: 0-1
    hsl.s / 100,  // Saturation: 0-1
    hsl.l / 100   // Lightness: 0-1
  ];
}

/**
 * Convert normalized values (0-1 range) to P3-HSL coordinates
 * 
 * @param normalized - Normalized coordinates (0-1 range)
 * @returns HSL coordinates
 */
export function normalizedToP3Hsl(normalized: [number, number, number]): P3HslCoords {
  return {
    h: normalized[0] * 360,  // Hue: 0-360
    s: normalized[1] * 100,  // Saturation: 0-100
    l: normalized[2] * 100   // Lightness: 0-100
  };
} 