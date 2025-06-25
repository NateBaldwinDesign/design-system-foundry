import React, { useState, useEffect } from 'react';
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
} from '@chakra-ui/react';
import {
  History,
  Github,
  FolderOpen,
  RefreshCw,
  Save,
  GitPullRequest,
  UnlinkIcon,
  BookMarked,
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
}

export const Header: React.FC<HeaderProps> = ({ 
  hasChanges = false, 
  changeCount = 0,
  getCurrentData,
  getBaselineData
}) => {
  const { colorMode } = useColorMode();
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';
  const bgColor = colorMode === 'dark' ? 'gray.800' : 'white';
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [changeLogData, setChangeLogData] = useState<{
    currentData: Record<string, unknown>;
    baselineData: Record<string, unknown>;
  } | null>(null);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(GitHubAuthService.getCurrentUser());
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveDialogMode, setSaveDialogMode] = useState<'direct' | 'pullRequest'>('direct');
  const [selectedRepoInfo, setSelectedRepoInfo] = useState<{
    fullName: string;
    branch: string;
    filePath: string;
    fileType: 'schema' | 'theme-override';
  } | null>(null);
  const toast = useToast();

  // Load selected repository info on mount
  useEffect(() => {
    const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
    setSelectedRepoInfo(repoInfo);
  }, []);

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

  const handleGitHubConnect = () => {
    GitHubAuthService.initiateAuth();
  };

  const handleGitHubDisconnect = () => {
    GitHubAuthService.logout();
    setGithubUser(null);
    setSelectedRepoInfo(null);
    toast({
      title: 'Disconnected',
      description: 'Successfully disconnected from GitHub.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleFileSelected = (_fileContent: Record<string, unknown>, fileType: 'schema' | 'theme-override') => {
    // Get the selected repository info from localStorage
    const repoInfoStr = localStorage.getItem('github_selected_repo');
    if (repoInfoStr) {
      const repoInfo = JSON.parse(repoInfoStr);
      setSelectedRepoInfo(repoInfo);
    }
    
    setShowRepoSelector(false);
    toast({
      title: 'File Loaded',
      description: `Successfully loaded ${fileType === 'schema' ? 'core data' : 'theme override'} from GitHub`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
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
          {/* GitHub Connection */}
          {githubUser ? (
            <HStack spacing={2}>
              <Badge colorScheme="green" variant="subtle">
                <HStack spacing={1}>
                  <Github size={12} />
                  <Text fontSize="xs">{githubUser.login}</Text>
                </HStack>
              </Badge>
              <Tooltip label="Select Repository">
                <IconButton
                  aria-label="Select Repository"
                  icon={<BookMarked size={16} />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowRepoSelector(true)}
                />
              </Tooltip>
              <Tooltip label="Disconnect GitHub">
                <IconButton
                  aria-label="Disconnect GitHub"
                  icon={<UnlinkIcon size={16} />}
                  size="sm"
                  variant="ghost"
                  onClick={handleGitHubDisconnect}
                />
              </Tooltip>
            </HStack>
          ) : (
            <Tooltip label="Connect GitHub">
              <IconButton
                aria-label="Connect GitHub"
                icon={<Github size={16} />}
                size="sm"
                variant="ghost"
                onClick={handleGitHubConnect}
              />
            </Tooltip>
          )}

            {/* GitHub Repository Actions */}
            {selectedRepoInfo && (
            <HStack spacing={2}>
              <Tooltip label="Save to GitHub">
                <IconButton
                  aria-label="Save to GitHub"
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
              <Tooltip label="Reload from GitHub">
                <IconButton
                  aria-label="Reload from GitHub"
                  icon={<RefreshCw size={16} />}
                  size="sm"
                  variant="ghost"
                  onClick={handleReloadCurrentFile}
                />
              </Tooltip>
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
    </>
  );
}; 