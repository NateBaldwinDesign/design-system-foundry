import React from 'react';
import { AppSidebar } from './AppSidebar';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

export default {
  title: 'Components/AppSidebar',
  component: AppSidebar,
};

export const EmptyPlaceholder = () => (
  <ChakraProvider>
    <MemoryRouter>
      <AppSidebar
        dataSource="core-data.json"
        setDataSource={() => {}}
        dataOptions={[
          { label: 'Core Data', value: 'core-data.json', filePath: 'core-data.json' },
        ]}
        onResetData={() => {}}
        onExportData={() => {}}
      />
    </MemoryRouter>
  </ChakraProvider>
); 