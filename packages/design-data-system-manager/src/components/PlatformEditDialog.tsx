import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Select,
  VStack,
  HStack,
  Text,
  useToast,
  Divider,
  Alert,
  AlertIcon,
  Box,
  useColorMode,
  Badge,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@chakra-ui/react';
import { PlatformExtensionValidationService } from '../services/platformExtensionValidation';
import { StorageService } from '../services/storage';
import { PlatformExtensionDataService, type PlatformExtensionData } from '../services/platformExtensionDataService';
import { PlatformSourceValidationService } from '../services/platformSourceValidationService';
import type { RepositoryLink } from '../services/multiRepositoryManager';
import { SourceSelectionDialog, SourceSelectionData } from './SourceSelectionDialog';
import { SyntaxPatternsEditor, ValueFormattersEditor } from './shared';
import type { PlatformExtensionStatus } from '../services/platformExtensionStatusService';

export interface PlatformEditData {
  type: 'core' | 'platform-extension' | 'theme-override';
  repositoryUri: string;
  branch: string;
  filePath: string;
  platformId?: string;
  themeId?: string;
  // Core schema fields for platformExtensions
  systemId?: string;
  syntaxPatterns?: {
    prefix?: string;
    suffix?: string;
    delimiter?: '' | '_' | '-' | '.' | '/' | undefined;
    capitalization?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    formatString?: string;
  };
  valueFormatters?: {
    color?: string;
    dimension?: string;
    numberPrecision?: number;
  };
  // Platform management fields
  displayName?: string;
  description?: string;
  figmaPlatformMapping?: 'WEB' | 'iOS' | 'ANDROID' | null;
  // Workflow-specific fields
  workflow: 'link-existing' | 'create-file' | 'create-repository';
  newFileName?: string;
  newRepositoryName?: string;
  newRepositoryDescription?: string;
  newRepositoryVisibility?: 'public' | 'private';
}

interface PlatformEditDialogProps {
  repository: RepositoryLink;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PlatformEditData) => void;
  onDelete?: (repositoryId: string) => void;
  onDeprecate?: (repositoryId: string) => void;
  platforms?: Array<{
    id: string;
    displayName: string;
    description?: string;
    extensionSource?: {
      repositoryUri: string;
      filePath: string;
    };
  }>;
  platformStatus?: PlatformExtensionStatus;
}

export const PlatformEditDialog: React.FC<PlatformEditDialogProps> = ({
  repository,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDeprecate,
  platforms = [],
  platformStatus
}) => {
  const [formData, setFormData] = useState<PlatformEditData>({
    type: repository.type,
    repositoryUri: repository.repositoryUri,
    branch: repository.branch,
    filePath: repository.filePath,
    systemId: '',
    platformId: repository.platformId || '',
    themeId: repository.themeId || '',
    displayName: '',
    description: '',
    figmaPlatformMapping: null,
    workflow: 'link-existing',
    newFileName: '',
    newRepositoryName: '',
    newRepositoryDescription: '',
    newRepositoryVisibility: 'public',
    syntaxPatterns: {
      prefix: '',
      suffix: '',
      delimiter: '_',
      capitalization: 'none',
      formatString: ''
    },
    valueFormatters: {
      color: 'hex',
      dimension: 'px',
      numberPrecision: 2
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [platformExtensionData, setPlatformExtensionData] = useState<PlatformExtensionData | null>(null);
  const [loadingPlatformData, setLoadingPlatformData] = useState(false);
  const [sourceValidationResult, setSourceValidationResult] = useState<{
    isValid: boolean;
    error?: string;
    updatedPath?: string;
    showSourceSelection: boolean;
  } | null>(null);
  const toast = useToast();
  const { colorMode } = useColorMode();

  // Delete dialog state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteDialogCancelRef = useRef<HTMLButtonElement>(null);

  // Source selection dialog state
  const [isSourceSelectionOpen, setIsSourceSelectionOpen] = useState(false);
  const [isExternalSource, setIsExternalSource] = useState(false);

  // Get current system ID from storage
  const getCurrentSystemId = (): string => {
    const rootData = StorageService.getRootData();
    return rootData.systemId || 'system-default';
  };

  // Get canonical platform data from core data
  const getCanonicalPlatformData = () => {
    if (repository.type !== 'platform-extension') {
      console.log('[ExtensionEditDialog] getCanonicalPlatformData: Not a platform extension', {
        type: repository.type
      });
      return null;
    }

    console.log('[ExtensionEditDialog] getCanonicalPlatformData: Available platforms', {
      availablePlatforms: platforms.map(p => ({ 
        id: p.id, 
        hasExtensionSource: !!p.extensionSource,
        extensionSource: p.extensionSource 
      })),
      totalPlatforms: platforms.length,
      repositoryPlatformId: repository.platformId,
      repositoryUri: repository.repositoryUri,
      repositoryFilePath: repository.filePath
    });

    // First, try to find a platform that matches the repository's platformId
    let foundPlatform = platforms.find(platform => platform.id === repository.platformId);
    
    if (foundPlatform) {
      console.log('[ExtensionEditDialog] getCanonicalPlatformData: Found platform by repository.platformId', {
        platformId: foundPlatform.id,
        displayName: foundPlatform.displayName,
        hasExtensionSource: !!foundPlatform.extensionSource,
        extensionSource: foundPlatform.extensionSource
      });
    } else {
      console.log('[ExtensionEditDialog] getCanonicalPlatformData: No platform found by repository.platformId', {
        searchedPlatformId: repository.platformId,
        availablePlatformIds: platforms.map(p => p.id)
      });
      
      // If no platform found by repository.platformId, try to find a platform that has an extensionSource
      // that matches the repository's URI and file path
      if (repository.repositoryUri && repository.filePath) {
        foundPlatform = platforms.find(platform => 
          platform.extensionSource?.repositoryUri === repository.repositoryUri &&
          platform.extensionSource?.filePath === repository.filePath
        );
        
        if (foundPlatform) {
          console.log('[ExtensionEditDialog] getCanonicalPlatformData: Found platform by extensionSource match', {
            platformId: foundPlatform.id,
            displayName: foundPlatform.displayName,
            hasExtensionSource: !!foundPlatform.extensionSource,
            extensionSource: foundPlatform.extensionSource
          });
        } else {
          console.log('[ExtensionEditDialog] getCanonicalPlatformData: No platform found by extensionSource match', {
            searchedRepositoryUri: repository.repositoryUri,
            searchedFilePath: repository.filePath,
            availableExtensionSources: platforms
              .filter(p => p.extensionSource)
              .map(p => ({ 
                platformId: p.id, 
                repositoryUri: p.extensionSource?.repositoryUri,
                filePath: p.extensionSource?.filePath 
              }))
          });
        }
      }
    }

    // If we found a platform with extensionSource, return it
    if (foundPlatform?.extensionSource) {
      return foundPlatform;
    }

    // If we found a platform but it doesn't have extensionSource, but the repository itself has source info,
    // create a platform object with the repository's source info
    if (foundPlatform && repository.repositoryUri && repository.filePath) {
      console.log('[ExtensionEditDialog] getCanonicalPlatformData: Using repository source info as fallback', {
        repositoryUri: repository.repositoryUri,
        filePath: repository.filePath
      });
      
      return {
        ...foundPlatform,
        extensionSource: {
          repositoryUri: repository.repositoryUri,
          filePath: repository.filePath
        }
      };
    }

    // If no platform found in core data but repository has source info, create a minimal platform object
    if (repository.repositoryUri && repository.filePath) {
      console.log('[ExtensionEditDialog] getCanonicalPlatformData: Creating minimal platform object from repository info', {
        platformId: repository.platformId,
        repositoryUri: repository.repositoryUri,
        filePath: repository.filePath
      });
      
      return {
        id: repository.platformId || 'unknown-platform',
        displayName: repository.platformId || 'Unknown Platform',
        description: '',
        extensionSource: {
          repositoryUri: repository.repositoryUri,
          filePath: repository.filePath
        }
      };
    }

    return foundPlatform;
  };

  // Load platform extension data from source
  const loadPlatformExtensionData = async () => {
    console.log('[ExtensionEditDialog] loadPlatformExtensionData: Starting', {
      repositoryType: repository.type,
      platformId: repository.platformId,
      repositoryUri: repository.repositoryUri,
      filePath: repository.filePath,
      branch: repository.branch
    });

    if (repository.type !== 'platform-extension') {
      console.log('[ExtensionEditDialog] loadPlatformExtensionData: Not a platform extension');
      return;
    }

    const canonicalPlatformData = getCanonicalPlatformData();
    console.log('[ExtensionEditDialog] loadPlatformExtensionData: Canonical platform data', {
      found: !!canonicalPlatformData,
      hasExtensionSource: !!canonicalPlatformData?.extensionSource,
      extensionSource: canonicalPlatformData?.extensionSource,
      platformId: canonicalPlatformData?.id
    });

    if (!canonicalPlatformData?.extensionSource) {
      console.log('[ExtensionEditDialog] No extension source found, skipping data load');
      return;
    }

    setLoadingPlatformData(true);
    setSourceValidationResult(null);
    
    try {
      const { repositoryUri, filePath } = canonicalPlatformData.extensionSource;
      const isLocalSource = repositoryUri === 'local';
      
      // Validate source existence
      let validationResult;
      if (isLocalSource) {
        // Validate local file
        const currentSystemId = getCurrentSystemId();
        validationResult = await PlatformSourceValidationService.validateLocalFile(
          filePath,
          canonicalPlatformData.id,
          currentSystemId
        );
      } else {
        // Validate external repository
        const branch = repository.branch || 'main';
        validationResult = await PlatformSourceValidationService.validateExternalRepository(
          repositoryUri,
          filePath,
          branch
        );
      }

      if (!validationResult.exists) {
        // Source doesn't exist, prompt user to select new source
        setSourceValidationResult({
          isValid: false,
          error: validationResult.error,
          showSourceSelection: true
        });
        
        toast({
          title: 'Source Not Found',
          description: validationResult.error || 'The platform source could not be found. Please select a new source.',
          status: 'warning',
          duration: 8000,
          isClosable: true
        });
        
        return;
      }

      // If local file was found at a different path, update the platform data
      if (validationResult.updatedPath && isLocalSource) {
        console.log('[ExtensionEditDialog] File found at new path, updating platform data:', validationResult.updatedPath);
        
        // Update the platform's extensionSource with the new path
        await updatePlatformExtensionSource('local', validationResult.updatedPath);
        
        // Show soft alert to user
        toast({
          title: 'File Location Updated',
          description: `Platform extension file was found at a new location and has been updated automatically.`,
          status: 'info',
          duration: 5000,
          isClosable: true
        });
        
        // Update the canonical platform data with the new path
        canonicalPlatformData.extensionSource.filePath = validationResult.updatedPath;
      }

      // Source exists, proceed with loading data
      setSourceValidationResult({
        isValid: true,
        showSourceSelection: false
      });

      // Use the repository's branch if available, otherwise default to 'main'
      const branch = repository.branch || 'main';
      
      console.log('[ExtensionEditDialog] loadPlatformExtensionData: Fetching data from source', {
        repositoryUri: canonicalPlatformData.extensionSource.repositoryUri,
        filePath: canonicalPlatformData.extensionSource.filePath,
        branch: branch,
        platformId: canonicalPlatformData.id // Use the canonical platform ID, not repository.platformId
      });

      const result = await PlatformExtensionDataService.getPlatformExtensionData(
        canonicalPlatformData.extensionSource.repositoryUri,
        canonicalPlatformData.extensionSource.filePath,
        branch,
        canonicalPlatformData.id // Use the canonical platform ID, not repository.platformId
      );
      
      if (result.data) {
        setPlatformExtensionData(result.data);
        console.log('[ExtensionEditDialog] Loaded platform extension data:', result.data);
      } else {
        console.warn('[ExtensionEditDialog] No platform extension data found');
      }
    } catch (error) {
      console.error('[ExtensionEditDialog] Failed to load platform extension data:', error);
      
      // Set validation result to show source selection
      setSourceValidationResult({
        isValid: false,
        error: 'Failed to load platform extension data from source',
        showSourceSelection: true
      });
      
      toast({
        title: 'Error',
        description: 'Failed to load platform extension data from source',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setLoadingPlatformData(false);
    }
  };

  // Use CodeSyntaxService for preview (from PlatformEditorDialog)
  const preview = useMemo(() => {
    if (formData.type !== 'platform-extension') return '';
    
    // Get canonical platform data to determine if this is a local platform
    const canonicalPlatformData = getCanonicalPlatformData();
    const isLocalPlatform = canonicalPlatformData?.extensionSource?.repositoryUri === 'local';
    
    // For local platforms, use form data for live preview; otherwise use platform extension data
    const syntaxPatterns = isLocalPlatform 
      ? formData.syntaxPatterns 
      : (platformExtensionData?.syntaxPatterns || formData.syntaxPatterns);
    
    const prefix = syntaxPatterns?.prefix || '';
    const suffix = syntaxPatterns?.suffix || '';
    const delimiter = syntaxPatterns?.delimiter || '';
    const capitalization = syntaxPatterns?.capitalization || 'none';
    
    let tokenName = 'primary-color-background';
    
    // Apply capitalization
    switch (capitalization) {
      case 'uppercase':
        tokenName = tokenName.toUpperCase();
        break;
      case 'lowercase':
        tokenName = tokenName.toLowerCase();
        break;
      case 'capitalize':
        tokenName = tokenName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
        break;
    }
    
    // Apply delimiter
    if (delimiter && delimiter !== '') {
      tokenName = tokenName.replace(/-/g, delimiter);
    } else {
      // Remove hyphens when no delimiter is selected
      tokenName = tokenName.replace(/-/g, '');
    }
    
    return `${prefix}${tokenName}${suffix}`;
  }, [formData.syntaxPatterns, formData.type, platformExtensionData]);

  // Reset form when repository changes
  useEffect(() => {
    if (platformStatus?.hasError && (platformStatus.errorType === 'file-not-found' || platformStatus.errorType === 'repository-not-found')) {
      setSourceValidationResult({
        isValid: false,
        error: platformStatus.errorMessage || 'File or repository is not found',
        showSourceSelection: true
      });
      setLoadingPlatformData(false);
      return;
    }
    // Get the canonical platform data from the platforms prop
    const canonicalPlatformData = getCanonicalPlatformData();
    
    // Load platform extension data from localStorage if available
    let platformExtensionData: Record<string, unknown> | null = null;
    if (repository.platformId && repository.type === 'platform-extension') {
      platformExtensionData = StorageService.getPlatformExtensionFile(repository.platformId);
    }

    // Determine the display name and description
    // Priority: 1. Canonical platform data, 2. Platform extension data, 3. Repository platformId
    const displayName = canonicalPlatformData?.displayName || 
                       (platformExtensionData?.metadata as Record<string, unknown>)?.name as string || 
                       (platformExtensionData?.displayName as string) || 
                       repository.platformId || '';
    
    const description = canonicalPlatformData?.description || 
                       (platformExtensionData?.metadata as Record<string, unknown>)?.description as string || 
                       (platformExtensionData?.description as string) || '';

    setFormData({
      type: repository.type,
      repositoryUri: repository.repositoryUri,
      branch: repository.branch,
      filePath: repository.filePath,
      systemId: (platformExtensionData?.systemId as string) || getCurrentSystemId(),
      platformId: repository.platformId || '',
      themeId: repository.themeId || '',
      displayName: displayName,
      description: description,
      figmaPlatformMapping: (platformExtensionData?.figmaPlatformMapping as 'WEB' | 'iOS' | 'ANDROID' | null) || null,
      workflow: 'link-existing',
      newFileName: '',
      newRepositoryName: '',
      newRepositoryDescription: '',
      newRepositoryVisibility: 'public',
      syntaxPatterns: {
        prefix: (platformExtensionData?.syntaxPatterns as Record<string, unknown>)?.prefix as string || '',
        suffix: (platformExtensionData?.syntaxPatterns as Record<string, unknown>)?.suffix as string || '',
        delimiter: (platformExtensionData?.syntaxPatterns as Record<string, unknown>)?.delimiter as '' | '_' | '-' | '.' | '/' | undefined || '',
        capitalization: (platformExtensionData?.syntaxPatterns as Record<string, unknown>)?.capitalization as 'none' | 'uppercase' | 'lowercase' | 'capitalize' || 'none',
        formatString: (platformExtensionData?.syntaxPatterns as Record<string, unknown>)?.formatString as string || ''
      },
      valueFormatters: {
        color: (platformExtensionData?.valueFormatters as Record<string, unknown>)?.color as string || 'hex',
        dimension: (platformExtensionData?.valueFormatters as Record<string, unknown>)?.dimension as string || 'px',
        numberPrecision: (platformExtensionData?.valueFormatters as Record<string, unknown>)?.numberPrecision as number || 2
      }
    });
    setErrors({});
    
    // Load platform extension data from source
    loadPlatformExtensionData();
  }, [repository, platforms, platformStatus]);

  // Update form data when platform extension data is loaded
  useEffect(() => {
    if (platformExtensionData && formData.type === 'platform-extension') {
      setFormData(prev => ({
        ...prev,
        figmaPlatformMapping: (platformExtensionData.figmaPlatformMapping as 'WEB' | 'iOS' | 'ANDROID' | null) || null,
        syntaxPatterns: {
          prefix: (platformExtensionData.syntaxPatterns as Record<string, unknown>)?.prefix as string || '',
          suffix: (platformExtensionData.syntaxPatterns as Record<string, unknown>)?.suffix as string || '',
          delimiter: (platformExtensionData.syntaxPatterns as Record<string, unknown>)?.delimiter as '' | '_' | '-' | '.' | '/' | undefined || '',
          capitalization: (platformExtensionData.syntaxPatterns as Record<string, unknown>)?.capitalization as 'none' | 'uppercase' | 'lowercase' | 'capitalize' || 'none',
          formatString: (platformExtensionData.syntaxPatterns as Record<string, unknown>)?.formatString as string || ''
        },
        valueFormatters: {
          color: (platformExtensionData.valueFormatters as Record<string, unknown>)?.color as string || 'hex',
          dimension: (platformExtensionData.valueFormatters as Record<string, unknown>)?.dimension as string || 'px',
          numberPrecision: (platformExtensionData.valueFormatters as Record<string, unknown>)?.numberPrecision as number || 2
        }
      }));
    }
  }, [platformExtensionData, formData.type]);

  // Auto-open source selection dialog when validation fails
  useEffect(() => {
    if (sourceValidationResult && !sourceValidationResult.isValid && sourceValidationResult.showSourceSelection) {
      // Small delay to ensure the dialog state is properly set
      const timer = setTimeout(() => {
        setIsSourceSelectionOpen(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [sourceValidationResult]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Type-specific validation
    if (formData.type === 'platform-extension') {
      if (!formData.displayName?.trim()) {
        newErrors.displayName = 'Display name is required for platform extensions';
      }
      // Platform ID validation removed since it's read-only
      
      // Validate extension source uniqueness for link-existing workflow
      if (formData.workflow === 'link-existing' && formData.repositoryUri && formData.filePath) {
        const validation = PlatformSourceValidationService.validateExtensionSource(
          formData.repositoryUri,
          formData.filePath,
          repository.platformId // Exclude the current platform being edited
        );
        
        if (!validation.isValid) {
          newErrors.filePath = validation.error || 'This extension source is already in use by another platform';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Handle create-file workflow
    if (formData.workflow === 'create-file' && formData.type === 'platform-extension') {
      try {
        // Create the platform extension file data according to platform-extension-schema.json
        const platformExtensionData = {
          systemId: formData.systemId || getCurrentSystemId(),
          platformId: repository.platformId || '',
          version: '1.0.0',
          status: 'active',
          figmaFileKey: `${repository.platformId || 'platform'}-figma-file`,
          figmaPlatformMapping: formData.figmaPlatformMapping || null,
          syntaxPatterns: formData.syntaxPatterns || {
            prefix: '',
            suffix: '',
            delimiter: '_',
            capitalization: 'camel',
            formatString: ''
          },
          valueFormatters: formData.valueFormatters || {
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
        // Use user-defined filename from form data
        const fileName = `platforms/${formData.newFileName || 'platform-extension.json'}`;
        
        // Get current repository info
        const { GitHubApiService } = await import('../services/githubApi');
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
          `Add platform extension file: ${fileName} for ${repository.platformId}`
        );
        
        // Store the platform extension file in localStorage for local access
        const { StorageService } = await import('../services/storage');
        StorageService.setPlatformExtensionFile(repository.platformId || '', platformExtensionData);
        StorageService.setPlatformExtensionFileContent(repository.platformId || '', fileContent);
        
        // Update the platform's extensionSource with the correct path
        await updatePlatformExtensionSource('local', fileName);
        
        toast({
          title: 'File Created Successfully',
          description: `Platform extension file "${fileName}" has been created and linked to the platform.`,
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        
        // Close the dialog after successful file creation
        onClose();
        return;
        
      } catch (error) {
        console.error('[ExtensionEditDialog] Failed to create platform extension file:', error);
        toast({
          title: 'File Creation Failed',
          description: error instanceof Error ? error.message : 'Failed to create platform extension file',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        return;
      }
    }

    // Handle saving changes to local platform files
    const canonicalPlatformData = getCanonicalPlatformData();
    const isLocalPlatform = canonicalPlatformData?.extensionSource?.repositoryUri === 'local';
    
    if (isLocalPlatform && formData.type === 'platform-extension' && platformExtensionData) {
      try {
        // Update the platform extension data with form changes
        const updatedPlatformExtensionData = {
          ...platformExtensionData,
          syntaxPatterns: formData.syntaxPatterns || platformExtensionData.syntaxPatterns,
          valueFormatters: formData.valueFormatters || platformExtensionData.valueFormatters,
          metadata: {
            ...platformExtensionData.metadata,
            name: formData.displayName || platformExtensionData.metadata?.name || '',
            description: formData.description || platformExtensionData.metadata?.description || '',
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        };
        
        // Create the updated file content
        const updatedFileContent = JSON.stringify(updatedPlatformExtensionData, null, 2);
        
        // Get current repository info
        const { GitHubApiService } = await import('../services/githubApi');
        const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
        if (!repoInfo) {
          throw new Error('No repository selected. Please load a file from GitHub first.');
        }
        
        // Update the file in the repository
        await GitHubApiService.createOrUpdateFile(
          repoInfo.fullName,
          canonicalPlatformData.extensionSource!.filePath,
          updatedFileContent,
          repoInfo.branch,
          `Update platform extension settings for ${repository.platformId}`
        );
        
        // Update localStorage
        const { StorageService } = await import('../services/storage');
        StorageService.setPlatformExtensionFile(repository.platformId || '', updatedPlatformExtensionData);
        StorageService.setPlatformExtensionFileContent(repository.platformId || '', updatedFileContent);
        
        // CRITICAL: Update the canonical data (core data's platforms array) with the new figmaPlatformMapping
        await updateCanonicalPlatformData();
        
        toast({
          title: 'Platform Settings Updated',
          description: 'Platform extension settings have been saved successfully.',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
        
        // Close the dialog after successful update
        onClose();
        return;
        
      } catch (error) {
        console.error('[ExtensionEditDialog] Failed to update platform extension file:', error);
        toast({
          title: 'Update Failed',
          description: error instanceof Error ? error.message : 'Failed to update platform extension file',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
        return;
      }
    }

    // Validate against schema for other workflows
    try {
      if (formData.type === 'platform-extension') {
        const extensionData = {
          systemId: formData.systemId,
          platformId: formData.platformId,
          version: '1.0.0',
          syntaxPatterns: formData.syntaxPatterns,
          valueFormatters: formData.valueFormatters
        };
        
        // Validate platform extension data
        const validation = PlatformExtensionValidationService.validatePlatformExtension(extensionData);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
          console.warn('Platform extension warnings:', validation.warnings);
        }
      }
    } catch (error) {
      toast({
        title: 'Schema Validation Error',
        description: error instanceof Error ? error.message : 'Invalid data structure',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    onSave(formData);
    onClose();
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(repository.id);
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

  const handleDeprecate = () => {
    if (onDeprecate) {
      onDeprecate(repository.id);
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

  const handleSelectNewSource = () => {
    setIsSourceSelectionOpen(true);
  };

  // Update canonical platform data with form changes
  const updateCanonicalPlatformData = async () => {
    if (!repository.platformId || repository.type !== 'platform-extension') {
      console.log('[ExtensionEditDialog] updateCanonicalPlatformData: Not a platform extension or no platformId');
      return;
    }

    try {
      // Get current platforms from DataManager
      const { DataManager } = await import('../services/dataManager');
      const dataManager = DataManager.getInstance();
      const snapshot = dataManager.getCurrentSnapshot();
      const currentPlatforms = snapshot.platforms;
      
      // Find the platform to update
      const platformIndex = currentPlatforms.findIndex(p => p.id === repository.platformId);
      
      if (platformIndex !== -1) {
        // Update existing platform with form data changes
        const updatedPlatforms = [...currentPlatforms];
        updatedPlatforms[platformIndex] = {
          ...updatedPlatforms[platformIndex],
          displayName: formData.displayName || updatedPlatforms[platformIndex].displayName,
          description: formData.description || updatedPlatforms[platformIndex].description,
          figmaPlatformMapping: formData.figmaPlatformMapping || updatedPlatforms[platformIndex].figmaPlatformMapping
        };
        
        // Update platforms through DataManager
        dataManager.updateData({ platforms: updatedPlatforms });
        
        console.log('[ExtensionEditDialog] Updated canonical platform data:', {
          platformId: repository.platformId,
          displayName: formData.displayName,
          description: formData.description,
          figmaPlatformMapping: formData.figmaPlatformMapping
        });
      } else {
        console.error('[ExtensionEditDialog] Platform not found for canonical update:', repository.platformId);
      }
    } catch (error) {
      console.error('[ExtensionEditDialog] Failed to update canonical platform data:', error);
      throw error; // Re-throw to be handled by the calling function
    }
  };

  // Update platform's extensionSource after file creation
  const updatePlatformExtensionSource = async (repositoryUri: string, filePath: string) => {
    if (!repository.platformId || repository.type !== 'platform-extension') {
      console.log('[ExtensionEditDialog] updatePlatformExtensionSource: Not a platform extension or no platformId');
      return;
    }

    try {
      // Get current platforms from DataManager
      const { DataManager } = await import('../services/dataManager');
      const dataManager = DataManager.getInstance();
      const snapshot = dataManager.getCurrentSnapshot();
      const currentPlatforms = snapshot.platforms;
      
      // Find the platform to update
      const platformIndex = currentPlatforms.findIndex(p => p.id === repository.platformId);
      
      if (platformIndex !== -1) {
        // Update existing platform with extension source
        const updatedPlatforms = [...currentPlatforms];
        updatedPlatforms[platformIndex] = {
          ...updatedPlatforms[platformIndex],
          extensionSource: {
            repositoryUri: repositoryUri,
            filePath: filePath
          }
        };
        
        // Update platforms through DataManager
        const { DataManager } = await import('../services/dataManager');
        const dataManager = DataManager.getInstance();
        dataManager.updateData({ platforms: updatedPlatforms });
        
        console.log('[ExtensionEditDialog] Updated platform extensionSource:', {
          platformId: repository.platformId,
          repositoryUri: repositoryUri,
          filePath: filePath
        });
        
        // Reload platform extension data from the new source
        await loadPlatformExtensionData();
        
        toast({
          title: 'Platform Updated',
          description: 'Platform extension source has been updated successfully.',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      } else {
        console.error('[ExtensionEditDialog] Platform not found for update:', repository.platformId);
      }
    } catch (error) {
      console.error('[ExtensionEditDialog] Failed to update platform extensionSource:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update platform extension source.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleSourceSelected = async (sourceData: SourceSelectionData) => {
    // Update form data with new source information
    setFormData(prev => ({
      ...prev,
      repositoryUri: sourceData.repositoryUri || prev.repositoryUri,
      branch: sourceData.branch || prev.branch,
      filePath: sourceData.filePath || prev.filePath,
      newFileName: sourceData.newFileName || prev.newFileName,
      newRepositoryName: sourceData.newRepositoryName || prev.newRepositoryName,
      newRepositoryDescription: sourceData.newRepositoryDescription || prev.newRepositoryDescription,
      newRepositoryVisibility: sourceData.newRepositoryVisibility || prev.newRepositoryVisibility,
      workflow: sourceData.workflow
    }));

    // Determine if this is an external source
    const isExternal = sourceData.workflow === 'link-existing' && sourceData.repositoryUri && 
                      sourceData.repositoryUri !== 'local';
    setIsExternalSource(!!isExternal);

    // Handle linking to existing file workflow
    if (sourceData.workflow === 'link-existing' && sourceData.repositoryUri && sourceData.filePath) {
      // Validate that this extension source is not already in use by another platform
      const validation = PlatformSourceValidationService.validateExtensionSource(
        sourceData.repositoryUri,
        sourceData.filePath,
        repository.platformId // Exclude the current platform being edited
      );
      
      if (!validation.isValid) {
        toast({
          title: 'Validation Error',
          description: validation.error || 'This extension source is already in use by another platform',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
      
      // Update the platform's extensionSource when linking to an existing file
      await updatePlatformExtensionSource(sourceData.repositoryUri, sourceData.filePath);
      
      // Also update the form data to reflect the new source
      setFormData(prev => ({
        ...prev,
        repositoryUri: sourceData.repositoryUri || prev.repositoryUri,
        branch: sourceData.branch || prev.branch,
        filePath: sourceData.filePath || prev.filePath
      }));
    }

    // For create-file workflow, just update the form data - file creation will happen on save
    // For create-repository workflow, the repository creation dialog handles it

    toast({
      title: 'Source Updated',
      description: `Source has been updated to ${sourceData.workflow === 'link-existing' ? 'external repository' : sourceData.workflow === 'create-file' ? 'local file' : 'new repository'}`,
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };



  const renderSourceConfiguration = () => {
    const canonicalPlatformData = getCanonicalPlatformData();
    const hasExtensionSource = canonicalPlatformData?.extensionSource;

    console.log('[ExtensionEditDialog] renderSourceConfiguration', {
      canonicalPlatformData: !!canonicalPlatformData,
      hasExtensionSource: !!hasExtensionSource,
      extensionSource: canonicalPlatformData?.extensionSource,
      repositoryType: formData.type,
      sourceValidationResult: sourceValidationResult
    });

    return (
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between" align="center">
          <Text fontWeight="bold" fontSize="sm" color="gray.600">
            Source Configuration
          </Text>
          <Button
            size="sm"
            colorScheme="blue"
            variant="outline"
            onClick={handleSelectNewSource}
          >
            Select New Source
          </Button>
        </HStack>
        
        {/* Source Validation Alert */}
        {sourceValidationResult && !sourceValidationResult.isValid && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={2} flex={1}>
              <Text fontWeight="bold">Source Validation Failed</Text>
              <Text fontSize="sm">{sourceValidationResult.error}</Text>
              {sourceValidationResult.showSourceSelection && (
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={handleSelectNewSource}
                >
                  Select New Source
                </Button>
              )}
            </VStack>
          </Alert>
        )}
        
        {formData.type === 'platform-extension' && (
          <Box p={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}>
            <VStack align="start" spacing={3}>
              <Text fontWeight="bold" fontSize="sm" color="gray.600">
                Canonical Platform Data
              </Text>
              
              {hasExtensionSource && canonicalPlatformData?.extensionSource ? (
                <VStack align="start" spacing={2}>
                  <HStack>
                    <Text fontWeight="medium">Repository URI:</Text>
                    <Text fontFamily="mono" fontSize="sm" color="gray.500">
                      {canonicalPlatformData.extensionSource.repositoryUri}
                    </Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="medium">File Path:</Text>
                    <Text fontFamily="mono" fontSize="sm" color="gray.500">
                      {canonicalPlatformData.extensionSource.filePath}
                    </Text>
                  </HStack>
                  {sourceValidationResult?.isValid && (
                    <HStack>
                      <Text fontWeight="medium">Status:</Text>
                      <Badge colorScheme="green" variant="subtle">Valid</Badge>
                    </HStack>
                  )}
                </VStack>
              ) : (
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <Text>No source linked</Text>
                </Alert>
              )}
            </VStack>
          </Box>
        )}
        
        {isExternalSource && (
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              <Text fontWeight="bold">External Source Detected</Text>
              <Text fontSize="sm">This data comes from an external source file. Most fields are read-only to maintain data integrity.</Text>
              {/* TODO: Add "Switch source to edit settings" functionality */}
            </VStack>
          </Alert>
        )}
      </VStack>
    );
  };

  const renderCreateFileFields = () => {
    return (
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold" fontSize="sm" color="gray.600">
          File Settings
        </Text>
        
        <FormControl isRequired isInvalid={!!errors.newFileName}>
          <FormLabel>File Name</FormLabel>
          <Input
            value={formData.newFileName}
            onChange={(e) => setFormData({ ...formData, newFileName: e.target.value })}
            placeholder="platform-extension.json"
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            File will be created in the platforms/ directory following repository scaffolding standards
          </Text>
        </FormControl>
      </VStack>
    );
  };

  const renderCreateRepositoryFields = () => (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        Repository Settings
      </Text>
      
      <FormControl isRequired isInvalid={!!errors.newRepositoryName}>
        <FormLabel>Repository Name</FormLabel>
        <Input
          value={formData.newRepositoryName}
          onChange={(e) => setFormData({ ...formData, newRepositoryName: e.target.value })}
          placeholder="my-platform-extension"
        />
        <Text fontSize="xs" color="gray.500" mt={1}>
          Repository will be created as: {formData.newRepositoryName ? `${formData.newRepositoryName}` : 'your-org/repo-name'}
        </Text>
      </FormControl>
      
      <FormControl>
        <FormLabel>Description</FormLabel>
        <Input
          value={formData.newRepositoryDescription}
          onChange={(e) => setFormData({ ...formData, newRepositoryDescription: e.target.value })}
          placeholder="Platform-specific design tokens and overrides"
        />
      </FormControl>
      
      <FormControl>
        <FormLabel>Visibility</FormLabel>
        <Select
          value={formData.newRepositoryVisibility}
          onChange={(e) => setFormData({ ...formData, newRepositoryVisibility: e.target.value as 'public' | 'private' })}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </Select>
      </FormControl>
      
      <Alert status="info" size="sm">
        <AlertIcon />
        Repository will be scaffolded with proper directory structure and initial platform extension file
      </Alert>
    </VStack>
  );

  const renderPlatformFields = () => {
    return (
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold" fontSize="sm" color="gray.600">
          Basic Information
        </Text>
        
        {/* Basic Platform Information */}
        {/* <Box
          p={3}
          borderWidth={1}
          borderRadius="md"
          bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        > */}
          <VStack spacing={3} align="stretch">
            <FormControl isRequired isInvalid={!!errors.displayName}>
              <FormLabel>Display Name</FormLabel>
              {isExternalSource ? (
                <Box
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                  <Text fontSize="sm" color="gray.500">
                    {formData.displayName || 'Not set'}
                  </Text>
                </Box>
              ) : (
                <Input
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="iOS Platform"
                />
              )}
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              {isExternalSource ? (
                <Box
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                  <Text fontSize="sm" color="gray.500">
                    {formData.description || 'Not set'}
                  </Text>
                </Box>
              ) : (
                <Input
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Platform-specific extensions for iOS"
                />
              )}
            </FormControl>
            
            <FormControl>
              <FormLabel>Figma Platform Mapping</FormLabel>
              {isExternalSource ? (
                <Box
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                  <Text fontSize="sm" color="gray.500">
                    {formData.figmaPlatformMapping ? (
                      <Badge colorScheme="blue" variant="subtle">
                        {formData.figmaPlatformMapping}
                      </Badge>
                    ) : (
                      'Not mapped'
                    )}
                  </Text>
                </Box>
              ) : (
                <>
                  <Select
                    value={formData.figmaPlatformMapping || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      figmaPlatformMapping: e.target.value || null
                    })}
                    placeholder="No Figma mapping"
                  >
                    <option value="WEB">Web (CSS/JavaScript)</option>
                    <option value="iOS">iOS (Swift/SwiftUI)</option>
                    <option value="ANDROID">Android (Kotlin/XML)</option>
                  </Select>
                  <FormHelperText>
                    Maps this platform to a specific Figma platform for variable export. 
                    Only one platform can be mapped to each Figma platform.
                  </FormHelperText>
                </>
              )}
            </FormControl>
          </VStack>
        {/* </Box> */}
      </VStack>
    );
  };

  const renderPlatformSettings = () => {
    if (formData.type !== 'platform-extension') {
      return null;
    }

    const canonicalPlatformData = getCanonicalPlatformData();
    const hasExtensionSource = canonicalPlatformData?.extensionSource;

    if (!hasExtensionSource) {
      return (
        <VStack spacing={4} align="stretch">
          <Text fontWeight="bold" fontSize="sm" color="gray.600">
            Platform Settings
          </Text>
          <Alert status="info" borderRadius="md">
            <AlertIcon />
            <Text>Select a source to see settings</Text>
          </Alert>
        </VStack>
      );
    }

    if (loadingPlatformData) {
      return (
        <VStack spacing={4} align="stretch">
          <Text fontWeight="bold" fontSize="sm" color="gray.600">
            Platform Settings
          </Text>
          <Box p={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}>
            <Text fontSize="sm" color="gray.500">Loading platform settings from source...</Text>
          </Box>
        </VStack>
      );
    }

    // Use platform extension data if available, otherwise show empty state
    const data = platformExtensionData;
    if (!data) {
      return (
        <VStack spacing={4} align="stretch">
          <Text fontWeight="bold" fontSize="sm" color="gray.600">
            Platform Settings
          </Text>
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <Text>Unable to load platform settings from source</Text>
          </Alert>
        </VStack>
      );
    }

    // Check if this is a local platform (editable)
    const isLocalPlatform = canonicalPlatformData.extensionSource?.repositoryUri === 'local';

    return (
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold" fontSize="sm" color="gray.600">
          Platform Settings
        </Text>
        
        {/* Platform ID - Read-only display */}
        <Box p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}>
        <Box mb={4}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>Platform ID</Text>
          <Text fontSize="sm" color="gray.500" fontFamily="mono">
            {data.platformId || 'Not set'}
          </Text>
          <Text fontSize="xs" color="gray.400" mt={1}>
            Platform ID cannot be changed after creation
          </Text>
        </Box>
        
        {/* System ID - Read-only display */}
        <Box mb={4}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>System ID</Text>
          <Text fontSize="sm" color="gray.500">
            {data.systemId || 'Not set'}
          </Text>
          <Text fontSize="xs" color="gray.400" mt={1}>
            Auto-populated from current system
          </Text>
        </Box>

        {/* Syntax Patterns - Editable for local platforms, read-only for external */}
        <Box mb={4}>
          <SyntaxPatternsEditor
            syntaxPatterns={isLocalPlatform ? (formData.syntaxPatterns ?? {
              prefix: '',
              suffix: '',
              delimiter: '_' as const,
              capitalization: 'none' as const,
              formatString: ''
            }) : {
              prefix: (data.syntaxPatterns as Record<string, unknown>)?.prefix as string || '',
              suffix: (data.syntaxPatterns as Record<string, unknown>)?.suffix as string || '',
              delimiter: (data.syntaxPatterns as Record<string, unknown>)?.delimiter as '' | '_' | '-' | '.' | '/' | undefined || '_' as const,
              capitalization: (data.syntaxPatterns as Record<string, unknown>)?.capitalization as 'none' | 'uppercase' | 'lowercase' | 'capitalize' || 'none' as const,
              formatString: (data.syntaxPatterns as Record<string, unknown>)?.formatString as string || ''
            }}
            onSyntaxPatternsChange={(newSyntaxPatterns) => {
              if (isLocalPlatform) {
                setFormData(prev => ({
                  ...prev,
                  syntaxPatterns: newSyntaxPatterns
                }));
              }
            }}
            preview={preview}
            isReadOnly={!isLocalPlatform}
            title="Syntax Patterns"
          />
        </Box>

        {/* Value Formatters - Editable for local platforms, read-only for external */}
        <Box mb={4}>
          <ValueFormattersEditor
            valueFormatters={isLocalPlatform ? {
              color: formData.valueFormatters?.color || 'hex',
              dimension: formData.valueFormatters?.dimension || 'px',
              numberPrecision: formData.valueFormatters?.numberPrecision || 2
            } : {
              color: (data.valueFormatters as Record<string, unknown>)?.color as string || 'hex',
              dimension: (data.valueFormatters as Record<string, unknown>)?.dimension as string || 'px',
              numberPrecision: (data.valueFormatters as Record<string, unknown>)?.numberPrecision as number || 2
            }}
            onValueFormattersChange={(newValueFormatters) => {
              if (isLocalPlatform) {
                setFormData(prev => ({
                  ...prev,
                  valueFormatters: newValueFormatters
                }));
              }
            }}
            isReadOnly={!isLocalPlatform}
            title="Value Formatters"
          />
        </Box>
        </Box>
      </VStack>
    );
  };

  const renderWorkflowSpecificFields = () => {
    switch (formData.workflow) {
      case 'create-file':
        return (
          <VStack spacing={6} align="stretch">
            {renderCreateFileFields()}
            
            {/* Syntax Patterns and Value Formatters for create-file workflow */}
            {formData.type === 'platform-extension' && (
              <>
                <Divider />
                <Text fontWeight="bold" fontSize="sm" color="gray.600">
                  Syntax Patterns
                </Text>
                <Box
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                  <HStack spacing={4} align="flex-end">
                    <FormControl>
                      <FormLabel>Prefix</FormLabel>
                      <Input
                        value={formData.syntaxPatterns?.prefix || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          syntaxPatterns: { ...formData.syntaxPatterns!, prefix: e.target.value }
                        })}
                        placeholder="e.g., TKN_"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Suffix</FormLabel>
                      <Input
                        value={formData.syntaxPatterns?.suffix || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          syntaxPatterns: { ...formData.syntaxPatterns!, suffix: e.target.value }
                        })}
                        placeholder="e.g., _SUF"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Delimiter</FormLabel>
                      <Select
                        value={formData.syntaxPatterns?.delimiter || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          syntaxPatterns: { ...formData.syntaxPatterns!, delimiter: e.target.value as '' | '_' | '-' | '.' | '/' | undefined }
                        })}
                      >
                        <option value="">None</option>
                        <option value="_">Underscore (_)</option>
                        <option value="-">Hyphen (-)</option>
                        <option value=".">Dot (.)</option>
                        <option value="/">Slash (/)</option>
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Capitalization</FormLabel>
                      <Select
                        value={formData.syntaxPatterns?.capitalization ?? 'none'}
                        onChange={(e) => setFormData({
                          ...formData,
                          syntaxPatterns: { ...formData.syntaxPatterns!, capitalization: e.target.value as 'none' | 'uppercase' | 'lowercase' | 'capitalize' }
                        })}
                      >
                        <option value="none">None</option>
                        <option value="uppercase">UPPERCASE</option>
                        <option value="lowercase">lowercase</option>
                        <option value="capitalize">Capitalize</option>
                      </Select>
                    </FormControl>
                  </HStack>
                  <VStack spacing={3} align="stretch" mt={4}>
                    <FormControl>
                      <FormLabel>Format String</FormLabel>
                      <Input
                        value={formData.syntaxPatterns?.formatString || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          syntaxPatterns: { ...formData.syntaxPatterns!, formatString: e.target.value }
                        })}
                        placeholder="e.g., {prefix}{name}{suffix}"
                        width="100%"
                      />
                    </FormControl>
                    <Box mt={2} p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.700' : 'gray.100'}>
                      <Text fontSize="sm" color="gray.500" mb={1} fontWeight="bold">Preview</Text>
                      <Text fontFamily="mono" fontSize="md" wordBreak="break-all">{preview}</Text>
                    </Box>
                  </VStack>
                </Box>
                
                <Divider />
                
                <Text fontWeight="bold" fontSize="sm" color="gray.600">
                  Value Formatters
                </Text>
                <HStack spacing={4}>
                  <FormControl>
                    <FormLabel>Color Format</FormLabel>
                    <Select
                      value={formData.valueFormatters?.color || 'hex'}
                      onChange={(e) => setFormData({
                        ...formData,
                        valueFormatters: { ...formData.valueFormatters!, color: e.target.value }
                      })}
                    >
                      <option value="hex">Hex</option>
                      <option value="rgb">RGB</option>
                      <option value="rgba">RGBA</option>
                      <option value="hsl">HSL</option>
                      <option value="hsla">HSLA</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Dimension Unit</FormLabel>
                    <Select
                      value={formData.valueFormatters?.dimension || 'px'}
                      onChange={(e) => setFormData({
                        ...formData,
                        valueFormatters: { ...formData.valueFormatters!, dimension: e.target.value }
                      })}
                    >
                      <option value="px">px</option>
                      <option value="rem">rem</option>
                      <option value="em">em</option>
                      <option value="pt">pt</option>
                      <option value="dp">dp</option>
                      <option value="sp">sp</option>
                    </Select>
                  </FormControl>
                </HStack>
                <FormControl>
                  <FormLabel>Number Precision</FormLabel>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={formData.valueFormatters?.numberPrecision || 2}
                    onChange={(e) => setFormData({
                      ...formData,
                      valueFormatters: { ...formData.valueFormatters!, numberPrecision: parseInt(e.target.value) }
                    })}
                  />
                </FormControl>
              </>
            )}
          </VStack>
        );
      case 'create-repository':
        return renderCreateRepositoryFields();
      default:
        return null;
    }
  };

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="900px">
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <Text>Edit Platform</Text>
            <HStack spacing={2}>
              {formData.type === 'platform-extension' && (() => {
                const canonicalPlatformData = getCanonicalPlatformData();
                if (!canonicalPlatformData?.extensionSource) return null;
                
                // Check if this is a local file
                const repositoryUri = canonicalPlatformData.extensionSource.repositoryUri;
                const isLocalFile = repositoryUri === 'local';
                
                return isLocalFile ? (
                  <Badge colorScheme="blue" variant="subtle">Local</Badge>
                ) : (
                  <Badge colorScheme="green" variant="subtle">External</Badge>
                );
              })()}
            </HStack>
          </VStack>
        </ModalHeader>
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Platform Extension Settings - Only show for platform extensions */}
            {formData.type === 'platform-extension' && (
              <>
                {renderPlatformFields()}
                <Divider />
              </>
            )}

            {/* Source Configuration */}
            {renderSourceConfiguration()}
            <Divider />
            {renderWorkflowSpecificFields()}

            {/* Platform Settings - Only show for platform extensions */}
            {formData.type === 'platform-extension' && (
              <>
                {renderPlatformSettings()}
              </>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            {(onDelete || onDeprecate) && (
              <Button
                colorScheme="red"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            )}
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {/* Delete Confirmation Dialog */}
    <AlertDialog
      isOpen={isDeleteDialogOpen}
      leastDestructiveRef={deleteDialogCancelRef}
      onClose={() => setIsDeleteDialogOpen(false)}
      isCentered
    >
      <AlertDialogOverlay
        bg="blackAlpha.300"
        backdropFilter="blur(2px)"
      >
        <AlertDialogContent
          maxW="500px"
          mx="auto"
          my="auto"
          borderRadius="lg"
          boxShadow="xl"
        >
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Extension
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack align="stretch" spacing={4}>
              <Text>
                Delete extension &ldquo;{repository.platformId || repository.themeId}&rdquo;?
              </Text>

              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">Warning: This action will:</Text>
                  {platformStatus?.hasError && (platformStatus.errorType === 'file-not-found' || platformStatus.errorType === 'repository-not-found') ? (
                    <>
                      <Text>• Remove the platform from local data (file already missing)</Text>
                      <Text>• Remove the repository link</Text>
                      <Text>• Clean up all associated files</Text>
                    </>
                  ) : (
                    <>
                      <Text>• Delete the file from GitHub repository</Text>
                      <Text>• Remove the repository link</Text>
                      <Text>• Remove the platform from local data</Text>
                      <Text>• Clean up all associated files</Text>
                    </>
                  )}
                  <Text fontWeight="bold" color="red.500">• This action cannot be undone</Text>
                </VStack>
              </Alert>

              <FormControl>
                <FormLabel>Type &ldquo;delete&rdquo; to confirm</FormLabel>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type delete to confirm"
                  autoFocus
                />
              </FormControl>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={deleteDialogCancelRef} onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            {onDeprecate && (
              <Button
                colorScheme="orange"
                onClick={handleDeprecate}
                ml={3}
              >
                Deprecate
              </Button>
            )}
            {onDelete && (
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                ml={3}
                isDisabled={deleteConfirmText !== 'delete'}
              >
                Yes, delete
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>

    {/* Source Selection Dialog */}
    <SourceSelectionDialog
      isOpen={isSourceSelectionOpen}
      onClose={() => setIsSourceSelectionOpen(false)}
      onSourceSelected={handleSourceSelected}
      schemaType={formData.type}
    />
  </>
);
}; 