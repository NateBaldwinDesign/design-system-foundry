import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChakraProvider, VStack, HStack, Text, Box, Select } from '@chakra-ui/react';
import Color from 'colorjs.io';
import { ColorArea } from './ColorArea';

const meta: Meta<typeof ColorArea> = {
  title: 'Components/ColorPicker/Composite/ColorArea',
  component: ColorArea,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A composite component that combines ColorCanvas with ColorHandle. The handle position corresponds to the color coordinates in the current color space. When the color space changes, the handle position updates to reflect the same color plotted on a different coordinate system.'
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
    color: {
      control: { type: 'object' },
      description: 'The current color value (Colorjs.io object)'
    },
    size: {
      control: { type: 'number', min: 100, max: 400, step: 10 },
      description: 'The size of the color area canvas'
    },
    colorSpace: {
      control: { type: 'select' },
      options: ['sRGB', 'Display P3', 'OKlch'],
      description: 'The color space to use for rendering'
    },
    model: {
      control: { type: 'select' },
      options: ['cartesian', 'polar'],
      description: 'The coordinate model to use'
    },
    colorChannels: {
      control: { type: 'object' },
      description: 'The color channels to display on X and Y axes'
    },
    gamut: {
      control: { type: 'select' },
      options: ['sRGB', 'Display-P3', 'Rec2020'],
      description: 'The gamut constraint to apply'
    },
    onChange: {
      action: 'changed',
      description: 'Callback when color changes'
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes'
    },
    'data-testid': {
      control: { type: 'text' },
      description: 'Test ID for testing'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ColorArea>;

// Default story
export const Default: Story = {
  args: {
    color: new Color('srgb', [1, 0, 0]), // Red
    size: 200,
    colorSpace: 'sRGB',
    model: 'cartesian',
    gamut: 'Display-P3',
    'data-testid': 'color-area'
  }
};

// Story showing different color spaces
export const ColorSpaces: Story = {
  render: () => {
    const [color, setColor] = useState(new Color('srgb', [1, 0, 0]));
    const [colorSpace, setColorSpace] = useState<'sRGB' | 'Display P3' | 'OKlch'>('sRGB');
    
    return (
      <VStack spacing={6} align="stretch">
        <HStack spacing={4} align="center">
          <Text fontWeight="bold">Color Space:</Text>
          <Select
            value={colorSpace}
            onChange={(e) => setColorSpace(e.target.value as 'sRGB' | 'Display P3' | 'OKlch')}
            width="200px"
          >
            <option value="sRGB">sRGB</option>
            <option value="Display P3">Display P3</option>
            <option value="OKlch">OKlch</option>
          </Select>
        </HStack>
        
        <ColorArea
          color={color}
          colorSpace={colorSpace}
          model="cartesian"
          onChange={setColor}
          data-testid="color-space-demo"
        />
        
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Debug Info:</Text>
          <Text>Color: {color.toString({ format: 'hex' })}</Text>
          <Text>Color Space: {colorSpace}</Text>
          <Text>Coordinates: [{color.coords.join(', ')}]</Text>
        </Box>
      </VStack>
    );
  }
};

// Story showing coordinate models
export const CoordinateModels: Story = {
  render: () => {
    const [color, setColor] = useState(new Color('hsl', [0, 100, 50])); // Red in HSL
    const [model, setModel] = useState<'cartesian' | 'polar'>('cartesian');
    
    return (
      <VStack spacing={6} align="stretch">
        <HStack spacing={4} align="center">
          <Text fontWeight="bold">Model:</Text>
          <Select
            value={model}
            onChange={(e) => setModel(e.target.value as 'cartesian' | 'polar')}
            width="200px"
          >
            <option value="cartesian">Cartesian</option>
            <option value="polar">Polar</option>
          </Select>
        </HStack>
        
        <ColorArea
          color={color}
          colorSpace="sRGB"
          model={model}
          onChange={setColor}
          data-testid="model-demo"
        />
        
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Debug Info:</Text>
          <Text>Color: {color.toString({ format: 'hex' })}</Text>
          <Text>Model: {model}</Text>
          <Text>Coordinates: [{color.coords.join(', ')}]</Text>
        </Box>
      </VStack>
    );
  }
};

// Story showing handle positioning
export const HandlePositioning: Story = {
  render: () => {
    const [color, setColor] = useState(new Color('srgb', [1, 0, 0])); // Red
    
    return (
      <VStack spacing={6} align="stretch">
        <HStack spacing={4} align="center">
          <Text fontWeight="bold">Color:</Text>
          <Box
            width="40px"
            height="40px"
            backgroundColor={color.toString({ format: 'hex' })}
            borderRadius="md"
            border="2px solid"
            borderColor="gray.300"
          />
          <Text>{color.toString({ format: 'hex' })}</Text>
        </HStack>
        
        <HStack spacing={4} align="start">
          <VStack spacing={2} align="center">
            <Text fontWeight="bold">sRGB Cartesian</Text>
            <ColorArea
              color={color}
              colorSpace="sRGB"
              model="cartesian"
              onChange={setColor}
              size={150}
              data-testid="srgb-cartesian"
            />
          </VStack>
          
          <VStack spacing={2} align="center">
            <Text fontWeight="bold">sRGB Polar</Text>
            <ColorArea
              color={color}
              colorSpace="sRGB"
              model="polar"
              onChange={setColor}
              size={150}
              data-testid="srgb-polar"
            />
          </VStack>
          
          <VStack spacing={2} align="center">
            <Text fontWeight="bold">OKlch Polar</Text>
            <ColorArea
              color={color}
              colorSpace="OKlch"
              model="polar"
              onChange={setColor}
              size={150}
              data-testid="oklch-polar"
            />
          </VStack>
        </HStack>
        
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Handle Positions:</Text>
          <Text>Same color plotted on different coordinate systems</Text>
          <Text>Notice how the handle position changes for the same color</Text>
        </Box>
      </VStack>
    );
  }
};

// Story showing different sizes
export const DifferentSizes: Story = {
  render: () => {
    const [color, setColor] = useState(new Color('srgb', [0.5, 0.3, 0.8])); // Purple
    
    return (
      <VStack spacing={6} align="stretch">
        <HStack spacing={4} align="center">
          <Text fontWeight="bold">Size Comparison:</Text>
        </HStack>
        
        <HStack spacing={4} align="start">
          <VStack spacing={2} align="center">
            <Text fontWeight="bold">Small (150px)</Text>
            <ColorArea
              color={color}
              size={150}
              onChange={setColor}
              data-testid="small-area"
            />
          </VStack>
          
          <VStack spacing={2} align="center">
            <Text fontWeight="bold">Medium (200px)</Text>
            <ColorArea
              color={color}
              size={200}
              onChange={setColor}
              data-testid="medium-area"
            />
          </VStack>
          
          <VStack spacing={2} align="center">
            <Text fontWeight="bold">Large (300px)</Text>
            <ColorArea
              color={color}
              size={300}
              onChange={setColor}
              data-testid="large-area"
            />
          </VStack>
        </HStack>
        
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Debug Info:</Text>
          <Text>Color: {color.toString({ format: 'hex' })}</Text>
          <Text>Handle scales proportionally with canvas size</Text>
        </Box>
      </VStack>
    );
  }
};

// Story showing gamut constraints
export const GamutConstraints: Story = {
  render: () => {
    const [color, setColor] = useState(new Color('p3', [1, 0, 0])); // P3 Red
    
    return (
      <VStack spacing={6} align="stretch">
        <HStack spacing={4} align="center">
          <Text fontWeight="bold">Gamut Constraints:</Text>
        </HStack>
        
        <HStack spacing={4} align="start">
          <VStack spacing={2} align="center">
            <Text fontWeight="bold">sRGB Gamut</Text>
            <ColorArea
              color={color}
              gamut="sRGB"
              onChange={setColor}
              size={150}
              data-testid="srgb-gamut"
            />
          </VStack>
          
          <VStack spacing={2} align="center">
            <Text fontWeight="bold">Display-P3 Gamut</Text>
            <ColorArea
              color={color}
              gamut="Display-P3"
              onChange={setColor}
              size={150}
              data-testid="p3-gamut"
            />
          </VStack>
          
          <VStack spacing={2} align="center">
            <Text fontWeight="bold">Rec2020 Gamut</Text>
            <ColorArea
              color={color}
              gamut="Rec2020"
              onChange={setColor}
              size={150}
              data-testid="rec2020-gamut"
            />
          </VStack>
        </HStack>
        
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Debug Info:</Text>
          <Text>Color: {color.toString({ format: 'hex' })}</Text>
          <Text>Out-of-gamut colors shown as gray areas</Text>
        </Box>
      </VStack>
    );
  }
};

// Interactive story for testing
export const Interactive: Story = {
  render: (args) => {
    const [color, setColor] = useState(args.color || new Color('srgb', [1, 0, 0]));
    const [colorSpace, setColorSpace] = useState(args.colorSpace || 'sRGB');
    const [model, setModel] = useState(args.model || 'cartesian');
    
    return (
      <VStack spacing={6} align="stretch">
        <HStack spacing={4} align="center">
          <Text fontWeight="bold">Color Space:</Text>
          <Select
            value={colorSpace}
            onChange={(e) => setColorSpace(e.target.value as 'sRGB' | 'Display P3' | 'OKlch')}
            width="150px"
          >
            <option value="sRGB">sRGB</option>
            <option value="Display P3">Display P3</option>
            <option value="OKlch">OKlch</option>
          </Select>
          
          <Text fontWeight="bold">Model:</Text>
          <Select
            value={model}
            onChange={(e) => setModel(e.target.value as 'cartesian' | 'polar')}
            width="120px"
          >
            <option value="cartesian">Cartesian</option>
            <option value="polar">Polar</option>
          </Select>
        </HStack>
        
        <ColorArea
          {...args}
          color={color}
          colorSpace={colorSpace}
          model={model}
          onChange={setColor}
          data-testid="interactive-area"
        />
        
        <Box p={4} bg="gray.50" borderRadius="md" width="480px">
          <Text fontWeight="bold">Debug Info:</Text>
          <Text>Color: {color.toString({ format: 'hex' })}</Text>
          <Text>Color Space: {colorSpace}</Text>
          <Text>Model: {model}</Text>
          <Text>Coordinates: [{color.coords.join(', ')}]</Text>
          <Text>Size: {args.size || 200}px</Text>
          <Text>Gamut: {args.gamut || 'Display-P3'}</Text>
        </Box>
      </VStack>
    );
  },
  args: {
    size: 200,
    gamut: 'Display-P3',
    'data-testid': 'interactive-area'
  }
};

// Debug story for comprehensive testing
export const Debug: Story = {
  render: (args) => {
    const color = args.color || new Color('srgb', [1, 0, 0]);
    
    return (
      <VStack spacing={4} align="stretch">
        <ColorArea
          {...args}
          color={color}
          data-testid="debug-area"
        />
        
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Debug Info:</Text>
          <Text>Color: {color.toString({ format: 'hex' })}</Text>
          <Text>Color Space: {args.colorSpace || 'sRGB'}</Text>
          <Text>Model: {args.model || 'cartesian'}</Text>
          <Text>Size: {args.size || 200}px</Text>
          <Text>Gamut: {args.gamut || 'Display-P3'}</Text>
          <Text>Channels: {args.colorChannels ? args.colorChannels.join(', ') : 'default'}</Text>
          <Text>Test ID: {args['data-testid'] || 'debug-area'}</Text>
        </Box>
      </VStack>
    );
  },
  args: {
    size: 200,
    colorSpace: 'sRGB',
    model: 'cartesian',
    gamut: 'Display-P3',
    'data-testid': 'debug-area'
  }
}; 