import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ValueByModeTable } from './ValueByModeTable';
import type { Mode, TokenValue, ResolvedValueType } from '@token-model/data-model';
import { Input, Select } from '@chakra-ui/react';
import type { ChangeEvent } from 'react';

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

// Mock data for the stories
const mockModes: Mode[] = [
  { id: 'light', name: 'Light', dimensionId: 'theme' },
  { id: 'dark', name: 'Dark', dimensionId: 'theme' },
  { id: 'mobile', name: 'Mobile', dimensionId: 'device' },
  { id: 'desktop', name: 'Desktop', dimensionId: 'device' },
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

// Mock value editor function
const getValueEditor = (
  value: TokenValue | string,
  modeIndex: number,
  modeIds: string[],
  isOverride?: boolean,
  onChange?: (newValue: TokenValue) => void
) => {
  if (typeof value === 'string') {
    return <Input value={value} size="sm" w="100px" />;
  }

  if ('tokenId' in value) {
    return (
      <Select
        value={value.tokenId}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange?.({ tokenId: e.target.value })}
        size="sm"
        w="120px"
      >
        <option value="token1">Token 1</option>
        <option value="token2">Token 2</option>
      </Select>
    );
  }

  // For direct values, we'll use a simple input
  return (
    <Input
      value={String(value.value)}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange?.({ value: e.target.value })}
      size="sm"
      w="100px"
    />
  );
};

// Base story with simple color values
export const Default: Story = {
  args: {
    modes: mockModes,
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
    getValueEditor
  }
};

// Story with 2D mode grid (theme × device)
export const TwoDimensional: Story = {
  args: {
    modes: mockModes,
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
    getValueEditor
  }
};

// Story with mixed value types
export const MixedValueTypes: Story = {
  args: {
    modes: mockModes,
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
    getValueEditor
  }
};

// Story with global values (no mode IDs)
export const GlobalValues: Story = {
  args: {
    modes: mockModes,
    valuesByMode: [
      {
        modeIds: [],
        value: { value: '#000000' }
      }
    ],
    getValueEditor
  }
}; 