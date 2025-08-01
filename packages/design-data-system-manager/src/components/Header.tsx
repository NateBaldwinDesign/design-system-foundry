import React, { useState, useEffect, memo } from 'react';
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
  Spinner,
  Divider,
} from '@chakra-ui/react';
import {
  History,
  Github,
  Download,
  UserRound,
  GitBranch,
  BookMarked,
  RefreshCw,
  GitCommitVertical,
  GitPullRequestArrow,
  Share2,
} from 'lucide-react';
import { ChangeLog } from './ChangeLog';
import { GitHubAuthService } from '../services/githubAuth';
import { GitHubApiService } from '../services/githubApi';
import { StorageService } from '../services/storage';
import { ChangeTrackingService } from '../services/changeTrackingService';
import type { GitHubUser } from '../config/github';
import { FindDesignSystemDialog } from './FindDesignSystemDialog';
import { GitHubSaveDialog } from './GitHubSaveDialog';
import { DATA_CHANGE_EVENT } from './AppLayout';
import { PlatformDropdown } from './PlatformDropdown';
import { ThemeDropdown } from './ThemeDropdown';
import { BranchCreationDialog } from './BranchCreationDialog';
import { isMainBranch } from '../utils/BranchValidationUtils';

import type { DataSourceContext } from '../services/dataSourceManager';

interface HeaderProps {
  hasChanges?: boolean;
  changeCount?: number;
  currentData: Record<string, unknown> | null;
  baselineData: Record<string, unknown> | null;
  // Data source control props - removed unused props
  onResetData?: () => void;
  onExportData?: () => void;
  isGitHubConnected?: boolean;
  // GitHub state and handlers from app level
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
  // URL-based access props
  isURLBasedAccess?: boolean;
  urlRepoInfo?: {
    repo: string;
    path: string;
    branch: string;
  } | null;
  // GitHub permissions
  hasEditPermissions?: boolean;
  // Data source context props
  dataSourceContext?: DataSourceContext;
  onPlatformChange?: (platformId: string | null) => void;
  onThemeChange?: (themeId: string | null) => void;
  // Branch-based governance props
  isEditMode?: boolean;
  currentBranch?: string;
  onBranchCreated?: (branchName: string) => void;
  onEnterEditMode?: () => void;
  onExitEditMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  hasChanges = false, 
  changeCount = 0,
  currentData,
  baselineData,
  // Data source control props - removed unused props
  onResetData,
  onExportData,
  isGitHubConnected = false,
  // GitHub state and handlers from app level
  githubUser,
  selectedRepoInfo,
  onGitHubConnect,
  onGitHubDisconnect,
  onFileSelected,
  onRefreshData,
  // URL-based access props
  isURLBasedAccess = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  urlRepoInfo = null, // Keep for interface compatibility but not used in logic
  // GitHub permissions
  hasEditPermissions = false,
  // Data source context props
  dataSourceContext,
  onPlatformChange,
  onThemeChange,
  // Branch-based governance props
  isEditMode = false,
  currentBranch = 'main',
  onBranchCreated,
  onEnterEditMode,
  onExitEditMode,
}) => {
  const { colorMode } = useColorMode();
  
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';
  const bgColor = colorMode === 'dark' ? 'gray.800' : 'white';
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [showFindDesignSystem, setShowFindDesignSystem] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogMode, setSaveDialogMode] = useState<'direct' | 'pullRequest'>('direct');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isGitHubWorkflowMenuOpen, setIsGitHubWorkflowMenuOpen] = useState(false);
  const [isGitHubConnecting, setIsGitHubConnecting] = useState(false);
  const [showBranchCreationDialog, setShowBranchCreationDialog] = useState(false);
  const toast = useToast();

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

    // Check for URL parameters first (regardless of loading success)
    const urlParams = new URLSearchParams(window.location.search);
    const repo = urlParams.get('repo');
    const branch = urlParams.get('branch') || 'main';

    if (repo) {
      // URL parameters present - check if data was successfully loaded
      // Check if we have actual data loaded (collections, tokens, etc.)
      const collections = StorageService.getCollections();
      const tokens = StorageService.getTokens();
      const hasDataLoaded = collections && collections.length > 0 && tokens && tokens.length > 0;
      
      if (hasDataLoaded) {
        // Data was successfully loaded - show system name from data
        title = systemName;
        // Check actual permissions and edit mode to determine access level
        if (isEditMode) {
          subtitle = `(${currentBranch}) - Editing`;
        } else if (hasEditPermissions) {
          subtitle = `(${currentBranch}) - Edit Access`;
        } else {
          subtitle = `(${currentBranch}) - View Only`;
        }
      } else {
        // URL loading failed - show repository name as fallback
        const [owner, repoName] = repo.split('/');
        title = `${owner}/${repoName}`;
        subtitle = `(${branch}) - Loading Failed`;
      }
      return { title, subtitle };
    }

    // Check if we have a data source context (platform/theme switching)
    if (dataSourceContext) {
      title = systemName;
      
      // Show current platform/theme selection
      const platformName = dataSourceContext.currentPlatform && dataSourceContext.currentPlatform !== 'none' 
        ? dataSourceContext.availablePlatforms.find(p => p.id === dataSourceContext.currentPlatform)?.displayName 
        : null;
      const themeName = dataSourceContext.currentTheme && dataSourceContext.currentTheme !== 'none'
        ? dataSourceContext.availableThemes.find(t => t.id === dataSourceContext.currentTheme)?.displayName
        : null;
      
      if (platformName && themeName) {
        subtitle = `${platformName} + ${themeName}`;
      } else if (platformName) {
        subtitle = platformName;
      } else if (themeName) {
        subtitle = themeName;
      } else {
        subtitle = 'Core Data';
      }
      
      return { title, subtitle };
    }

    // Determine if we're editing core data or theme overrides based on selected repo info
    if (selectedRepoInfo) {
      if (selectedRepoInfo.fileType === 'schema') {
        // Core data - use system name from stored data
        title = systemName;
      } else if (selectedRepoInfo.fileType === 'theme-override') {
        // Theme override - use "System: Theme" format
        const themes = StorageService.getThemes();
        const currentTheme = themes[0];
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
        const currentTheme = themes[0];
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
    // Clear URL parameters when disconnecting from GitHub
    const url = new URL(window.location.href);
    url.search = '';
    window.history.replaceState({}, '', url.toString());
    
    // Use the app-level handler
    if (onGitHubDisconnect) {
      onGitHubDisconnect();
    }
    
    // Clear local UI state
    setShowFindDesignSystem(false);
    setShowSaveDialog(false);
    setIsUserMenuOpen(false);
    setIsGitHubConnecting(false);
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

      // Toast is now handled by the onFileSelected callback in App.tsx
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
    
    // Update the baseline data to match current data since it's now saved to GitHub
    if (currentData) {
      ChangeTrackingService.setBaselineData(currentData);
      ChangeTrackingService.updateLastGitHubSync();
    }
    
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

  // Data source control handlers - removed unused handlers

  const handleRefreshData = async () => {
    if (onRefreshData) {
      await onRefreshData();
    } else {
      // Fallback to old behavior if onRefreshData is not provided
      handleReloadCurrentFile();
    }
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

  // Generate shareable URL for current repository
  const generateShareableURL = () => {
    // Check for URL parameters first (regardless of loading success)
    const urlParams = new URLSearchParams(window.location.search);
    const repo = urlParams.get('repo');
    const path = urlParams.get('path') || 'schema.json';
    const branch = urlParams.get('branch') || 'main';

    if (repo) {
      // URL parameters present - generate URL from parameters
      const baseURL = window.location.origin;
      const params = new URLSearchParams();
      params.set('repo', repo);
      params.set('path', path);
      params.set('branch', branch);
      return `${baseURL}?${params.toString()}`;
    } else if (selectedRepoInfo) {
      // Fall back to selected repository info
      const baseURL = window.location.origin;
      const params = new URLSearchParams();
      params.set('repo', selectedRepoInfo.fullName);
      params.set('path', selectedRepoInfo.filePath);
      params.set('branch', selectedRepoInfo.branch);
      return `${baseURL}?${params.toString()}`;
    }
    return null;
  };

  // Handle share functionality
  const handleShare = async () => {
    const shareURL = generateShareableURL();
    
    if (!shareURL) {
      toast({
        title: 'Cannot Share',
        description: 'No repository information available to share.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(shareURL);
      toast({
        title: 'URL Copied',
        description: 'Repository URL has been copied to clipboard.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Copy failed:', error);
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy the repository URL to clipboard.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Branch-based governance handlers
  const handleEnterEditMode = () => {
    // Check if we're on a main branch
    if (isMainBranch(currentBranch)) {
      // Main branch - open branch creation dialog
      setShowBranchCreationDialog(true);
    } else {
      // Non-main branch - call the app-level handler
      if (onEnterEditMode) {
        onEnterEditMode();
      }
    }
  };

  const handleBranchCreated = (branchName: string) => {
    if (onBranchCreated) {
      onBranchCreated(branchName);
    }
    setShowBranchCreationDialog(false);
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
                        {/* Platform and Theme Dropdowns */}
              {dataSourceContext && (
                <HStack spacing={4}>
                  <PlatformDropdown
                    availablePlatforms={dataSourceContext.availablePlatforms}
                    currentPlatform={dataSourceContext.currentPlatform}
                    permissions={dataSourceContext.permissions.platforms}
                    onPlatformChange={onPlatformChange || (() => {})}
                  />
                  <ThemeDropdown
                    availableThemes={dataSourceContext.availableThemes}
                    currentTheme={dataSourceContext.currentTheme}
                    permissions={dataSourceContext.permissions.themes}
                    onThemeChange={onThemeChange || (() => {})}
                  />

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
                        leftIcon={<BookMarked size={16} />}
                        onClick={() => {
                          setShowFindDesignSystem(true);
                          setIsGitHubWorkflowMenuOpen(false);
                        }}
                      >
                        Load design system from URL
                      </Button>
                      {selectedRepoInfo && (
                        <>
                          {hasEditPermissions && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                justifyContent="flex-start"
                                borderRadius={0}
                                leftIcon={<RefreshCw size={16} />}
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
                                leftIcon={<GitCommitVertical size={16} />}
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
                                leftIcon={<GitPullRequestArrow size={16} />}
                                onClick={() => {
                                  handleCreatePullRequest();
                                  setIsGitHubWorkflowMenuOpen(false);
                                }}
                              >
                                Create Pull Request
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            justifyContent="flex-start"
                            borderRadius={0}
                            leftIcon={<Share2 size={16} />}
                            onClick={() => {
                              handleShare();
                              setIsGitHubWorkflowMenuOpen(false);
                            }}
                          >
                            Copy Repository URL
                          </Button>
                        </>
                      )}
                    </VStack>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </HStack>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleGitHubConnect}
              isLoading={isGitHubConnecting}
              isDisabled={isGitHubConnecting}
              leftIcon={isGitHubConnecting ? <Spinner size="sm" /> : <Github size={16} />}
            >
              Sign in
            </Button>
          )}

          {/* Branch-based Governance Buttons */}
          {githubUser && hasEditPermissions && (
            <HStack spacing={2}>
              {isEditMode ? (
                <>
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={handleSaveToGitHub}
                    leftIcon={<GitCommitVertical size={16} />}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onExitEditMode}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  colorScheme="green"
                  onClick={handleEnterEditMode}
                >
                  Edit
                </Button>
              )}
            </HStack>
          )}

          {/* Data Action Buttons - Always available when handlers are provided */}
          {(onExportData || onResetData || isURLBasedAccess) && (
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
              {(isURLBasedAccess || (() => {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get('repo') !== null;
              })()) && (
                <Tooltip label="Copy Repository URL">
                  <IconButton
                    aria-label="Copy Repository URL"
                    icon={<Share2 size={16} />}
                    size="sm"
                    variant="ghost"
                    onClick={handleShare}
                  />
                </Tooltip>
              )}
            </HStack>
          )}
          
          {/* Change Log - Only show when connected to GitHub */}
          {githubUser && (
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
          )}

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

      {/* Find Design System Dialog */}
      <FindDesignSystemDialog
        isOpen={showFindDesignSystem}
        onClose={() => setShowFindDesignSystem(false)}
        onDesignSystemSelected={(repo, filePath) => {
          // Load the design system using the existing URL-based logic
          const url = new URL(window.location.href);
          url.searchParams.set('repo', repo);
          url.searchParams.set('path', filePath);
          url.searchParams.set('branch', 'main');
          window.location.href = url.toString();
        }}
      />

      {/* Branch Creation Dialog */}
      <BranchCreationDialog
        isOpen={showBranchCreationDialog}
        onClose={() => setShowBranchCreationDialog(false)}
        onBranchCreated={handleBranchCreated}
        currentBranch={currentBranch}
        repositoryFullName={selectedRepoInfo?.fullName || ''}
        githubUser={githubUser || null}
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
        // Branch-based governance props
        currentBranch={currentBranch}
        isEditMode={isEditMode}
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
    </>
  );
};

export default memo(Header); 