import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChakraProvider } from '@chakra-ui/react';
import Color from 'colorjs.io';
import { ColorLoupe } from './ColorLoupe';

const meta: Meta<typeof ColorLoupe> = {
  title: 'Components/ColorPicker/Atomic/ColorLoupe',
  component: ColorLoupe,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A teardrop shaped component that displays the currently selected color. Uses an SVG path for clean borders and shadows without clipping issues. Used in conjunction with a ColorHandle component to show the color at a specific coordinate location on the ColorCanvas.'
      }
    }
  },
  decorators: [
    (Story) => (
      <ChakraProvider>
        <div style={{ 
          position: 'relative', 
          width: '200px', 
          height: '200px', 
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Story />
        </div>
      </ChakraProvider>
    ),
  ],
  argTypes: {
    color: {
      control: { type: 'object' },
      description: 'The color to display in the loupe (Colorjs.io object)'
    },
    isVisible: {
      control: { type: 'boolean' },
      description: 'Whether the loupe is visible (defaults to false)'
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes'
    },
    style: {
      control: { type: 'object' },
      description: 'Custom CSS styles for positioning and other styling'
    },
    'data-testid': {
      control: { type: 'text' },
      description: 'Test ID for testing'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ColorLoupe>;

// Default story with isVisible set to true as requested
export const Default: Story = {
  args: {
    color: new Color('srgb', [1, 0, 0]), // Red
    isVisible: true,
    'data-testid': 'color-loupe'
  }
};

// Story showing different colors
export const DifferentColors: Story = {
  render: () => (
    <div style={{ 
      position: 'relative', 
      width: '400px', 
      height: '200px', 
      backgroundColor: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around'
    }}>
      <ColorLoupe
        color={new Color('srgb', [1, 0, 0])} // Red
        isVisible={true}
        data-testid="red-loupe"
      />
      <ColorLoupe
        color={new Color('srgb', [0, 1, 0])} // Green
        isVisible={true}
        data-testid="green-loupe"
      />
      <ColorLoupe
        color={new Color('srgb', [0, 0, 1])} // Blue
        isVisible={true}
        data-testid="blue-loupe"
      />
      <ColorLoupe
        color={new Color('srgb', [1, 1, 0])} // Yellow
        isVisible={true}
        data-testid="yellow-loupe"
      />
    </div>
  )
};

// Story showing different color spaces
export const ColorSpaces: Story = {
  render: () => (
    <div style={{ 
      position: 'relative', 
      width: '400px', 
      height: '200px', 
      backgroundColor: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around'
    }}>
      <ColorLoupe
        color={new Color('srgb', [1, 0, 0])} // sRGB Red
        isVisible={true}
        data-testid="srgb-loupe"
      />
      <ColorLoupe
        color={new Color('p3', [1, 0, 0])} // P3 Red
        isVisible={true}
        data-testid="p3-loupe"
      />
      <ColorLoupe
        color={new Color('hsl', [0, 100, 50])} // HSL Red
        isVisible={true}
        data-testid="hsl-loupe"
      />
      <ColorLoupe
        color={new Color('oklch', [0.5, 0.2, 0])} // OKLCH Red-ish
        isVisible={true}
        data-testid="oklch-loupe"
      />
    </div>
  )
};

// Story showing visibility states with animations
export const VisibilityStates: Story = {
  render: () => (
    <div style={{ 
      position: 'relative', 
      width: '400px', 
      height: '200px', 
      backgroundColor: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around'
    }}>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{
          width: '12px',
          height: '12px',
          backgroundColor: '#333',
          borderRadius: '50%',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }} />
        <ColorLoupe
          color={new Color('srgb', [1, 0, 0])}
          isVisible={true}
          data-testid="visible-loupe"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Visible (opacity: 1)</div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{
          width: '12px',
          height: '12px',
          backgroundColor: '#333',
          borderRadius: '50%',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }} />
        <ColorLoupe
          color={new Color('srgb', [0, 1, 0])}
          isVisible={false}
          data-testid="hidden-loupe"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Hidden (opacity: 0)</div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <div style={{
          width: '12px',
          height: '12px',
          backgroundColor: '#333',
          borderRadius: '50%',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }} />
        <ColorLoupe
          color={new Color('srgb', [0, 0, 1])}
          data-testid="default-loupe"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Default (opacity: 0)</div>
      </div>
    </div>
  )
};

// Story showing positioning
export const Positioning: Story = {
  render: () => (
    <div style={{ 
      position: 'relative', 
      width: '300px', 
      height: '300px', 
      backgroundColor: '#f0f0f0',
      border: '1px solid #ccc'
    }}>
      <ColorLoupe
        color={new Color('srgb', [1, 0, 0])}
        isVisible={true}
        style={{ top: '50px', left: '50px' }}
        data-testid="top-left-loupe"
      />
      <ColorLoupe
        color={new Color('srgb', [0, 1, 0])}
        isVisible={true}
        style={{ top: '50px', right: '50px' }}
        data-testid="top-right-loupe"
      />
      <ColorLoupe
        color={new Color('srgb', [0, 0, 1])}
        isVisible={true}
        style={{ bottom: '50px', left: '50px' }}
        data-testid="bottom-left-loupe"
      />
      <ColorLoupe
        color={new Color('srgb', [1, 1, 0])}
        isVisible={true}
        style={{ bottom: '50px', right: '50px' }}
        data-testid="bottom-right-loupe"
      />
      <ColorLoupe
        color={new Color('srgb', [1, 0, 1])}
        isVisible={true}
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        data-testid="center-loupe"
      />
    </div>
  )
};

// Story showing proper positioning relative to color handle
export const WithColorHandle: Story = {
  render: () => {
    const [isVisible, setIsVisible] = React.useState(true);
    
    return (
      <div style={{ 
        position: 'relative', 
        width: '300px', 
        height: '200px', 
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* Simulated color handle */}
        <div style={{
          width: '12px',
          height: '12px',
          backgroundColor: '#333',
          borderRadius: '50%',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          border: '2px solid white',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          cursor: 'pointer'
        }} />
        
        {/* ColorLoupe positioned relative to handle */}
        <ColorLoupe
          color={new Color('srgb', [1, 0, 0])}
          isVisible={isVisible}
          data-testid="handle-loupe"
        />
        
        {/* Toggle button */}
        <button
          onClick={() => setIsVisible(!isVisible)}
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isVisible ? 'Hide' : 'Show'} Loupe
        </button>
      </div>
    );
  }
};

// Story showing SVG implementation details
export const SVGImplementation: Story = {
  render: () => (
    <div style={{ 
      position: 'relative', 
      width: '400px', 
      height: '200px', 
      backgroundColor: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around'
    }}>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorLoupe
          color={new Color('srgb', [1, 0, 0])}
          isVisible={true}
          data-testid="svg-loupe"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>SVG Path</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          38x48px viewBox
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorLoupe
          color={new Color('srgb', [0, 1, 0])}
          isVisible={true}
          data-testid="stroke-loupe"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>White Stroke</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          2px border
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorLoupe
          color={new Color('srgb', [0, 0, 1])}
          isVisible={true}
          data-testid="shadow-loupe"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Drop Shadow</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          CSS filter
        </div>
      </div>
    </div>
  )
};

// Story showing custom styling for positioning
export const CustomStyling: Story = {
  render: () => (
    <div style={{ 
      position: 'relative', 
      width: '400px', 
      height: '200px', 
      backgroundColor: '#f0f0f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around'
    }}>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorLoupe
          color={new Color('srgb', [1, 0, 0])}
          isVisible={true}
          style={{ zIndex: 1000, pointerEvents: 'none' }}
          data-testid="custom-styled-loupe"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Custom Z-Index</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          zIndex: 1000
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorLoupe
          color={new Color('srgb', [0, 1, 0])}
          isVisible={true}
          style={{ 
            top: '-10px', 
            left: '10px',
            transform: 'scale(1.2)',
            zIndex: 999
          }}
          data-testid="positioned-loupe"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Custom Position</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          top: -10px, left: 10px
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorLoupe
          color={new Color('srgb', [0, 0, 1])}
          isVisible={true}
          style={{ 
            transform: 'rotate(15deg)',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))'
          }}
          data-testid="transformed-loupe"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Custom Transform</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          rotate(15deg)
        </div>
      </div>
    </div>
  )
};

// Debug story for interactive testing
export const Debug: Story = {
  render: (args) => {
    const color = args.color || new Color('srgb', [1, 0, 0]);
    
    return (
      <div style={{ 
        position: 'relative', 
        width: '300px', 
        height: '200px', 
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <ColorLoupe
          {...args}
          color={color}
          data-testid="debug-loupe"
        />
        
        {/* Debug information */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <div><strong>Debug Info:</strong></div>
          <div>Color: {color.toString({ format: 'hex' })}</div>
          <div>Color Space: {color.space.id}</div>
          <div>Coordinates: [{color.coords.join(', ')}]</div>
          <div>Visible: {args.isVisible ? 'Yes' : 'No'}</div>
          <div>Transform: {args.isVisible ? 'translate(0, 0)' : 'translate(0, 16px)'}</div>
          <div>Opacity: {args.isVisible ? '1' : '0'}</div>
          <div>Dimensions: 38x48px</div>
          <div>SVG ViewBox: 0 0 38 48</div>
          <div>Style: {args.style ? JSON.stringify(args.style, null, 2) : 'None'}</div>
        </div>
      </div>
    );
  },
  args: {
    isVisible: true,
    'data-testid': 'debug-loupe'
  }
}; 