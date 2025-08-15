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
    console.log(`[FigmaValueConverter] Converting color string: "${value}" with profile: ${fileColorProfile}`);
    
    try {
      // Step 1: Create Color object from original color data
      const color = new Color(value);
      console.log(`[FigmaValueConverter] Created color object:`, color);
      
      // Step 2: Convert to target file profile
      let targetColor;
      if (fileColorProfile === 'srgb') {
        // Convert to sRGB and constrain to gamut
        targetColor = color.toGamut('srgb').to('srgb');
        console.log(`[FigmaValueConverter] Converted to sRGB:`, targetColor.coords);
      } else if (fileColorProfile === 'display-p3') {
        // Convert to Display-P3
        targetColor = color.to('p3');
        console.log(`[FigmaValueConverter] Converted to Display-P3:`, targetColor.coords);
      } else {
        // Fallback to sRGB
        targetColor = color.toGamut('srgb').to('srgb');
        console.log(`[FigmaValueConverter] Fallback to sRGB:`, targetColor.coords);
      }
      
      // Step 3: Extract RGB values and ensure they're in 0-1 range
      const coords = targetColor.coords;
      const result: { r: number; g: number; b: number; a?: number } = {
        r: Math.max(0, Math.min(1, coords[0])),
        g: Math.max(0, Math.min(1, coords[1])),
        b: Math.max(0, Math.min(1, coords[2]))
      };
      
      // Step 4: Add alpha if present
      if (targetColor.alpha !== 1) {
        result.a = targetColor.alpha;
      }
      
      console.log(`[FigmaValueConverter] Final RGB result:`, result);
      return result;
      
    } catch (error) {
      console.error(`[FigmaValueConverter] Error converting color string "${value}":`, error);
      return { r: 0, g: 0, b: 0 };
    }
  }

  /**
   * Convert object value to Figma color
   */
  private convertObjectToFigmaColor(colorObj: any, fileColorProfile: 'srgb' | 'display-p3' = 'srgb'): { r: number; g: number; b: number; a?: number } {
    console.log(`[FigmaValueConverter] Converting color object:`, colorObj, `with profile: ${fileColorProfile}`);
    
    try {
      // Handle token value format: {value: "#4C6FFE"} or {value: "color(display-p3 1 0 0)"}
      if (colorObj.value && typeof colorObj.value === 'string') {
        return this.convertStringToFigmaColor(colorObj.value, fileColorProfile);
      }
      
      // Handle RGB object format: {r: 255, g: 0, b: 0}
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
        
        console.log(`[FigmaValueConverter] RGB object result:`, result);
        return result;
      }
      
      // Handle hex property: {hex: "#4C6FFE"}
      if (colorObj.hex) {
        return this.convertStringToFigmaColor(colorObj.hex, fileColorProfile);
      }
      
      // Handle Display-P3 object format: {p3: {r: 1, g: 0, b: 0}}
      if (colorObj.p3 && colorObj.p3.r !== undefined && colorObj.p3.g !== undefined && colorObj.p3.b !== undefined) {
        const result: { r: number; g: number; b: number; a?: number } = {
          r: colorObj.p3.r,
          g: colorObj.p3.g,
          b: colorObj.p3.b
        };
        
        if (colorObj.p3.a !== undefined) {
          result.a = colorObj.p3.a;
        }
        
        console.log(`[FigmaValueConverter] P3 object result:`, result);
        return result;
      }
      
      // Fallback: try to convert the object as a color using colorjs.io
      console.log(`[FigmaValueConverter] Attempting to convert object as color using colorjs.io`);
      const color = new Color(colorObj);
      
      // Convert to target file profile
      let targetColor;
      if (fileColorProfile === 'srgb') {
        // Convert to sRGB and constrain to gamut
        targetColor = color.toGamut('srgb').to('srgb');
      } else if (fileColorProfile === 'display-p3') {
        // Convert to Display-P3
        targetColor = color.to('p3');
      } else {
        // Fallback to sRGB
        targetColor = color.toGamut('srgb').to('srgb');
      }
      
      // Extract RGB values and ensure they're in 0-1 range
      const coords = targetColor.coords;
      const result: { r: number; g: number; b: number; a?: number } = {
        r: Math.max(0, Math.min(1, coords[0])),
        g: Math.max(0, Math.min(1, coords[1])),
        b: Math.max(0, Math.min(1, coords[2]))
      };
      
      // Add alpha if present
      if (targetColor.alpha !== 1) {
        result.a = targetColor.alpha;
      }
      
      console.log(`[FigmaValueConverter] Colorjs.io conversion result:`, result);
      return result;
      
    } catch (error) {
      console.error(`[FigmaValueConverter] Error converting color object:`, error);
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