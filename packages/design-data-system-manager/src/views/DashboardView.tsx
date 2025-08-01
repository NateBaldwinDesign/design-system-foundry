import React, { useState, useEffect } from 'react';
import { Box, Heading, SimpleGrid, Stat, StatLabel, StatNumber, StatHelpText, Divider, VStack, HStack, Text, Table, Thead, Tbody, Tr, Th, Td, Tag, useColorMode, Spinner, Alert, AlertIcon, Tooltip, Badge, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { getTokenStats, getPlatformExtensionStats, getThemeStats, getLatestRelease, getRecentActivity } from '../utils/dashboardStats';
import type { Platform, Theme, ComponentCategory, ComponentProperty, Component } from '@token-model/data-model';
import type { ExtendedToken } from '../components/TokenEditorDialog';
import type { GitHubUser } from '../config/github';
import type { PlatformExtensionAnalyticsSummary } from '../services/platformExtensionAnalyticsService';
import type { DataSourceContext } from '../services/dataSourceManager';
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
  const [platformExtensionStats, setPlatformExtensionStats] = useState<PlatformExtensionAnalyticsSummary | null>(null);
  const [loadingPlatformStats, setLoadingPlatformStats] = useState(false);
  const [platformStatsError, setPlatformStatsError] = useState<string | null>(null);
  
  const tokenStats = getTokenStats(tokens);
  const themeStats = getThemeStats(themes);
  const latestRelease = getLatestRelease();
  const recentActivity = getRecentActivity();

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
    const loadPlatformExtensionStats = async () => {
      if (platforms.length === 0) return;
      
      setLoadingPlatformStats(true);
      setPlatformStatsError(null);
      
      try {
        // Add a small delay to allow for pre-loading to complete
        // This ensures that if DataManager is still pre-loading, we give it time
        await new Promise(resolve => setTimeout(resolve, 100));
        
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
        
        {/* Data Source Context Indicator */}
        {dataSourceContext && (dataSourceContext.currentPlatform || dataSourceContext.currentTheme) && (
          <Box p={4} borderWidth={1} borderRadius="md" bg="chakra-body-bg" mb={6}>
            <HStack spacing={4} align="center">
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Current Data Source:
              </Text>
              
              {dataSourceContext.currentPlatform && dataSourceContext.currentPlatform !== 'none' && (
                <HStack spacing={2}>
                  <Monitor size={16} />
                  <Badge colorScheme="blue" variant="subtle">
                    {dataSourceContext.availablePlatforms.find(p => p.id === dataSourceContext.currentPlatform)?.displayName || dataSourceContext.currentPlatform}
                  </Badge>
                </HStack>
              )}
              
              {dataSourceContext.currentTheme && dataSourceContext.currentTheme !== 'none' && (
                <HStack spacing={2}>
                  <Palette size={16} />
                  <Badge colorScheme="purple" variant="subtle">
                    {dataSourceContext.availableThemes.find(t => t.id === dataSourceContext.currentTheme)?.displayName || dataSourceContext.currentTheme}
                  </Badge>
                </HStack>
              )}
              
              {(!dataSourceContext.currentPlatform || dataSourceContext.currentPlatform === 'none') && 
               (!dataSourceContext.currentTheme || dataSourceContext.currentTheme === 'none') && (
                <Badge colorScheme="gray" variant="subtle">
                  Core Data
                </Badge>
              )}
            </HStack>
          </Box>
        )}
        
        {/* Platform Extension Analytics Section */}
        {platformStatsError && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {platformStatsError}
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