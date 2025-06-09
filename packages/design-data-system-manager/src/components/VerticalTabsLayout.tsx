import React from 'react';
import { Box, VStack } from '@chakra-ui/react';

export interface VerticalTabsLayoutProps {
  tabs: {
    id: string;
    label: string;
    content: React.ReactNode;
  }[];
  activeTab: number;
  onChange?: (tabId: string) => void;
}

export const VerticalTabsLayout: React.FC<VerticalTabsLayoutProps> = ({
  tabs,
  activeTab,
  onChange,
}) => {
  return (
    <Box>
      <VStack align="stretch" gap={4}>
        {tabs.map((tab) => (
          <Box
            key={tab.id}
            onClick={() => onChange?.(tab.id)}
            cursor="pointer"
            p={4}
            bg={activeTab === parseInt(tab.id, 10) ? 'blue.500' : 'transparent'}
            color={activeTab === parseInt(tab.id, 10) ? 'white' : 'inherit'}
          >
            {tab.label}
          </Box>
        ))}
      </VStack>
      <Box mt={4}>{tabs[activeTab]?.content}</Box>
    </Box>
  );
}; 