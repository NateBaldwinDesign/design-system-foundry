import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ValueByModeTable } from './ValueByModeTable';
import type { Mode, Dimension, TokenValue, ResolvedValueType } from '@token-model/data-model';
import { Input, Select, createListCollection } from '@chakra-ui/react';
import type { ChangeEvent } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '../theme';

const meta: Meta<typeof ValueByModeTable> = {
  title: 'Components/ValueByModeTable',
  component: ValueByModeTable,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <ChakraProvider value={system}>
        <Story />
      </ChakraProvider>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ValueByModeTable>;

const mockModes: Mode[] = [
  { id: 'light', name: 'Light', dimensionId: 'theme' },
  { id: 'dark', name: 'Dark', dimensionId: 'theme' },
  { id: 'mobile', name: 'Mobile', dimensionId: 'device' },
  { id: 'desktop', name: 'Desktop', dimensionId: 'device' },
];

const mockDimensions: Dimension[] = [
  {
    id: 'theme',
    displayName: 'Theme',
    required: true,
    modes: [
      { id: 'light', name: 'Light', dimensionId: 'theme' },
      { id: 'dark', name: 'Dark', dimensionId: 'theme' }
    ],
    defaultMode: 'light'
  },
  {
    id: 'device',
    displayName: 'Device',
    required: false,
    modes: [
      { id: 'mobile', name: 'Mobile', dimensionId: 'device' },
      { id: 'desktop', name: 'Desktop', dimensionId: 'device' }
    ],
    defaultMode: 'mobile'
  }
];

const mockResolvedValueTypes: ResolvedValueType[] = [
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
  }
];

const getValueEditor = (
  value: TokenValue | string,
  modeIds: string[],
  isOverride?: boolean,
  onChange?: (newValue: TokenValue) => void
) => {
  if (typeof value === 'string') {
    return <Input value={value} size="sm" w="100px" />;
  }

  if ('tokenId' in value) {
    return (
      <Select.Root
        value={[value.tokenId]}
        onValueChange={(details) => {
          const value = Array.isArray(details.value) ? details.value[0] : details.value;
          onChange?.({ tokenId: value });
        }}
        size="sm"
        w="120px"
        collection={createListCollection({
          items: [
            { value: 'token1', label: 'Token 1' },
            { value: 'token2', label: 'Token 2' }
          ]
        })}
      >
        <Select.HiddenSelect />
        <Select.Control>
          <Select.Trigger>
            <Select.ValueText placeholder="Select token" />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            <Select.Item item={{ value: 'token1', label: 'Token 1' }}>Token 1</Select.Item>
            <Select.Item item={{ value: 'token2', label: 'Token 2' }}>Token 2</Select.Item>
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
    );
  }

  return (
    <Input
      value={String(value.value)}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange?.({ value: e.target.value })}
      size="sm"
      w="100px"
    />
  );
};

export const Default: Story = {
  args: {
    modes: mockModes,
    dimensions: mockDimensions,
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
    getValueEditor,
    onDeleteValue: () => {},
    resolvedValueTypeId: 'color',
    resolvedValueTypes: mockResolvedValueTypes,
    onAddValue: () => {}
  }
};

export const TwoDimensional: Story = {
  args: {
    modes: mockModes,
    dimensions: mockDimensions,
    valuesByMode: [
      {
        modeIds: ['light', 'mobile'],
        value: { value: '#000000' }
      },
      {
        modeIds: ['light', 'desktop'],
        value: { value: '#111111' }
      },
      {
        modeIds: ['dark', 'mobile'],
        value: { value: '#FFFFFF' }
      },
      {
        modeIds: ['dark', 'desktop'],
        value: { value: '#EEEEEE' }
      }
    ],
    getValueEditor,
    onDeleteValue: () => {},
    resolvedValueTypeId: 'color',
    resolvedValueTypes: mockResolvedValueTypes,
    onAddValue: () => {}
  }
};

export const MixedValueTypes: Story = {
  args: {
    modes: mockModes,
    dimensions: mockDimensions,
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { value: '#000000' }
      },
      {
        modeIds: ['dark'],
        value: { value: 16 }
      },
      {
        modeIds: ['mobile'],
        value: { value: '#FF0000' }
      },
      {
        modeIds: ['desktop'],
        value: { tokenId: 'token1' }
      }
    ],
    getValueEditor,
    onDeleteValue: () => {},
    resolvedValueTypeId: 'color',
    resolvedValueTypes: mockResolvedValueTypes,
    onAddValue: () => {}
  }
};

export const GlobalValues: Story = {
  args: {
    modes: mockModes,
    dimensions: mockDimensions,
    valuesByMode: [
      {
        modeIds: [],
        value: { value: '#000000' }
      }
    ],
    getValueEditor,
    onDeleteValue: () => {},
    resolvedValueTypeId: 'color',
    resolvedValueTypes: mockResolvedValueTypes,
    onAddValue: () => {}
  }
}; 