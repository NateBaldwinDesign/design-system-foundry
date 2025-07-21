import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ChakraProvider } from '@chakra-ui/react';
import { ColorPicker } from './ColorPicker';

const meta = {
  title: 'Components/ColorPicker/ColorPicker',
  component: ColorPicker,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A parent color picker component with popover trigger, color swatch, and color picking interface.'
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
      description: 'Current color value as a string (hex, rgb, etc.)'
    },
    colorSpace: {
      control: 'select',
      options: ['sRGB', 'Display P3', 'OKlch'],
      description: 'Color space to use (defaults to OKlch)'
    },
    gamut: {
      control: 'select',
      options: ['sRGB', 'Display-P3', 'Rec2020'],
      description: 'Gamut constraint (defaults to sRGB)'
    },
    onChange: { action: 'color changed' }
  }
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [color, setColor] = React.useState(args.color);
    return (
      <ColorPicker
        {...args}
        color={color}
        onChange={(newColor) => {
          setColor(newColor.toString({ format: 'hex' }));
          args.onChange?.(newColor);
        }}
      />
    );
  },
  args: {
    color: '#FF6B35',
    colorSpace: 'OKlch',
    gamut: 'sRGB'
  }
};

export const WithInitialDisplayP3: Story = {
  render: (args) => {
    const [color, setColor] = React.useState(args.color);
    return (
      <ColorPicker
        {...args}
        color={color}
        onChange={(newColor) => {
          setColor(newColor.toString({ format: 'hex' }));
          args.onChange?.(newColor);
        }}
      />
    );
  },
  args: {
    color: '#00BFFF',
    colorSpace: 'Display P3',
    gamut: 'Display-P3'
  }
};

export const WithInitialRec2020: Story = {
  render: (args) => {
    const [color, setColor] = React.useState(args.color);
    return (
      <ColorPicker
        {...args}
        color={color}
        onChange={(newColor) => {
          setColor(newColor.toString({ format: 'hex' }));
          args.onChange?.(newColor);
        }}
      />
    );
  },
  args: {
    color: '#00FF00',
    colorSpace: 'OKlch',
    gamut: 'Rec2020'
  }
}; 