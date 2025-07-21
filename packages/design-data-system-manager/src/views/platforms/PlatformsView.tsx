import React, { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  Spinner,
  Center
} from '@chakra-ui/react';
import { RepositoryManager } from '../../components/RepositoryManager';
import { PlatformAnalytics } from '../../components/PlatformAnalytics';
import { PlatformExportSettings } from '../../components/PlatformExportSettings';

// Mock data for demonstration - in real implementation this would come from the MultiRepositoryManager
const mockRepositoryLinks = [
  {
    id: 'core-1',
    type: 'core' as const,
    repositoryUri: 'design-system/core-data',
    branch: 'main',
    filePath: 'schema.json',
    status: 'synced' as const,
    lastSync: new Date().toISOString()
  },
  {
    id: 'platform-ios-1',
    type: 'platform-extension' as const,
    repositoryUri: 'ios-team/design-tokens-ios',
    branch: 'main',
    filePath: 'platform-extension.json',
    platformId: 'platform-ios',
    status: 'synced' as const,
    lastSync: new Date().toISOString()
  }
];

const mockAnalytics = {
  totalTokens: 150,
  overriddenTokens: 25,
  newTokens: 10,
  omittedTokens: 5,
  platformCount: 2,
  themeCount: 1
};

const mockPlatformExtensions = [
  {
    platformId: 'platform-ios',
    isValid: true,
    errors: [],
    warnings: []
  },
  {
    platformId: 'platform-web',
    isValid: false,
    errors: ['System ID mismatch: extension has "different-system", core has "design-system-core"'],
    warnings: ['Platform ID should follow the pattern "platform-{name}"']
  }
];

export const PlatformsView: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLinkRepository = async (link: {
    type: 'core' | 'platform-extension' | 'theme-override';
    repositoryUri: string;
    branch: string;
    filePath: string;
    platformId?: string;
    themeId?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In real implementation, this would call MultiRepositoryManager.linkRepository
      console.log('Linking repository:', link);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock success
      console.log('Repository linked successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlinkRepository = (linkId: string) => {
    // In real implementation, this would call MultiRepositoryManager.unlinkRepository
    console.log('Unlinking repository:', linkId);
  };

  const handleRefreshRepository = async (linkId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In real implementation, this would call MultiRepositoryManager.refreshRepository
      console.log('Refreshing repository:', linkId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Repository refreshed successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh repository');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Center py={20}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading platform data...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>Platform Management</Heading>
          <Text color="gray.600">
            Manage platform extensions, link repositories, and view analytics for your distributed design system.
          </Text>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Main Content */}
        <Tabs variant="enclosed">
          <TabList>
            <Tab>Repository Management</Tab>
            <Tab>Analytics</Tab>
            <Tab>Platform Settings</Tab>
          </TabList>

          <TabPanels>
            {/* Repository Management Tab */}
            <TabPanel>
              <RepositoryManager
                linkedRepositories={mockRepositoryLinks}
                onLinkRepository={handleLinkRepository}
                onUnlinkRepository={handleUnlinkRepository}
                onRefreshRepository={handleRefreshRepository}
              />
            </TabPanel>

            {/* Analytics Tab */}
            <TabPanel>
              <PlatformAnalytics
                analytics={mockAnalytics}
                platformExtensions={mockPlatformExtensions}
                hasCoreData={true}
              />
            </TabPanel>

            {/* Platform Settings Tab */}
            <TabPanel>
              <PlatformExportSettings
                platformId="platform-ios"
                platformName="iOS"
                syntaxPatterns={{
                  prefix: '$',
                  suffix: '',
                  delimiter: '_',
                  capitalization: 'none'
                }}
                valueFormatters={{
                  colorFormat: 'hex',
                  dimensionUnit: 'pt',
                  numberPrecision: 2
                }}
                onSave={(settings) => {
                  console.log('Saving platform settings:', settings);
                }}
                onReset={() => {
                  console.log('Resetting platform settings');
                }}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
}; 