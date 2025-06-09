import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { TaxonomyPicker } from './TaxonomyPicker';
import { ChakraProvider } from '@chakra-ui/react';
import type { Taxonomy } from '@token-model/data-model';
import { system } from '../theme';

const meta: Meta<typeof TaxonomyPicker> = {
  title: 'Components/TaxonomyPicker',
  component: TaxonomyPicker,
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
type Story = StoryObj<typeof TaxonomyPicker>;

const mockTaxonomies: Taxonomy[] = [
  {
    id: 'color-usage',
    name: 'Color Usage',
    description: 'How this color is used in the system',
    terms: [
      { id: 'background', name: 'Background', description: 'Used for background surfaces' },
      { id: 'text', name: 'Text', description: 'Used for text content' }
    ]
  },
  {
    id: 'spacing-usage',
    name: 'Spacing Usage',
    description: 'How this spacing is used in the system',
    terms: [
      { id: 'padding', name: 'Padding', description: 'Used for padding' },
      { id: 'margin', name: 'Margin', description: 'Used for margins' }
    ]
  }
];

export const Default: Story = {
  args: {
    taxonomies: [],
    value: [],
    onChange: () => {},
    disabled: false
  }
};

export const WithTaxonomies: Story = {
  args: {
    taxonomies: mockTaxonomies,
    value: [],
    onChange: () => {},
    disabled: false
  }
};

export const WithSelectedValues: Story = {
  args: {
    taxonomies: mockTaxonomies,
    value: [
      { taxonomyId: 'color-usage', termId: 'background' },
      { taxonomyId: 'spacing-usage', termId: 'padding' }
    ],
    onChange: () => {},
    disabled: false
  }
};

export const Disabled: Story = {
  args: {
    taxonomies: mockTaxonomies,
    value: [],
    onChange: () => {},
    disabled: true
  }
}; 