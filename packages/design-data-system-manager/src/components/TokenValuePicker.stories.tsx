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
    description: 'The primary brand color',
    resolvedValueTypeId: 'color',
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { value: '#007AFF' }
      }
    ],
    taxonomies: [],
    status: 'stable',
    private: false,
    themeable: true,
    tokenCollectionId: 'colors',
    propertyTypes: [],
    codeSyntax: [],
    tokenTier: 'PRIMITIVE',
    generatedByAlgorithm: false
  },
  {
    id: 'token-2',
    displayName: 'Background Color',
    description: 'The background color',
    resolvedValueTypeId: 'color',
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { value: '#FFFFFF' }
      }
    ],
    taxonomies: [],
    status: 'stable',
    private: false,
    themeable: true,
    tokenCollectionId: 'colors',
    propertyTypes: [],
    codeSyntax: [],
    tokenTier: 'PRIMITIVE',
    generatedByAlgorithm: false
  }
];

// Base props for all stories
const baseProps = {
  tokens,
  resolvedValueTypes,
};

// Stateful Template for all stories
const Template = (args: React.ComponentProps<typeof TokenValuePicker>) => {
  const [value, setValue] = React.useState(args.value);
  return (
    <TokenValuePicker
      {...args}
      value={value}
      onChange={setValue}
    />
  );
};

export const Color: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'color',
    value: { value: '#FF0000' }
  }
};

export const Spacing: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'spacing',
    value: { value: 16 }
  }
};

export const FontFamily: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'font-family',
    value: { value: 'Inter' }
  }
};

export const FontWeight: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'font-weight',
    value: { value: 400 }
  }
};

export const FontSize: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'font-size',
    value: { value: 16 }
  }
};

export const LineHeight: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'line-height',
    value: { value: 1.5 }
  }
};

export const LetterSpacing: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'letter-spacing',
    value: { value: 0 }
  }
};

export const Duration: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'duration',
    value: { value: 300 }
  }
};

export const CubicBezier: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'cubic-bezier',
    value: { value: 'cubic-bezier(0.4, 0, 0.2, 1)' }
  }
};

export const Blur: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'blur',
    value: { value: 10 }
  }
};

export const Spread: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'spread',
    value: { value: 0 }
  }
};

export const Radius: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'radius',
    value: { value: 4 }
  }
};

export const Alias: Story = {
  render: Template,
  args: {
    ...baseProps,
    resolvedValueTypeId: 'color',
    value: { tokenId: 'token-1' }
  }
};

export const WithExcludedToken: Story = {
  render: Template,
  args: {
    ...baseProps,
    value: { value: '#007AFF' },
    excludeTokenId: 'color-primary'
  }
}; 