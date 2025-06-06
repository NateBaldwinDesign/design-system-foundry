import React from 'react';
import {
  Box,
  Tabs,
  Flex,
} from '@chakra-ui/react';
import { useTheme } from 'next-themes';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface VerticalTabsLayoutProps {
  tabs: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export const VerticalTabsLayout: React.FC<VerticalTabsLayoutProps> = ({
  tabs,
  defaultTab,
  onChange,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Flex>
      <Box
        borderRightWidth={1}
        borderColor={isDark ? 'gray.700' : 'gray.200'}
        w="200px"
      >
        <Tabs.Root
          orientation="vertical"
          variant="enclosed"
          defaultValue={defaultTab || tabs[0].id}
          onValueChange={(details) => onChange?.(details.value)}
        >
          <Tabs.List>
            {tabs.map((tab) => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                bg={isDark ? 'gray.700' : 'gray.100'}
                borderColor={isDark ? 'gray.600' : 'gray.200'}
                justifyContent="flex-start"
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      </Box>
      <Box flex={1} p={4}>
        {tabs.map((tab) => (
          <Tabs.Content key={tab.id} value={tab.id}>
            {tab.content}
          </Tabs.Content>
        ))}
      </Box>
    </Flex>
  );
}; 