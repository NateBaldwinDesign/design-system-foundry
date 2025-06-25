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
  Select,
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  useToast,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { GitHubApiService, ValidFile } from '../services/githubApi';
import { StorageService } from '../services/storage';
import type { GitHubRepo, GitHubBranch, GitHubOrganization } from '../config/github';

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
  const [selectedOrg, setSelectedOrg] = useState<GitHubOrganization | null>(null);
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [filteredRepositories, setFilteredRepositories] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [validFiles, setValidFiles] = useState<ValidFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ValidFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<'orgs' | 'repos' | 'branches' | 'files' | null>(null);
  const [error, setError] = useState<string>('');
  const toast = useToast();

  // Load organizations and repositories on mount
  useEffect(() => {
    if (isOpen && organizations.length === 0) {
      loadOrganizations();
    }
  }, [isOpen]);

  // Pre-load current selection when dialog opens
  useEffect(() => {
    if (isOpen && organizations.length > 0 && repositories.length > 0) {
      preloadCurrentSelection();
    }
  }, [isOpen, organizations, repositories]);

  const loadOrganizations = async () => {
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
      const orgs = await GitHubApiService.getOrganizations();
      setOrganizations(orgs);
      
      // Auto-select the first organization (usually the user's personal account)
      if (orgs.length > 0) {
        setSelectedOrg(orgs[0]);
        await loadRepositoriesForOrg(orgs[0]);
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
      clearTimeout(loadingTimeout);
      setLoading(false);
      setLoadingStep(null);
    }
  };

  const loadRepositoriesForOrg = async (org: GitHubOrganization) => {
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
      const repos = await GitHubApiService.getRepositories();
      
      // Filter repositories by the selected organization
      const orgRepos = repos.filter(repo => {
        const repoOwner = repo.full_name.split('/')[0];
        return repoOwner === org.login;
      });
      
      setRepositories(repos); // Keep all repos for reference
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

  const preloadCurrentSelection = async () => {
    try {
      // Get current repository info from localStorage
      const repoInfoStr = localStorage.getItem('github_selected_repo');
      if (!repoInfoStr) return;

      const currentRepoInfo = JSON.parse(repoInfoStr);
      
      // Find the current repository in the filtered repositories
      const currentRepo = filteredRepositories.find(r => r.full_name === currentRepoInfo.fullName);
      if (!currentRepo) {
        console.log('Current repository not found in available repositories');
        return;
      }

      // Set the current repository
      setSelectedRepo(currentRepo);
      setError('');

      // Load branches for the current repository
      setLoading(true);
      setLoadingStep('branches');
      
      try {
        const repoBranches = await GitHubApiService.getBranches(currentRepo.full_name);
        setBranches(repoBranches);
        
        // Set the current branch
        const currentBranch = repoBranches.find(b => b.name === currentRepoInfo.branch);
        if (currentBranch) {
          setSelectedBranch(currentBranch.name);
          
          // Load files for the current branch
          setLoadingStep('files');
          const files = await GitHubApiService.scanRepositoryForValidFiles(currentRepo.full_name, currentBranch.name);
          setValidFiles(files);
          
          // Set the current file
          const currentFile = files.find(f => f.path === currentRepoInfo.filePath);
          if (currentFile) {
            setSelectedFile(currentFile);
          } else {
            // Current file not found - show a helpful message
            setError(`Previous file "${currentRepoInfo.filePath}" not found in this branch. Please select a different file.`);
          }
        } else {
          // Current branch not found - show a helpful message
          setError(`Previous branch "${currentRepoInfo.branch}" not found. Please select a different branch.`);
        }
      } catch (error) {
        console.error('Failed to preload current selection:', error);
        setError('Failed to load current selection. Please try again.');
      } finally {
        setLoading(false);
        setLoadingStep(null);
      }
    } catch (error) {
      console.error('Failed to parse current repository info:', error);
    }
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
      
      // Auto-select default branch
      if (repoBranches.length > 0) {
        const defaultBranch = repoBranches.find(b => b.name === repo.default_branch) || repoBranches[0];
        setSelectedBranch(defaultBranch.name);
        
        // Always scan for files when a repository is selected
        // If we had a previous file, try to find a matching file in the new repository
        if (previousFile) {
          await loadAndMatchFiles(repo.full_name, defaultBranch.name, previousFile);
        } else {
          // No previous file, just scan for available files
          await scanRepositoryForFiles(repo.full_name, defaultBranch.name);
        }
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
      setError('Failed to load branches for this repository.');
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
    const previousFile = selectedFile; // Store current file for matching
    
    setSelectedBranch(branchName);
    setValidFiles([]);
    setSelectedFile(null);
    setError('');

    if (!selectedRepo) return;

    // If we had a previous file, try to find a matching file in the new branch
    if (previousFile) {
      await loadAndMatchFiles(selectedRepo.full_name, branchName, previousFile);
    } else {
      // No previous file, just scan for available files
      await scanRepositoryForFiles(selectedRepo.full_name, branchName);
    }
  };

  const loadAndMatchFiles = async (repoFullName: string, branchName: string, previousFile: ValidFile) => {
    try {
      const files = await GitHubApiService.scanRepositoryForValidFiles(repoFullName, branchName);
      setValidFiles(files);
      
      if (files.length > 0) {
        await matchAndSelectFile(files, previousFile);
      }
    } catch (error) {
      console.error('Failed to load and match files:', error);
    }
  };

  const scanRepositoryForFiles = async (repoFullName: string, branchName: string) => {
    setLoading(true);
    setLoadingStep('files');
    
    // Add a timeout to show loading state for better UX
    const loadingTimeout = setTimeout(() => {
      if (loadingStep === 'files') {
        toast({
          title: 'Scanning Repository',
          description: `Scanning ${repoFullName.split('/')[1]} for valid design system files...`,
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
    }, 1000);
    
    try {
      const files = await GitHubApiService.scanRepositoryForValidFiles(repoFullName, branchName);
      setValidFiles(files);
      
      if (files.length === 0) {
        setError('No valid token files found in this repository. Please ensure you have files that match the schema.json or theme-override.json format.');
      }
    } catch (error) {
      console.error('Failed to scan repository:', error);
      setError('Failed to scan repository for valid files.');
      toast({
        title: 'Error',
        description: 'Failed to scan repository for valid files.',
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

  const matchAndSelectFile = async (files: ValidFile[], previousFile: ValidFile) => {
    // First, try to find a file with the exact same name
    const exactMatch = files.find(f => f.name === previousFile.name);
    
    if (exactMatch) {
      setSelectedFile(exactMatch);
      toast({
        title: 'File Matched',
        description: `Found matching file: ${exactMatch.name}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // If no exact name match, try to find files with matching systemId or themeId
    // This requires loading file contents to check for matching IDs
    try {
      // First, get the previous file's systemId or themeId
      let previousSystemId: string | undefined;
      let previousThemeId: string | undefined;
      
      try {
        const previousFileContent = await GitHubApiService.getFileContent(
          selectedRepo!.full_name,
          previousFile.path,
          selectedBranch
        );
        const previousParsedData = JSON.parse(previousFileContent.content);
        previousSystemId = previousParsedData.systemId;
        previousThemeId = previousParsedData.themeId;
      } catch (error) {
        console.error('Failed to get previous file content for ID matching:', error);
      }

      // Now check each file for matching IDs
      for (const file of files) {
        try {
          const fileContent = await GitHubApiService.getFileContent(
            selectedRepo!.full_name,
            file.path,
            selectedBranch
          );
          
          const parsedData = JSON.parse(fileContent.content);
          
          // Check if this file has the same systemId or themeId as the previous file
          if (previousFile.type === 'schema' && file.type === 'schema' && previousSystemId) {
            // For schema files, check systemId
            if (parsedData.systemId === previousSystemId) {
              setSelectedFile(file);
              toast({
                title: 'System Matched',
                description: `Found file with matching system: ${file.name}`,
                status: 'success',
                duration: 3000,
                isClosable: true,
              });
              return;
            }
          } else if (previousFile.type === 'theme-override' && file.type === 'theme-override' && previousThemeId) {
            // For theme override files, check themeId
            if (parsedData.themeId === previousThemeId) {
              setSelectedFile(file);
              toast({
                title: 'Theme Matched',
                description: `Found file with matching theme: ${file.name}`,
                status: 'success',
                duration: 3000,
                isClosable: true,
              });
              return;
            }
          }
        } catch (error) {
          console.error(`Failed to check file ${file.name} for ID matching:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to match files by ID:', error);
    }

    // If no matches found, show a helpful message
    toast({
      title: 'No Matching File Found',
      description: 'No file with the same name or matching ID was found in this branch.',
      status: 'info',
      duration: 4000,
      isClosable: true,
    });
  };

  const handleFileSelect = async () => {
    if (!selectedFile || !selectedRepo || !selectedBranch) return;

    setLoading(true);
    setError('');

    try {
      // Get file content from GitHub
      const fileContent = await GitHubApiService.getFileContent(
        selectedRepo.full_name,
        selectedFile.path,
        selectedBranch
      );

      // Content is already decoded by the API service
      const parsedData = JSON.parse(fileContent.content);

      // Store selected repository info for future use
      const repoInfo = {
        fullName: selectedRepo.full_name,
        branch: selectedBranch,
        filePath: selectedFile.path,
        fileType: selectedFile.type,
      };
      localStorage.setItem('github_selected_repo', JSON.stringify(repoInfo));

      // Load data into local storage based on file type
      if (selectedFile.type === 'schema') {
        // Load as core data
        StorageService.setCollections(parsedData.tokenCollections || []);
        StorageService.setDimensions(parsedData.dimensions || []);
        StorageService.setTokens(parsedData.tokens || []);
        StorageService.setPlatforms(parsedData.platforms || []);
        StorageService.setThemes(parsedData.themes || []);
        StorageService.setTaxonomies(parsedData.taxonomies || []);
        StorageService.setValueTypes(parsedData.resolvedValueTypes || []);
      } else if (selectedFile.type === 'theme-override') {
        // Load as theme override
        // This would need to be handled by the theme override system
        console.log('Theme override data loaded:', parsedData);
      }

      // Refresh the App data to update the UI
      const refreshAppData = (window as Window & { refreshAppData?: () => void }).refreshAppData;
      if (refreshAppData) {
        refreshAppData();
      }

      toast({
        title: 'File Loaded Successfully',
        description: `Loaded ${selectedFile.name} from ${selectedRepo.full_name}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onFileSelected(parsedData, selectedFile.type);
      onClose();

    } catch (error) {
      console.error('Failed to load file:', error);
      setError('Failed to load the selected file. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load the selected file from GitHub.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLoading(false);
    setLoadingStep(null);
    setError('');
    setSelectedRepo(null);
    setSelectedBranch('');
    setValidFiles([]);
    setSelectedFile(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Select source file
        </ModalHeader>
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Current Selection Info */}
            {selectedRepo && selectedBranch && selectedFile && (
              <Alert status="info" variant="subtle">
                <AlertIcon />
                <Box>
                  <AlertTitle>Current Selection</AlertTitle>
                  <AlertDescription>
                    Repository: <strong>{selectedRepo.full_name}</strong><br/>
                    Branch: <strong>{selectedBranch}</strong><br/>
                    File: <strong>{selectedFile.name}</strong>
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {/* Pre-loading Indicator */}
            {loading && loadingStep === 'branches' && selectedRepo && (
              <Alert status="info" variant="subtle">
                <AlertIcon />
                <AlertDescription>
                  Loading current selection: {selectedRepo.full_name}...
                </AlertDescription>
              </Alert>
            )}

            {/* Smart Matching Indicator */}
            {loading && loadingStep === 'files' && selectedRepo && selectedBranch && (
              <Alert status="info" variant="subtle">
                <AlertIcon />
                <AlertDescription>
                  Scanning for matching files in {selectedRepo.full_name}/{selectedBranch}...
                </AlertDescription>
              </Alert>
            )}

            {/* Organization Selection */}
            <FormControl isRequired>
              <FormLabel>Organization</FormLabel>
              <Select
                value={selectedOrg?.login || ''}
                onChange={(e) => handleOrgChange(e.target.value)}
                placeholder="Select an organization"
                isDisabled={loading}
              >
                {organizations.map((org) => (
                  <option key={org.login} value={org.login}>
                    {org.name || org.login} ({org.type === 'User' ? 'Personal' : 'Organization'})
                  </option>
                ))}
              </Select>
              {loadingStep === 'orgs' && (
                <HStack mt={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm">Loading organizations...</Text>
                </HStack>
              )}
            </FormControl>

            {/* Repository Selection */}
            <FormControl isRequired isDisabled={!selectedOrg || loading}>
              <FormLabel>Repository</FormLabel>
              <Select
                value={selectedRepo?.full_name || ''}
                onChange={(e) => handleRepoChange(e.target.value)}
                placeholder="Select a repository"
                isDisabled={!selectedOrg || loading}
              >
                {filteredRepositories.map((repo) => (
                  <option key={repo.full_name} value={repo.full_name}>
                    {repo.full_name} {repo.private ? '(Private)' : ''}
                  </option>
                ))}
              </Select>
              {loadingStep === 'repos' && (
                <HStack mt={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm">Loading repositories...</Text>
                </HStack>
              )}
            </FormControl>

            {/* Branch Selection */}
            <FormControl isRequired isDisabled={!selectedRepo || loading}>
              <FormLabel>Branch</FormLabel>
              <Select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                placeholder="Select a branch"
                isDisabled={!selectedRepo || loading}
              >
                {branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </Select>
              {loadingStep === 'branches' && (
                <HStack mt={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm">Loading branches...</Text>
                </HStack>
              )}
            </FormControl>

            {/* File Selection */}
            <FormControl isRequired isDisabled={!selectedBranch || loading}>
              <FormLabel>File</FormLabel>
              <Select
                value={selectedFile?.path || ''}
                onChange={(e) => {
                  const file = validFiles.find(f => f.path === e.target.value);
                  setSelectedFile(file || null);
                }}
                placeholder="Select a file"
                isDisabled={!selectedBranch || loading}
              >
                {validFiles.map((file) => (
                  <option key={file.path} value={file.path}>
                    {file.name} ({file.type === 'schema' ? 'Core Data' : 'Theme Override'})
                  </option>
                ))}
              </Select>
              {loadingStep === 'files' && (
                <HStack mt={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm">Scanning for valid files...</Text>
                </HStack>
              )}
            </FormControl>

            {/* Error Display */}
            {error && (
              <Alert status="error">
                <AlertIcon />
                <Box>
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Box>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleFileSelect}
              isDisabled={!selectedFile || loading}
              isLoading={loading}
            >
              Load File
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 