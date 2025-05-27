import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import { AppSidebar } from './AppSidebar';

interface DataSourceOption {
  label: string;
  value: string;
  filePath: string;
}

interface AppLayoutProps {
  dataSource: string;
  setDataSource: (source: string) => void;
  dataOptions: DataSourceOption[];
  onResetData: () => void;
  onExportData: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  dataSource,
  setDataSource,
  dataOptions,
  onResetData,
  onExportData,
  children,
}: AppLayoutProps) => {
  return (
    <Flex h="100vh" overflow="hidden">
      <AppSidebar
        dataSource={dataSource}
        setDataSource={setDataSource}
        dataOptions={dataOptions}
        onResetData={onResetData}
        onExportData={onExportData}
      />
      <Box flex="1" overflow="auto" p={4}>
        {children}
      </Box>
    </Flex>
  );
}; 