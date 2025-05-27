import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SettingsPlatformsTab } from './SettingsPlatformsTab';
import { ChakraProvider } from '@chakra-ui/react';

// Mock the useSchema hook
const mockSchema = {
  platforms: [
    {
      id: 'ios',
      displayName: 'iOS',
      description: 'iOS platform',
      syntaxPatterns: {
        prefix: 'TKN_',
        suffix: '',
        delimiter: '_',
        capitalization: 'uppercase',
        formatString: '{prefix}{name}{suffix}',
      },
    },
    {
      id: 'android',
      displayName: 'Android',
      description: 'Android platform',
      syntaxPatterns: {
        prefix: '',
        suffix: '',
        delimiter: '.',
        capitalization: 'none',
        formatString: '{prefix}{name}{suffix}',
      },
    },
  ],
};

// Create a wrapper component that provides the mock schema
const SettingsPlatformsTabWrapper: React.FC = () => {
  const [schema, setSchema] = React.useState(mockSchema);

  // Mock the useSchema hook by providing the schema and update function
  React.useEffect(() => {
    // @ts-ignore - Mocking the hook
    window.useSchema = () => ({
      schema,
      updateSchema: (newSchema: any) => {
        console.log('Schema updated:', newSchema);
        setSchema(newSchema);
      },
    });
  }, [schema]);

  return <SettingsPlatformsTab />;
};

const meta: Meta<typeof SettingsPlatformsTabWrapper> = {
  title: 'Components/SettingsPlatformsTab',
  component: SettingsPlatformsTabWrapper,
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
type Story = StoryObj<typeof SettingsPlatformsTabWrapper>;

// Base story with default mock data
export const Default: Story = {
  args: {},
};

// Story with empty platforms
export const EmptyPlatforms: Story = {
  args: {},
  parameters: {
    mockData: {
      schema: {
        platforms: [],
      },
    },
  },
};

// Story with many platforms
export const ManyPlatforms: Story = {
  args: {},
  parameters: {
    mockData: {
      schema: {
        platforms: [
          ...mockSchema.platforms,
          {
            id: 'web',
            displayName: 'Web',
            description: 'Web platform',
            syntaxPatterns: {
              prefix: '--',
              suffix: '',
              delimiter: '-',
              capitalization: 'lowercase',
              formatString: '{prefix}{name}{suffix}',
            },
          },
          {
            id: 'flutter',
            displayName: 'Flutter',
            description: 'Flutter platform',
            syntaxPatterns: {
              prefix: '',
              suffix: '',
              delimiter: '_',
              capitalization: 'capitalize',
              formatString: '{prefix}{name}{suffix}',
            },
          },
        ],
      },
    },
  },
}; 