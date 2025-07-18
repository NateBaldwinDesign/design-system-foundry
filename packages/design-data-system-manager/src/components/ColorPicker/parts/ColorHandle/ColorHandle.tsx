import React, { memo, useState, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import Color from 'colorjs.io';
import { ColorLoupe } from '../ColorLoupe/ColorLoupe';

export interface ColorHandleProps {
  /** The color to display in the handle and loupe */
  color: Color;
  /** Whether the loupe is visible (defaults to false) */
  isLoupeVisible?: boolean;
  /** Whether to automatically show loupe on focus/active states (defaults to true) */
  autoShowLoupe?: boolean;
  /** Callback for pointer down events */
  onPointerDown?: (event: React.PointerEvent) => void;
  /** Callback for pointer move events */
  onPointerMove?: (event: React.PointerEvent) => void;
  /** Callback for pointer up events */
  onPointerUp?: (event: React.PointerEvent) => void;
  /** Callback for pointer leave events */
  onPointerLeave?: (event: React.PointerEvent) => void;
  /** Callback for key down events */
  onKeyDown?: (event: React.KeyboardEvent) => void;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional Chakra UI Box props */
  [key: string]: unknown;
}

/**
 * ColorHandle - A circular handle component that displays the currently selected color
 * with an integrated ColorLoupe positioned above it
 * 
 * This composite component combines a 16x16px circular handle with the ColorLoupe
 * component. The handle uses relative positioning while the loupe uses absolute
 * positioning, ensuring the loupe is always positioned correctly relative to the handle.
 * Only the ColorHandle requires X, Y coordinates for placement.
 * 
 * Enhanced with automatic loupe visibility on focus and active states for better UX.
 * Loupe is hidden on mouse up to provide cleaner interaction feedback.
 */
export const ColorHandle = memo<ColorHandleProps>(({
  color,
  isLoupeVisible = false,
  autoShowLoupe = true,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerLeave,
  onKeyDown,
  className,
  'data-testid': testId,
  ...boxProps
}: ColorHandleProps) => {
  // Convert color to hex for display
  const colorHex = color.toString({ format: 'hex' });

  // State for tracking focus and active states
  const [isFocused, setIsFocused] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Determine if loupe should be visible
  // Loupe shows on focus OR during active state (mouse down), but hides on mouse up
  const shouldShowLoupe = isLoupeVisible || (autoShowLoupe && (isFocused || isActive));

  // Event handlers for focus and active states
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleMouseDown = useCallback(() => {
    setIsActive(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsActive(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsActive(false);
  }, []);

  return (
    <Box
      as="div"
      position="relative"
      width="16px"
      height="16px"
      className={className}
      data-testid={testId}
      tabIndex={0}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={onKeyDown}
      {...boxProps}
    >
      {/* Circular handle with border and shadow */}
      <Box
        as="div"
        width="100%"
        height="100%"
        backgroundColor={colorHex}
        border="2px solid white"
        borderRadius="50%"
        boxShadow="0 1px 3px rgba(0, 0, 0, 0.4)"
        position="relative"
        data-testid={`${testId}-handle`}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        _focus={{
          outline: '2px solid #007AFF',
          outlineOffset: '2px'
        }}
        _active={{
          transform: 'scale(0.95)',
          transition: 'transform 0.1s ease-in-out'
        }}
      />
      
      {/* ColorLoupe positioned above the handle */}
      <ColorLoupe
        style={{
          pointerEvents: 'none',
          zIndex: 1000,
          left: "8px",
          bottom: "20px"
        }}
        color={color}
        isVisible={shouldShowLoupe}
        data-testid={`${testId}-loupe`}
      />
    </Box>
  );
});

ColorHandle.displayName = 'ColorHandle'; 