import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { ValueByModeTable } from './ValueByModeTable';
import type { Mode, TokenValue, ResolvedValueType, Dimension } from '@token-model/data-model';
import { Box, Text } from '@chakra-ui/react';

const meta: Meta<typeof ValueByModeTable> = {
  title: 'Components/ValueByModeTable',
  component: ValueByModeTable,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ValueByModeTable>;

// Sample data
const sampleModes: Mode[] = [
  { id: 'light', name: 'Light', dimensionId: 'theme' },
  { id: 'dark', name: 'Dark', dimensionId: 'theme' },
  { id: 'mobile', name: 'Mobile', dimensionId: 'scale' },
  { id: 'desktop', name: 'Desktop', dimensionId: 'scale' }
];

const sampleDimensions: Dimension[] = [
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
    id: 'scale',
    displayName: 'Scale',
    required: false,
    modes: [
      { id: 'mobile', name: 'Mobile', dimensionId: 'scale' },
      { id: 'desktop', name: 'Desktop', dimensionId: 'scale' }
    ],
    defaultMode: 'mobile'
  }
];

const sampleResolvedValueTypes: ResolvedValueType[] = [
  {
    id: 'color',
    displayName: 'Color',
    type: 'COLOR',
    description: 'A color value'
  }
];

// Mock getValueEditor function that matches the expected signature
const mockGetValueEditor = (
  value: TokenValue | string,
  modeIds: string[],
  isOverride?: boolean
): React.ReactNode => {
  return (
    <Box p={2} border="1px solid" borderColor="gray.200">
      <Text>Value: {typeof value === 'string' ? value : JSON.stringify(value)}</Text>
      <Text>Mode IDs: {modeIds.join(', ')}</Text>
      {isOverride && <Text color="orange.500">Override</Text>}
    </Box>
  );
};

// Base story with simple color values
export const Default: Story = {
  args: {
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
    modes: sampleModes,
    dimensions: sampleDimensions,
    resolvedValueTypes: sampleResolvedValueTypes,
    getValueEditor: mockGetValueEditor,
    onDeleteValue: () => {},
    resolvedValueTypeId: 'color',
    onAddValue: () => {}
  }
};

// Story with 2D mode grid (theme × device)
export const TwoDimensional: Story = {
  args: {
    modes: sampleModes,
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
    dimensions: sampleDimensions,
    resolvedValueTypes: sampleResolvedValueTypes,
    getValueEditor: mockGetValueEditor,
    onDeleteValue: () => {},
    resolvedValueTypeId: 'color',
    onAddValue: () => {}
  }
};

// Story with mixed value types
export const MixedValueTypes: Story = {
  args: {
    modes: sampleModes,
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
    dimensions: sampleDimensions,
    resolvedValueTypes: sampleResolvedValueTypes,
    getValueEditor: mockGetValueEditor,
    onDeleteValue: () => {},
    resolvedValueTypeId: 'color',
    onAddValue: () => {}
  }
};

// Story with global values (no mode IDs)
export const GlobalValues: Story = {
  args: {
    modes: sampleModes,
    valuesByMode: [
      {
        modeIds: [],
        value: { value: '#000000' }
      }
    ],
    dimensions: sampleDimensions,
    resolvedValueTypes: sampleResolvedValueTypes,
    getValueEditor: mockGetValueEditor,
    onDeleteValue: () => {},
    resolvedValueTypeId: 'color',
    onAddValue: () => {}
  }
};

export const WithMultipleDimensions: Story = {
  args: {
    valuesByMode: [
      {
        modeIds: ['light', 'mobile'],
        value: { value: '#FFFFFF' }
      },
      {
        modeIds: ['light', 'desktop'],
        value: { value: '#F5F5F5' }
      },
      {
        modeIds: ['dark', 'mobile'],
        value: { value: '#000000' }
      },
      {
        modeIds: ['dark', 'desktop'],
        value: { value: '#121212' }
      }
    ],
    modes: sampleModes,
    dimensions: sampleDimensions,
    resolvedValueTypes: sampleResolvedValueTypes,
    getValueEditor: mockGetValueEditor,
    onDeleteValue: () => {},
    resolvedValueTypeId: 'color',
    onAddValue: () => {}
  }
};

export const WithPlatformOverrides: Story = {
  args: {
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { value: '#FFFFFF' },
        platformOverrides: [
          { platformId: 'ios', value: '#F8F8F8' },
          { platformId: 'android', value: '#FAFAFA' }
        ]
      },
      {
        modeIds: ['dark'],
        value: { value: '#000000' },
        platformOverrides: [
          { platformId: 'ios', value: '#121212' },
          { platformId: 'android', value: '#1A1A1A' }
        ]
      }
    ],
    modes: sampleModes,
    dimensions: sampleDimensions,
    resolvedValueTypes: sampleResolvedValueTypes,
    getValueEditor: mockGetValueEditor,
    onDeleteValue: () => {},
    resolvedValueTypeId: 'color',
    onAddValue: () => {}
  }
};

export const EmptyToken: Story = {
  args: {
    valuesByMode: [],
    modes: sampleModes,
    dimensions: sampleDimensions,
    resolvedValueTypes: sampleResolvedValueTypes,
    getValueEditor: mockGetValueEditor,
    onDeleteValue: () => {},
    resolvedValueTypeId: 'color',
    onAddValue: () => {}
  }
}; 