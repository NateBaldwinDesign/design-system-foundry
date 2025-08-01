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
  useToast,
} from '@chakra-ui/react';
import { GitHubApiService } from '../services/githubApi';
import { validateBranchName, generateSuggestedBranchName } from '../utils/BranchValidationUtils';
import type { GitHubUser } from '../config/github';

interface BranchCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchCreated: (branchName: string) => void;
  currentBranch: string;
  repositoryFullName: string;
  githubUser: GitHubUser | null;
}

export const BranchCreationDialog: React.FC<BranchCreationDialogProps> = ({
  isOpen,
  onClose,
  onBranchCreated,
  currentBranch,
  repositoryFullName,
  githubUser,
}) => {
  const [branchName, setBranchName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [branchExistsError, setBranchExistsError] = useState<string | null>(null);
  const toast = useToast();

  // Generate suggested branch name when dialog opens
  useEffect(() => {
    if (isOpen && githubUser) {
      const suggestedName = generateSuggestedBranchName(githubUser.login);
      setBranchName(suggestedName);
      setValidationError(null);
      setBranchExistsError(null);
    }
  }, [isOpen, githubUser]);

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

    setIsLoading(true);
    try {
      // Create the branch
      await GitHubApiService.createBranch(repositoryFullName, branchName, currentBranch);
      
      toast({
        title: 'Branch Created',
        description: `Successfully created branch "${branchName}"`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onBranchCreated(branchName);
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
          errorMessage = 'Repository not found or you do not have access';
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