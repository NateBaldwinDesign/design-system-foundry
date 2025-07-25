import React, { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Select, 
  Text,
  Button,
  ButtonGroup
} from '@chakra-ui/react';
import { BoxIcon, Cylinder } from 'lucide-react';
import Color from 'colorjs.io';
import { ColorArea } from '../ColorArea/ColorArea';
import { ColorSlider } from '../ColorSlider/ColorSlider';

export interface ColorPickerContentsProps {
  /** Initial color value as a string (hex, rgb, etc.) */
  color: string;
  /** Callback when color changes */
  onChange?: (color: Color) => void;
  /** Initial gamut constraint (defaults to 'Display-P3') */
  gamut?: 'sRGB' | 'Display-P3' | 'Rec2020';
  /** Whether to show the gamut picker dropdown (defaults to true) */
  showGamutPicker?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Additional Chakra UI Box props */
  [key: string]: unknown;
}

/**
 * ColorPickerContents - A composite component that combines color space selection,
 * gamut selection, model selection, ColorArea, and ColorSlider components.
 * 
 * This component manages the state for color, colorSpace, gamut, and model,
 * and provides a complete color picking interface with all the atomic components
 * working together.
 */
export const ColorPickerContents = React.memo<ColorPickerContentsProps>(({
  color: initialColor,
  onChange,
  gamut: initialGamut = 'Display-P3',
  showGamutPicker = true,
  className,
  'data-testid': testId = 'color-picker-contents',
  ...boxProps
}: ColorPickerContentsProps) => {

  // Parse initial color string to Color object
  const [color, setColor] = useState<Color>(() => {
    try {
      return new Color(initialColor);
    } catch (error) {
      console.warn('Invalid initial color, using black:', error);
      return new Color('srgb', [0, 0, 0]);
    }
  });

  // State for color space, gamut, and model
  const [colorSpaceState, setColorSpaceState] = useState<'sRGB' | 'Display P3' | 'OKlch'>('sRGB');
  const [colorGamut, setColorGamut] = useState<'sRGB' | 'Display-P3' | 'Rec2020'>(initialGamut);
  const [colorModel, setColorModel] = useState<'cartesian' | 'polar'>('cartesian');

  // Handle color changes from sub-components
  const handleColorChange = useCallback((newColor: Color) => {
    setColor(newColor);
    if (onChange) {
      onChange(newColor);
    }
  }, [onChange]);

  // Determine which channels to use for ColorArea based on color space and model
  const colorChannels = useMemo(() => {
    if (colorSpaceState === 'OKlch' && colorModel === 'polar') {
      return ['c', 'h'] as [string, string]; // Chroma and Hue for OKLCH polar
    } else if (colorSpaceState === 'OKlch' && colorModel === 'cartesian') {
      return ['a', 'b'] as [string, string]; // a and b for OKLab
    } else if (colorSpaceState === 'sRGB' && colorModel === 'polar') {
      return ['s', 'l'] as [string, string]; // Saturation and Lightness for HSL
    } else if (colorSpaceState === 'Display P3' && colorModel === 'polar') {
      return ['s', 'l'] as [string, string]; // Saturation and Lightness for P3-HSL
    } else if (colorSpaceState === 'Display P3' && colorModel === 'cartesian') {
      return ['r', 'g'] as [string, string]; // Red and Green for P3 cartesian
    } else {
      return ['r', 'g'] as [string, string]; // Red and Green for sRGB cartesian
    }
  }, [colorSpaceState, colorModel]);

  // Determine which channel to use for ColorSlider based on color space and model
  const sliderChannel = useMemo(() => {
    if (colorSpaceState === 'OKlch') {
      return 'l'; // Lightness for OKLCH
    } else if (colorSpaceState === 'sRGB' && colorModel === 'polar') {
      return 'h'; // Hue for HSL
    } else if (colorSpaceState === 'Display P3' && colorModel === 'polar') {
      return 'h'; // Hue for P3-HSL
    } else {
      return 'b'; // Blue for sRGB/Display P3 cartesian
    }
  }, [colorSpaceState, colorModel]);

  // Handle color space change
  const handleColorSpaceChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newColorSpace = event.target.value as 'sRGB' | 'Display P3' | 'OKlch';
    setColorSpaceState(newColorSpace);
    
    // Model selection should persist - removed automatic reset logic
  }, []);

  // Handle gamut change
  const handleGamutChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const newGamut = event.target.value as 'sRGB' | 'Display-P3' | 'Rec2020';
    setColorGamut(newGamut);
  }, []);

  // Handle model change
  const handleModelChange = useCallback((newModel: 'cartesian' | 'polar') => {
    setColorModel(newModel);
  }, []);

  return (
    <Box
      as="div"
      className={className}
      data-testid={testId}
      {...boxProps}
    >
      <VStack spacing={4} align="stretch">
        {/* Controls Row */}
        <HStack spacing={3} justify="space-between">
          {/* Color Space Dropdown */}
          <VStack spacing={1} align="start" flex={1}>
            <Text fontSize="xs" fontWeight="medium">Color Space</Text>
            <Select
              size="xs"
              value={colorSpaceState}
              onChange={handleColorSpaceChange}
              data-testid={`${testId}-color-space-select`}
            >
              <option value="sRGB">sRGB</option>
              <option value="Display P3">Display P3</option>
              <option value="OKlch">OKLCH</option>
            </Select>
          </VStack>

          {/* Gamut Dropdown - Only show if showGamutPicker is true */}
          {showGamutPicker && (
            <VStack spacing={1} align="start" flex={1}>
              <Text fontSize="xs" fontWeight="medium">Gamut</Text>
              <Select
                size="xs"
                value={colorGamut}
                onChange={handleGamutChange}
                data-testid={`${testId}-gamut-select`}
              >
                <option value="sRGB">sRGB</option>
                <option value="Display-P3">Display P3</option>
                <option value="Rec2020">Rec2020</option>
              </Select>
            </VStack>
          )}

          {/* Model Toggle */}
          <VStack spacing={1} align="start">
            <Text fontSize="xs" fontWeight="medium">Model</Text>
            <ButtonGroup size="xs" isAttached>
              <Button
                variant={colorModel === 'cartesian' ? 'solid' : 'outline'}
                onClick={() => handleModelChange('cartesian')}
                data-testid={`${testId}-cartesian-toggle`}
                colorScheme={colorModel === 'cartesian' ? 'blue' : 'gray'}
              >
                <BoxIcon size={14} />
              </Button>
              <Button
                variant={colorModel === 'polar' ? 'solid' : 'outline'}
                onClick={() => handleModelChange('polar')}
                data-testid={`${testId}-polar-toggle`}
                colorScheme={colorModel === 'polar' ? 'blue' : 'gray'}
              >
                <Cylinder size={14} />
              </Button>
            </ButtonGroup>
          </VStack>
        </HStack>

        {/* Color Area and Slider Row */}
        <HStack spacing={4} align="start">
          {/* Color Area */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              Color Area ({colorChannels[0]} × {colorChannels[1]})
            </Text>
            <ColorArea
              size={200}
              colorSpace={colorSpaceState}
              model={colorModel}
              colorChannels={colorChannels}
              color={color}
              gamut={colorGamut}
              onChange={handleColorChange}
              data-testid={`${testId}-color-area`}
            />
          </Box>

          {/* Color Slider */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2}>
              {sliderChannel.toUpperCase()} Channel
            </Text>
            <ColorSlider
              size={200}
              orientation="vertical"
              colorSpace={colorSpaceState}
              model={colorModel}
              channel={sliderChannel}
              color={color}
              gamut={colorGamut}
              onChange={handleColorChange}
              data-testid={`${testId}-color-slider`}
            />
          </Box>
        </HStack>
      </VStack>
    </Box>
  );
});

ColorPickerContents.displayName = 'ColorPickerContents'; 