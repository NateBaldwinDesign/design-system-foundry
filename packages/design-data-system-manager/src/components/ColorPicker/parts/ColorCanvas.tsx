import React, { useRef, useEffect, useCallback, memo } from 'react';
import { Box } from '@chakra-ui/react';
import Color from 'colorjs.io';

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
 * performance using canvas rendering.
 */
export const ColorCanvas = memo<ColorCanvasProps>(({
  size,
  colorSpace = 'sRGB',
  model = 'cartesian',
  colorChannels,
  color,
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

  // Render the gradient to canvas
  const renderGradient = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    // Render gradient based on selected channels
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const pixelIndex = (y * size + x) * 4;
        
        let pixelColor: Color;
        
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
          
          // Create new color with updated coordinates
          pixelColor = new Color(colorSpaceId, coords);

          // Convert to sRGB for display
          const srgb = pixelColor.to('srgb');
          const srgbCoords = srgb.coords;
          
          // Set RGB values (0-255)
          data[pixelIndex] = Math.round(srgbCoords[0] * 255);     // R
          data[pixelIndex + 1] = Math.round(srgbCoords[1] * 255); // G
          data[pixelIndex + 2] = Math.round(srgbCoords[2] * 255); // B
          data[pixelIndex + 3] = Math.round((srgb.alpha ?? 1) * 255); // A
          
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
  }, [size, colorSpace, model, channels, memoizedColor]);

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

  const handlePointerLeave = useCallback(() => {
    isMouseDownRef.current = false;
  }, []);

  // Render gradient when dependencies change
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
          borderRadius: '4px',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        data-testid={`${testId}-canvas`}
      />
    </Box>
  );
});

ColorCanvas.displayName = 'ColorCanvas'; 