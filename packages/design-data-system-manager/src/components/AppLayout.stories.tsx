import type { Meta, StoryObj } from '@storybook/react';
import { AppLayout } from './AppLayout';
import { Box, ChakraProvider } from '@chakra-ui/react';
import { system } from '../theme';

const meta: Meta<typeof AppLayout> = {
  title: 'Components/AppLayout',
  component: AppLayout,
  parameters: {
    layout: 'fullscreen',
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
type Story = StoryObj<typeof AppLayout>;

export const Default: Story = {
  args: {
    dataSource: 'core-data.json',
    setDataSource: (source: string) => console.log('Setting data source:', source),
    dataOptions: [
      { label: 'Core Data', value: 'core-data.json', filePath: 'core-data.json' },
    ],
    onResetData: () => console.log('Resetting data'),
    onExportData: () => console.log('Exporting data'),
    children: (
      <Box p={8} textAlign="center" color="gray.500">
        <em>This area would be populated by routed views in the real app.</em>
      </Box>
    )
  }
}; 