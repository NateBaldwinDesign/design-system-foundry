import React from 'react';
import { AppLayout } from './AppLayout';
import { Box, ChakraProvider } from '@chakra-ui/react';

export default {
  title: 'Components/AppLayout',
  component: AppLayout,
};

export const EmptyPlaceholder = () => (
  <ChakraProvider>
    <AppLayout
      dataSource="core-data.json"
      setDataSource={() => {}}
      dataOptions={[
        { label: 'Core Data', value: 'core-data.json', filePath: 'core-data.json' },
      ]}
      onResetData={() => {}}
      onExportData={() => {}}
    >
      <Box p={8} textAlign="center" color="gray.500">
        <em>This area would be populated by routed views in the real app.</em>
      </Box>
    </AppLayout>
  </ChakraProvider>
); 