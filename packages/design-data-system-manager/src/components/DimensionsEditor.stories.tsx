import React from 'react';
import { DimensionsEditor } from './DimensionsEditor';
import { ChakraProvider } from '@chakra-ui/react';

export default {
  title: 'Components/DimensionsEditor',
  component: DimensionsEditor,
  argTypes: {
    dimensions: { control: 'object' },
    onChange: { action: 'onChange' },
    onEdit: { action: 'onEdit' },
    onDelete: { action: 'onDelete' },
    onAdd: { action: 'onAdd' },
    isReadOnly: { control: 'boolean' },
  },
};

const Template = (args) => (
  <ChakraProvider>
    <DimensionsEditor {...args} />
  </ChakraProvider>
);

export const Default = Template.bind({});
Default.args = {
  dimensions: [],
  isReadOnly: false,
}; 