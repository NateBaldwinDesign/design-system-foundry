import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ValidationTester } from './ValidationTester';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '../theme';
import type { Token, TokenCollection } from '@token-model/data-model';

const meta: Meta<typeof ValidationTester> = {
  title: 'Components/ValidationTester',
  component: ValidationTester,
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
type Story = StoryObj<typeof ValidationTester>;

const mockTokens: Token[] = [
  {
    id: 'token1',
    displayName: 'Primary Color',
    description: 'Main brand color',
    tokenCollectionId: 'collection1',
    resolvedValueTypeId: 'color',
    private: false,
    themeable: true,
    taxonomies: [],
    propertyTypes: ['ALL_PROPERTY_TYPES'],
    codeSyntax: [
      {
        platformId: 'web',
        formattedName: 'primary-color'
      }
    ],
    valuesByMode: [
      {
        modeIds: ['mode1'],
        value: { value: '#000000' },
      },
    ],
  },
  {
    id: 'token2',
    displayName: 'Spacing Unit',
    description: 'Base spacing unit',
    tokenCollectionId: 'collection2',
    resolvedValueTypeId: 'dimension',
    private: false,
    themeable: false,
    taxonomies: [],
    propertyTypes: ['ALL_PROPERTY_TYPES'],
    codeSyntax: [
      {
        platformId: 'web',
        formattedName: 'spacing-unit'
      }
    ],
    valuesByMode: [
      {
        modeIds: ['mode1'],
        value: { value: 8 },
      },
    ],
  },
];

const mockCollections: TokenCollection[] = [
  {
    id: 'collection1',
    name: 'Colors',
    description: 'Color tokens',
    resolvedValueTypeIds: ['color'],
    private: false,
  },
  {
    id: 'collection2',
    name: 'Spacing',
    description: 'Spacing tokens',
    resolvedValueTypeIds: ['dimension'],
    private: false,
  },
];

export const Default: Story = {
  args: {
    tokens: mockTokens,
    collections: mockCollections,
    onValidate: (token: Token) => console.log('Validating token:', token)
  }
};

export const EmptyData: Story = {
  args: {
    tokens: [],
    collections: [],
    onValidate: (token: Token) => console.log('Validating token:', token)
  }
};

export const WithValidationErrors: Story = {
  args: {
    tokens: [
      {
        ...mockTokens[0],
        valuesByMode: [
          {
            modeIds: ['mode1'],
            value: { value: 'invalid-color' },
          },
        ],
      }
    ],
    collections: [
      {
        ...mockCollections[0],
        name: '',
      }
    ],
    onValidate: (token: Token) => console.log('Validating token:', token)
  }
}; 