import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Flex, useColorMode } from '@chakra-ui/react';
import { AppSidebar } from './AppSidebar';
import { Header } from './Header';
import { StorageService } from '../services/storage';
import type { GitHubUser } from '../config/github';
import type { ViewId } from '../hooks/useViewState';
import { DataManager, type DataSnapshot } from '../services/dataManager';
import type { DataSourceContext } from '../services/dataSourceManager';
import { ChangeTrackingService } from '../services/changeTrackingService';

interface DataSourceOption {
  label: string;
  value: string;
  hasAlgorithms: boolean;
}

interface AppLayoutProps {
  onResetData: () => void;
  onExportData: () => void;
  isGitHubConnected?: boolean;
  githubUser?: GitHubUser | null;
  selectedRepoInfo?: {
    fullName: string;
    branch: string;
    filePath: string;
    fileType: 'schema' | 'theme-override' | 'platform-extension';
  } | null;
  onGitHubConnect?: () => Promise<void>;
  onGitHubDisconnect?: () => void;
  onFileSelected?: (fileContent: Record<string, unknown>, fileType: 'schema' | 'theme-override' | 'platform-extension') => void;
  onRefreshData?: () => Promise<void>;
  currentView: ViewId;
  onNavigate: (viewId: ViewId) => void;
  children: React.ReactNode;
  // URL-based access props
  isViewOnlyMode?: boolean;
  urlRepoInfo?: {
    repo: string;
    path: string;
    branch: string;
  } | null;
  // Data source context props
  dataSourceContext?: DataSourceContext;
  onPlatformChange?: (platformId: string | null) => void;
  onThemeChange?: (themeId: string | null) => void;
  // Branch-based governance props
  isEditMode?: boolean;
  currentBranch?: string;
  editModeBranch?: string | null;
  onBranchCreated?: (branchName: string) => void;
  onEnterEditMode?: () => void;
  onExitEditMode?: () => void;
  // NEW: Edit context props
  editContext?: {
    isEditMode: boolean;
    sourceType: 'core' | 'platform-extension' | 'theme-override';
    sourceId: string | null;
    sourceName: string;
  };
  onSaveChanges?: () => void;
  onDiscardChanges?: () => void;
  pendingOverrides?: Array<{
    tokenId: string;
    tokenName: string;
    overrideType: 'platform' | 'theme';
    overrideSource: string;
  }>;
  // NEW: Unified edit permissions function
  hasEditPermissions?: () => boolean;
}

// Custom event for data changes
const DATA_CHANGE_EVENT = 'token-model:data-change';

export const AppLayout: React.FC<AppLayoutProps> = ({
  onResetData,
  onExportData,
  isGitHubConnected = false,
  githubUser,
  selectedRepoInfo,
  onGitHubConnect,
  onGitHubDisconnect,
  onFileSelected,
  onRefreshData,
  currentView,
  onNavigate,
  children,
  // URL-based access props
  isViewOnlyMode = false,
  urlRepoInfo = null,
  // Data source context props
  dataSourceContext,
  onPlatformChange,
  onThemeChange,
  // Branch-based governance props
  isEditMode = false,
  currentBranch = 'main',
  editModeBranch = null,
  onBranchCreated,
  onEnterEditMode,
  onExitEditMode,
  // NEW: Edit context props
  editContext,
  onSaveChanges,
  onDiscardChanges,
  pendingOverrides = [],
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
      dimensions: StorageService.getDimensions(),
      themes: StorageService.getThemes(),
      resolvedValueTypes: StorageService.getValueTypes(),
      componentProperties: StorageService.getComponentProperties(),
      componentCategories: StorageService.getComponentCategories(),
      components: StorageService.getComponents(),
      taxonomies: StorageService.getTaxonomies(),
      algorithms: StorageService.getAlgorithms(),
      platforms: StorageService.getPlatforms(),
    };
  }, []);

  // Helper function to detect if data represents a new source
  const isNewDataSource = useCallback((currentData: Record<string, unknown> | null | undefined, lastSourceData: Record<string, unknown> | null): boolean => {
    if (!lastSourceData) return true;
    if (!currentData) return false;
    
    // Compare key data arrays to detect significant changes that indicate a new source
    const keyFields = ['tokens', 'collections', 'dimensions', 'themes', 'resolvedValueTypes', 'componentProperties', 'componentCategories', 'components'];
    
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

    // Use ChangeTrackingService to get the total change count (includes override changes)
    const totalChanges = ChangeTrackingService.getChangeCount();
    
    if (totalChanges > 0) {
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
        taxonomyOrder: newBaseline.taxonomyOrder,
        dimensionOrder: newBaseline.dimensionOrder,
        componentProperties: newBaseline.componentProperties,
        componentCategories: newBaseline.componentCategories,
        components: newBaseline.components,
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
          onResetData={onResetData}
          onExportData={onExportData}
          isGitHubConnected={isGitHubConnected}
          githubUser={githubUser}
          selectedRepoInfo={selectedRepoInfo}
          onGitHubConnect={onGitHubConnect}
          onGitHubDisconnect={onGitHubDisconnect}
          onFileSelected={onFileSelected}
          onRefreshData={onRefreshData}
          isURLBasedAccess={isViewOnlyMode}
          urlRepoInfo={urlRepoInfo}
          dataSourceContext={dataSourceContext}
          onPlatformChange={onPlatformChange}
          onThemeChange={onThemeChange}
          // Branch-based governance props
          isEditMode={isEditMode}
          currentBranch={currentBranch}
          onBranchCreated={onBranchCreated}
          onEnterEditMode={onEnterEditMode}
          onExitEditMode={onExitEditMode}
          // NEW: Edit context props
          editContext={editContext}
          onSaveChanges={onSaveChanges}
          onDiscardChanges={onDiscardChanges}
          pendingOverrides={pendingOverrides}
        />
        <Box flex="1" overflow="auto"  bg={colorMode === 'dark' ? 'gray.900' : 'gray.50'}>
          {children}
        </Box>
      </Flex>
    </Flex>
  );
};

// Export the event name for use in other components
export { DATA_CHANGE_EVENT }; 