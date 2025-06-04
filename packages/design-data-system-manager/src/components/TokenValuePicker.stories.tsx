import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TokenValuePicker } from './TokenValuePicker';
import type { Token, ResolvedValueType } from '@token-model/data-model';
import { ChakraProvider } from '@chakra-ui/react';

const meta: Meta<typeof TokenValuePicker> = {
  title: 'Components/TokenValuePicker',
  component: TokenValuePicker,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <ChakraProvider>
        <Story />
      </ChakraProvider>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TokenValuePicker>;

// Sample resolved value types
const resolvedValueTypes: ResolvedValueType[] = [
  {
    id: 'color',
    displayName: 'Color',
    type: 'COLOR',
    description: 'A color value'
  },
  {
    id: 'spacing',
    displayName: 'Spacing',
    type: 'SPACING',
    description: 'A spacing value'
  },
  {
    id: 'font-family',
    displayName: 'Font Family',
    type: 'FONT_FAMILY',
    description: 'A font family value'
  },
  {
    id: 'font-weight',
    displayName: 'Font Weight',
    type: 'FONT_WEIGHT',
    description: 'A font weight value'
  },
  {
    id: 'font-size',
    displayName: 'Font Size',
    type: 'FONT_SIZE',
    description: 'A font size value'
  },
  {
    id: 'line-height',
    displayName: 'Line Height',
    type: 'LINE_HEIGHT',
    description: 'A line height value'
  },
  {
    id: 'letter-spacing',
    displayName: 'Letter Spacing',
    type: 'LETTER_SPACING',
    description: 'A letter spacing value'
  },
  {
    id: 'duration',
    displayName: 'Duration',
    type: 'DURATION',
    description: 'A duration value'
  },
  {
    id: 'cubic-bezier',
    displayName: 'Cubic Bezier',
    type: 'CUBIC_BEZIER',
    description: 'A cubic bezier value'
  },
  {
    id: 'blur',
    displayName: 'Blur',
    type: 'BLUR',
    description: 'A blur value'
  },
  {
    id: 'spread',
    displayName: 'Spread',
    type: 'SPREAD',
    description: 'A spread value'
  },
  {
    id: 'radius',
    displayName: 'Radius',
    type: 'RADIUS',
    description: 'A radius value'
  }
];

// Sample tokens
const tokens: Token[] = [
  {
    id: 'token-1',
    displayName: 'Primary Color',
    description: 'The primary color of the application',
    resolvedValueTypeId: 'color',
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { value: '#000000' }
      },
      {
        modeIds: ['dark'],
        value: { value: '#FFFFFF' }
      }
    ],
    taxonomies: [],
    status: 'stable',
    private: false,
    themeable: true,
    tokenCollectionId: 'default',
    propertyTypes: [],
    codeSyntax: []
  },
  {
    id: 'token-2',
    displayName: 'Secondary Color',
    description: 'The secondary color of the application',
    resolvedValueTypeId: 'color',
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { value: '#666666' }
      },
      {
        modeIds: ['dark'],
        value: { value: '#999999' }
      }
    ],
    taxonomies: [],
    status: 'stable',
    private: false,
    themeable: true,
    tokenCollectionId: 'default',
    propertyTypes: [],
    codeSyntax: []
  }
];

// Base props for all stories
const baseProps = {
  tokens,
  resolvedValueTypes,
  onChange: (value: any) => console.log('Value changed:', value)
};

// Color story
export const Color: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'color',
    value: { value: '#FF0000' }
  }
};

// Spacing story
export const Spacing: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'spacing',
    value: { value: 16 }
  }
};

// Font Family story
export const FontFamily: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'font-family',
    value: { value: 'Inter' }
  }
};

// Font Weight story
export const FontWeight: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'font-weight',
    value: { value: 400 }
  }
};

// Font Size story
export const FontSize: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'font-size',
    value: { value: 16 }
  }
};

// Line Height story
export const LineHeight: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'line-height',
    value: { value: 1.5 }
  }
};

// Letter Spacing story
export const LetterSpacing: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'letter-spacing',
    value: { value: 0 }
  }
};

// Duration story
export const Duration: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'duration',
    value: { value: 300 }
  }
};

// Cubic Bezier story
export const CubicBezier: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'cubic-bezier',
    value: { value: 'cubic-bezier(0.4, 0, 0.2, 1)' }
  }
};

// Blur story
export const Blur: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'blur',
    value: { value: 10 }
  }
};

// Spread story
export const Spread: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'spread',
    value: { value: 0 }
  }
};

// Radius story
export const Radius: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'radius',
    value: { value: 4 }
  }
};

// Alias story
export const Alias: Story = {
  args: {
    ...baseProps,
    resolvedValueTypeId: 'color',
    value: { tokenId: 'token-1' }
  }
};

// String value story
export const StringValue: Story = {
  args: {
    ...baseProps,
    value: 'custom-value'
  }
};

// Empty value story
export const EmptyValue: Story = {
  args: {
    ...baseProps,
    value: ''
  }
};

// With excluded token story
export const WithExcludedToken: Story = {
  args: {
    ...baseProps,
    value: { value: '#007AFF' },
    excludeTokenId: 'color-primary'
  }
};

// With constraints story
export const WithConstraints: Story = {
  args: {
    ...baseProps,
    value: { value: '#007AFF' },
    constraints: [
      {
        type: 'contrast',
        rule: {
          minimum: 4.5,
          comparator: {
            resolvedValueTypeId: 'color',
            value: '#000000',
            method: 'WCAG21'
          }
        }
      }
    ]
  }
}; 