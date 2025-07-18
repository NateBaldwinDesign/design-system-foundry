import React, { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { Box } from '@chakra-ui/react';
import Color from 'colorjs.io';
import { ColorCanvas } from '../ColorCanvas';
import { ColorHandle } from '../ColorHandle/ColorHandle';
import { 
  getColorSpaceConfig, 
  colorToCanvasCoords, 
  canvasToColorCoords,
  constrainToGamutBoundary 
} from '../../utils/colorUtils';

export interface ColorAreaProps {
  /** The size of the color area canvas (defaults to 200) */
  size?: number;
  /** The color space to use for rendering (defaults to 'sRGB') */
  colorSpace?: 'sRGB' | 'Display P3' | 'OKlch';
  /** The coordinate model to use (defaults to 'cartesian') */
  model?: 'cartesian' | 'polar';
  /** The color channels to display on X and Y axes */
  colorChannels?: [string, string];
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
 * ColorArea - A composite component that combines ColorCanvas with ColorHandle
 * 
 * This component renders a color canvas with a draggable handle positioned based on
 * the current color's coordinates in the specified color space. The ColorCanvas
 * renders a fixed slice of the color space and only re-renders when the slice
 * parameters change (colorSpace, model, gamut, or third channel value), not when
 * the user moves within the x,y plane.
 * 
 * The handle position calculation uses the same coordinate mapping as the ColorCanvas
 * interaction logic for consistency.
 * 
 * PERFORMANCE OPTIMIZATION: Uses local state for immediate handle positioning during drag
 * to provide instant visual feedback, only updating the actual color state when drag ends.
 */
export const ColorArea = memo<ColorAreaProps>(({
  size = 200,
  colorSpace = 'sRGB',
  model = 'cartesian',
  colorChannels,
  color,
  gamut = 'Display-P3',
  onChange,
  className,
  'data-testid': testId,
  ...boxProps
}: ColorAreaProps) => {
  // Get color space configuration (memoized for performance)
  const config = getColorSpaceConfig(colorSpace, model);
  const channels = colorChannels || config.defaultChannels;

  // Local state for immediate handle positioning during drag
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragColor, setDragColor] = useState<Color | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate handle position based on color coordinates in current color space
  // Uses the same coordinate mapping logic as ColorCanvas for consistency
  // Now constrained to gamut boundaries to prevent handle from appearing in gray areas
  const handlePosition = useMemo(() => {
    // If dragging, use the immediate drag position for instant feedback
    if (isDragging && dragPosition) {
      // Constrain drag position to gamut boundary
      try {
        return constrainToGamutBoundary(
          dragPosition.x,
          dragPosition.y,
          size,
          color, // Use current color as base for third channel
          colorSpace,
          model,
          channels,
          gamut
        );
      } catch (error) {
        console.warn('Error constraining drag position to gamut:', error);
        return dragPosition; // Fallback to original position
      }
    }
    
    // Otherwise, calculate position from the current color
    try {
      const basePosition = colorToCanvasCoords(color, size, colorSpace, model, channels);
      
      // Constrain the calculated position to gamut boundary
      return constrainToGamutBoundary(
        basePosition.x,
        basePosition.y,
        size,
        color, // Use current color as base for third channel
        colorSpace,
        model,
        channels,
        gamut
      );
    } catch (error) {
      console.warn('Error calculating handle position:', error);
      return { x: size / 2, y: size / 2 }; // Fallback to center
    }
  }, [color, colorSpace, model, channels, size, isDragging, dragPosition, gamut]);

  // Calculate the color to display in the handle (current color or drag color)
  const handleColor = useMemo(() => {
    // If dragging and we have a drag color, use it for immediate feedback
    if (isDragging && dragColor) {
      return dragColor;
    }
    
    // Otherwise, use the current color
    return color;
  }, [isDragging, dragColor, color]);

  // Handle canvas click/drag to update color
  const handleCanvasChange = useCallback((newColor: Color) => {
    if (onChange) {
      onChange(newColor);
    }
  }, [onChange]);

  // Handle canvas interaction for immediate positioning
  const handleCanvasInteraction = useCallback((event: React.PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Clamp coordinates to canvas bounds
    const clampedX = Math.max(0, Math.min(size, x));
    const clampedY = Math.max(0, Math.min(size, y));
    
    // Constrain to gamut boundary to prevent handle from appearing in gray areas
    try {
      const constrainedPosition = constrainToGamutBoundary(
        clampedX,
        clampedY,
        size,
        color, // Use current color as base for third channel
        colorSpace,
        model,
        channels,
        gamut
      );
      
      // Set immediate drag position for instant visual feedback
      setDragPosition(constrainedPosition);
      setIsDragging(true);
      
      // Store drag start position
      dragStartRef.current = constrainedPosition;
    } catch (error) {
      console.warn('Error constraining canvas interaction to gamut:', error);
      // Fallback to original clamped position
      setDragPosition({ x: clampedX, y: clampedY });
      setIsDragging(true);
      dragStartRef.current = { x: clampedX, y: clampedY };
    }
  }, [size, color, colorSpace, model, channels, gamut]);

  // Handle canvas drag movement for immediate positioning
  const handleCanvasDragMove = useCallback((event: React.PointerEvent) => {
    if (!isDragging) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Clamp coordinates to canvas bounds
    const clampedX = Math.max(0, Math.min(size, x));
    const clampedY = Math.max(0, Math.min(size, y));
    
    // Constrain to gamut boundary to prevent handle from appearing in gray areas
    try {
      const constrainedPosition = constrainToGamutBoundary(
        clampedX,
        clampedY,
        size,
        color, // Use current color as base for third channel
        colorSpace,
        model,
        channels,
        gamut
      );
      
      // Update immediate drag position for instant visual feedback
      setDragPosition(constrainedPosition);
    } catch (error) {
      console.warn('Error constraining canvas drag to gamut:', error);
      // Fallback to original clamped position
      setDragPosition({ x: clampedX, y: clampedY });
    }
  }, [isDragging, size, color, colorSpace, model, channels, gamut]);

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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Clamp coordinates to canvas bounds
    const clampedX = Math.max(0, Math.min(size, x));
    const clampedY = Math.max(0, Math.min(size, y));
    
    // Constrain to gamut boundary to prevent handle from appearing in gray areas
    try {
      const constrainedPosition = constrainToGamutBoundary(
        clampedX,
        clampedY,
        size,
        color, // Use current color as base for third channel
        colorSpace,
        model,
        channels,
        gamut
      );
      
      // Update immediate drag position for instant visual feedback
      setDragPosition(constrainedPosition);
      
      // Calculate and set the color at the constrained position
      const newDragColor = canvasToColorCoords(
        constrainedPosition.x,
        constrainedPosition.y,
        size,
        color, // Use current color as base for third channel
        colorSpace,
        model,
        channels,
        gamut
      );
      setDragColor(newDragColor);
    } catch (error) {
      console.error('Error constraining handle drag to gamut:', error);
      // Fallback to original clamped position
      setDragPosition({ x: clampedX, y: clampedY });
      
      // Calculate and set the color at the fallback position
      try {
        const newDragColor = canvasToColorCoords(
          clampedX,
          clampedY,
          size,
          color, // Use current color as base for third channel
          colorSpace,
          model,
          channels,
          gamut
        );
        setDragColor(newDragColor);
      } catch (colorError) {
        console.error('Error calculating drag color:', colorError);
      }
    }
  }, [isDragging, size, color, colorSpace, model, channels, gamut]);

  // Handle canvas drag end
  const handleCanvasDragEnd = useCallback(() => {
    if (isDragging && dragPosition && onChange) {
      try {
        // Convert drag position to color and update
        const newColor = canvasToColorCoords(
          dragPosition.x,
          dragPosition.y,
          size,
          color, // Use current color as base for third channel
          colorSpace,
          model,
          channels,
          gamut
        );
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
  }, [isDragging, dragPosition, onChange, size, colorSpace, model, channels, gamut, color]);

  // Global mouse up handler for handle drag end
  const handleGlobalMouseUp = useCallback(() => {
    if (!isDragging) return;
    
    // Use the same logic as canvas drag end
    handleCanvasDragEnd();
  }, [isDragging, handleCanvasDragEnd]);

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

  return (
    <Box
      ref={containerRef}
      as="div"
      position="relative"
      width={`${size}px`}
      height={`${size}px`}
      className={className}
      data-testid={testId}
      {...boxProps}
    >
      {/* ColorCanvas component - renders fixed slice, only re-renders when slice changes */}
      <ColorCanvas
        size={size}
        colorSpace={colorSpace}
        model={model}
        colorChannels={colorChannels}
        color={color} // Only the third channel value is used for the slice
        gamut={gamut}
        onChange={handleCanvasChange}
        onPointerDown={handleCanvasInteraction}
        onPointerUp={handleCanvasDragEnd}
        onPointerLeave={handleCanvasDragEnd}
        onPointerMove={handleCanvasDragMove}
        data-testid={`${testId}-canvas`}
      />
      
      {/* ColorHandle positioned based on color coordinates or immediate drag position */}
      <ColorHandle
        color={handleColor}
        autoShowLoupe={true}
        onPointerDown={handleHandleDragStart}
        style={{
          position: 'absolute',
          left: `${handlePosition.x}px`,
          top: `${handlePosition.y}px`,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto',
          zIndex: 10
        }}
        data-testid={`${testId}-handle`}
      />
    </Box>
  );
});

ColorArea.displayName = 'ColorArea';