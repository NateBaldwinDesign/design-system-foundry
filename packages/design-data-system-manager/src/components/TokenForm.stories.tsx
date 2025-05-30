import type { Meta, StoryObj } from '@storybook/react';
import { TokenForm } from './TokenForm';
import type { Token, TokenCollection, Mode, Dimension, Taxonomy } from '@token-model/data-model';

const meta: Meta<typeof TokenForm> = {
  title: 'Components/TokenForm',
  component: TokenForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TokenForm>;

// Mock data for the stories
const mockCollections: TokenCollection[] = [
  {
    id: 'collection1',
    name: 'Colors',
    description: 'Color tokens',
    resolvedValueTypeIds: ['COLOR'],
    private: false,
  },
  {
    id: 'collection2',
    name: 'Spacing',
    description: 'Spacing tokens',
    resolvedValueTypeIds: ['DIMENSION'],
    private: false,
  },
];

const mockModes: Mode[] = [
  {
    id: 'mode1',
    name: 'Light',
    dimensionId: 'dim1',
  },
  {
    id: 'mode2',
    name: 'Dark',
    dimensionId: 'dim1',
  },
];

const mockDimensions: Dimension[] = [
  {
    id: 'dim1',
    displayName: 'Theme',
    required: true,
    defaultMode: 'Light',
    modes: [
      { id: 'mode1', name: 'Light', dimensionId: 'dim1' },
      { id: 'mode2', name: 'Dark', dimensionId: 'dim1' },
    ],
  },
];

const mockTokens: Token[] = [
  {
    id: 'token1',
    displayName: 'Primary Color',
    description: 'Main brand color',
    tokenCollectionId: 'collection1',
    resolvedValueTypeId: 'COLOR',
    private: false,
    themeable: true,
    taxonomies: [],
    propertyTypes: ['ALL_PROPERTY_TYPES'],
    codeSyntax: [],
    valuesByMode: [
      {
        modeIds: ['mode1'],
        value: { type: 'COLOR', value: '#000000' },
      },
    ],
  },
];

const mockTaxonomies: Taxonomy[] = [
  {
    id: 'tax1',
    name: 'Category',
    description: 'Token categories',
    terms: [
      { id: 'term1', name: 'Brand' },
      { id: 'term2', name: 'UI' },
    ],
  },
];

// Base story with all required props
export const Default: Story = {
  args: {
    collections: mockCollections,
    modes: mockModes,
    dimensions: mockDimensions,
    tokens: mockTokens,
    taxonomies: mockTaxonomies,
    onSubmit: (token) => console.log('Submitted token:', token),
  },
};

// Story with initial data for editing
export const WithInitialData: Story = {
  args: {
    ...Default.args,
    initialData: mockTokens[0],
  },
};

// Story with empty collections
export const EmptyCollections: Story = {
  args: {
    ...Default.args,
    collections: [],
    tokens: [],
  },
};

// Story with empty taxonomies
export const EmptyTaxonomies: Story = {
  args: {
    ...Default.args,
    taxonomies: [],
  },
}; 