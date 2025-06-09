import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { DimensionsEditor } from './DimensionsEditor';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '../theme';
import type { Dimension } from '@token-model/data-model';

const meta: Meta<typeof DimensionsEditor> = {
  title: 'Components/DimensionsEditor',
  component: DimensionsEditor,
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
type Story = StoryObj<typeof DimensionsEditor>;

const mockDimension: Dimension = {
  id: 'theme',
  displayName: 'Theme',
  required: true,
  modes: [
    { id: 'light', name: 'Light', dimensionId: 'theme' },
    { id: 'dark', name: 'Dark', dimensionId: 'theme' }
  ],
  defaultMode: 'light'
};

export const Default: Story = {
  args: {
    open: true,
    onClose: () => {},
    onSave: () => {},
    isNew: false
  }
};

export const NewDimension: Story = {
  args: {
    open: true,
    onClose: () => {},
    onSave: () => {},
    isNew: true
  }
};

export const EditDimension: Story = {
  args: {
    open: true,
    onClose: () => {},
    onSave: () => {},
    dimension: mockDimension,
    isNew: false
  }
}; 