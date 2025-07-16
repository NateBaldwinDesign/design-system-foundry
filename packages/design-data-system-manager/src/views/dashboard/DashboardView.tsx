import React from 'react';
import { Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Divider, VStack, HStack, Text, Table, Thead, Tbody, Tr, Th, Td, Tag, useColorMode } from '@chakra-ui/react';
import { getTokenStats, getPlatformOverrideStats, getThemeStats, getLatestRelease, getRecentActivity } from '../../utils/dashboardStats';
import type { Platform, Theme } from '@token-model/data-model';
import type { ExtendedToken } from '../../components/TokenEditorDialog';
import type { GitHubUser } from '../../config/github';

interface DashboardViewProps {
  tokens: ExtendedToken[];
  platforms: Platform[];
  themes: Theme[];
  githubUser: GitHubUser | null;
}

const DashboardView: React.FC<DashboardViewProps> = ({ tokens, platforms, themes, githubUser }) => {
  const { colorMode } = useColorMode();
  
  const tokenStats = getTokenStats(tokens);
  const platformStats = getPlatformOverrideStats(tokens, platforms);
  const themeStats = getThemeStats(themes);
  const latestRelease = getLatestRelease();
  const recentActivity = getRecentActivity();

  // Get the user's first name from GitHub user data
  const getWelcomeMessage = () => {
    if (githubUser && githubUser.name) {
      const firstName = githubUser.name.split(' ')[0];
      return `Welcome, ${firstName}`;
    }
    return 'Dashboard';
  };

  return (
    <Box p={0} borderWidth={0} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}>
      <Box p={8}>
        <Heading size="xl" mb={8}>{getWelcomeMessage()}</Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
          {/* Tokens Section */}
          <Box p={6} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
            <Heading size="md" mb={4}>Tokens</Heading>
            <SimpleGrid columns={2} spacing={4} mb={4}>
              <Stat>
                <StatLabel>Total</StatLabel>
                <StatNumber>{tokenStats.total}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Private</StatLabel>
                <StatNumber>{tokenStats.privateCount}</StatNumber>
                <StatHelpText>{tokenStats.privatePercent.toFixed(1)}%</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Public</StatLabel>
                <StatNumber>{tokenStats.publicCount}</StatNumber>
                <StatHelpText>{tokenStats.publicPercent.toFixed(1)}%</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Themeable</StatLabel>
                <StatNumber>{tokenStats.themeableCount}</StatNumber>
                <StatHelpText>{tokenStats.themeablePercent.toFixed(1)}%</StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Not Themeable</StatLabel>
                <StatNumber>{tokenStats.nonThemeableCount}</StatNumber>
                <StatHelpText>{tokenStats.nonThemeablePercent.toFixed(1)}%</StatHelpText>
              </Stat>
            </SimpleGrid>
          </Box>
          {/* Platforms Section */}
          <Box p={6} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
            <Heading size="md" mb={4}>Platforms</Heading>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Platform</Th>
                  <Th isNumeric>Tokens w/ Overrides</Th>
                </Tr>
              </Thead>
              <Tbody>
                {platformStats.map(p => (
                  <Tr key={p.platformId}>
                    <Td>{p.platformName}</Td>
                    <Td isNumeric>{p.count}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </SimpleGrid>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
          {/* Themes Section */}
          <Box p={6} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
            <Heading size="md" mb={4}>Themes</Heading>
            <Stat>
              <StatLabel>Total Themes</StatLabel>
              <StatNumber>{themeStats.totalThemes}</StatNumber>
            </Stat>
            <Divider my={4} />
            <Heading size="sm" mb={2}>Theme Overrides</Heading>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Theme</Th>
                  <Th isNumeric>% Tokens w/ Override</Th>
                </Tr>
              </Thead>
              <Tbody>
                {themeStats.themeOverrides.map(t => (
                  <Tr key={t.themeId}>
                    <Td>{t.themeName}</Td>
                    <Td isNumeric>{t.percentWithOverride}%</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          {/* Releases Section */}
          <Box p={6} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
            <Heading size="md" mb={4}>Releases</Heading>
            <VStack align="start" spacing={2}>
              <Text><b>Latest Version:</b> {latestRelease.version}</Text>
              <Text><b>Date:</b> {latestRelease.date}</Text>
              <Tag colorScheme="gray">Placeholder</Tag>
            </VStack>
          </Box>
        </SimpleGrid>
        {/* Latest Activity Section */}
        <Box p={6} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
          <Heading size="md" mb={4}>Latest Activity</Heading>
          <VStack align="start" spacing={2}>
            {recentActivity.map(item => (
              <HStack key={item.id} spacing={4}>
                <Text>{item.description}</Text>
                <Text color="gray.500" fontSize="sm">{item.date}</Text>
              </HStack>
            ))}
            <Tag colorScheme="gray">Placeholder</Tag>
          </VStack>
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardView; 