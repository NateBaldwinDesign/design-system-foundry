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
  Radio,
  RadioGroup,
  Stack,
  Icon,
  Spinner,
  Badge,
  Tooltip,
  IconButton,
  Stepper,
  Step,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  StepDescription,
  useSteps
} from '@chakra-ui/react';
import { LuLink, LuFileText, LuGitBranch, LuRefreshCw } from 'react-icons/lu';
import type { DataType } from '../services/dataTypeDetector';
import { PlatformExtensionValidationService } from '../services/platformExtensionValidation';
import { StorageService } from '../services/storage';
import { GitHubApiService, ValidFile } from '../services/githubApi';
import { GitHubCacheService } from '../services/githubCache';
import type { GitHubOrganization, GitHubRepo, GitHubBranch } from '../config/github';
import { createUniqueId } from '../utils/id';
import { SyntaxPatternsEditor, ValueFormattersEditor } from './shared';

export interface PlatformCreateData {
  type: 'core' | 'platform-extension' | 'theme-override';
  repositoryUri: string;
  branch: string;
  filePath: string;
  platformId?: string;
  themeId?: string;
  // Core schema fields for platformExtensions
  systemId?: string;
  syntaxPatterns?: {
    prefix: string;
    suffix: string;
    delimiter: string;
    capitalization: string;
    formatString: string;
  };
  valueFormatters?: {
    color: string;
    dimension: string;
    numberPrecision: number;
  };
  // Platform management fields
  displayName?: string;
  description?: string;
  // Workflow-specific fields
  workflow: 'link-existing' | 'create-file' | 'create-repository';
  newFileName?: string;
  newRepositoryName?: string;
  newRepositoryDescription?: string;
  newRepositoryVisibility?: 'public' | 'private';
}

interface PlatformCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PlatformCreateData) => void;
  currentDataType: DataType;
}

export const PlatformCreateDialog: React.FC<PlatformCreateDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  currentDataType
}) => {
  const [formData, setFormData] = useState<PlatformCreateData>({
    type: 'platform-extension',
    repositoryUri: '',
    branch: 'main',
    filePath: '',
    systemId: '',
    platformId: '',
    displayName: '',
    description: '',
    workflow: 'link-existing',
    newFileName: 'platform-extension.json',
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
  const toast = useToast();
  const { colorMode } = useColorMode();

  // Focus management refs for repository selection
  const orgSelectRef = useRef<HTMLSelectElement>(null);
  const repoSelectRef = useRef<HTMLSelectElement>(null);
  const branchSelectRef = useRef<HTMLSelectElement>(null);
  const fileSelectRef = useRef<HTMLSelectElement>(null);

  // GitHub repository selection state
  const [organizations, setOrganizations] = useState<GitHubOrganization[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<GitHubRepo[]>([]);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [validFiles, setValidFiles] = useState<ValidFile[]>([]);
  
  const [selectedOrg, setSelectedOrg] = useState<GitHubOrganization | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<ValidFile | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'orgs' | 'repos' | 'branches' | 'files' | null>(null);
  const [error, setError] = useState<string>('');
  const [cacheStats, setCacheStats] = useState<{
    totalEntries: number;
    expiredEntries: number;
    validEntries: number;
    totalSize: number;
  } | null>(null);

  // Stepper configuration
  const steps = [
    { title: 'Source', description: 'Select the source of your data' },
    { title: 'Overview', description: 'Name and ID for linking data' },
    { title: 'Finish', description: 'Complete and save your platform' }
  ];

  const { activeStep, setActiveStep } = useSteps({
    index: 0,
    count: steps.length,
  });

  // Get current system ID from storage
  const getCurrentSystemId = (): string => {
    const rootData = StorageService.getRootData();
    return rootData.systemId || 'system-default';
  };

  // Generate a unique platform ID for create workflows
  const generatePlatformId = (): string => {
    return createUniqueId('platform');
  };

  // Comprehensive reset function to clear all state
  const resetAllState = () => {
    // Reset form data to initial state
    const currentSystemId = getCurrentSystemId();
    setFormData({
      type: 'platform-extension',
      repositoryUri: '',
      branch: 'main',
      filePath: '',
      systemId: currentSystemId,
      platformId: '',
      displayName: '',
      description: '',
      workflow: 'link-existing',
      newFileName: 'platform-extension.json',
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

    // Reset all GitHub selection state
    setSelectedOrg(null);
    setSelectedRepo(null);
    setSelectedBranch('');
    setSelectedFile(null);
    setFilteredRepositories([]);
    setBranches([]);
    setValidFiles([]);

    // Reset UI state
    setErrors({});
    setError('');
    setLoading(false);
    setLoadingStep(null);
    setCacheStats(null);

    // Reset stepper to first step
    setActiveStep(0);
  };

  // Enhanced close handler that resets all state
  const handleClose = () => {
    resetAllState();
    onClose();
  };

  // Auto-generate platform ID for create workflows when needed
  useEffect(() => {
    if ((formData.workflow === 'create-file' || formData.workflow === 'create-repository') && 
        formData.type === 'platform-extension' && 
        !formData.platformId) {
      const newPlatformId = generatePlatformId();
      setFormData(prev => ({ ...prev, platformId: newPlatformId }));
    }
  }, [formData.workflow, formData.type]);

  // GitHub repository loading functions
  const loadOrganizations = async (forceRefresh = false) => {
    setLoading(true);
    setLoadingStep('orgs');
    setError('');
    
    try {
      // Clear cache if forcing refresh
      if (forceRefresh) {
        GitHubCacheService.clearAll();
        setCacheStats(GitHubCacheService.getCacheStats());
      }

      const orgs = await GitHubApiService.getOrganizations();
      setOrganizations(orgs);
      
      // Auto-select the first organization (usually the user's personal account)
      if (orgs.length > 0) {
        setSelectedOrg(orgs[0]);
        await loadRepositoriesForOrg(orgs[0], forceRefresh);
      }

      // Update cache stats
      setCacheStats(GitHubCacheService.getCacheStats());
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setError('Failed to load organizations. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load organizations from GitHub.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const loadRepositoriesForOrg = async (org: GitHubOrganization, forceRefresh = false) => {
    setLoading(true);
    setLoadingStep('repos');
    setError('');
    
    try {
      // Clear repositories cache if forcing refresh
      if (forceRefresh) {
        GitHubCacheService.clearAll();
        setCacheStats(GitHubCacheService.getCacheStats());
      }

      const repos = await GitHubApiService.getRepositories();
      
      // Filter repositories by the selected organization
      const orgRepos = repos.filter(repo => {
        const repoOwner = repo.full_name.split('/')[0];
        return repoOwner === org.login;
      });
      
      setFilteredRepositories(orgRepos);

      // Update cache stats
      setCacheStats(GitHubCacheService.getCacheStats());
    } catch (error) {
      console.error('Failed to load repositories:', error);
      setError('Failed to load repositories. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load repositories from GitHub.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const handleOrgChange = async (orgLogin: string) => {
    const org = organizations.find(o => o.login === orgLogin);
    if (!org) return;

    setSelectedOrg(org);
    setSelectedRepo(null);
    setSelectedBranch('');
    setValidFiles([]);
    setSelectedFile(null);
    setError('');

    await loadRepositoriesForOrg(org);
    
    // Focus the repository select field after loading completes
    setTimeout(() => {
      if (repoSelectRef.current) {
        repoSelectRef.current.focus();
      }
    }, 100);
  };

  const handleRepoChange = async (repoFullName: string) => {
    const repo = filteredRepositories.find(r => r.full_name === repoFullName);
    if (!repo) return;

    setSelectedRepo(repo);
    setSelectedBranch('');
    setValidFiles([]);
    setSelectedFile(null);
    setError('');

    // Load branches for selected repository
    setLoading(true);
    setLoadingStep('branches');
    
    try {
      const repoBranches = await GitHubApiService.getBranches(repo.full_name);
      setBranches(repoBranches);
      
      // Auto-select "main" branch if it exists
      const mainBranch = repoBranches.find(branch => branch.name === 'main');
      if (mainBranch) {
        setSelectedBranch('main');
        // Automatically trigger file loading for main branch
        await loadAndMatchFiles(repo.full_name, 'main');
        // Focus the file select field after loading completes
        setTimeout(() => {
          if (fileSelectRef.current) {
            fileSelectRef.current.focus();
          }
        }, 100);
      } else {
        // If no main branch, focus the branch select field
        setTimeout(() => {
          if (branchSelectRef.current) {
            branchSelectRef.current.focus();
          }
        }, 100);
      }
      
      // Update cache stats
      setCacheStats(GitHubCacheService.getCacheStats());
    } catch (error) {
      console.error('Failed to load branches:', error);
      setError('Failed to load branches. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load branches from GitHub.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      // Focus the repository select field on error
      setTimeout(() => {
        if (repoSelectRef.current) {
          repoSelectRef.current.focus();
        }
      }, 100);
    } finally {
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const handleBranchChange = async (branchName: string) => {
    if (!selectedRepo) return;

    setSelectedBranch(branchName);
    setValidFiles([]);
    setSelectedFile(null);
    setError('');

    await loadAndMatchFiles(selectedRepo.full_name, branchName);
    
    // Focus the file select field after loading completes
    setTimeout(() => {
      if (fileSelectRef.current) {
        fileSelectRef.current.focus();
      }
    }, 100);
  };

  const loadAndMatchFiles = async (repoFullName: string, branchName: string) => {
    setLoading(true);
    setLoadingStep('files');
    
    try {
      // Get current system ID for validation
      const currentSystemId = getCurrentSystemId();
      
      // Pass systemId for platform extension validation
      const files = await GitHubApiService.scanRepositoryForValidFiles(
        repoFullName, 
        branchName,
        formData.type === 'platform-extension' ? currentSystemId : undefined
      );
      
      // Filter files based on the expected schema type
      const expectedFileType = formData.type === 'platform-extension' ? 'platform-extension' : 'schema';
      const filteredFiles = files.filter(file => file.type === expectedFileType);
      
      setValidFiles(filteredFiles);
      
      // Auto-select the first matching file
      if (filteredFiles.length > 0) {
        console.log('🔍 [DEBUG] Auto-selecting first file:', filteredFiles[0].path);
        setSelectedFile(filteredFiles[0]);
        
        // Update form data with the selected file info
        setFormData(prev => ({
          ...prev,
          repositoryUri: repoFullName,
          branch: branchName,
          filePath: filteredFiles[0].path
        }));
        
        // Call handleFileSelect to extract data from the auto-selected file
        console.log('🔍 [DEBUG] Calling handleFileSelect for auto-selected file');
        await handleFileSelect(filteredFiles[0].path);
        
        // Focus the file select field after auto-selection
        setTimeout(() => {
          if (fileSelectRef.current) {
            fileSelectRef.current.focus();
          }
        }, 100);
      } else {
        // If no files found, focus the file select field to show the "no files" message
        setTimeout(() => {
          if (fileSelectRef.current) {
            fileSelectRef.current.focus();
          }
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      setError('Failed to load files. Please try again.');
      // Focus the branch select field on error
      setTimeout(() => {
        if (branchSelectRef.current) {
          branchSelectRef.current.focus();
        }
      }, 100);
    } finally {
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const handleRefreshCache = async () => {
    if (!selectedOrg) return;
    
    toast({
      title: 'Refreshing Cache',
      description: 'Clearing cached data and fetching fresh information...',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
    
    await loadOrganizations(true);
  };

  const getCacheStatusText = () => {
    if (!cacheStats) return 'Unknown';
    
    if (cacheStats.validEntries === 0) return 'No cached data';
    if (cacheStats.expiredEntries > 0) return `${cacheStats.validEntries} valid, ${cacheStats.expiredEntries} expired`;
    return `${cacheStats.validEntries} cached items`;
  };

  // Debug logging for formData changes
  useEffect(() => {
    console.log('🔍 [DEBUG] formData changed:', {
      platformId: formData.platformId,
      displayName: formData.displayName,
      description: formData.description,
      workflow: formData.workflow,
      filePath: formData.filePath
    });
  }, [formData.platformId, formData.displayName, formData.description, formData.workflow, formData.filePath]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Reset all state to ensure clean slate
      resetAllState();
      
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

      const availableTypes = getAvailableRepositoryTypes();
      const defaultType = availableTypes.length > 0 ? availableTypes[0].value as PlatformCreateData['type'] : 'platform-extension';
      
      // Update form data with the correct type for current data type
      setFormData(prev => ({
        ...prev,
        type: defaultType
      }));
      
      // Load GitHub organizations for repository selection
      if (organizations.length === 0) {
        loadOrganizations();
      }
    }
  }, [isOpen, currentDataType]);

  // Update cache stats when modal opens
  useEffect(() => {
    if (isOpen) {
      setCacheStats(GitHubCacheService.getCacheStats());
    }
  }, [isOpen]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay to ensure the dialog is fully closed before resetting
      const timeoutId = setTimeout(() => {
        resetAllState();
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);

  // Prevent focus from jumping to next field when loading
  useEffect(() => {
    if (loading) {
      // Return focus to the appropriate field when loading completes
      const handleLoadingComplete = () => {
        if (!loading) {
          // Determine which field should receive focus based on loading step
          let targetRef = null;
          switch (loadingStep) {
            case 'orgs':
              targetRef = orgSelectRef;
              break;
            case 'repos':
              targetRef = repoSelectRef;
              break;
            case 'branches':
              targetRef = branchSelectRef;
              break;
            case 'files':
              targetRef = fileSelectRef;
              break;
            default:
              // If no specific step, try to focus the most logical field
              if (selectedFile) {
                targetRef = fileSelectRef;
              } else if (selectedBranch) {
                targetRef = branchSelectRef;
              } else if (selectedRepo) {
                targetRef = repoSelectRef;
              } else if (selectedOrg) {
                targetRef = orgSelectRef;
              }
          }
          
          if (targetRef?.current) {
            setTimeout(() => {
              targetRef.current?.focus();
            }, 50);
          }
        }
      };
      
      // Set up a listener for when loading completes
      const timeoutId = setTimeout(handleLoadingComplete, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [loading, loadingStep, selectedOrg, selectedRepo, selectedBranch, selectedFile]);

  // Get available repository types for rendering (moved outside useEffect to avoid infinite loop)
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

  const availableTypes = getAvailableRepositoryTypes();

  // Use CodeSyntaxService for preview (from PlatformEditorDialog)
  const preview = useMemo(() => {
    if (formData.type !== 'platform-extension') return '';
    
    // Simple preview generation based on syntax patterns
    const { prefix = '', suffix = '', delimiter = '_', capitalization = 'none' } = formData.syntaxPatterns || {};
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
    if (delimiter) {
      tokenName = tokenName.replace(/-/g, delimiter);
    }
    
    return `${prefix}${tokenName}${suffix}`;
  }, [formData.syntaxPatterns, formData.type]);

  // Debug logging
  console.log('[ExtensionCreateDialog] Debug info:', {
    currentDataType,
    availableTypes,
    availableTypesLength: availableTypes.length,
    formDataType: formData.type,
    currentSystemId: getCurrentSystemId(),
    workflow: formData.workflow
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Workflow-specific validation
    switch (formData.workflow) {
      case 'link-existing':
        // Basic validation for linking to existing
        if (!formData.repositoryUri.trim()) {
          newErrors.repositoryUri = 'Repository URI is required';
        }
        if (!formData.branch.trim()) {
          newErrors.branch = 'Branch is required';
        }
        if (!formData.filePath.trim()) {
          newErrors.filePath = 'File path is required';
        }
        break;
      
      case 'create-file':
        // Validation for creating file in current repository
        if (!formData.newFileName?.trim()) {
          newErrors.newFileName = 'File name is required';
        }
        // platformId is auto-generated for create workflows
        break;
      
      case 'create-repository':
        // Validation for creating new repository
        if (!formData.newRepositoryName?.trim()) {
          newErrors.newRepositoryName = 'Repository name is required';
        }
        // platformId is auto-generated for create workflows
        break;
    }

    // Type-specific validation
    if (formData.type === 'platform-extension') {
      if (!formData.displayName?.trim()) {
        newErrors.displayName = 'Display name is required for platform extensions';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step-specific validation
  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (activeStep) {
      case 0: // Source step
        // Validate workflow and repository settings
        switch (formData.workflow) {
          case 'link-existing':
            if (!formData.repositoryUri.trim()) {
              newErrors.repositoryUri = 'Repository URI is required';
            }
            if (!formData.branch.trim()) {
              newErrors.branch = 'Branch is required';
            }
            if (!formData.filePath.trim()) {
              newErrors.filePath = 'File path is required';
            }
            break;
          case 'create-file':
            if (!formData.newFileName?.trim()) {
              newErrors.newFileName = 'File name is required';
            }
            break;
          case 'create-repository':
            if (!formData.newRepositoryName?.trim()) {
              newErrors.newRepositoryName = 'Repository name is required';
            }
            break;
        }
        break;
      
      case 1: // Overview step
        // Validate platform extension settings
        if (formData.type === 'platform-extension') {
          if (!formData.displayName?.trim()) {
            newErrors.displayName = 'Display name is required for platform extensions';
          }
          // Only validate platformId for link-existing workflow
          if (formData.workflow === 'link-existing' && !formData.platformId?.trim()) {
            newErrors.platformId = 'Platform ID is required';
          }
        }
        break;
      
      case 2: // Settings step
        // Settings are optional, so no validation needed
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation functions
  const goToNextStep = () => {
    if (validateCurrentStep()) {
      if (activeStep < steps.length - 1) {
        setActiveStep(activeStep + 1);
      }
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before continuing',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const goToPreviousStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSave = () => {
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

    // Validate against schema
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
    resetAllState();
    onClose();
  };

  const handleFileSelect = async (filePath: string) => {
    console.log('🔍 [DEBUG] handleFileSelect called with filePath:', filePath);
    
    const file = validFiles.find(f => f.path === filePath);
    console.log('🔍 [DEBUG] Found file in validFiles:', file);
    
    setSelectedFile(file || null);
    console.log('🔍 [DEBUG] Set selectedFile to:', file || null);
    
    if (file) {
      console.log('🔍 [DEBUG] File found, updating formData with filePath:', file.path);
      setFormData(prev => {
        const updated = {
          ...prev,
          filePath: file.path
        };
        console.log('🔍 [DEBUG] Updated formData with filePath:', updated);
        return updated;
      });

      // Extract platformId, displayName, and description from the selected file
      try {
        console.log('🔍 [DEBUG] Starting file content extraction...');
        setLoading(true);
        setLoadingStep('files');
        
        console.log('🔍 [DEBUG] Calling GitHubApiService.getFileContent with:', {
          repo: selectedRepo!.full_name,
          path: file.path,
          branch: selectedBranch
        });
        
        const fileResponse = await GitHubApiService.getFileContent(
          selectedRepo!.full_name,
          file.path,
          selectedBranch
        );
        
        console.log('🔍 [DEBUG] File response received:', {
          hasContent: !!fileResponse?.content,
          contentLength: fileResponse?.content?.length || 0,
          response: fileResponse
        });
        
        if (fileResponse && fileResponse.content) {
          console.log('🔍 [DEBUG] Parsing JSON content...');
          const fileData = JSON.parse(fileResponse.content);
          console.log('🔍 [DEBUG] Parsed fileData:', fileData);
          
          // Extract platformId from the file
          const extractedPlatformId = fileData.platformId;
          console.log('🔍 [DEBUG] Extracted platformId:', extractedPlatformId);
          
          // Extract displayName from multiple possible locations
          const extractedDisplayName = fileData.metadata?.name || 
                                     fileData.displayName || 
                                     fileData.metadata?.displayName ||
                                     fileData.name;
          console.log('🔍 [DEBUG] Extracted displayName:', extractedDisplayName, 'from sources:', {
            'metadata.name': fileData.metadata?.name,
            'displayName': fileData.displayName,
            'metadata.displayName': fileData.metadata?.displayName,
            'name': fileData.name
          });
          
          // Extract description from multiple possible locations
          const extractedDescription = fileData.metadata?.description || 
                                     fileData.description || 
                                     fileData.metadata?.desc;
          console.log('🔍 [DEBUG] Extracted description:', extractedDescription, 'from sources:', {
            'metadata.description': fileData.metadata?.description,
            'description': fileData.description,
            'metadata.desc': fileData.metadata?.desc
          });
          
          // Extract syntax patterns from the file
          const extractedSyntaxPatterns = fileData.syntaxPatterns;
          console.log('🔍 [DEBUG] Extracted syntaxPatterns:', extractedSyntaxPatterns);
          
          // Extract value formatters from the file
          const extractedValueFormatters = fileData.valueFormatters;
          console.log('🔍 [DEBUG] Extracted valueFormatters:', extractedValueFormatters);
          
          console.log('🔍 [DEBUG] About to update formData with extracted values:', {
            platformId: extractedPlatformId,
            displayName: extractedDisplayName,
            description: extractedDescription,
            syntaxPatterns: extractedSyntaxPatterns,
            valueFormatters: extractedValueFormatters
          });
          
          // Update form data with extracted values
          setFormData(prev => {
            const updated = {
              ...prev,
              platformId: extractedPlatformId || prev.platformId,
              displayName: extractedDisplayName || prev.displayName,
              description: extractedDescription || prev.description,
              syntaxPatterns: extractedSyntaxPatterns || prev.syntaxPatterns,
              valueFormatters: extractedValueFormatters || prev.valueFormatters
            };
            console.log('🔍 [DEBUG] Updated formData:', updated);
            return updated;
          });
          
          // Show success message if values were extracted
          const extractedFields = [];
          if (extractedPlatformId) extractedFields.push(`platformId: ${extractedPlatformId}`);
          if (extractedDisplayName) extractedFields.push(`displayName: ${extractedDisplayName}`);
          if (extractedDescription) extractedFields.push(`description: ${extractedDescription}`);
          if (extractedSyntaxPatterns) extractedFields.push(`syntax patterns`);
          if (extractedValueFormatters) extractedFields.push(`value formatters`);
          
          console.log('🔍 [DEBUG] Extracted fields for toast:', extractedFields);
          
          if (extractedFields.length > 0) {
            console.log('🔍 [DEBUG] Showing success toast with extracted fields');
            toast({
              title: 'File Data Extracted',
              description: `Found: ${extractedFields.join(', ')}`,
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
          } else {
            console.log('🔍 [DEBUG] No fields extracted, showing warning toast');
            toast({
              title: 'No Data Found',
              description: 'Could not extract platform data from the selected file. Please fill in the fields manually.',
              status: 'warning',
              duration: 4000,
              isClosable: true,
            });
          }
        } else {
          console.log('🔍 [DEBUG] No file content received from API');
        }
      } catch (error) {
        console.error('🔍 [DEBUG] Error during file extraction:', error);
        toast({
          title: 'Warning',
          description: 'Could not extract platform data from the selected file. Please fill in the fields manually.',
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
      } finally {
        console.log('🔍 [DEBUG] File extraction complete, setting loading to false');
        setLoading(false);
        setLoadingStep(null);
      }
    } else {
      console.log('🔍 [DEBUG] No file found for filePath:', filePath);
    }
  };


  const renderWorkflowSelector = () => (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        Source location
      </Text>
      
                      <RadioGroup value={formData.workflow} onChange={(value) => setFormData({ ...formData, workflow: value as PlatformCreateData['workflow'] })}>
        <Stack spacing={3}>
          <Radio value="link-existing">
            <HStack spacing={2}>
              <Icon as={LuLink} />
              <VStack align="start" spacing={0}>
                <Text fontWeight="medium">Link Existing Extension</Text>
                <Text fontSize="sm" color="gray.500">Connect to an existing platform extension repository</Text>
              </VStack>
            </HStack>
          </Radio>
          
          <Radio value="create-file">
            <HStack spacing={2}>
              <Icon as={LuFileText} />
              <VStack align="start" spacing={0}>
                <Text fontWeight="medium">Create Extension File</Text>
                <Text fontSize="sm" color="gray.500">Create a new platform extension file in the current repository</Text>
              </VStack>
            </HStack>
          </Radio>
          
          <Radio value="create-repository">
            <HStack spacing={2}>
              <Icon as={LuGitBranch} />
              <VStack align="start" spacing={0}>
                <Text fontWeight="medium">Create New Repository</Text>
                <Text fontSize="sm" color="gray.500">Create a new repository with scaffolded platform extension structure</Text>
              </VStack>
            </HStack>
          </Radio>
        </Stack>
      </RadioGroup>
    </VStack>
  );

  const renderLinkExistingFields = () => (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        Repository Settings
      </Text>
      
      {error && (
        <Alert status="error">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      {/* Organization Selection */}
      <Box>
        <Text fontWeight="medium" mb={2}>Organization</Text>
        <Select
          value={selectedOrg?.login || ''}
          onChange={(e) => handleOrgChange(e.target.value)}
          isDisabled={loading}
          placeholder="Select organization"
          ref={orgSelectRef}
        >
          {organizations.map((org) => (
            <option key={org.login} value={org.login}>
              {org.name || org.login}
            </option>
          ))}
        </Select>
      </Box>

      {/* Repository Selection */}
      <Box>
        <Text fontWeight="medium" mb={2}>Repository</Text>
        <Select
          value={selectedRepo?.full_name || ''}
          onChange={(e) => handleRepoChange(e.target.value)}
          isDisabled={loading || !selectedOrg}
          placeholder="Select repository"
          ref={repoSelectRef}
        >
          {filteredRepositories.map((repo) => (
            <option key={repo.full_name} value={repo.full_name}>
              {repo.name}
            </option>
          ))}
        </Select>
      </Box>

      {/* Branch Selection */}
      <Box>
        <Text fontWeight="medium" mb={2}>Branch</Text>
        <Select
          value={selectedBranch}
          onChange={(e) => handleBranchChange(e.target.value)}
          isDisabled={loading || !selectedRepo}
          placeholder="Select branch"
          ref={branchSelectRef}
        >
          {branches.map((branch) => (
            <option key={branch.name} value={branch.name}>
              {branch.name}
            </option>
          ))}
        </Select>
      </Box>

      {/* File Selection */}
      <Box>
        <Text fontWeight="medium" mb={2}>File</Text>
        <Select
          value={selectedFile?.path || ''}
          onChange={(e) => handleFileSelect(e.target.value)}
          isDisabled={loading || !selectedBranch}
          placeholder="Select file"
          ref={fileSelectRef}
        >
          {validFiles.map((file) => (
            <option key={file.path} value={file.path}>
              {file.name} ({file.type})
            </option>
          ))}
        </Select>
        {validFiles.length === 0 && selectedBranch && !loading && (
          <Text fontSize="sm" color="gray.500" mt={1}>
            {formData.type === 'platform-extension' 
              ? `No platform extension files found with matching systemId: ${getCurrentSystemId()}`
              : `No ${formData.type} files found in this branch`
            }
          </Text>
        )}
      </Box>

      {/* Loading Indicator */}
      {loading && (
        <HStack justify="center" py={4}>
          <Spinner size="sm" />
          <Text fontSize="sm">
            {loadingStep === 'orgs' && 'Loading organizations...'}
            {loadingStep === 'repos' && 'Loading repositories...'}
            {loadingStep === 'branches' && 'Loading branches...'}
            {loadingStep === 'files' && 'Scanning files...'}
          </Text>
        </HStack>
      )}

      {/* Cache Status */}
      <HStack justify="space-between" align="center">
        <Text fontSize="sm" color="gray.500">
          {formData.type === 'platform-extension' 
            ? `Looking for platform extension files with systemId: ${getCurrentSystemId()}`
            : `Looking for ${formData.type} files`
          }
        </Text>
        <HStack spacing={2}>
          {cacheStats && (
            <Badge colorScheme={cacheStats.validEntries > 0 ? 'green' : 'gray'} variant="subtle" fontSize="xs">
              {getCacheStatusText()}
            </Badge>
          )}
          <Tooltip label="Refresh cache and fetch latest data">
            <IconButton
              aria-label="Refresh cache"
              icon={<LuRefreshCw />}
              size="sm"
              variant="ghost"
              onClick={handleRefreshCache}
              isLoading={loading}
            />
          </Tooltip>
        </HStack>
      </HStack>
    </VStack>
  );

  const renderCreateFileFields = () => (
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
    console.log('🔍 [DEBUG] renderPlatformFields called with formData:', {
      platformId: formData.platformId,
      displayName: formData.displayName,
      description: formData.description,
      workflow: formData.workflow
    });
    
    return (
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold" fontSize="sm" color="gray.600">
          Platform Extension Settings
        </Text>
        
        {/* Basic Platform Information */}
        <Box
          p={3}
          borderWidth={1}
          borderRadius="md"
          bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        >
          <VStack spacing={3} align="stretch">
            <FormControl isRequired isInvalid={!!errors.displayName}>
              <FormLabel>Display Name</FormLabel>
              <Input
                value={formData.displayName || ''}
                onChange={(e) => {
                  console.log('🔍 [DEBUG] Display Name input changed to:', e.target.value);
                  setFormData({ ...formData, displayName: e.target.value });
                }}
                placeholder="iOS Platform"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Current value: {formData.displayName || 'empty'}
              </Text>
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              <Input
                value={formData.description || ''}
                onChange={(e) => {
                  console.log('🔍 [DEBUG] Description input changed to:', e.target.value);
                  setFormData({ ...formData, description: e.target.value });
                }}
                placeholder="Platform-specific extensions for iOS"
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Current value: {formData.description || 'empty'}
              </Text>
            </FormControl>
          </VStack>
        </Box>

        {/* Platform ID - Only show for link-existing workflow */}
        {formData.workflow === 'link-existing' ? (
          <FormControl isRequired isInvalid={!!errors.platformId}>
            <FormLabel>Platform ID</FormLabel>
            <Input
              value={formData.platformId || ''}
              onChange={(e) => {
                console.log('🔍 [DEBUG] Platform ID input changed to:', e.target.value);
                setFormData({ ...formData, platformId: e.target.value });
              }}
              placeholder="e.g., platform-ios, platform-android"
            />
            <Text fontSize="xs" color="gray.500" mt={1}>
              Platform ID from the selected file will be auto-populated
            </Text>
          </FormControl>
        ) : (
          /* For create workflows, show auto-generated Platform ID in read-only display */
          <Box p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}>
            <Text fontSize="sm" fontWeight="medium" mb={2}>Platform ID</Text>
            <Text fontSize="sm" color="gray.500" fontFamily="mono">
              {formData.platformId || 'Generating...'}
            </Text>
            <Text fontSize="xs" color="gray.400" mt={1}>
              Auto-generated unique identifier for the new platform extension
            </Text>
          </Box>
        )}
        
        {/* System ID is hidden and auto-populated */}
        <Box p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>System ID</Text>
          <Text fontSize="sm" color="gray.500">
            {formData.systemId || getCurrentSystemId()}
          </Text>
          <Text fontSize="xs" color="gray.400" mt={1}>
            Auto-populated from current system
          </Text>
        </Box>
      </VStack>
    );
  };

  const renderWorkflowSpecificFields = () => {
    switch (formData.workflow) {
      case 'link-existing':
        return renderLinkExistingFields();
      case 'create-file':
        return renderCreateFileFields();
      case 'create-repository':
        return renderCreateRepositoryFields();
      default:
        return null;
    }
  };

  const getButtonText = () => {
    switch (formData.workflow) {
      case 'link-existing':
        return 'Link Platform';
      case 'create-file':
        return 'Create Platform Extension File';
      case 'create-repository':
        return 'Create Repository & PlatformExtension';
      default:
        return 'Add Platform';
    }
  };

  const renderReadOnlySyntaxSummary = () => {
    return (
      <VStack spacing={6} align="stretch">
        <SyntaxPatternsEditor
          syntaxPatterns={formData.syntaxPatterns || {
            prefix: '',
            suffix: '',
            delimiter: '_',
            capitalization: 'none',
            formatString: ''
          }}
          onSyntaxPatternsChange={() => {}} // No-op for read-only
          preview={preview}
          isReadOnly={true}
          title="Syntax Patterns"
        />
        <Divider />
        <ValueFormattersEditor
          valueFormatters={formData.valueFormatters || {
            color: 'hex',
            dimension: 'px',
            numberPrecision: 2
          }}
          onValueFormattersChange={() => {}} // No-op for read-only
          isReadOnly={true}
          title="Value Formatters"
        />
      </VStack>
    );
  };

  // Step content renderers
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Source step
        return (
          <VStack spacing={6} align="stretch">
            {availableTypes.length === 0 && (
              <Alert status="warning">
                <AlertIcon />
                No extension types available for current data type ({currentDataType})
              </Alert>
            )}
            
            {renderWorkflowSelector()}
            <Divider />
            {renderWorkflowSpecificFields()}
          </VStack>
        );
      
      case 1: // Overview step
        return (
          <VStack spacing={6} align="stretch">
            {formData.type === 'platform-extension' && renderPlatformFields()}
          </VStack>
        );
      
      case 2: // Settings step
        return (
          <VStack spacing={6} align="stretch">
            {formData.type === 'platform-extension' && (
              <>
                {formData.workflow === 'link-existing' ? (
                  // Show read-only summary for link-existing workflow
                  renderReadOnlySyntaxSummary()
                ) : (
                  // Show editable syntax patterns for create workflows
                  <>
                    <SyntaxPatternsEditor
                      syntaxPatterns={formData.syntaxPatterns || {
                        prefix: '',
                        suffix: '',
                        delimiter: '_',
                        capitalization: 'none',
                        formatString: ''
                      }}
                      onSyntaxPatternsChange={(newSyntaxPatterns) => {
                        setFormData(prev => ({
                          ...prev,
                          syntaxPatterns: newSyntaxPatterns
                        }));
                      }}
                      preview={preview}
                      isReadOnly={false}
                      title="Syntax Patterns"
                    />
                    
                    <Divider />
                    
                    <ValueFormattersEditor
                      valueFormatters={formData.valueFormatters || {
                        color: 'hex',
                        dimension: 'px',
                        numberPrecision: 2
                      }}
                      onValueFormattersChange={(newValueFormatters) => {
                        setFormData(prev => ({
                          ...prev,
                          valueFormatters: newValueFormatters
                        }));
                      }}
                      isReadOnly={false}
                      title="Value Formatters"
                    />
                  </>
                )}
              </>
            )}
          </VStack>
        );
      
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="900px">
        <ModalHeader>
          {currentDataType === 'core' ? 'Add Platform' : 'Link Core Repository'}
        </ModalHeader>
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Stepper */}
            <Stepper index={activeStep} orientation="horizontal" gap="0" mb={5}>
              {steps.map((step, index) => (
                <Step key={index}>
                  <StepIndicator>
                    <StepStatus
                      complete={<StepIcon />}
                      incomplete={<StepNumber />}
                      active={<StepNumber />}
                    />
                  </StepIndicator>
                  <Box flexShrink="0">
                    <StepTitle>{step.title}</StepTitle>
                    <StepDescription>{step.description}</StepDescription>
                  </Box>
                  <StepSeparator />
                </Step>
              ))}
            </Stepper>
            
            {/* Step Content */}
            {renderStepContent()}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          {activeStep > 0 && (
            <Button variant="ghost" mr={3} onClick={goToPreviousStep}>
              Previous
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button colorScheme="blue" onClick={goToNextStep}>
              Next
            </Button>
          ) : (
            <Button 
              colorScheme="blue" 
              onClick={handleSave}
              isDisabled={availableTypes.length === 0}
            >
              {getButtonText()}
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 