import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ValidationTester } from './ValidationTester';
import { ChakraProvider } from '@chakra-ui/react';
import type { Token, TokenCollection } from '@token-model/data-model';

// Mock data for the stories
const mockTokens: Token[] = [
  {
    id: 'token1',
    displayName: 'Primary Color',
    description: 'The primary brand color',
    tokenCollectionId: 'colors',
    resolvedValueTypeId: 'color',
    private: false,
    themeable: true,
    taxonomies: [],
    propertyTypes: ['brand', 'primary'],
    valuesByMode: [
      {
        modeIds: ['light'],
        value: { value: '#007AFF' }
      }
    ],
    tokenTier: 'PRIMITIVE',
    generatedByAlgorithm: false
  },
  {
    id: 'token2',
    displayName: 'Spacing Unit',
    description: 'Base spacing unit',
    tokenCollectionId: 'spacing',
    resolvedValueTypeId: 'spacing',
    private: false,
    themeable: false,
    taxonomies: [],
    propertyTypes: ['spacing', 'base'],
    valuesByMode: [
      {
        modeIds: ['default'],
        value: { value: '8px' }
      }
    ],
    tokenTier: 'PRIMITIVE',
    generatedByAlgorithm: false
  }
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

// Mock the ValidationService
const mockValidationService = {
  validateData: () => ({
    isValid: true,
    errors: [],
  }),
};

// Create a wrapper component that provides the mock data and handlers
const ValidationTesterWrapper: React.FC = () => {
  // Mock the ValidationService
  React.useEffect(() => {
    // @ts-expect-error - Mocking the service
    window.ValidationService = mockValidationService;
  }, []);

  const handleValidate = (token: Token) => {
    console.log('Validating token:', token);
  };

  return (
    <ValidationTester
      tokens={mockTokens}
      collections={mockCollections}
      onValidate={handleValidate}
    />
  );
};

const meta: Meta<typeof ValidationTesterWrapper> = {
  title: 'Components/ValidationTester',
  component: ValidationTesterWrapper,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ChakraProvider>
        <Story />
      </ChakraProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ValidationTesterWrapper>;

// Base story with default mock data
export const Default: Story = {
  args: {},
};

// Story with empty data
export const EmptyData: Story = {
  args: {},
  parameters: {
    mockData: {
      tokens: [],
      collections: [],
    },
  },
};

// Story with validation errors
export const WithValidationErrors: Story = {
  args: {},
  parameters: {
    mockData: {
      validationService: {
        validateData: () => ({
          isValid: false,
          errors: [
            {
              path: ['tokens', 0],
              message: 'Invalid token value type',
            },
            {
              path: ['collections', 1],
              message: 'Missing required field: name',
            },
          ],
        }),
      },
    },
  },
}; 