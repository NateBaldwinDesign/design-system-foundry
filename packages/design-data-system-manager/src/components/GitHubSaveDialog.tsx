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
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Box,
} from '@chakra-ui/react';
import { GitHubSaveService, SaveOptions } from '../services/githubSave';
import { GitHubApiService } from '../services/githubApi';
import type { GitHubBranch } from '../config/github';

interface GitHubSaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  saveMode: 'direct' | 'pullRequest';
  onSuccess?: (result: { success: boolean; message: string; pullRequestUrl?: string }) => void;
  // Branch-based governance props
  currentBranch?: string;
  isEditMode?: boolean;
}

export const GitHubSaveDialog: React.FC<GitHubSaveDialogProps> = ({
  isOpen,
  onClose,
  saveMode,
  onSuccess,
  // Branch-based governance props
  currentBranch = 'main',
  isEditMode = false,
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prDescription, setPrDescription] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [availableBranches, setAvailableBranches] = useState<GitHubBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileSizeWarning, setFileSizeWarning] = useState<{
    warning: boolean;
    error: boolean;
    sizeMB: number;
    message?: string;
  } | null>(null);
  const toast = useToast();

  // Load available branches and set defaults
  useEffect(() => {
    if (isOpen) {
      // Reset form state when dialog opens
      setCommitMessage('');
      setPrTitle('');
      setPrDescription('');
      setTargetBranch('');
      setFileSizeWarning(null);
      
      loadBranches();
      generateDefaultMessages();
      checkFileSize();
    }
  }, [isOpen, saveMode]); // Re-run when saveMode changes

  const loadBranches = async () => {
    try {
      const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
      if (!repoInfo) return;

      const branches = await GitHubApiService.getBranches(repoInfo.fullName);
      setAvailableBranches(branches);
      
      // Set default target branch to main or master
      const defaultBranch = branches.find(b => b.name === 'main' || b.name === 'master') || branches[0];
      if (defaultBranch) {
        setTargetBranch(defaultBranch.name);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load repository branches.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const generateDefaultMessages = () => {
    const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
    if (!repoInfo) return;

    const timestamp = new Date().toLocaleString();
    setCommitMessage(`Update ${repoInfo.filePath} - ${timestamp}`);
    setPrTitle(`Update ${repoInfo.filePath}`);
    setPrDescription(`Update design system data in ${repoInfo.filePath}\n\n- Changes made via Token Model Manager\n- Timestamp: ${timestamp}\n- File type: ${repoInfo.fileType === 'schema' ? 'Core Data' : 'Theme Override'}`);
  };

  const checkFileSize = () => {
    const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
    if (!repoInfo) return;

    const currentData = GitHubSaveService['getCurrentDataForFileType'](repoInfo.fileType);
    const warning = GitHubSaveService.getFileSizeWarning(currentData);
    setFileSizeWarning(warning);
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const options: SaveOptions = {
        message: commitMessage,
        createPullRequest: saveMode === 'pullRequest',
        targetBranch: saveMode === 'pullRequest' ? targetBranch : undefined,
        prTitle: saveMode === 'pullRequest' ? prTitle : undefined,
        prDescription: saveMode === 'pullRequest' ? prDescription : undefined,
      };

      const result = await GitHubSaveService.saveToGitHub(options);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        if (result.pullRequestUrl) {
          // Open pull request in new tab
          window.open(result.pullRequestUrl, '_blank');
        }

        onSuccess?.(result);
        onClose();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to save to GitHub.',
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
    setCommitMessage('');
    setPrTitle('');
    setPrDescription('');
    setTargetBranch('');
    setFileSizeWarning(null);
    onClose();
  };

  const repoInfo = GitHubApiService.getSelectedRepositoryInfo();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {saveMode === 'direct' ? 'Save to GitHub' : 'Create Pull Request'}
        </ModalHeader>
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Repository Info */}
            {repoInfo && (
              <Box p={4} bg="gray.50" borderRadius="md">
                <Text fontWeight="bold">Repository: {repoInfo.fullName}</Text>
                <Text fontWeight="medium" color={isEditMode ? 'blue.600' : 'gray.700'}>
                  Branch: {currentBranch} {isEditMode && '(Editing)'}
                </Text>
                <Text>File: {repoInfo.filePath}</Text>
                <Text>Type: {repoInfo.fileType === 'schema' ? 'Core Data' : 'Theme Override'}</Text>
                {isEditMode && (
                  <Text fontSize="sm" color="blue.600" mt={2}>
                    💡 You&apos;re editing on a feature branch. Changes will be saved to this branch.
                  </Text>
                )}
              </Box>
            )}

            {/* File Size Warning */}
            {fileSizeWarning && (fileSizeWarning.warning || fileSizeWarning.error) && (
              <Alert status={fileSizeWarning.error ? 'error' : 'warning'}>
                <AlertIcon />
                <Box>
                  <AlertTitle>File Size Warning</AlertTitle>
                  <AlertDescription>{fileSizeWarning.message}</AlertDescription>
                </Box>
              </Alert>
            )}

            {/* Commit Message */}
            <FormControl isRequired>
              <FormLabel>Commit Message</FormLabel>
              <Input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe your changes..."
              />
            </FormControl>

            {/* Pull Request Options */}
            {saveMode === 'pullRequest' && (
              <>
                <FormControl isRequired>
                  <FormLabel>Target Branch</FormLabel>
                  <Select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    placeholder="Select target branch"
                  >
                    {availableBranches.map((branch) => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name} {branch.name === repoInfo?.branch && '(Current)'}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Pull Request Title</FormLabel>
                  <Input
                    value={prTitle}
                    onChange={(e) => setPrTitle(e.target.value)}
                    placeholder="Pull request title..."
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Pull Request Description</FormLabel>
                  <Textarea
                    value={prDescription}
                    onChange={(e) => setPrDescription(e.target.value)}
                    placeholder="Describe the changes in this pull request..."
                    rows={6}
                  />
                </FormControl>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={handleClose} isDisabled={loading}>
              Cancel
            </Button>
            <Button
              colorScheme={saveMode === 'direct' ? 'blue' : 'green'}
              onClick={handleSave}
              isLoading={loading}
              loadingText={saveMode === 'direct' ? 'Saving...' : 'Creating PR...'}
              isDisabled={!commitMessage || (saveMode === 'pullRequest' && (!targetBranch || !prTitle))}
            >
              {saveMode === 'direct' ? 'Save to GitHub' : 'Create Pull Request'}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 