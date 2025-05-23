import React from 'react';
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface VerticalTabsLayoutProps {
  tabs: TabItem[];
  activeTab?: number;
  onChange?: (index: number) => void;
  width?: string | number;
  height?: string | number;
}

export function VerticalTabsLayout({
  tabs,
  activeTab = 0,
  onChange,
  width = '100%',
  height = '100%',
}: VerticalTabsLayoutProps) {
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Box width={width} height={height}>
      <Tabs
        orientation="vertical"
        variant="enclosed"
        index={activeTab}
        onChange={onChange}
        display="flex"
        flexDirection="row"
        height="100%"
      >
        <TabList
          borderRight="1px"
          borderColor={borderColor}
          width="200px"
          height="100%"
          overflowY="auto"
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              justifyContent="flex-start"
              width="100%"
              _selected={{
                bg: selectedBg,
                borderRight: '2px',
                borderRightColor: 'blue.500',
              }}
              _hover={{
                bg: hoverBg,
              }}
            >
              {tab.label}
            </Tab>
          ))}
        </TabList>

        <TabPanels flex="1" overflowY="auto">
          {tabs.map((tab) => (
            <TabPanel key={tab.id} p={4}>
              {tab.content}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Box>
  );
} 