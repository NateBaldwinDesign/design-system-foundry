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
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  InputGroup,
  InputRightElement
} from '@chakra-ui/react';
import { Download, Copy, Eye, EyeOff, AlertTriangle, CheckCircle, Pencil } from 'lucide-react';
import type { TokenSystem } from '@token-model/data-model';
import { FigmaExportService, FigmaExportResult } from '../../services/figmaExport';
import { FigmaPrePublishDialog } from '../../components/FigmaPrePublishDialog';
import { createSchemaJsonFromLocalStorage } from '../../services/createJson';
import { ChangeTrackingService, ChangeTrackingState } from '../../services/changeTrackingService';
import { CardTitle } from '../../components/CardTitle';

interface FigmaExportSettingsProps {
  tokenSystem: TokenSystem;
}

export const FigmaExportSettings: React.FC<FigmaExportSettingsProps> = ({ tokenSystem }) => {
  const { colorMode } = useColorMode();
  const toast = useToast();
  
  const [accessToken, setAccessToken] = useState('');
  const [fileId, setFileId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPrePublishDialog, setShowPrePublishDialog] = useState(false);
  const [changeTrackingState, setChangeTrackingState] = useState<ChangeTrackingState | null>(null);
  const [checkingChanges, setCheckingChanges] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempAccessToken, setTempAccessToken] = useState('');
  const [tempFileId, setTempFileId] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [modalExportResult, setModalExportResult] = useState<FigmaExportResult | null>(null);
  const [modalShowPreview, setModalShowPreview] = useState(false);

  // Check change tracking state on mount and when data changes
  useEffect(() => {
    const checkChangeTracking = async () => {
      setCheckingChanges(true);
      try {
        const state = await ChangeTrackingService.getChangeTrackingState();
        setChangeTrackingState(state);
      } catch (error) {
        console.error('[FigmaExportSettings] Error checking change tracking:', error);
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

    checkChangeTracking();

    // Listen for data change events to re-check
    const handleDataChange = () => {
      checkChangeTracking();
    };

    window.addEventListener('token-model:data-change', handleDataChange);
    return () => {
      window.removeEventListener('token-model:data-change', handleDataChange);
    };
  }, []);

  // Check for unsaved changes in modal
  useEffect(() => {
    setHasUnsavedChanges(tempAccessToken !== accessToken || tempFileId !== fileId);
  }, [tempAccessToken, tempFileId, accessToken, fileId]);

  // Open modal and initialize temp values
  const handleOpenModal = () => {
    setTempAccessToken(accessToken);
    setTempFileId(fileId);
    setModalExportResult(null);
    setModalShowPreview(false);
    setIsModalOpen(true);
  };

  // Save modal changes
  const handleSaveModal = () => {
    setAccessToken(tempAccessToken);
    setFileId(tempFileId);
    setIsModalOpen(false);
    toast({
      title: 'Settings saved',
      description: 'Figma export settings have been updated',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  // Cancel modal changes
  const handleCancelModal = () => {
    setTempAccessToken(accessToken);
    setTempFileId(fileId);
    setModalExportResult(null);
    setModalShowPreview(false);
    setIsModalOpen(false);
  };

  // Manual token test function for debugging
  const testTokenManually = async () => {
    if (!tempAccessToken || !tempFileId) {
      toast({
        title: 'Missing credentials',
        description: 'Please enter both access token and file ID',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    console.log('[FigmaExportSettings] Manual token test starting...');
    console.log('[FigmaExportSettings] Token:', tempAccessToken.substring(0, 10) + '...');
    console.log('[FigmaExportSettings] File ID:', tempFileId);

    try {
      // Test 1: Get file info
      console.log('[FigmaExportSettings] Test 1: Getting file info...');
      const fileResponse = await fetch(`https://api.figma.com/v1/files/${tempFileId}`, {
        method: 'GET',
        headers: {
          'X-Figma-Token': `${tempAccessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[FigmaExportSettings] File response status:', fileResponse.status);
      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        console.log('[FigmaExportSettings] File data:', fileData);
        toast({
          title: 'Token test successful',
          description: `File: ${fileData.name}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        const errorText = await fileResponse.text();
        console.error('[FigmaExportSettings] File test failed:', fileResponse.status, errorText);
        toast({
          title: 'Token test failed',
          description: `File access failed: ${fileResponse.status}`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

      // Test 2: Get variables (this is what the pre-publish dialog does)
      console.log('[FigmaExportSettings] Test 2: Getting variables...');
      const variablesResponse = await fetch(`https://api.figma.com/v1/files/${tempFileId}/variables`, {
        method: 'GET',
        headers: {
            'X-Figma-Token': `${tempAccessToken}`,
            'Content-Type': 'application/json'
          }
      });

      console.log('[FigmaExportSettings] Variables response status:', variablesResponse.status);
      if (variablesResponse.ok) {
        const variablesData = await variablesResponse.json();
        console.log('[FigmaExportSettings] Variables data:', variablesData);
      } else {
        const errorText = await variablesResponse.text();
        console.error('[FigmaExportSettings] Variables test failed:', variablesResponse.status, errorText);
      }

    } catch (error) {
      console.error('[FigmaExportSettings] Manual token test failed:', error);
      toast({
        title: 'Token test failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Handle publishing to Figma
  const handlePublish = async () => {
    if (!tempAccessToken || !tempFileId) return;
    
    setLoading(true);
    try {
      console.log('[FigmaExportSettings] Starting Figma publishing...');
      
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

      console.log('[FigmaExportSettings] Using complete token system for publishing');
      console.log('[FigmaExportSettings] Token system stats:', {
        tokensCount: canonicalTokenSystem.tokens?.length || 0,
        collectionsCount: canonicalTokenSystem.tokenCollections?.length || 0,
        dimensionsCount: canonicalTokenSystem.dimensions?.length || 0
      });

      // Use the FigmaExportService for the complete publishing workflow
      const figmaExportService = new FigmaExportService();
      const result = await figmaExportService.publishToFigma(canonicalTokenSystem as TokenSystem, {
        accessToken: tempAccessToken,
        fileId: tempFileId
      });

      if (result.success) {
        // Store the export result for modal display
        setModalExportResult(result);
        
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
      console.error('[FigmaExportSettings] Publishing failed:', error);
      toast({
        title: 'Publishing failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred during publishing.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle export only (without publishing)
  const handleExportOnly = async () => {
    if (!tempAccessToken || !tempFileId) return;
    
    setLoading(true);
    try {
      console.log('[FigmaExportSettings] Starting export only...');
      
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

      console.log('[FigmaExportSettings] Canonical token system:', canonicalTokenSystem);
      const figmaExportService = new FigmaExportService();
      
      const result = await figmaExportService.exportToFigma(canonicalTokenSystem, {
        accessToken: tempAccessToken,
        fileId: tempFileId
      });
      
      console.log('[FigmaExportSettings] Export result:', result);
      setModalExportResult(result);
      
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
      console.error('[FigmaExportSettings] Export failed:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // Download the export JSON from modal
  const handleModalDownload = () => {
    if (!modalExportResult?.data) return;
    
    const blob = new Blob([JSON.stringify(modalExportResult.data, null, 2)], {
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

  // Copy the export JSON to clipboard from modal
  const handleModalCopy = async () => {
    if (!modalExportResult?.data) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(modalExportResult.data, null, 2));
      toast({
        title: 'Copied to clipboard',
        description: 'Figma variables export copied to clipboard',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Render change tracking status
  const renderChangeTrackingStatus = () => {
    if (checkingChanges) {
      return (
        <Alert status="info" borderRadius="md">
          <Spinner size="sm" mr={2} />
          <AlertDescription>
            Checking for changes...
          </AlertDescription>
        </Alert>
      );
    }

    if (!changeTrackingState) {
      return (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <AlertDescription>
            Unable to check change status. Export may be limited.
          </AlertDescription>
        </Alert>
      );
    }

    if (changeTrackingState.canExport) {
      return (
        <Alert status="success" borderRadius="md">
          <AlertIcon as={CheckCircle} />
          <AlertDescription>
            Ready to export. {changeTrackingState.changeCount > 0 
              ? `${changeTrackingState.changeCount} local changes detected, but GitHub is in sync.`
              : 'No changes detected.'
            }
          </AlertDescription>
        </Alert>
      );
    }

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
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Figma Export Settings Card */}
      <Box 
        p={3} 
        borderWidth={1} 
        borderRadius="md" 
        bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
      >
        <HStack justify="space-between" align="center">
          <Box>
            <CardTitle title="Figma" cardType="taxonomy" />
            <Text fontSize="sm" color="gray.600">
              Figma access token: {accessToken ? `${accessToken.substring(0, 10)}...` : 'Not set'}
            </Text>
            <Text fontSize="sm" color="gray.600">
              Figma File ID: {fileId || 'Not set'}
            </Text>
          </Box>
          <IconButton 
            aria-label="Edit Figma settings" 
            icon={<Pencil />} 
            size="sm" 
            onClick={handleOpenModal} 
          />
        </HStack>
      </Box>

      {/* Export Actions */}
      <VStack spacing={4} align="stretch">
        {/* Export functionality has been moved to the modal */}
      </VStack>

      {/* Settings Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCancelModal} size="2xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Figma export settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* Change Tracking Alert */}
              {renderChangeTrackingStatus()}
              
              <FormControl>
                <FormLabel>Figma Access Token</FormLabel>
                <InputGroup>
                  <Input
                    type="password"
                    value={tempAccessToken}
                    onChange={(e) => setTempAccessToken(e.target.value)}
                    placeholder="figd_..."
                    fontFamily="mono"
                  />
                  <InputRightElement width="auto" mr={2}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={testTokenManually}
                      isDisabled={!tempAccessToken || !tempFileId}
                    >
                      Test Token
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>

              <FormControl>
                <FormLabel>Figma File ID</FormLabel>
                <Input
                  value={tempFileId}
                  onChange={(e) => setTempFileId(e.target.value)}
                  placeholder="yTy5ytxeFPRiGou5Poed8a"
                  fontFamily="mono"
                />
              </FormControl>

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <AlertDescription>
                  Access token and file ID are required for publishing and exporting.
                </AlertDescription>
              </Alert>

              {/* Export Result Display */}
              {modalExportResult?.data && (
                <Box p={4} bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} borderRadius="md">
                  <VStack spacing={3} align="stretch">
                    <HStack justify="space-between">
                      <Text fontWeight="bold">Export Summary</Text>
                      <HStack spacing={2}>
                        <Badge colorScheme="green">{modalExportResult.data.variables.length} variables</Badge>
                        <Badge colorScheme="blue">{modalExportResult.data.collections.length} collections</Badge>
                        <Badge colorScheme="purple">{modalExportResult.data.variableModes.length} modes</Badge>
                      </HStack>
                    </HStack>
                    
                    <HStack spacing={2}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setModalShowPreview(!modalShowPreview)}
                        leftIcon={modalShowPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                      >
                        {modalShowPreview ? 'Hide' : 'Show'} Preview
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleModalDownload}
                        leftIcon={<Download size={14} />}
                      >
                        Download JSON
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleModalCopy}
                        leftIcon={<Copy size={14} />}
                      >
                        Copy JSON
                      </Button>
                    </HStack>

                    {modalShowPreview && (
                      <Box
                        p={3}
                        bg={colorMode === 'dark' ? 'gray.900' : 'white'}
                        borderWidth={1}
                        borderRadius="md"
                        maxH="300px"
                        overflowY="auto"
                      >
                        <pre style={{ fontSize: '12px', margin: 0 }}>
                          {JSON.stringify(modalExportResult.data, null, 2)}
                        </pre>
                      </Box>
                    )}
                  </VStack>
                </Box>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              onClick={handleExportOnly}
              isLoading={loading}
              loadingText="Generating Export..."
              isDisabled={!tempAccessToken || !tempFileId || hasUnsavedChanges || !changeTrackingState?.canExport}
              mr={3}
            >
              Export Only
            </Button>
            <Button
              colorScheme="green"
              onClick={handlePublish}
              isLoading={loading}
              loadingText="Publishing..."
              isDisabled={!tempAccessToken || !tempFileId || hasUnsavedChanges || !changeTrackingState?.canExport}
              mr={3}
            >
              Publish
            </Button>
            <Button variant="ghost" onClick={handleCancelModal}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleSaveModal} ml={3}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Pre-Publish Dialog */}
      {modalExportResult?.data && (
        <FigmaPrePublishDialog
          isOpen={showPrePublishDialog}
          onClose={() => setShowPrePublishDialog(false)}
          onPublish={handlePublish}
          transformationResult={modalExportResult.data}
          tokenSystem={tokenSystem}
          figmaFileId={fileId}
          accessToken={accessToken}
        />
      )}
    </VStack>
  );
}; 