import React, { useRef, useEffect, useCallback, memo, useMemo, useState } from 'react';
import { Box, useColorMode } from '@chakra-ui/react';
import Color from 'colorjs.io';
import { ColorHandle } from '../ColorHandle/ColorHandle';
import { 
  getColorSpaceConfig, 
  getChannelRange, 
  getCanvasPixelColor 
} from '../../utils/colorUtils';

export interface ExtendedCanvasRenderingContext2D extends CanvasRenderingContext2D {
  colorSpace?: string;
}

export interface ColorSliderProps {
  /** The size of the slider (width for horizontal, height for vertical) */
  size?: number;
  /** The orientation of the slider (defaults to 'horizontal') */
  orientation?: 'horizontal' | 'vertical';
  /** The color space to use for rendering (defaults to 'sRGB') */
  colorSpace?: 'sRGB' | 'Display P3' | 'OKlch';
  /** The coordinate model to use (defaults to 'cartesian') */
  model?: 'cartesian' | 'polar';
  /** The color channel to control (e.g., 'l', 'c', 'h', 'r', 'g', 'b') */
  channel: string;
  /** The current color value */
  color: Color;
  /** The gamut constraint to apply (defaults to 'Display-P3') */
  gamut?: 'sRGB' | 'Display-P3' | 'Rec2020';
  /** Callback when color changes */
  onChange?: (color: Color) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional Chakra UI Box props */
  [key: string]: unknown;
}

/**
 * ColorSlider - A single-channel slider component with gradient background
 * 
 * This component renders a slider for controlling a single color channel (e.g., lightness, chroma, hue)
 * with a gradient background showing the potential color values along that channel.
 * Uses the same interaction patterns as ColorArea but constrained to a single axis.
 * 
 * The slider supports both horizontal and vertical orientations and includes
 * full keyboard navigation, gamut constraint, and ColorLoupe integration.
 */
export const ColorSlider = memo<ColorSliderProps>(({
  size = 200,
  orientation = 'horizontal',
  colorSpace = 'sRGB',
  model = 'cartesian',
  channel,
  color,
  gamut = 'Display-P3',
  onChange,
  className,
  'data-testid': testId,
  ...boxProps
}: ColorSliderProps) => {
  const { colorMode } = useColorMode();

  // Get color space configuration
  const config = getColorSpaceConfig(colorSpace, model);
  
  // Validate that the specified channel exists in this color space
  if (!config.channels.includes(channel)) {
    console.warn(`ColorSlider: Channel '${channel}' not available in color space '${colorSpace}' with model '${model}'`);
  }

  // State for drag interaction
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const [dragColor, setDragColor] = useState<Color | null>(null);
  const dragStartRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderTimeRef = useRef(0);

  // Create a stable base color with the other channels' current values for rendering
  const baseColorForRendering = useMemo(() => {
    try {
      // Extract the current values for all channels from the color
      const colorInSpace = color.to(config.id);
      
      // Create base color with current values for all channels
      const coords = [...colorInSpace.coords] as [number, number, number];
      // The target channel will be varied during rendering, others stay at current values
      return new Color(config.id, coords);
    } catch (error) {
      console.warn('Error creating base color for rendering:', error);
      return new Color('srgb', [0, 0, 0]);
    }
  }, [color, config.id, config.channels, channel]);

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
    
    // Set canvas size based on orientation
    if (orientation === 'horizontal') {
      canvas.width = size;
      canvas.height = 24; // Fixed height for horizontal slider
    } else {
      canvas.width = 24; // Fixed width for vertical slider
      canvas.height = size;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create image data for direct pixel manipulation
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    // Get canvas color space for pixel conversion
    const canvasColorSpace = (ctx as ExtendedCanvasRenderingContext2D).colorSpace || 'srgb';

    // Get channel range for proper scaling
    const channelRange = getChannelRange(channel, config.id);

    // Render gradient based on orientation
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const pixelIndex = (y * canvas.width + x) * 4;
        
        try {
          // Convert base color to target color space
          const targetColor = baseColorForRendering.to(config.id);
          const coords = [...targetColor.coords] as [number, number, number];
          
          // Calculate normalized value (0-1) for the channel axis
          let channelValue: number;
          if (orientation === 'horizontal') {
            channelValue = x / canvas.width;
          } else {
            channelValue = (canvas.height - y) / canvas.height; // Invert Y axis
          }
          
          // Map channel to coordinate index
          const channelIndex = config.channels.indexOf(channel);
          
          // Update coordinate based on selected channel with proper scaling
          coords[channelIndex] = channelRange.min + (channelValue * (channelRange.max - channelRange.min));
          
          // Create new color with updated coordinates
          // For sliders, we show the full range even if some values are out-of-gamut
          let pixelColor: Color;
          try {
            pixelColor = new Color(config.id, coords);
          } catch (error) {
            // If color creation fails, use a fallback color
            pixelColor = new Color('srgb', [0.5, 0.5, 0.5]);
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
      console.warn(`ColorSlider: Rendering took ${lastRenderTimeRef.current.toFixed(2)}ms (target: <16ms for 60fps)`);
    }
  }, [size, orientation, colorSpace, model, channel, gamut, config, colorMode, baseColorForRendering]);

  // Calculate handle position based on color coordinates
  const handlePosition = useMemo(() => {
    // If dragging, use the immediate drag position for instant feedback
    if (isDragging && dragPosition !== null) {
      return dragPosition;
    }
    
    // Otherwise, calculate position from the current color
    try {
      const colorInSpace = color.to(config.id);
      const channelIndex = config.channels.indexOf(channel);
      const channelValue = colorInSpace.coords[channelIndex] || 0;
      
      // Get channel range for proper scaling
      const channelRange = getChannelRange(channel, config.id);
      
      // Calculate normalized position (0-1)
      const normalizedPosition = (channelValue - channelRange.min) / (channelRange.max - channelRange.min);
      
      // Convert to pixel position with proper orientation handling
      let pixelPosition: number;
      if (orientation === 'horizontal') {
        pixelPosition = normalizedPosition * size;
      } else {
        // For vertical sliders, invert the position to match gradient rendering
        pixelPosition = (1 - normalizedPosition) * size;
      }
      
      return Math.max(0, Math.min(size, pixelPosition));
    } catch (error) {
      console.warn('Error calculating handle position:', error);
      return size / 2; // Fallback to center
    }
  }, [color, config.id, config.channels, channel, size, orientation, isDragging, dragPosition]);

  // Calculate the color to display in the handle (current color or drag color)
  const handleColor = useMemo(() => {
    // If dragging and we have a drag color, use it for immediate feedback
    if (isDragging && dragColor) {
      return dragColor;
    }
    
    // Otherwise, use the current color
    return color;
  }, [isDragging, dragColor, color]);

  // Convert canvas position to color coordinates
  const canvasToColorCoords = useCallback((position: number): Color => {
    try {
      // Convert base color to target color space
      const targetColor = baseColorForRendering.to(config.id);
      const coords = [...targetColor.coords] as [number, number, number];
      
      // Calculate normalized value (0-1) for the channel axis with proper orientation handling
      let normalizedPosition: number;
      if (orientation === 'horizontal') {
        normalizedPosition = position / size;
      } else {
        // For vertical sliders, invert the position to match gradient rendering
        normalizedPosition = 1 - (position / size);
      }
      
      // Map channel to coordinate index
      const channelIndex = config.channels.indexOf(channel);
      
      // Get channel range for proper scaling
      const channelRange = getChannelRange(channel, config.id);
      
      // Update coordinate based on selected channel with proper scaling
      coords[channelIndex] = channelRange.min + (normalizedPosition * (channelRange.max - channelRange.min));
      
      // Create new color with updated coordinates
      return new Color(config.id, coords);
    } catch (error) {
      console.warn('Error converting canvas position to color:', error);
      return color; // Fallback to current color
    }
  }, [size, orientation, config.id, config.channels, channel, baseColorForRendering, color]);

  // Handle canvas interaction for immediate positioning
  const handleCanvasInteraction = useCallback((event: React.PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    let position: number;
    
    if (orientation === 'horizontal') {
      position = event.clientX - rect.left;
    } else {
      position = event.clientY - rect.top;
    }
    
    // Clamp position to slider bounds
    const clampedPosition = Math.max(0, Math.min(size, position));
    
    // Set immediate drag position for instant visual feedback
    setDragPosition(clampedPosition);
    setIsDragging(true);
    
    // Store drag start position
    dragStartRef.current = clampedPosition;
    
    // Set pointer capture for global tracking
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [size, orientation]);

  // Handle canvas drag movement for immediate positioning
  const handleCanvasDragMove = useCallback((event: React.PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    let position: number;
    
    if (orientation === 'horizontal') {
      position = event.clientX - rect.left;
    } else {
      position = event.clientY - rect.top;
    }
    
    // Clamp position to slider bounds
    const clampedPosition = Math.max(0, Math.min(size, position));
    
    // Update immediate drag position for instant visual feedback
    setDragPosition(clampedPosition);
    
    // Calculate and set the color at the position
    const newDragColor = canvasToColorCoords(clampedPosition);
    setDragColor(newDragColor);
  }, [size, orientation, canvasToColorCoords]);

  // Handle handle drag start
  const handleHandleDragStart = useCallback((event: React.PointerEvent) => {
    // Prevent event bubbling to avoid conflicts with canvas events
    event.stopPropagation();
    
    // Set dragging state
    setIsDragging(true);
    
    // Set pointer capture for global tracking
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  // Global mouse move handler for handle dragging
  const handleGlobalMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    let position: number;
    
    if (orientation === 'horizontal') {
      position = event.clientX - rect.left;
    } else {
      position = event.clientY - rect.top;
    }
    
    // Clamp position to slider bounds
    const clampedPosition = Math.max(0, Math.min(size, position));
    
    // Update immediate drag position for instant visual feedback
    setDragPosition(clampedPosition);
    
    // Calculate and set the color at the position
    const newDragColor = canvasToColorCoords(clampedPosition);
    setDragColor(newDragColor);
  }, [isDragging, size, orientation, canvasToColorCoords]);

  // Handle canvas drag end
  const handleCanvasDragEnd = useCallback(() => {
    if (isDragging && dragPosition !== null && onChange) {
      try {
        // Convert drag position to color and update
        const newColor = canvasToColorCoords(dragPosition);
        onChange(newColor);
      } catch (error) {
        console.error('Error creating color from drag position:', error);
      }
    }
    
    // Reset drag state
    setIsDragging(false);
    setDragPosition(null);
    setDragColor(null);
    dragStartRef.current = null;
  }, [isDragging, dragPosition, onChange, canvasToColorCoords]);

  // Global mouse up handler for handle drag end
  const handleGlobalMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    // Use the same logic as canvas drag end
    handleCanvasDragEnd();
  }, [isDragging, handleCanvasDragEnd]);

  // Handle keyboard navigation for the ColorHandle
  const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent) => {
    // Handle all arrow keys for both orientations
    const validKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    
    if (!validKeys.includes(event.key)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    // Get current handle position
    const currentPosition = handlePosition;

    // Define step size for keyboard navigation (in pixels)
    const stepSize = event.shiftKey ? 10 : 1; // Larger steps with Shift key

    // Calculate new position based on key pressed and orientation
    let newPosition = currentPosition;

    if (orientation === 'horizontal') {
      // For horizontal sliders, use left/right arrows
      switch (event.key) {
        case 'ArrowLeft':
          newPosition = Math.max(0, currentPosition - stepSize);
          break;
        case 'ArrowRight':
          newPosition = Math.min(size, currentPosition + stepSize);
          break;
        default:
          return; // Ignore up/down arrows for horizontal sliders
      }
    } else {
      // For vertical sliders, use up/down arrows
      switch (event.key) {
        case 'ArrowUp':
          newPosition = Math.max(0, currentPosition - stepSize);
          break;
        case 'ArrowDown':
          newPosition = Math.min(size, currentPosition + stepSize);
          break;
        default:
          return; // Ignore left/right arrows for vertical sliders
      }
    }

    // Update position and trigger color change
    setDragPosition(newPosition);
    
    // Calculate and set the color at the position
    const newColor = canvasToColorCoords(newPosition);
    setDragColor(newColor);

    // Update the color immediately for keyboard navigation
    if (onChange) {
      onChange(newColor);
    }
  }, [handlePosition, size, orientation, canvasToColorCoords, onChange]);

  // Set up global event listeners for handle dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Set up canvas pointer events after canvas renders
  useEffect(() => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;

    const handlePointerDown = (event: PointerEvent) => {
      handleCanvasInteraction(event as unknown as React.PointerEvent);
    };

    const handlePointerMove = (event: PointerEvent) => {
      handleCanvasDragMove(event as unknown as React.PointerEvent);
    };

    const handlePointerUp = () => {
      handleCanvasDragEnd();
    };

    const handlePointerLeave = () => {
      handleCanvasDragEnd();
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [handleCanvasInteraction, handleCanvasDragMove, handleCanvasDragEnd]);

  // Render gradient when dependencies change
  useEffect(() => {
    renderGradient();
  }, [renderGradient]);

  // Calculate handle style based on orientation
  const handleStyle = useMemo(() => {
    const baseStyle = {
      position: 'absolute' as const,
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'auto' as const,
      zIndex: 10
    };

    if (orientation === 'horizontal') {
      return {
        ...baseStyle,
        left: `${handlePosition}px`,
        top: '11px' // Center vertically in 24px height
      };
    } else {
      return {
        ...baseStyle,
        left: '13px', // Center horizontally in 24px width
        top: `${handlePosition}px`
      };
    }
  }, [handlePosition, orientation]);

  return (
    <Box
      ref={containerRef}
      as="div"
      position="relative"
      width={orientation === 'horizontal' ? `${size}px` : '24px'}
      height={orientation === 'horizontal' ? '24px' : `${size}px`}
      className={className}
      data-testid={testId}
      tabIndex={0}
      onKeyDown={handleKeyboardNavigation}
      {...boxProps}
    >
      {/* Canvas component - renders gradient background */}
      <canvas
        ref={canvasRef}
        width={orientation === 'horizontal' ? size : 24}
        height={orientation === 'horizontal' ? 24 : size}
        style={{
          display: 'block',
          cursor: 'crosshair',
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.1)'
        }}
        data-testid={`${testId}-canvas`}
      />
      
      {/* ColorHandle positioned based on color coordinates or immediate drag position */}
      <ColorHandle
        color={handleColor}
        isLoupeVisible={isDragging}
        autoShowLoupe={true}
        onPointerDown={handleHandleDragStart}
        onKeyDown={handleKeyboardNavigation}
        style={handleStyle}
        data-testid={`${testId}-handle`}
      />
    </Box>
  );
});

ColorSlider.displayName = 'ColorSlider'; 