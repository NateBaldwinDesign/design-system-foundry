import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { TokenEditorDialog } from './TokenEditorDialog';
import type { TokenStatus, TokenCollection } from '@token-model/data-model';
import { ChakraProvider } from '@chakra-ui/react';
import { system } from '../theme';

const meta: Meta<typeof TokenEditorDialog> = {
  title: 'Components/TokenEditorDialog',
  component: TokenEditorDialog,
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
type Story = StoryObj<typeof TokenEditorDialog>;

const mockToken = {
  id: 'test-token',
  displayName: 'Test Token',
  description: 'A test token',
  tokenCollectionId: 'test-collection',
  status: 'stable' as TokenStatus,
  valuesByMode: [],
  resolvedValueTypeId: 'color',
  private: false,
  themeable: true,
  taxonomies: [],
  propertyTypes: [],
  codeSyntax: []
};

const mockTokenCollections: TokenCollection[] = [
  {
    id: 'test-collection',
    name: 'Test Collection',
    description: 'A test collection',
    resolvedValueTypeIds: ['color'],
    private: false
  }
];

const mockSchema = {
  extensions: {
    tokenGroups: [],
    tokenVariants: {}
  },
  themes: []
};

export const Default: Story = {
  args: {
    open: true,
    onClose: () => {},
    onSave: () => {},
    onDeleteToken: () => {},
    token: mockToken,
    tokenCollections: mockTokenCollections,
    schema: mockSchema,
    isNew: false
  }
};

export const NewToken: Story = {
  args: {
    open: true,
    onClose: () => {},
    onSave: () => {},
    onDeleteToken: () => {},
    token: mockToken,
    tokenCollections: mockTokenCollections,
    schema: mockSchema,
    isNew: true
  }
}; 