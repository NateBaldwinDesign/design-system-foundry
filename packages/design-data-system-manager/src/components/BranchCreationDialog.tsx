import React, { useState, useEffect } from 'react';
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
  FormErrorMessage,
  Text,
  VStack,
  Box,
  useToast,
} from '@chakra-ui/react';
import { GitHubApiService } from '../services/githubApi';
import { validateBranchName, generateSuggestedBranchName } from '../utils/BranchValidationUtils';
import type { GitHubUser } from '../config/github';

interface BranchCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchCreated: (branchName: string, editMode?: boolean, repositoryInfo?: { fullName: string; filePath: string; fileType: string }) => void;
  currentBranch: string;
  repositoryFullName: string;
  githubUser: GitHubUser | null;
  // NEW: Edit mode parameter to indicate if this is for editing
  editMode?: boolean;
  // NEW: Source context information
  sourceContext?: {
    sourceType: 'core' | 'platform-extension' | 'theme-override';
    sourceId: string | null;
    sourceName: string | null;
    platformName?: string;
    themeName?: string;
  };
}

export const BranchCreationDialog: React.FC<BranchCreationDialogProps> = ({
  isOpen,
  onClose,
  onBranchCreated,
  currentBranch,
  repositoryFullName,
  githubUser,
  editMode = false,
  sourceContext,
}) => {
  console.log('[BranchCreationDialog] Props:', {
    currentBranch,
    repositoryFullName,
    isOpen
  });
  const [branchName, setBranchName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [branchExistsError, setBranchExistsError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const toast = useToast();

  // Generate suggested branch name when dialog opens (only once)
  useEffect(() => {
    if (isOpen && githubUser && !hasInitialized) {
      const suggestedName = generateSuggestedBranchName(githubUser.login);
      setBranchName(suggestedName);
      setValidationError(null);
      setBranchExistsError(null);
      setHasInitialized(true);
    }
  }, [isOpen, githubUser, hasInitialized]);

  // Reset initialization flag when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setHasInitialized(false);
    }
  }, [isOpen]);

  // Validate branch name on input change
  useEffect(() => {
    if (branchName) {
      const validation = validateBranchName(branchName);
      if (!validation.isValid) {
        setValidationError(validation.error || 'Invalid branch name');
      } else {
        setValidationError(null);
        // Check if branch exists
        checkBranchExists(branchName);
      }
    } else {
      setValidationError(null);
      setBranchExistsError(null);
    }
  }, [branchName, repositoryFullName]);

  const checkBranchExists = async (name: string) => {
    console.log('[BranchCreationDialog] Checking branch existence:', {
      repositoryFullName,
      branchName: name
    });
    try {
      const exists = await GitHubApiService.branchExists(repositoryFullName, name);
      if (exists) {
        setBranchExistsError(`Branch "${name}" already exists`);
      } else {
        setBranchExistsError(null);
      }
    } catch (error) {
      console.warn('Failed to check branch existence:', error);
      // Don't show error to user, just assume branch doesn't exist
      setBranchExistsError(null);
    }
  };

  const handleCreateBranch = async () => {
    if (!githubUser || !branchName.trim()) {
      return;
    }

    if (!repositoryFullName) {
      toast({
        title: 'No Repository Selected',
        description: 'Please select a repository before creating a branch.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create the branch
      await GitHubApiService.createBranch(repositoryFullName, currentBranch, branchName);
      
      toast({
        title: 'Branch Created',
        description: `Successfully created branch "${branchName}"`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Pass the edit mode intent along with the branch name
      // Determine repository info based on source context or repositoryFullName
      let repositoryInfo: { fullName: string; filePath: string; fileType: string } | undefined;
      
      if (sourceContext) {
        // Use source context to determine file path and type
        repositoryInfo = {
          fullName: repositoryFullName,
          filePath: sourceContext.sourceType === 'core' ? 'schema.json' : 
                   sourceContext.sourceType === 'platform-extension' ? 'platform-extension.json' : 'theme-override.json',
          fileType: sourceContext.sourceType === 'core' ? 'schema' : 
                   sourceContext.sourceType === 'platform-extension' ? 'platform-extension' : 'theme-override'
        };
      } else {
        // Fallback: determine file type from repository name or use default
        // This handles cases where sourceContext might not be available
        const isPlatformRepo = repositoryFullName.toLowerCase().includes('platform');
        const isThemeRepo = repositoryFullName.toLowerCase().includes('theme');
        
        repositoryInfo = {
          fullName: repositoryFullName,
          filePath: isPlatformRepo ? 'platform-extension.json' : 
                   isThemeRepo ? 'theme-override.json' : 'schema.json',
          fileType: isPlatformRepo ? 'platform-extension' : 
                   isThemeRepo ? 'theme-override' : 'schema'
        };
      }
      
      console.log('[BranchCreationDialog] Created repositoryInfo:', repositoryInfo);
      
      onBranchCreated(branchName, editMode, repositoryInfo);
      onClose();
    } catch (error) {
      console.error('Failed to create branch:', error);
      
      let errorMessage = 'Failed to create branch';
      if (error instanceof Error) {
        // Handle specific GitHub API errors
        if (error.message.includes('422')) {
          errorMessage = 'Branch already exists or invalid branch name';
        } else if (error.message.includes('403')) {
          errorMessage = 'You do not have permission to create branches in this repository';
        } else if (error.message.includes('404')) {
          errorMessage = 'Base branch not found or you do not have access to the repository';
        } else if (error.message.includes('Failed to get base branch info')) {
          errorMessage = `Base branch "${currentBranch}" not found in repository "${repositoryFullName}"`;
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Branch Creation Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = branchName.trim() && !validationError && !branchExistsError;

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent>
        <ModalHeader>Create New Branch</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              You&apos;re creating a new branch from <strong>{currentBranch}</strong>
            </Text>
            
            {/* Source Context Information */}
            {sourceContext && (
              <Box p={3} bg="blue.50" borderRadius="md" border="1px solid" borderColor="blue.200">
                <VStack spacing={2} align="stretch">
                  <Text fontSize="sm" fontWeight="medium" color="blue.800">
                    Source Context
                  </Text>
                  <Text fontSize="sm" color="blue.700">
                    <strong>Repository:</strong> {repositoryFullName}
                  </Text>
                  {sourceContext.sourceType === 'core' && (
                    <Text fontSize="sm" color="blue.700">
                      <strong>Editing:</strong> Core Design System
                    </Text>
                  )}
                  {sourceContext.sourceType === 'platform-extension' && sourceContext.platformName && (
                    <Text fontSize="sm" color="blue.700">
                      <strong>Editing:</strong> Platform Extension - {sourceContext.platformName}
                    </Text>
                  )}
                  {sourceContext.sourceType === 'theme-override' && sourceContext.themeName && (
                    <Text fontSize="sm" color="blue.700">
                      <strong>Editing:</strong> Theme Override - {sourceContext.themeName}
                    </Text>
                  )}
                  {sourceContext.sourceType === 'theme-override' && sourceContext.platformName && (
                    <Text fontSize="sm" color="blue.700">
                      <strong>Platform:</strong> {sourceContext.platformName} (read-only)
                    </Text>
                  )}
                </VStack>
              </Box>
            )}
            
            <FormControl isInvalid={!!validationError || !!branchExistsError}>
              <FormLabel>Branch Name</FormLabel>
              <Input
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder={githubUser ? generateSuggestedBranchName(githubUser.login) : 'Enter branch name'}
                isDisabled={isLoading}
              />
              {validationError && (
                <FormErrorMessage>{validationError}</FormErrorMessage>
              )}
              {branchExistsError && (
                <FormErrorMessage>{branchExistsError}</FormErrorMessage>
              )}
            </FormControl>

            <Text fontSize="xs" color="gray.500">
              Branch names cannot contain spaces, special characters, or start/end with certain characters.
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleCreateBranch}
            isLoading={isLoading}
            isDisabled={!isFormValid}
          >
            Create Branch
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 