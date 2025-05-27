import React from 'react';
import { TaxonomyPicker } from './TaxonomyPicker';
import { ChakraProvider } from '@chakra-ui/react';

export default {
  title: 'Components/TaxonomyPicker',
  component: TaxonomyPicker,
  argTypes: {
    taxonomies: { control: 'object' },
    value: { control: 'object' },
    onChange: { action: 'onChange' },
    isMulti: { control: 'boolean' },
    placeholder: { control: 'text' },
    isDisabled: { control: 'boolean' },
  },
};

const Template = (args) => (
  <ChakraProvider>
    <TaxonomyPicker {...args} />
  </ChakraProvider>
);

export const Default = Template.bind({});
Default.args = {
  taxonomies: [],
  value: null,
  isMulti: false,
  placeholder: 'Select taxonomy',
  isDisabled: false,
}; 