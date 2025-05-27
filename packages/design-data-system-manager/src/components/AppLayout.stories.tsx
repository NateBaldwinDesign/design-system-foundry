import React from 'react';
import { AppLayout } from './AppLayout';
import { Box, ChakraProvider } from '@chakra-ui/react';

export default {
  title: 'Components/AppLayout',
  component: AppLayout,
  argTypes: {
    dataSource: { control: 'text' },
    setDataSource: { action: 'setDataSource' },
    dataOptions: { control: 'object' },
    onResetData: { action: 'onResetData' },
    onExportData: { action: 'onExportData' },
    children: { control: 'text' },
  },
};

const Template = (args) => (
  <ChakraProvider>
    <AppLayout {...args}>
      <Box p={4}>AppLayout children content</Box>
    </AppLayout>
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