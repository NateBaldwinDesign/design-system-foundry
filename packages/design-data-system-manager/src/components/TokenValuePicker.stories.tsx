import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { TokenValuePicker } from './TokenValuePicker';
import type { Token, TokenValue } from '@token-model/data-model';
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
};

export default meta;
type Story = StoryObj<typeof TokenValuePicker>;

// Sample tokens for reference
const sampleTokens: Token[] = [
  {
    id: 'color-primary',
    displayName: 'Primary Color',
    description: 'The primary brand color',
    resolvedValueTypeId: 'color',
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { type: 'COLOR', value: '#007AFF' }
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
    id: 'spacing-base',
    displayName: 'Base Spacing',
    description: 'The base spacing unit',
    resolvedValueTypeId: 'spacing',
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { type: 'SPACING', value: 8 }
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
    id: 'font-primary',
    displayName: 'Primary Font',
    description: 'The primary font family',
    resolvedValueTypeId: 'font-family',
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { type: 'FONT_FAMILY', value: 'Inter' }
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

// Base story with common props
const baseProps = {
  tokens: sampleTokens,
  onChange: (value: TokenValue) => console.log('Value changed:', value)
};

// Color value story
export const ColorValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'COLOR', value: '#007AFF' }
  }
};

// Dimension value story
export const DimensionValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'DIMENSION', value: 16 }
  }
};

// Spacing value story
export const SpacingValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'SPACING', value: 16 }
  }
};

// Font family value story
export const FontFamilyValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'FONT_FAMILY', value: 'Inter' }
  }
};

// Font weight value story
export const FontWeightValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'FONT_WEIGHT', value: 600 }
  }
};

// Font size value story
export const FontSizeValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'FONT_SIZE', value: 16 }
  }
};

// Line height value story
export const LineHeightValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'LINE_HEIGHT', value: 1.5 }
  }
};

// Letter spacing value story
export const LetterSpacingValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'LETTER_SPACING', value: 0.5 }
  }
};

// Duration value story
export const DurationValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'DURATION', value: 300 }
  }
};

// Cubic bezier value story
export const CubicBezierValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'CUBIC_BEZIER', value: '0.4, 0.0, 0.2, 1' }
  }
};

// Blur value story
export const BlurValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'BLUR', value: 4 }
  }
};

// Spread value story
export const SpreadValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'SPREAD', value: 2 }
  }
};

// Radius value story
export const RadiusValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'RADIUS', value: 8 }
  }
};

// Alias value story
export const AliasValue: Story = {
  args: {
    ...baseProps,
    value: { type: 'ALIAS', tokenId: 'color-primary' }
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
    value: { type: 'COLOR', value: '#007AFF' },
    excludeTokenId: 'color-primary'
  }
};

// With constraints story
export const WithConstraints: Story = {
  args: {
    ...baseProps,
    value: { type: 'COLOR', value: '#007AFF' },
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