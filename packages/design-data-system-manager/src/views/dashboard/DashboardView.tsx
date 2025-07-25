import React, { useState, useEffect } from 'react';
import { Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Divider, VStack, HStack, Text, Table, Thead, Tbody, Tr, Th, Td, Tag, useColorMode, Spinner, Alert, Tooltip } from '@chakra-ui/react';
import { getTokenStats, getPlatformExtensionStats, getThemeStats, getLatestRelease, getRecentActivity } from '../../utils/dashboardStats';
import type { Platform, Theme } from '@token-model/data-model';
import type { ExtendedToken } from '../../components/TokenEditorDialog';
import type { GitHubUser } from '../../config/github';
import type { PlatformExtensionAnalyticsSummary } from '../../services/platformExtensionAnalyticsService';
import { WarningTwoIcon } from '@chakra-ui/icons';
import { TriangleAlert } from 'lucide-react';

interface DashboardViewProps {
  tokens: ExtendedToken[];
  platforms: Platform[];
  themes: Theme[];
  githubUser: GitHubUser | null;
}

const DashboardView: React.FC<DashboardViewProps> = ({ tokens, platforms, themes, githubUser }) => {
  const { colorMode } = useColorMode();
  const [platformExtensionStats, setPlatformExtensionStats] = useState<PlatformExtensionAnalyticsSummary | null>(null);
  const [loadingPlatformStats, setLoadingPlatformStats] = useState(false);
  const [platformStatsError, setPlatformStatsError] = useState<string | null>(null);
  
  const tokenStats = getTokenStats(tokens);
  const themeStats = getThemeStats(themes);
  const latestRelease = getLatestRelease();
  const recentActivity = getRecentActivity();

  // Load platform extension analytics
  useEffect(() => {
    const loadPlatformExtensionStats = async () => {
      if (platforms.length === 0) return;
      
      setLoadingPlatformStats(true);
      setPlatformStatsError(null);
      
      try {
        const stats = await getPlatformExtensionStats(platforms);
        setPlatformExtensionStats(stats);
      } catch (error) {
        setPlatformStatsError(error instanceof Error ? error.message : 'Failed to load platform extension stats');
      } finally {
        setLoadingPlatformStats(false);
      }
    };

    loadPlatformExtensionStats();
  }, [platforms]);

  // Get the user's first name from GitHub user data
  const getWelcomeMessage = () => {
    if (githubUser && githubUser.name) {
      const firstName = githubUser.name.split(' ')[0];
      return `Welcome, ${firstName}`;
    }
    return 'Dashboard';
  };

  const [errorAnnouncement, setErrorAnnouncement] = React.useState<string>('');

  React.useEffect(() => {
    if (platformExtensionStats?.platformAnalytics) {
      const errorPlatform = platformExtensionStats.platformAnalytics.find(p => p.hasError);
      if (errorPlatform) {
        setErrorAnnouncement(
          `${errorPlatform.platformName}: ${errorPlatform.errorMessage || 'File or repository is not found'}`
        );
      } else {
        setErrorAnnouncement('');
      }
    }
  }, [platformExtensionStats]);

  return (
    <Box p={0} borderWidth={0} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}>
      <Box p={8}>
        <Heading size="xl" mb={8}>{getWelcomeMessage()}</Heading>
        
        {/* Platform Extension Analytics Section */}
        {platformStatsError && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {platformStatsError}
          </Alert>
        )}
        
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
          
          {/* Platform Extensions Section */}
          <Box p={6} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
            <Heading size="md" mb={4}>Platform Extensions</Heading>
            {loadingPlatformStats ? (
              <VStack spacing={4}>
                <Spinner />
                <Text fontSize="sm" color="gray.500">Loading platform extension analytics...</Text>
              </VStack>
            ) : platformExtensionStats ? (
              <VStack align="start" spacing={4}>
                <SimpleGrid columns={2} spacing={4} width="100%">
                  <Stat>
                    <StatLabel>Platforms with Extensions</StatLabel>
                    <StatNumber>{platformExtensionStats.platformsWithExtensions}</StatNumber>
                    <StatHelpText>of {platformExtensionStats.totalPlatforms} total</StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Total Token Overrides</StatLabel>
                    <StatNumber>{platformExtensionStats.totalTokenOverrides}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Algorithm Overrides</StatLabel>
                    <StatNumber>{platformExtensionStats.totalAlgorithmOverrides}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Omitted Items</StatLabel>
                    <StatNumber>{platformExtensionStats.totalOmittedModes + platformExtensionStats.totalOmittedDimensions}</StatNumber>
                    <StatHelpText>Modes: {platformExtensionStats.totalOmittedModes}, Dimensions: {platformExtensionStats.totalOmittedDimensions}</StatHelpText>
                  </Stat>
                </SimpleGrid>
                
                {platformExtensionStats.platformAnalytics.length > 0 && (
                  <>
                    <Divider />
                    <Text fontSize="sm" fontWeight="bold">Platform Details</Text>
                    <Table size="sm" variant="simple" width="100%">
                      <Thead>
                        <Tr>
                          <Th>Platform</Th>
                          <Th>Version</Th>
                          <Th isNumeric>Token Overrides</Th>
                          <Th isNumeric>Algorithm Overrides</Th>
                          <Th isNumeric>Omitted</Th>
                          <Th>Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {platformExtensionStats.platformAnalytics.map(platform => (
                          <Tr key={platform.platformId}>
                            <Td>
                              <HStack spacing={2}>
                                <Text>{platform.platformName}</Text>
                                {platform.hasError && (
                                  <Tooltip
                                    label={platform.errorMessage || 'File or repository is not found'}
                                    aria-label={`Error for ${platform.platformName}: ${platform.errorMessage || 'File or repository is not found'}`}
                                    hasArrow
                                    placement="top"
                                  >
                                    <Text as="span" color="red.500" fontWeight="bold" aria-live="polite" aria-label={`Error: ${platform.errorMessage || 'File or repository is not found'}`}
                                      tabIndex={0} // for keyboard accessibility
                                      ml={1}
                                    >
                                      <TriangleAlert size={14} />
                                    </Text>
                                  </Tooltip>
                                )}
                              </HStack>
                            </Td>
                            <Td>{platform.hasError ? '-' : (platform.version || 'N/A')}</Td>
                            <Td isNumeric>{platform.hasError ? '-' : platform.tokenOverridesCount}</Td>
                            <Td isNumeric>{platform.hasError ? '-' : platform.algorithmVariableOverridesCount}</Td>
                            <Td isNumeric>{platform.hasError ? '-' : (platform.omittedModesCount + platform.omittedDimensionsCount)}</Td>
                            <Td>
                              {platform.hasError ? (
                                <Tag colorScheme="red" size="sm">Not found</Tag>
                              ) : (
                                <Tag colorScheme="green" size="sm">OK</Tag>
                              )}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </>
                )}
              </VStack>
            ) : (
              <Text fontSize="sm" color="gray.500">No platform extension data available</Text>
            )}
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
        
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
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
      {/* Add an aria-live region for a11y error announcement */}
      {platformExtensionStats?.platformAnalytics.some(p => p.hasError) && (
        <Box position="absolute" width={0} height={0} overflow="hidden" aria-live="polite">
          {platformExtensionStats.platformAnalytics.filter(p => p.hasError).map(p => (
            <span key={p.platformId}>{`Error for ${p.platformName}: ${p.errorMessage || 'File or repository is not found'}`}</span>
          ))}
        </Box>
      )}
      <div aria-live="polite" style={{ position: 'absolute', left: '-9999px', height: '1px', width: '1px', overflow: 'hidden' }}>
        {errorAnnouncement}
      </div>
    </Box>
  );
};

export default DashboardView; 