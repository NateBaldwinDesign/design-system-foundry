import React, { useState, useEffect, useMemo } from 'react';
import { Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Divider, VStack, HStack, Text, Table, Thead, Tbody, Tr, Th, Td, Tag, useColorMode, Spinner, Alert, AlertIcon, Tooltip, Badge, AlertTitle, AlertDescription, Button } from '@chakra-ui/react';
import { getTokenStats, getPlatformExtensionStats, getThemeStats, getLatestRelease, getRecentActivity } from '../utils/dashboardStats';
import type { Platform, Theme, ComponentCategory, ComponentProperty, Component } from '@token-model/data-model';
import type { ExtendedToken } from '../components/TokenEditorDialog';
import type { GitHubUser } from '../config/github';
import type { PlatformExtensionAnalyticsSummary } from '../services/platformExtensionAnalyticsService';
import type { ThemeAnalyticsSummary } from '../services/themeAnalyticsService';
import type { DataSourceContext } from '../services/dataSourceManager';
import { StorageService } from '../services/storage';
import { TriangleAlert, Monitor, Palette } from 'lucide-react';

interface DashboardViewProps {
  tokens: ExtendedToken[];
  platforms: Platform[];
  themes: Theme[];
  componentCategories: ComponentCategory[];
  componentProperties: ComponentProperty[];
  components: Component[];
  githubUser: GitHubUser | null;
  dataSourceContext?: DataSourceContext;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
  tokens, 
  platforms, 
  themes, 
  componentCategories,
  componentProperties,
  components,
  githubUser,
  dataSourceContext
}) => {
  const { colorMode } = useColorMode();
  
  // Get platforms from core data (always authoritative for platform analytics)
  const coreData = StorageService.getCoreData();
  
  // Create stable keys for memoization
  const corePlatformsKey = useMemo(() => {
    const corePlatforms = coreData?.platforms || [];
    return corePlatforms.map(p => p.id).sort().join(',');
  }, [coreData?.platforms]);
  
  const propsPlatformsKey = useMemo(() => {
    return platforms.map(p => p.id).sort().join(',');
  }, [platforms]);
  
  // Memoize platforms to prevent infinite re-renders
  const platformsForAnalytics = useMemo(() => {
    const platformsFromCore = coreData?.platforms || [];
    const result = platformsFromCore.length > 0 ? platformsFromCore : platforms;
    
    console.log('[DashboardView] useMemo platformsForAnalytics recalculated:', {
      platformsFromCoreLength: platformsFromCore.length,
      propsPlatformsLength: platforms.length,
      resultLength: result.length,
      resultPlatforms: result.map(p => ({ id: p.id, displayName: p.displayName })),
      coreDataExists: !!coreData,
      coreDataPlatformsExists: !!coreData?.platforms,
      corePlatformsKey,
      propsPlatformsKey
    });
    
    return result;
  }, [corePlatformsKey, propsPlatformsKey, coreData?.platforms?.length, platforms.length]);
  const [platformExtensionStats, setPlatformExtensionStats] = useState<PlatformExtensionAnalyticsSummary | null>(null);
  const [loadingPlatformStats, setLoadingPlatformStats] = useState(false);
  const [platformStatsError, setPlatformStatsError] = useState<string | null>(null);
  const [themeAnalyticsStats, setThemeAnalyticsStats] = useState<ThemeAnalyticsSummary | null>(null);
  const [loadingThemeStats, setLoadingThemeStats] = useState(false);
  const [themeStatsError, setThemeStatsError] = useState<string | null>(null);
  const [latestReleaseData, setLatestReleaseData] = useState<{
    version: string;
    date: string;
    sourceName: string;
    repositoryUrl: string;
    releaseUrl?: string;
  } | null>(null);
  const [recentActivityData, setRecentActivityData] = useState<{
    commits: Array<{
      id: number;
      sha: string;
      message: string;
      date: string;
      author: string;
      commitUrl: string;
    }>;
    sourceName: string;
    repositoryUrl: string;
  } | null>(null);
  const [loadingGitHubData, setLoadingGitHubData] = useState(false);
  const [gitHubDataError, setGitHubDataError] = useState<string | null>(null);
  
  const tokenStats = getTokenStats(tokens);

  // Component Registry Status
  const componentRegistryStatus = {
    counts: {
      categories: componentCategories.length,
      properties: componentProperties.length,
      components: components.length,
    },
    validation: {
      isValid: true, // This would be calculated from validation service
      errorCount: 0, // This would be calculated from validation service
    },
    recentChanges: {
      lastModified: new Date().toISOString(), // This would come from change tracking
      changeCount: 0, // This would come from change tracking
    },
  };

  // Calculate component property type distribution
  const propertyTypeStats = {
    boolean: componentProperties.filter(p => p.type === 'boolean').length,
    list: componentProperties.filter(p => p.type === 'list').length,
  };

  // Calculate components by category
  const componentsByCategory = componentCategories.map(category => ({
    categoryName: category.displayName,
    count: components.filter(c => c.componentCategoryId === category.id).length,
  }));

  // Load platform extension analytics
  useEffect(() => {
    console.log('[DashboardView] Platform analytics useEffect triggered:', {
      platformsForAnalyticsLength: platformsForAnalytics.length,
      platformsForAnalytics: platformsForAnalytics.map(p => ({ id: p.id, displayName: p.displayName })),
      coreDataPlatformsLength: coreData?.platforms?.length || 0,
      propsPlatformsLength: platforms.length
    });
    
    const loadPlatformExtensionStats = async () => {
      if (platformsForAnalytics.length === 0) {
        console.log('[DashboardView] No platforms for analytics, skipping load');
        return;
      }
      
      console.log('[DashboardView] Starting platform extension stats load...');
      setLoadingPlatformStats(true);
      setPlatformStatsError(null);
      
      try {
        // Add a small delay to allow for pre-loading to complete
        // This ensures that if DataManager is still pre-loading, we give it time
        console.log('[DashboardView] Waiting 100ms before loading stats...');
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('[DashboardView] Calling getPlatformExtensionStats...');
        const stats = await getPlatformExtensionStats(platformsForAnalytics);
        console.log('[DashboardView] Platform extension stats loaded successfully:', {
          totalPlatforms: stats.totalPlatforms,
          platformsWithExtensions: stats.platformsWithExtensions,
          platformAnalyticsCount: stats.platformAnalytics.length
        });
        setPlatformExtensionStats(stats);
      } catch (error) {
        console.error('[DashboardView] Failed to load platform extension stats:', error);
        setPlatformStatsError(error instanceof Error ? error.message : 'Failed to load platform extension stats');
      } finally {
        console.log('[DashboardView] Setting loadingPlatformStats to false');
        setLoadingPlatformStats(false);
      }
    };

    loadPlatformExtensionStats();
  }, [platformsForAnalytics]);

  // Load theme analytics
  useEffect(() => {
    const loadThemeAnalytics = async () => {
      if (themes.length === 0) return;
      
      setLoadingThemeStats(true);
      setThemeStatsError(null);
      
      try {
        // Add a small delay to allow for pre-loading to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const stats = await getThemeStats(themes, tokens);
        setThemeAnalyticsStats(stats);
      } catch (error) {
        setThemeStatsError(error instanceof Error ? error.message : 'Failed to load theme analytics');
      } finally {
        setLoadingThemeStats(false);
      }
    };

    loadThemeAnalytics();
  }, [themes, tokens]);

  // Load GitHub analytics (releases and commits)
  useEffect(() => {
    const loadGitHubAnalytics = async () => {
      if (!dataSourceContext) return;
      
      setLoadingGitHubData(true);
      setGitHubDataError(null);
      
      try {
        // Add a small delay to allow for pre-loading to complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const systemName = coreData?.systemName || 'Design System';
        
        const [releaseData, activityData] = await Promise.all([
          getLatestRelease(dataSourceContext, systemName),
          getRecentActivity(dataSourceContext, systemName)
        ]);
        
        setLatestReleaseData(releaseData);
        setRecentActivityData(activityData);
      } catch (error) {
        setGitHubDataError(error instanceof Error ? error.message : 'Failed to load GitHub analytics');
      } finally {
        setLoadingGitHubData(false);
      }
    };

    loadGitHubAnalytics();
  }, [dataSourceContext, coreData]);

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
        
        {/* Data Source Context Indicator */}
        {(() => {
          const urlParams = new URLSearchParams(window.location.search);
          const platformFromURL = urlParams.get('platform');
          const themeFromURL = urlParams.get('theme');
          
          if (platformFromURL || themeFromURL) {
            return (
              <Box p={4} borderWidth={1} borderRadius="md" bg="chakra-body-bg" mb={6}>
                <HStack spacing={4} align="center">
                  <Text fontSize="sm" fontWeight="medium" color="gray.600">
                    Current Data Source:
                  </Text>
                  
                  {platformFromURL && (
                    <HStack spacing={2}>
                      <Monitor size={16} />
                      <Badge colorScheme="blue" variant="subtle">
                        {platformsForAnalytics.find(p => p.id === platformFromURL)?.displayName || platformFromURL}
                      </Badge>
                    </HStack>
                  )}
                  
                  {themeFromURL && (
                    <HStack spacing={2}>
                      <Palette size={16} />
                      <Badge colorScheme="purple" variant="subtle">
                        {themes.find(t => t.id === themeFromURL)?.displayName || themeFromURL}
                      </Badge>
                    </HStack>
                  )}
                  
                  {!platformFromURL && !themeFromURL && (
                    <Badge colorScheme="gray" variant="subtle">
                      Core Data
                    </Badge>
                  )}
                </HStack>
              </Box>
            );
          }
          return null;
        })()}
        
        {/* Platform Extension Analytics Section */}
        {platformStatsError && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {platformStatsError}
          </Alert>
        )}
        
        {/* Theme Analytics Section */}
        {themeStatsError && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {themeStatsError}
          </Alert>
        )}
        
        {/* Private Repository Alert */}
        {platformExtensionStats?.platformAnalytics?.some(p => p.errorType === 'private-repository') && (
          <Alert status="info" mb={4}>
            <AlertIcon />
            <Box>
              <AlertTitle>Private Repositories Detected</AlertTitle>
              <AlertDescription>
                Some platform extensions are in private repositories. Sign in with GitHub to access them.
              </AlertDescription>
            </Box>
          </Alert>
        )}
        
        {/* Private Theme Repository Alert */}
        {themeAnalyticsStats?.themeAnalytics?.some(t => t.errorType === 'private-repository') && (
          <Alert status="info" mb={4}>
            <AlertIcon />
            <Box>
              <AlertTitle>Private Theme Repositories Detected</AlertTitle>
              <AlertDescription>
                Some theme overrides are in private repositories. Sign in with GitHub to access them.
              </AlertDescription>
            </Box>
          </Alert>
        )}
        
        {/* Main Dashboard Grid - Single SimpleGrid for responsive layout */}
        <SimpleGrid minChildWidth="550px" spacing={8} mb={8}>
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
            <Heading size="md" mb={4}>Platforms</Heading>
            {loadingPlatformStats ? (
              <VStack spacing={4}>
                <Spinner />
                <Text fontSize="sm" color="gray.500">Loading platform extension analytics...</Text>
                <Text fontSize="xs" color="gray.400">This may take a moment for external repositories</Text>
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
                                    label={
                                      platform.errorType === 'private-repository' 
                                        ? 'Private repository - sign in with GitHub to access'
                                        : platform.errorMessage || 'File or repository is not found'
                                    }
                                    aria-label={`Error for ${platform.platformName}: ${
                                      platform.errorType === 'private-repository' 
                                        ? 'Private repository - sign in with GitHub to access'
                                        : platform.errorMessage || 'File or repository is not found'
                                    }`}
                                    hasArrow
                                    placement="top"
                                  >
                                    <Text 
                                      as="span" 
                                      color={platform.errorType === 'private-repository' ? 'orange.500' : 'red.500'} 
                                      fontWeight="bold" 
                                      aria-live="polite" 
                                      aria-label={`Error: ${
                                        platform.errorType === 'private-repository' 
                                          ? 'Private repository - sign in with GitHub to access'
                                          : platform.errorMessage || 'File or repository is not found'
                                      }`}
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
                                <Tag 
                                  colorScheme={platform.errorType === 'private-repository' ? 'orange' : 'red'} 
                                  size="sm"
                                >
                                  {platform.errorType === 'private-repository' ? 'Private' : 'Not found'}
                                </Tag>
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
              <VStack spacing={2}>
                <Text fontSize="sm" color="gray.500">No platform extension data available</Text>
                <Text fontSize="xs" color="gray.400">Platform extensions are loaded from external repositories</Text>
              </VStack>
            )}
          </Box>
          
          {/* Themes Section */}
          <Box p={6} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
            <Heading size="md" mb={4}>Themes</Heading>
            {loadingThemeStats ? (
              <VStack spacing={4}>
                <Spinner />
                <Text fontSize="sm" color="gray.500">Loading theme analytics...</Text>
                <Text fontSize="xs" color="gray.400">This may take a moment for external repositories</Text>
              </VStack>
            ) : themeAnalyticsStats ? (
              <VStack align="start" spacing={4}>
                <SimpleGrid columns={2} spacing={4} width="100%">
                  <Stat>
                    <StatLabel>Total Themes</StatLabel>
                    <StatNumber>{themeAnalyticsStats.totalThemes}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Themes with Overrides</StatLabel>
                    <StatNumber>{themeAnalyticsStats.themesWithOverrides}</StatNumber>
                    <StatHelpText>of {themeAnalyticsStats.totalThemes} total</StatHelpText>
                  </Stat>
                  <Stat>
                    <StatLabel>Total Token Overrides</StatLabel>
                    <StatNumber>{themeAnalyticsStats.totalTokenOverrides}</StatNumber>
                  </Stat>
                  <Stat>
                    <StatLabel>Themeable Tokens in Core</StatLabel>
                    <StatNumber>{themeAnalyticsStats.themeableTokensInCore}</StatNumber>
                    <StatHelpText>Available for override</StatHelpText>
                  </Stat>
                </SimpleGrid>
                
                {themeAnalyticsStats.themeAnalytics.length > 0 && (
                  <>
                    <Divider />
                    <Text fontSize="sm" fontWeight="bold">Theme Details</Text>
                    <Table size="sm" variant="simple" width="100%">
                      <Thead>
                        <Tr>
                          <Th>Theme</Th>
                          <Th>Version</Th>
                          <Th isNumeric>Token Overrides</Th>
                          <Th isNumeric>% of Themeable</Th>
                          <Th>Status</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {themeAnalyticsStats.themeAnalytics.map(theme => (
                          <Tr key={theme.themeId}>
                            <Td>
                              <HStack spacing={2}>
                                <Text>{theme.themeName}</Text>
                                {theme.hasError && (
                                  <Tooltip
                                    label={
                                      theme.errorType === 'private-repository' 
                                        ? 'Private repository - sign in with GitHub to access'
                                        : theme.errorMessage || 'Theme override file not found'
                                    }
                                    aria-label={`Error for ${theme.themeName}: ${
                                      theme.errorType === 'private-repository' 
                                        ? 'Private repository - sign in with GitHub to access'
                                        : theme.errorMessage || 'Theme override file not found'
                                    }`}
                                    hasArrow
                                    placement="top"
                                  >
                                    <Text 
                                      as="span" 
                                      color={theme.errorType === 'private-repository' ? 'orange.500' : 'red.500'} 
                                      fontWeight="bold" 
                                      aria-live="polite" 
                                      aria-label={`Error: ${
                                        theme.errorType === 'private-repository' 
                                          ? 'Private repository - sign in with GitHub to access'
                                          : theme.errorMessage || 'Theme override file not found'
                                      }`}
                                      tabIndex={0}
                                      ml={1}
                                    >
                                      <TriangleAlert size={14} />
                                    </Text>
                                  </Tooltip>
                                )}
                              </HStack>
                            </Td>
                            <Td>{theme.hasError ? '-' : (theme.version || 'N/A')}</Td>
                            <Td isNumeric>{theme.hasError ? '-' : theme.tokenOverridesCount}</Td>
                            <Td isNumeric>{theme.hasError ? '-' : theme.percentOfThemeableTokens.toFixed(1)}%</Td>
                            <Td>
                              {theme.hasError ? (
                                <Tag 
                                  colorScheme={theme.errorType === 'private-repository' ? 'orange' : 'red'} 
                                  size="sm"
                                >
                                  {theme.errorType === 'private-repository' ? 'Private' : 'Not found'}
                                </Tag>
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
              <VStack spacing={2}>
                <Text fontSize="sm" color="gray.500">No theme analytics data available</Text>
                <Text fontSize="xs" color="gray.400">Theme overrides are loaded from external repositories</Text>
              </VStack>
            )}
          </Box>
          
          {/* Component Registry Section */}
          <Box p={6} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
            <Heading size="md" mb={4}>Component Registry</Heading>
            <SimpleGrid columns={2} spacing={4} mb={4}>
              <Stat>
                <StatLabel>Categories</StatLabel>
                <StatNumber>{componentRegistryStatus.counts.categories}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Properties</StatLabel>
                <StatNumber>{componentRegistryStatus.counts.properties}</StatNumber>
                <StatHelpText>
                  {propertyTypeStats.boolean} boolean, {propertyTypeStats.list} list
                </StatHelpText>
              </Stat>
              <Stat>
                <StatLabel>Components</StatLabel>
                <StatNumber>{componentRegistryStatus.counts.components}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Status</StatLabel>
                <StatNumber>
                  <Tag colorScheme={componentRegistryStatus.validation.isValid ? "green" : "red"} size="sm">
                    {componentRegistryStatus.validation.isValid ? "Valid" : "Invalid"}
                  </Tag>
                </StatNumber>
                {componentRegistryStatus.validation.errorCount > 0 && (
                  <StatHelpText>{componentRegistryStatus.validation.errorCount} errors</StatHelpText>
                )}
              </Stat>
            </SimpleGrid>
            
            {componentsByCategory.length > 0 && (
              <>
                <Divider my={4} />
                <Heading size="sm" mb={2}>Components by Category</Heading>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Category</Th>
                      <Th isNumeric>Components</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {componentsByCategory.map(category => (
                      <Tr key={category.categoryName}>
                        <Td>{category.categoryName}</Td>
                        <Td isNumeric>{category.count}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </>
            )}
          </Box>
          
          {/* Releases Section */}
          <Box p={6} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
            <Heading size="md" mb={4}>Releases</Heading>
            {loadingGitHubData ? (
              <VStack spacing={4}>
                <Spinner />
                <Text fontSize="sm" color="gray.500">Loading GitHub releases...</Text>
              </VStack>
            ) : gitHubDataError ? (
              <Alert status="error">
                <AlertIcon />
                {gitHubDataError}
              </Alert>
            ) : latestReleaseData ? (
              <VStack align="start" spacing={4}>
                <HStack spacing={2} align="center">
                  <Text fontSize="sm" fontWeight="medium" color="gray.600">
                    Source: {latestReleaseData.sourceName}
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => window.open(latestReleaseData.repositoryUrl, '_blank')}
                  >
                    View Repository
                  </Button>
                </HStack>
                
                <VStack align="start" spacing={2}>
                  <Text><b>Latest Version:</b> {latestReleaseData.version}</Text>
                  <Text><b>Date:</b> {latestReleaseData.date}</Text>
                  {latestReleaseData.releaseUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(latestReleaseData.releaseUrl!, '_blank')}
                    >
                      View Release
                    </Button>
                  )}
                </VStack>
              </VStack>
            ) : (
              <Text fontSize="sm" color="gray.500">No release data available</Text>
            )}
          </Box>
          
          {/* Latest Activity Section */}
          <Box p={6} borderWidth={1} borderRadius="md" bg="chakra-body-bg">
            <Heading size="md" mb={4}>Latest Activity</Heading>
            {loadingGitHubData ? (
              <VStack spacing={4}>
                <Spinner />
                <Text fontSize="sm" color="gray.500">Loading GitHub activity...</Text>
              </VStack>
            ) : gitHubDataError ? (
              <Alert status="error">
                <AlertIcon />
                {gitHubDataError}
              </Alert>
            ) : recentActivityData ? (
              <VStack align="start" spacing={4}>
                <HStack spacing={2} align="center">
                  <Text fontSize="sm" fontWeight="medium" color="gray.600">
                    Source: {recentActivityData.sourceName}
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => window.open(recentActivityData.repositoryUrl, '_blank')}
                  >
                    View Repository
                  </Button>
                </HStack>
                
                {recentActivityData.commits.length > 0 ? (
                  <VStack align="start" spacing={2} width="100%">
                    {recentActivityData.commits.map(commit => (
                      <HStack key={commit.id} spacing={4} width="100%" justify="space-between">
                        <VStack align="start" spacing={1} flex={1}>
                          <Text fontSize="sm" fontWeight="medium">
                            {commit.message}
                          </Text>
                          <HStack spacing={2}>
                            <Text fontSize="xs" color="gray.500">
                              {commit.author} • {commit.date}
                            </Text>
                            <Text fontSize="xs" color="gray.400" fontFamily="mono">
                              {commit.sha}
                            </Text>
                          </HStack>
                        </VStack>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => window.open(commit.commitUrl, '_blank')}
                        >
                          View
                        </Button>
                      </HStack>
                    ))}
                  </VStack>
                ) : (
                  <Text fontSize="sm" color="gray.500">No recent commits found</Text>
                )}
              </VStack>
            ) : (
              <Text fontSize="sm" color="gray.500">No activity data available</Text>
            )}
          </Box>
        </SimpleGrid>
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