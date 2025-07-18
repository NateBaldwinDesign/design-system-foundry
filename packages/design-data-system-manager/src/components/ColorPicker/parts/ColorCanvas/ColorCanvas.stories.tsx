import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChakraProvider, VStack, HStack, Text, Box, Select, FormControl, FormLabel, Alert, AlertIcon } from '@chakra-ui/react';
import Color from 'colorjs.io';
import { ColorCanvas } from './ColorCanvas';

const meta: Meta<typeof ColorCanvas> = {
  title: 'Components/ColorPicker/Atomic/ColorCanvas',
  component: ColorCanvas,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A square canvas component that renders a 2D color gradient based on the provided color and color space. Supports multiple color spaces (sRGB, Display P3, OKLCh) and models (polar/cartesian). The gamut property constrains colors to a specific color space, showing midtone gray for out-of-gamut colors. OKLCh and OKLab use realistic channel ranges for better color visibility.'
      }
    }
  },
  decorators: [
    (Story) => (
      <ChakraProvider>
        <Story />
      </ChakraProvider>
    ),
  ],
  argTypes: {
    size: {
      control: { type: 'range', min: 100, max: 400, step: 50 },
      description: 'Size of the canvas in pixels (both width and height)'
    },
    colorSpace: {
      control: 'select',
      options: ['sRGB', 'Display P3', 'OKlch'],
      description: 'Color space to use for rendering'
    },
    model: {
      control: 'select',
      options: ['cartesian', 'polar'],
      description: 'Color model to use (polar or cartesian)'
    },
    colorChannels: {
      control: 'object',
      description: 'Color channels to render on the canvas. If not provided, defaults are automatically selected based on color space and model: sRGB+cartesian→["r","g"], sRGB+polar→["s","l"], Display P3→["r","g"], OKlch+polar→["c","h"], OKlch+cartesian→["a","b"]'
    },
    color: {
      control: 'object',
      description: 'Base color object from Colorjs.io'
    },
    gamut: {
      control: 'select',
      options: ['sRGB', 'Display-P3', 'Rec2020'],
      description: 'Gamut constraint for rendering. Out-of-gamut colors are shown as midtone gray.'
    },
    onChange: {
      action: 'color-changed',
      description: 'Callback when user interacts with the canvas'
    }
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ColorCanvas>;

// Sample colors for testing
const sampleColors = {
  red: new Color('srgb', [1, 0, 0]),
  green: new Color('srgb', [0, 1, 0]),
  blue: new Color('srgb', [0, 0, 1]),
  orange: new Color('srgb', [1, 0.5, 0]),
  purple: new Color('srgb', [0.5, 0, 1]),
  teal: new Color('srgb', [0, 0.5, 0.5]),
  pink: new Color('srgb', [1, 0.75, 0.8]),
  yellow: new Color('srgb', [1, 1, 0]),
  cyan: new Color('srgb', [0, 1, 1]),
  magenta: new Color('srgb', [1, 0, 1]),
  white: new Color('srgb', [1, 1, 1]),
  black: new Color('srgb', [0, 0, 0]),
  gray: new Color('srgb', [0.5, 0.5, 0.5]),
};

const baseProps = {
  size: 200,
  color: sampleColors.blue,
  onChange: (color: Color) => console.log('Color changed:', color.toString()),
};

// Template for stories
const Template = (args: React.ComponentProps<typeof ColorCanvas>) => {
  const [color, setColor] = useState(args.color);
  
  return (
    <VStack spacing={4} align="stretch">
      <ColorCanvas
        {...args}
        color={color}
        onChange={setColor}
      />
      
      {/* Debug information */}
      <Box p={4} bg="gray.50" borderRadius="md">
        <Text fontWeight="bold">Debug Info:</Text>
        <Text>Color: {color.toString()}</Text>
        <Text>Color Space: {args.colorSpace}</Text>
        <Text>Model: {args.model}</Text>
        <Text>Channels: {args.colorChannels?.join(', ') || 'default'}</Text>
        <Text>Gamut: {args.gamut}</Text>
      </Box>
    </VStack>
  );
};

// Interactive Template with controls
const InteractiveTemplate = (args: React.ComponentProps<typeof ColorCanvas>) => {
  const [color, setColor] = useState(args.color);
  const [selectedColorSpace, setSelectedColorSpace] = useState(args.colorSpace || 'sRGB');
  const [selectedModel, setSelectedModel] = useState(args.model || 'cartesian');
  const [selectedGamut, setSelectedGamut] = useState(args.gamut || 'Display-P3');
  const [selectedColor, setSelectedColor] = useState('blue');

  const handleColorChange = (colorName: string) => {
    setSelectedColor(colorName);
    setColor(sampleColors[colorName as keyof typeof sampleColors]);
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Controls */}
      <HStack spacing={4} wrap="wrap">
        <FormControl width="200px">
          <FormLabel fontSize="sm">Base Color</FormLabel>
          <Select
            size="sm"
            value={selectedColor}
            onChange={(e) => handleColorChange(e.target.value)}
          >
            <option value="red">Red</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
            <option value="orange">Orange</option>
            <option value="purple">Purple</option>
            <option value="teal">Teal</option>
            <option value="pink">Pink</option>
            <option value="yellow">Yellow</option>
            <option value="cyan">Cyan</option>
            <option value="magenta">Magenta</option>
            <option value="white">White</option>
            <option value="black">Black</option>
            <option value="gray">Gray</option>
          </Select>
        </FormControl>

        <FormControl width="200px">
          <FormLabel fontSize="sm">Color Space</FormLabel>
          <Select
            size="sm"
            value={selectedColorSpace}
            onChange={(e) => setSelectedColorSpace(e.target.value as 'sRGB' | 'Display P3' | 'OKlch')}
          >
            <option value="sRGB">sRGB</option>
            <option value="Display P3">Display P3</option>
            <option value="OKlch">OKlch</option>
          </Select>
        </FormControl>

        <FormControl width="200px">
          <FormLabel fontSize="sm">Model</FormLabel>
          <Select
            size="sm"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as 'cartesian' | 'polar')}
          >
            <option value="cartesian">Cartesian</option>
            <option value="polar">Polar</option>
          </Select>
        </FormControl>

        <FormControl width="200px">
          <FormLabel fontSize="sm">Gamut Constraint</FormLabel>
          <Select
            size="sm"
            value={selectedGamut}
            onChange={(e) => setSelectedGamut(e.target.value as 'sRGB' | 'Display-P3' | 'Rec2020')}
          >
            <option value="sRGB">sRGB</option>
            <option value="Display-P3">Display-P3</option>
            <option value="Rec2020">Rec2020</option>
          </Select>
        </FormControl>
      </HStack>

      {/* Gamut Information */}
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text fontSize="sm" fontWeight="bold">Gamut Constraint:</Text>
          <Text fontSize="xs">Colors outside the {selectedGamut} gamut will appear as midtone gray.</Text>
          <Text fontSize="xs">This helps visualize which colors are displayable on different devices.</Text>
        </VStack>
      </Alert>

      {/* Canvas */}
      <ColorCanvas
        {...args}
        color={color}
        colorSpace={selectedColorSpace}
        model={selectedModel}
        gamut={selectedGamut}
        onChange={setColor}
      />
      
      {/* Debug information */}
      <Box p={4} bg="gray.50" borderRadius="md">
        <Text fontWeight="bold" mb={2}>Debug Info:</Text>
        <Text fontSize="sm">Selected Color: {color.toString()}</Text>
        <Text fontSize="sm">Color Space: {selectedColorSpace}</Text>
        <Text fontSize="sm">Model: {selectedModel}</Text>
        <Text fontSize="sm">Gamut: {selectedGamut}</Text>
        <Text fontSize="sm">Size: {args.size}px</Text>
      </Box>
    </VStack>
  );
};

// Basic stories
export const Default: Story = {
  render: Template,
  args: {
    ...baseProps,
  }
};

export const Large: Story = {
  render: Template,
  args: {
    ...baseProps,
    size: 300,
  }
};

export const Small: Story = {
  render: Template,
  args: {
    ...baseProps,
    size: 150,
  }
};

// Color space stories
export const SRGB: Story = {
  render: Template,
  args: {
    ...baseProps,
    colorSpace: 'sRGB',
    model: 'cartesian',
    color: sampleColors.red,
  }
};

export const SRGBPolar: Story = {
  render: Template,
  args: {
    ...baseProps,
    colorSpace: 'sRGB',
    model: 'polar',
    color: sampleColors.green,
  }
};

export const DisplayP3: Story = {
  render: Template,
  args: {
    ...baseProps,
    colorSpace: 'Display P3',
    model: 'cartesian',
    color: sampleColors.orange,
  }
};

export const OKLCH: Story = {
  render: Template,
  args: {
    ...baseProps,
    colorSpace: 'OKlch',
    model: 'polar',
    color: sampleColors.orange,
  }
};

export const OKLCHCartesian: Story = {
  render: Template,
  args: {
    ...baseProps,
    colorSpace: 'OKlch',
    model: 'cartesian',
    color: sampleColors.blue,
  }
};

// Gamut constraint stories
export const GamutConstraints: Story = {
  render: (args) => {
    const [color, setColor] = useState(args.color);
    
    return (
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">Gamut Constraint Comparison</Text>
        <Text fontSize="sm" color="gray.600">
          Out-of-gamut colors are shown as midtone gray. Notice how different gamuts affect color visibility.
        </Text>
        
        <HStack spacing={4} justify="center">
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">sRGB Gamut</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="OKlch"
              model="polar"
              gamut="sRGB"
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">Display-P3 Gamut</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="OKlch"
              model="polar"
              gamut="Display-P3"
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">Rec2020 Gamut</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="OKlch"
              model="polar"
              gamut="Rec2020"
              onChange={setColor}
            />
          </VStack>
        </HStack>
        
        {/* Debug information */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Current Color:</Text>
          <Text>{color.toString()}</Text>
        </Box>
      </VStack>
    );
  },
  args: {
    ...baseProps,
    colorSpace: 'OKlch',
    model: 'polar',
    color: sampleColors.orange,
  }
};

// Channel comparison stories
export const ChannelComparison: Story = {
  render: (args) => {
    const [color, setColor] = useState(args.color);
    
    return (
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">Channel Comparison</Text>
        <Text fontSize="sm" color="gray.600">
          Compare different channel combinations for the same color space.
        </Text>
        
        <HStack spacing={4} justify="center">
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">Chroma vs Hue</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="OKlch"
              model="polar"
              colorChannels={['c', 'h']}
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">Lightness vs Chroma</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="OKlch"
              model="polar"
              colorChannels={['l', 'c']}
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">Hue vs Lightness</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="OKlch"
              model="polar"
              colorChannels={['h', 'l']}
              onChange={setColor}
            />
          </VStack>
        </HStack>
        
        {/* Debug information */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Current Color:</Text>
          <Text>{color.toString()}</Text>
        </Box>
      </VStack>
    );
  },
  args: {
    ...baseProps,
    colorSpace: 'OKlch',
    model: 'polar',
    color: sampleColors.orange,
  }
};

// OKLCh range improvement story
export const OKLChRangeImprovement: Story = {
  render: (args) => {
    const [color, setColor] = useState(args.color);
    
    return (
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">OKLCh Range Improvements</Text>
        <Text fontSize="sm" color="gray.600">
          OKLCh now uses realistic channel ranges for better color visibility:
        </Text>
        <Text fontSize="sm" color="gray.600">
          • Lightness (L): 0 to 1 (full range)
        </Text>
        <Text fontSize="sm" color="gray.600">
          • Chroma (C): 0 to 0.26 (practical max instead of 0 to 1)
        </Text>
        <Text fontSize="sm" color="gray.600">
          • Hue (H): 0 to 360° (full range)
        </Text>
        <Text fontSize="sm" color="gray.600">
          • OKLab a: -0.13 to 0.20, b: -0.28 to 0.10
        </Text>
        
        <HStack spacing={4} justify="center">
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">OKLCh Polar (Improved)</Text>
            <Text fontSize="xs" color="gray.500">Chroma: 0-0.26, Hue: 0-360°</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="OKlch"
              model="polar"
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">OKLCh Cartesian (Improved)</Text>
            <Text fontSize="xs" color="gray.500">a: -0.13 to 0.20, b: -0.28 to 0.10</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="OKlch"
              model="cartesian"
              onChange={setColor}
            />
          </VStack>
        </HStack>
        
        {/* Debug information */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Current Color:</Text>
          <Text>{color.toString()}</Text>
          <Text fontSize="sm" mt={2}>
            Notice how the improved ranges show more vibrant colors instead of mostly gray areas.
          </Text>
        </Box>
      </VStack>
    );
  },
  args: {
    ...baseProps,
    colorSpace: 'OKlch',
    model: 'polar',
    color: sampleColors.orange,
  }
};

// Default channels story
export const DefaultChannels: Story = {
  render: (args) => {
    const [color, setColor] = useState(args.color);
    
    return (
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">Default Channel Mapping</Text>
        <Text fontSize="sm" color="gray.600">
          Each color space and model combination has intelligent default channels.
        </Text>
        
        <HStack spacing={4} justify="center" wrap="wrap">
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">sRGB Cartesian</Text>
            <Text fontSize="xs" color="gray.500">Default: r, g</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="sRGB"
              model="cartesian"
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">sRGB Polar</Text>
            <Text fontSize="xs" color="gray.500">Default: s, l</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="sRGB"
              model="polar"
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">Display P3</Text>
            <Text fontSize="xs" color="gray.500">Default: r, g</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="Display P3"
              model="cartesian"
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">OKlch Polar</Text>
            <Text fontSize="xs" color="gray.500">Default: c, h</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="OKlch"
              model="polar"
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">OKlch Cartesian</Text>
            <Text fontSize="xs" color="gray.500">Default: a, b</Text>
            <ColorCanvas
              size={150}
              color={color}
              colorSpace="OKlch"
              model="cartesian"
              onChange={setColor}
            />
          </VStack>
        </HStack>
        
        {/* Debug information */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Default Channel Mapping:</Text>
          <Text fontSize="sm">• sRGB + Cartesian → r, g</Text>
          <Text fontSize="sm">• sRGB + Polar → s, l</Text>
          <Text fontSize="sm">• Display P3 → r, g</Text>
          <Text fontSize="sm">• OKlch + Polar → c, h</Text>
          <Text fontSize="sm">• OKlch + Cartesian → a, b</Text>
        </Box>
      </VStack>
    );
  },
  args: {
    ...baseProps,
  }
};

// Interactive stories with controls
export const Interactive: Story = {
  render: InteractiveTemplate,
  args: {
    ...baseProps,
  }
};

export const InteractiveLarge: Story = {
  render: InteractiveTemplate,
  args: {
    ...baseProps,
    size: 300,
  }
}; 