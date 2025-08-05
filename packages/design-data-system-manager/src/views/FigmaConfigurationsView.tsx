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
  TabPanel
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
import { GitHubApiService } from '../services/githubApi';
import { FigmaConfigurationOverrideService } from '../services/figmaConfigurationOverrideService';

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

  // Get data for CollectionsView
  const collections = StorageService.getCollections();
  const tokens = StorageService.getTokens();
  const resolvedValueTypes = StorageService.getValueTypes();

    // Load configuration and check change tracking state on mount
  useEffect(() => {
    const initializeSettings = async () => {
      setCheckingChanges(true);
      
      // Initialize Figma configuration override session if in edit mode
      if (dataSourceContext?.editMode.isActive) {
        FigmaConfigurationOverrideService.initializeSession(dataSourceContext);
      }
      
      // Get Figma configuration from current data source context
      let sourceFileKey = '';
      let sourceSyntaxPatterns: {
        prefix?: string;
        suffix?: string;
        delimiter?: string;
        capitalization?: string;
        formatString?: string;
      } = {};
      
      // Determine the current source type and ID
      const currentSourceType = dataSourceContext?.editMode.isActive 
        ? dataSourceContext.editMode.sourceType 
        : 'core';
      const currentSourceId = dataSourceContext?.editMode.isActive 
        ? dataSourceContext.editMode.sourceId 
        : null;
      
      console.log('[FigmaConfigurationsView] Loading config for:', { currentSourceType, currentSourceId, isEditMode: dataSourceContext?.editMode.isActive });
      
      // Check for staged changes first (only in edit mode)
      if (dataSourceContext?.editMode.isActive) {
        const stagedChanges = FigmaConfigurationOverrideService.getStagedConfigurationChanges();
        console.log('[FigmaConfigurationsView] Checking for staged changes...');
        console.log('[FigmaConfigurationsView] Staged changes found:', stagedChanges);
        
        if (stagedChanges) {
          console.log('[FigmaConfigurationsView] === USING STAGED CHANGES ===');
          console.log('[FigmaConfigurationsView] Staged figmaFileKey:', stagedChanges.figmaFileKey);
          console.log('[FigmaConfigurationsView] Staged syntaxPatterns:', stagedChanges.syntaxPatterns);
          sourceFileKey = stagedChanges.figmaFileKey || '';
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
          // Core data - use figmaConfiguration from tokenSystem
          const currentFigmaConfig = tokenSystem.figmaConfiguration;
          console.log('[FigmaConfigurationsView] === CORE DATA SOURCE ===');
          console.log('[FigmaConfigurationsView] Source: tokenSystem.figmaConfiguration');
          console.log('[FigmaConfigurationsView] Raw figmaConfiguration:', currentFigmaConfig);
          console.log('[FigmaConfigurationsView] figmaConfiguration.fileKey:', currentFigmaConfig?.fileKey);
          console.log('[FigmaConfigurationsView] figmaConfiguration.syntaxPatterns:', currentFigmaConfig?.syntaxPatterns);
          
          if (currentFigmaConfig) {
            sourceFileKey = currentFigmaConfig.fileKey || '';
            sourceSyntaxPatterns = currentFigmaConfig.syntaxPatterns || {};
            console.log('[FigmaConfigurationsView] Extracted core fileKey:', sourceFileKey);
            console.log('[FigmaConfigurationsView] Extracted core syntaxPatterns:', sourceSyntaxPatterns);
          } else {
            console.log('[FigmaConfigurationsView] WARNING: No figmaConfiguration found in tokenSystem');
          }
        } else if (currentSourceType === 'platform-extension' && currentSourceId) {
          // Platform extension - get figmaFileKey from root level of platform extension data
          console.log('[FigmaConfigurationsView] === PLATFORM EXTENSION SOURCE ===');
          console.log('[FigmaConfigurationsView] Source ID:', currentSourceId);
          
          try {
            const platformRepo = dataSourceContext?.repositories.platforms[currentSourceId];
            console.log('[FigmaConfigurationsView] Platform repo info:', platformRepo);
            
            if (platformRepo) {
              console.log('[FigmaConfigurationsView] Loading from GitHub:', {
                fullName: platformRepo.fullName,
                filePath: platformRepo.filePath,
                branch: platformRepo.branch
              });
              
              const fileContent = await GitHubApiService.getFileContent(
                platformRepo.fullName,
                platformRepo.filePath,
                platformRepo.branch
              );
              
              console.log('[FigmaConfigurationsView] GitHub API response:', fileContent);
              
              if (fileContent && fileContent.content) {
                const platformData = JSON.parse(fileContent.content);
                console.log('[FigmaConfigurationsView] Parsed platform data:', platformData);
                console.log('[FigmaConfigurationsView] platformData.figmaFileKey:', platformData.figmaFileKey);
                console.log('[FigmaConfigurationsView] platformData.syntaxPatterns:', platformData.syntaxPatterns);
                
                // Platform extensions have figmaFileKey at root level
                sourceFileKey = platformData.figmaFileKey || '';
                sourceSyntaxPatterns = platformData.syntaxPatterns || {};
                console.log('[FigmaConfigurationsView] Extracted platform fileKey:', sourceFileKey);
                console.log('[FigmaConfigurationsView] Extracted platform syntaxPatterns:', sourceSyntaxPatterns);
              } else {
                console.log('[FigmaConfigurationsView] WARNING: No file content received from GitHub API');
              }
            } else {
              console.log('[FigmaConfigurationsView] WARNING: No platform repo found for ID:', currentSourceId);
            }
          } catch (error) {
            console.error('[FigmaConfigurationsView] ERROR loading platform Figma config:', error);
          }
        } else if (currentSourceType === 'theme-override' && currentSourceId) {
          // Theme override - get figmaFileKey from root level of theme override data
          console.log('[FigmaConfigurationsView] === THEME OVERRIDE SOURCE ===');
          console.log('[FigmaConfigurationsView] Source ID:', currentSourceId);
          
          try {
            const themeRepo = dataSourceContext?.repositories.themes[currentSourceId];
            console.log('[FigmaConfigurationsView] Theme repo info:', themeRepo);
            
            if (themeRepo) {
              console.log('[FigmaConfigurationsView] Loading from GitHub:', {
                fullName: themeRepo.fullName,
                filePath: themeRepo.filePath,
                branch: themeRepo.branch
              });
              
              const fileContent = await GitHubApiService.getFileContent(
                themeRepo.fullName,
                themeRepo.filePath,
                themeRepo.branch
              );
              
              console.log('[FigmaConfigurationsView] GitHub API response:', fileContent);
              
              if (fileContent && fileContent.content) {
                const themeData = JSON.parse(fileContent.content);
                console.log('[FigmaConfigurationsView] Parsed theme data:', themeData);
                console.log('[FigmaConfigurationsView] themeData.figmaFileKey:', themeData.figmaFileKey);
                
                // Theme overrides have figmaFileKey at root level
                sourceFileKey = themeData.figmaFileKey || '';
                // Theme overrides don't have syntax patterns, use core patterns
                const currentFigmaConfig = tokenSystem.figmaConfiguration;
                sourceSyntaxPatterns = currentFigmaConfig?.syntaxPatterns || {};
                console.log('[FigmaConfigurationsView] Extracted theme fileKey:', sourceFileKey);
                console.log('[FigmaConfigurationsView] Using core syntaxPatterns for theme:', sourceSyntaxPatterns);
              } else {
                console.log('[FigmaConfigurationsView] WARNING: No file content received from GitHub API');
              }
            } else {
              console.log('[FigmaConfigurationsView] WARNING: No theme repo found for ID:', currentSourceId);
            }
          } catch (error) {
            console.error('[FigmaConfigurationsView] ERROR loading theme Figma config:', error);
          }
        }
      } else {
        console.log('[FigmaConfigurationsView] Using staged changes, skipping source data loading');
      }
      
      console.log('[FigmaConfigurationsView] === FINAL CONFIGURATION ===');
      console.log('[FigmaConfigurationsView] Final sourceFileKey:', sourceFileKey);
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
      
      console.log('[FigmaConfigurationsView] === UI STATE UPDATES ===');
      console.log('[FigmaConfigurationsView] Setting fileKey state to:', sourceFileKey);
      console.log('[FigmaConfigurationsView] Setting syntaxPatterns state to:', finalSyntaxPatterns);
      
      // Load access token from separate storage (not part of schema)
      const config = FigmaConfigurationService.getConfiguration();
      if (config) {
        setAccessToken(config.accessToken || '');
      }
      
      // Check change tracking state
      try {
        const state = await ChangeTrackingService.getChangeTrackingState();
        setChangeTrackingState(state);
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
      
      // Always use the canonical, schema-compliant token system from local storage
      let canonicalTokenSystem;
      try {
        canonicalTokenSystem = createSchemaJsonFromLocalStorage();
      } catch (err) {
        toast({
          title: 'Publishing failed',
          description: 'Could not load complete design system from local storage. Please check your data.',
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

      // Use the FigmaExportService for the complete publishing workflow
      const figmaExportService = new FigmaExportService();
      const result = await figmaExportService.publishToFigma({
        accessToken: accessToken,
        fileId: fileKey
      });

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
      
      // Always use the canonical, schema-compliant token system from local storage
      let canonicalTokenSystem;
      try {
        canonicalTokenSystem = createSchemaJsonFromLocalStorage();
      } catch (err) {
        toast({
          title: 'Export failed',
          description: 'Could not load complete design system from local storage. Please check your data.',
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
      });
      
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

  // Helper function to determine if syntax patterns should be shown
  const shouldShowSyntaxPatterns = (): boolean => {
    // Show syntax patterns only for core data (not for platform or theme sources)
    if (!dataSourceContext?.editMode.isActive) {
      return true; // View mode - show syntax patterns (core data)
    }
    
    const { sourceType } = dataSourceContext.editMode;
    return sourceType === 'core'; // Only show for core, hide for platform/theme
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
          {hasEditPermissions && <Tab>Publishing</Tab>}
          <Tab>Variable Collections</Tab>
        </TabList>

        <TabPanels mt={4}>
          {hasEditPermissions && (
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