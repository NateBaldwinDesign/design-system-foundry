import React, { useRef, useEffect, useCallback, memo } from 'react';
import { Box } from '@chakra-ui/react';
import Color from 'colorjs.io';

// Extended canvas context type to include colorSpace property
interface ExtendedCanvasRenderingContext2D extends CanvasRenderingContext2D {
  colorSpace?: string;
}

export interface ColorCanvasProps {
  /** Size of the canvas in pixels (both width and height) */
  size: number;
  /** Color space to use for rendering ('sRGB', 'Display P3', 'OKlch') */
  colorSpace?: 'sRGB' | 'Display P3' | 'OKlch';
  /** Color model to use ('polar' or 'cartesian') */
  model?: 'polar' | 'cartesian';
  /** Color channels to render on the canvas (e.g., ['r', 'g'] for red and green) */
  colorChannels?: [string, string];
  /** Base color object from Colorjs.io */
  color: Color;
  /** Gamut constraint for rendering ('sRGB', 'Display-P3', 'Rec2020') */
  gamut?: 'sRGB' | 'Display-P3' | 'Rec2020';
  /** Callback when user interacts with the canvas */
  onChange?: (color: Color) => void;
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
 * This is the first atomic component in the color picker system. It renders
 * a 2D gradient based on the provided color and color space, optimized for
 * performance using canvas rendering. The gamut property constrains colors
 * to a specific color space, showing midtone gray for out-of-gamut colors.
 */
export const ColorCanvas = memo<ColorCanvasProps>(({
  size,
  colorSpace = 'sRGB',
  model = 'cartesian',
  colorChannels,
  color,
  gamut = 'Display-P3',
  onChange,
  className,
  'data-testid': testId,
  ...boxProps
}: ColorCanvasProps) => {

  // Determine default channels based on color space and model
  const getDefaultChannels = (): [string, string] => {
    switch (colorSpace) {
      case 'sRGB':
        return model === 'polar' ? ['s', 'l'] : ['r', 'g'];
      case 'Display P3':
        return ['r', 'g']; // Only cartesian model
      case 'OKlch':
        return model === 'polar' ? ['c', 'h'] : ['a', 'b'];
      default:
        return ['r', 'g'];
    }
  };

  const defaultChannels = getDefaultChannels();
  const channels = colorChannels || defaultChannels;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMouseDownRef = useRef(false);
  const lastRenderTimeRef = useRef(0);

  // Memoize the color to avoid unnecessary re-renders
  const memoizedColor = useCallback(() => color, [color.toString()]);

  // Convert gamut property to Colorjs.io gamut space identifier
  const getGamutSpace = useCallback((gamutProp: string): string => {
    switch (gamutProp) {
      case 'sRGB':
        return 'srgb';
      case 'Display-P3':
        return 'display-p3';
      case 'Rec2020':
        return 'rec2020';
      default:
        return 'display-p3';
    }
  }, []);

  // Check if coordinates would be out-of-gamut without automatic mapping
  const isOutOfGamut = useCallback((coords: [number, number, number], targetSpace: string): boolean => {
    try {
      // Create color with exact coordinates (no automatic mapping)
      const testColor = new Color(targetSpace, coords);
      
      // Convert to RGB to check if any component is outside 0-1 range
      const rgbColor = testColor.to('srgb');
      const [r, g, b] = rgbColor.coords;
      
      // Check if any component is outside the valid range
      return r < 0 || r > 1 || g < 0 || g > 1 || b < 0 || b > 1;
    } catch (error) {
      // If conversion fails, assume it's out of gamut
      return true;
    }
  }, []);

  // Utility function to get canvas pixel color using Colorjs.io
  const getCanvasPixelColor = useCallback((pixelColor: Color, canvasColorSpace: string): [number, number, number, number] => {
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
  }, []);

  // Render the gradient to canvas
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

    // Get base color coordinates
    const baseColor = memoizedColor();
    
    // Get gamut space for constraint checking
    const gamutSpace = getGamutSpace(gamut);
    
    // Determine the color space and model for rendering
    const getColorSpaceId = () => {
      switch (colorSpace) {
        case 'sRGB':
          return model === 'polar' ? 'hsl' : 'srgb';
        case 'Display P3':
          return 'p3';
        case 'OKlch':
          return model === 'polar' ? 'oklch' : 'oklab';
        default:
          return 'srgb';
      }
    };

    const colorSpaceId = getColorSpaceId();
    
    // Get available channels for the color space
    const getAvailableChannels = () => {
      switch (colorSpace) {
        case 'sRGB':
          return model === 'polar' ? ['h', 's', 'l'] : ['r', 'g', 'b'];
        case 'Display P3':
          return ['r', 'g', 'b'];
        case 'OKlch':
          return model === 'polar' ? ['l', 'c', 'h'] : ['l', 'a', 'b'];
        default:
          return ['r', 'g', 'b'];
      }
    };

    const availableChannels = getAvailableChannels();
    const [channelX, channelY] = channels;
    
    // Validate channels
    if (!availableChannels.includes(channelX) || !availableChannels.includes(channelY)) {
      console.warn(`ColorCanvas: Invalid channels [${channelX}, ${channelY}] for color space ${colorSpace} and model ${model}`);
      return;
    }

    // Get canvas color space for pixel conversion
    const canvasColorSpace = (ctx as ExtendedCanvasRenderingContext2D).colorSpace || 'srgb';

    // Render gradient based on selected channels
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const pixelIndex = (y * size + x) * 4;
        
        try {
          // Convert base color to target color space
          const targetColor = baseColor.to(colorSpaceId);
          const coords = [...targetColor.coords] as [number, number, number]; // Ensure 3 coordinates
          
          // Calculate normalized values (0-1) for each axis
          const valueX = x / size;
          const valueY = (size - y) / size; // Invert Y axis
          
          // Map channels to coordinate indices
          const channelIndexX = availableChannels.indexOf(channelX);
          const channelIndexY = availableChannels.indexOf(channelY);
          
          // Update coordinates based on selected channels
          // Handle different coordinate ranges for different color spaces
          if (colorSpaceId === 'hsl') {
            // HSL coordinates: H (0-360), S (0-100), L (0-100)
            if (channelX === 'h') coords[channelIndexX] = valueX * 360;
            else if (channelX === 's' || channelX === 'l') coords[channelIndexX] = valueX * 100;
            else coords[channelIndexX] = valueX;
            
            if (channelY === 'h') coords[channelIndexY] = valueY * 360;
            else if (channelY === 's' || channelY === 'l') coords[channelIndexY] = valueY * 100;
            else coords[channelIndexY] = valueY;
          } else {
            // Other color spaces use 0-1 range
            coords[channelIndexX] = valueX;
            coords[channelIndexY] = valueY;
          }
          
          // Check if this color would be out-of-gamut before creating the color object
          const outOfGamut = isOutOfGamut(coords, colorSpaceId);
          
          let pixelColor: Color;
          if (outOfGamut) {
            // Use midtone gray for out-of-gamut colors
            pixelColor = new Color('srgb', [0.5, 0.5, 0.5]);
          } else {
            // Create new color with updated coordinates
            pixelColor = new Color(colorSpaceId, coords);
          }

          // Get pixel color using Colorjs.io conversion
          const [r, g, b, a] = getCanvasPixelColor(pixelColor, canvasColorSpace);
          
          // Set pixel data
          data[pixelIndex] = r;     // R
          data[pixelIndex + 1] = g; // G
          data[pixelIndex + 2] = b; // B
          data[pixelIndex + 3] = a; // A
          
        } catch (error) {
          // If color conversion fails, use a fallback color
          data[pixelIndex] = 128;     // R
          data[pixelIndex + 1] = 128; // G
          data[pixelIndex + 2] = 128; // B
          data[pixelIndex + 3] = 255; // A
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
  }, [size, colorSpace, model, channels, gamut, memoizedColor, getGamutSpace, isOutOfGamut, getCanvasPixelColor]);

  // Handle mouse/touch events
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    isMouseDownRef.current = true;
    handlePointerMove(event);
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!isMouseDownRef.current || !onChange) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Clamp coordinates to canvas bounds
    const clampedX = Math.max(0, Math.min(size, x));
    const clampedY = Math.max(0, Math.min(size, y));
    
    // Convert coordinates to color values (0-1)
    const normalizedX = clampedX / size;
    const normalizedY = (size - clampedY) / size; // Invert Y axis
    
    // Create new color based on position
    try {
      const baseColor = memoizedColor();
      
      // Determine the color space and model for interaction
      const getColorSpaceId = () => {
        switch (colorSpace) {
          case 'sRGB':
            return model === 'polar' ? 'hsl' : 'srgb';
          case 'Display P3':
            return 'p3';
          case 'OKlch':
            return model === 'polar' ? 'oklch' : 'oklab';
          default:
            return 'srgb';
        }
      };

      const colorSpaceId = getColorSpaceId();
      
      // Get available channels for the color space
      const getAvailableChannels = () => {
        switch (colorSpace) {
          case 'sRGB':
            return model === 'polar' ? ['h', 's', 'l'] : ['r', 'g', 'b'];
          case 'Display P3':
            return ['r', 'g', 'b'];
          case 'OKlch':
            return model === 'polar' ? ['l', 'c', 'h'] : ['l', 'a', 'b'];
          default:
            return ['r', 'g', 'b'];
        }
      };

      const availableChannels = getAvailableChannels();
      const [channelX, channelY] = channels;
      
      // Validate channels
      if (!availableChannels.includes(channelX) || !availableChannels.includes(channelY)) {
        console.warn(`ColorCanvas: Invalid channels [${channelX}, ${channelY}] for color space ${colorSpace} and model ${model}`);
        return;
      }
      
      // Convert base color to target color space
      const targetColor = baseColor.to(colorSpaceId);
      const coords = [...targetColor.coords] as [number, number, number]; // Ensure 3 coordinates
      
      // Map channels to coordinate indices
      const channelIndexX = availableChannels.indexOf(channelX);
      const channelIndexY = availableChannels.indexOf(channelY);
      
      // Update coordinates based on selected channels
      // Handle different coordinate ranges for different color spaces
      if (colorSpaceId === 'hsl') {
        // HSL coordinates: H (0-360), S (0-100), L (0-100)
        if (channelX === 'h') coords[channelIndexX] = normalizedX * 360;
        else if (channelX === 's' || channelX === 'l') coords[channelIndexX] = normalizedX * 100;
        else coords[channelIndexX] = normalizedX;
        
        if (channelY === 'h') coords[channelIndexY] = normalizedY * 360;
        else if (channelY === 's' || channelY === 'l') coords[channelIndexY] = normalizedY * 100;
        else coords[channelIndexY] = normalizedY;
      } else {
        // Other color spaces use 0-1 range
        coords[channelIndexX] = normalizedX;
        coords[channelIndexY] = normalizedY;
      }
      
      // Create new color with updated coordinates
      const newColor = new Color(colorSpaceId, coords);
      
      onChange(newColor);
    } catch (error) {
      console.error('Error creating color from canvas position:', error);
    }
  }, [size, colorSpace, model, channels, onChange, memoizedColor]);

  const handlePointerUp = useCallback(() => {
    isMouseDownRef.current = false;
  }, []);

  // Render gradient when dependencies change
  useEffect(() => {
    renderGradient();
  }, [renderGradient]);

  return (
    <Box
      as="canvas"
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      data-testid={testId}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{
        cursor: onChange ? 'crosshair' : 'default',
        touchAction: 'none', // Prevent scrolling on touch devices
      }}
      {...boxProps}
    />
  );
});

ColorCanvas.displayName = 'ColorCanvas'; 