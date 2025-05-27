import React from 'react';
import { PlatformEditorDialog } from './PlatformEditorDialog';
import { ChakraProvider } from '@chakra-ui/react';

export default {
  title: 'Components/PlatformEditorDialog',
  component: PlatformEditorDialog,
  argTypes: {
    open: { control: 'boolean' },
    onClose: { action: 'onClose' },
    onSave: { action: 'onSave' },
    platform: { control: 'object' },
    isNew: { control: 'boolean' },
  },
};

const Template = (args) => (
  <ChakraProvider>
    <PlatformEditorDialog {...args} />
  </ChakraProvider>
);

export const Default = Template.bind({});
Default.args = {
  open: true,
  platform: {},
  isNew: true,
}; 