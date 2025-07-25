import React, { useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { Box, useColorMode } from '@chakra-ui/react';
import Color from 'colorjs.io';
import {
  ExtendedCanvasRenderingContext2D,
  getColorSpaceConfig,
  getChannelRange,
  getGamutSpace,
  isOutOfGamut,
  getCanvasPixelColor
} from '../../utils/colorUtils';
import { colorToP3Hsl, p3HslToColor, type P3HslCoords } from '../../utils/p3HslUtils';

export interface ColorCanvasProps {
  /** Size of the canvas in pixels (both width and height) */
  size: number;
  /** Color space to use for rendering ('sRGB', 'Display P3', 'OKlch') */
  colorSpace?: 'sRGB' | 'Display P3' | 'OKlch';
  /** Color model to use ('polar' or 'cartesian') */
  model?: 'polar' | 'cartesian';
  /** Color channels to render on the canvas (e.g., ['r', 'g'] for red and green) */
  colorChannels?: [string, string];
  /** Base color object from Colorjs.io - only the third channel value is used for the fixed slice */
  color: Color;
  /** Gamut constraint for rendering ('sRGB', 'Display-P3', 'Rec2020') */
  gamut?: 'sRGB' | 'Display-P3' | 'Rec2020';
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional Chakra UI Box props */
  [key: string]: unknown;
}

/**
 * ColorCanvas - A square canvas component that renders a color gradient
 * 
 * This component renders a fixed 2D slice of the color space defined by:
 * - colorSpace, model, gamut (the slice parameters)
 * - The third channel value from the color prop (the slice position)
 * 
 * The canvas only re-renders when the slice itself changes, not when the user
 * moves within the x,y plane. This provides optimal performance for color picking.
 */
export const ColorCanvas = memo<ColorCanvasProps>(({
  size,
  colorSpace = 'sRGB',
  model = 'cartesian',
  colorChannels,
  color,
  gamut = 'Display-P3',
  className,
  'data-testid': testId,
  ...boxProps
}: ColorCanvasProps) => {
  const { colorMode } = useColorMode();

  // Get color space configuration (memoized for performance)
  const config = getColorSpaceConfig(colorSpace, model);
  const channels = colorChannels || config.defaultChannels;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderTimeRef = useRef(0);

  // Extract the third channel value for dependency tracking
  const thirdChannelValue = useMemo(() => {
    try {
      if (config.id === 'p3-hsl') {
        const currentHsl = colorToP3Hsl(color);
        const thirdChannel = config.thirdChannel;
        return currentHsl[thirdChannel as keyof P3HslCoords];
      } else {
        const colorInSpace = color.to(config.id);
        const thirdChannelIndex = config.channels.indexOf(config.thirdChannel);
        return colorInSpace.coords[thirdChannelIndex] || 0;
      }
    } catch (error) {
      console.warn('Error extracting third channel value:', error);
      return 0;
    }
  }, [color.toString(), config.id, config.channels, config.thirdChannel]);

  // Create a stable base color with the third channel value for rendering
  // This should only change when the slice parameters change, not when user moves within x,y plane
  const baseColorForRendering = useMemo(() => {
    try {
      // Handle P3-HSL color space specially
      if (config.id === 'p3-hsl') {
        // Create base HSL coordinates with only the third channel value
        const baseHsl: P3HslCoords = { h: 0, s: 0, l: 0 };
        const thirdChannel = config.thirdChannel;
        if (thirdChannel === 'h') baseHsl.h = thirdChannelValue;
        else if (thirdChannel === 's') baseHsl.s = thirdChannelValue;
        else if (thirdChannel === 'l') baseHsl.l = thirdChannelValue;
        
        // Convert to P3 color for rendering
        return p3HslToColor(baseHsl);
      }
      
      // Handle other color spaces with standard approach
      // Create base color with the third channel value
      const coords = [...config.channels.map(() => 0)] as [number, number, number];
      const thirdChannelIndex = config.channels.indexOf(config.thirdChannel);
      coords[thirdChannelIndex] = thirdChannelValue;
      return new Color(config.id, coords);
    } catch (error) {
      console.warn('Error creating base color for rendering:', error);
      return new Color('srgb', [0, 0, 0]);
    }
  }, [config.id, config.channels, config.thirdChannel, thirdChannelValue]);

  // Render the gradient to canvas - only re-renders when the slice changes
  const renderGradient = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Try to get context with display-p3 support first
    let ctx = canvas.getContext('2d', {
      colorSpace: 'display-p3',
      willReadFrequently: false
    });
    
    // Fallback to sRGB if display-p3 is not supported
    if (!ctx) {
      ctx = canvas.getContext('2d');
      if (!ctx) return;
    }

    const startTime = performance.now();
    
    // Set canvas size
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Create image data for direct pixel manipulation
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    // Get canvas color space for pixel conversion
    const canvasColorSpace = (ctx as ExtendedCanvasRenderingContext2D).colorSpace || 'srgb';

    // Validate channels
    const [channelX, channelY] = channels;
    if (!config.channels.includes(channelX) || !config.channels.includes(channelY)) {
      console.warn(`ColorCanvas: Invalid channels [${channelX}, ${channelY}] for color space ${colorSpace} and model ${model}`);
      return;
    }

    // Render gradient based on selected channels
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const pixelIndex = (y * size + x) * 4;
        
        let pixelColor: Color;
        
        try {
          // Handle P3-HSL color space specially
          if (config.id === 'p3-hsl') {
            // Calculate normalized values (0-1) for each axis
            const valueX = x / size;
            const valueY = (size - y) / size; // Invert Y axis
            
            // Get channel ranges for proper scaling
            const rangeX = getChannelRange(channelX, config.id);
            const rangeY = getChannelRange(channelY, config.id);
            
            // Create HSL coordinates directly from the third channel value and pixel position
            const newHsl: P3HslCoords = { h: 0, s: 0, l: 0 };
            const thirdChannel = config.thirdChannel;
            
            // Set the third channel value (fixed for this slice)
            if (thirdChannel === 'h') newHsl.h = thirdChannelValue;
            else if (thirdChannel === 's') newHsl.s = thirdChannelValue;
            else if (thirdChannel === 'l') newHsl.l = thirdChannelValue;
            
            // Set the X and Y channel values based on pixel position
            if (channelX === 'h') newHsl.h = rangeX.min + (valueX * (rangeX.max - rangeX.min));
            else if (channelX === 's') newHsl.s = rangeX.min + (valueX * (rangeX.max - rangeX.min));
            else if (channelX === 'l') newHsl.l = rangeX.min + (valueX * (rangeX.max - rangeX.min));
            
            if (channelY === 'h') newHsl.h = rangeY.min + (valueY * (rangeY.max - rangeY.min));
            else if (channelY === 's') newHsl.s = rangeY.min + (valueY * (rangeY.max - rangeY.min));
            else if (channelY === 'l') newHsl.l = rangeY.min + (valueY * (rangeY.max - rangeY.min));
            
            // Create new color from HSL coordinates
            pixelColor = p3HslToColor(newHsl);
          } else {
            // Handle other color spaces with standard approach
            // Convert base color to target color space
            const targetColor = baseColorForRendering.to(config.id);
            const coords = [...targetColor.coords] as [number, number, number]; // Ensure 3 coordinates
            
            // Calculate normalized values (0-1) for each axis
            const valueX = x / size;
            const valueY = (size - y) / size; // Invert Y axis
            
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
            pixelColor = new Color(config.id, coords);
          }
          
          // Check if this color would be out-of-gamut for the specified gamut
          const gamutSpace = getGamutSpace(gamut);
          const outOfGamut = isOutOfGamut(pixelColor.coords, pixelColor.space.id, gamutSpace);
          
          if (outOfGamut) {
            // Use midtone gray for out-of-gamut colors
            if (colorMode === 'dark') {
              // Dark mode fallback: darker gray
              pixelColor = new Color('srgb', [0.10196078431372549, 0.12549019607843137, 0.17254901960784313]);
            } else {
              // Light mode fallback: lighter gray
              pixelColor = new Color('srgb', [0.8862745098039215, 0.9098039215686274, 0.9411764705882353]);
            }
          }

          // Get pixel color using Colorjs.io conversion
          const [r, g, b, a] = getCanvasPixelColor(pixelColor, canvasColorSpace);
          
          // Set pixel data
          data[pixelIndex] = r;     // R
          data[pixelIndex + 1] = g; // G
          data[pixelIndex + 2] = b; // B
          data[pixelIndex + 3] = a; // A
          
        } catch (error) {
          // If color conversion fails, use a fallback color based on color mode
          if (colorMode === 'dark') {
            // Dark mode fallback: darker gray
            data[pixelIndex] = 26;      // R
            data[pixelIndex + 1] = 32;  // G
            data[pixelIndex + 2] = 44;  // B
            data[pixelIndex + 3] = 255; // A
          } else {
            // Light mode fallback: lighter gray
            data[pixelIndex] = 226;     // R
            data[pixelIndex + 1] = 232; // G
            data[pixelIndex + 2] = 240; // B
            data[pixelIndex + 3] = 255; // A
          }
        }
      }
    }

    // Put image data to canvas
    ctx.putImageData(imageData, 0, 0);
    
    const endTime = performance.now();
    lastRenderTimeRef.current = endTime - startTime;
    
    // Log performance warning if rendering takes too long
    if (lastRenderTimeRef.current > 16) {
      console.warn(`ColorCanvas: Rendering took ${lastRenderTimeRef.current.toFixed(2)}ms (target: <16ms for 60fps)`);
    }
  }, [size, colorSpace, model, channels, gamut, config, colorMode, baseColorForRendering]);

  // Render gradient when dependencies change (only when slice changes)
  useEffect(() => {
    renderGradient();
  }, [renderGradient]);

  return (
    <Box
      as="div"
      position="relative"
      display="inline-block"
      className={className}
      data-testid={testId}
      {...boxProps}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          display: 'block',
          cursor: 'crosshair',
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}
        data-testid={`${testId}-canvas`}
      />
    </Box>
  );
});

ColorCanvas.displayName = 'ColorCanvas'; 