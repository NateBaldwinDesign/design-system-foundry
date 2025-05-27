import React from 'react';
import Header from './Header';
import { ChakraProvider } from '@chakra-ui/react';

export default {
  title: 'Components/Header',
  component: Header,
  argTypes: {
    dataSource: { control: 'text' },
    setDataSource: { action: 'setDataSource' },
    dataOptions: { control: 'object' },
    handleResetData: { action: 'handleResetData' },
    handleExportData: { action: 'handleExportData' },
    activeView: { control: 'text' },
    onViewChange: { action: 'onViewChange' },
  },
};

const Template = (args) => (
  <ChakraProvider>
    <Header {...args} />
  </ChakraProvider>
);

export const Default = Template.bind({});
Default.args = {
  dataSource: 'core-data.json',
  dataOptions: [
    { label: 'Core Data', value: 'core-data.json', filePath: 'core-data.json' },
    { label: 'Brand A', value: 'brand-a.json', filePath: 'brand-a.json' },
  ],
  activeView: 'dashboard',
}; 