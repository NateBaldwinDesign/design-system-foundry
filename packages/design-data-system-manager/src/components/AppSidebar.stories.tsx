import React from 'react';
import { AppSidebar } from './AppSidebar';
import { ChakraProvider } from '@chakra-ui/react';

export default {
  title: 'Components/AppSidebar',
  component: AppSidebar,
  argTypes: {
    dataSource: { control: 'text' },
    setDataSource: { action: 'setDataSource' },
    dataOptions: { control: 'object' },
    onResetData: { action: 'onResetData' },
    onExportData: { action: 'onExportData' },
  },
};

const Template = (args) => (
  <ChakraProvider>
    <AppSidebar {...args} />
  </ChakraProvider>
);

export const Default = Template.bind({});
Default.args = {
  dataSource: 'core-data.json',
  dataOptions: [
    { label: 'Core Data', value: 'core-data.json', filePath: 'core-data.json' },
    { label: 'Brand A', value: 'brand-a.json', filePath: 'brand-a.json' },
  ],
}; 