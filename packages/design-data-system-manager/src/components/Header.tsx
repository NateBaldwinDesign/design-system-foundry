import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  HStack,
  IconButton,
  Tooltip,
  useColorMode,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Badge,
  Text,
  useToast,
  TagLabel,
  Tag,
  Avatar,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Button,
  VStack,
  Select,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import {
  History,
  Github,
  Save,
  GitPullRequest,
  BookMarked,
  Download,
  Undo2,
  BookDownIcon,
} from 'lucide-react';
import { ChangeLog } from './ChangeLog';
import { GitHubAuthService } from '../services/githubAuth';
import { GitHubApiService } from '../services/githubApi';
import { StorageService } from '../services/storage';
import type { GitHubUser } from '../config/github';
import { GitHubRepoSelector } from './GitHubRepoSelector';
import { GitHubSaveDialog } from './GitHubSaveDialog';

interface HeaderProps {
  hasChanges?: boolean;
  changeCount?: number;
  getCurrentData: () => Record<string, unknown>;
  getBaselineData: () => Record<string, unknown>;
  // Data source control props
  dataSource?: string;
  setDataSource?: (source: string) => void;
  dataOptions?: { label: string; value: string; hasAlgorithms: boolean }[];
  onResetData?: () => void;
  onExportData?: () => void;
  isGitHubConnected?: boolean;
  // GitHub state and handlers from app level
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
}

export const Header: React.FC<HeaderProps> = ({ 
  hasChanges = false, 
  changeCount = 0,
  getCurrentData,
  getBaselineData,
  // Data source control props
  dataSource,
  setDataSource,
  dataOptions,
  onResetData,
  onExportData,
  isGitHubConnected = false,
  // GitHub state and handlers from app level
  githubUser,
  selectedRepoInfo,
  onGitHubConnect,
  onGitHubDisconnect,
  onFileSelected,
}) => {
  const { colorMode } = useColorMode();
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';
  const bgColor = colorMode === 'dark' ? 'gray.800' : 'white';
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [changeLogData, setChangeLogData] = useState<{
    currentData: Record<string, unknown>;
    baselineData: Record<string, unknown>;
  } | null>(null);
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogMode, setSaveDialogMode] = useState<'direct' | 'pullRequest'>('direct');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isGitHubConnecting, setIsGitHubConnecting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const toast = useToast();
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Clear GitHub connecting state when user returns from OAuth flow
  useEffect(() => {
    // If user is authenticated, clear the connecting state
    if (isGitHubConnected) {
      setIsGitHubConnecting(false);
    }
    
    // Also clear if there are no stale OAuth state parameters (indicating OAuth flow completed or was cancelled)
    if (!GitHubAuthService.hasStaleOAuthState()) {
      setIsGitHubConnecting(false);
    }
  }, [isGitHubConnected]);

  // Get the current title and subtitle based on data context
  const getTitleAndSubtitle = () => {
    let title = 'Design System Manager';
    let subtitle = '';

    // Determine if we're editing core data or theme overrides based on selected repo info
    if (selectedRepoInfo) {
      if (selectedRepoInfo.fileType === 'schema') {
        // Core data - use system name
        title = 'Design System'; // Default, could be enhanced to get from actual data
      } else if (selectedRepoInfo.fileType === 'theme-override') {
        // Theme override - use "System: Theme" format
        const themes = StorageService.getThemes();
        const currentTheme = themes.find(theme => theme.isDefault) || themes[0];
        const systemName = 'Design System'; // Default system name
        const themeName = currentTheme?.displayName || 'Default Theme';
        title = `${systemName}: ${themeName}`;
      }
      
      // Add GitHub branch info
      subtitle = `(${selectedRepoInfo.branch})`;
    } else {
      // No GitHub connection - try to determine from local data
      const collections = StorageService.getCollections();
      const themes = StorageService.getThemes();
      
      if (collections && collections.length > 0) {
        title = 'Design System';
      } else if (themes && themes.length > 0) {
        const currentTheme = themes.find(theme => theme.isDefault) || themes[0];
        const systemName = 'Design System';
        const themeName = currentTheme?.displayName || 'Default Theme';
        title = `${systemName}: ${themeName}`;
      }
    }

    return { title, subtitle };
  };

  const { title, subtitle } = getTitleAndSubtitle();

  // Get real data when modal opens
  const handleOpenModal = () => {
    const currentData = getCurrentData();
    const baselineData = getBaselineData();
    setChangeLogData({ currentData, baselineData });
    onOpen();
  };

  const handleGitHubConnect = async () => {
    setIsGitHubConnecting(true);
    
    try {
      // Add a small delay to show loading state for better UX
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use the app-level handler
      if (onGitHubConnect) {
        await onGitHubConnect();
      }
      
    } catch (error) {
      console.error('GitHub connection error:', error);
      setIsGitHubConnecting(false);
      
      toast({
        title: 'GitHub Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to GitHub. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleGitHubDisconnect = () => {
    // Use the app-level handler
    if (onGitHubDisconnect) {
      onGitHubDisconnect();
    }
    
    // Clear local UI state
    setShowRepoSelector(false);
    setShowSaveDialog(false);
    setIsUserMenuOpen(false);
    setIsGitHubConnecting(false);
  };

  const handleFileSelected = (fileContent: Record<string, unknown>, fileType: 'schema' | 'theme-override') => {
    // Use the app-level handler
    if (onFileSelected) {
      onFileSelected(fileContent, fileType);
    }
    
    setShowRepoSelector(false);
    // Note: Toast message is already shown by GitHubRepoSelector with repository details
  };

  const handleReloadCurrentFile = async () => {
    if (!selectedRepoInfo) return;

    try {
      const fileContent = await GitHubApiService.getFileContent(
        selectedRepoInfo.fullName,
        selectedRepoInfo.filePath,
        selectedRepoInfo.branch
      );

      const parsedData = JSON.parse(fileContent.content);

      // Load data into local storage based on file type
      if (selectedRepoInfo.fileType === 'schema') {
        // Load as core data
        StorageService.setCollections(parsedData.tokenCollections || []);
        StorageService.setDimensions(parsedData.dimensions || []);
        StorageService.setTokens(parsedData.tokens || []);
        StorageService.setPlatforms(parsedData.platforms || []);
        StorageService.setThemes(parsedData.themes || []);
        StorageService.setTaxonomies(parsedData.taxonomies || []);
        StorageService.setValueTypes(parsedData.resolvedValueTypes || []);
      } else if (selectedRepoInfo.fileType === 'theme-override') {
        // Load as theme override
        console.log('Theme override data loaded:', parsedData);
      }

      // Refresh the App data to update the UI
      const refreshAppData = (window as Window & { refreshAppData?: () => void }).refreshAppData;
      if (refreshAppData) {
        refreshAppData();
      }

      toast({
        title: 'Reloaded',
        description: `Successfully reloaded ${selectedRepoInfo.filePath}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Reload Failed',
        description: 'Failed to reload file from GitHub.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSaveSuccess = () => {
    toast({
      title: 'Save Successful',
      description: 'Data saved to GitHub successfully.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleSaveToGitHub = () => {
    setSaveDialogMode('direct');
    setShowSaveDialog(true);
  };

  const handleCreatePullRequest = () => {
    setSaveDialogMode('pullRequest');
    setShowSaveDialog(true);
  };

  // Data source control handlers
  const handleDataSourceChange = (newDataSource: string) => {
    if (setDataSource) {
      setDataSource(newDataSource);
    }
  };

  const handleResetData = () => {
    setIsResetDialogOpen(true);
  };

  const handleConfirmReset = () => {
    if (onResetData) {
      onResetData();
      toast({
        title: 'Data Reset',
        description: 'Data has been reset to baseline.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }
    setIsResetDialogOpen(false);
  };

  const handleCancelReset = () => {
    setIsResetDialogOpen(false);
  };

  const handleExportData = () => {
    if (onExportData) {
      onExportData();
      toast({
        title: 'Data Exported',
        description: 'Data has been exported successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  return (
    <>
      <Box
        as="header"
        borderBottom="1px"
        borderColor={borderColor}
        bg={bgColor}
        px={4}
        py={3}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <HStack spacing={2} alignItems="baseline">
          <Text fontSize="md" fontWeight="bold">{title}</Text>
          <Text fontSize="xs">{subtitle}</Text>
        </HStack>
        <HStack spacing={2}>
          {/* Data Source Controls - Only show when not connected to GitHub */}
          {!isGitHubConnected && dataOptions && dataSource && setDataSource && (
            <HStack spacing={2}>
              <Select
                size="sm"
                value={dataSource}
                onChange={(e) => handleDataSourceChange(e.target.value)}
                minW="200px"
              >
                {dataOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </HStack>
          )}

          {/* GitHub Connection */}
          {githubUser ? (
            <HStack spacing={2}>
              <Popover 
                placement="bottom-end" 
                isOpen={isUserMenuOpen} 
                onClose={() => setIsUserMenuOpen(false)}
              >
                <PopoverTrigger>
                  <Tag 
                    size="md" 
                    colorScheme="gray" 
                    variant="subtle" 
                    borderRadius="full" 
                    gap={2}
                    cursor="pointer"
                    _hover={{ bg: 'gray.100' }}
                    _dark={{ _hover: { bg: 'gray.700' } }}
                    onClick={() => setIsUserMenuOpen(true)}
                  >
                    <Avatar size="2xs" src={githubUser.avatar_url} />
                    <TagLabel fontSize="xs">{githubUser.login}</TagLabel>
                  </Tag>
                </PopoverTrigger>
                <PopoverContent p={0} w="auto" minW="200px">
                  <PopoverArrow />
                  <PopoverBody p={0}>
                    <VStack spacing={0} align="stretch">
                      <Button
                        variant="ghost"
                        size="sm"
                        justifyContent="flex-start"
                        borderRadius={0}
                        onClick={() => {
                          window.open(`https://github.com/${githubUser.login}`, '_blank');
                          setIsUserMenuOpen(false);
                        }}
                      >
                        View Profile
                      </Button>
                      {selectedRepoInfo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          justifyContent="flex-start"
                          borderRadius={0}
                          onClick={() => {
                            window.open(`https://github.com/${selectedRepoInfo.fullName}/pulls?q=author:${githubUser.login}`, '_blank');
                            setIsUserMenuOpen(false);
                          }}
                        >
                          My Pull Requests
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        justifyContent="flex-start"
                        borderRadius={0}
                        colorScheme="red"
                        onClick={() => {
                          handleGitHubDisconnect();
                          setIsUserMenuOpen(false);
                        }}
                      >
                        Disconnect from GitHub
                      </Button>
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
              <Tooltip label="Select Repository">
                <IconButton
                  aria-label="Select Repository"
                  icon={<BookMarked size={16} />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRepoSelector(true)}
                />
              </Tooltip>
            </HStack>
          ) : (
            <Tooltip label={isGitHubConnecting ? "Connecting to GitHub..." : "Connect GitHub"}>
              <IconButton
                aria-label="Connect GitHub"
                icon={isGitHubConnecting ? <Spinner size="sm" /> : <Github size={16} />}
                size="sm"
                variant="ghost"
                onClick={handleGitHubConnect}
                isLoading={isGitHubConnecting}
                isDisabled={isGitHubConnecting}
              />
            </Tooltip>
          )}

          {/* GitHub Repository Actions */}
          {selectedRepoInfo && githubUser && (
            <HStack spacing={2}>
              <Tooltip label="Reload from GitHub">
                <IconButton
                  aria-label="Reload from GitHub"
                  icon={<BookDownIcon size={16} />}
                  size="sm"
                  variant="ghost"
                  onClick={handleReloadCurrentFile}
                />
              </Tooltip>
              <Tooltip label="Commit Changes to GitHub">
                <IconButton
                  aria-label="Commit Changes to GitHub"
                  icon={<Save size={16} />}
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveToGitHub}
                />
              </Tooltip>
              <Tooltip label="Create Pull Request">
                <IconButton
                  aria-label="Create Pull Request"
                  icon={<GitPullRequest size={16} />}
                  size="sm"
                  variant="ghost"
                  onClick={handleCreatePullRequest}
                />
              </Tooltip>

            </HStack>
          )}
          {/* Data Action Buttons - Always available when handlers are provided */}
          {(onExportData || onResetData) && (
            <HStack spacing={2}>
              {onExportData && (
                <Tooltip label="Export Data">
                  <IconButton
                    aria-label="Export Data"
                    icon={<Download size={16} />}
                    size="sm"
                    variant="ghost"
                    onClick={handleExportData}
                  />
                </Tooltip>
              )}
              {onResetData && (
                <Tooltip label="Reset Data">
                  <IconButton
                    aria-label="Reset Data"
                    icon={<Undo2 size={16} />}
                    size="sm"
                    variant="ghost"
                    onClick={handleResetData}
                  />
                </Tooltip>
              )}
            </HStack>
          )}
          <Box position="relative">
            <Tooltip label="History" placement="bottom">
              <IconButton
                aria-label="History"
                icon={<History size={16} />}
                variant="ghost"
                size="sm"
                onClick={handleOpenModal}
              />
            </Tooltip>
            {hasChanges && (
              <Badge
                position="absolute"
                top="-2px"
                right="-2px"
                colorScheme="red"
                variant="solid"
                size="sm"
                borderRadius="full"
                minW="18px"
                h="18px"
                fontSize="xs"
                display="flex"
                alignItems="center"
                justifyContent="center"
                zIndex={1}
              >
                {changeCount > 99 ? '99+' : changeCount}
              </Badge>
            )}
          </Box>
        </HStack>
      </Box>

      {/* GitHub Repository Selector Modal */}
      <GitHubRepoSelector
        isOpen={showRepoSelector}
        onClose={() => setShowRepoSelector(false)}
        onFileSelected={handleFileSelected}
      />

      {/* GitHub Save Dialog */}
      <GitHubSaveDialog
        isOpen={showSaveDialog}
        onClose={() => {
          setShowSaveDialog(false);
          setSaveDialogMode('direct'); // Reset to default mode
        }}
        saveMode={saveDialogMode}
        onSuccess={handleSaveSuccess}
      />

      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        size="xl" 
        scrollBehavior="inside"
        closeOnOverlayClick={true}
        closeOnEsc={true}
        isCentered={true}
      >
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent>
          <ModalHeader>Change History</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <ChangeLog 
              previousData={changeLogData?.baselineData}
              currentData={changeLogData?.currentData}
            />
           
          </ModalBody>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isResetDialogOpen}
        onClose={handleCancelReset}
        leastDestructiveRef={cancelRef}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>Reset data?</AlertDialogHeader>
            <AlertDialogBody>
              This will revert to the original state and you will lose all of your changes. This cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleCancelReset}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleConfirmReset} ml={3}>
                Reset data
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}; 