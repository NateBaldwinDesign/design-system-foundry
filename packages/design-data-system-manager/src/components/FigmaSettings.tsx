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
  Checkbox,
  RadioGroup,
  Radio,
  FormHelperText,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Divider
} from '@chakra-ui/react';
import { Download, Copy, Eye, EyeOff, AlertTriangle, TestTube } from 'lucide-react';
import type { TokenSystem } from '@token-model/data-model';
import { FigmaExportService, FigmaExportResult } from '../services/figmaExport';
import { FigmaPrePublishDialog } from './FigmaPrePublishDialog';
import { createSchemaJsonFromLocalStorage } from '../services/createJson';
import { ChangeTrackingService, ChangeTrackingState } from '../services/changeTrackingService';
import { FigmaConfigurationService } from '../services/figmaConfigurationService';
import { CardTitle } from './CardTitle';
import { SyntaxPatternsForm, SyntaxPatterns } from './SyntaxPatternsForm';

interface FigmaSettingsProps {
  tokenSystem: TokenSystem;
}

export const FigmaSettings: React.FC<FigmaSettingsProps> = ({ tokenSystem }) => {
  const { colorMode } = useColorMode();
  const toast = useToast();
  
  const [accessToken, setAccessToken] = useState('');
  const [fileKey, setFileKey] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [showPrePublishDialog, setShowPrePublishDialog] = useState(false);
  const [changeTrackingState, setChangeTrackingState] = useState<ChangeTrackingState | null>(null);
  const [checkingChanges, setCheckingChanges] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [exportResult, setExportResult] = useState<FigmaExportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [autoPublish, setAutoPublish] = useState(false);
  const [publishStrategy, setPublishStrategy] = useState<'merge' | 'commit'>('merge');
  const [syntaxPatterns, setSyntaxPatterns] = useState<SyntaxPatterns>({
    prefix: '',
    suffix: '',
    delimiter: '_',
    capitalization: 'none',
    formatString: ''
  });

  // Load configuration and check change tracking state on mount
  useEffect(() => {
    const initializeSettings = async () => {
      setCheckingChanges(true);
      
      // Load Figma configuration
      const config = FigmaConfigurationService.getConfiguration();
      if (config) {
        setAccessToken(config.accessToken || '');
        setFileKey(config.fileKey || '');
        setAutoPublish(config.autoPublish || false);
        setPublishStrategy(config.publishStrategy || 'merge');
        setSyntaxPatterns(config.syntaxPatterns);
      }
      
      // Check change tracking state
      try {
        const state = await ChangeTrackingService.getChangeTrackingState();
        setChangeTrackingState(state);
      } catch (error) {
        console.error('[FigmaSettings] Error checking change tracking:', error);
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
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    const currentSyntaxPatterns = tokenSystem.figmaConfiguration?.syntaxPatterns || {};
    const currentFileKey = tokenSystem.figmaConfiguration?.fileKey || '';
    
    setHasUnsavedChanges(
      JSON.stringify(syntaxPatterns) !== JSON.stringify(currentSyntaxPatterns) ||
      fileKey !== currentFileKey
    );
  }, [syntaxPatterns, fileKey, tokenSystem.figmaConfiguration]);

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
      console.log('[FigmaSettings] Test 1: Getting file info...');
      const fileResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
        method: 'GET',
        headers: {
          'X-Figma-Token': `${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[FigmaSettings] File response status:', fileResponse.status);
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        console.log('[FigmaSettings] File data:', fileData);
        toast({
          title: 'Token test successful',
          description: `File: ${fileData.name}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorText = await fileResponse.text();
        console.error('[FigmaSettings] File test failed:', fileResponse.status, errorText);
        toast({
          title: 'Token test failed',
          description: `File access failed: ${fileResponse.status}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

      // Test 2: Get variables
      console.log('[FigmaSettings] Test 2: Getting variables...');
      const variablesResponse = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables`, {
        method: 'GET',
        headers: {
            'X-Figma-Token': `${accessToken}`,
            'Content-Type': 'application/json'
          }
      });

      console.log('[FigmaSettings] Variables response status:', variablesResponse.status);
      if (variablesResponse.ok) {
        const variablesData = await variablesResponse.json();
        console.log('[FigmaSettings] Variables data:', variablesData);
        toast({
          title: 'Variables access successful',
          description: `Found ${variablesData.meta?.variables?.length || 0} variables`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorText = await variablesResponse.text();
        console.error('[FigmaSettings] Variables test failed:', variablesResponse.status, errorText);
        toast({
          title: 'Variables access failed',
          description: `Variables access failed: ${variablesResponse.status}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('[FigmaSettings] Test failed:', error);
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
      console.log('[FigmaSettings] Starting Figma publishing...');
      
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

      console.log('[FigmaSettings] Using complete token system for publishing');
      console.log('[FigmaSettings] Token system stats:', {
        tokensCount: canonicalTokenSystem.tokens?.length || 0,
        collectionsCount: canonicalTokenSystem.tokenCollections?.length || 0,
        dimensionsCount: canonicalTokenSystem.dimensions?.length || 0
      });

      // Use the FigmaExportService for the complete publishing workflow
      const figmaExportService = new FigmaExportService();
      const result = await figmaExportService.publishToFigma(canonicalTokenSystem as TokenSystem, {
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
      console.error('[FigmaSettings] Publishing failed:', error);
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
      console.log('[FigmaSettings] Starting export only...');
      
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

      console.log('[FigmaSettings] Canonical token system:', canonicalTokenSystem);
      const figmaExportService = new FigmaExportService();
      
      const result = await figmaExportService.exportToFigma(canonicalTokenSystem, {
        accessToken: accessToken,
        fileId: fileKey
      });
      
      console.log('[FigmaSettings] Export result:', result);
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
      console.error('[FigmaSettings] Export failed:', error);
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

  // Save settings
  const handleSave = () => {
    // TODO: Implement save to storage
    setHasUnsavedChanges(false);
    toast({
      title: 'Settings saved',
      description: 'Figma settings have been updated',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Handle syntax pattern changes
  const handleSyntaxPatternChange = (field: keyof SyntaxPatterns, value: string | number | undefined) => {
    const newPatterns = {
      ...syntaxPatterns,
      [field]: value
    };
    setSyntaxPatterns(newPatterns);
    
    // Auto-save syntax patterns
    FigmaConfigurationService.updateSyntaxPatterns(newPatterns);
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
            {changeTrackingState.hasLocalChanges && changeTrackingState.hasGitHubDivergence
              ? `Export blocked: ${changeTrackingState.changeCount} local changes detected AND data has diverged from baseline. Please save your changes first.`
              : changeTrackingState.hasLocalChanges
              ? `Export blocked: ${changeTrackingState.changeCount} local changes detected. Please save your changes first.`
              : 'Export blocked: Local data has diverged from baseline. Please sync with GitHub first.'
            }
          </AlertDescription>
        </Alert>
      );
    }

    // Return null when ready to export (no alert banner)
    return null;
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Figma Configuration Card */}
      <Card>
        <CardHeader>
          <HStack justify="space-between" align="center">
            <Box>
              <CardTitle title="Figma" cardType="figma" />
              <Text fontSize="sm" color="gray.600">
                Configure Figma publishing settings and syntax patterns
              </Text>
            </Box>
            {hasUnsavedChanges && (
              <Badge colorScheme="orange" variant="subtle">
                Unsaved Changes
              </Badge>
            )}
          </HStack>
        </CardHeader>
        <CardBody>
          <VStack spacing={6} align="stretch">
            {/* Change Tracking Alert */}
            {renderChangeTrackingStatus()}

            {/* Figma Credentials */}
            <Box>
              <Heading size="sm" mb={4}>Figma Credentials</Heading>
              <VStack spacing={4} align="stretch">
                <FormControl>
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

                <FormControl>
                  <FormLabel>Figma File Key</FormLabel>
                  <Input
                    value={fileKey}
                    onChange={(e) => setFileKey(e.target.value)}
                    placeholder="yTy5ytxeFPRiGou5Poed8a"
                    fontFamily="mono"
                  />
                </FormControl>

                {(!accessToken || !fileKey) && (
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <AlertDescription>
                      Access token and file key are required for publishing and exporting.
                    </AlertDescription>
                  </Alert>
                )}
              </VStack>
            </Box>

            <Divider />

            {/* Syntax Patterns */}
            <Box>
              <Heading size="sm" mb={4}>Syntax Patterns</Heading>
              <SyntaxPatternsForm
                syntaxPatterns={syntaxPatterns}
                onSyntaxPatternChange={handleSyntaxPatternChange}
                showTitle={false}
              />
            </Box>

            <Divider />

            {/* Auto Publish Settings */}
            <Box>
              <Heading size="sm" mb={4}>Auto Publish Settings</Heading>
              <VStack spacing={4} align="stretch">
                <FormControl>
                  <Checkbox
                    isChecked={autoPublish}
                    onChange={(e) => setAutoPublish(e.target.checked)}
                  >
                    Auto publish
                  </Checkbox>
                  <FormHelperText ml={6}>
                    If you have Github actions enabled, this will publish your changes to Figma automatically when you commit or merge.
                  </FormHelperText>
                </FormControl>

                {autoPublish && (
                  <FormControl ml={6}>
                    <FormLabel>Publish Strategy</FormLabel>
                    <RadioGroup value={publishStrategy} onChange={(value: 'merge' | 'commit') => setPublishStrategy(value)}>
                      <VStack align="start" spacing={2}>
                        <Radio value="merge">Publish on merge with main</Radio>
                        <Radio value="commit">Publish every commit</Radio>
                      </VStack>
                    </RadioGroup>
                  </FormControl>
                )}
              </VStack>
            </Box>

            <Divider />

            {/* Actions */}
            <HStack spacing={3} justify="flex-end">
              <Button
                variant="outline"
                onClick={handleExportOnly}
                isLoading={exportLoading}
                loadingText="Generating API data..."
                isDisabled={!accessToken || !fileKey || !changeTrackingState?.canExport}
                leftIcon={<Download size={14} />}
              >
                Generate API Data
              </Button>
              
              <Button
                colorScheme="green"
                onClick={handlePublish}
                isLoading={publishLoading}
                loadingText="Publishing..."
                isDisabled={!accessToken || !fileKey || !changeTrackingState?.canExport}
              >
                Publish to Figma
              </Button>
              
              <Button
                colorScheme="blue"
                onClick={handleSave}
                isDisabled={!hasUnsavedChanges}
              >
                Save Settings
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
        </CardBody>
      </Card>

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
}; 