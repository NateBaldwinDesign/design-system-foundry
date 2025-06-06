import React from 'react';
import { TaxonomyPicker } from './TaxonomyPicker';
import { ChakraProvider } from '@chakra-ui/react';
import type { Taxonomy } from '@token-model/data-model';
import { system } from '../theme';

interface TaxonomyPickerStoryProps {
  taxonomies: Taxonomy[];
  value: { taxonomyId: string; termId: string }[];
  onChange: (value: { taxonomyId: string; termId: string }[]) => void;
  isMulti: boolean;
  placeholder: string;
  disabled: boolean;
}

const meta = {
  title: 'Components/TaxonomyPicker',
  component: TaxonomyPicker,
  argTypes: {
    taxonomies: { control: 'object' },
    value: { control: 'object' },
    onChange: { action: 'onChange' },
    isMulti: { control: 'boolean' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  decorators: [
    (Story: React.ComponentType) => (
      <ChakraProvider value={system}>
        <Story />
      </ChakraProvider>
    ),
  ],
};

export default meta;

const Template = (args: TaxonomyPickerStoryProps) => <TaxonomyPicker {...args} />;

export const Default = {
  render: Template,
  args: {
    taxonomies: [],
    value: [],
    isMulti: false,
    placeholder: 'Select taxonomy',
    disabled: false,
    onChange: (value: { taxonomyId: string; termId: string }[]) => {
      console.log('onChange:', value);
    },
  },
}; 