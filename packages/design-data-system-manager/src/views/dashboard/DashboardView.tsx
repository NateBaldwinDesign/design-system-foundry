import React from 'react';
import {
  Box,
  Heading,
  SimpleGrid,
  Stat,
} from '@chakra-ui/react';
import { useTheme } from 'next-themes';

interface DashboardViewProps {
  tokenStats: {
    total: number;
    privateCount: number;
    privatePercent: number;
    publicCount: number;
    publicPercent: number;
    themeableCount: number;
    themeablePercent: number;
    nonThemeableCount: number;
    nonThemeablePercent: number;
  };
}

export const DashboardView: React.FC<DashboardViewProps> = ({ tokenStats }) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Box p={0} borderWidth={0} borderRadius="md" bg={isDark ? 'gray.900' : 'gray.50'}>
      <Box p={8}>
        <Heading size="xl" mb={8}>Dashboard</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={8} mb={8}>
          {/* Tokens Section */}
          <Box p={6} borderWidth={1} borderRadius="md" bg="bg">
            <Heading size="md" mb={4}>Tokens</Heading>
            <SimpleGrid columns={2} gap={4} mb={4}>
              <Stat.Root>
                <Stat.Label>Total</Stat.Label>
                <Stat.ValueText>{tokenStats.total}</Stat.ValueText>
              </Stat.Root>
              <Stat.Root>
                <Stat.Label>Private</Stat.Label>
                <Stat.ValueText>{tokenStats.privateCount}</Stat.ValueText>
                <Stat.HelpText>{tokenStats.privatePercent.toFixed(1)}%</Stat.HelpText>
              </Stat.Root>
              <Stat.Root>
                <Stat.Label>Public</Stat.Label>
                <Stat.ValueText>{tokenStats.publicCount}</Stat.ValueText>
                <Stat.HelpText>{tokenStats.publicPercent.toFixed(1)}%</Stat.HelpText>
              </Stat.Root>
              <Stat.Root>
                <Stat.Label>Themeable</Stat.Label>
                <Stat.ValueText>{tokenStats.themeableCount}</Stat.ValueText>
                <Stat.HelpText>{tokenStats.themeablePercent.toFixed(1)}%</Stat.HelpText>
              </Stat.Root>
              <Stat.Root>
                <Stat.Label>Not Themeable</Stat.Label>
                <Stat.ValueText>{tokenStats.nonThemeableCount}</Stat.ValueText>
                <Stat.HelpText>{tokenStats.nonThemeablePercent.toFixed(1)}%</Stat.HelpText>
              </Stat.Root>
            </SimpleGrid>
          </Box>
        </SimpleGrid>
      </Box>
    </Box>
  );
}; 