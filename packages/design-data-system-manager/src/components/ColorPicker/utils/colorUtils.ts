import Color from 'colorjs.io';
import { colorToP3Hsl, p3HslToColor, type P3HslCoords } from './p3HslUtils';

// Extended canvas context type to include colorSpace property
export interface ExtendedCanvasRenderingContext2D extends CanvasRenderingContext2D {
  colorSpace?: string;
}

// Color space and model configuration
export interface ColorSpaceConfig {
  id: string;
  channels: string[];
  defaultChannels: [string, string];
  thirdChannel: string;
}

// Memoized color space configurations for performance
const COLOR_SPACE_CONFIGS = new Map<string, ColorSpaceConfig>();

const getColorSpaceConfig = (colorSpace: string, model: string): ColorSpaceConfig => {
  const key = `${colorSpace}-${model}`;
  
  if (COLOR_SPACE_CONFIGS.has(key)) {
    return COLOR_SPACE_CONFIGS.get(key)!;
  }
  
  let config: ColorSpaceConfig;
  
  switch (colorSpace) {
    case 'sRGB':
      if (model === 'polar') {
        config = {
          id: 'hsl',
          channels: ['h', 's', 'l'],
          defaultChannels: ['s', 'l'],
          thirdChannel: 'h'
        };
      } else {
        config = {
          id: 'srgb',
          channels: ['r', 'g', 'b'],
          defaultChannels: ['r', 'g'],
          thirdChannel: 'b' // Default to blue, but this could be configurable
        };
      }
      break;
      
    case 'Display P3':
      if (model === 'polar') {
        config = {
          id: 'p3-hsl', // Custom P3-HSL color space
          channels: ['h', 's', 'l'],
          defaultChannels: ['s', 'l'],
          thirdChannel: 'h'
        };
      } else {
        config = {
          id: 'p3',
          channels: ['r', 'g', 'b'],
          defaultChannels: ['r', 'g'],
          thirdChannel: 'b'
        };
      }
      break;
      
    case 'OKlch':
      if (model === 'polar') {
        config = {
          id: 'oklch',
          channels: ['l', 'c', 'h'],
          defaultChannels: ['c', 'h'],
          thirdChannel: 'l'
        };
      } else {
        config = {
          id: 'oklab',
          channels: ['l', 'a', 'b'],
          defaultChannels: ['a', 'b'],
          thirdChannel: 'l'
        };
      }
      break;
      
    default:
      config = {
        id: 'srgb',
        channels: ['r', 'g', 'b'],
        defaultChannels: ['r', 'g'],
        thirdChannel: 'b'
      };
  }
  
  COLOR_SPACE_CONFIGS.set(key, config);
  return config;
};

// Memoized channel ranges for performance
const CHANNEL_RANGES = new Map<string, { min: number; max: number }>();

export const getChannelRange = (channel: string, colorSpaceId: string): { min: number; max: number } => {
  const key = `${colorSpaceId}-${channel}`;
  
  if (CHANNEL_RANGES.has(key)) {
    return CHANNEL_RANGES.get(key)!;
  }
  
  let range: { min: number; max: number };
  
  switch (colorSpaceId) {
    case 'hsl':
      // HSL coordinates: H (0-360), S (0-100), L (0-100)
      if (channel === 'h') range = { min: 0, max: 360 };
      else if (channel === 's' || channel === 'l') range = { min: 0, max: 100 };
      else range = { min: 0, max: 1 };
      break;
      
    case 'p3-hsl':
      // P3-HSL coordinates: H (0-360), S (0-100), L (0-100)
      if (channel === 'h') range = { min: 0, max: 360 };
      else if (channel === 's' || channel === 'l') range = { min: 0, max: 100 };
      else range = { min: 0, max: 1 };
      break;
      
    case 'oklch':
      // OKLCh coordinates: L (0-1), C (0-0.26), H (0-360)
      if (channel === 'l') range = { min: 0, max: 1 };
      else if (channel === 'c') range = { min: 0, max: 0.26 }; // Practical max chroma
      else if (channel === 'h') range = { min: 0, max: 360 };
      else range = { min: 0, max: 1 };
      break;
      
    case 'oklab':
      // OKLab coordinates: L (0-1), a (-0.13 to 0.20), b (-0.28 to 0.10)
      if (channel === 'l') range = { min: 0, max: 1 };
      else if (channel === 'a') range = { min: -0.13, max: 0.20 };
      else if (channel === 'b') range = { min: -0.28, max: 0.10 };
      else range = { min: 0, max: 1 };
      break;
      
    default:
      // sRGB, Display P3, and other color spaces use 0-1 range
      range = { min: 0, max: 1 };
  }
  
  CHANNEL_RANGES.set(key, range);
  return range;
};

// Convert gamut prop to Colorjs.io space identifier
export const getGamutSpace = (gamut: string): string => {
  switch (gamut) {
    case 'sRGB':
      return 'srgb';
    case 'Display-P3':
      return 'p3';
    case 'Rec2020':
      return 'rec2020';
    default:
      return 'srgb';
  }
};

// Check if coordinates would be out-of-gamut for the specified gamut
export const isOutOfGamut = (coords: [number, number, number], targetSpace: string, gamutSpace: string): boolean => {
  try {
    // Create color with exact coordinates (no automatic mapping)
    const testColor = new Color(targetSpace, coords);
    
    // Convert to the target gamut space to check if any component is outside 0-1 range
    const gamutColor = testColor.to(gamutSpace);
    const [r, g, b] = gamutColor.coords;
    
    // Check if any component is outside the valid range
    return r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1;
  } catch (error) {
    // If conversion fails, assume it's out of gamut
    return true;
  }
};

// Get canvas pixel color using Colorjs.io with performance optimization
export const getCanvasPixelColor = (pixelColor: Color, canvasColorSpace: string): [number, number, number, number] => {
  try {
    let outputColor: Color;
    
    // Convert to the appropriate color space for the canvas
    switch (canvasColorSpace) {
      case 'display-p3':
        outputColor = pixelColor.to('p3');
        break;
      case 'srgb':
      default:
        outputColor = pixelColor.to('srgb');
        break;
    }
    
    // Get coordinates and clamp to valid range [0, 1]
    const [r, g, b] = outputColor.coords.map(v => Math.max(0, Math.min(1, v)));
    const alpha = Math.max(0, Math.min(1, outputColor.alpha ?? 1));
    
    return [
      Math.round(r * 255),     // R
      Math.round(g * 255),     // G
      Math.round(b * 255),     // B
      Math.round(alpha * 255)  // A
    ];
  } catch (error) {
    // Fallback to sRGB if conversion fails
    const srgb = pixelColor.to('srgb');
    const [r, g, b] = srgb.coords.map(v => Math.max(0, Math.min(1, v)));
    const alpha = Math.max(0, Math.min(1, srgb.alpha ?? 1));
    
    return [
      Math.round(r * 255),
      Math.round(g * 255),
      Math.round(b * 255),
      Math.round(alpha * 255)
    ];
  }
};

// Convert canvas coordinates to color coordinates with gamut mapping
export const canvasToColorCoords = (
  canvasX: number,
  canvasY: number,
  size: number,
  baseColor: Color,
  colorSpace: string,
  model: string,
  colorChannels: [string, string],
  gamut: string
): Color => {
  const config = getColorSpaceConfig(colorSpace, model);
  const channels = colorChannels || config.defaultChannels;
  const [channelX, channelY] = channels;
  
  // Validate channels
  if (!config.channels.includes(channelX) || !config.channels.includes(channelY)) {
    throw new Error(`Invalid channels [${channelX}, ${channelY}] for color space ${colorSpace} and model ${model}`);
  }
  
  // Handle P3-HSL color space specially
  if (config.id === 'p3-hsl') {
    // Get current HSL values from base color
    const currentHsl = colorToP3Hsl(baseColor);
    
    // Calculate normalized values (0-1) for each axis
    const valueX = canvasX / size;
    const valueY = (size - canvasY) / size; // Invert Y axis
    
    // Get channel ranges for proper scaling
    const rangeX = getChannelRange(channelX, config.id);
    const rangeY = getChannelRange(channelY, config.id);
    
    // Create new HSL coordinates
    const newHsl: P3HslCoords = { ...currentHsl };
    
    // Update coordinates based on selected channels with proper scaling
    if (channelX === 'h') newHsl.h = rangeX.min + (valueX * (rangeX.max - rangeX.min));
    else if (channelX === 's') newHsl.s = rangeX.min + (valueX * (rangeX.max - rangeX.min));
    else if (channelX === 'l') newHsl.l = rangeX.min + (valueX * (rangeX.max - rangeX.min));
    
    if (channelY === 'h') newHsl.h = rangeY.min + (valueY * (rangeY.max - rangeY.min));
    else if (channelY === 's') newHsl.s = rangeY.min + (valueY * (rangeY.max - rangeY.min));
    else if (channelY === 'l') newHsl.l = rangeY.min + (valueY * (rangeY.max - rangeY.min));
    
    // Create new color from HSL coordinates
    const newColor = p3HslToColor(newHsl);
    
    // Apply gamut mapping if needed
    const gamutSpace = getGamutSpace(gamut);
    if (!newColor.inGamut(gamutSpace)) {
      return newColor.toGamut({ space: gamutSpace });
    }
    
    return newColor;
  }
  
  // Handle other color spaces with standard approach
  // Convert base color to target color space
  const targetColor = baseColor.to(config.id);
  const coords = [...targetColor.coords] as [number, number, number];
  
  // Calculate normalized values (0-1) for each axis
  const valueX = canvasX / size;
  const valueY = (size - canvasY) / size; // Invert Y axis
  
  // Map channels to coordinate indices
  const channelIndexX = config.channels.indexOf(channelX);
  const channelIndexY = config.channels.indexOf(channelY);
  
  // Get channel ranges for proper scaling
  const rangeX = getChannelRange(channelX, config.id);
  const rangeY = getChannelRange(channelY, config.id);
  
  // Update coordinates based on selected channels with proper scaling
  coords[channelIndexX] = rangeX.min + (valueX * (rangeX.max - rangeX.min));
  coords[channelIndexY] = rangeY.min + (valueY * (rangeY.max - rangeY.min));
  
  // Create new color with updated coordinates
  const newColor = new Color(config.id, coords);
  
  // Apply gamut mapping if needed
  const gamutSpace = getGamutSpace(gamut);
  if (!newColor.inGamut(gamutSpace)) {
    return newColor.toGamut({ space: gamutSpace });
  }
  
  return newColor;
};

// Convert color coordinates to canvas coordinates
export const colorToCanvasCoords = (
  color: Color,
  size: number,
  colorSpace: string,
  model: string,
  colorChannels: [string, string]
): { x: number; y: number } => {
  const config = getColorSpaceConfig(colorSpace, model);
  const channels = colorChannels || config.defaultChannels;
  const [channelX, channelY] = channels;
  
  // Handle P3-HSL color space specially
  if (config.id === 'p3-hsl') {
    // Get HSL coordinates from color
    const hsl = colorToP3Hsl(color);
    
    // Get channel ranges for proper scaling
    const rangeX = getChannelRange(channelX, config.id);
    const rangeY = getChannelRange(channelY, config.id);
    
    // Get coordinate values
    let xCoord: number, yCoord: number;
    
    if (channelX === 'h') xCoord = hsl.h;
    else if (channelX === 's') xCoord = hsl.s;
    else if (channelX === 'l') xCoord = hsl.l;
    else xCoord = 0;
    
    if (channelY === 'h') yCoord = hsl.h;
    else if (channelY === 's') yCoord = hsl.s;
    else if (channelY === 'l') yCoord = hsl.l;
    else yCoord = 0;
    
    // For polar coordinates, handle wrapping and scaling
    if (model === 'polar') {
      if (channelX === 'h') {
        // Hue wraps around 0-360 degrees
        const normalizedX = (xCoord % 360 + 360) % 360 / 360;
        const normalizedY = (yCoord - rangeY.min) / (rangeY.max - rangeY.min);
        return { x: normalizedX * size, y: (1 - normalizedY) * size };
      } else if (channelY === 'h') {
        // Hue wraps around 0-360 degrees
        const normalizedX = (xCoord - rangeX.min) / (rangeX.max - rangeX.min);
        const normalizedY = (yCoord % 360 + 360) % 360 / 360;
        return { x: normalizedX * size, y: (1 - normalizedY) * size };
      } else {
        // Other polar coordinates (saturation, lightness)
        const normalizedX = (xCoord - rangeX.min) / (rangeX.max - rangeX.min);
        const normalizedY = (yCoord - rangeY.min) / (rangeY.max - rangeY.min);
        return { x: normalizedX * size, y: (1 - normalizedY) * size };
      }
    }
    
    // For cartesian coordinates, use proper scaling
    const normalizedX = (xCoord - rangeX.min) / (rangeX.max - rangeX.min);
    const normalizedY = (yCoord - rangeY.min) / (rangeY.max - rangeY.min);
    
    // Clamp to 0-1 range
    const clampedX = Math.max(0, Math.min(1, normalizedX));
    const clampedY = Math.max(0, Math.min(1, normalizedY));
    
    return { x: clampedX * size, y: (1 - clampedY) * size };
  }
  
  // Handle other color spaces with standard approach
  // Get the color coordinates in the current color space
  const colorInSpace = color.to(config.id);
  const coords = colorInSpace.coords;
  
  // Map channel names to coordinate indices
  const channelIndexX = config.channels.indexOf(channelX);
  const channelIndexY = config.channels.indexOf(channelY);
  
  // Get coordinate values
  const xCoord = coords[channelIndexX] || 0;
  const yCoord = coords[channelIndexY] || 0;
  
  // Get channel ranges for proper scaling
  const rangeX = getChannelRange(channelX, config.id);
  const rangeY = getChannelRange(channelY, config.id);
  
  // For polar coordinates, handle wrapping and scaling
  if (model === 'polar') {
    if (channelX === 'h') {
      // Hue wraps around 0-360 degrees
      const normalizedX = (xCoord % 360 + 360) % 360 / 360;
      const normalizedY = (yCoord - rangeY.min) / (rangeY.max - rangeY.min);
      return { x: normalizedX * size, y: (1 - normalizedY) * size };
    } else if (channelY === 'h') {
      // Hue wraps around 0-360 degrees
      const normalizedX = (xCoord - rangeX.min) / (rangeX.max - rangeX.min);
      const normalizedY = (yCoord % 360 + 360) % 360 / 360;
      return { x: normalizedX * size, y: (1 - normalizedY) * size };
    } else {
      // Other polar coordinates (saturation, lightness, chroma)
      const normalizedX = (xCoord - rangeX.min) / (rangeX.max - rangeX.min);
      const normalizedY = (yCoord - rangeY.min) / (rangeY.max - rangeY.min);
      return { x: normalizedX * size, y: (1 - normalizedY) * size };
    }
  }
  
  // For cartesian coordinates, use proper scaling
  const normalizedX = (xCoord - rangeX.min) / (rangeX.max - rangeX.min);
  const normalizedY = (yCoord - rangeY.min) / (rangeY.max - rangeY.min);
  
  // Clamp to 0-1 range
  const clampedX = Math.max(0, Math.min(1, normalizedX));
  const clampedY = Math.max(0, Math.min(1, normalizedY));
  
  return { x: clampedX * size, y: (1 - clampedY) * size };
};

// Find the closest in-gamut color to a given canvas position
export const findClosestInGamutColor = (
  canvasX: number,
  canvasY: number,
  size: number,
  baseColor: Color,
  colorSpace: string,
  model: string,
  colorChannels: [string, string],
  gamut: string
): Color => {
  try {
    // First, try to create the color directly
    const directColor = canvasToColorCoords(canvasX, canvasY, size, baseColor, colorSpace, model, colorChannels, gamut);
    
    // If it's already in gamut, return it
    const gamutSpace = getGamutSpace(gamut);
    if (directColor.inGamut(gamutSpace)) {
      return directColor;
    }
    
    // If not in gamut, we need to find the closest in-gamut color
    // Use Colorjs.io's built-in gamut mapping with different methods to find the best result
    
    // Try different gamut mapping methods and find the one closest to the original
    const config = getColorSpaceConfig(colorSpace, model);
    const mappingMethods = [
      { method: 'clip' as const, space: gamutSpace },
      { method: 'chroma' as const, space: gamutSpace },
      { method: 'oklch.chroma' as const, space: gamutSpace },
      { method: 'oklch.lightness' as const, space: gamutSpace }
    ];
    
    let bestColor = directColor;
    let bestDistance = Infinity;
    
    for (const mapping of mappingMethods) {
      try {
        const mappedColor = directColor.toGamut(mapping);
        
        // Calculate distance between original and mapped color in the target space
        const originalInTarget = directColor.to(config.id);
        const mappedInTarget = mappedColor.to(config.id);
        
        const distance = Math.sqrt(
          Math.pow(originalInTarget.coords[0] - mappedInTarget.coords[0], 2) +
          Math.pow(originalInTarget.coords[1] - mappedInTarget.coords[1], 2) +
          Math.pow(originalInTarget.coords[2] - mappedInTarget.coords[2], 2)
        );
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestColor = mappedColor;
        }
      } catch (error) {
        // Skip this mapping method if it fails
        continue;
      }
    }
    
    return bestColor;
    
  } catch (error) {
    console.error('Error finding closest in-gamut color:', error);
    // Return the base color as fallback
    return baseColor;
  }
};

// Constrain canvas coordinates to gamut boundaries
export const constrainToGamutBoundary = (
  canvasX: number,
  canvasY: number,
  size: number,
  baseColor: Color,
  colorSpace: string,
  model: string,
  colorChannels: [string, string],
  gamut: string
): { x: number; y: number } => {
  const config = getColorSpaceConfig(colorSpace, model);
  const channels = colorChannels || config.defaultChannels;
  const [channelX, channelY] = channels;
  
  // Validate channels
  if (!config.channels.includes(channelX) || !config.channels.includes(channelY)) {
    throw new Error(`Invalid channels [${channelX}, ${channelY}] for color space ${colorSpace} and model ${model}`);
  }
  
  // Handle P3-HSL color space specially
  if (config.id === 'p3-hsl') {
    // Get current HSL values from base color
    const currentHsl = colorToP3Hsl(baseColor);
    
    // Calculate normalized values (0-1) for each axis
    const valueX = canvasX / size;
    const valueY = (size - canvasY) / size; // Invert Y axis
    
    // Get channel ranges for proper scaling
    const rangeX = getChannelRange(channelX, config.id);
    const rangeY = getChannelRange(channelY, config.id);
    
    // Create new HSL coordinates
    const newHsl: P3HslCoords = { ...currentHsl };
    
    // Update coordinates based on selected channels with proper scaling
    if (channelX === 'h') newHsl.h = rangeX.min + (valueX * (rangeX.max - rangeX.min));
    else if (channelX === 's') newHsl.s = rangeX.min + (valueX * (rangeX.max - rangeX.min));
    else if (channelX === 'l') newHsl.l = rangeX.min + (valueX * (rangeX.max - rangeX.min));
    
    if (channelY === 'h') newHsl.h = rangeY.min + (valueY * (rangeY.max - rangeY.min));
    else if (channelY === 's') newHsl.s = rangeY.min + (valueY * (rangeY.max - rangeY.min));
    else if (channelY === 'l') newHsl.l = rangeY.min + (valueY * (rangeY.max - rangeY.min));
    
    // Create new color from HSL coordinates
    const testColor = p3HslToColor(newHsl);
    
    // Check if this position is already in gamut
    const gamutSpace = getGamutSpace(gamut);
    if (testColor.inGamut(gamutSpace)) {
      // Already in gamut, return original coordinates
      return { x: canvasX, y: canvasY };
    }
    
    // Position is out of gamut, need to find the closest in-gamut position
    // Use radial search from the target point outward to find the closest boundary
    
    // Search parameters
    const maxRadius = Math.max(size, size) * 0.5; // Maximum search radius
    const searchSteps = 16; // Number of radial directions to search
    const maxIterations = 12; // Maximum iterations per direction
    
    let bestPosition = { x: canvasX, y: canvasY };
    let bestDistance = Infinity;
    
    // Search in multiple radial directions from the target point
    for (let angleStep = 0; angleStep < searchSteps; angleStep++) {
      const angle = (angleStep / searchSteps) * 2 * Math.PI;
      
      // Binary search along this radial direction
      let low = 0;
      let high = maxRadius;
      let iterations = 0;
      
      while (iterations < maxIterations && (high - low) > 1) {
        const radius = (low + high) / 2;
        
        // Calculate position along this radial direction
        const testX = canvasX + Math.cos(angle) * radius;
        const testY = canvasY + Math.sin(angle) * radius;
        
        // Clamp to canvas bounds
        const clampedX = Math.max(0, Math.min(size, testX));
        const clampedY = Math.max(0, Math.min(size, testY));
        
        // Convert to color coordinates
        const testValueX = clampedX / size;
        const testValueY = (size - clampedY) / size;
        
        const testHsl: P3HslCoords = { ...currentHsl };
        
        // Update coordinates based on selected channels with proper scaling
        if (channelX === 'h') testHsl.h = rangeX.min + (testValueX * (rangeX.max - rangeX.min));
        else if (channelX === 's') testHsl.s = rangeX.min + (testValueX * (rangeX.max - rangeX.min));
        else if (channelX === 'l') testHsl.l = rangeX.min + (testValueX * (rangeX.max - rangeX.min));
        
        if (channelY === 'h') testHsl.h = rangeY.min + (testValueY * (rangeY.max - rangeY.min));
        else if (channelY === 's') testHsl.s = rangeY.min + (testValueY * (rangeY.max - rangeY.min));
        else if (channelY === 'l') testHsl.l = rangeY.min + (testValueY * (rangeY.max - rangeY.min));
        
        // Check if this position is in gamut
        const testColor = p3HslToColor(testHsl);
        const inGamut = testColor.inGamut(gamutSpace);
        
        if (inGamut) {
          // This position is in gamut, try a smaller radius
          high = radius;
          
          // Calculate distance from original target
          const distance = Math.sqrt(
            Math.pow(clampedX - canvasX, 2) + Math.pow(clampedY - canvasY, 2)
          );
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPosition = { x: clampedX, y: clampedY };
          }
        } else {
          // This position is out of gamut, try a larger radius
          low = radius;
        }
        
        iterations++;
      }
    }
    
    // If we didn't find any in-gamut position, fall back to center
    if (bestDistance === Infinity) {
      return { x: size / 2, y: size / 2 };
    }
    
    return bestPosition;
  }
  
  // Handle other color spaces with standard approach
  // Convert base color to target color space
  const targetColor = baseColor.to(config.id);
  const coords = [...targetColor.coords] as [number, number, number];
  
  // Calculate normalized values (0-1) for each axis
  const valueX = canvasX / size;
  const valueY = (size - canvasY) / size; // Invert Y axis
  
  // Map channels to coordinate indices
  const channelIndexX = config.channels.indexOf(channelX);
  const channelIndexY = config.channels.indexOf(channelY);
  
  // Get channel ranges for proper scaling
  const rangeX = getChannelRange(channelX, config.id);
  const rangeY = getChannelRange(channelY, config.id);
  
  // Update coordinates based on selected channels with proper scaling
  coords[channelIndexX] = rangeX.min + (valueX * (rangeX.max - rangeX.min));
  coords[channelIndexY] = rangeY.min + (valueY * (rangeY.max - rangeY.min));
  
  // Check if this position is already in gamut
  const gamutSpace = getGamutSpace(gamut);
  const testColor = new Color(config.id, coords);
  
  if (testColor.inGamut(gamutSpace)) {
    // Already in gamut, return original coordinates
    return { x: canvasX, y: canvasY };
  }
  
  // Position is out of gamut, need to find the closest in-gamut position
  // Use radial search from the target point outward to find the closest boundary
  
  // Search parameters
  const maxRadius = Math.max(size, size) * 0.5; // Maximum search radius
  const searchSteps = 16; // Number of radial directions to search
  const maxIterations = 12; // Maximum iterations per direction
  
  let bestPosition = { x: canvasX, y: canvasY };
  let bestDistance = Infinity;
  
  // Search in multiple radial directions from the target point
  for (let angleStep = 0; angleStep < searchSteps; angleStep++) {
    const angle = (angleStep / searchSteps) * 2 * Math.PI;
    
    // Binary search along this radial direction
    let low = 0;
    let high = maxRadius;
    let iterations = 0;
    
    while (iterations < maxIterations && (high - low) > 1) {
      const radius = (low + high) / 2;
      
      // Calculate position along this radial direction
      const testX = canvasX + Math.cos(angle) * radius;
      const testY = canvasY + Math.sin(angle) * radius;
      
      // Clamp to canvas bounds
      const clampedX = Math.max(0, Math.min(size, testX));
      const clampedY = Math.max(0, Math.min(size, testY));
      
      // Convert to color coordinates
      const testValueX = clampedX / size;
      const testValueY = (size - clampedY) / size;
      
      const testCoords = [...coords] as [number, number, number];
      testCoords[channelIndexX] = rangeX.min + (testValueX * (rangeX.max - rangeX.min));
      testCoords[channelIndexY] = rangeY.min + (testValueY * (rangeY.max - rangeY.min));
      
      // Check if this position is in gamut
      const testColor = new Color(config.id, testCoords);
      const inGamut = testColor.inGamut(gamutSpace);
      
      if (inGamut) {
        // This position is in gamut, try a smaller radius
        high = radius;
        
        // Calculate distance from original target
        const distance = Math.sqrt(
          Math.pow(clampedX - canvasX, 2) + Math.pow(clampedY - canvasY, 2)
        );
        
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPosition = { x: clampedX, y: clampedY };
        }
      } else {
        // This position is out of gamut, try a larger radius
        low = radius;
      }
      
      iterations++;
    }
  }
  
  // If we didn't find any in-gamut position, fall back to center
  if (bestDistance === Infinity) {
    return { x: size / 2, y: size / 2 };
  }
  
  return bestPosition;
};

// Export the configuration getter for components that need it
export { getColorSpaceConfig };

/**
 * Create a color with updated channel values, handling P3-HSL specially
 * This utility function is used by components like ColorSlider that need to create
 * colors with specific channel values while supporting P3-HSL color space.
 */
export const createColorWithChannelValue = (
  baseColor: Color,
  config: ColorSpaceConfig,
  channel: string,
  channelValue: number
): Color => {
  try {
    // Handle P3-HSL color space specially
    if (config.id === 'p3-hsl') {
      // Get current HSL values from base color
      const currentHsl = colorToP3Hsl(baseColor);
      
      // Create new HSL coordinates
      const newHsl: P3HslCoords = { ...currentHsl };
      
      // Update the specified channel
      if (channel === 'h') newHsl.h = channelValue;
      else if (channel === 's') newHsl.s = channelValue;
      else if (channel === 'l') newHsl.l = channelValue;
      
      // Create new color from HSL coordinates
      return p3HslToColor(newHsl);
    } else {
      // Handle other color spaces with standard approach
      const colorInSpace = baseColor.to(config.id);
      const coords = [...colorInSpace.coords] as [number, number, number];
      
      // Map channel to coordinate index
      const channelIndex = config.channels.indexOf(channel);
      
      // Update coordinate based on selected channel
      coords[channelIndex] = channelValue;
      
      // Create new color with updated coordinates
      return new Color(config.id, coords);
    }
  } catch (error) {
    console.warn('Error creating color with channel value:', error);
    return baseColor; // Fallback to base color
  }
}; 