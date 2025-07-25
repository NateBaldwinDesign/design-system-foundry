import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Select,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Badge,
  IconButton,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { LuRefreshCw } from 'react-icons/lu';
import { GitHubApiService, ValidFile } from '../services/githubApi';
import { GitHubCacheService } from '../services/githubCache';
import type { GitHubOrganization, GitHubRepo, GitHubBranch } from '../config/github';

interface GitHubRepoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelected: (fileContent: Record<string, unknown>, fileType: 'schema' | 'theme-override') => void;
}

export const GitHubRepoSelector: React.FC<GitHubRepoSelectorProps> = ({
  isOpen,
  onClose,
  onFileSelected,
}) => {
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

  const toast = useToast();

  // Update cache stats when modal opens
  useEffect(() => {
    if (isOpen) {
      setCacheStats(GitHubCacheService.getCacheStats());
    }
  }, [isOpen]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && organizations.length === 0) {
      loadOrganizations();
    }
  }, [isOpen, organizations]);

  // Auto-select the first file when validFiles changes and no file is selected
  React.useEffect(() => {
    if (validFiles.length > 0 && !selectedFile) {
      setSelectedFile(validFiles[0]);
    }
  }, [validFiles, selectedFile]);

  const loadOrganizations = async (forceRefresh = false) => {
    setLoading(true);
    setLoadingStep('orgs');
    setError('');
    
    // Add a timeout to show loading state for better UX
    const loadingTimeout = setTimeout(() => {
      if (loadingStep === 'orgs') {
        toast({
          title: 'Loading Organizations',
          description: 'Fetching your GitHub organizations and repositories...',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    }, 1000);
    
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
      clearTimeout(loadingTimeout);
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const loadRepositoriesForOrg = async (org: GitHubOrganization, forceRefresh = false) => {
    setLoading(true);
    setLoadingStep('repos');
    setError('');
    
    // Add a timeout to show loading state for better UX
    const loadingTimeout = setTimeout(() => {
      if (loadingStep === 'repos') {
        toast({
          title: 'Loading Repositories',
          description: `Fetching repositories for ${org.name || org.login}...`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    }, 1000);
    
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
      clearTimeout(loadingTimeout);
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

    const previousFile = selectedFile; // Store current file for matching

    setSelectedRepo(repo);
    setSelectedBranch('');
    setValidFiles([]);
    setSelectedFile(null);
    setError('');

    // Load branches for selected repository
    setLoading(true);
    setLoadingStep('branches');
    
    // Add a timeout to show loading state for better UX
    const loadingTimeout = setTimeout(() => {
      if (loadingStep === 'branches') {
        toast({
          title: 'Loading Branches',
          description: `Fetching branches for ${repo.name}...`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    }, 1000);
    
    try {
      const repoBranches = await GitHubApiService.getBranches(repo.full_name);
      setBranches(repoBranches);
      
      // Auto-select "main" branch if it exists
      const mainBranch = repoBranches.find(branch => branch.name === 'main');
      if (mainBranch) {
        setSelectedBranch('main');
        // Automatically trigger file loading for main branch
        await loadAndMatchFiles(repo.full_name, 'main', previousFile);
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
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const handleBranchChange = async (branchName: string) => {
    if (!selectedRepo) return;

    const previousFile = selectedFile; // Store current file for matching

    setSelectedBranch(branchName);
    setValidFiles([]);
    setSelectedFile(null);
    setError('');

    await loadAndMatchFiles(selectedRepo.full_name, branchName, previousFile);
  };

  const loadAndMatchFiles = async (repoFullName: string, branchName: string, previousFile: ValidFile | null) => {
    setLoading(true);
    setLoadingStep('files');
    
    try {
      const files = await GitHubApiService.scanRepositoryForValidFiles(repoFullName, branchName);
      setValidFiles(files);
      
      // Try to match and select the previous file
      if (previousFile) {
        await matchAndSelectFile(files, previousFile);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const matchAndSelectFile = async (files: ValidFile[], previousFile: ValidFile) => {
    // Try to find a file with the same name and type
    const matchedFile = files.find(file => 
      file.name === previousFile.name && file.type === previousFile.type
    );
    
    if (matchedFile) {
      setSelectedFile(matchedFile);
      toast({
        title: 'File Matched',
        description: `Automatically selected ${matchedFile.name} (${matchedFile.type})`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      // Try to find any file of the same type
      const sameTypeFile = files.find(file => file.type === previousFile.type);
      if (sameTypeFile) {
        setSelectedFile(sameTypeFile);
        toast({
          title: 'Similar File Found',
          description: `Selected ${sameTypeFile.name} (${sameTypeFile.type}) - different from previous selection`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleFileSelect = async () => {
    if (!selectedRepo || !selectedBranch || !selectedFile) {
      toast({
        title: 'Missing Selection',
        description: 'Please select a repository, branch, and file.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    
    try {
      // Get file content
      const fileData = await GitHubApiService.getFileContent(
        selectedRepo.full_name,
        selectedFile.path,
        selectedBranch
      );
      
      // Parse JSON content
      let fileContent: Record<string, unknown>;
      try {
        fileContent = JSON.parse(fileData.content);
      } catch (parseError) {
        throw new Error('Invalid JSON file');
      }
      
      // Store selection in localStorage for future use
      const repoInfo = {
        fullName: selectedRepo.full_name,
        branch: selectedBranch,
        filePath: selectedFile.path,
        fileType: selectedFile.type,
      };
      localStorage.setItem('github_selected_repo', JSON.stringify(repoInfo));
      
      // Call the callback with the file content
      // Type guard to ensure we only pass valid file types for this component
      if (selectedFile.type === 'schema' || selectedFile.type === 'theme-override') {
        onFileSelected(fileContent, selectedFile.type);
      } else {
        throw new Error(`Unsupported file type: ${selectedFile.type}`);
      }
      
      toast({
        title: 'File Loaded',
        description: `Successfully loaded ${selectedFile.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      handleClose();
    } catch (error) {
      console.error('Failed to load file:', error);
      setError('Failed to load file. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load file from GitHub.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
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

  const handleClose = () => {
    setError('');
    setLoading(false);
    setLoadingStep(null);
    onClose();
  };

  const getCacheStatusText = () => {
    if (!cacheStats) return 'Unknown';
    
    if (cacheStats.validEntries === 0) return 'No cached data';
    if (cacheStats.expiredEntries > 0) return `${cacheStats.validEntries} valid, ${cacheStats.expiredEntries} expired`;
    return `${cacheStats.validEntries} cached items`;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack justify="space-between" align="center" pr={6}>
            <Text>Select GitHub Repository</Text>
            <HStack spacing={2}>
              {cacheStats && (
                <Badge colorScheme={cacheStats.validEntries > 0 ? 'green' : 'gray'} variant="subtle">
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
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={4} align="stretch">
            {error && (
              <Alert status="error">
                <AlertIcon />
                <Box>
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Box>
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
                onChange={(e) => {
                  const file = validFiles.find(f => f.path === e.target.value);
                  setSelectedFile(file || null);
                }}
                isDisabled={loading || !selectedBranch}
                placeholder="Select file"
              >
                {validFiles.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.name} ({file.type})
                  </option>
                ))}
              </Select>
            </Box>

            {/* Loading Indicator */}
            {loading && (
              <HStack justify="center" py={4}>
                <Spinner />
                <Text>
                  {loadingStep === 'orgs' && 'Loading organizations...'}
                  {loadingStep === 'repos' && 'Loading repositories...'}
                  {loadingStep === 'branches' && 'Loading branches...'}
                  {loadingStep === 'files' && 'Scanning files...'}
                </Text>
              </HStack>
            )}

            {/* Action Buttons */}
            <HStack justify="flex-end" pt={4}>
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleFileSelect}
                isLoading={loading}
                isDisabled={!selectedFile}
              >
                Load File
              </Button>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}; 