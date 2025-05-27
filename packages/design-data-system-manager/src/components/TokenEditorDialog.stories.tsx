import React from 'react';
import { TokenEditorDialog } from './TokenEditorDialog';
import { ChakraProvider } from '@chakra-ui/react';

export default {
  title: 'Components/TokenEditorDialog',
  component: TokenEditorDialog,
  argTypes: {
    open: { control: 'boolean' },
    onClose: { action: 'onClose' },
    onSave: { action: 'onSave' },
    token: { control: 'object' },
    collections: { control: 'object' },
    dimensions: { control: 'object' },
    platforms: { control: 'object' },
    resolvedValueTypes: { control: 'object' },
    taxonomies: { control: 'object' },
    modeOptions: { control: 'object' },
    taxonomyOrder: { control: 'object' },
    isNew: { control: 'boolean' },
  },
};

const Template = (args) => (
  <ChakraProvider>
    <TokenEditorDialog {...args} />
  </ChakraProvider>
);

export const Default = Template.bind({});
Default.args = {
  open: true,
  token: {},
  collections: [],
  dimensions: [],
  platforms: [],
  resolvedValueTypes: [],
  taxonomies: [],
  modeOptions: [],
  taxonomyOrder: [],
  isNew: true,
}; 