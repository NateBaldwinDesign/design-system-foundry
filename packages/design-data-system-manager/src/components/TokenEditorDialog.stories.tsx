import React from 'react';
import { TokenEditorDialog } from './TokenEditorDialog';
import { ChakraProvider } from '@chakra-ui/react';
import type { TokenEditorDialogProps } from './TokenEditorDialog';

export default {
  title: 'Components/TokenEditorDialog',
  component: TokenEditorDialog,
  argTypes: {
    open: { control: 'boolean' },
    onClose: { action: 'onClose' },
    onSave: { action: 'onSave' },
    token: { control: 'object' },
    tokens: { control: 'object' },
    dimensions: { control: 'object' },
    modes: { control: 'object' },
    platforms: { control: 'object' },
    resolvedValueTypes: { control: 'object' },
    taxonomies: { control: 'object' },
    isNew: { control: 'boolean' },
    onViewClassifications: { action: 'onViewClassifications' },
  },
};

const Template = (args: TokenEditorDialogProps) => (
  <ChakraProvider>
    <TokenEditorDialog {...args} />
  </ChakraProvider>
);

export const Default = Template.bind({});
Default.args = {
  open: true,
  token: {
    id: 'test-token',
    name: 'Test Token',
    valuesByMode: [],
    resolvedValueTypeId: 'color',
  },
  tokens: [],
  dimensions: [],
  modes: [],
  platforms: [],
  resolvedValueTypes: [],
  taxonomies: [],
  isNew: true,
}; 