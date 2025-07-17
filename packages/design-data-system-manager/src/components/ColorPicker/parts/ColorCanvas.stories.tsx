import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChakraProvider, VStack, HStack, Text, Box, Select, FormControl, FormLabel } from '@chakra-ui/react';
import Color from 'colorjs.io';
import { ColorCanvas } from './ColorCanvas';

const meta: Meta<typeof ColorCanvas> = {
  title: 'Components/ColorPicker/Atomic/ColorCanvas',
  component: ColorCanvas,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A square canvas component that renders a color gradient. This is the first atomic component in the color picker system, optimized for performance using canvas rendering.'
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
    onChange: {
      action: 'color-changed',
      description: 'Callback when user interacts with the canvas'
    }
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ColorCanvas>;

// Sample colors for stories
const sampleColors = {
  red: new Color('srgb', [1, 0, 0]),
  green: new Color('srgb', [0, 1, 0]),
  blue: new Color('srgb', [0, 0, 1]),
  purple: new Color('hsl', [270, 100, 50]),
  orange: new Color('oklch', [0.7, 0.2, 60]),
  pink: new Color('p3', [1, 0, 0.5]), // Pink in Display P3
};

// Base props for all stories
const baseProps = {
  size: 200,
  color: sampleColors.red,
  'data-testid': 'color-canvas',
};

// Stateful Template for interactive stories
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
        <Text fontWeight="bold" mb={2}>Debug Info:</Text>
        <Text fontSize="sm">Color: {color.toString()}</Text>
        <Text fontSize="sm">Color Space: {args.colorSpace || 'sRGB'}</Text>
        <Text fontSize="sm">Model: {args.model || 'cartesian'}</Text>
        <Text fontSize="sm">Channels: {args.colorChannels?.join(', ') || 'Default (auto-selected)'}</Text>
      </Box>
    </VStack>
  );
};

// Interactive Template with controls
const InteractiveTemplate = (args: React.ComponentProps<typeof ColorCanvas>) => {
  const [color, setColor] = useState(args.color);
  const [selectedColorSpace, setSelectedColorSpace] = useState(args.colorSpace || 'sRGB');
  const [selectedModel, setSelectedModel] = useState(args.model || 'cartesian');
  const [selectedColor, setSelectedColor] = useState('red');

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
            <option value="purple">Purple</option>
            <option value="orange">Orange</option>
            <option value="pink">Pink</option>
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
      </HStack>

      {/* Canvas */}
      <ColorCanvas
        {...args}
        color={color}
        colorSpace={selectedColorSpace}
        model={selectedModel}
        onChange={setColor}
      />
      
      {/* Debug information */}
      <Box p={4} bg="gray.50" borderRadius="md">
        <Text fontWeight="bold" mb={2}>Debug Info:</Text>
        <Text fontSize="sm">Selected Color: {color.toString()}</Text>
        <Text fontSize="sm">Color Space: {selectedColorSpace}</Text>
        <Text fontSize="sm">Model: {selectedModel}</Text>
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
    color: sampleColors.purple,
  }
};

export const HSLRendering: Story = {
  render: (args) => {
    const [color, setColor] = useState(args.color);
    
    return (
      <VStack spacing={6} align="stretch">
        <Text fontWeight="bold" fontSize="lg">HSL Rendering Test</Text>
        <Text fontSize="sm" color="gray.600">
          This tests the HSL coordinate handling (H: 0-360°, S: 0-100%, L: 0-100%)
        </Text>
        
        <HStack spacing={4} wrap="wrap" justify="center">
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">Saturation vs Lightness</Text>
            <Text fontSize="xs" color="gray.500">Default: s, l</Text>
            <ColorCanvas
              size={200}
              color={color}
              colorSpace="sRGB"
              model="polar"
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">Hue vs Saturation</Text>
            <Text fontSize="xs" color="gray.500">Custom: h, s</Text>
            <ColorCanvas
              size={200}
              color={color}
              colorSpace="sRGB"
              model="polar"
              colorChannels={['h', 's']}
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">Hue vs Lightness</Text>
            <Text fontSize="xs" color="gray.500">Custom: h, l</Text>
            <ColorCanvas
              size={200}
              color={color}
              colorSpace="sRGB"
              model="polar"
              colorChannels={['h', 'l']}
              onChange={setColor}
            />
          </VStack>
        </HStack>
        
        {/* Debug information */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">HSL Coordinate Ranges:</Text>
          <Text fontSize="sm">• Hue (H): 0-360 degrees</Text>
          <Text fontSize="sm">• Saturation (S): 0-100%</Text>
          <Text fontSize="sm">• Lightness (L): 0-100%</Text>
          <Text fontSize="sm">Current Color: {color.toString()}</Text>
        </Box>
      </VStack>
    );
  },
  args: {
    ...baseProps,
    color: new Color('hsl', [120, 100, 50]), // Bright green
  }
};

export const DisplayP3: Story = {
  render: Template,
  args: {
    ...baseProps,
    colorSpace: 'Display P3',
    color: sampleColors.pink,
  }
};

export const ColorGamutComparison: Story = {
  render: (args) => {
    const [color, setColor] = useState(args.color);
    
    return (
      <VStack spacing={6} align="stretch">
        <Text fontWeight="bold" fontSize="lg">Colorjs.io Canvas Color Space Conversion</Text>
        <Text fontSize="sm" color="gray.600">
          Colors are converted using Colorjs.io to match the canvas color space (display-p3 or srgb) for maximum vibrancy and accuracy.
        </Text>
        
        <HStack spacing={4} wrap="wrap" justify="center">
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">sRGB (rgb/hsl)</Text>
            <Text fontSize="xs" color="gray.500">Colorjs.io → srgb</Text>
            <ColorCanvas
              size={200}
              color={color}
              colorSpace="sRGB"
              model="cartesian"
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">Display P3</Text>
            <Text fontSize="xs" color="gray.500">Colorjs.io → p3</Text>
            <ColorCanvas
              size={200}
              color={color}
              colorSpace="Display P3"
              onChange={setColor}
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">OKlch</Text>
            <Text fontSize="xs" color="gray.500">Colorjs.io → oklch/oklab</Text>
            <ColorCanvas
              size={200}
              color={color}
              colorSpace="OKlch"
              model="polar"
              onChange={setColor}
            />
          </VStack>
        </HStack>
        
        {/* Debug information */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Colorjs.io Conversion Strategy:</Text>
          <Text fontSize="sm">• Canvas Context: display-p3 (if supported) or srgb</Text>
          <Text fontSize="sm">• sRGB Colors → Converted to canvas color space</Text>
          <Text fontSize="sm">• Display P3 Colors → Converted to canvas color space</Text>
          <Text fontSize="sm">• OKlch Colors → Converted to canvas color space</Text>
          <Text fontSize="sm">• All conversions use Colorjs.io for accuracy</Text>
          <Text fontSize="sm">Current Color: {color.toString()}</Text>
        </Box>
      </VStack>
    );
  },
  args: {
    ...baseProps,
    color: new Color('p3', [1, 0, 0.5]), // Vibrant magenta in P3
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

// Default channel stories
export const DefaultChannels: Story = {
  render: (args) => {
    const [color, setColor] = useState(args.color);
    
    return (
      <VStack spacing={6} align="stretch">
        <Text fontWeight="bold" fontSize="lg">Default Channel Behavior</Text>
        <Text fontSize="sm" color="gray.600">
          These canvases use automatic channel selection based on color space and model
        </Text>
        
        <HStack spacing={4} wrap="wrap" justify="center">
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

// Interactive stories
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

// Debug story
export const Debug: Story = {
  render: (args) => {
    const [color, setColor] = useState(args.color);
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
        <ColorCanvas
          {...args}
          color={color}
          onChange={handleChange}
        />
        
        {/* Debug information */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Debug Info:</Text>
          <Text>Color: {color.toString()}</Text>
          <Text>Color Space: {color.space.id}</Text>
          <Text>Coordinates: [{color.coords.join(', ')}]</Text>
          <Text>Alpha: {color.alpha ?? 1}</Text>
          {error && (
            <Text color="red.500">Error: {error}</Text>
          )}
        </Box>
      </VStack>
    );
  },
  args: {
    ...baseProps,
  }
};

// Performance test story
export const PerformanceTest: Story = {
  render: (args) => {
    const [renderTimes, setRenderTimes] = useState<number[]>([]);
    const [color, setColor] = useState(args.color);
    
    const handleChange = (newColor: Color) => {
      const startTime = performance.now();
      setColor(newColor);
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      setRenderTimes(prev => [...prev.slice(-9), renderTime]); // Keep last 10 times
    };
    
    const averageRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
      : 0;
    
    return (
      <VStack spacing={4} align="stretch">
        <ColorCanvas
          {...args}
          color={color}
          onChange={handleChange}
        />
        
        {/* Performance information */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Performance Info:</Text>
          <Text>Average Render Time: {averageRenderTime.toFixed(2)}ms</Text>
          <Text>Last 10 Render Times: {renderTimes.map(t => t.toFixed(2)).join(', ')}</Text>
          <Text color={averageRenderTime > 16 ? 'red.500' : 'green.500'}>
            Status: {averageRenderTime > 16 ? '⚠️ Above 16ms target' : '✅ Within 16ms target'}
          </Text>
        </Box>
      </VStack>
    );
  },
  args: {
    ...baseProps,
  }
};

// Integration story showing multiple canvases
export const Integration: Story = {
  render: () => {
    const [selectedColor, setSelectedColor] = useState(sampleColors.red);
    
    return (
      <VStack spacing={6} align="stretch">
        <Text fontWeight="bold" fontSize="lg">Color Canvas Integration Test</Text>
        
        <HStack spacing={4} wrap="wrap" justify="center">
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">sRGB Cartesian</Text>
            <ColorCanvas
              size={150}
              color={selectedColor}
              colorSpace="sRGB"
              model="cartesian"
              onChange={setSelectedColor}
              data-testid="canvas-srgb-cartesian"
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">sRGB Polar</Text>
            <ColorCanvas
              size={150}
              color={selectedColor}
              colorSpace="sRGB"
              model="polar"
              onChange={setSelectedColor}
              data-testid="canvas-srgb-polar"
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">Display P3</Text>
            <ColorCanvas
              size={150}
              color={selectedColor}
              colorSpace="Display P3"
              onChange={setSelectedColor}
              data-testid="canvas-p3"
            />
          </VStack>
          
          <VStack spacing={2}>
            <Text fontSize="sm" fontWeight="medium">OKLCH Polar</Text>
            <ColorCanvas
              size={150}
              color={selectedColor}
              colorSpace="OKlch"
              model="polar"
              onChange={setSelectedColor}
              data-testid="canvas-oklch-polar"
            />
          </VStack>
        </HStack>
        
        {/* Debug information */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Integration Debug:</Text>
          <Text>Selected Color: {selectedColor.toString()}</Text>
          <Text>All canvases should update when you interact with any of them</Text>
        </Box>
      </VStack>
    );
  }
}; 