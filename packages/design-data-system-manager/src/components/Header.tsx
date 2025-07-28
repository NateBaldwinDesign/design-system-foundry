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
  Divider,
} from '@chakra-ui/react';
import {
  History,
  Github,
  Download,
  Undo2,
  UserRound,
  GitBranch,
} from 'lucide-react';
import { ChangeLog } from './ChangeLog';
import { GitHubAuthService } from '../services/githubAuth';
import { GitHubApiService } from '../services/githubApi';
import { StorageService } from '../services/storage';
import type { GitHubUser } from '../config/github';
import { GitHubRepoSelector } from './GitHubRepoSelector';
import { GitHubSaveDialog } from './GitHubSaveDialog';
import { DATA_CHANGE_EVENT } from './AppLayout';

interface HeaderProps {
  hasChanges?: boolean;
  changeCount?: number;
  currentData: Record<string, unknown> | null;
  baselineData: Record<string, unknown> | null;
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
  currentData,
  baselineData,
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
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogMode, setSaveDialogMode] = useState<'direct' | 'pullRequest'>('direct');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isGitHubWorkflowMenuOpen, setIsGitHubWorkflowMenuOpen] = useState(false);
  const [isGitHubConnecting, setIsGitHubConnecting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isRefreshDialogOpen, setIsRefreshDialogOpen] = useState(false);
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

    // Get system name from stored root data
    const rootData = StorageService.getRootData();
    const systemName = rootData.systemName || 'Design System';

    // Determine if we're editing core data or theme overrides based on selected repo info
    if (selectedRepoInfo) {
      if (selectedRepoInfo.fileType === 'schema') {
        // Core data - use system name from stored data
        title = systemName;
      } else if (selectedRepoInfo.fileType === 'theme-override') {
        // Theme override - use "System: Theme" format
        const themes = StorageService.getThemes();
        const currentTheme = themes.find(theme => theme.isDefault) || themes[0];
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
        title = systemName;
      } else if (themes && themes.length > 0) {
        const currentTheme = themes.find(theme => theme.isDefault) || themes[0];
        const themeName = currentTheme?.displayName || 'Default Theme';
        title = `${systemName}: ${themeName}`;
      }
    }

    return { title, subtitle };
  };

  const { title, subtitle } = getTitleAndSubtitle();

  // Get real data when modal opens
  const handleOpenModal = () => {
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
    
    // Dispatch event to notify change detection that new data has been loaded
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
    
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

      // Use the same data loading logic as the App component
      if (onFileSelected) {
        onFileSelected(parsedData, selectedRepoInfo.fileType);
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
    // Toast already shown by GitHubSaveDialog
    
    // Dispatch event to notify change detection that data has been saved to GitHub
    // This will establish a new baseline and clear the change log
    window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
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

  const handleConfirmReset = async () => {
    // If connected to GitHub and have a selected repository, reload from GitHub
    if (selectedRepoInfo && githubUser) {
      try {
        await handleReloadCurrentFile();
        toast({
          title: 'Data Reset',
          description: `Data has been reset to ${selectedRepoInfo.filePath} from GitHub.`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        toast({
          title: 'Reset Failed',
          description: 'Failed to reload data from GitHub. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } else {
      // Use the default app-level reset handler for local data sources
      if (onResetData) {
        onResetData();
        // Dispatch event to notify change detection that data has been reset
        window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
        toast({
          title: 'Data Reset',
          description: 'Data has been reset to baseline.',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    }
    setIsResetDialogOpen(false);
  };

  const handleCancelReset = () => {
    setIsResetDialogOpen(false);
  };

  const handleRefreshData = () => {
    setIsRefreshDialogOpen(true);
  };

  const handleConfirmRefresh = async () => {
    try {
      await handleReloadCurrentFile();
      toast({
        title: 'Data Refreshed',
        description: `Data has been refreshed from ${selectedRepoInfo?.filePath} on GitHub.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh data from GitHub. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setIsRefreshDialogOpen(false);
  };

  const handleCancelRefresh = () => {
    setIsRefreshDialogOpen(false);
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
          {selectedRepoInfo && (
            <Github style={{alignSelf: 'center'}} size={16} />
          )}
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
                isOpen={isGitHubWorkflowMenuOpen} 
                onClose={() => setIsGitHubWorkflowMenuOpen(false)}
              >
                <PopoverTrigger>
                  <IconButton
                    aria-label="GitHub Workflow"
                    icon={<GitBranch size={16} />}
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsGitHubWorkflowMenuOpen(true)}
                  />
                </PopoverTrigger>
                <PopoverContent p={0} w="auto" minW="200px">
                  <PopoverArrow />
                  <PopoverBody p={2}>
                    <VStack spacing={0} align="stretch">
                      <Button
                        variant="ghost"
                        size="sm"
                        justifyContent="flex-start"
                        borderRadius={0}
                        onClick={() => {
                          setShowRepoSelector(true);
                          setIsGitHubWorkflowMenuOpen(false);
                        }}
                      >
                        Select new repository
                      </Button>
                      {selectedRepoInfo && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            justifyContent="flex-start"
                            borderRadius={0}
                            onClick={() => {
                              handleRefreshData();
                              setIsGitHubWorkflowMenuOpen(false);
                            }}
                          >
                            Refresh (pull) data
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            justifyContent="flex-start"
                            borderRadius={0}
                            onClick={() => {
                              handleSaveToGitHub();
                              setIsGitHubWorkflowMenuOpen(false);
                            }}
                          >
                            Save (commit)
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            justifyContent="flex-start"
                            borderRadius={0}
                            onClick={() => {
                              handleCreatePullRequest();
                              setIsGitHubWorkflowMenuOpen(false);
                            }}
                          >
                            Create Pull Request
                          </Button>
                        </>
                      )}
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
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

          {/* User Menu - Moved to the end */}
          {githubUser && (
            <Popover 
              placement="bottom-end" 
              isOpen={isUserMenuOpen} 
              onClose={() => setIsUserMenuOpen(false)}
            >
              <PopoverTrigger>
                <IconButton
                  aria-label="User Menu"
                  icon={<UserRound size={16} />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsUserMenuOpen(true)}
                />
              </PopoverTrigger>
              <PopoverContent p={0} w="auto" minW="200px">
                <PopoverArrow />
                <PopoverBody p={2}>
                  <VStack spacing={0} align="stretch">
                    <HStack p={2} mb={2} w="full" justifyContent="space-between" alignItems="center">
                      <VStack spacing={0} align="flex-start">
                        <Avatar size="lg" src={githubUser.avatar_url} mb={2}/>
                        <Text fontSize="sm" fontWeight="bold">{githubUser.login}</Text>
                        <Text fontSize="xs" color="gray.500">{githubUser.email}</Text>
                      </VStack>
                    </HStack>
                    <Divider mb={2} />
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
                      Sign out
                    </Button>
                  </VStack>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          )}
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
              currentData={currentData}
              previousData={baselineData}
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
            <AlertDialogHeader>
              {selectedRepoInfo && githubUser ? 'Reset to GitHub source?' : 'Reset data?'}
            </AlertDialogHeader>
            <AlertDialogBody>
              {selectedRepoInfo && githubUser ? (
                `This will reload all data from ${selectedRepoInfo.filePath} on GitHub and you will lose all of your local changes. This cannot be undone.`
              ) : (
                'This will revert to the original state and you will lose all of your changes. This cannot be undone.'
              )}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleCancelReset}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleConfirmReset} ml={3}>
                {selectedRepoInfo && githubUser ? 'Reset to GitHub' : 'Reset data'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={isRefreshDialogOpen}
        onClose={handleCancelRefresh}
        leastDestructiveRef={cancelRef}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>
              {selectedRepoInfo && githubUser ? 'Refresh data from GitHub?' : 'Refresh data?'}
            </AlertDialogHeader>
            <AlertDialogBody>
              {selectedRepoInfo && githubUser ? (
                `This will reload all data from ${selectedRepoInfo.filePath} on GitHub and you will lose all of your local changes. This cannot be undone.`
              ) : (
                'This will revert to the original state and you will lose all of your changes. This cannot be undone.'
              )}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleCancelRefresh}>
                Cancel
              </Button>
              <Button colorScheme="blue" onClick={handleConfirmRefresh} ml={3}>
                {selectedRepoInfo && githubUser ? 'Refresh from GitHub' : 'Refresh data'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}; 