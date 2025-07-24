import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  IconButton,
  useToast,
  Alert,
  AlertIcon,
  Tooltip,
  useColorModeValue,
  useColorMode,
  Center,
  Spinner,
  Container,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Badge
} from '@chakra-ui/react';
import { ExtensionCreateDialog } from '../../components/ExtensionCreateDialog';
import { ExtensionEditDialog, ExtensionEditData } from '../../components/ExtensionEditDialog';
import { MultiRepositoryManager, MultiRepositoryData, RepositoryLink } from '../../services/multiRepositoryManager';
import type { Platform, Taxonomy } from '@token-model/data-model';
import { ExtensionCreateData } from '../../components/ExtensionCreateDialog';
import { LuPencil, LuPlus, LuUnlink } from 'react-icons/lu';
import { PlatformAnalytics } from '../../components/PlatformAnalytics';
import { CacheDebugPanel } from '../../components/CacheDebugPanel';
import { ExtendedToken } from '../../components/TokenEditorDialog';
import type { DataType } from '../../services/dataTypeDetector';
import { DataManager } from '../../services/dataManager';
import { GitHubApiService } from '../../services/githubApi';
import { RepositoryCreationService } from '../../services/repositoryCreationService';

interface PlatformsViewProps {
  platforms?: Platform[];
  setPlatforms?: (platforms: Platform[]) => void;
  tokens?: ExtendedToken[];
  setTokens?: (tokens: ExtendedToken[]) => void;
  taxonomies?: Taxonomy[];
}

export const PlatformsView: React.FC<PlatformsViewProps> = ({ 
  platforms = [], 
  setPlatforms 
}) => {
  const { colorMode } = useColorMode();
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<MultiRepositoryData['analytics']>({
    totalTokens: 0,
    overriddenTokens: 0,
    newTokens: 0,
    omittedTokens: 0,
    platformCount: 0,
    themeCount: 0
  });
  const [platformExtensions, setPlatformExtensions] = useState<Array<{ platformId: string; isValid: boolean; errors: string[]; warnings: string[] }>>([]);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRepository, setEditingRepository] = useState<RepositoryLink | null>(null);
  const [currentDataType, setCurrentDataType] = useState<DataType>('core');
  const cardBg = useColorModeValue('gray.50', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.600');
  const toast = useToast();
  const multiRepoManager = MultiRepositoryManager.getInstance();
  const dataManager = DataManager.getInstance();

  // Get current system ID from storage
  const getCurrentSystemId = async (): Promise<string> => {
    const { StorageService } = await import('../../services/storage');
    const rootData = StorageService.getRootData();
    return rootData.systemId || 'system-default';
  };

  // Detect current data type based on loaded data
  useEffect(() => {
    const detectDataType = () => {
      const snapshot = dataManager.getCurrentSnapshot();
      
      // Check if we have core data indicators (tokens, collections, dimensions, etc.)
      if (snapshot.tokens && snapshot.tokens.length > 0) {
        setCurrentDataType('core');
        return;
      }
      
      // Check if we have theme data indicators
      if (snapshot.themeOverrides && Object.keys(snapshot.themeOverrides).length > 0) {
        setCurrentDataType('theme');
        return;
      }
      
      // Check if we have extension data indicators (but no core tokens)
      // This would be a standalone platform extension file
      if (snapshot.platformExtensions && Object.keys(snapshot.platformExtensions).length > 0 && 
          (!snapshot.tokens || snapshot.tokens.length === 0)) {
        setCurrentDataType('extension');
        return;
      }
      
      // Default to core
      setCurrentDataType('core');
    };

    detectDataType();
  }, [dataManager]);

  // Initialize and load data
  useEffect(() => {
    const initializeManager = async () => {
      try {
        // Platforms are now managed by App-level state management
        // No need to load platforms here since they're passed as props
        
        // Set up callbacks
        multiRepoManager.setCallbacks({
          onDataLoaded: (data: MultiRepositoryData) => {
            setAnalytics(data.analytics);
            // Update platform extensions validation
            const validationResults = multiRepoManager.validatePlatformExtensions();
            setPlatformExtensions(validationResults);
          },
          onRepositoryLinked: (link) => {
            console.log('🔍 [onRepositoryLinked] Repository linked:', link);
            toast({
              title: 'Extension Created',
              description: `Successfully created ${link.type} extension`,
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
          },
          onRepositoryUnlinked: () => {
            console.log('🔍 [onRepositoryUnlinked] Repository unlinked');
            toast({
              title: 'Extension Removed',
              description: 'Extension has been removed',
              status: 'info',
              duration: 3000,
              isClosable: true,
            });
          },
          onError: (error: string) => {
            setError(error);
            toast({
              title: 'Error',
              description: error,
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
          }
        });

        // Load initial data
        const data = multiRepoManager.getCurrentData();
        setAnalytics(data.analytics);
        
        const validationResults = multiRepoManager.validatePlatformExtensions();
        setPlatformExtensions(validationResults);

      } catch (err) {
        console.error('Failed to initialize MultiRepositoryManager:', err);
        setError('Failed to initialize repository manager');
      }
    };

    initializeManager();
  }, [multiRepoManager, toast, dataManager]);

    // Platforms are now managed by App-level state management
  // No need to listen for DataManager changes since we receive updates through props

  // Debug: Monitor platforms state changes
  useEffect(() => {
    console.log('🔍 [platforms state changed] Current platforms:', platforms);
  }, [platforms]);

  // Helper function to update platforms through App-level state management
  const updatePlatformsInDataManager = (updatedPlatforms: Platform[]) => {
    console.log('🔍 [updatePlatformsInDataManager] Updating platforms through App-level state management:', updatedPlatforms);
    setPlatforms?.(updatedPlatforms);
  };

  const handleLinkRepository = async (linkData: ExtensionCreateData) => {
    try {
      switch (linkData.workflow) {
        case 'link-existing': {
          // Link to existing repository via MultiRepositoryManager
          await multiRepoManager.linkRepository(
            linkData.type,
            linkData.repositoryUri,
            linkData.branch,
            linkData.filePath,
            linkData.platformId,
            linkData.themeId
          );
          
          // For platform extensions, ensure local data is stored for immediate access
          if (linkData.platformId && linkData.type === 'platform-extension') {
            const { StorageService } = await import('../../services/storage');
            const { GitHubApiService } = await import('../../services/githubApi');
            
            try {
              // Fetch the platform extension data from the repository
              const fileContent = await GitHubApiService.getFileContent(
                linkData.repositoryUri,
                linkData.filePath,
                linkData.branch
              );
              
              if (fileContent && fileContent.content) {
                const platformExtensionData = JSON.parse(fileContent.content);
                
                // Store the platform extension file in localStorage for local access
                StorageService.setPlatformExtensionFile(linkData.platformId, platformExtensionData);
                StorageService.setPlatformExtensionFileContent(linkData.platformId, fileContent.content);
                
                console.log('🔍 [link-existing] Stored platform extension data locally for:', linkData.platformId);
              }
            } catch (error) {
              console.warn('🔍 [link-existing] Failed to fetch platform extension data for local storage:', error);
              // Continue with the link process even if local storage fails
            }
          }
          
          // Update core data's platforms array to include the extension source
          if (linkData.platformId) {
            // Get current platforms from DataManager
            const snapshot = dataManager.getCurrentSnapshot();
            const currentPlatforms = snapshot.platforms;
            
            // Find the platform to update
            const platformIndex = currentPlatforms.findIndex(p => p.id === linkData.platformId);
            
            if (platformIndex !== -1) {
              // Update existing platform with extension source
              const updatedPlatforms = [...currentPlatforms];
              updatedPlatforms[platformIndex] = {
                ...updatedPlatforms[platformIndex],
                extensionSource: {
                  repositoryUri: linkData.repositoryUri,
                  filePath: linkData.filePath
                }
              };
              
              // Update platforms through DataManager
              updatePlatformsInDataManager(updatedPlatforms);
              
              console.log('🔍 [link-existing] Updated existing platform with extension source:', linkData.platformId);
            } else {
              // Create new platform entry since it doesn't exist
              const newPlatform = {
                id: linkData.platformId,
                displayName: linkData.displayName || linkData.platformId,
                description: linkData.description || '',
                extensionSource: {
                  repositoryUri: linkData.repositoryUri,
                  filePath: linkData.filePath
                }
              };
              
              const updatedPlatforms = [...currentPlatforms, newPlatform];
              updatePlatformsInDataManager(updatedPlatforms);
              
              console.log('🔍 [link-existing] Created new platform with extension source:', linkData.platformId);
            }
            
            // Update platform extensions validation
            const validationResults = multiRepoManager.validatePlatformExtensions();
            setPlatformExtensions(validationResults);
          }
          break;
        }
          
        case 'create-file':
          // Create new file in current repository
          if (linkData.platformId && linkData.type === 'platform-extension') {
            const { StorageService } = await import('../../services/storage');
            const { GitHubApiService } = await import('../../services/githubApi');
            
            // Create the platform extension file data according to platform-extension-schema.json
            const platformExtensionData = {
              systemId: linkData.systemId || await getCurrentSystemId(),
              platformId: linkData.platformId,
              version: '1.0.0',
              status: 'active',
              figmaFileKey: `${linkData.platformId}-figma-file`,
              syntaxPatterns: linkData.syntaxPatterns || {
                prefix: '',
                suffix: '',
                delimiter: '_',
                capitalization: 'camel',
                formatString: ''
              },
              valueFormatters: linkData.valueFormatters || {
                color: 'hex',
                dimension: 'px',
                numberPrecision: 2
              },
              algorithmVariableOverrides: [],
              tokenOverrides: [],
              omittedModes: [],
              omittedDimensions: []
            };
            
            // Create the actual file content as JSON string
            const fileContent = JSON.stringify(platformExtensionData, null, 2);
            
            // According to repository-scaffolding.md, platform extension files should be saved to platforms/ directory
            // Use user-defined filename from linkData
            const fileName = `platforms/${linkData.newFileName || 'platform-extension.json'}`;
            
            try {
              // Get current repository info
              const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
              if (!repoInfo) {
                throw new Error('No repository selected. Please load a file from GitHub first.');
              }
              
              // Create the file in the platforms/ directory
              await GitHubApiService.createFile(
                repoInfo.fullName,
                fileName,
                fileContent,
                repoInfo.branch,
                `Add platform extension file: ${fileName} for ${linkData.platformId}`
              );
              
              // Store the platform extension file in localStorage for local access
              StorageService.setPlatformExtensionFile(linkData.platformId, platformExtensionData);
              StorageService.setPlatformExtensionFileContent(linkData.platformId, fileContent);
              
              // Add to core data's platforms array with extensionSource pointing to the created file
              const snapshot = dataManager.getCurrentSnapshot();
              const currentPlatforms = snapshot.platforms;
              const platformIndex = currentPlatforms.findIndex(p => p.id === linkData.platformId);
              
              if (platformIndex !== -1) {
                // Update existing platform with extension source
                const updatedPlatforms = [...currentPlatforms];
                updatedPlatforms[platformIndex] = {
                  ...updatedPlatforms[platformIndex],
                  extensionSource: {
                    repositoryUri: 'local',
                    filePath: fileName
                  }
                };
                updatePlatformsInDataManager(updatedPlatforms);
              } else {
                // Create new platform entry
                const newPlatform = {
                  id: linkData.platformId,
                  displayName: linkData.displayName || linkData.platformId,
                  description: linkData.description || '',
                  extensionSource: {
                    repositoryUri: 'local',
                    filePath: fileName
                  }
                };
                updatePlatformsInDataManager([...currentPlatforms, newPlatform]);
              }
              
              toast({
                title: 'Extension File Created',
                description: `Platform extension file "${fileName}" has been created in repository with schema-compliant structure`,
                status: 'success',
                duration: 3000,
                isClosable: true
              });
              
            } catch (error) {
              console.error('Failed to create platform extension file:', error);
              toast({
                title: 'File Creation Failed',
                description: error instanceof Error ? error.message : 'Failed to create platform extension file',
                status: 'error',
                duration: 5000,
                isClosable: true
              });
              throw error;
            }
          }
          break;
          
        case 'create-repository':
          // Create new repository with scaffolded structure
          if (linkData.platformId && linkData.type === 'platform-extension') {
            const { StorageService } = await import('../../services/storage');
            
            try {
              
              // Create the repository with scaffolding using the new RepositoryCreationService
              const repositoryConfig = {
                name: linkData.newRepositoryName || linkData.platformId,
                description: linkData.newRepositoryDescription || `Platform extension for ${linkData.platformId}`,
                visibility: (linkData.newRepositoryVisibility as 'public' | 'private') || 'public',
                organization: '', // Will use user's personal account
                schemaType: 'platform-extension' as const,
                systemId: linkData.systemId || await getCurrentSystemId(),
                platformId: linkData.platformId
              };
              
              const createdRepository = await RepositoryCreationService.createRepository(repositoryConfig);
              
              // The platform extension file is already created by RepositoryCreationService
              // We just need to store it in localStorage and update the platforms array
              
              // Get the platform extension data from the created repository
              const platformExtensionData = {
                systemId: linkData.systemId || await getCurrentSystemId(),
                platformId: linkData.platformId,
                version: '1.0.0',
                figmaFileKey: `${linkData.platformId}-platform-figma-file`,
                metadata: {
                  name: linkData.displayName || linkData.platformId,
                  description: linkData.description || '',
                  maintainer: '',
                  lastUpdated: new Date().toISOString().split('T')[0],
                  repositoryVisibility: linkData.newRepositoryVisibility || 'public'
                },
                syntaxPatterns: linkData.syntaxPatterns || {
                  prefix: '',
                  suffix: '',
                  delimiter: '_',
                  capitalization: 'camel',
                  formatString: ''
                },
                valueFormatters: linkData.valueFormatters || {
                  color: 'hex',
                  dimension: 'px',
                  numberPrecision: 2
                },
                algorithmVariableOverrides: [],
                tokenOverrides: [],
                omittedModes: [],
                omittedDimensions: []
              };
              
              // Store the platform extension file in localStorage for local access
              StorageService.setPlatformExtensionFile(linkData.platformId, platformExtensionData);
              
              // Add to core data's platforms array with extensionSource pointing to new repository
              const snapshot = dataManager.getCurrentSnapshot();
              const currentPlatforms = snapshot.platforms;
              const platformIndex = currentPlatforms.findIndex(p => p.id === linkData.platformId);
              
              if (platformIndex !== -1) {
                // Update existing platform with extension source
                const updatedPlatforms = [...currentPlatforms];
                updatedPlatforms[platformIndex] = {
                  ...updatedPlatforms[platformIndex],
                  extensionSource: {
                    repositoryUri: createdRepository.fullName,
                    filePath: createdRepository.initialFilePath || 'platform-extension.json'
                  }
                };
                updatePlatformsInDataManager(updatedPlatforms);
              } else {
                // Create new platform entry
                const newPlatform = {
                  id: linkData.platformId,
                  displayName: linkData.displayName || linkData.platformId,
                  description: linkData.description || '',
                  extensionSource: {
                    repositoryUri: createdRepository.fullName,
                    filePath: createdRepository.initialFilePath || 'platform-extension.json'
                  }
                };
                updatePlatformsInDataManager([...currentPlatforms, newPlatform]);
              }
              
              toast({
                title: 'Repository Created Successfully',
                description: `Repository "${createdRepository.htmlUrl}" has been created with schema-compliant platform extension file`,
                status: 'success',
                duration: 3000,
                isClosable: true
              });
              
            } catch (error) {
              console.error('Failed to create repository:', error);
              toast({
                title: 'Repository Creation Failed',
                description: error instanceof Error ? error.message : 'Failed to create repository',
                status: 'error',
                duration: 5000,
                isClosable: true
              });
              throw error;
            }
          }
          break;
      }
      
      // Close dialog
      setIsLinkDialogOpen(false);
      
    } catch (error) {
      console.error('Error linking repository:', error);
      // Handle error (show toast, etc.)
    }
  };

  const handleUnlinkRepository = async (linkId: string) => {
    // Get the repository link to find the platform ID
    const linkedRepositories = multiRepoManager.getLinkedRepositories();
    const repository = linkedRepositories.find(link => link.id === linkId);
    
    // Unlink from MultiRepositoryManager
    multiRepoManager.unlinkRepository(linkId);
    
    // Remove extension source from core data's platforms array
    if (repository?.platformId) {
      // Get current platforms from DataManager
      const snapshot = dataManager.getCurrentSnapshot();
      const currentPlatforms = snapshot.platforms;
      
      // Find the platform to update
      const platformIndex = currentPlatforms.findIndex(p => p.id === repository.platformId);
      
      if (platformIndex !== -1) {
        // Remove extension source from the platform
        const updatedPlatforms = [...currentPlatforms];
        const platformWithoutExtension = { ...updatedPlatforms[platformIndex] };
        delete platformWithoutExtension.extensionSource;
        updatedPlatforms[platformIndex] = platformWithoutExtension;
        
        // Update platforms through DataManager
        updatePlatformsInDataManager(updatedPlatforms);
      }
    }
    
    toast({
      title: 'Extension Removed',
      description: 'Extension has been removed',
      status: 'info',
      duration: 3000,
      isClosable: true
    });
  };

  const handleEditPlatform = (platform: Platform, linkedRepository?: RepositoryLink) => {
    // If there's a linked repository, use it for editing
    if (linkedRepository) {
      setEditingRepository(linkedRepository);
      setIsEditDialogOpen(true);
    } else {
      // For platforms without a linked repository, check if they have an extensionSource
      if (platform.extensionSource) {
        // Platform has an extensionSource (local or external), create a repository link from it
        const repositoryFromExtensionSource: RepositoryLink = {
          id: `extension-${platform.id}`,
          type: 'platform-extension',
          repositoryUri: platform.extensionSource.repositoryUri,
          branch: 'main', // Default branch
          filePath: platform.extensionSource.filePath,
          platformId: platform.id,
          status: 'linked'
        };
        setEditingRepository(repositoryFromExtensionSource);
        setIsEditDialogOpen(true);
      } else {
        // For core-only platforms without extensionSource, create a mock repository link for editing
        // This allows users to link an unlinked platform
        const mockRepository: RepositoryLink = {
          id: `mock-${platform.id}`,
          type: 'platform-extension',
          repositoryUri: '',
          branch: 'main',
          filePath: '',
          platformId: platform.id,
          status: 'linked'
        };
        setEditingRepository(mockRepository);
        setIsEditDialogOpen(true);
      }
    }
  };

  const handleUpdateRepository = async (editData: ExtensionEditData) => {
    if (!editingRepository) return;
    
    try {
      // Check if this is a mock repository (unlinked platform being linked)
      const isMockRepository = editingRepository.id.startsWith('mock-');
      const isExtensionRepository = editingRepository.id.startsWith('extension-');
      
      if (isMockRepository) {
        // This is an unlinked platform being linked to a repository
        if (editData.repositoryUri && editData.filePath && editData.platformId) {
          await handleLinkRepository({
            type: 'platform-extension',
            repositoryUri: editData.repositoryUri,
            branch: editData.branch,
            filePath: editData.filePath,
            platformId: editData.platformId,
            systemId: await getCurrentSystemId(),
            displayName: editData.displayName || editData.platformId,
            description: editData.description || '',
            syntaxPatterns: editData.syntaxPatterns || {
              prefix: '',
              suffix: '',
              delimiter: '_',
              capitalization: 'none',
              formatString: ''
            },
            valueFormatters: editData.valueFormatters || {
              color: 'hex',
              dimension: 'px',
              numberPrecision: 2
            },
            workflow: 'link-existing'
          });
        }
      } else if (isExtensionRepository) {
        // This is a platform with an extensionSource (local or external) being updated
        // Update the platform data in local storage
        const snapshot = dataManager.getCurrentSnapshot();
        const currentPlatforms = snapshot.platforms;
        const platformIndex = currentPlatforms.findIndex(p => p.id === editingRepository.platformId);
        
        if (platformIndex !== -1) {
          const updatedPlatforms = [...currentPlatforms];
          updatedPlatforms[platformIndex] = {
            ...updatedPlatforms[platformIndex],
            displayName: editData.displayName || updatedPlatforms[platformIndex].displayName,
            description: editData.description || updatedPlatforms[platformIndex].description
          };
          
          // Update platforms through DataManager
          updatePlatformsInDataManager(updatedPlatforms);
          
          // If this is a local platform, also update the platform extension file in localStorage
          if (editingRepository.repositoryUri === 'local' && editingRepository.platformId) {
            const { StorageService } = await import('../../services/storage');
            const existingData = StorageService.getPlatformExtensionFile(editingRepository.platformId);
            
            if (existingData && typeof existingData === 'object' && existingData !== null) {
              const typedExistingData = existingData as Record<string, unknown>;
              const metadata = typedExistingData.metadata as Record<string, unknown> | undefined;
              
              const updatedData = {
                ...typedExistingData,
                metadata: {
                  ...metadata,
                  name: editData.displayName || (metadata?.name as string) || '',
                  description: editData.description || (metadata?.description as string) || ''
                }
              };
              
              StorageService.setPlatformExtensionFile(editingRepository.platformId, updatedData);
              StorageService.setPlatformExtensionFileContent(editingRepository.platformId, JSON.stringify(updatedData, null, 2));
            }
          }
          
          toast({
            title: 'Platform Updated',
            description: 'Platform settings have been updated successfully.',
            status: 'success',
            duration: 3000,
            isClosable: true
          });
        } else {
          throw new Error(`Platform with ID "${editingRepository.platformId}" not found`);
        }
      } else {
        // This is an existing repository being updated
        await multiRepoManager.updateRepositoryLink(editingRepository.id, {
          branch: editData.branch,
          filePath: editData.filePath
        });
        
        toast({
          title: 'Extension Updated',
          description: 'Extension settings have been updated successfully.',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
      
      setIsEditDialogOpen(false);
      setEditingRepository(null);
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update extension settings.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleDeleteRepository = async (repositoryId: string) => {
    console.log('🔍 [handleDeleteRepository] Starting delete process for repositoryId:', repositoryId);
    
    try {
      // Check if this is a mock repository (unlinked platform) or extension repository
      const isMockRepository = repositoryId.startsWith('mock-');
      const isExtensionRepository = repositoryId.startsWith('extension-');
      console.log('🔍 [handleDeleteRepository] Is mock repository:', isMockRepository, 'Is extension repository:', isExtensionRepository);
      
      if (isMockRepository || isExtensionRepository) {
        // Extract platform ID from repository ID
        const platformId = repositoryId.replace('mock-', '').replace('extension-', '');
        console.log('🔍 [handleDeleteRepository] Extracted platformId from mock repository:', platformId);
        
        // Handle deletion of unlinked platform directly
        const { StorageService } = await import('../../services/storage');
        
        // Get current platforms from DataManager
        const snapshot = dataManager.getCurrentSnapshot();
        const currentPlatforms = snapshot.platforms;
        console.log('🔍 [handleDeleteRepository] Current platforms from DataManager:', currentPlatforms);
        
        // Find the platform to delete
        const platformIndex = currentPlatforms.findIndex(p => p.id === platformId);
        console.log('🔍 [handleDeleteRepository] Platform index found:', platformIndex);
        
        if (platformIndex !== -1) {
          const platform = currentPlatforms[platformIndex];
          console.log('🔍 [handleDeleteRepository] Found platform:', platform);
          console.log('🔍 [handleDeleteRepository] Platform has extensionSource:', !!platform.extensionSource);
          
          // Check if this platform has an extensionSource
          if (platform.extensionSource) {
            console.log('🔍 [handleDeleteRepository] Platform has extensionSource, checking if local or external');
            
            // Determine if this is a local file or external repository
            const isLocalFile = platform.extensionSource.repositoryUri === 'local';
            console.log('🔍 [handleDeleteRepository] Is local file:', isLocalFile);
            
            if (isLocalFile) {
              // LOCAL FILE: Delete the file from filesystem + remove from core data
              console.log('🔍 [handleDeleteRepository] Deleting local file...');
              
              try {
                // Get current repository info for local file deletion
                const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
                if (!repoInfo) {
                  throw new Error('No repository selected for local file deletion');
                }
                
                // Delete the local file from GitHub
                await GitHubApiService.deleteFile(
                  repoInfo.fullName,
                  platform.extensionSource.filePath,
                  repoInfo.branch,
                  `Delete local platform extension: ${platformId}`
                );
                console.log('🔍 [handleDeleteRepository] Local file successfully deleted from GitHub');
              } catch (error) {
                console.error('🔍 [handleDeleteRepository] Failed to delete local file:', error);
                
                // Check if it's a "file not found" or "access denied" error
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                if (errorMessage.includes('not found') || errorMessage.includes('cannot be accessed')) {
                  toast({
                    title: 'Cannot Delete Platform',
                    description: `File not found or you don't have access: ${platform.extensionSource.filePath}`,
                    status: 'error',
                    duration: 5000,
                    isClosable: true
                  });
                  return; // Don't proceed with core data removal if file deletion fails
                } else {
                  toast({
                    title: 'Local File Delete Failed',
                    description: `Failed to delete local file: ${errorMessage}. The platform will still be removed from core data.`,
                    status: 'warning',
                    duration: 5000,
                    isClosable: true
                  });
                  // Continue with core data removal even if file deletion fails
                }
              }
            } else {
              // EXTERNAL REPOSITORY: Only remove from core data, don't delete external file
              console.log('🔍 [handleDeleteRepository] External repository - only removing from core data');
            }
            
            // Remove the entire platform from core data (for both local and external)
            const updatedPlatforms = currentPlatforms.filter((_, index) => index !== platformIndex);
            console.log('🔍 [handleDeleteRepository] Updated platforms after removal:', updatedPlatforms);
            
            // Update platforms through DataManager (saves to localStorage)
            updatePlatformsInDataManager(updatedPlatforms);
            
            // Also remove the platform extension file from localStorage
            console.log('🔍 [handleDeleteRepository] Removing platform extension files from localStorage...');
            StorageService.removePlatformExtensionFile(platformId);
            StorageService.removePlatformExtensionFileContent(platformId);
            
            console.log('🔍 [handleDeleteRepository] Platform extension files removed from localStorage');
          } else {
            console.log('🔍 [handleDeleteRepository] Platform has no extensionSource - removing only extensionSource (core platform)');
            
            // Platform was from core data, just remove the extensionSource
            const updatedPlatforms = [...currentPlatforms];
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { extensionSource, ...platformWithoutExtension } = platform;
            updatedPlatforms[platformIndex] = platformWithoutExtension;
            console.log('🔍 [handleDeleteRepository] Updated platform without extensionSource:', platformWithoutExtension);
            
            // Update platforms through DataManager
            updatePlatformsInDataManager(updatedPlatforms);
          }
          
          // Verify the update worked
          const verifySnapshot = dataManager.getCurrentSnapshot();
          console.log('🔍 [handleDeleteRepository] Verification - platforms in DataManager after update:', verifySnapshot.platforms);
          
          console.log('✅ [handleDeleteRepository] Mock repository delete process completed successfully');
        } else {
          console.error('❌ [handleDeleteRepository] Platform not found in storage for platformId:', platformId);
          toast({
            title: 'Delete Failed',
            description: `Platform with ID "${platformId}" not found in storage.`,
            status: 'error',
            duration: 5000,
            isClosable: true
          });
          return;
        }
      } else {
        // Handle real repository links
        // Get the repository before removing it
        const repository = multiRepoManager.getRepositoryLink(repositoryId);
        console.log('🔍 [handleDeleteRepository] Found repository:', repository);
        
        if (!repository) {
          console.error('❌ [handleDeleteRepository] No repository found for ID:', repositoryId);
          toast({
            title: 'Delete Failed',
            description: 'Repository not found.',
            status: 'error',
            duration: 5000,
            isClosable: true
          });
          return;
        }
        
        // For real repository links, we only remove from core data (external files are not deleted)
        console.log('🔍 [handleDeleteRepository] Real repository link - only removing from core data');
        
        // Remove from MultiRepositoryManager
        console.log('🔍 [handleDeleteRepository] Removing from MultiRepositoryManager...');
        multiRepoManager.unlinkRepository(repositoryId);
        
        if (repository.platformId) {
          console.log('🔍 [handleDeleteRepository] Processing platform extension for platformId:', repository.platformId);
          const { StorageService } = await import('../../services/storage');
          
          // Get current platforms from DataManager
          const snapshot = dataManager.getCurrentSnapshot();
          const currentPlatforms = snapshot.platforms;
          console.log('🔍 [handleDeleteRepository] Current platforms from DataManager:', currentPlatforms);
          
          // Find the platform to update
          const platformIndex = currentPlatforms.findIndex(p => p.id === repository.platformId);
          console.log('🔍 [handleDeleteRepository] Platform index found:', platformIndex);
          
          if (platformIndex !== -1) {
            const platform = currentPlatforms[platformIndex];
            console.log('🔍 [handleDeleteRepository] Found platform:', platform);
            console.log('🔍 [handleDeleteRepository] Platform has extensionSource:', !!platform.extensionSource);
            
            // Check if this platform was created as an extension (has extensionSource)
            if (platform.extensionSource) {
              console.log('🔍 [handleDeleteRepository] Removing entire platform (created as extension)');
              
              // Remove the entire platform since it was created as an extension
              const updatedPlatforms = currentPlatforms.filter((_, index) => index !== platformIndex);
              console.log('🔍 [handleDeleteRepository] Updated platforms after removal:', updatedPlatforms);
              
              // Update platforms through DataManager
              updatePlatformsInDataManager(updatedPlatforms);
              
              // Also remove the platform extension file from localStorage
              console.log('🔍 [handleDeleteRepository] Removing platform extension files from localStorage...');
              StorageService.removePlatformExtensionFile(repository.platformId);
              StorageService.removePlatformExtensionFileContent(repository.platformId);
              
              console.log('🔍 [handleDeleteRepository] Platform extension files removed from localStorage');
            } else {
              console.log('🔍 [handleDeleteRepository] Removing only extensionSource (core platform)');
              
              // Platform was from core data, just remove the extensionSource
              const updatedPlatforms = [...currentPlatforms];
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { extensionSource, ...platformWithoutExtension } = platform;
              updatedPlatforms[platformIndex] = platformWithoutExtension;
              console.log('🔍 [handleDeleteRepository] Updated platform without extensionSource:', platformWithoutExtension);
              
              // Update platforms through DataManager
              updatePlatformsInDataManager(updatedPlatforms);
            }
            
            // Verify the update worked
            const verifySnapshot = dataManager.getCurrentSnapshot();
            console.log('🔍 [handleDeleteRepository] Verification - platforms in DataManager after update:', verifySnapshot.platforms);
            
            console.log('✅ [handleDeleteRepository] Real repository delete process completed successfully');
          } else {
            console.error('❌ [handleDeleteRepository] Platform not found in storage for platformId:', repository.platformId);
            toast({
              title: 'Delete Failed',
              description: `Platform with ID "${repository.platformId}" not found in storage.`,
              status: 'error',
              duration: 5000,
              isClosable: true
            });
            return;
          }
        } else {
          console.log('🔍 [handleDeleteRepository] No platformId in repository, skipping platform cleanup');
        }
      }
      
      // Show success message following the same pattern as Token deletion
      toast({
        title: 'Platform Deleted',
        description: 'Platform has been deleted from local storage. Changes will be saved to GitHub when you commit or create a PR.',
        status: 'info',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('❌ [handleDeleteRepository] Error during delete process:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete platform.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleDeprecateRepository = async (repositoryId: string) => {
    try {
      // Get the repository to update its status
      const repository = multiRepoManager.getRepositoryLink(repositoryId);
      if (repository) {
        // For now, we'll just mark it as deprecated in the UI
        // The actual status update would need to be implemented in MultiRepositoryManager
        toast({
          title: 'Extension Deprecated',
          description: 'Extension has been marked as deprecated.',
          status: 'warning',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      toast({
        title: 'Deprecate Failed',
        description: error instanceof Error ? error.message : 'Failed to deprecate extension.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // Get available repository types based on current data type
  const getAvailableRepositoryTypes = (): Array<{ value: string; label: string; description: string }> => {
    switch (currentDataType) {
      case 'core':
        return [
          {
            value: 'platform-extension',
            label: 'Platform Extension',
            description: 'Link to a platform-specific extension repository'
          }
        ];
      case 'extension':
        return [
          {
            value: 'core',
            label: 'Core Data',
            description: 'Link to the main core data repository'
          }
        ];
      case 'theme':
        return [
          {
            value: 'core',
            label: 'Core Data',
            description: 'Link to the main core data repository'
          }
        ];
      default:
        return [];
    }
  };

  if (isLoading) {
    return (
      <Center py={20}>
        <VStack spacing={4}>
          <Spinner size="xl" />
          <Text>Loading platform data...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Container maxW="container.xl" py={4}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Text fontSize="2xl" fontWeight="bold" mb={4}>Platforms</Text>
          <Text color="gray.600">
            Manage platform extensions and link repositories for your distributed design system.
          </Text>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Main Content */}
        <Tabs>
          <TabList>
            <Tab>Platform Management</Tab>
            <Tab>Analytics</Tab>
            <Tab>Cache Debug</Tab>
          </TabList>

          <TabPanels>
            {/* Repository Management Tab */}
            <TabPanel px={0}>
              {/* Unified Platforms Section */}
              <Box p={4} mb={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.900' : 'white'}>
                <HStack justify="space-between" mb={4}>
                  <Button 
                    size="sm" 
                    leftIcon={<LuPlus />} 
                    onClick={() => setIsLinkDialogOpen(true)} 
                    colorScheme="blue"
                    isDisabled={getAvailableRepositoryTypes().length === 0}
                  >
                    Add Platform
                  </Button>
                </HStack>
                
                <VStack align="stretch" spacing={3}>
                  {platforms.map((platform) => {
                    // Find if this platform has a linked repository
                    const linkedRepository = multiRepoManager.getLinkedRepositories()
                      .find(link => link.platformId === platform.id);
                    
                    return (
                      <Box
                        key={platform.id}
                        p={3}
                        borderWidth={1}
                        borderRadius="md"
                        bg={cardBg}
                        borderColor={cardBorder}
                      >
                        <HStack justify="space-between" align="flex-start">
                          <Box flex={1} minW={0}>
                            <Text fontSize="lg" fontWeight="medium">{platform.displayName}</Text>
                            <Text fontSize="sm" color="gray.500">ID: {platform.id}</Text>
                            {platform.description && (
                              <Text fontSize="sm" color="gray.500">{platform.description}</Text>
                            )}
                            {platform.syntaxPatterns && (
                              <Text fontSize="sm" color="gray.500">
                                Syntax: {platform.syntaxPatterns.prefix || ''}{platform.syntaxPatterns.delimiter || '_'}name{platform.syntaxPatterns.suffix || ''}
                              </Text>
                            )}
                            {linkedRepository && (
                              <Text fontSize="sm" color="blue.500">
                                Extension: {linkedRepository.repositoryUri} → {linkedRepository.filePath}
                              </Text>
                            )}
                            {linkedRepository && (
                              <Text fontSize="sm" color="gray.500">Status: {linkedRepository.status}</Text>
                            )}
                          </Box>
                          <HStack spacing={2} align="flex-start">
                            {platform.extensionSource ? (
                              platform.extensionSource.repositoryUri === 'local' ? (
                                <Badge colorScheme="blue" variant="subtle">Local</Badge>
                              ) : (
                                <Badge colorScheme="green" variant="subtle">External</Badge>
                              )
                            ) : null}
                            <Tooltip label="Edit Platform">
                              <IconButton
                                aria-label="Edit platform"
                                icon={<LuPencil />}
                                size="sm"
                                onClick={() => handleEditPlatform(platform, linkedRepository)}
                              />
                            </Tooltip>
                            {linkedRepository && (
                              <Tooltip label="Remove Extension">
                                <IconButton
                                  aria-label="Remove extension"
                                  colorScheme="red"
                                  size="sm"
                                  icon={<LuUnlink />}
                                  onClick={() => handleUnlinkRepository(linkedRepository.id)}
                                />
                              </Tooltip>
                            )}
                          </HStack>
                        </HStack>
                      </Box>
                    );
                  })}
                  
                  {platforms.length === 0 && (
                    <Text color="gray.500" textAlign="center" py={8}>
                      No platforms found in source data. Load a core data file to see platforms.
                    </Text>
                  )}
                </VStack>
              </Box>
            </TabPanel>

            {/* Analytics Tab */}
            <TabPanel>
              <PlatformAnalytics
                analytics={analytics}
                platformExtensions={platformExtensions}
                hasCoreData={true}
              />
            </TabPanel>

            {/* Cache Debug Tab */}
            <TabPanel>
              <CacheDebugPanel />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
      
      <ExtensionCreateDialog
        isOpen={isLinkDialogOpen}
        onClose={() => setIsLinkDialogOpen(false)}
        onSave={handleLinkRepository}
        currentDataType={currentDataType}
      />
      
      {editingRepository && (
        <ExtensionEditDialog
          repository={editingRepository}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingRepository(null);
          }}
          onSave={handleUpdateRepository}
          onDelete={handleDeleteRepository}
          onDeprecate={handleDeprecateRepository}
          platforms={platforms}
        />
      )}
    </Container>
  );
}; 