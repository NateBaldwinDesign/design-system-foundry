import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Box,
  useToast,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  AlertDescription,
  useColorMode,
  Badge,
  Spinner,
  InputGroup,
  InputRightElement,
  Heading,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select
} from '@chakra-ui/react';
import { PageTemplate } from '../components/PageTemplate';
import { Download, Copy, Eye, EyeOff, AlertTriangle, TestTube } from 'lucide-react';
import type { TokenSystem } from '@token-model/data-model';
import { FigmaExportService, FigmaExportResult } from '../services/figmaExport';
import { FigmaPrePublishDialog } from '../components/FigmaPrePublishDialog';
import { createSchemaJsonFromLocalStorage } from '../services/createJson';
import { ChangeTrackingService, ChangeTrackingState } from '../services/changeTrackingService';
import { FigmaConfigurationService } from '../services/figmaConfigurationService';
import { SyntaxPatternsEditor, SyntaxPatterns } from '../components/shared/SyntaxPatternsEditor';
import { StorageService } from '../services/storage';
import { CollectionsView } from './CollectionsView';
import type { DataSourceContext } from '../services/dataSourceManager';

import { FigmaConfigurationOverrideService } from '../services/figmaConfigurationOverrideService';
import { detectChanges } from '../components/ChangeLog';
import { DataMergerService } from '../services/dataMergerService';
import { DataSourceManager } from '../services/dataSourceManager';

interface FigmaConfigurationsViewProps {
  tokenSystem: TokenSystem;
  canEdit?: boolean;
  hasEditPermissions?: boolean;
  // NEW: Data source context for source-specific Figma configuration
  dataSourceContext?: DataSourceContext;
}

export const FigmaConfigurationsView: React.FC<FigmaConfigurationsViewProps> = ({ 
  tokenSystem,
  canEdit = false,
  hasEditPermissions = false,
  dataSourceContext
}) => {
  const { colorMode } = useColorMode();
  const toast = useToast();
  
  const [accessToken, setAccessToken] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [fileColorProfile, setFileColorProfile] = useState<'srgb' | 'display-p3'>('srgb');
  const [exportLoading, setExportLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [showPrePublishDialog, setShowPrePublishDialog] = useState(false);
  const [changeTrackingState, setChangeTrackingState] = useState<ChangeTrackingState | null>(null);
  const [checkingChanges, setCheckingChanges] = useState(true);
  const [exportResult, setExportResult] = useState<FigmaExportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [syntaxPatterns, setSyntaxPatterns] = useState<SyntaxPatterns>({
    prefix: '',
    suffix: '',
    delimiter: '_',
    capitalization: 'none',
    formatString: ''
  });

  /**
   * SAFETY FUNCTION: Force refresh all data before Figma operations
   * This ensures we always have the most up-to-date data regardless of state propagation issues
   */
  const forceRefreshDataForFigma = async (): Promise<TokenSystem> => {
    console.log('[FigmaConfigurationsView] 🔄 SAFETY: Force refreshing data before Figma operation...');
    
    // Force refresh the current source context
    const dataSourceManager = DataSourceManager.getInstance();
    await dataSourceManager.forceRefreshPermissions();
    
    // Get the fresh source context
    const freshSourceContext = StorageService.getSourceContext();
    console.log('[FigmaConfigurationsView] 🔄 Fresh source context:', freshSourceContext);
    
    // CRITICAL: Load Figma mappings data before any transformations
    console.log('[FigmaConfigurationsView] 🔄 Loading Figma mappings data...');
    try {
      // Import the FigmaMappingService dynamically to avoid circular dependencies
      const { FigmaMappingService } = await import('../services/figmaMappingService');
      
      // Load mappings for the current file key
      if (fileKey) {
        console.log('[FigmaConfigurationsView] 🔄 Loading mappings for file key:', fileKey);
        
        // First, try to get mapping from localStorage
        let mappings = FigmaMappingService.getMapping(fileKey);
        console.log('[FigmaConfigurationsView] 🔄 Local mappings:', {
          hasMappings: !!mappings,
          tempToRealIdCount: mappings?.tempToRealId ? Object.keys(mappings.tempToRealId).length : 0
        });
        
        // If no local mapping, try to load from GitHub
        if (!mappings) {
          console.log('[FigmaConfigurationsView] 🔄 No local mapping found, trying GitHub...');
          const repoInfo = await FigmaMappingService.getCurrentRepositoryInfo();
          
          if (repoInfo) {
            console.log('[FigmaConfigurationsView] 🔄 Loading from GitHub with repo info:', repoInfo);
            mappings = await FigmaMappingService.getMappingFromGitHub(fileKey, repoInfo);
            
            if (mappings) {
              console.log('[FigmaConfigurationsView] 🔄 GitHub mappings loaded:', {
                hasMappings: !!mappings,
                tempToRealIdCount: mappings?.tempToRealId ? Object.keys(mappings.tempToRealId).length : 0
              });
            } else {
              console.log('[FigmaConfigurationsView] 🔄 No GitHub mapping found either');
            }
          } else {
            console.log('[FigmaConfigurationsView] 🔄 No repository info available for GitHub loading');
          }
        }
        
        // Final verification of mappings
        console.log('[FigmaConfigurationsView] 🔄 Final mappings status:', {
          hasMappings: !!mappings,
          tempToRealIdCount: mappings?.tempToRealId ? Object.keys(mappings.tempToRealId).length : 0,
          fileKey: fileKey
        });
      } else {
        console.warn('[FigmaConfigurationsView] 🔄 No file key available, skipping mappings load');
      }
    } catch (error) {
      console.error('[FigmaConfigurationsView] 🔄 Failed to load Figma mappings:', error);
      // Continue with the operation even if mappings fail to load
    }
    
    // Force refresh the data based on current source type
    if (freshSourceContext?.sourceType === 'core' || !freshSourceContext) {
      console.log('[FigmaConfigurationsView] 🔄 Refreshing core data...');
      
      // Force refresh core data
      const coreData = StorageService.getCoreData();
      console.log('[FigmaConfigurationsView] 🔄 Core data refreshed:', {
        hasData: !!coreData,
        tokenCount: coreData?.tokens?.length || 0,
        dimensionOrder: coreData?.dimensionOrder
      });
      
      if (!coreData) {
        console.warn('[FigmaConfigurationsView] 🔄 No core data available after refresh, using fallback');
        const fallbackData = createSchemaJsonFromLocalStorage();
        return fallbackData;
      }
      
      // Ensure dimensionOrder is included
      if (!coreData.dimensionOrder || coreData.dimensionOrder.length === 0) {
        const dimensionOrder = StorageService.getDimensionOrder();
        if (dimensionOrder && dimensionOrder.length > 0) {
          console.log('[FigmaConfigurationsView] 🔄 Adding dimensionOrder from localStorage:', dimensionOrder);
          coreData.dimensionOrder = dimensionOrder;
        }
      }
      
      console.log('[FigmaConfigurationsView] 🔄 Core data ready for Figma:', {
        dimensionOrder: coreData.dimensionOrder,
        tokenCount: coreData.tokens?.length || 0
      });
      return coreData;
      
    } else {
      console.log('[FigmaConfigurationsView] 🔄 Refreshing merged data for:', {
        sourceType: freshSourceContext.sourceType,
        sourceId: freshSourceContext.sourceId
      });
      
      // Force refresh merged data
      const dataMerger = DataMergerService.getInstance();
      const mergedData = await dataMerger.computeMergedData();
      
      console.log('[FigmaConfigurationsView] 🔄 Merged data refreshed:', {
        hasData: !!mergedData,
        tokenCount: mergedData?.tokens?.length || 0,
        dimensionOrder: mergedData?.dimensionOrder
      });
      
      if (!mergedData) {
        console.warn('[FigmaConfigurationsView] 🔄 No merged data available after refresh, using core data fallback');
        const coreData = StorageService.getCoreData() || createSchemaJsonFromLocalStorage();
        return coreData;
      }
      
      console.log('[FigmaConfigurationsView] 🔄 Merged data ready for Figma:', {
        dimensionOrder: mergedData.dimensionOrder,
        tokenCount: mergedData.tokens?.length || 0
      });
      return mergedData;
    }
  };

  /**
   * Get the appropriate token system for Figma publishing based on current source context
   * For core data: use canonical schema-compliant data
   * For platform/theme data: use merged data (core + extensions/overrides)
   * 
   * @deprecated Use forceRefreshDataForFigma() instead for guaranteed fresh data
   */
  const getTokenSystemForFigma = async (): Promise<TokenSystem> => {
    const sourceContext = StorageService.getSourceContext();
    
    if (sourceContext?.sourceType === 'core' || !sourceContext) {
      // Core data - use pure core data, not merged data
      console.log('[FigmaConfigurationsView] Using core data for Figma publishing');
      const coreData = StorageService.getCoreData();
      
      if (!coreData) {
        console.warn('[FigmaConfigurationsView] No core data available, falling back to createSchemaJsonFromLocalStorage');
        const fallbackData = createSchemaJsonFromLocalStorage();
        console.log('[FigmaConfigurationsView] Fallback data dimensionOrder:', fallbackData.dimensionOrder);
        return fallbackData;
      }
      
      // Ensure dimensionOrder is included from localStorage if not present in coreData
      if (!coreData.dimensionOrder || coreData.dimensionOrder.length === 0) {
        const dimensionOrder = StorageService.getDimensionOrder();
        if (dimensionOrder && dimensionOrder.length > 0) {
          console.log('[FigmaConfigurationsView] Adding dimensionOrder from localStorage:', dimensionOrder);
          coreData.dimensionOrder = dimensionOrder;
        } else {
          console.warn('[FigmaConfigurationsView] No dimensionOrder found in localStorage either');
        }
      }
      
      console.log('[FigmaConfigurationsView] Core data dimensionOrder:', coreData.dimensionOrder);
      return coreData;
    } else {
      // Platform or theme source - use merged data
      console.log('[FigmaConfigurationsView] Using merged data for Figma publishing:', {
        sourceType: sourceContext.sourceType,
        sourceId: sourceContext.sourceId
      });
      
      const dataMerger = DataMergerService.getInstance();
      const mergedData = await dataMerger.computeMergedData();
      
      if (!mergedData) {
        console.warn('[FigmaConfigurationsView] Failed to compute merged data, falling back to core data');
        const coreData = StorageService.getCoreData() || createSchemaJsonFromLocalStorage();
        return coreData;
      }
      
      console.log('[FigmaConfigurationsView] Merged data dimensionOrder:', mergedData.dimensionOrder);
      return mergedData;
    }
  };

  // Get data for CollectionsView using new data management services
  const mergedData = StorageService.getMergedData();
  const collections = mergedData?.tokenCollections || [];
  const tokens = mergedData?.tokens || [];
  const resolvedValueTypes = mergedData?.resolvedValueTypes || [];

    // Load configuration and check change tracking state on mount
  useEffect(() => {
    const initializeSettings = async () => {
      setCheckingChanges(true);
      
      // ADD: Validate props match current context
      const currentSourceContext = StorageService.getSourceContext();
      if (dataSourceContext?.currentPlatform !== (currentSourceContext?.sourceType === 'platform' ? currentSourceContext?.sourceId : null) ||
          dataSourceContext?.currentTheme !== (currentSourceContext?.sourceType === 'theme' ? currentSourceContext?.sourceId : null)) {
        console.warn('[FigmaConfigurationsView] Props mismatch with current source context:', {
          propsPlatform: dataSourceContext?.currentPlatform,
          propsTheme: dataSourceContext?.currentTheme,
          currentSourceType: currentSourceContext?.sourceType,
          currentSourceId: currentSourceContext?.sourceId
        });
        // Continue with initialization but log the mismatch
      }
      
      // Initialize Figma configuration override session if in edit mode
      if (dataSourceContext?.editMode.isActive) {
        FigmaConfigurationOverrideService.initializeSession(dataSourceContext);
      }
      
      // Get Figma configuration using new data management services
      let sourceFileKey = '';
      let sourceSyntaxPatterns: {
        prefix?: string;
        suffix?: string;
        delimiter?: string;
        capitalization?: string;
        formatString?: string;
      } = {};
      let sourceFileColorProfile: 'srgb' | 'display-p3' = 'srgb';
      
      // Get core data for syntax patterns (always from core)
      const coreData = StorageService.getCoreData();
      const localEdits = StorageService.getLocalEdits();
      const sourceContext = StorageService.getSourceContext();
      
      // Determine the current source type and ID
      const currentSourceType = sourceContext?.sourceType || 'core';
      const currentSourceId = sourceContext?.sourceId;
      
      console.log('[FigmaConfigurationsView] Loading config for:', { currentSourceType, currentSourceId, isEditMode: dataSourceContext?.editMode.isActive });
      console.log('[FigmaConfigurationsView] Core data available:', !!coreData);
      console.log('[FigmaConfigurationsView] Local edits available:', !!localEdits);
      
      // Check for staged changes first (only in edit mode)
      if (dataSourceContext?.editMode.isActive) {
        const stagedChanges = FigmaConfigurationOverrideService.getStagedConfigurationChanges();
        console.log('[FigmaConfigurationsView] Checking for staged changes...');
        console.log('[FigmaConfigurationsView] Staged changes found:', stagedChanges);
        
        if (stagedChanges) {
          console.log('[FigmaConfigurationsView] === USING STAGED CHANGES ===');
          console.log('[FigmaConfigurationsView] Staged figmaFileKey:', stagedChanges.figmaFileKey);
          console.log('[FigmaConfigurationsView] Staged fileColorProfile:', stagedChanges.fileColorProfile);
          console.log('[FigmaConfigurationsView] Staged syntaxPatterns:', stagedChanges.syntaxPatterns);
          sourceFileKey = stagedChanges.figmaFileKey || '';
          sourceFileColorProfile = stagedChanges.fileColorProfile || 'srgb';
          sourceSyntaxPatterns = stagedChanges.syntaxPatterns || {};
        } else {
          console.log('[FigmaConfigurationsView] No staged changes found');
        }
      } else {
        console.log('[FigmaConfigurationsView] Not in edit mode, skipping staged changes check');
      }
      
      // If no staged changes, load from source data
      if (!sourceFileKey && !sourceSyntaxPatterns.prefix) {
        console.log('[FigmaConfigurationsView] No staged changes found, loading from source data');
        console.log('[FigmaConfigurationsView] Current source type:', currentSourceType);
        console.log('[FigmaConfigurationsView] Current source ID:', currentSourceId);
        
        if (currentSourceType === 'core') {
          // Core data - use figmaConfiguration from local edits (if available) or core data
          const sourceData = localEdits || coreData;
          const currentFigmaConfig = (sourceData as any)?.figmaConfiguration;
          console.log('[FigmaConfigurationsView] === CORE DATA SOURCE ===');
          console.log('[FigmaConfigurationsView] Source: localEdits.figmaConfiguration or coreData.figmaConfiguration');
          console.log('[FigmaConfigurationsView] Raw figmaConfiguration:', currentFigmaConfig);
          console.log('[FigmaConfigurationsView] figmaConfiguration.fileKey:', currentFigmaConfig?.fileKey);
          console.log('[FigmaConfigurationsView] figmaConfiguration.fileColorProfile:', currentFigmaConfig?.fileColorProfile);
          console.log('[FigmaConfigurationsView] figmaConfiguration.syntaxPatterns:', currentFigmaConfig?.syntaxPatterns);
          
          if (currentFigmaConfig) {
            sourceFileKey = currentFigmaConfig.fileKey || '';
            sourceFileColorProfile = currentFigmaConfig.fileColorProfile || 'srgb';
            sourceSyntaxPatterns = currentFigmaConfig.syntaxPatterns || {};
            console.log('[FigmaConfigurationsView] Extracted core fileKey:', sourceFileKey);
            console.log('[FigmaConfigurationsView] Extracted core fileColorProfile:', sourceFileColorProfile);
            console.log('[FigmaConfigurationsView] Extracted core syntaxPatterns:', sourceSyntaxPatterns);
          } else {
            console.log('[FigmaConfigurationsView] WARNING: No figmaConfiguration found in source data');
          }
        } else if (currentSourceType === 'platform' && currentSourceId) {
          // Platform extension - get figmaFileKey and fileColorProfile from root level of platform extension data
          console.log('[FigmaConfigurationsView] === PLATFORM EXTENSION SOURCE ===');
          console.log('[FigmaConfigurationsView] Source ID:', currentSourceId);
          
          // Get platform data from local edits or storage
          const platformData = StorageService.getPlatformExtensionData(currentSourceId) || localEdits;
          console.log('[FigmaConfigurationsView] Platform data:', platformData);
          
          if (platformData) {
            // Platform extensions have figmaFileKey and fileColorProfile at root level
            sourceFileKey = (platformData as any).figmaFileKey || '';
            sourceFileColorProfile = (platformData as any).fileColorProfile || 'srgb';
            console.log('[FigmaConfigurationsView] Extracted platform fileKey:', sourceFileKey);
            console.log('[FigmaConfigurationsView] Extracted platform fileColorProfile:', sourceFileColorProfile);
          } else {
            console.log('[FigmaConfigurationsView] WARNING: No platform data found for ID:', currentSourceId);
          }
        } else if (currentSourceType === 'theme' && currentSourceId) {
          // Theme override - get figmaFileKey and fileColorProfile from root level of theme override data
          console.log('[FigmaConfigurationsView] === THEME OVERRIDE SOURCE ===');
          console.log('[FigmaConfigurationsView] Source ID:', currentSourceId);
          
          // Get theme data from local edits or storage
          const themeData = StorageService.getThemeOverrideData(currentSourceId) || localEdits;
          console.log('[FigmaConfigurationsView] Theme data:', themeData);
          
          if (themeData) {
            // Theme overrides have figmaFileKey and fileColorProfile at root level
            sourceFileKey = (themeData as any).figmaFileKey || '';
            sourceFileColorProfile = (themeData as any).fileColorProfile || 'srgb';
            console.log('[FigmaConfigurationsView] Extracted theme fileKey:', sourceFileKey);
            console.log('[FigmaConfigurationsView] Extracted theme fileColorProfile:', sourceFileColorProfile);
          } else {
            console.log('[FigmaConfigurationsView] WARNING: No theme data found for ID:', currentSourceId);
          }
        }
      } else {
        console.log('[FigmaConfigurationsView] Using staged changes, skipping source data loading');
      }
      
      // ALWAYS get syntax patterns from core data, regardless of source type
      if (coreData?.figmaConfiguration?.syntaxPatterns) {
        sourceSyntaxPatterns = coreData.figmaConfiguration.syntaxPatterns;
        console.log('[FigmaConfigurationsView] Using core syntax patterns:', sourceSyntaxPatterns);
      } else {
        console.log('[FigmaConfigurationsView] WARNING: No syntax patterns found in core data');
      }
      
      console.log('[FigmaConfigurationsView] === FINAL CONFIGURATION ===');
      console.log('[FigmaConfigurationsView] Final sourceFileKey:', sourceFileKey);
      console.log('[FigmaConfigurationsView] Final sourceFileColorProfile:', sourceFileColorProfile);
      console.log('[FigmaConfigurationsView] Final sourceSyntaxPatterns:', sourceSyntaxPatterns);
      
      // Set the file key and syntax patterns
      setFileKey(sourceFileKey);
      const finalSyntaxPatterns = {
        prefix: sourceSyntaxPatterns.prefix || '',
        suffix: sourceSyntaxPatterns.suffix || '',
        delimiter: (sourceSyntaxPatterns.delimiter as '_' | '-' | '.' | '/' | '') || '_',
        capitalization: sourceSyntaxPatterns.capitalization === 'camel' ? 'none' : (sourceSyntaxPatterns.capitalization as 'none' | 'uppercase' | 'lowercase' | 'capitalize') || 'none',
        formatString: sourceSyntaxPatterns.formatString || ''
      };
      setSyntaxPatterns(finalSyntaxPatterns);
      setFileColorProfile(sourceFileColorProfile);
      
      console.log('[FigmaConfigurationsView] === UI STATE UPDATES ===');
      console.log('[FigmaConfigurationsView] Setting fileKey state to:', sourceFileKey);
      console.log('[FigmaConfigurationsView] Setting syntaxPatterns state to:', finalSyntaxPatterns);
      console.log('[FigmaConfigurationsView] Setting fileColorProfile state to:', sourceFileColorProfile);
      
      // Load access token from separate storage (not part of schema)
      const config = FigmaConfigurationService.getConfiguration();
      if (config) {
        setAccessToken(config.accessToken || '');
      }
      
      // Check change tracking state using new data management system
      try {
        const sourceSnapshot = StorageService.getSourceSnapshot();
        const localEdits = StorageService.getLocalEdits();
        
        console.log('[FigmaConfigurationsView] Checking change tracking with new system:', {
          hasSourceSnapshot: !!sourceSnapshot,
          hasLocalEdits: !!localEdits,
          sourceSnapshotType: sourceSnapshot ? typeof sourceSnapshot : 'null',
          localEditsType: localEdits ? typeof localEdits : 'null'
        });
        
        if (!sourceSnapshot || !localEdits) {
          console.log('[FigmaConfigurationsView] Missing data for change tracking, allowing export');
          setChangeTrackingState({
            hasLocalChanges: false,
            hasGitHubDivergence: false,
            canExport: true,
            changeCount: 0
          });
        } else {
          // Compare source snapshot vs local edits using the same logic as ChangeLog
          const changes = detectChanges(sourceSnapshot as Record<string, unknown>, localEdits as Record<string, unknown>);
          const hasLocalChanges = changes.length > 0;
          
          console.log('[FigmaConfigurationsView] Change detection results:', {
            totalChanges: changes.length,
            hasLocalChanges,
            changes: changes.map((c: any) => `${c.type} ${c.entityType}: ${c.entityName}`)
          });
          
          // For now, we'll skip GitHub divergence check to simplify
          // TODO: Implement GitHub divergence check using new system
          const hasGitHubDivergence = false;
          
          setChangeTrackingState({
            hasLocalChanges,
            hasGitHubDivergence,
            canExport: !hasLocalChanges, // Block export if there are local changes
            changeCount: changes.length
          });
        }
      } catch (error) {
        console.error('[FigmaConfigurationsView] Error checking change tracking:', error);
        // Default to allowing export if we can't check
        setChangeTrackingState({
          hasLocalChanges: false,
          hasGitHubDivergence: false,
          canExport: true,
          changeCount: 0
        });
      } finally {
        setCheckingChanges(false);
      }
    };

    initializeSettings();

    // Listen for data change events to re-check
    const handleDataChange = () => {
      initializeSettings();
    };

    window.addEventListener('token-model:data-change', handleDataChange);
    return () => {
      window.removeEventListener('token-model:data-change', handleDataChange);
    };
  }, [tokenSystem.figmaConfiguration, dataSourceContext]);

  // Test Figma access token and file
  const testTokenManually = async () => {
    if (!accessToken || !fileKey) {
      toast({
        title: 'Missing credentials',
        description: 'Please enter both access token and file key',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      // Test 1: Get file info
      console.log('[FigmaConfigurationsView] Test 1: Getting file info...');
      const fileResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
        method: 'GET',
        headers: {
          'X-Figma-Token': `${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[FigmaConfigurationsView] File response status:', fileResponse.status);
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        console.log('[FigmaConfigurationsView] File data:', fileData);
        toast({
          title: 'Token test successful',
          description: `File: ${fileData.name}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorText = await fileResponse.text();
        console.error('[FigmaConfigurationsView] File test failed:', fileResponse.status, errorText);
        toast({
          title: 'Token test failed',
          description: `File access failed: ${fileResponse.status}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

      // Test 2: Get variables
      console.log('[FigmaConfigurationsView] Test 2: Getting variables...');
      const variablesResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables`, {
        method: 'GET',
        headers: {
            'X-Figma-Token': `${accessToken}`,
            'Content-Type': 'application/json'
          }
      });

      console.log('[FigmaConfigurationsView] Variables response status:', variablesResponse.status);
      if (variablesResponse.ok) {
        const variablesData = await variablesResponse.json();
        console.log('[FigmaConfigurationsView] Variables data:', variablesData);
        toast({
          title: 'Variables access successful',
          description: `Found ${variablesData.meta?.variables?.length || 0} variables`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorText = await variablesResponse.text();
        console.error('[FigmaConfigurationsView] Variables test failed:', variablesResponse.status, errorText);
        toast({
          title: 'Variables access failed',
          description: `Variables access failed: ${variablesResponse.status}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('[FigmaConfigurationsView] Test failed:', error);
      toast({
        title: 'Test failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle publish to Figma
  const handlePublish = async () => {
    if (!accessToken || !fileKey) return;
    
    setPublishLoading(true);
    try {
      console.log('[FigmaConfigurationsView] Starting Figma publishing...');
      
      // SAFETY: Force refresh data before publishing
      let canonicalTokenSystem;
      try {
        canonicalTokenSystem = await forceRefreshDataForFigma();
      } catch (err) {
        console.error('[FigmaConfigurationsView] Failed to refresh data for publishing:', err);
        toast({
          title: 'Publishing failed',
          description: 'Could not refresh design system data. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        return;
      }

      console.log('[FigmaConfigurationsView] Using complete token system for publishing');
      console.log('[FigmaConfigurationsView] Token system stats:', {
        tokensCount: canonicalTokenSystem.tokens?.length || 0,
        collectionsCount: canonicalTokenSystem.tokenCollections?.length || 0,
        dimensionsCount: canonicalTokenSystem.dimensions?.length || 0
      });
      
      // CRITICAL: Log dimensionOrder for debugging
      console.log('[FigmaConfigurationsView] 🔍 CRITICAL DEBUG - dimensionOrder before FigmaExportService:', canonicalTokenSystem.dimensionOrder);
      console.log('[FigmaConfigurationsView] 🔍 CRITICAL DEBUG - dimensions before FigmaExportService:', canonicalTokenSystem.dimensions?.map(d => ({ id: d.id, displayName: d.displayName })));
      
      if (!canonicalTokenSystem.dimensionOrder || canonicalTokenSystem.dimensionOrder.length === 0) {
        console.error('[FigmaConfigurationsView] 🚨 CRITICAL ERROR: dimensionOrder is missing or empty!');
        console.error('[FigmaConfigurationsView] 🚨 This will prevent daisy-chaining from working!');
        
        // Show a more helpful error message with option to load example data
        toast({
          title: 'No Design System Data Found',
          description: 'No design system data is loaded. Please load example data or connect to a GitHub repository first.',
          status: 'error',
          duration: 8000,
          isClosable: true
        });
        return;
      }

      // Use the FigmaExportService for the complete publishing workflow
      const figmaExportService = new FigmaExportService();
      const result = await figmaExportService.publishToFigma({
        accessToken: accessToken,
        fileId: fileKey
      }, canonicalTokenSystem);

      if (result.success) {
        // Store the export result for display
        setExportResult(result);
        
        toast({
          title: 'Published successfully',
          description: 'Your design tokens have been published to Figma.',
          status: 'success',
          duration: 5000,
          isClosable: true
        });
      } else {
        toast({
          title: 'Publishing failed',
          description: result.error?.message || 'An unknown error occurred during publishing.',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('[FigmaConfigurationsView] Publishing failed:', error);
      toast({
        title: 'Publishing failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred during publishing.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setPublishLoading(false);
    }
  };

  // Handle export only (without publishing)
  const handleExportOnly = async () => {
    if (!accessToken || !fileKey) return;
    
    setExportLoading(true);
    try {
      console.log('[FigmaConfigurationsView] Starting export only...');
      
      // SAFETY: Force refresh data before export
      let canonicalTokenSystem;
      try {
        canonicalTokenSystem = await forceRefreshDataForFigma();
      } catch (err) {
        console.error('[FigmaConfigurationsView] Failed to refresh data for export:', err);
        toast({
          title: 'Export failed',
          description: 'Could not refresh design system data. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      console.log('[FigmaConfigurationsView] Canonical token system:', canonicalTokenSystem);
      const figmaExportService = new FigmaExportService();
      
      const result = await figmaExportService.exportToFigma({
        accessToken: accessToken,
        fileId: fileKey
      }, canonicalTokenSystem);
      
      console.log('[FigmaConfigurationsView] Export result:', result);
      setExportResult(result);
      
      if (result.success && result.data) {
        toast({
          title: 'Export successful',
          description: `Generated ${result.data.variables.length} variables and ${result.data.collections.length} collections`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Export failed',
          description: result.error?.message || 'Unknown error occurred',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('[FigmaConfigurationsView] Export failed:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Download the export JSON
  const handleDownload = () => {
    if (!exportResult?.data) return;
    
    const blob = new Blob([JSON.stringify(exportResult.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'figma-variables-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Download started',
      description: 'Figma variables export downloaded',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Copy the export JSON to clipboard
  const handleCopy = () => {
    if (!exportResult?.data) return;
    
    navigator.clipboard.writeText(JSON.stringify(exportResult.data, null, 2));
    
    toast({
      title: 'Copied to clipboard',
      description: 'Figma variables export copied to clipboard',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Handle syntax pattern changes
  const handleSyntaxPatternsChange = (newPatterns: SyntaxPatterns) => {
    // Only allow changes when in edit mode
    if (!dataSourceContext?.editMode.isActive) {
      return;
    }
    
    setSyntaxPatterns(newPatterns);
    
    // Convert 'none' back to 'camel' for schema compatibility
    const schemaPatterns = {
      ...newPatterns,
      capitalization: newPatterns.capitalization === 'none' ? 'camel' as const : newPatterns.capitalization
    };
    
    // In edit mode, stage changes for the current source
    const { sourceType, sourceId } = dataSourceContext.editMode;
    
    if (sourceType === 'core') {
      // Core data - update via StorageService
      const updatedFigmaConfig = {
        fileKey: fileKey,
        syntaxPatterns: schemaPatterns
      };
      StorageService.setFigmaConfiguration(updatedFigmaConfig);
      window.dispatchEvent(new CustomEvent('token-model:data-change'));
    } else if (sourceType === 'platform-extension' && sourceId) {
      // Platform extension - stage changes for later commit
      FigmaConfigurationOverrideService.stageConfigurationChange(fileKey, schemaPatterns);
    } else if (sourceType === 'theme-override' && sourceId) {
      // Theme overrides don't have syntax patterns, but we can log this
      console.log('[FigmaConfigurationsView] Theme overrides do not support syntax pattern changes');
    }
  };

  // Handle file key changes
  const handleFileKeyChange = (newFileKey: string) => {
    // Only allow changes when in edit mode
    if (!dataSourceContext?.editMode.isActive) {
      return;
    }
    
    setFileKey(newFileKey);
    
    // In edit mode, stage changes for the current source
    const { sourceType, sourceId } = dataSourceContext.editMode;
    
    if (sourceType === 'core') {
      // Core data - update via StorageService
      const updatedFigmaConfig = {
        fileKey: newFileKey,
        syntaxPatterns: tokenSystem.figmaConfiguration?.syntaxPatterns
      };
      StorageService.setFigmaConfiguration(updatedFigmaConfig);
      window.dispatchEvent(new CustomEvent('token-model:data-change'));
    } else if (sourceType === 'platform-extension' && sourceId) {
      // Platform extension - stage changes for later commit
      FigmaConfigurationOverrideService.stageConfigurationChange(newFileKey, tokenSystem.figmaConfiguration?.syntaxPatterns);
    } else if (sourceType === 'theme-override' && sourceId) {
      // Theme override - stage changes for later commit
      FigmaConfigurationOverrideService.stageConfigurationChange(newFileKey);
    }
  };

  // Handle file color profile changes
  const handleFileColorProfileChange = (newFileColorProfile: 'srgb' | 'display-p3') => {
    // Only allow changes when in edit mode
    if (!dataSourceContext?.editMode.isActive) {
      return;
    }
    
    setFileColorProfile(newFileColorProfile);
    
    // In edit mode, stage changes for the current source
    const { sourceType, sourceId } = dataSourceContext.editMode;
    
    if (sourceType === 'core') {
      // Core data - update via StorageService
      const updatedFigmaConfig = {
        fileKey: fileKey,
        syntaxPatterns: tokenSystem.figmaConfiguration?.syntaxPatterns,
        fileColorProfile: newFileColorProfile
      };
      StorageService.setFigmaConfiguration(updatedFigmaConfig);
      window.dispatchEvent(new CustomEvent('token-model:data-change'));
    } else if (sourceType === 'platform-extension' && sourceId) {
      // Platform extension - stage changes for later commit
      FigmaConfigurationOverrideService.stageConfigurationChange(fileKey, tokenSystem.figmaConfiguration?.syntaxPatterns, newFileColorProfile);
    } else if (sourceType === 'theme-override' && sourceId) {
      // Theme override - stage changes for later commit
      FigmaConfigurationOverrideService.stageConfigurationChange(fileKey, undefined, newFileColorProfile);
    }
  };

  // Helper function to determine if syntax patterns should be shown
  const shouldShowSyntaxPatterns = (): boolean => {
    // Get current source context from new data management services
    const sourceContext = StorageService.getSourceContext();
    const currentSourceType = sourceContext?.sourceType || 'core';
    
    // Show syntax patterns only for core data (not for platform or theme sources)
    return currentSourceType === 'core';
  };

  // Helper function to determine if publishing tab should be shown
  const shouldShowPublishingTab = (): boolean => {
    // User must have edit permissions to show publishing tab
    // hasEditPermissions comes from App.tsx and represents hasWriteAccess
    return hasEditPermissions === true;
  };

  // Render change tracking status
  const renderChangeTrackingStatus = () => {
    if (checkingChanges) {
      return (
        <Alert status="info" borderRadius="md">
          <AlertIcon as={Spinner} />
          <AlertDescription>
            Checking for unsaved changes...
          </AlertDescription>
        </Alert>
      );
    }

    // Only show alerts for error conditions, not success states
    if (!changeTrackingState?.canExport) {
      return (
        <Alert status="error" borderRadius="md">
          <AlertIcon as={AlertTriangle} />
          <AlertDescription>
            {changeTrackingState?.hasLocalChanges && changeTrackingState?.hasGitHubDivergence
              ? `Export blocked: ${changeTrackingState?.changeCount} local changes detected AND data has diverged from baseline. Please save your changes first.`
              : changeTrackingState?.hasLocalChanges
              ? `Export blocked: ${changeTrackingState?.changeCount} local changes detected. Please save your changes first.`
              : 'Export blocked: Local data has diverged from baseline. Please sync with GitHub first.'
            }
          </AlertDescription>
        </Alert>
      );
    }

    // Return null when ready to export (no alert banner)
    return null;
  };

  // Publishing tab content
  const renderPublishingTab = () => (
    <VStack spacing={6} align="stretch">
      {/* Figma Configuration Card */}
      <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
          <Heading size="md" mb={0}>Figma Credentials</Heading>
          <VStack spacing={6} align="stretch">
            {/* Change Tracking Alert */}
            {renderChangeTrackingStatus()}

            {/* Figma Credentials */}
            <Box>
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel>Figma Access Token</FormLabel>
                  <InputGroup>
                    <Input
                      type="password"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="figd_..."
                      fontFamily="mono"
                    />
                    <InputRightElement width="auto" mr={2}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={testTokenManually}
                        isDisabled={!accessToken || !fileKey}
                        leftIcon={<TestTube size={14} />}
                      >
                        Test
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Figma File Key</FormLabel>
                  <Input
                    value={fileKey}
                    onChange={(e) => handleFileKeyChange(e.target.value)}
                    placeholder="yTy5ytxeFPRiGou5Poed8a"
                    fontFamily="mono"
                    isReadOnly={!dataSourceContext?.editMode.isActive}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>File Color Profile</FormLabel>
                  <Select
                    value={fileColorProfile}
                    onChange={(e) => handleFileColorProfileChange(e.target.value as 'srgb' | 'display-p3')}
                    isDisabled={!dataSourceContext?.editMode.isActive}
                  >
                    <option value="srgb">sRGB</option>
                    <option value="display-p3">Display P3</option>
                  </Select>
                </FormControl>
              </VStack>
            </Box>

            <Divider />

            {/* Syntax Patterns - Only show for core data */}
            {shouldShowSyntaxPatterns() && (
              <>
                <Box>
                  <Heading size="sm" mb={4}>Syntax Patterns</Heading>
                  <SyntaxPatternsEditor
                    syntaxPatterns={syntaxPatterns}
                    onSyntaxPatternsChange={handleSyntaxPatternsChange}
                    showTitle={false}
                    isReadOnly={!dataSourceContext?.editMode.isActive}
                  />
                </Box>

                <Divider />
              </>
            )}

            {/* Actions */}
            <HStack spacing={3} justify="flex-end">
              <Button
                variant="outline"
                onClick={handleExportOnly}
                isLoading={exportLoading}
                loadingText="Generating API data..."
                isDisabled={!accessToken || !fileKey || (dataSourceContext?.editMode.isActive && !changeTrackingState?.canExport)}
                leftIcon={<Download size={14} />}
              >
                Generate API Data
              </Button>
              
              <Button
                colorScheme="green"
                onClick={handlePublish}
                isLoading={publishLoading}
                loadingText="Publishing..."
                isDisabled={!accessToken || !fileKey || (dataSourceContext?.editMode.isActive && !changeTrackingState?.canExport)}
              >
                Publish to Figma
              </Button>
            </HStack>

            {/* Export Result Display */}
            {exportResult?.data && (
              <Box p={4} bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} borderRadius="md">
                <VStack spacing={3} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="bold">Export Summary</Text>
                    <HStack spacing={2}>
                      <Badge colorScheme="green">{exportResult.data.variables.length} variables</Badge>
                      <Badge colorScheme="blue">{exportResult.data.collections.length} collections</Badge>
                      <Badge colorScheme="purple">{exportResult.data.variableModes.length} modes</Badge>
                    </HStack>
                  </HStack>

                  <HStack spacing={2} justify="center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPreview(!showPreview)}
                      leftIcon={showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                    >
                      {showPreview ? 'Hide' : 'Show'} Preview
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownload}
                      leftIcon={<Download size={14} />}
                    >
                      Download JSON
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                      leftIcon={<Copy size={14} />}
                    >
                      Copy JSON
                    </Button>
                  </HStack>

                  {showPreview && (
                    <Box
                      p={3}
                      bg={colorMode === 'dark' ? 'gray.900' : 'white'}
                      borderWidth={1}
                      borderRadius="md"
                      maxH="300px"
                      overflowY="auto"
                    >
                      <pre style={{ fontSize: '12px', margin: 0 }}>
                        {JSON.stringify(exportResult.data, null, 2)}
                      </pre>
                    </Box>
                  )}
                </VStack>
              </Box>
            )}
          </VStack>
      </Box>

      {/* Pre-Publish Dialog */}
      {exportResult?.data && (
        <FigmaPrePublishDialog
          isOpen={showPrePublishDialog}
          onClose={() => setShowPrePublishDialog(false)}
          onPublish={handlePublish}
          transformationResult={exportResult.data}
          tokenSystem={tokenSystem}
          figmaFileId={fileKey}
          accessToken={accessToken}
        />
      )}
    </VStack>
  );

  return (
    <PageTemplate
      title="Figma"
      description="Configure Figma integration settings and manage variable collections for publishing design tokens."
    >
      {/* Tabs */}
      <Tabs>
        <TabList>
          {shouldShowPublishingTab() && <Tab>Publishing</Tab>}
          <Tab>Variable Collections</Tab>
        </TabList>

        <TabPanels mt={4}>
          {shouldShowPublishingTab() && (
            <TabPanel>
              {renderPublishingTab()}
            </TabPanel>
          )}
          
          <TabPanel>
            <CollectionsView
              collections={collections}
              onUpdate={(collections) => StorageService.setCollections(collections)}
              tokens={tokens}
              resolvedValueTypes={resolvedValueTypes}
              canEdit={canEdit}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </PageTemplate>
  );
}; 