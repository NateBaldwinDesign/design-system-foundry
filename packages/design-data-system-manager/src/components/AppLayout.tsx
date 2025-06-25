import React, { useState, useEffect, useRef } from 'react';
import { Box, Flex, useColorMode } from '@chakra-ui/react';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { StorageService } from '../services/storage';
import type { GitHubUser } from '../config/github';

interface DataSourceOption {
  label: string;
  value: string;
  hasAlgorithms: boolean;
}

interface AppLayoutProps {
  dataSource: string;
  setDataSource: (source: string) => void;
  dataOptions: DataSourceOption[];
  onResetData: () => void;
  onExportData: () => void;
  isGitHubConnected?: boolean;
  githubUser?: GitHubUser | null;
  selectedRepoInfo?: {
    fullName: string;
    branch: string;
    filePath: string;
    fileType: 'schema' | 'theme-override';
  } | null;
  onGitHubConnect?: () => Promise<void>;
  onGitHubDisconnect?: () => void;
  onFileSelected?: (fileContent: Record<string, unknown>, fileType: 'schema' | 'theme-override') => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  dataSource,
  setDataSource,
  dataOptions,
  onResetData,
  onExportData,
  isGitHubConnected = false,
  githubUser,
  selectedRepoInfo,
  onGitHubConnect,
  onGitHubDisconnect,
  onFileSelected,
  children,
}: AppLayoutProps) => {
  const { colorMode } = useColorMode();
  const [hasChanges, setHasChanges] = useState(false);
  const [changeCount, setChangeCount] = useState(0);
  const baselineRef = useRef<Record<string, unknown>>({});
  const isInitializedRef = useRef(false);

  // Helper function to get current data from StorageService
  const getCurrentData = () => {
    return {
      tokens: StorageService.getTokens(),
      collections: StorageService.getCollections(),
      modes: StorageService.getModes(),
      resolvedValueTypes: StorageService.getValueTypes(),
      dimensions: StorageService.getDimensions(),
      dimensionOrder: StorageService.getDimensionOrder(),
      platforms: StorageService.getPlatforms(),
      themes: StorageService.getThemes(),
      taxonomies: StorageService.getTaxonomies(),
      namingRules: StorageService.getNamingRules(),
      algorithms: StorageService.getAlgorithms(),
      algorithmFile: StorageService.getAlgorithmFile(),
    };
  };

  // Helper function to convert baseline data to the format expected by ChangeLog
  const getBaselineData = () => {
    const baseline = baselineRef.current;
    return {
      tokens: baseline['token-model:tokens'] as unknown[] || [],
      collections: baseline['token-model:collections'] as unknown[] || [],
      modes: baseline['token-model:modes'] as unknown[] || [],
      resolvedValueTypes: baseline['token-model:value-types'] as unknown[] || [],
      dimensions: baseline['token-model:dimensions'] as unknown[] || [],
      dimensionOrder: baseline['token-model:dimension-order'] as unknown[] || [],
      platforms: baseline['token-model:platforms'] as unknown[] || [],
      themes: baseline['token-model:themes'] as unknown[] || [],
      taxonomies: baseline['token-model:taxonomies'] as unknown[] || [],
      namingRules: baseline['token-model:naming-rules'] as Record<string, unknown> || {},
      algorithms: baseline['token-model:algorithms'] as unknown[] || [],
      algorithmFile: baseline['token-model:algorithm-file'] as Record<string, unknown> || null,
    };
  };

  // Track changes by monitoring localStorage for modifications
  useEffect(() => {
    const STORAGE_KEYS = [
      'token-model:tokens',
      'token-model:collections',
      'token-model:modes',
      'token-model:value-types',
      'token-model:dimensions',
      'token-model:dimension-order',
      'token-model:platforms',
      'token-model:themes',
      'token-model:taxonomies',
      'token-model:naming-rules',
      'token-model:algorithms',
      'token-model:algorithm-file'
    ];

    const establishBaseline = () => {
      const baseline: Record<string, unknown> = {};
      STORAGE_KEYS.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            baseline[key] = JSON.parse(data);
          } catch (e) {
            baseline[key] = data;
          }
        } else {
          baseline[key] = null;
        }
      });
      baselineRef.current = baseline;
      isInitializedRef.current = true;
    };

    const checkForChanges = () => {
      if (!isInitializedRef.current) {
        establishBaseline();
        return;
      }

      try {
        let totalChanges = 0;
        let hasAnyChanges = false;

        STORAGE_KEYS.forEach(key => {
          const currentData = localStorage.getItem(key);
          const baselineData = baselineRef.current[key];

          // Parse current data
          let currentParsed: unknown = null;
          if (currentData) {
            try {
              currentParsed = JSON.parse(currentData);
            } catch (e) {
              currentParsed = currentData;
            }
          }

          // Compare with baseline
          if (JSON.stringify(currentParsed) !== JSON.stringify(baselineData)) {
            hasAnyChanges = true;
            
            // Count changes based on data type
            if (Array.isArray(currentParsed) && Array.isArray(baselineData)) {
              // For arrays, count added/removed items
              const added = currentParsed.filter((item: { id?: string }) => 
                !baselineData.some((baselineItem: { id?: string }) => 
                  baselineItem.id === item.id
                )
              );
              const removed = baselineData.filter((item: { id?: string }) => 
                !currentParsed.some((currentItem: { id?: string }) => 
                  currentItem.id === item.id
                )
              );
              totalChanges += added.length + removed.length;
            } else if (currentParsed !== baselineData) {
              // For non-arrays, count as 1 change
              totalChanges += 1;
            }
          }
        });

        setHasChanges(hasAnyChanges);
        setChangeCount(totalChanges);
      } catch (error) {
        console.error('Error checking for changes:', error);
      }
    };

    // Establish baseline on first load
    establishBaseline();

    // Set up an interval to check for changes periodically
    const interval = setInterval(checkForChanges, 2000);

    // Listen for storage events (when localStorage changes in other tabs)
    const handleStorageChange = () => {
      checkForChanges();
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <Flex h="100vh" overflow="hidden">
      <AppSidebar />
      <Flex flex="1" direction="column" overflow="hidden">
        <Header 
          hasChanges={hasChanges} 
          changeCount={changeCount}
          getCurrentData={getCurrentData}
          getBaselineData={getBaselineData}
          dataSource={dataSource}
          setDataSource={setDataSource}
          dataOptions={dataOptions}
          onResetData={onResetData}
          onExportData={onExportData}
          isGitHubConnected={isGitHubConnected}
          githubUser={githubUser}
          selectedRepoInfo={selectedRepoInfo}
          onGitHubConnect={onGitHubConnect}
          onGitHubDisconnect={onGitHubDisconnect}
          onFileSelected={onFileSelected}
        />
        <Box flex="1" overflow="auto" p={4} bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}; 