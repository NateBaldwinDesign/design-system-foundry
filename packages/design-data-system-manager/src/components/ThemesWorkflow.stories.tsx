import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemesWorkflow } from './ThemesWorkflow';
import { ChakraProvider } from '@chakra-ui/react';

// Mock the StorageService
const mockStorageService = {
  setThemes: (themes: any[]) => {
    console.log('Themes saved:', themes);
  },
};

// Mock data for the stories
const mockThemes = [
  {
    id: 'light',
    displayName: 'Light Theme',
    description: 'Default light theme',
    isDefault: true,
  },
  {
    id: 'dark',
    displayName: 'Dark Theme',
    description: 'Dark mode theme',
    isDefault: false,
  },
];

// Create a wrapper component that provides the mock data and handlers
const ThemesWorkflowWrapper: React.FC = () => {
  const [themes, setThemes] = React.useState(mockThemes);

  // Mock the StorageService
  React.useEffect(() => {
    // @ts-ignore - Mocking the service
    window.StorageService = mockStorageService;
  }, []);

  return <ThemesWorkflow themes={themes} setThemes={setThemes} />;
};

const meta: Meta<typeof ThemesWorkflowWrapper> = {
  title: 'Components/ThemesWorkflow',
  component: ThemesWorkflowWrapper,
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
type Story = StoryObj<typeof ThemesWorkflowWrapper>;

// Base story with default mock data
export const Default: Story = {
  args: {},
};

// Story with empty themes
export const EmptyThemes: Story = {
  args: {},
  parameters: {
    mockData: {
      themes: [],
    },
  },
};

// Story with many themes
export const ManyThemes: Story = {
  args: {},
  parameters: {
    mockData: {
      themes: [
        ...mockThemes,
        {
          id: 'high-contrast',
          displayName: 'High Contrast',
          description: 'High contrast theme for accessibility',
          isDefault: false,
        },
        {
          id: 'sepia',
          displayName: 'Sepia',
          description: 'Sepia tone theme',
          isDefault: false,
        },
      ],
    },
  },
}; 