import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChakraProvider } from '@chakra-ui/react';
import Color from 'colorjs.io';
import { ColorHandle } from './ColorHandle';

const meta: Meta<typeof ColorHandle> = {
  title: 'Components/ColorPicker/Atomic/ColorHandle',
  component: ColorHandle,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A circular handle component that displays the currently selected color with an integrated ColorLoupe positioned above it. The handle uses relative positioning while the loupe uses absolute positioning, ensuring the loupe is always positioned correctly relative to the handle. Only the ColorHandle requires X, Y coordinates for placement.'
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
      description: 'The color to display in the handle and loupe (Colorjs.io object)'
    },
    isLoupeVisible: {
      control: { type: 'boolean' },
      description: 'Whether the loupe is visible (defaults to false)'
    },
    autoShowLoupe: {
      control: { type: 'boolean' },
      description: 'Whether to automatically show loupe on focus/active states (defaults to true)'
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
type Story = StoryObj<typeof ColorHandle>;

// Default story with loupe visible
export const Default: Story = {
  args: {
    color: new Color('srgb', [1, 0, 0]), // Red
    isLoupeVisible: true,
    'data-testid': 'color-handle'
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
      <ColorHandle
        color={new Color('srgb', [1, 0, 0])} // Red
        isLoupeVisible={true}
        data-testid="red-handle"
      />
      <ColorHandle
        color={new Color('srgb', [0, 1, 0])} // Green
        isLoupeVisible={true}
        data-testid="green-handle"
      />
      <ColorHandle
        color={new Color('srgb', [0, 0, 1])} // Blue
        isLoupeVisible={true}
        data-testid="blue-handle"
      />
      <ColorHandle
        color={new Color('srgb', [1, 1, 0])} // Yellow
        isLoupeVisible={true}
        data-testid="yellow-handle"
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
      <ColorHandle
        color={new Color('srgb', [1, 0, 0])} // sRGB Red
        isLoupeVisible={true}
        data-testid="srgb-handle"
      />
      <ColorHandle
        color={new Color('p3', [1, 0, 0])} // P3 Red
        isLoupeVisible={true}
        data-testid="p3-handle"
      />
      <ColorHandle
        color={new Color('hsl', [0, 100, 50])} // HSL Red
        isLoupeVisible={true}
        data-testid="hsl-handle"
      />
      <ColorHandle
        color={new Color('oklch', [0.5, 0.2, 0])} // OKLCH Red-ish
        isLoupeVisible={true}
        data-testid="oklch-handle"
      />
    </div>
  )
};

// Story showing loupe visibility states
export const LoupeVisibilityStates: Story = {
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
        <ColorHandle
          color={new Color('srgb', [1, 0, 0])}
          isLoupeVisible={true}
          data-testid="visible-loupe-handle"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Loupe Visible</div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 1, 0])}
          isLoupeVisible={false}
          data-testid="hidden-loupe-handle"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Loupe Hidden</div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 0, 1])}
          data-testid="default-loupe-handle"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Default (Hidden)</div>
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
      <ColorHandle
        color={new Color('srgb', [1, 0, 0])}
        isLoupeVisible={true}
        style={{ position: 'absolute', top: '50px', left: '50px' }}
        data-testid="top-left-handle"
      />
      <ColorHandle
        color={new Color('srgb', [0, 1, 0])}
        isLoupeVisible={true}
        style={{ position: 'absolute', top: '50px', right: '50px' }}
        data-testid="top-right-handle"
      />
      <ColorHandle
        color={new Color('srgb', [0, 0, 1])}
        isLoupeVisible={true}
        style={{ position: 'absolute', bottom: '50px', left: '50px' }}
        data-testid="bottom-left-handle"
      />
      <ColorHandle
        color={new Color('srgb', [1, 1, 0])}
        isLoupeVisible={true}
        style={{ position: 'absolute', bottom: '50px', right: '50px' }}
        data-testid="bottom-right-handle"
      />
      <ColorHandle
        color={new Color('srgb', [1, 0, 1])}
        isLoupeVisible={true}
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        data-testid="center-handle"
      />
    </div>
  )
};

// Story showing integration with ColorCanvas simulation
export const WithColorCanvas: Story = {
  render: () => {
    const [isLoupeVisible, setIsLoupeVisible] = React.useState(true);
    const [handlePosition, setHandlePosition] = React.useState({ x: 100, y: 100 });
    
    const handleMouseMove = (event: React.MouseEvent) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setHandlePosition({ x, y });
    };
    
    return (
      <div style={{ 
        position: 'relative', 
        width: '300px', 
        height: '200px', 
        backgroundColor: '#f0f0f0',
        border: '1px solid #ccc',
        cursor: 'crosshair'
      }}
      onMouseMove={handleMouseMove}
      >
        {/* Simulated color canvas background */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          right: '20px',
          bottom: '20px',
          background: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff, #ffff00)',
          borderRadius: '8px'
        }} />
        
        {/* ColorHandle positioned on the canvas */}
        <ColorHandle
          color={new Color('srgb', [1, 0, 0])}
          isLoupeVisible={isLoupeVisible}
          style={{ 
            position: 'absolute', 
            top: `${handlePosition.y}px`, 
            left: `${handlePosition.x}px`,
            transform: 'translate(-50%, -50%)'
          }}
          data-testid="canvas-handle"
        />
        
        {/* Toggle button */}
        <button
          onClick={() => setIsLoupeVisible(!isLoupeVisible)}
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 16px',
            backgroundColor: '#007AFF',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          {isLoupeVisible ? 'Hide' : 'Show'} Loupe
        </button>
      </div>
    );
  }
};

// Story showing handle styling details
export const HandleStyling: Story = {
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
        <ColorHandle
          color={new Color('srgb', [1, 0, 0])}
          isLoupeVisible={false}
          data-testid="styling-handle"
        />
        <div style={{ marginTop: '30px', fontSize: '12px' }}>16x16px Circle</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          White border + shadow
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 1, 0])}
          isLoupeVisible={true}
          data-testid="loupe-handle"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>With Loupe</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Positioned above
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 0, 1])}
          isLoupeVisible={false}
          style={{ transform: 'scale(2)' }}
          data-testid="scaled-handle"
        />
        <div style={{ marginTop: '40px', fontSize: '12px' }}>Scaled 2x</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Maintains proportions
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
        <ColorHandle
          {...args}
          color={color}
          data-testid="debug-handle"
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
          <div>Loupe Visible: {args.isLoupeVisible ? 'Yes' : 'No'}</div>
          <div>Auto Show Loupe: {args.autoShowLoupe ? 'Yes' : 'No'}</div>
          <div>Handle Dimensions: 16x16px</div>
          <div>Handle Position: relative</div>
          <div>Loupe Position: absolute</div>
          <div>Focusable: Yes (tabIndex: 0)</div>
          <div>Test IDs: {args['data-testid']}-handle, {args['data-testid']}-loupe</div>
        </div>
      </div>
    );
  },
  args: {
    isLoupeVisible: true,
    'data-testid': 'debug-handle'
  }
}; 

// Story showing auto-show loupe functionality
export const AutoShowLoupe: Story = {
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
        <ColorHandle
          color={new Color('srgb', [1, 0, 0])}
          autoShowLoupe={true}
          data-testid="auto-show-enabled"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Auto-Show Enabled</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Focus or click to show loupe (hides on release)
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 1, 0])}
          autoShowLoupe={false}
          data-testid="auto-show-disabled"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Auto-Show Disabled</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Loupe won&apos;t auto-show
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 0, 1])}
          isLoupeVisible={true}
          autoShowLoupe={true}
          data-testid="explicit-visible"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Explicitly Visible</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Always shows loupe
        </div>
      </div>
    </div>
  )
};

// Story demonstrating focus states
export const FocusStates: Story = {
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
        <ColorHandle
          color={new Color('srgb', [1, 0, 0])}
          autoShowLoupe={true}
          data-testid="focus-handle-1"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Tab to Focus</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Blue outline + loupe
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 1, 0])}
          autoShowLoupe={true}
          data-testid="focus-handle-2"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Keyboard Navigation</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          TabIndex: 0
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 0, 1])}
          autoShowLoupe={true}
          data-testid="focus-handle-3"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Focus Styles</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          2px blue outline
        </div>
      </div>
    </div>
  )
};

// Story demonstrating active states
export const ActiveStates: Story = {
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
        <ColorHandle
          color={new Color('srgb', [1, 0, 0])}
          autoShowLoupe={true}
          data-testid="active-handle-1"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Click & Hold</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Scale down + loupe (hides on release)
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 1, 0])}
          autoShowLoupe={true}
          data-testid="active-handle-2"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Drag Interaction</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Active during drag (hides on release)
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 0, 1])}
          autoShowLoupe={true}
          data-testid="active-handle-3"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Active Styles</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Scale: 0.95
        </div>
      </div>
    </div>
  )
}; 

// Story demonstrating enhanced interaction pattern
export const InteractionPattern: Story = {
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
        <ColorHandle
          color={new Color('srgb', [1, 0, 0])}
          autoShowLoupe={true}
          data-testid="interaction-handle-1"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Click & Release</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Loupe shows on click, hides on release
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 1, 0])}
          autoShowLoupe={true}
          data-testid="interaction-handle-2"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Tab to Focus</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Loupe stays visible while focused
        </div>
      </div>
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <ColorHandle
          color={new Color('srgb', [0, 0, 1])}
          autoShowLoupe={true}
          data-testid="interaction-handle-3"
        />
        <div style={{ marginTop: '60px', fontSize: '12px' }}>Drag Interaction</div>
        <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
          Loupe shows during drag, hides on release
        </div>
      </div>
    </div>
  )
}; 