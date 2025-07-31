import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  Avatar,
  IconButton,
  useToast,
  useColorMode,
  Link,
} from '@chakra-ui/react';
import { ExternalLink, Star, GitBranch, Calendar } from 'lucide-react';
import { GitHubSearchService, type SearchResult, type SchemaFile } from '../services/githubSearchService';

interface FindDesignSystemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDesignSystemSelected: (repo: string, filePath: string) => void;
}

export const FindDesignSystemDialog: React.FC<FindDesignSystemDialogProps> = ({
  isOpen,
  onClose,
  onDesignSystemSelected,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ repo: string; file: SchemaFile } | null>(null);

  const toast = useToast();
  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'dark' ? 'gray.800' : 'white';
  const borderColor = colorMode === 'dark' ? 'gray.700' : 'gray.200';

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setUrlInput('');
      setResult(null);
      setError(null);
      setSelectedFile(null);
    }
  }, [isOpen]);

  const handleLoadFromUrl = async () => {
    if (!urlInput.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await GitHubSearchService.searchByUrl(urlInput);
      if (result) {
        setResult(result);
      } else {
        setError('This repository does not have Design System Foundry compliant data');
        setResult(null);
      }
    } catch (error) {
      console.error('URL load failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to load repository');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDesignSystem = () => {
    if (selectedFile) {
      onDesignSystemSelected(selectedFile.repo, selectedFile.file.path);
      onClose();
      
      toast({
        title: 'Design System Loaded',
        description: `Successfully loaded ${selectedFile.file.name} from ${selectedFile.repo}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Load Design System from URL</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* URL Input */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Enter GitHub Repository URL
              </Text>
              <HStack>
                <Input
                  placeholder="https://github.com/owner/repository"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLoadFromUrl()}
                  bg={bgColor}
                />
                <Button
                  onClick={handleLoadFromUrl}
                  isLoading={loading}
                  loadingText="Loading"
                >
                  Load
                </Button>
              </HStack>
              <Text fontSize="xs" color="gray.500" mt={1}>
                Paste a GitHub repository URL to find design system files
              </Text>
            </Box>

            {/* Error Display */}
            {error && (
              <Alert status="error">
                <AlertIcon />
                <Box>
                  <AlertTitle>Load Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Box>
              </Alert>
            )}

            {/* Results */}
            {result && (
              <Box>
                <Text fontSize="sm" color="gray.500" mb={3}>
                  Found design system files
                </Text>
                
                <Box
                  border="1px"
                  borderColor={borderColor}
                  borderRadius="md"
                  p={4}
                  bg={bgColor}
                >
                  {/* Repository Info */}
                  <HStack justify="space-between" mb={3}>
                    <HStack>
                      <Avatar
                        size="sm"
                        src={result.repository.owner.avatar_url}
                        name={result.repository.owner.login}
                      />
                      <Box>
                        <Text fontWeight="bold" fontSize="sm">
                          {result.repository.full_name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {result.repository.description || 'No description'}
                        </Text>
                      </Box>
                    </HStack>
                    
                    <HStack spacing={2}>
                      <Badge
                        colorScheme={result.permissions.canEdit ? 'green' : 'gray'}
                        variant="subtle"
                        fontSize="xs"
                      >
                        {result.permissions.canEdit ? 'Can Edit' : 'View Only'}
                      </Badge>
                      <Link href={result.repository.html_url} isExternal>
                        <IconButton
                          aria-label="View repository"
                          icon={<ExternalLink size={14} />}
                          size="xs"
                          variant="ghost"
                        />
                      </Link>
                    </HStack>
                  </HStack>

                  {/* Repository Stats */}
                  <HStack spacing={4} mb={3} fontSize="xs" color="gray.500">
                    <HStack spacing={1}>
                      <Star size={12} />
                      <Text>{result.repository.stargazers_count}</Text>
                    </HStack>
                    <HStack spacing={1}>
                      <GitBranch size={12} />
                      <Text>{result.repository.forks_count}</Text>
                    </HStack>
                    <HStack spacing={1}>
                      <Calendar size={12} />
                      <Text>{formatDate(result.repository.updated_at)}</Text>
                    </HStack>
                  </HStack>

                  <Divider mb={3} />

                  {/* Schema Files */}
                  <Text fontSize="sm" fontWeight="semibold" mb={2}>
                    Design System Files:
                  </Text>
                  <VStack spacing={2} align="stretch">
                    {result.schemaFiles.map((file) => (
                      <Box
                        key={file.path}
                        border="1px"
                        borderColor={selectedFile?.repo === result.repository.full_name && 
                                    selectedFile?.file.path === file.path ? 'blue.300' : borderColor}
                        borderRadius="md"
                        p={3}
                        cursor="pointer"
                        onClick={() => setSelectedFile({ repo: result.repository.full_name, file })}
                        _hover={{ bg: colorMode === 'dark' ? 'gray.700' : 'gray.50' }}
                      >
                        <HStack justify="space-between">
                          <Box>
                            <Text fontSize="sm" fontWeight="medium">
                              {file.name}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {file.path} • {formatFileSize(file.size)}
                            </Text>
                          </Box>
                          <Text fontSize="xs" color="gray.500">
                            {formatDate(file.lastModified)}
                          </Text>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </Box>
            )}

            {/* Loading State */}
            {loading && (
              <Box textAlign="center" py={8}>
                <Spinner size="lg" />
                <Text mt={2}>Loading repository...</Text>
              </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleLoadDesignSystem}
              isDisabled={!selectedFile}
            >
              Load Design System
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 