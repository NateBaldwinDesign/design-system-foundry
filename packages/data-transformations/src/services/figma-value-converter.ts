import type { FigmaVariableType, FigmaVariableValue } from '../types/figma';
import type { TokenSystem } from '@token-model/data-model';
import Color from 'colorjs.io';
import { getResolvedValueType, isHexColor } from '../utils/helpers';

/**
 * Centralized service for converting token values to Figma format
 * Handles all value type conversions and ensures consistency
 */
export class FigmaValueConverter {
  /**
   * Convert a token value to Figma format based on the resolved value type
   */
  convertValue(
    value: unknown, 
    resolvedValueTypeId: string, 
    tokenSystem: TokenSystem,
    fileColorProfile: 'srgb' | 'display-p3' = 'srgb'
  ): FigmaVariableValue {
    const figmaType = this.mapToFigmaVariableType(resolvedValueTypeId, tokenSystem);
    
    console.log(`[FigmaValueConverter] Converting value:`, {
      value,
      resolvedValueTypeId,
      figmaType,
      valueType: typeof value,
      fileColorProfile
    });

    // Handle alias values directly
    if (this.isAliasValue(value)) {
      return this.convertAliasValue(value);
    }

    // Convert based on Figma type
    switch (figmaType) {
      case 'COLOR':
        return this.convertToFigmaColor(value, fileColorProfile);
      case 'FLOAT':
        return this.convertToFigmaFloat(value);
      case 'BOOLEAN':
        return this.convertToFigmaBoolean(value);
      case 'STRING':
      default:
        return this.convertToFigmaString(value);
    }
  }

  /**
   * Map resolved value type to Figma variable type
   */
  mapToFigmaVariableType(resolvedValueTypeId: string, tokenSystem: TokenSystem): FigmaVariableType {
    const resolvedValueType = getResolvedValueType(tokenSystem, resolvedValueTypeId);
    
    if (!resolvedValueType) {
      console.warn(`[FigmaValueConverter] No resolvedValueType found for ${resolvedValueTypeId}, defaulting to STRING`);
      return 'STRING';
    }

    const type = resolvedValueType.id || resolvedValueType.type || resolvedValueType.displayName?.toLowerCase();

    switch (type) {
      case 'color':
        return 'COLOR';
      case 'spacing':
      case 'font-size':
      case 'line_height':
      case 'letter_spacing':
      case 'blur':
      case 'spread':
      case 'radius':
      case 'opacity':
        return 'FLOAT';
      case 'font_family':
      case 'font_weight':
      case 'duration':
      case 'cubic_bezier':
      case 'shadow':
      case 'border':
      case 'z_index':
        return 'STRING';
      default:
        return 'STRING';
    }
  }

  /**
   * Check if a value is an alias value
   */
  private isAliasValue(value: unknown): boolean {
    return (
      typeof value === 'object' && 
      value !== null && 
      'type' in value && 
      value.type === 'VARIABLE_ALIAS'
    );
  }

  /**
   * Convert alias value to Figma format
   */
  private convertAliasValue(value: any): { type: 'VARIABLE_ALIAS'; id: string } {
    return {
      type: 'VARIABLE_ALIAS',
      id: value.id || value.variableId || ''
    };
  }

  /**
   * Convert value to Figma color format using colorjs.io
   * Returns RGB object with optional alpha: { r: number, g: number, b: number, a?: number }
   * Figma expects linear RGB values in 0-1 range
   */
  convertToFigmaColor(value: unknown, fileColorProfile: 'srgb' | 'display-p3' = 'srgb'): { r: number; g: number; b: number; a?: number } {
    try {
      if (typeof value === 'string') {
        return this.convertStringToFigmaColor(value, fileColorProfile);
      }
      if (typeof value === 'object' && value !== null) {
        return this.convertObjectToFigmaColor(value, fileColorProfile);
      }
      console.warn(`[FigmaValueConverter] Unsupported color value type:`, value);
      return { r: 0, g: 0, b: 0 };
    }
    catch (error) {
      console.error(`[FigmaValueConverter] Color conversion error:`, error);
      return { r: 0, g: 0, b: 0 };
    }
  }

  /**
   * Convert string value to Figma color
   */
  private convertStringToFigmaColor(value: string, fileColorProfile: 'srgb' | 'display-p3' = 'srgb'): { r: number; g: number; b: number; a?: number } {
    // Handle hex colors
    if (isHexColor(value)) {
      const color = new Color(value);
      const rgb = color.to(fileColorProfile);
      
      const result: { r: number; g: number; b: number; a?: number } = {
        r: rgb.coords[0],
        g: rgb.coords[1],
        b: rgb.coords[2]
      };
      
      if (rgb.alpha !== 1) {
        result.a = rgb.alpha;
      }
      
      return result;
    }

    // Handle Display-P3 colors when fileColorProfile is display-p3
    if (fileColorProfile === 'display-p3' && value.startsWith('color(display-p3')) {
      // Extract P3 values directly from the color string
      const p3Match = value.match(/color\(display-p3\s+([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s+\/\s+([0-9.]+))?\)/);
      if (p3Match) {
        const result: { r: number; g: number; b: number; a?: number } = {
          r: parseFloat(p3Match[1]),
          g: parseFloat(p3Match[2]),
          b: parseFloat(p3Match[3])
        };
        
        if (p3Match[4]) {
          result.a = parseFloat(p3Match[4]);
        }
        
        return result;
      }
    }

    // Handle other color formats
    const color = new Color(value);
    
    // If converting to sRGB, ensure the color is in gamut
    if (fileColorProfile === 'srgb') {
      const sRgbColor = color.to('srgb');
      
      // Check if any coordinates are outside 0-1 range
      const coords = sRgbColor.coords;
      const needsClamping = coords.some(coord => coord < 0 || coord > 1);
      
      if (needsClamping) {
        // Use toGamut to clamp the color
        const clampedColor = color.toGamut('srgb');
        const clampedRgb = clampedColor.to('srgb');
        
        const result: { r: number; g: number; b: number; a?: number } = {
          r: Math.max(0, Math.min(1, clampedRgb.coords[0])),
          g: Math.max(0, Math.min(1, clampedRgb.coords[1])),
          b: Math.max(0, Math.min(1, clampedRgb.coords[2]))
        };
        
        if (clampedRgb.alpha !== 1) {
          result.a = clampedRgb.alpha;
        }
        
        return result;
      }
      
      const result: { r: number; g: number; b: number; a?: number } = {
        r: sRgbColor.coords[0],
        g: sRgbColor.coords[1],
        b: sRgbColor.coords[2]
      };
      
      if (sRgbColor.alpha !== 1) {
        result.a = sRgbColor.alpha;
      }
      
      return result;
    }
    
    // For other color profiles, convert normally
    const rgb = color.to(fileColorProfile);
    
    const result: { r: number; g: number; b: number; a?: number } = {
      r: rgb.coords[0],
      g: rgb.coords[1],
      b: rgb.coords[2]
    };
    
    if (rgb.alpha !== 1) {
      result.a = rgb.alpha;
    }
    
    return result;
  }

  /**
   * Convert object value to Figma color
   */
  private convertObjectToFigmaColor(colorObj: any, fileColorProfile: 'srgb' | 'display-p3' = 'srgb'): { r: number; g: number; b: number; a?: number } {
    // If it's already an RGB object, convert from 0-255 to 0-1 range if needed
    if (colorObj.r !== undefined && colorObj.g !== undefined && colorObj.b !== undefined) {
      // Check if values are in 0-255 range and convert to 0-1
      const maxValue = Math.max(colorObj.r, colorObj.g, colorObj.b);
      const scale = maxValue > 1 ? 255 : 1;
      
      const result: { r: number; g: number; b: number; a?: number } = {
        r: colorObj.r / scale,
        g: colorObj.g / scale,
        b: colorObj.b / scale
      };
      
      if (colorObj.a !== undefined) {
        result.a = colorObj.a;
      }
      
      return result;
    }

    // Handle Display-P3 object format when fileColorProfile is display-p3
    if (fileColorProfile === 'display-p3' && colorObj.p3) {
      const result: { r: number; g: number; b: number; a?: number } = {
        r: colorObj.p3.r,
        g: colorObj.p3.g,
        b: colorObj.p3.b
      };
      
      if (colorObj.p3.a !== undefined) {
        result.a = colorObj.p3.a;
      }
      
      return result;
    }

    // If it has hex property, convert it
    if (colorObj.hex) {
      return this.convertStringToFigmaColor(colorObj.hex, fileColorProfile);
    }
    
    // Handle token value format: {value: "#4C6FFE"}
    if (colorObj.value && typeof colorObj.value === 'string') {
      return this.convertStringToFigmaColor(colorObj.value, fileColorProfile);
    }

    // Handle CSS color format: {value: "color(display-p3 1 0 0)"}
    if (colorObj.value && typeof colorObj.value === 'string' && colorObj.value.startsWith('color(')) {
      return this.convertStringToFigmaColor(colorObj.value, fileColorProfile);
    }

    // Fallback: try to convert the object as a color
    try {
      const color = new Color(colorObj);
      
      // If converting to sRGB, ensure the color is in gamut
      if (fileColorProfile === 'srgb') {
        const sRgbColor = color.to('srgb');
        
        // Check if any coordinates are outside 0-1 range
        const coords = sRgbColor.coords;
        const needsClamping = coords.some(coord => coord < 0 || coord > 1);
        
        if (needsClamping) {
          // Use toGamut to clamp the color
          const clampedColor = color.toGamut('srgb');
          const clampedRgb = clampedColor.to('srgb');
          
          const result: { r: number; g: number; b: number; a?: number } = {
            r: Math.max(0, Math.min(1, clampedRgb.coords[0])),
            g: Math.max(0, Math.min(1, clampedRgb.coords[1])),
            b: Math.max(0, Math.min(1, clampedRgb.coords[2]))
          };
          
          if (clampedRgb.alpha !== 1) {
            result.a = clampedRgb.alpha;
          }
          
          return result;
        }
        
        const result: { r: number; g: number; b: number; a?: number } = {
          r: sRgbColor.coords[0],
          g: sRgbColor.coords[1],
          b: sRgbColor.coords[2]
        };
        
        if (sRgbColor.alpha !== 1) {
          result.a = sRgbColor.alpha;
        }
        
        return result;
      }
      
      // For other color profiles, convert normally
      const rgb = color.to(fileColorProfile);
      
      const result: { r: number; g: number; b: number; a?: number } = {
        r: rgb.coords[0],
        g: rgb.coords[1],
        b: rgb.coords[2]
      };
      
      if (rgb.alpha !== 1) {
        result.a = rgb.alpha;
      }
      
      return result;
    } catch (error) {
      console.warn(`[FigmaValueConverter] Failed to convert color object:`, colorObj, error);
      return { r: 0, g: 0, b: 0 };
    }
  }

  /**
   * Convert value to Figma float format
   */
  private convertToFigmaFloat(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      // Try to extract numeric value from dimension strings like "16px", "1.5rem"
      const match = value.match(/^([0-9]+(\.[0-9]+)?)/);
      if (match) {
        return parseFloat(match[1]);
      }
    }

    if (typeof value === 'object' && value !== null) {
      const dimObj = value as any;
      if (typeof dimObj.value === 'number') {
        return dimObj.value;
      }
    }

    return 0;
  }

  /**
   * Convert value to Figma string format
   */
  private convertToFigmaString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object' && value !== null) {
      const obj = value as any;
      // Handle token value format: {value: "Inter Han"}
      if (typeof obj.value === 'string') {
        return obj.value;
      }
      // Handle token reference format: {tokenId: "token-id"}
      if (obj.tokenId) {
        // Return a placeholder string - the actual value will be resolved by daisy-chain logic
        console.log(`[FigmaValueConverter] Token reference detected: ${obj.tokenId}, using placeholder string`);
        return 'placeholder';
      }
      // For other objects, stringify as fallback
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Convert value to Figma boolean format
   */
  private convertToFigmaBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    return Boolean(value);
  }

  /**
   * Get a placeholder value for an alias variable based on the resolved value type
   */
  getAliasPlaceholderValue(tokenSystem: TokenSystem, resolvedValueTypeId: string): FigmaVariableValue {
    const figmaType = this.mapToFigmaVariableType(resolvedValueTypeId, tokenSystem);
    
    switch (figmaType) {
      case 'COLOR':
        return { r: 0, g: 0, b: 0 };
      case 'FLOAT':
        return 0;
      case 'BOOLEAN':
        return false;
      case 'STRING':
      default:
        return '';
    }
  }
} 