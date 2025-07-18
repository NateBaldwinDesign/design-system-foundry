import React, { memo } from 'react';
import { Box } from '@chakra-ui/react';
import Color from 'colorjs.io';

export interface ColorLoupeProps {
  /** The color to display in the loupe */
  color: Color;
  /** Whether the loupe is visible (defaults to false) */
  isVisible?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional Chakra UI Box props */
  [key: string]: unknown;
}

/**
 * ColorLoupe - A teardrop shaped component that displays the currently selected color
 * 
 * This atomic component uses an SVG path for the teardrop shape, ensuring clean
 * borders and shadows without clipping issues. The component mirrors React Spectrum's
 * ColorLoupe implementation with proper positioning and animations.
 */
export const ColorLoupe = memo<ColorLoupeProps>(({
  color,
  isVisible = false,
  className,
  'data-testid': testId,
  ...boxProps
}: ColorLoupeProps) => {
  // Convert color to hex for display
  const colorHex = color.toString({ format: 'hex' });

  return (
    <Box
      as="div"
      position="absolute"
      width="38px"
      height="48px"
      className={className}
      data-testid={testId}
      // Mirror React Spectrum's positioning approach
      transform={isVisible ? 'translate(0, 0)' : 'translate(0, 16px)'}
      opacity={isVisible ? 1 : 0}
      transformOrigin="bottom center"
      marginTop="-48px"
      marginLeft="-19px"
      transition="transform 100ms ease-in-out, opacity 125ms ease-in-out"
      pointerEvents="none"
      zIndex={isVisible ? 2 : 0}
      {...boxProps}
    >
      {/* SVG teardrop shape with proper styling */}
      <svg
        width="38"
        height="48"
        viewBox="0 0 38 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3)) drop-shadow(0 0 1px rgba(0, 0, 0, 0.3))'
        }}
        data-testid={`${testId}-svg`}
      >
        <path
          d="M35 19C35 33.2507 19 45 19 45C19 45 3 33.2507 3 19C3 10.1634 10.1634 3 19 3C27.8366 3 35 10.1634 35 19Z"
          fill={colorHex}
          stroke="white"
          strokeWidth="2"
          data-testid={`${testId}-path`}
        />
      </svg>
    </Box>
  );
});

ColorLoupe.displayName = 'ColorLoupe'; 