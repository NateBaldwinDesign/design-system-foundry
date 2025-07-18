import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChakraProvider } from '@chakra-ui/react';
import Color from 'colorjs.io';
import { ColorPickerContents } from './ColorPickerContents';

const meta = {
  title: 'Components/ColorPicker/Composite/ColorPickerContents',
  component: ColorPickerContents,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A composite component that combines color space selection, gamut selection, model selection, ColorArea, and ColorSlider components. This component manages the state for color, colorSpace, gamut, and model, and provides a complete color picking interface.'
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
      control: 'text',
      description: 'Initial color value as a string (hex, rgb, etc.)'
    },
    onChange: {
      action: 'color changed',
      description: 'Callback when color changes'
    }
  }
} satisfies Meta<typeof ColorPickerContents>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default story
export const Default: Story = {
  render: (args) => {
    return <ColorPickerContents {...args} />;
  },
  args: {
    color: '#FF0000'
  }
};

// Interactive story with state management
export const Interactive: Story = {
  render: (args) => {
    const [color, setColor] = React.useState(args.color);
    
    const handleChange = (newColor: Color) => {
      setColor(newColor.toString({ format: 'hex' }));
      args.onChange?.(newColor);
    };
    
    return (
      <div>
        <ColorPickerContents 
          {...args} 
          color={color} 
          onChange={handleChange}
        />
      </div>
    );
  },
  args: {
    color: '#00FF00'
  }
};

// sRGB Cartesian story
export const SRGBCartesian: Story = {
  render: (args) => {
    return <ColorPickerContents {...args} />;
  },
  args: {
    color: '#FF6B35'
  }
};

// sRGB Polar (HSL) story
export const SRGBPolar: Story = {
  render: (args) => {
    return <ColorPickerContents {...args} />;
  },
  args: {
    color: '#FF6B35'
  }
};

// Display P3 story
export const DisplayP3: Story = {
  render: (args) => {
    return <ColorPickerContents {...args} />;
  },
  args: {
    color: '#FF6B35'
  }
};

// OKLCH Polar story
export const OKLCHPolar: Story = {
  render: (args) => {
    return <ColorPickerContents {...args} />;
  },
  args: {
    color: '#FF6B35'
  }
};

// OKLCH Cartesian (OKLab) story
export const OKLCHCartesian: Story = {
  render: (args) => {
    return <ColorPickerContents {...args} />;
  },
  args: {
    color: '#FF6B35'
  }
};

// Different color examples
export const ColorExamples: Story = {
  render: (args) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3>Red</h3>
          <ColorPickerContents {...args} color="#FF0000" />
        </div>
        <div>
          <h3>Green</h3>
          <ColorPickerContents {...args} color="#00FF00" />
        </div>
        <div>
          <h3>Blue</h3>
          <ColorPickerContents {...args} color="#0000FF" />
        </div>
        <div>
          <h3>Yellow</h3>
          <ColorPickerContents {...args} color="#FFFF00" />
        </div>
        <div>
          <h3>Cyan</h3>
          <ColorPickerContents {...args} color="#00FFFF" />
        </div>
        <div>
          <h3>Magenta</h3>
          <ColorPickerContents {...args} color="#FF00FF" />
        </div>
      </div>
    );
  },
  args: {
    color: '#FF0000'
  }
};

// Debug story with state logging
export const Debug: Story = {
  render: (args) => {
    const [color, setColor] = React.useState(args.color);
    const [lastChange, setLastChange] = React.useState<string>('');
    
    const handleChange = (newColor: Color) => {
      setColor(newColor.toString({ format: 'hex' }));
      setLastChange(new Date().toLocaleTimeString());
      args.onChange?.(newColor);
    };
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <ColorPickerContents 
          {...args} 
          color={color} 
          onChange={handleChange}
        />
        
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}>
          <h4>Debug Info:</h4>
          <p>Current Color: {color}</p>
          <p>Last Change: {lastChange || 'None'}</p>
          <p>Color Object: {color ? new Color(color).toString() : 'N/A'}</p>
        </div>
      </div>
    );
  },
  args: {
    color: '#FF6B35'
  }
};

// Integration story showing all color spaces
export const AllColorSpaces: Story = {
  render: (args) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3>sRGB Cartesian (Default)</h3>
          <ColorPickerContents {...args} color="#FF6B35" />
        </div>
        
        <div>
          <h3>sRGB Polar (HSL)</h3>
          <ColorPickerContents {...args} color="#FF6B35" />
        </div>
        
        <div>
          <h3>Display P3</h3>
          <ColorPickerContents {...args} color="#FF6B35" />
        </div>
        
        <div>
          <h3>OKLCH Polar</h3>
          <ColorPickerContents {...args} color="#FF6B35" />
        </div>
        
        <div>
          <h3>OKLCH Cartesian (OKLab)</h3>
          <ColorPickerContents {...args} color="#FF6B35" />
        </div>
      </div>
    );
  },
  args: {
    color: '#FF6B35'
  }
};

// Performance test story
export const PerformanceTest: Story = {
  render: (args) => {
    const [renderCount, setRenderCount] = React.useState(0);
    const [color, setColor] = React.useState(args.color);
    
    React.useEffect(() => {
      setRenderCount(prev => prev + 1);
    });
    
    const handleChange = (newColor: Color) => {
      setColor(newColor.toString({ format: 'hex' }));
      args.onChange?.(newColor);
    };
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ 
          padding: '8px', 
          backgroundColor: '#e8f5e8', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          Render Count: {renderCount}
        </div>
        
        <ColorPickerContents 
          {...args} 
          color={color} 
          onChange={handleChange}
        />
      </div>
    );
  },
  args: {
    color: '#FF6B35'
  }
}; 