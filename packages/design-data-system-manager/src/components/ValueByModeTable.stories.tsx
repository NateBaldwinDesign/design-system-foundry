import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ValueByModeTable } from './ValueByModeTable';
import type { Mode, TokenValue } from '@token-model/data-model';
import { Input, Select, Switch } from '@chakra-ui/react';

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

// Mock value editor function
const getValueEditor = (value: TokenValue | string, modeIndex: number, isOverride?: boolean, onChange?: (newValue: TokenValue) => void) => {
  if (typeof value === 'string') {
    return <Input value={value} size="sm" w="100px" />;
  }

  switch (value.type) {
    case 'COLOR':
      return (
        <Input
          type="color"
          value={value.value}
          onChange={(e) => onChange?.({ type: 'COLOR', value: e.target.value })}
          size="sm"
          w="100px"
        />
      );
    case 'FLOAT':
      return (
        <Input
          type="number"
          value={value.value}
          onChange={(e) => onChange?.({ type: 'FLOAT', value: parseFloat(e.target.value) })}
          size="sm"
          w="120px"
        />
      );
    case 'BOOLEAN':
      return (
        <Switch
          isChecked={value.value}
          onChange={(e) => onChange?.({ type: 'BOOLEAN', value: e.target.checked })}
          size="md"
        />
      );
    case 'ALIAS':
      return (
        <Select
          value={value.tokenId}
          onChange={(e) => onChange?.({ type: 'ALIAS', tokenId: e.target.value })}
          size="sm"
          w="120px"
        >
          <option value="token1">Token 1</option>
          <option value="token2">Token 2</option>
        </Select>
      );
    default:
      return <Input value={String(value.value)} size="sm" w="100px" />;
  }
};

// Base story with simple color values
export const Default: Story = {
  args: {
    modes: mockModes,
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { type: 'COLOR', value: '#000000' },
      },
      {
        modeIds: ['dark'],
        value: { type: 'COLOR', value: '#FFFFFF' },
      },
    ],
    getValueEditor,
  },
};

// Story with 2D mode grid (theme × device)
export const TwoDimensional: Story = {
  args: {
    modes: mockModes,
    valuesByMode: [
      {
        modeIds: ['light', 'mobile'],
        value: { type: 'COLOR', value: '#000000' },
      },
      {
        modeIds: ['light', 'desktop'],
        value: { type: 'COLOR', value: '#111111' },
      },
      {
        modeIds: ['dark', 'mobile'],
        value: { type: 'COLOR', value: '#FFFFFF' },
      },
      {
        modeIds: ['dark', 'desktop'],
        value: { type: 'COLOR', value: '#EEEEEE' },
      },
    ],
    getValueEditor,
  },
};

// Story with mixed value types
export const MixedValueTypes: Story = {
  args: {
    modes: mockModes,
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { type: 'COLOR', value: '#000000' },
      },
      {
        modeIds: ['dark'],
        value: { type: 'FLOAT', value: 1.5 },
      },
      {
        modeIds: ['mobile'],
        value: { type: 'BOOLEAN', value: true },
      },
      {
        modeIds: ['desktop'],
        value: { type: 'ALIAS', tokenId: 'token1' },
      },
    ],
    getValueEditor,
  },
};

// Story with global values (no mode IDs)
export const GlobalValues: Story = {
  args: {
    modes: mockModes,
    valuesByMode: [
      {
        modeIds: [],
        value: { type: 'COLOR', value: '#000000' },
      },
    ],
    getValueEditor,
  },
}; 