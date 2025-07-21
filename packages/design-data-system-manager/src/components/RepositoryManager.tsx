import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, RefreshIcon } from '@chakra-ui/icons';

interface RepositoryLink {
  id: string;
  type: 'core' | 'platform-extension' | 'theme-override';
  repositoryUri: string;
  branch: string;
  filePath: string;
  platformId?: string;
  themeId?: string;
  lastSync?: string;
  status: 'linked' | 'loading' | 'error' | 'synced';
  error?: string;
}

interface RepositoryManagerProps {
  linkedRepositories: RepositoryLink[];
  onLinkRepository: (link: Omit<RepositoryLink, 'id' | 'status' | 'lastSync'>) => Promise<void>;
  onUnlinkRepository: (linkId: string) => void;
  onRefreshRepository: (linkId: string) => Promise<void>;
}

export const RepositoryManager: React.FC<RepositoryManagerProps> = ({
  linkedRepositories,
  onLinkRepository,
  onUnlinkRepository,
  onRefreshRepository
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'core' as RepositoryLink['type'],
    repositoryUri: '',
    branch: 'main',
    filePath: '',
    platformId: '',
    themeId: ''
  });

  const handleLinkRepository = async () => {
    setIsLinking(true);
    setLinkError(null);

    try {
      await onLinkRepository({
        type: formData.type,
        repositoryUri: formData.repositoryUri,
        branch: formData.branch,
        filePath: formData.filePath,
        platformId: formData.platformId || undefined,
        themeId: formData.themeId || undefined
      });

      // Reset form
      setFormData({
        type: 'core',
        repositoryUri: '',
        branch: 'main',
        filePath: '',
        platformId: '',
        themeId: ''
      });
      onClose();
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Failed to link repository');
    } finally {
      setIsLinking(false);
    }
  };

  const getStatusColor = (status: RepositoryLink['status']) => {
    switch (status) {
      case 'synced': return 'green';
      case 'loading': return 'blue';
      case 'error': return 'red';
      case 'linked': return 'yellow';
      default: return 'gray';
    }
  };

  const getStatusText = (status: RepositoryLink['status']) => {
    switch (status) {
      case 'synced': return 'Synced';
      case 'loading': return 'Loading';
      case 'error': return 'Error';
      case 'linked': return 'Linked';
      default: return 'Unknown';
    }
  };

  const getTypeDisplayName = (type: RepositoryLink['type']) => {
    switch (type) {
      case 'core': return 'Core Data';
      case 'platform-extension': return 'Platform Extension';
      case 'theme-override': return 'Theme Override';
      default: return type;
    }
  };

  const getFileTypeHint = (type: RepositoryLink['type']) => {
    switch (type) {
      case 'core': return 'schema.json';
      case 'platform-extension': return 'platform-extension.json';
      case 'theme-override': return 'theme-overrides.json';
      default: return '';
    }
  };

  return (
    <Box>
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Heading size="md">Repository Management</Heading>
            <Button
              leftIcon={<AddIcon />}
              colorScheme="blue"
              onClick={onOpen}
            >
              Link Repository
            </Button>
          </HStack>
        </CardHeader>
        <CardBody>
          {linkedRepositories.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Text color="gray.500" mb={4}>
                No repositories linked yet. Link your first repository to get started.
              </Text>
              <Button
                leftIcon={<AddIcon />}
                colorScheme="blue"
                onClick={onOpen}
              >
                Link Repository
              </Button>
            </Box>
          ) : (
            <VStack spacing={4} align="stretch">
              {linkedRepositories.map((link) => (
                <Card key={link.id} variant="outline">
                  <CardBody>
                    <HStack justify="space-between">
                      <VStack align="start" spacing={2} flex={1}>
                        <HStack>
                          <Badge colorScheme={getStatusColor(link.status)}>
                            {getStatusText(link.status)}
                          </Badge>
                          <Badge variant="outline">
                            {getTypeDisplayName(link.type)}
                          </Badge>
                          {link.platformId && (
                            <Badge variant="outline" colorScheme="purple">
                              {link.platformId}
                            </Badge>
                          )}
                          {link.themeId && (
                            <Badge variant="outline" colorScheme="orange">
                              {link.themeId}
                            </Badge>
                          )}
                        </HStack>
                        
                        <Text fontWeight="medium">
                          {link.repositoryUri}
                        </Text>
                        
                        <Text fontSize="sm" color="gray.600">
                          {link.branch} • {link.filePath}
                        </Text>
                        
                        {link.lastSync && (
                          <Text fontSize="xs" color="gray.500">
                            Last synced: {new Date(link.lastSync).toLocaleString()}
                          </Text>
                        )}
                        
                        {link.error && (
                          <Alert status="error" size="sm">
                            <AlertIcon />
                            {link.error}
                          </Alert>
                        )}
                      </VStack>
                      
                      <HStack spacing={2}>
                        <IconButton
                          aria-label="Refresh repository"
                          icon={<RefreshIcon />}
                          size="sm"
                          variant="ghost"
                          isLoading={link.status === 'loading'}
                          onClick={() => onRefreshRepository(link.id)}
                        />
                        <IconButton
                          aria-label="Unlink repository"
                          icon={<DeleteIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => onUnlinkRepository(link.id)}
                        />
                      </HStack>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          )}
        </CardBody>
      </Card>

      {/* Link Repository Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Link Repository</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Repository Type</FormLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as RepositoryLink['type'] })}
                >
                  <option value="core">Core Data</option>
                  <option value="platform-extension">Platform Extension</option>
                  <option value="theme-override">Theme Override</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Repository URI</FormLabel>
                <Input
                  placeholder="owner/repository"
                  value={formData.repositoryUri}
                  onChange={(e) => setFormData({ ...formData, repositoryUri: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Branch</FormLabel>
                <Input
                  placeholder="main"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>File Path</FormLabel>
                <Input
                  placeholder={getFileTypeHint(formData.type)}
                  value={formData.filePath}
                  onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                />
              </FormControl>

              {formData.type === 'platform-extension' && (
                <FormControl isRequired>
                  <FormLabel>Platform ID</FormLabel>
                  <Input
                    placeholder="platform-ios"
                    value={formData.platformId}
                    onChange={(e) => setFormData({ ...formData, platformId: e.target.value })}
                  />
                </FormControl>
              )}

              {formData.type === 'theme-override' && (
                <FormControl>
                  <FormLabel>Theme ID (Optional)</FormLabel>
                  <Input
                    placeholder="brand-a"
                    value={formData.themeId}
                    onChange={(e) => setFormData({ ...formData, themeId: e.target.value })}
                  />
                </FormControl>
              )}

              {linkError && (
                <Alert status="error">
                  <AlertIcon />
                  {linkError}
                </Alert>
              )}

              <HStack spacing={3} w="full" justify="flex-end">
                <Button onClick={onClose}>Cancel</Button>
                <Button
                  colorScheme="blue"
                  onClick={handleLinkRepository}
                  isLoading={isLinking}
                  loadingText="Linking..."
                >
                  Link Repository
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}; 