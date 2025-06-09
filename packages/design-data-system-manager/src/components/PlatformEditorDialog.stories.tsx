import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { PlatformEditorDialog } from './PlatformEditorDialog';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '../theme';
import type { Platform } from '@token-model/data-model';

const meta: Meta<typeof PlatformEditorDialog> = {
  title: 'Components/PlatformEditorDialog',
  component: PlatformEditorDialog,
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
type Story = StoryObj<typeof PlatformEditorDialog>;

const mockPlatform: Platform = {
  id: 'web',
  displayName: 'Web'
};

export const Default: Story = {
  args: {
    open: true,
    onClose: () => {},
    onSave: () => {},
    isNew: false
  }
};

export const NewPlatform: Story = {
  args: {
    open: true,
    onClose: () => {},
    onSave: () => {},
    isNew: true
  }
};

export const EditPlatform: Story = {
  args: {
    open: true,
    onClose: () => {},
    onSave: () => {},
    platform: mockPlatform,
    isNew: false
  }
}; 