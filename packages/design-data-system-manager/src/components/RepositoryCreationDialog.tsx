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
  Select,
  VStack,
  HStack,
  Text,
  useToast,
  useColorMode,
  Alert,
  AlertIcon,
  Box,
  Progress,
  Badge
} from '@chakra-ui/react';
import { RepositoryCreationService, RepositoryCreationConfig, CreatedRepository } from '../services/repositoryCreationService';
import { GitHubAuthService } from '../services/githubAuth';
import { GitHubApiService } from '../services/githubApi';
import type { GitHubOrganization } from '../config/github';

export interface RepositoryCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRepositoryCreated: (repository: CreatedRepository) => void;
  schemaType?: 'core' | 'platform-extension' | 'theme-override';
  prefillData?: {
    name?: string;
    description?: string;
    systemId?: string;
    platformId?: string;
    themeId?: string;
  };
}

export const RepositoryCreationDialog: React.FC<RepositoryCreationDialogProps> = ({
  isOpen,
  onClose,
  onRepositoryCreated,
  schemaType = 'platform-extension',
  prefillData = {}
}) => {
  const [formData, setFormData] = useState<RepositoryCreationConfig>({
    name: prefillData.name || '',
    description: prefillData.description || '',
    visibility: 'public',
    organization: '',
    schemaType,
    systemId: prefillData.systemId,
    platformId: prefillData.platformId,
    themeId: prefillData.themeId
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [organizations, setOrganizations] = useState<GitHubOrganization[]>([]);
  const [loading, setLoading] = useState(false);
  const [creationStep, setCreationStep] = useState<'idle' | 'creating' | 'scaffolding' | 'schema' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [createdRepository, setCreatedRepository] = useState<CreatedRepository | null>(null);
  
  const toast = useToast();
  const { colorMode } = useColorMode();

  // Load organizations when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadOrganizations();
      // Reset form data with prefill
      setFormData({
        name: prefillData.name || '',
        description: prefillData.description || '',
        visibility: 'public',
        organization: '',
        schemaType,
        systemId: prefillData.systemId,
        platformId: prefillData.platformId,
        themeId: prefillData.themeId
      });
      setErrors({});
      setCreationStep('idle');
      setProgress(0);
      setCreatedRepository(null);
    }
  }, [isOpen, schemaType, prefillData]);

  const loadOrganizations = async () => {
    try {
      const orgs = await GitHubApiService.getOrganizations();
      setOrganizations(orgs);
      
      // Set default organization to user's personal account
      if (orgs.length > 0) {
        const personalOrg = orgs.find(org => org.type === 'User');
        if (personalOrg) {
          setFormData(prev => ({ ...prev, organization: personalOrg.login }));
        }
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organizations from GitHub.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const validateForm = (): boolean => {
    const validation = RepositoryCreationService.validateConfig(formData);
    
    if (!validation.isValid) {
      const newErrors: Record<string, string> = {};
      validation.errors.forEach(error => {
        if (error.includes('name')) newErrors.name = error;
        if (error.includes('schema type')) newErrors.schemaType = error;
        if (error.includes('visibility')) newErrors.visibility = error;
      });
      setErrors(newErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleCreateRepository = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before creating the repository',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Check authentication
    const user = GitHubAuthService.getCurrentUser();
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please authenticate with GitHub first',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    setLoading(true);
    setCreationStep('creating');
    setProgress(25);

    try {
      // Create repository
      const repository = await RepositoryCreationService.createRepository(formData);
      
      setCreationStep('complete');
      setProgress(100);
      setCreatedRepository(repository);

      toast({
        title: 'Repository Created',
        description: `Successfully created ${repository.name}`,
        status: 'success',
        duration: 5000,
        isClosable: true
      });

      // Call the callback with the created repository
      onRepositoryCreated(repository);
      
    } catch (error) {
      console.error('Repository creation failed:', error);
      
      setCreationStep('idle');
      setProgress(0);
      
      toast({
        title: 'Creation Failed',
        description: error instanceof Error ? error.message : 'Failed to create repository',
        status: 'error',
        duration: 8000,
        isClosable: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return; // Prevent closing during creation
    
    if (createdRepository) {
      // Repository was created successfully, close the dialog
      onClose();
    } else {
      // User is canceling before creation
      onClose();
    }
  };

  const getSchemaTypeDisplayName = (type: string) => {
    switch (type) {
      case 'core': return 'Core Design System';
      case 'platform-extension': return 'Platform Extension';
      case 'theme-override': return 'Theme Override';
      default: return type;
    }
  };

  const renderCreationProgress = () => {
    if (creationStep === 'idle') return null;

    const stepMessages = {
      creating: 'Creating GitHub repository...',
      scaffolding: 'Setting up repository structure...',
      schema: 'Creating initial schema file...',
      complete: 'Repository created successfully!'
    };

    return (
      <VStack spacing={4} align="stretch">
        <Progress value={progress} colorScheme="blue" size="sm" />
        <Text fontSize="sm" textAlign="center">
          {stepMessages[creationStep]}
        </Text>
      </VStack>
    );
  };

  const renderSuccessView = () => {
    if (!createdRepository) return null;

    return (
      <VStack spacing={6} align="stretch">
        <Alert status="success" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">Repository Created Successfully!</Text>
            <Text fontSize="sm">Your new repository is ready to use.</Text>
          </VStack>
        </Alert>

        <Box p={4} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}>
          <VStack align="start" spacing={3}>
            <HStack>
              <Text fontWeight="bold">Repository:</Text>
              <Text fontFamily="mono">{createdRepository.fullName}</Text>
              <Badge colorScheme={createdRepository.visibility === 'public' ? 'green' : 'orange'}>
                {createdRepository.visibility}
              </Badge>
            </HStack>
            
            <HStack>
              <Text fontWeight="bold">Type:</Text>
              <Text>{getSchemaTypeDisplayName(createdRepository.schemaType)}</Text>
            </HStack>
            
            {createdRepository.description && (
              <HStack>
                <Text fontWeight="bold">Description:</Text>
                <Text>{createdRepository.description}</Text>
              </HStack>
            )}
            
            <HStack>
              <Text fontWeight="bold">URL:</Text>
              <Text color="blue.500" cursor="pointer" onClick={() => window.open(createdRepository.htmlUrl, '_blank')}>
                {createdRepository.htmlUrl}
              </Text>
            </HStack>
            
            {createdRepository.initialFilePath && (
              <HStack>
                <Text fontWeight="bold">Initial File:</Text>
                <Text fontFamily="mono">{createdRepository.initialFilePath}</Text>
              </HStack>
            )}
          </VStack>
        </Box>
      </VStack>
    );
  };

  const renderForm = () => {
    if (creationStep === 'complete') return null;

    return (
      <VStack spacing={6} align="stretch">
        {/* Schema Type Display */}
        <Box p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}>
          <HStack justify="space-between">
            <Text fontWeight="bold">Schema Type</Text>
            <Badge colorScheme="blue">{getSchemaTypeDisplayName(schemaType)}</Badge>
          </HStack>
        </Box>

        {/* Repository Name */}
        <FormControl isRequired isInvalid={!!errors.name}>
          <FormLabel>Repository Name</FormLabel>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={`my-${schemaType}`}
            disabled={loading}
          />
          {errors.name && (
            <Text fontSize="sm" color="red.500" mt={1}>{errors.name}</Text>
          )}
        </FormControl>

        {/* Description */}
        <FormControl>
          <FormLabel>Description</FormLabel>
          <Input
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={`Design tokens for ${schemaType}`}
            disabled={loading}
          />
        </FormControl>

        {/* Organization */}
        <FormControl>
          <FormLabel>Organization</FormLabel>
          <Select
            value={formData.organization}
            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
            disabled={loading}
          >
            <option value="">Select organization</option>
            {organizations.map((org) => (
              <option key={org.login} value={org.login}>
                {org.name || org.login} ({org.type})
              </option>
            ))}
          </Select>
        </FormControl>

        {/* Visibility */}
        <FormControl isRequired isInvalid={!!errors.visibility}>
          <FormLabel>Visibility</FormLabel>
          <Select
            value={formData.visibility}
            onChange={(e) => setFormData({ ...formData, visibility: e.target.value as 'public' | 'private' })}
            disabled={loading}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </Select>
          {errors.visibility && (
            <Text fontSize="sm" color="red.500" mt={1}>{errors.visibility}</Text>
          )}
        </FormControl>

        {/* Info Alert */}
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">What will be created:</Text>
            <Text fontSize="sm">• A new GitHub repository with proper directory structure</Text>
            <Text fontSize="sm">• Initial {schemaType} schema file with default configuration</Text>
            <Text fontSize="sm">• README, .gitignore, and other supporting files</Text>
          </VStack>
        </Alert>
      </VStack>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="800px">
        <ModalHeader>
          Create New Repository
        </ModalHeader>
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {renderCreationProgress()}
            {renderSuccessView()}
            {renderForm()}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose} disabled={loading}>
            {createdRepository ? 'Close' : 'Cancel'}
          </Button>
          {!createdRepository && (
            <Button
              colorScheme="blue"
              onClick={handleCreateRepository}
              isLoading={loading}
              loadingText="Creating..."
              disabled={loading}
            >
              Create Repository
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}; 