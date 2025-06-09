import type { Meta, StoryObj } from '@storybook/react';
import { AppSidebar } from './AppSidebar';

const meta: Meta<typeof AppSidebar> = {
  title: 'Components/AppSidebar',
  component: AppSidebar,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof AppSidebar>;

export const Default: Story = {
  args: {
    dataSource: 'core-data.json',
    setDataSource: (source: string) => console.log('Setting data source:', source),
    dataOptions: [
      { label: 'Core Data', filePath: 'core-data.json' },
    ],
    onResetData: () => console.log('Resetting data'),
    onExportData: () => console.log('Exporting data')
  }
}; 