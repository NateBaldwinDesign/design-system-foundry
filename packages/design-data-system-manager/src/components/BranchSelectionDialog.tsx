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
  Select,
  Text,
  VStack,
  Box,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { GitHubApiService } from '../services/githubApi';
import { BranchCreationDialog } from './BranchCreationDialog';
import type { GitHubUser } from '../config/github';

interface BranchSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchSelected: (branchName: string) => void;
  currentBranch: string;
  repositoryFullName: string;
  githubUser: GitHubUser | null;
  // Source context information
  sourceContext?: {
    sourceType: 'core' | 'platform-extension' | 'theme-override';
    sourceId: string | null;
    sourceName: string | null;
    platformName?: string;
    themeName?: string;
  };
}

export const BranchSelectionDialog: React.FC<BranchSelectionDialogProps> = ({
  isOpen,
  onClose,
  onBranchSelected,
  currentBranch,
  repositoryFullName,
  githubUser,
  sourceContext,
}) => {
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const toast = useToast();

  // Load branches when dialog opens
  useEffect(() => {
    if (isOpen && repositoryFullName) {
      loadBranches();
    }
  }, [isOpen, repositoryFullName]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedBranch('');
      setShowCreateDialog(false);
    }
  }, [isOpen]);

  const loadBranches = async () => {
    if (!repositoryFullName) return;

    setIsLoadingBranches(true);
    try {
      const branchList = await GitHubApiService.getBranches(repositoryFullName);
      // Extract branch names and filter out the current branch, then sort alphabetically
      const filteredBranches = branchList
        .map(branch => branch.name)
        .filter(branchName => branchName !== currentBranch)
        .sort();
      setBranches(filteredBranches);
    } catch (error) {
      console.error('Failed to load branches:', error);
      toast({
        title: 'Failed to Load Branches',
        description: 'Could not load branches from the repository.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoadingBranches(false);
    }
  };

  const handleBranchChange = (value: string) => {
    if (value === 'create-new') {
      setShowCreateDialog(true);
    } else {
      setSelectedBranch(value);
    }
  };

  const handleSelectBranch = () => {
    if (!selectedBranch) {
      toast({
        title: 'No Branch Selected',
        description: 'Please select a branch to edit.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      onBranchSelected(selectedBranch);
      onClose();
    } catch (error) {
      console.error('Failed to select branch:', error);
      toast({
        title: 'Failed to Select Branch',
        description: 'Could not switch to the selected branch.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBranchCreated = (branchName: string) => {
    setShowCreateDialog(false);
    onBranchSelected(branchName);
    onClose();
  };

  const handleCreateDialogClose = () => {
    setShowCreateDialog(false);
  };

  // If showing create dialog, render the branch creation dialog instead
  if (showCreateDialog) {
    return (
      <BranchCreationDialog
        isOpen={showCreateDialog}
        onClose={handleCreateDialogClose}
        onBranchCreated={handleBranchCreated}
        currentBranch={currentBranch}
        repositoryFullName={repositoryFullName}
        githubUser={githubUser}
        sourceContext={sourceContext}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent>
        <ModalHeader>Select Branch to Edit</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Text fontSize="sm" color="gray.600">
              You&apos;re currently on <strong>{currentBranch}</strong>. Select a branch to edit or create a new one.
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
            
            <FormControl>
              <FormLabel>Branch</FormLabel>
              {isLoadingBranches ? (
                <Box p={4} textAlign="center">
                  <Spinner size="sm" mr={2} />
                  <Text fontSize="sm" color="gray.600">Loading branches...</Text>
                </Box>
              ) : (
                <Select
                  value={selectedBranch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  placeholder="Select a branch"
                  isDisabled={isLoading}
                >
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                  <option value="create-new" style={{ fontWeight: 'bold', color: '#3182ce' }}>
                    + Create new branch
                  </option>
                </Select>
              )}
            </FormControl>

            {branches.length === 0 && !isLoadingBranches && (
              <Text fontSize="sm" color="gray.500">
                No other branches found. You can create a new branch to start editing.
              </Text>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSelectBranch}
            isLoading={isLoading}
            isDisabled={!selectedBranch || isLoadingBranches}
          >
            Select
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 