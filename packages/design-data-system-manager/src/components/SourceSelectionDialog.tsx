import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  useToast,
  Radio,
  RadioGroup,
  Stack,
  Icon,
  useColorMode,
  Alert,
  AlertIcon,
  Box
} from '@chakra-ui/react';
import { LuLink, LuFileText, LuGitBranch } from 'react-icons/lu';
import { GitHubApiService, ValidFile } from '../services/githubApi';
import { GitHubCacheService } from '../services/githubCache';
import type { GitHubOrganization, GitHubRepo, GitHubBranch } from '../config/github';
import { RepositoryCreationDialog } from './RepositoryCreationDialog';
import type { CreatedRepository } from '../services/repositoryCreationService';

export interface SourceSelectionData {
  workflow: 'link-existing' | 'create-file' | 'create-repository';
  repositoryUri?: string;
  branch?: string;
  filePath?: string;
  newFileName?: string;
  newRepositoryName?: string;
  newRepositoryDescription?: string;
  newRepositoryVisibility?: 'public' | 'private';
}

interface SourceSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSourceSelected: (data: SourceSelectionData) => void;
  schemaType: string; // 'core', 'platform-extension', 'theme-override'
}

export const SourceSelectionDialog: React.FC<SourceSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSourceSelected,
  schemaType
}) => {
  const [workflow, setWorkflow] = useState<'link-existing' | 'create-file' | 'create-repository'>('link-existing');
  const [formData, setFormData] = useState<SourceSelectionData>({
    workflow: 'link-existing',
    repositoryUri: '',
    branch: 'main',
    filePath: '',
    newFileName: `${schemaType}.json`,
    newRepositoryName: '',
    newRepositoryDescription: '',
    newRepositoryVisibility: 'public'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();
  const { colorMode } = useColorMode();

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
  
  // Repository creation state
  const [isRepositoryCreationOpen, setIsRepositoryCreationOpen] = useState(false);

  // Get current system ID from storage
  const getCurrentSystemId = (): string => {
    // Import StorageService dynamically to avoid circular dependencies
    const StorageService = require('../services/storage').StorageService;
    const rootData = StorageService.getRootData();
    return rootData.systemId || 'system-default';
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setWorkflow('link-existing');
      setFormData({
        workflow: 'link-existing',
        repositoryUri: '',
        branch: 'main',
        filePath: '',
        newFileName: `${schemaType}.json`,
        newRepositoryName: '',
        newRepositoryDescription: '',
        newRepositoryVisibility: 'public'
      });
      setErrors({});
      setError('');
      
      // Load GitHub organizations for repository selection
      if (organizations.length === 0) {
        loadOrganizations();
      }
    }
  }, [isOpen, schemaType]);

  // GitHub repository loading functions (reused from ExtensionCreateDialog)
  const loadOrganizations = async (forceRefresh = false) => {
    setLoading(true);
    setLoadingStep('orgs');
    setError('');
    
    try {
      if (forceRefresh) {
        GitHubCacheService.clearAll();
      }

      const orgs = await GitHubApiService.getOrganizations();
      setOrganizations(orgs);
      
      if (orgs.length > 0) {
        setSelectedOrg(orgs[0]);
        await loadRepositoriesForOrg(orgs[0], forceRefresh);
      }
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
      if (forceRefresh) {
        GitHubCacheService.clearAll();
      }

      const repos = await GitHubApiService.getRepositories();
      const orgRepos = repos.filter(repo => {
        const repoOwner = repo.full_name.split('/')[0];
        return repoOwner === org.login;
      });
      
      setFilteredRepositories(orgRepos);
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
  };

  const handleRepoChange = async (repoFullName: string) => {
    const repo = filteredRepositories.find(r => r.full_name === repoFullName);
    if (!repo) return;

    setSelectedRepo(repo);
    setSelectedBranch('');
    setValidFiles([]);
    setSelectedFile(null);
    setError('');

    setLoading(true);
    setLoadingStep('branches');
    
    try {
      const repoBranches = await GitHubApiService.getBranches(repo.full_name);
      setBranches(repoBranches);
      
      const mainBranch = repoBranches.find(branch => branch.name === 'main');
      if (mainBranch) {
        setSelectedBranch('main');
        await loadAndMatchFiles(repo.full_name, 'main');
      }
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
  };

  const loadAndMatchFiles = async (repoFullName: string, branchName: string) => {
    setLoading(true);
    setLoadingStep('files');
    
    try {
      const currentSystemId = getCurrentSystemId();
      
      const files = await GitHubApiService.scanRepositoryForValidFiles(
        repoFullName, 
        branchName,
        schemaType === 'platform-extension' ? currentSystemId : undefined
      );
      
      const expectedFileType = schemaType === 'platform-extension' ? 'platform-extension' : 'schema';
      const filteredFiles = files.filter(file => file.type === expectedFileType);
      
      setValidFiles(filteredFiles);
      
      if (filteredFiles.length > 0) {
        setSelectedFile(filteredFiles[0]);
        setFormData(prev => ({
          ...prev,
          repositoryUri: repoFullName,
          branch: branchName,
          filePath: filteredFiles[0].path
        }));
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const handleFileSelect = (filePath: string) => {
    const file = validFiles.find(f => f.path === filePath);
    setSelectedFile(file || null);
    
    if (file) {
      setFormData(prev => ({
        ...prev,
        filePath: file.path
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (workflow) {
      case 'link-existing':
        if (!formData.repositoryUri?.trim()) {
          newErrors.repositoryUri = 'Repository URI is required';
        }
        if (!formData.branch?.trim()) {
          newErrors.branch = 'Branch is required';
        }
        if (!formData.filePath?.trim()) {
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before continuing',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    const finalData: SourceSelectionData = {
      workflow,
      repositoryUri: formData.repositoryUri,
      branch: formData.branch,
      filePath: formData.filePath,
      newFileName: formData.newFileName,
      newRepositoryName: formData.newRepositoryName,
      newRepositoryDescription: formData.newRepositoryDescription,
      newRepositoryVisibility: formData.newRepositoryVisibility
    };

    onSourceSelected(finalData);
    onClose();
  };

  const handleCreateRepository = () => {
    setIsRepositoryCreationOpen(true);
  };

  const handleRepositoryCreated = (repository: CreatedRepository) => {
    // Update form data with the created repository information
    setFormData(prev => ({
      ...prev,
      repositoryUri: repository.fullName,
      branch: repository.defaultBranch,
      filePath: repository.initialFilePath || `${schemaType}.json`,
      newRepositoryName: repository.name,
      newRepositoryDescription: repository.description || ''
    }));

    // Set workflow to link-existing since we now have a repository to link to
    setWorkflow('link-existing');

    toast({
      title: 'Repository Created',
      description: `Successfully created ${repository.name}. You can now link to it.`,
      status: 'success',
      duration: 5000,
      isClosable: true
    });
  };

  const renderWorkflowSelector = () => (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        Select new source
      </Text>
      
      <RadioGroup value={workflow} onChange={(value) => {
        const newWorkflow = value as SourceSelectionData['workflow'];
        setWorkflow(newWorkflow);
        setFormData(prev => ({ ...prev, workflow: newWorkflow }));
      }}>
        <Stack spacing={3}>
          <Radio value="link-existing">
            <HStack spacing={2}>
              <Icon as={LuLink} />
              <VStack align="start" spacing={0}>
                <Text fontWeight="medium">Link Existing {schemaType === 'platform-extension' ? 'Platform Extension' : schemaType}</Text>
                <Text fontSize="sm" color="gray.500">Connect to an existing repository</Text>
              </VStack>
            </HStack>
          </Radio>
          
          <Radio value="create-file">
            <HStack spacing={2}>
              <Icon as={LuFileText} />
              <VStack align="start" spacing={0}>
                <Text fontWeight="medium">Create {schemaType === 'platform-extension' ? 'Platform Extension' : schemaType} File</Text>
                <Text fontSize="sm" color="gray.500">Create a new file in the current repository</Text>
              </VStack>
            </HStack>
          </Radio>
          
          <Radio value="create-repository">
            <HStack spacing={2}>
              <Icon as={LuGitBranch} />
              <VStack align="start" spacing={0}>
                <Text fontWeight="medium">Create New Repository</Text>
                <Text fontSize="sm" color="gray.500">Create a new repository with scaffolded structure</Text>
              </VStack>
            </HStack>
          </Radio>
          
          {workflow === 'create-repository' && (
            <Button
              size="sm"
              colorScheme="blue"
              variant="outline"
              onClick={handleCreateRepository}
              ml={6}
            >
              Create Repository
            </Button>
          )}
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
        <select
          value={selectedOrg?.login || ''}
          onChange={(e) => handleOrgChange(e.target.value)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: colorMode === 'dark' ? '#2d3748' : 'white',
            color: colorMode === 'dark' ? 'white' : 'black'
          }}
        >
          <option value="">Select organization</option>
          {organizations.map((org) => (
            <option key={org.login} value={org.login}>
              {org.name || org.login}
            </option>
          ))}
        </select>
      </Box>

      {/* Repository Selection */}
      <Box>
        <Text fontWeight="medium" mb={2}>Repository</Text>
        <select
          value={selectedRepo?.full_name || ''}
          onChange={(e) => handleRepoChange(e.target.value)}
          disabled={loading || !selectedOrg}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: colorMode === 'dark' ? '#2d3748' : 'white',
            color: colorMode === 'dark' ? 'white' : 'black'
          }}
        >
          <option value="">Select repository</option>
          {filteredRepositories.map((repo) => (
            <option key={repo.full_name} value={repo.full_name}>
              {repo.name}
            </option>
          ))}
        </select>
      </Box>

      {/* Branch Selection */}
      <Box>
        <Text fontWeight="medium" mb={2}>Branch</Text>
        <select
          value={selectedBranch}
          onChange={(e) => handleBranchChange(e.target.value)}
          disabled={loading || !selectedRepo}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: colorMode === 'dark' ? '#2d3748' : 'white',
            color: colorMode === 'dark' ? 'white' : 'black'
          }}
        >
          <option value="">Select branch</option>
          {branches.map((branch) => (
            <option key={branch.name} value={branch.name}>
              {branch.name}
            </option>
          ))}
        </select>
      </Box>

      {/* File Selection */}
      <Box>
        <Text fontWeight="medium" mb={2}>File</Text>
        <select
          value={selectedFile?.path || ''}
          onChange={(e) => handleFileSelect(e.target.value)}
          disabled={loading || !selectedBranch}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: colorMode === 'dark' ? '#2d3748' : 'white',
            color: colorMode === 'dark' ? 'white' : 'black'
          }}
        >
          <option value="">Select file</option>
          {validFiles.map((file) => (
            <option key={file.path} value={file.path}>
              {file.name} ({file.type})
            </option>
          ))}
        </select>
        {validFiles.length === 0 && selectedBranch && !loading && (
          <Text fontSize="sm" color="gray.500" mt={1}>
            {schemaType === 'platform-extension' 
              ? `No platform extension files found with matching systemId: ${getCurrentSystemId()}`
              : `No ${schemaType} files found in this branch`
            }
          </Text>
        )}
      </Box>

      {/* Loading Indicator */}
      {loading && (
        <HStack justify="center" py={4}>
          <Text fontSize="sm">
            {loadingStep === 'orgs' && 'Loading organizations...'}
            {loadingStep === 'repos' && 'Loading repositories...'}
            {loadingStep === 'branches' && 'Loading branches...'}
            {loadingStep === 'files' && 'Scanning files...'}
          </Text>
        </HStack>
      )}
    </VStack>
  );

  const renderCreateFileFields = () => (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        File Settings
      </Text>
      
      <Box>
        <Text fontWeight="medium" mb={2}>File Name</Text>
        <input
          type="text"
          value={formData.newFileName}
          onChange={(e) => setFormData({ ...formData, newFileName: e.target.value })}
          placeholder={`${schemaType}.json`}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: errors.newFileName ? '1px solid #e53e3e' : '1px solid #e2e8f0',
            backgroundColor: colorMode === 'dark' ? '#2d3748' : 'white',
            color: colorMode === 'dark' ? 'white' : 'black'
          }}
        />
        {errors.newFileName && (
          <Text fontSize="sm" color="red.500" mt={1}>{errors.newFileName}</Text>
        )}
        <Text fontSize="xs" color="gray.500" mt={1}>
          File will be created in the current repository
        </Text>
      </Box>
    </VStack>
  );

  const renderCreateRepositoryFields = () => (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        Repository Settings
      </Text>
      
      <Box>
        <Text fontWeight="medium" mb={2}>Repository Name</Text>
        <input
          type="text"
          value={formData.newRepositoryName}
          onChange={(e) => setFormData({ ...formData, newRepositoryName: e.target.value })}
          placeholder={`my-${schemaType}`}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: errors.newRepositoryName ? '1px solid #e53e3e' : '1px solid #e2e8f0',
            backgroundColor: colorMode === 'dark' ? '#2d3748' : 'white',
            color: colorMode === 'dark' ? 'white' : 'black'
          }}
        />
        {errors.newRepositoryName && (
          <Text fontSize="sm" color="red.500" mt={1}>{errors.newRepositoryName}</Text>
        )}
        <Text fontSize="xs" color="gray.500" mt={1}>
          Repository will be created as: {formData.newRepositoryName ? `${formData.newRepositoryName}` : 'your-org/repo-name'}
        </Text>
      </Box>
      
      <Box>
        <Text fontWeight="medium" mb={2}>Description</Text>
        <input
          type="text"
          value={formData.newRepositoryDescription}
          onChange={(e) => setFormData({ ...formData, newRepositoryDescription: e.target.value })}
          placeholder={`${schemaType === 'platform-extension' ? 'Platform-specific design tokens and overrides' : `${schemaType} design tokens`}`}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: colorMode === 'dark' ? '#2d3748' : 'white',
            color: colorMode === 'dark' ? 'white' : 'black'
          }}
        />
      </Box>
      
      <Box>
        <Text fontWeight="medium" mb={2}>Visibility</Text>
        <select
          value={formData.newRepositoryVisibility}
          onChange={(e) => setFormData({ ...formData, newRepositoryVisibility: e.target.value as 'public' | 'private' })}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: colorMode === 'dark' ? '#2d3748' : 'white',
            color: colorMode === 'dark' ? 'white' : 'black'
          }}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </Box>
      
      <Alert status="info" size="sm">
        <AlertIcon />
        Repository will be scaffolded with proper directory structure and initial {schemaType} file
      </Alert>
    </VStack>
  );

  const renderWorkflowSpecificFields = () => {
    switch (workflow) {
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

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent maxW="800px">
          <ModalHeader>
            Select New Source
          </ModalHeader>
          <ModalBody>
            <VStack spacing={6} align="stretch">
              {renderWorkflowSelector()}
              {renderWorkflowSpecificFields()}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleConfirm}>
              Select Source
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Repository Creation Dialog */}
      <RepositoryCreationDialog
        isOpen={isRepositoryCreationOpen}
        onClose={() => setIsRepositoryCreationOpen(false)}
        onRepositoryCreated={handleRepositoryCreated}
        schemaType={schemaType as 'core' | 'platform-extension' | 'theme-override'}
        prefillData={{
          name: formData.newRepositoryName,
          description: formData.newRepositoryDescription,
          systemId: getCurrentSystemId()
        }}
      />
    </>
  );
}; 