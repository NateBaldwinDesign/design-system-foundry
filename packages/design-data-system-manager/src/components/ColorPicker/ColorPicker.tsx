import React, { useState, useCallback } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  Box,
  Button,
  useDisclosure
} from '@chakra-ui/react';
import { ColorPickerContents } from './parts/ColorPickerContents/ColorPickerContents';
import Color from 'colorjs.io';

export interface ColorPickerProps {
  /** The current color value as a string (hex, rgb, etc.) */
  color: string;
  /** The color space to use (defaults to 'oklch') */
  colorSpace?: 'sRGB' | 'Display P3' | 'OKlch';
  /** The gamut constraint to use (defaults to 'sRGB') */
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
 * ColorPicker - Parent component with Popover trigger and ColorPickerContents
 *
 * This component provides a popover-based color picker UI, using ColorPickerContents
 * for the main color picking interface. It is schema-driven and follows atomic/component
 * design principles as outlined in @color-picker-plan.md.
 */
export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  colorSpace = 'OKlch',
  gamut = 'sRGB',
  onChange,
  className,
  'data-testid': testId = 'color-picker'
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [internalColor, setInternalColor] = useState<string>(color);

  // Sync internal color with prop
  React.useEffect(() => {
    setInternalColor(color);
  }, [color]);

  // Handle color change from ColorPickerContents
  const handleColorChange = useCallback((newColor: Color) => {
    setInternalColor(newColor.toString({ format: 'hex' }));
    if (onChange) {
      onChange(newColor);
    }
  }, [onChange]);

  return (
    <Popover isOpen={isOpen} onOpen={onOpen} onClose={onClose} placement="bottom-start">
      <PopoverTrigger>
        <Button
          size="sm"
          variant="outline"
          className={className}
          data-testid={`${testId}-trigger`}
          aria-label="Open color picker"
          style={{ background: internalColor, borderColor: '#ccc' }}
        >
          {/* Optionally show color swatch or text */}
        </Button>
      </PopoverTrigger>
      <PopoverContent minWidth="320px" p={0} data-testid={`${testId}-popover`}>
        <PopoverBody p={0}>
          <Box p={4}>
            <ColorPickerContents
              color={internalColor}
              colorSpace={colorSpace}
              gamut={gamut}
              onChange={handleColorChange}
              data-testid={`${testId}-contents`}
            />
          </Box>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

ColorPicker.displayName = 'ColorPicker'; 