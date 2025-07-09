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
    tokenSystem: TokenSystem
  ): FigmaVariableValue {
    const figmaType = this.mapToFigmaVariableType(resolvedValueTypeId, tokenSystem);
    
    console.log(`[FigmaValueConverter] Converting value:`, {
      value,
      resolvedValueTypeId,
      figmaType,
      valueType: typeof value
    });

    // Handle alias values directly
    if (this.isAliasValue(value)) {
      return this.convertAliasValue(value);
    }

    // Convert based on Figma type
    switch (figmaType) {
      case 'COLOR':
        return this.convertToFigmaColor(value);
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
  private convertToFigmaColor(value: unknown): { r: number; g: number; b: number; a?: number } {
    try {
      if (typeof value === 'string') {
        return this.convertStringToFigmaColor(value);
      }

      if (typeof value === 'object' && value !== null) {
        return this.convertObjectToFigmaColor(value);
      }

      console.warn(`[FigmaValueConverter] Unsupported color value type:`, value);
      return { r: 0, g: 0, b: 0 };
    } catch (error) {
      console.error(`[FigmaValueConverter] Color conversion error:`, error);
      return { r: 0, g: 0, b: 0 };
    }
  }

  /**
   * Convert string value to Figma color
   */
  private convertStringToFigmaColor(value: string): { r: number; g: number; b: number; a?: number } {
    // Handle hex colors
    if (isHexColor(value)) {
      const color = new Color(value);
      const rgb = color.to('srgb');
      
      const result: { r: number; g: number; b: number; a?: number } = {
        r: rgb.coords[0],
        g: rgb.coords[1],
        b: rgb.coords[2]
      };

      if (rgb.alpha !== undefined && rgb.alpha !== 1) {
        result.a = rgb.alpha;
      }

      return result;
    }

    // Handle other color formats
    const color = new Color(value);
    const rgb = color.to('srgb');
    
    const result: { r: number; g: number; b: number; a?: number } = {
      r: rgb.coords[0],
      g: rgb.coords[1],
      b: rgb.coords[2]
    };

    if (rgb.alpha !== undefined && rgb.alpha !== 1) {
      result.a = rgb.alpha;
    }

    return result;
  }

  /**
   * Convert object value to Figma color
   */
  private convertObjectToFigmaColor(colorObj: any): { r: number; g: number; b: number; a?: number } {
    // If it's already an RGB object, convert from 0-255 to 0-1 range if needed
    if (colorObj.r !== undefined && colorObj.g !== undefined && colorObj.b !== undefined) {
      const maxValue = Math.max(colorObj.r, colorObj.g, colorObj.b);
      const is255Range = maxValue > 1;
      
      const result: { r: number; g: number; b: number; a?: number } = {
        r: is255Range ? colorObj.r / 255 : colorObj.r,
        g: is255Range ? colorObj.g / 255 : colorObj.g,
        b: is255Range ? colorObj.b / 255 : colorObj.b
      };

      if (colorObj.a !== undefined) {
        result.a = colorObj.a;
      }

      return result;
    }
    
    // If it has hex property, convert it
    if (colorObj.hex) {
      return this.convertStringToFigmaColor(colorObj.hex);
    }
    
    // If it has rgb property, convert it
    if (colorObj.rgb) {
      const { r, g, b, a } = colorObj.rgb;
      const maxValue = Math.max(r, g, b);
      const is255Range = maxValue > 1;
      
      const result: { r: number; g: number; b: number; a?: number } = {
        r: is255Range ? r / 255 : r,
        g: is255Range ? g / 255 : g,
        b: is255Range ? b / 255 : b
      };

      if (a !== undefined) {
        result.a = a;
      }

      return result;
    }

    throw new Error(`Unsupported color object format: ${JSON.stringify(colorObj)}`);
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