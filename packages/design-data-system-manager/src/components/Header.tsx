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
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Button,
  VStack,
  Spinner,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Divider,
  Avatar,
} from '@chakra-ui/react';
import {
  History,
  Github,
  Download,
  GitBranch,
  BookMarked,
  RefreshCw,
  GitCommitVertical,
  GitPullRequestArrow,
  Share2,
  Database,
} from 'lucide-react';
import { ChangeLog } from './ChangeLog';
import { GitHubAuthService } from '../services/githubAuth';
import { GitHubApiService } from '../services/githubApi';
import { StorageService } from '../services/storage';
import { ChangeTrackingService } from '../services/changeTrackingService';
import { DataEditorService } from '../services/dataEditorService';
import { SourceManagerService } from '../services/sourceManagerService';
import type { GitHubUser } from '../config/github';
import { FindDesignSystemDialog } from './FindDesignSystemDialog';
import { GitHubSaveDialog } from './GitHubSaveDialog';
import { DATA_CHANGE_EVENT } from './AppLayout';
import { PlatformDropdown } from './PlatformDropdown';
import { ThemeDropdown } from './ThemeDropdown';
import { BranchSelectionDialog } from './BranchSelectionDialog';
import { isMainBranch } from '../utils/BranchValidationUtils';

import type { DataSourceContext } from '../services/dataSourceManager';
import { DataSourceManager } from '../services/dataSourceManager';

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
  onRefreshData?: (suppressToast?: boolean) => Promise<void>;
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
  // Branch-based governance props
  isEditMode?: boolean;
  currentBranch?: string;
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
  
  // NEW: Edit mode handlers
  onSaveChanges?: () => void;
  onDiscardChanges?: () => void;
  
  // NEW: Override information
  pendingOverrides?: Array<{
    tokenId: string;
    tokenName: string;
    overrideType: 'platform' | 'theme';
    overrideSource: string;
  }>;
}

export const Header: React.FC<HeaderProps> = ({ 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hasChanges = false, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  // Branch-based governance props
  isEditMode = false,
  currentBranch = 'main',
  onBranchCreated,
  onEnterEditMode,
  onExitEditMode,
  // NEW: Edit context props
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  editContext,
  onSaveChanges,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDiscardChanges,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pendingOverrides = [],
}) => {
  const { colorMode } = useColorMode();
  
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';
  const bgColor = colorMode === 'dark' ? 'gray.800' : 'white';
  
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [showFindDesignSystem, setShowFindDesignSystem] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [saveDialogMode, setSaveDialogMode] = useState<'direct' | 'pullRequest'>('direct');
  const [isGitHubWorkflowMenuOpen, setIsGitHubWorkflowMenuOpen] = useState(false);
  const [isGitHubConnecting, setIsGitHubConnecting] = useState(false);
  const [showBranchSelectionDialog, setShowBranchSelectionDialog] = useState(false);
  const [targetRepositoryForBranch, setTargetRepositoryForBranch] = useState<{ fullName: string; branch: string; filePath: string; fileType: string } | null>(null);
  const [targetBranchForBranch, setTargetBranchForBranch] = useState<string>('main');
  const [showSwitchBranchDialog, setShowSwitchBranchDialog] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [switchBranchMode, setSwitchBranchMode] = useState<'edit' | 'view'>('view');
  const toast = useToast();
  const [showSourceSwitchWarning, setShowSourceSwitchWarning] = useState(false);
  const [sourceSwitchWarningData, setSourceSwitchWarningData] = useState<{
    changeCount: number;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);

  // Get change status from new data management services
  const dataEditor = DataEditorService.getInstance();
  const sourceManager = SourceManagerService.getInstance();
  const localChangeCount = dataEditor.getChangeCount();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const changeSummary = dataEditor.getChangeSummary();
  const currentSourceContext = sourceManager.getCurrentSourceContext();
  const dataSourceManager = DataSourceManager.getInstance();
  const currentDataSourceContext = dataSourceManager.getCurrentContext();
  
  // Get current selections from URL parameters (authoritative source)
  const getCurrentSelectionsFromURL = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const platformFromURL = urlParams.get('platform');
    const themeFromURL = urlParams.get('theme');
    
    return {
      currentPlatform: platformFromURL,
      currentTheme: themeFromURL
    };
  };

  const { currentPlatform: currentPlatformFromURL, currentTheme: currentThemeFromURL } = getCurrentSelectionsFromURL();



  // NEW: URL-based source switching handlers
  const handlePlatformChange = (platformId: string | null) => {
    console.log('[Header] Platform change requested:', platformId);
    
    // Update URL parameters
    const url = new URL(window.location.href);
    if (platformId && platformId !== 'none') {
      url.searchParams.set('platform', platformId);
      console.log('[Header] Setting platform parameter:', platformId);
    } else {
      url.searchParams.delete('platform');
      console.log('[Header] Removing platform parameter');
    }
    
    // Refresh the entire app with new parameters
    console.log('[Header] Refreshing app with new URL:', url.toString());
    window.location.href = url.toString();
  };

  const handleThemeChange = (themeId: string | null) => {
    console.log('[Header] Theme change requested:', themeId);
    
    // Update URL parameters
    const url = new URL(window.location.href);
    if (themeId && themeId !== 'none') {
      url.searchParams.set('theme', themeId);
      console.log('[Header] Setting theme parameter:', themeId);
    } else {
      url.searchParams.delete('theme');
      console.log('[Header] Removing theme parameter');
    }
    
    // Refresh the entire app with new parameters
    console.log('[Header] Refreshing app with new URL:', url.toString());
    window.location.href = url.toString();
  };

  // Handle source switching warning events (keeping for backward compatibility)
  useEffect(() => {
    const handleSourceSwitchWarning = (event: CustomEvent) => {
      setSourceSwitchWarningData(event.detail);
      setShowSourceSwitchWarning(true);
    };

    window.addEventListener('token-model:source-switch-warning', handleSourceSwitchWarning as EventListener);
    
    return () => {
      window.removeEventListener('token-model:source-switch-warning', handleSourceSwitchWarning as EventListener);
    };
  }, []);

  const handleSourceSwitchConfirm = () => {
    if (sourceSwitchWarningData) {
      sourceSwitchWarningData.onConfirm();
      setShowSourceSwitchWarning(false);
      setSourceSwitchWarningData(null);
    }
  };

  const handleSourceSwitchCancel = () => {
    if (sourceSwitchWarningData) {
      sourceSwitchWarningData.onCancel();
      setShowSourceSwitchWarning(false);
      setSourceSwitchWarningData(null);
    }
  };

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
    // Use new data management services to get system name from core data
    const coreData = StorageService.getCoreData();
    const systemName = coreData?.systemName || 'Design System';
    let title = systemName;
    let subtitle = '';

    // Check for URL-based access
    const urlParams = new URLSearchParams(window.location.search);
    const repo = urlParams.get('repo');
    const branch = urlParams.get('branch') || 'main';

    if (repo) {
      // URL parameters present - check if data was successfully loaded
      // Check if we have actual data loaded using new data management services
      const mergedData = StorageService.getMergedData();
      const hasDataLoaded = mergedData && mergedData.tokens && mergedData.tokens.length > 0 && 
                           mergedData.tokenCollections && mergedData.tokenCollections.length > 0;
      
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
    if (currentSourceContext) {
      title = systemName;
      
      // NEW: Enhanced edit mode display
      if (currentSourceContext.editMode?.isActive) {
        // Edit mode: show repository URL and edit source
        const repository = currentSourceContext.editMode.targetRepository;
        
        if (repository) {
          title = `${systemName} - ${repository.fullName}@${repository.branch}`;
          subtitle = 'Editing';
        } else {
          title = systemName;
          subtitle = 'Editing';
        }
      } else {
        // View mode: show current platform/theme selection
        const availablePlatforms = sourceManager.getAvailablePlatforms();
        const availableThemes = sourceManager.getAvailableThemes();
        
        const platformName = currentSourceContext.sourceType === 'platform' && currentSourceContext.sourceId
          ? availablePlatforms.find(p => p.id === currentSourceContext.sourceId)?.displayName 
          : null;
        const themeName = currentSourceContext.sourceType === 'theme' && currentSourceContext.sourceId
          ? availableThemes.find(t => t.id === currentSourceContext.sourceId)?.displayName
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
        
        // NEW: Enhanced two-tier permission system
        const hasEditAccess = currentSourceContext.editMode?.isActive || 
                              (githubUser && dataSourceManager.getCurrentEditPermissions());
        
        if (hasEditAccess) {
          subtitle += ' - Edit Access';
        } else {
          subtitle += ' - View Only';
        }
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
        const coreData = StorageService.getCoreData();
        const themes = coreData?.themes || [];
        const currentTheme = themes[0];
        const themeName = currentTheme?.displayName || 'Default Theme';
        title = `${systemName}: ${themeName}`;
      }
      
      // Add GitHub branch info
      subtitle = `(${selectedRepoInfo.branch})`;
    } else {
      // No GitHub connection - try to determine from local data using new services
      const mergedData = StorageService.getMergedData();
      const coreData = StorageService.getCoreData();
      
      if (mergedData && mergedData.tokenCollections && mergedData.tokenCollections.length > 0) {
        title = systemName;
      } else if (coreData && coreData.themes && coreData.themes.length > 0) {
        const currentTheme = coreData.themes[0];
        const themeName = currentTheme?.displayName || 'Default Theme';
        title = `${systemName}: ${themeName}`;
      }
    }

    return { title, subtitle };
  };

  // NEW: Helper function to determine if user has edit permissions from new data management services
  const hasDataSourceEditPermissions = () => {
    // Check if user is authenticated
    if (!githubUser) {
      return false;
    }
    
    // Check if we have a valid source context with repository information
    const sourceContext = sourceManager.getCurrentSourceContext();
    if (!sourceContext) {
      return false;
    }
    
    // If already in edit mode, user has permissions
    if (sourceContext.editMode?.isActive) {
      return true;
    }
    
    // Check actual permissions from the data source manager
    const dataSourceManager = DataSourceManager.getInstance();
    return dataSourceManager.getCurrentEditPermissions();
  };

  // NEW: Helper function to determine if user is view-only
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isViewOnlyUser = () => {
    return !hasDataSourceEditPermissions();
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleGitHubDisconnect = () => {
    // // Clear URL parameters when disconnecting from GitHub
    // const url = new URL(window.location.href);
    // url.search = '';
    // window.history.replaceState({}, '', url.toString());
    
    // Use the app-level handler
    if (onGitHubDisconnect) {
      onGitHubDisconnect();
    }
    
    // Clear local UI state
    setShowFindDesignSystem(false);
    setShowSaveDialog(false);
    setIsGitHubConnecting(false);
    setIsUserMenuOpen(false)
  };



  const handleReloadCurrentFile = async () => {
    if (!selectedRepoInfo) return;

    try {
      // Try to get access token for authenticated requests
      let fileContent;
      
      try {
        // Try authenticated request first
        fileContent = await GitHubApiService.getFileContent(
          selectedRepoInfo.fullName,
          selectedRepoInfo.filePath,
          selectedRepoInfo.branch
        );
      } catch (error) {
        // If authenticated request fails, try public request
        console.log('[Header] Authenticated file reload failed, trying public API');
        fileContent = await GitHubApiService.getPublicFileContent(
          selectedRepoInfo.fullName,
          selectedRepoInfo.filePath,
          selectedRepoInfo.branch
        );
      }

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
    
    // NEW: Automatically exit edit mode after successful save
    if (onExitEditMode) {
      onExitEditMode();
    }
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
    const platform = urlParams.get('platform');
    const theme = urlParams.get('theme');

    if (repo) {
      // URL parameters present - generate URL from parameters
      const baseURL = window.location.origin;
      const params = new URLSearchParams();
      params.set('repo', repo);
      params.set('path', path);
      params.set('branch', branch);
      
      // Include platform and theme parameters if present
      if (platform) {
        params.set('platform', platform);
      }
      if (theme) {
        params.set('theme', theme);
      }
      
      return `${baseURL}?${params.toString()}`;
    } else if (selectedRepoInfo) {
      // Fall back to selected repository info
      const baseURL = window.location.origin;
      const params = new URLSearchParams();
      params.set('repo', selectedRepoInfo.fullName);
      params.set('path', selectedRepoInfo.filePath);
      params.set('branch', selectedRepoInfo.branch);
      
      // Include current platform/theme selection from new source context
      if (currentSourceContext?.sourceType === 'platform' && currentSourceContext.sourceId) {
        params.set('platform', currentSourceContext.sourceId);
      }
      if (currentSourceContext?.sourceType === 'theme' && currentSourceContext.sourceId) {
        params.set('theme', currentSourceContext.sourceId);
      }
      
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
    // Determine the target repository based on new source context
    let targetRepository: { fullName: string; branch: string; filePath: string; fileType: string } | null = null;
    
    if (currentSourceContext) {
      // Use new source context to determine edit target
      if (currentSourceContext.sourceType === 'platform' && currentSourceContext.sourceId) {
        // Platform extension editing
        const sourceRepo = currentSourceContext.sourceRepository;
        targetRepository = {
          fullName: sourceRepo.fullName,
          branch: sourceRepo.branch,
          filePath: sourceRepo.filePath,
          fileType: 'platform-extension'
        };
      } else if (currentSourceContext.sourceType === 'theme' && currentSourceContext.sourceId) {
        // Theme override editing
        const sourceRepo = currentSourceContext.sourceRepository;
        targetRepository = {
          fullName: sourceRepo.fullName,
          branch: sourceRepo.branch,
          filePath: sourceRepo.filePath,
          fileType: 'theme-override'
        };
      } else {
        // Core data editing
        const coreRepo = currentSourceContext.coreRepository;
        targetRepository = {
          fullName: coreRepo.fullName,
          branch: coreRepo.branch,
          filePath: coreRepo.filePath,
          fileType: 'schema'
        };
      }
    } else {
      // Fallback to selectedRepoInfo for backward compatibility
      targetRepository = selectedRepoInfo || null;
    }

    // Check if we have repository information
    if (!targetRepository?.fullName) {
      toast({
        title: 'No Repository Selected',
        description: 'Please select a platform or theme, or ensure you have a valid repository connection.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Check if we're on a main branch
    if (isMainBranch(currentBranch)) {
      // Main branch - open branch selection dialog to create new branch
      setTargetRepositoryForBranch(targetRepository);
      // Use the branch from the target repository, or fallback to 'main'
      const targetBranch = targetRepository?.branch || 'main';
      setTargetBranchForBranch(targetBranch);
      setShowBranchSelectionDialog(true);
    } else {
      // Non-main branch - directly enter edit mode
      if (onEnterEditMode) {
        onEnterEditMode();
      } else {
        console.warn('[Header] onEnterEditMode handler not provided');
        toast({
          title: 'Edit Mode Not Available',
          description: 'Edit mode handler is not configured.',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleBranchSelected = (branchName: string, editMode?: boolean) => {
    // When selecting an existing branch, we need to:
    // 1. Switch to that branch (similar to branch creation)
    // 2. Enter edit mode if editMode is true
    
    if (onBranchCreated) {
      // Use onBranchCreated which handles branch switching and entering edit mode
      onBranchCreated(branchName);
    } else if (editMode && onEnterEditMode) {
      // If edit mode is requested and we have the handler, enter edit mode
      onEnterEditMode();
    } else if (editMode && !onEnterEditMode) {
      // Edit mode requested but no handler available
      console.warn('[Header] Edit mode requested but onEnterEditMode handler not provided');
      toast({
        title: 'Edit Mode Not Available',
        description: 'Edit mode handler is not configured.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    }
    setShowBranchSelectionDialog(false);
  };

  const handleSwitchBranch = () => {
    // Determine the target repository based on new source context
    let targetRepository: { fullName: string; branch: string; filePath: string; fileType: string } | null = null;
    
    if (currentSourceContext) {
      // Use new source context to determine switch target
      if (currentSourceContext.sourceType === 'platform' && currentSourceContext.sourceId) {
        // Platform extension switching
        const sourceRepo = currentSourceContext.sourceRepository;
        targetRepository = {
          fullName: sourceRepo.fullName,
          branch: sourceRepo.branch,
          filePath: sourceRepo.filePath,
          fileType: 'platform-extension'
        };
      } else if (currentSourceContext.sourceType === 'theme' && currentSourceContext.sourceId) {
        // Theme override switching
        const sourceRepo = currentSourceContext.sourceRepository;
        targetRepository = {
          fullName: sourceRepo.fullName,
          branch: sourceRepo.branch,
          filePath: sourceRepo.filePath,
          fileType: 'theme-override'
        };
      } else {
        // Core data switching
        const coreRepo = currentSourceContext.coreRepository;
        targetRepository = {
          fullName: coreRepo.fullName,
          branch: coreRepo.branch,
          filePath: coreRepo.filePath,
          fileType: 'schema'
        };
      }
    } else if (isURLBasedAccess || urlRepoInfo) {
      // URL-based access - use URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const repo = urlParams.get('repo');
      const path = urlParams.get('path') || 'schema.json';
      const branch = urlParams.get('branch') || 'main';
      
      if (repo) {
        targetRepository = {
          fullName: repo,
          branch: branch,
          filePath: path,
          fileType: 'schema' // Default to schema for URL-based access
        };
      }
    } else {
      // Fallback to selectedRepoInfo for backward compatibility
      targetRepository = selectedRepoInfo || null;
    }

    // Check if we have repository information
    if (!targetRepository?.fullName) {
      toast({
        title: 'No Repository Selected',
        description: 'Please select a platform or theme, or ensure you have a valid repository connection.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Set up branch selection dialog for view mode switching
    setTargetRepositoryForBranch(targetRepository);
    const targetBranch = targetRepository?.branch || 'main';
    setTargetBranchForBranch(targetBranch);
    setSwitchBranchMode('view');
    setShowSwitchBranchDialog(true);
  };

  const handleSwitchBranchSelected = (branchName: string) => {
    // Switch to the selected branch in view mode
    // This should trigger a data refresh to load the new branch data
    if (onRefreshData) {
      // Update the URL to reflect the new branch
      const url = new URL(window.location.href);
      url.searchParams.set('branch', branchName);
      window.history.replaceState({}, '', url.toString());
      
      // Refresh data to load the new branch (suppress the data refresh toast)
      onRefreshData(true); // Pass suppressToast = true to prevent duplicate toast
      
      toast({
        title: 'Branch Switched',
        description: `Now viewing branch "${branchName}"`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
    setShowSwitchBranchDialog(false);
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
          {/* NEW: Edit Mode UI Layout */}
          {isEditMode ? (
            // Edit Mode Layout
            <>
              {/* Edit Mode Buttons */}
              <HStack spacing={2}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onExitEditMode}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={onSaveChanges || handleSaveToGitHub}
                  leftIcon={<GitCommitVertical size={16} />}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  colorScheme="green"
                  onClick={handleCreatePullRequest}
                  leftIcon={<GitPullRequestArrow size={16} />}
                >
                  Submit for Review
                </Button>
                
                {/* Change Log - Only visible in Edit mode */}
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
                  {localChangeCount > 0 && (
                    <Badge
                      position="absolute"
                      top="-1"
                      right="-1"
                      colorScheme="red"
                      variant="solid"
                      fontSize="xs"
                      borderRadius="full"
                      minW="20px"
                      h="20px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {localChangeCount}
                    </Badge>
                  )}
                </Box>
              </HStack>
            </>
          ) : (
            // View Mode Layout
            <>
              {/* Platform and Theme Dropdowns */}
              <HStack spacing={4}>
                <PlatformDropdown
                  availablePlatforms={sourceManager.getAvailablePlatforms()}
                  currentPlatform={currentPlatformFromURL}
                  permissions={currentDataSourceContext?.permissions?.platforms || {}}
                  onPlatformChange={handlePlatformChange}
                />
                <ThemeDropdown
                  availableThemes={sourceManager.getAvailableThemes()}
                  currentTheme={currentThemeFromURL}
                  permissions={currentDataSourceContext?.permissions?.themes || {}}
                  onThemeChange={handleThemeChange}
                />
              </HStack>

              {/* Branch-based Governance Buttons */}
              {githubUser && hasDataSourceEditPermissions() && (
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    colorScheme="green"
                    onClick={handleEnterEditMode}
                  >
                    Edit
                  </Button>
                </HStack>
              )}

              {/* Repository Menu - Always visible */}
              <HStack spacing={2}>
                <Popover 
                  placement="bottom-end" 
                  isOpen={isGitHubWorkflowMenuOpen} 
                  onClose={() => setIsGitHubWorkflowMenuOpen(false)}
                >
                  <PopoverTrigger>
                    <IconButton
                      aria-label="Source Data Management"
                      icon={<Database size={16} />}
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
                        {/* Switch branch - Available for both signed-in and signed-out users */}
                        <Button
                          variant="ghost"
                          size="sm"
                          justifyContent="flex-start"
                          borderRadius={0}
                          leftIcon={<GitBranch size={16} />}
                          onClick={() => {
                            handleSwitchBranch();
                            setIsGitHubWorkflowMenuOpen(false);
                          }}
                        >
                          Switch branch
                        </Button>
                        {/* Refresh (pull) data - Available for both signed-in and signed-out users */}
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
                      </VStack>
                    </PopoverBody>
                  </PopoverContent>
                </Popover>
              </HStack>

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
                </HStack>
              )}

              {/* Share URL Button - Always visible */}
              {(isURLBasedAccess || (() => {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get('repo') !== null;
              })()) && (
                <HStack spacing={2}>
                  <Tooltip label="Copy Repository URL">
                    <IconButton
                      aria-label="Copy Repository URL"
                      icon={<Share2 size={16} />}
                      size="sm"
                      variant="ghost"
                      onClick={handleShare}
                    />
                  </Tooltip>
                </HStack>
              )}
            </>
          )}

          {/* Authentication Elements - Always last (right-most) */}
          {githubUser ? (
            <Popover 
              placement="bottom-end" 
              isOpen={isUserMenuOpen} 
              onClose={() => setIsUserMenuOpen(false)}
            >
              <PopoverTrigger>
                <IconButton
                  aria-label="User Menu"
                  icon={<Avatar size="xs" src={githubUser.avatar_url}/>}
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
        </HStack>
      </Box>

      {/* Source Switch Warning Dialog */}
      <AlertDialog
        isOpen={showSourceSwitchWarning}
        onClose={handleSourceSwitchCancel}
        leastDestructiveRef={React.useRef(null)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Unsaved Changes
            </AlertDialogHeader>

            <AlertDialogBody>
              You have {sourceSwitchWarningData?.changeCount} unsaved changes. Switching sources will reset to main branch and discard changes. Continue?
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button onClick={handleSourceSwitchCancel}>
                Stay Here
              </Button>
              <Button colorScheme="red" onClick={handleSourceSwitchConfirm} ml={3}>
                Continue
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

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

      {/* Branch Selection Dialog for Edit Mode */}
      <BranchSelectionDialog
        isOpen={showBranchSelectionDialog}
        onClose={() => setShowBranchSelectionDialog(false)}
        onBranchSelected={handleBranchSelected}
        currentBranch={targetBranchForBranch}
        repositoryFullName={targetRepositoryForBranch?.fullName || selectedRepoInfo?.fullName || ''}
        githubUser={githubUser || null}
        editMode={true}
        sourceContext={(() => {
          if (!dataSourceContext) return undefined;
          
          const { currentPlatform, currentTheme, availablePlatforms, availableThemes } = dataSourceContext;
          
          // Find platform name if platform is selected
          const platformName = currentPlatform && currentPlatform !== 'none' 
            ? availablePlatforms.find(p => p.id === currentPlatform)?.displayName || currentPlatform
            : undefined;
          
          // Find theme name if theme is selected
          const themeName = currentTheme && currentTheme !== 'none'
            ? availableThemes.find(t => t.id === currentTheme)?.displayName || currentTheme
            : undefined;
          
          // Determine source type and name
          let sourceType: 'core' | 'platform-extension' | 'theme-override' = 'core';
          let sourceName: string | null = 'Core Design System';
          
          if (currentPlatform && currentPlatform !== 'none') {
            sourceType = 'platform-extension';
            sourceName = platformName || currentPlatform;
          } else if (currentTheme && currentTheme !== 'none') {
            sourceType = 'theme-override';
            sourceName = themeName || currentTheme;
          }
          
          return {
            sourceType,
            sourceId: currentPlatform !== 'none' ? currentPlatform : currentTheme !== 'none' ? currentTheme : null,
            sourceName,
            platformName,
            themeName,
          };
        })()}
      />

      {/* Branch Selection Dialog for View Mode Switching */}
      <BranchSelectionDialog
        isOpen={showSwitchBranchDialog}
        onClose={() => setShowSwitchBranchDialog(false)}
        onBranchSelected={handleSwitchBranchSelected}
        currentBranch={targetBranchForBranch}
        repositoryFullName={targetRepositoryForBranch?.fullName || selectedRepoInfo?.fullName || ''}
        githubUser={githubUser || null}
        editMode={false}
        sourceContext={(() => {
          if (!dataSourceContext) return undefined;
          
          const { currentPlatform, currentTheme, availablePlatforms, availableThemes } = dataSourceContext;
          
          // Find platform name if platform is selected
          const platformName = currentPlatform && currentPlatform !== 'none' 
            ? availablePlatforms.find(p => p.id === currentPlatform)?.displayName || currentPlatform
            : undefined;
          
          // Find theme name if theme is selected
          const themeName = currentTheme && currentTheme !== 'none'
            ? availableThemes.find(t => t.id === currentTheme)?.displayName || currentTheme
            : undefined;
          
          // Determine source type and name
          let sourceType: 'core' | 'platform-extension' | 'theme-override' = 'core';
          let sourceName: string | null = 'Core Design System';
          
          if (currentPlatform && currentPlatform !== 'none') {
            sourceType = 'platform-extension';
            sourceName = platformName || currentPlatform;
          } else if (currentTheme && currentTheme !== 'none') {
            sourceType = 'theme-override';
            sourceName = themeName || currentTheme;
          }
          
          return {
            sourceType,
            sourceId: currentPlatform !== 'none' ? currentPlatform : currentTheme !== 'none' ? currentTheme : null,
            sourceName,
            platformName,
            themeName,
          };
        })()}
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
        // Data source context for proper repository targeting
        dataSourceContext={dataSourceContext}
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