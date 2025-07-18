import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { VStack, HStack, Box, Text } from '@chakra-ui/react';
import Color from 'colorjs.io';
import { ColorSlider } from './ColorSlider';

const meta: Meta<typeof ColorSlider> = {
  title: 'Components/ColorPicker/Atomic/ColorSlider',
  component: ColorSlider,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A single-channel slider component with gradient background for controlling color channels like lightness, chroma, hue, etc. Supports both horizontal and vertical orientations with full keyboard navigation and gamut constraint.'
      }
    }
  },
  decorators: [
    (Story) => (
      <Box p={4}>
        <Story />
      </Box>
    ),
  ],
  argTypes: {
    size: {
      control: { type: 'range', min: 100, max: 400, step: 10 },
      description: 'The size of the slider (width for horizontal, height for vertical)'
    },
    orientation: {
      control: { type: 'select' },
      options: ['horizontal', 'vertical'],
      description: 'The orientation of the slider'
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
    channel: {
      control: { type: 'select' },
      options: ['l', 'c', 'h', 'r', 'g', 'b'],
      description: 'The color channel to control'
    },
    gamut: {
      control: { type: 'select' },
      options: ['sRGB', 'Display-P3', 'Rec2020'],
      description: 'The gamut constraint to apply'
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// Helper function to create a color from hex string
const createColor = (hex: string) => new Color('srgb', Color.parse(hex).coords);

// Default story with interactive color
export const Default: Story = {
  render: (args) => {
    const [color, setColor] = useState(createColor('#FF0000'));
    
    return (
      <VStack spacing={4} align="stretch">
        <ColorSlider
          {...args}
          color={color}
          onChange={setColor}
        />
        <Box p={3} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontFamily="mono">
            Color: {color.toString({ format: 'hex' })}
          </Text>
        </Box>
      </VStack>
    );
  },
  args: {
    size: 200,
    orientation: 'horizontal',
    colorSpace: 'sRGB',
    model: 'cartesian',
    channel: 'l',
    gamut: 'Display-P3'
  }
};

// Horizontal orientation story
export const Horizontal: Story = {
  render: (args) => {
    const [color, setColor] = useState(createColor('#00FF00'));
    
    return (
      <VStack spacing={4} align="stretch">
        <ColorSlider
          {...args}
          color={color}
          onChange={setColor}
        />
        <Box p={3} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontFamily="mono">
            Color: {color.toString({ format: 'hex' })}
          </Text>
        </Box>
      </VStack>
    );
  },
  args: {
    size: 300,
    orientation: 'horizontal',
    colorSpace: 'sRGB',
    model: 'cartesian',
    channel: 'r',
    gamut: 'Display-P3'
  }
};

// Vertical orientation story
export const Vertical: Story = {
  render: (args) => {
    const [color, setColor] = useState(createColor('#0000FF'));
    
    return (
      <HStack spacing={4} align="flex-start">
        <ColorSlider
          {...args}
          color={color}
          onChange={setColor}
        />
        <Box p={3} bg="gray.50" borderRadius="md" minW="200px">
          <Text fontSize="sm" fontFamily="mono">
            Color: {color.toString({ format: 'hex' })}
          </Text>
        </Box>
      </HStack>
    );
  },
  args: {
    size: 200,
    orientation: 'vertical',
    colorSpace: 'sRGB',
    model: 'cartesian',
    channel: 'g',
    gamut: 'Display-P3'
  }
};

// Lightness channel story
export const LightnessChannel: Story = {
  render: (args) => {
    const [color, setColor] = useState(createColor('#FF6B35'));
    
    return (
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Lightness Channel (OKLCH)</Text>
        <ColorSlider
          {...args}
          color={color}
          onChange={setColor}
        />
        <Box p={3} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontFamily="mono">
            Color: {color.toString({ format: 'hex' })}
          </Text>
        </Box>
      </VStack>
    );
  },
  args: {
    size: 250,
    orientation: 'horizontal',
    colorSpace: 'OKlch',
    model: 'polar',
    channel: 'l',
    gamut: 'Display-P3'
  }
};

// Chroma channel story
export const ChromaChannel: Story = {
  render: (args) => {
    const [color, setColor] = useState(createColor('#FF6B35'));
    
    return (
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Chroma Channel (OKLCH)</Text>
        <ColorSlider
          {...args}
          color={color}
          onChange={setColor}
        />
        <Box p={3} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontFamily="mono">
            Color: {color.toString({ format: 'hex' })}
          </Text>
        </Box>
      </VStack>
    );
  },
  args: {
    size: 250,
    orientation: 'horizontal',
    colorSpace: 'OKlch',
    model: 'polar',
    channel: 'c',
    gamut: 'Display-P3'
  }
};

// Hue channel story
export const HueChannel: Story = {
  render: (args) => {
    const [color, setColor] = useState(createColor('#FF6B35'));
    
    return (
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Hue Channel (OKLCH)</Text>
        <ColorSlider
          {...args}
          color={color}
          onChange={setColor}
        />
        <Box p={3} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontFamily="mono">
            Color: {color.toString({ format: 'hex' })}
          </Text>
        </Box>
      </VStack>
    );
  },
  args: {
    size: 250,
    orientation: 'horizontal',
    colorSpace: 'OKlch',
    model: 'polar',
    channel: 'h',
    gamut: 'Display-P3'
  }
};

// RGB channels story
export const RGBChannels: Story = {
  render: (args) => {
    const [color, setColor] = useState(createColor('#FF6B35'));
    
    return (
      <VStack spacing={6} align="stretch">
        <Text fontWeight="bold">RGB Channels (sRGB)</Text>
        
        <VStack spacing={2} align="stretch">
          <Text fontSize="sm">Red Channel</Text>
          <ColorSlider
            {...args}
            color={color}
            onChange={setColor}
            channel="r"
          />
        </VStack>
        
        <VStack spacing={2} align="stretch">
          <Text fontSize="sm">Green Channel</Text>
          <ColorSlider
            {...args}
            color={color}
            onChange={setColor}
            channel="g"
          />
        </VStack>
        
        <VStack spacing={2} align="stretch">
          <Text fontSize="sm">Blue Channel</Text>
          <ColorSlider
            {...args}
            color={color}
            onChange={setColor}
            channel="b"
          />
        </VStack>
        
        <Box p={3} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontFamily="mono">
            Color: {color.toString({ format: 'hex' })}
          </Text>
        </Box>
      </VStack>
    );
  },
  args: {
    size: 200,
    orientation: 'horizontal',
    colorSpace: 'sRGB',
    model: 'cartesian',
    channel: 'r',
    gamut: 'Display-P3'
  }
};

// Display P3 color space story
export const DisplayP3ColorSpace: Story = {
  render: (args) => {
    const [color, setColor] = useState(new Color('p3', [1, 0, 0]));
    
    return (
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold">Display P3 Color Space</Text>
        <ColorSlider
          {...args}
          color={color}
          onChange={setColor}
        />
        <Box p={3} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontFamily="mono">
            Color: {color.toString({ format: 'hex' })}
          </Text>
          <Text fontSize="sm" fontFamily="mono">
            P3: {color.toString({ format: 'color' })}
          </Text>
        </Box>
      </VStack>
    );
  },
  args: {
    size: 250,
    orientation: 'horizontal',
    colorSpace: 'Display P3',
    model: 'cartesian',
    channel: 'r',
    gamut: 'Display-P3'
  }
};

// Different sizes story
export const DifferentSizes: Story = {
  render: (args) => {
    const [color, setColor] = useState(createColor('#FF6B35'));
    
    return (
      <VStack spacing={6} align="stretch">
        <Text fontWeight="bold">Different Sizes</Text>
        
        <VStack spacing={2} align="stretch">
          <Text fontSize="sm">Small (150px)</Text>
          <ColorSlider
            {...args}
            color={color}
            onChange={setColor}
            size={150}
          />
        </VStack>
        
        <VStack spacing={2} align="stretch">
          <Text fontSize="sm">Medium (250px)</Text>
          <ColorSlider
            {...args}
            color={color}
            onChange={setColor}
            size={250}
          />
        </VStack>
        
        <VStack spacing={2} align="stretch">
          <Text fontSize="sm">Large (350px)</Text>
          <ColorSlider
            {...args}
            color={color}
            onChange={setColor}
            size={350}
          />
        </VStack>
        
        <Box p={3} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontFamily="mono">
            Color: {color.toString({ format: 'hex' })}
          </Text>
        </Box>
      </VStack>
    );
  },
  args: {
    orientation: 'horizontal',
    colorSpace: 'sRGB',
    model: 'cartesian',
    channel: 'l',
    gamut: 'Display-P3'
  }
};

// Debug story with comprehensive information
export const Debug: Story = {
  render: (args) => {
    const [color, setColor] = useState(createColor('#FF6B35'));
    const [error, setError] = useState<string | null>(null);
    
    const handleChange = (newColor: Color) => {
      try {
        setColor(newColor);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    
    return (
      <VStack spacing={4} align="stretch">
        <ColorSlider
          {...args}
          color={color}
          onChange={handleChange}
        />
        
        {/* Debug information */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Debug Info:</Text>
          <Text fontSize="sm" fontFamily="mono">
            Color: {color.toString({ format: 'hex' })}
          </Text>
          <Text fontSize="sm" fontFamily="mono">
            Color Space: {color.space.id}
          </Text>
          <Text fontSize="sm" fontFamily="mono">
            Coordinates: [{color.coords.map(c => c.toFixed(3)).join(', ')}]
          </Text>
          <Text fontSize="sm" fontFamily="mono">
            Channel: {args.channel}
          </Text>
          <Text fontSize="sm" fontFamily="mono">
            Orientation: {args.orientation}
          </Text>
          <Text fontSize="sm" fontFamily="mono">
            Size: {args.size}px
          </Text>
          {error && (
            <Text fontSize="sm" color="red.500">
              Error: {error}
            </Text>
          )}
        </Box>
      </VStack>
    );
  },
  args: {
    size: 200,
    orientation: 'horizontal',
    colorSpace: 'sRGB',
    model: 'cartesian',
    channel: 'l',
    gamut: 'Display-P3'
  }
};

// Integration story showing multiple sliders
export const Integration: Story = {
  render: (args) => {
    const [color, setColor] = useState(createColor('#FF6B35'));
    
    return (
      <VStack spacing={6} align="stretch">
        <Text fontWeight="bold">ColorSlider Integration</Text>
        
        <HStack spacing={4} align="flex-start">
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" fontWeight="medium">OKLCH Channels</Text>
            
            <VStack spacing={2} align="stretch">
              <Text fontSize="xs">Lightness</Text>
              <ColorSlider
                {...args}
                color={color}
                onChange={setColor}
                colorSpace="OKlch"
                model="polar"
                channel="l"
                size={150}
              />
            </VStack>
            
            <VStack spacing={2} align="stretch">
              <Text fontSize="xs">Chroma</Text>
              <ColorSlider
                {...args}
                color={color}
                onChange={setColor}
                colorSpace="OKlch"
                model="polar"
                channel="c"
                size={150}
              />
            </VStack>
            
            <VStack spacing={2} align="stretch">
              <Text fontSize="xs">Hue</Text>
              <ColorSlider
                {...args}
                color={color}
                onChange={setColor}
                colorSpace="OKlch"
                model="polar"
                channel="h"
                size={150}
              />
            </VStack>
          </VStack>
          
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" fontWeight="medium">RGB Channels</Text>
            
            <VStack spacing={2} align="stretch">
              <Text fontSize="xs">Red</Text>
              <ColorSlider
                {...args}
                color={color}
                onChange={setColor}
                colorSpace="sRGB"
                model="cartesian"
                channel="r"
                size={150}
              />
            </VStack>
            
            <VStack spacing={2} align="stretch">
              <Text fontSize="xs">Green</Text>
              <ColorSlider
                {...args}
                color={color}
                onChange={setColor}
                colorSpace="sRGB"
                model="cartesian"
                channel="g"
                size={150}
              />
            </VStack>
            
            <VStack spacing={2} align="stretch">
              <Text fontSize="xs">Blue</Text>
              <ColorSlider
                {...args}
                color={color}
                onChange={setColor}
                colorSpace="sRGB"
                model="cartesian"
                channel="b"
                size={150}
              />
            </VStack>
          </VStack>
        </HStack>
        
        <Box p={3} bg="gray.50" borderRadius="md">
          <Text fontSize="sm" fontFamily="mono">
            Color: {color.toString({ format: 'hex' })}
          </Text>
        </Box>
      </VStack>
    );
  },
  args: {
    orientation: 'horizontal',
    gamut: 'Display-P3'
  }
}; 