import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Flex, useColorMode } from '@chakra-ui/react';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { StorageService } from '../services/storage';
import type { GitHubUser } from '../config/github';
import type { ViewId } from '../hooks/useViewState';
import { DataManager, type DataSnapshot } from '../services/dataManager';

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
  currentView: ViewId;
  onNavigate: (viewId: ViewId) => void;
  children: React.ReactNode;
}

// Custom event for data changes
const DATA_CHANGE_EVENT = 'token-model:data-change';

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
  currentView,
  onNavigate,
  children,
}: AppLayoutProps) => {
  const { colorMode } = useColorMode();
  const [hasChanges, setHasChanges] = useState(false);
  const [changeCount, setChangeCount] = useState(0);
  const [currentData, setCurrentData] = useState<Record<string, unknown> | null>(null);
  const [baselineData, setBaselineData] = useState<Record<string, unknown> | null>(null);
  const baselineRef = useRef<Record<string, unknown>>({});
  const isInitializedRef = useRef(false);
  const lastSourceDataRef = useRef<Record<string, unknown> | null>(null);

  // Stable function to get current data from StorageService
  const getCurrentData = useCallback(() => {
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
  }, []);

  // Helper function to detect if data represents a new source
  const isNewDataSource = useCallback((currentData: Record<string, unknown> | null | undefined, lastSourceData: Record<string, unknown> | null): boolean => {
    if (!lastSourceData) return true;
    if (!currentData) return false;
    
    // Compare key data arrays to detect significant changes that indicate a new source
    const keyFields = ['tokens', 'collections', 'dimensions', 'themes', 'resolvedValueTypes'];
    
    for (const field of keyFields) {
      const current = currentData[field] as unknown[] | undefined;
      const last = lastSourceData[field] as unknown[] | undefined;
      
      // If either is undefined but the other isn't, it's a new source
      if ((!current && last) || (current && !last)) return true;
      
      // If both exist, check if they're significantly different
      if (current && last) {
        // If the arrays have very different lengths, it's likely a new source
        if (Math.abs(current.length - last.length) > 5) return true;
        
        // If more than 50% of items are different, it's likely a new source
        const currentIds = new Set(current.map((item: unknown) => {
          const obj = item as Record<string, unknown>;
          return obj?.id as string;
        }).filter(Boolean));
        const lastIds = new Set(last.map((item: unknown) => {
          const obj = item as Record<string, unknown>;
          return obj?.id as string;
        }).filter(Boolean));
        
        const uniqueToCurrent = currentIds.size - Array.from(currentIds).filter(id => lastIds.has(id)).length;
        const uniqueToLast = lastIds.size - Array.from(lastIds).filter(id => currentIds.has(id)).length;
        const totalUnique = uniqueToCurrent + uniqueToLast;
        const totalItems = Math.max(currentIds.size, lastIds.size);
        
        if (totalItems > 0 && (totalUnique / totalItems) > 0.5) return true;
      }
    }
    
    return false;
  }, []);

  // Change detection function
  const checkForChanges = useCallback(() => {
    if (!isInitializedRef.current) {
      // Initialize on first call
      const currentDataSnapshot = getCurrentData();
      setCurrentData(currentDataSnapshot);
      setBaselineData(currentDataSnapshot);
      baselineRef.current = currentDataSnapshot;
      isInitializedRef.current = true;
      lastSourceDataRef.current = currentDataSnapshot;
      
      // Reset change tracking when baseline is established
      setHasChanges(false);
      setChangeCount(0);
      return;
    }

    // Get current data and check if it represents a new source
    const currentDataSnapshot = getCurrentData();
    
    // Check if this is a new data source
    if (isNewDataSource(currentDataSnapshot, lastSourceDataRef.current)) {
      // Reset baseline for new data source
      setCurrentData(currentDataSnapshot);
      setBaselineData(currentDataSnapshot);
      baselineRef.current = currentDataSnapshot;
      lastSourceDataRef.current = currentDataSnapshot;
      
      // Reset change tracking when baseline is established
      setHasChanges(false);
      setChangeCount(0);
      return;
    }

    // Update current data state
    setCurrentData(currentDataSnapshot);

    // Compare with baseline
    const baselineSnapshot = baselineRef.current;
    const hasAnyChanges = JSON.stringify(currentDataSnapshot) !== JSON.stringify(baselineSnapshot);
    
    if (hasAnyChanges) {
      // Count changes by comparing arrays
      let totalChanges = 0;
      const keyFields = ['tokens', 'collections', 'dimensions', 'themes', 'resolvedValueTypes', 'taxonomies', 'algorithms', 'platforms'];
      
      keyFields.forEach(field => {
        const current = (currentDataSnapshot as Record<string, unknown>)[field] as unknown[] || [];
        const baseline = (baselineSnapshot as Record<string, unknown>)[field] as unknown[] || [];
        
        if (Array.isArray(current) && Array.isArray(baseline)) {
          const currentIds = new Set(current.map((item: unknown) => {
            const obj = item as Record<string, unknown>;
            return obj?.id as string;
          }).filter(Boolean));
          const baselineIds = new Set(baseline.map((item: unknown) => {
            const obj = item as Record<string, unknown>;
            return obj?.id as string;
          }).filter(Boolean));
          
          // Count added items
          const added = Array.from(currentIds).filter(id => !baselineIds.has(id)).length;
          // Count removed items
          const removed = Array.from(baselineIds).filter(id => !currentIds.has(id)).length;
          
          // Count modified items (items that exist in both but have different content)
          const commonIds = Array.from(currentIds).filter(id => baselineIds.has(id));
          let modified = 0;
          commonIds.forEach(id => {
            const currentItem = current.find((item: unknown) => {
              const obj = item as Record<string, unknown>;
              return obj?.id === id;
            });
            const baselineItem = baseline.find((item: unknown) => {
              const obj = item as Record<string, unknown>;
              return obj?.id === id;
            });
            if (currentItem && baselineItem && JSON.stringify(currentItem) !== JSON.stringify(baselineItem)) {
              modified++;
            }
          });
          
          totalChanges += added + removed + modified;
        }
      });
      
      setHasChanges(true);
      setChangeCount(totalChanges);
    } else {
      setHasChanges(false);
      setChangeCount(0);
    }
  }, [getCurrentData, isNewDataSource]);

  // Function to reset baseline for new data source
  const resetBaselineForNewSource = useCallback(() => {
    const currentDataSnapshot = getCurrentData();
    setCurrentData(currentDataSnapshot);
    setBaselineData(currentDataSnapshot);
    baselineRef.current = currentDataSnapshot;
    lastSourceDataRef.current = currentDataSnapshot;
    
    // Reset change tracking when baseline is established
    setHasChanges(false);
    setChangeCount(0);
  }, [getCurrentData]);

  // Initialize on mount only
  useEffect(() => {
    checkForChanges();
  }, []); // Empty dependency array - only run once on mount

  // Listen for custom data change events
  useEffect(() => {
    const handleDataChange = () => {
      // Check if this is a new data source by comparing with last known source
      const currentDataSnapshot = getCurrentData();
      if (isNewDataSource(currentDataSnapshot, lastSourceDataRef.current)) {
        // New data source - reset baseline
        resetBaselineForNewSource();
      } else {
        // Same data source - check for changes
        checkForChanges();
      }
    };

    window.addEventListener(DATA_CHANGE_EVENT, handleDataChange);
    return () => window.removeEventListener(DATA_CHANGE_EVENT, handleDataChange);
  }, [checkForChanges, resetBaselineForNewSource, getCurrentData, isNewDataSource]);

  // Listen for DataManager baseline updates (for GitHub save operations)
  useEffect(() => {
    const dataManager = DataManager.getInstance();
    
    const handleBaselineUpdated = (newBaseline: DataSnapshot) => {
      // Convert DataSnapshot to the format expected by AppLayout
      const baselineData = {
        tokenCollections: newBaseline.collections,
        dimensions: newBaseline.dimensions,
        tokens: newBaseline.tokens,
        platforms: newBaseline.platforms,
        themes: newBaseline.themes,
        taxonomies: newBaseline.taxonomies,
        resolvedValueTypes: newBaseline.resolvedValueTypes,
        algorithms: newBaseline.algorithms,
        namingRules: newBaseline.namingRules,
      };
      
      // Update AppLayout's baseline state
      setBaselineData(baselineData);
      baselineRef.current = baselineData;
      lastSourceDataRef.current = baselineData;
      
      // Reset change tracking since baseline is now current
      setHasChanges(false);
      setChangeCount(0);
    };

    // Register the callback
    dataManager.setCallbacks({ onBaselineUpdated: handleBaselineUpdated });
    
    return () => {
      // Clean up callback when component unmounts
      dataManager.setCallbacks({ onBaselineUpdated: undefined });
    };
  }, []);

  // Listen for storage events (when localStorage changes in other tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      checkForChanges();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkForChanges]);

  return (
    <Flex h="100vh" overflow="hidden">
      <AppSidebar currentView={currentView} onNavigate={onNavigate} />
      <Flex flex="1" direction="column" overflow="hidden">
        <Header 
          hasChanges={hasChanges} 
          changeCount={changeCount}
          currentData={currentData}
          baselineData={baselineData}
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

// Export the event name for use in other components
export { DATA_CHANGE_EVENT }; 