import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Divider,
  Alert,
  AlertIcon,
  Box,
  useColorMode,
  Badge,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@chakra-ui/react';
import { PlatformExtensionValidationService } from '../services/platformExtensionValidation';
import { StorageService } from '../services/storage';
import type { RepositoryLink } from '../services/multiRepositoryManager';
import { SourceSelectionDialog, SourceSelectionData } from './SourceSelectionDialog';

export interface ExtensionEditData {
  type: 'core' | 'platform-extension' | 'theme-override';
  repositoryUri: string;
  branch: string;
  filePath: string;
  platformId?: string;
  themeId?: string;
  // Core schema fields for platformExtensions
  systemId?: string;
  syntaxPatterns?: {
    prefix: string;
    suffix: string;
    delimiter: string;
    capitalization: string;
    formatString: string;
  };
  valueFormatters?: {
    color: string;
    dimension: string;
    numberPrecision: number;
  };
  // Platform management fields
  displayName?: string;
  description?: string;
  // Workflow-specific fields
  workflow: 'link-existing' | 'create-file' | 'create-repository';
  newFileName?: string;
  newRepositoryName?: string;
  newRepositoryDescription?: string;
  newRepositoryVisibility?: 'public' | 'private';
}

interface ExtensionEditDialogProps {
  repository: RepositoryLink;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExtensionEditData) => void;
  onDelete?: (repositoryId: string) => void;
  onDeprecate?: (repositoryId: string) => void;
}

export const ExtensionEditDialog: React.FC<ExtensionEditDialogProps> = ({
  repository,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDeprecate
}) => {
  const [formData, setFormData] = useState<ExtensionEditData>({
    type: repository.type,
    repositoryUri: repository.repositoryUri,
    branch: repository.branch,
    filePath: repository.filePath,
    systemId: '',
    platformId: repository.platformId || '',
    themeId: repository.themeId || '',
    displayName: '',
    description: '',
    workflow: 'link-existing',
    newFileName: 'platform-extension.json',
    newRepositoryName: '',
    newRepositoryDescription: '',
    newRepositoryVisibility: 'public',
    syntaxPatterns: {
      prefix: '',
      suffix: '',
      delimiter: '_',
      capitalization: 'none',
      formatString: ''
    },
    valueFormatters: {
      color: 'hex',
      dimension: 'px',
      numberPrecision: 2
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();
  const { colorMode } = useColorMode();

  // Delete dialog state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteDialogCancelRef = useRef<HTMLButtonElement>(null);

  // Source selection dialog state
  const [isSourceSelectionOpen, setIsSourceSelectionOpen] = useState(false);
  const [isExternalSource, setIsExternalSource] = useState(false);

  // Get current system ID from storage
  const getCurrentSystemId = (): string => {
    const rootData = StorageService.getRootData();
    return rootData.systemId || 'system-default';
  };

  // Use CodeSyntaxService for preview (from PlatformEditorDialog)
  const preview = useMemo(() => {
    if (formData.type !== 'platform-extension') return '';
    
    // Simple preview generation based on syntax patterns
    const { prefix = '', suffix = '', delimiter = '_', capitalization = 'none' } = formData.syntaxPatterns || {};
    let tokenName = 'primary-color-background';
    
    // Apply capitalization
    switch (capitalization) {
      case 'uppercase':
        tokenName = tokenName.toUpperCase();
        break;
      case 'lowercase':
        tokenName = tokenName.toLowerCase();
        break;
      case 'capitalize':
        tokenName = tokenName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
        break;
    }
    
    // Apply delimiter
    if (delimiter) {
      tokenName = tokenName.replace(/-/g, delimiter);
    }
    
    return `${prefix}${tokenName}${suffix}`;
  }, [formData.syntaxPatterns, formData.type]);

  // Reset form when repository changes
  useEffect(() => {
    // Load platform extension data from localStorage if available
    let platformExtensionData: Record<string, unknown> | null = null;
    if (repository.platformId && repository.type === 'platform-extension') {
      platformExtensionData = StorageService.getPlatformExtensionFile(repository.platformId);
    }

    setFormData({
      type: repository.type,
      repositoryUri: repository.repositoryUri,
      branch: repository.branch,
      filePath: repository.filePath,
      systemId: (platformExtensionData?.systemId as string) || getCurrentSystemId(),
      platformId: repository.platformId || '',
      themeId: repository.themeId || '',
      displayName: (platformExtensionData?.metadata as Record<string, unknown>)?.name as string || 
                   (platformExtensionData?.displayName as string) || '',
      description: (platformExtensionData?.metadata as Record<string, unknown>)?.description as string || 
                   (platformExtensionData?.description as string) || '',
      workflow: 'link-existing',
      newFileName: 'platform-extension.json',
      newRepositoryName: '',
      newRepositoryDescription: '',
      newRepositoryVisibility: 'public',
      syntaxPatterns: {
        prefix: (platformExtensionData?.syntaxPatterns as Record<string, unknown>)?.prefix as string || '',
        suffix: (platformExtensionData?.syntaxPatterns as Record<string, unknown>)?.suffix as string || '',
        delimiter: (platformExtensionData?.syntaxPatterns as Record<string, unknown>)?.delimiter as string || '_',
        capitalization: (platformExtensionData?.syntaxPatterns as Record<string, unknown>)?.capitalization as string || 'none',
        formatString: (platformExtensionData?.syntaxPatterns as Record<string, unknown>)?.formatString as string || ''
      },
      valueFormatters: {
        color: (platformExtensionData?.valueFormatters as Record<string, unknown>)?.color as string || 'hex',
        dimension: (platformExtensionData?.valueFormatters as Record<string, unknown>)?.dimension as string || 'px',
        numberPrecision: (platformExtensionData?.valueFormatters as Record<string, unknown>)?.numberPrecision as number || 2
      }
    });
    setErrors({});
  }, [repository]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation for editing
    if (!formData.repositoryUri.trim()) {
      newErrors.repositoryUri = 'Repository URI is required';
    }
    if (!formData.branch.trim()) {
      newErrors.branch = 'Branch is required';
    }
    if (!formData.filePath.trim()) {
      newErrors.filePath = 'File path is required';
    }

    // Type-specific validation
    if (formData.type === 'platform-extension') {
      if (!formData.displayName?.trim()) {
        newErrors.displayName = 'Display name is required for platform extensions';
      }
      // Platform ID validation removed since it's read-only
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    // Validate against schema
    try {
      if (formData.type === 'platform-extension') {
        const extensionData = {
          systemId: formData.systemId,
          platformId: formData.platformId,
          version: '1.0.0',
          syntaxPatterns: formData.syntaxPatterns,
          valueFormatters: formData.valueFormatters
        };
        
        // Validate platform extension data
        const validation = PlatformExtensionValidationService.validatePlatformExtension(extensionData);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
          console.warn('Platform extension warnings:', validation.warnings);
        }
      }
    } catch (error) {
      toast({
        title: 'Schema Validation Error',
        description: error instanceof Error ? error.message : 'Invalid data structure',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    onSave(formData);
    onClose();
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(repository.id);
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

  const handleDeprecate = () => {
    if (onDeprecate) {
      onDeprecate(repository.id);
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

  const handleSelectNewSource = () => {
    setIsSourceSelectionOpen(true);
  };

  const handleSourceSelected = (sourceData: SourceSelectionData) => {
    // Update form data with new source information
    setFormData(prev => ({
      ...prev,
      repositoryUri: sourceData.repositoryUri || prev.repositoryUri,
      branch: sourceData.branch || prev.branch,
      filePath: sourceData.filePath || prev.filePath,
      newFileName: sourceData.newFileName || prev.newFileName,
      newRepositoryName: sourceData.newRepositoryName || prev.newRepositoryName,
      newRepositoryDescription: sourceData.newRepositoryDescription || prev.newRepositoryDescription,
      newRepositoryVisibility: sourceData.newRepositoryVisibility || prev.newRepositoryVisibility,
      workflow: sourceData.workflow
    }));

    // Determine if this is an external source
    const isExternal = sourceData.workflow === 'link-existing' && sourceData.repositoryUri && 
                      sourceData.repositoryUri !== 'local';
    setIsExternalSource(!!isExternal);

    toast({
      title: 'Source Updated',
      description: `Source has been updated to ${sourceData.workflow === 'link-existing' ? 'external repository' : sourceData.workflow === 'create-file' ? 'local file' : 'new repository'}`,
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  const getTypeDisplayName = (type: RepositoryLink['type']) => {
    switch (type) {
      case 'core': return 'Core Data';
      case 'platform-extension': return 'Platform Extension';
      case 'theme-override': return 'Theme Override';
      default: return type;
    }
  };

  const renderSourceSelection = () => (
    <VStack spacing={4} align="stretch">
      <HStack justify="space-between" align="center">
        <Text fontWeight="bold" fontSize="sm" color="gray.600">
          Source Configuration
        </Text>
        <Button
          size="sm"
          colorScheme="blue"
          variant="outline"
          onClick={handleSelectNewSource}
        >
          Select New Source
        </Button>
      </HStack>
      
      {isExternalSource && (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">External Source Detected</Text>
            <Text fontSize="sm">This data comes from an external source file. Most fields are read-only to maintain data integrity.</Text>
            {/* TODO: Add "Switch source to edit settings" functionality */}
          </VStack>
        </Alert>
      )}
    </VStack>
  );

  const renderLinkExistingFields = () => (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        Repository Settings
      </Text>
      
      {Object.keys(errors).length > 0 && (
        <Alert status="error">
          <AlertIcon />
          <Text>Please fix the validation errors below</Text>
        </Alert>
      )}

      <FormControl isRequired isInvalid={!!errors.repositoryUri}>
        <FormLabel>Repository URI</FormLabel>
        {isExternalSource ? (
          <Box
            p={3}
            borderWidth={1}
            borderRadius="md"
            bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
          >
            <Text fontSize="sm" color="gray.500" fontFamily="mono">
              {formData.repositoryUri || 'Not set'}
            </Text>
          </Box>
        ) : (
          <Input
            value={formData.repositoryUri}
            onChange={(e) => setFormData({ ...formData, repositoryUri: e.target.value })}
            placeholder="owner/repository"
          />
        )}
      </FormControl>

      <HStack spacing={4}>
        <FormControl isRequired isInvalid={!!errors.branch}>
          <FormLabel>Branch</FormLabel>
          {isExternalSource ? (
            <Box
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <Text fontSize="sm" color="gray.500" fontFamily="mono">
                {formData.branch || 'Not set'}
              </Text>
            </Box>
          ) : (
            <Input
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              placeholder="main"
            />
          )}
        </FormControl>

        <FormControl isRequired isInvalid={!!errors.filePath}>
          <FormLabel>File Path</FormLabel>
          {isExternalSource ? (
            <Box
              p={3}
              borderWidth={1}
              borderRadius="md"
              bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
              borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
              <Text fontSize="sm" color="gray.500" fontFamily="mono">
                {formData.filePath || 'Not set'}
              </Text>
            </Box>
          ) : (
            <Input
              value={formData.filePath}
              onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
              placeholder="path/to/file.json"
            />
          )}
        </FormControl>
      </HStack>

      {/* Platform ID is now handled in the platform fields section as read-only */}

      {formData.type === 'theme-override' && (
        <FormControl isRequired isInvalid={!!errors.themeId}>
          <FormLabel>Theme ID</FormLabel>
          <Input
            value={formData.themeId || ''}
            onChange={(e) => setFormData({ ...formData, themeId: e.target.value })}
            placeholder="theme-dark"
          />
        </FormControl>
      )}
    </VStack>
  );

  const renderCreateFileFields = () => (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        File Settings
      </Text>
      
      <FormControl isRequired isInvalid={!!errors.newFileName}>
        <FormLabel>File Name</FormLabel>
        <Input
          value={formData.newFileName}
          onChange={(e) => setFormData({ ...formData, newFileName: e.target.value })}
          placeholder="platform-extension.json"
        />
        <Text fontSize="xs" color="gray.500" mt={1}>
          File will be created in the current repository
        </Text>
      </FormControl>
    </VStack>
  );

  const renderCreateRepositoryFields = () => (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        Repository Settings
      </Text>
      
      <FormControl isRequired isInvalid={!!errors.newRepositoryName}>
        <FormLabel>Repository Name</FormLabel>
        <Input
          value={formData.newRepositoryName}
          onChange={(e) => setFormData({ ...formData, newRepositoryName: e.target.value })}
          placeholder="my-platform-extension"
        />
        <Text fontSize="xs" color="gray.500" mt={1}>
          Repository will be created as: {formData.newRepositoryName ? `${formData.newRepositoryName}` : 'your-org/repo-name'}
        </Text>
      </FormControl>
      
      <FormControl>
        <FormLabel>Description</FormLabel>
        <Input
          value={formData.newRepositoryDescription}
          onChange={(e) => setFormData({ ...formData, newRepositoryDescription: e.target.value })}
          placeholder="Platform-specific design tokens and overrides"
        />
      </FormControl>
      
      <FormControl>
        <FormLabel>Visibility</FormLabel>
        <Select
          value={formData.newRepositoryVisibility}
          onChange={(e) => setFormData({ ...formData, newRepositoryVisibility: e.target.value as 'public' | 'private' })}
        >
          <option value="public">Public</option>
          <option value="private">Private</option>
        </Select>
      </FormControl>
      
      <Alert status="info" size="sm">
        <AlertIcon />
        Repository will be scaffolded with proper directory structure and initial platform extension file
      </Alert>
    </VStack>
  );

  const renderPlatformFields = () => {
    return (
      <VStack spacing={4} align="stretch">
        <Text fontWeight="bold" fontSize="sm" color="gray.600">
          Platform Extension Settings
        </Text>
        
        {/* Basic Platform Information */}
        <Box
          p={3}
          borderWidth={1}
          borderRadius="md"
          bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
          borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        >
          <VStack spacing={3} align="stretch">
            <FormControl isRequired isInvalid={!!errors.displayName}>
              <FormLabel>Display Name</FormLabel>
              {isExternalSource ? (
                <Box
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                  <Text fontSize="sm" color="gray.500">
                    {formData.displayName || 'Not set'}
                  </Text>
                </Box>
              ) : (
                <Input
                  value={formData.displayName || ''}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="iOS Platform"
                />
              )}
            </FormControl>
            <FormControl>
              <FormLabel>Description</FormLabel>
              {isExternalSource ? (
                <Box
                  p={3}
                  borderWidth={1}
                  borderRadius="md"
                  bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
                  borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                  <Text fontSize="sm" color="gray.500">
                    {formData.description || 'Not set'}
                  </Text>
                </Box>
              ) : (
                <Input
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Platform-specific extensions for iOS"
                />
              )}
            </FormControl>
          </VStack>
        </Box>

        {/* Platform ID - Read-only display */}
        <Box p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>Platform ID</Text>
          <Text fontSize="sm" color="gray.500" fontFamily="mono">
            {formData.platformId || 'Not set'}
          </Text>
          <Text fontSize="xs" color="gray.400" mt={1}>
            Platform ID cannot be changed after creation
          </Text>
        </Box>
        
        {/* System ID is hidden and auto-populated */}
        <Box p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>System ID</Text>
          <Text fontSize="sm" color="gray.500">
            {formData.systemId || getCurrentSystemId()}
          </Text>
          <Text fontSize="xs" color="gray.400" mt={1}>
            Auto-populated from current system
          </Text>
        </Box>
      </VStack>
    );
  };

  const renderWorkflowSpecificFields = () => {
    switch (formData.workflow) {
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

  const renderSyntaxPatterns = () => (
    <VStack spacing={6} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        Syntax Patterns
      </Text>
      <Box
        p={3}
        borderWidth={1}
        borderRadius="md"
        bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'}
        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
      >
        <HStack spacing={4} align="flex-end">
          <FormControl>
            <FormLabel>Prefix</FormLabel>
            <Input
              value={formData.syntaxPatterns?.prefix || ''}
              onChange={(e) => setFormData({
                ...formData,
                syntaxPatterns: { ...formData.syntaxPatterns!, prefix: e.target.value }
              })}
              placeholder="e.g., TKN_"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Suffix</FormLabel>
            <Input
              value={formData.syntaxPatterns?.suffix || ''}
              onChange={(e) => setFormData({
                ...formData,
                syntaxPatterns: { ...formData.syntaxPatterns!, suffix: e.target.value }
              })}
              placeholder="e.g., _SUF"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Delimiter</FormLabel>
            <Select
              value={formData.syntaxPatterns?.delimiter || '_'}
              onChange={(e) => setFormData({
                ...formData,
                syntaxPatterns: { ...formData.syntaxPatterns!, delimiter: e.target.value }
              })}
            >
              <option value="">None</option>
              <option value="_">Underscore (_)</option>
              <option value="-">Hyphen (-)</option>
              <option value=".">Dot (.)</option>
              <option value="/">Slash (/)</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>Capitalization</FormLabel>
            <Select
              value={formData.syntaxPatterns?.capitalization || 'none'}
              onChange={(e) => setFormData({
                ...formData,
                syntaxPatterns: { ...formData.syntaxPatterns!, capitalization: e.target.value }
              })}
            >
              <option value="none">None</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="capitalize">Capitalize</option>
            </Select>
          </FormControl>
        </HStack>
        <VStack spacing={3} align="stretch" mt={4}>
          <FormControl>
            <FormLabel>Format String</FormLabel>
            <Input
              value={formData.syntaxPatterns?.formatString || ''}
              onChange={(e) => setFormData({
                ...formData,
                syntaxPatterns: { ...formData.syntaxPatterns!, formatString: e.target.value }
              })}
              placeholder="e.g., {prefix}{name}{suffix}"
              width="100%"
            />
          </FormControl>
          <Box mt={2} p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.700' : 'gray.100'}>
            <Text fontSize="sm" color="gray.500" mb={1} fontWeight="bold">Preview</Text>
            <Text fontFamily="mono" fontSize="md" wordBreak="break-all">{preview}</Text>
          </Box>
        </VStack>
      </Box>
    </VStack>
  );

  const renderValueFormatters = () => (
    <VStack spacing={6} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        Value Formatters
      </Text>
      <HStack spacing={4}>
        <FormControl>
          <FormLabel>Color Format</FormLabel>
          <Select
            value={formData.valueFormatters?.color || 'hex'}
            onChange={(e) => setFormData({
              ...formData,
              valueFormatters: { ...formData.valueFormatters!, color: e.target.value }
            })}
          >
            <option value="hex">Hex</option>
            <option value="rgb">RGB</option>
            <option value="rgba">RGBA</option>
            <option value="hsl">HSL</option>
            <option value="hsla">HSLA</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Dimension Unit</FormLabel>
          <Select
            value={formData.valueFormatters?.dimension || 'px'}
            onChange={(e) => setFormData({
              ...formData,
              valueFormatters: { ...formData.valueFormatters!, dimension: e.target.value }
            })}
          >
            <option value="px">px</option>
            <option value="rem">rem</option>
            <option value="em">em</option>
            <option value="pt">pt</option>
            <option value="dp">dp</option>
            <option value="sp">sp</option>
          </Select>
        </FormControl>
      </HStack>
      <FormControl>
        <FormLabel>Number Precision</FormLabel>
        <Input
          type="number"
          min={0}
          max={10}
          value={formData.valueFormatters?.numberPrecision || 2}
          onChange={(e) => setFormData({
            ...formData,
            valueFormatters: { ...formData.valueFormatters!, numberPrecision: parseInt(e.target.value) }
          })}
        />
      </FormControl>
    </VStack>
  );

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent maxW="900px">
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <Text>Edit Extension</Text>
            <HStack spacing={2}>
              <Badge colorScheme="blue" variant="outline">
                {getTypeDisplayName(repository.type)}
              </Badge>
            </HStack>
          </VStack>
        </ModalHeader>
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Source Selection */}
            {renderSourceSelection()}
            <Divider />
            {renderWorkflowSpecificFields()}

            {/* Platform Settings - Only show for platform extensions */}
            {formData.type === 'platform-extension' && (
              <>
                <Divider />
                {renderPlatformFields()}
                <Divider />
                {renderSyntaxPatterns()}
                <Divider />
                {renderValueFormatters()}
              </>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            {(onDelete || onDeprecate) && (
              <Button
                colorScheme="red"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            )}
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>

    {/* Delete Confirmation Dialog */}
    <AlertDialog
      isOpen={isDeleteDialogOpen}
      leastDestructiveRef={deleteDialogCancelRef}
      onClose={() => setIsDeleteDialogOpen(false)}
      isCentered
    >
      <AlertDialogOverlay
        bg="blackAlpha.300"
        backdropFilter="blur(2px)"
      >
        <AlertDialogContent
          maxW="500px"
          mx="auto"
          my="auto"
          borderRadius="lg"
          boxShadow="xl"
        >
          <AlertDialogHeader fontSize="lg" fontWeight="bold">
            Delete Extension
          </AlertDialogHeader>

          <AlertDialogBody>
            <VStack align="stretch" spacing={4}>
              <Text>
                Delete extension &ldquo;{repository.platformId || repository.themeId}&rdquo;?
              </Text>

              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="bold">Warning: This action will:</Text>
                  <Text>• Delete the file from GitHub repository</Text>
                  <Text>• Remove the repository link</Text>
                  <Text>• Remove the platform from local data</Text>
                  <Text>• Clean up all associated files</Text>
                  <Text fontWeight="bold" color="red.500">• This action cannot be undone</Text>
                </VStack>
              </Alert>

              <FormControl>
                <FormLabel>Type &ldquo;delete&rdquo; to confirm</FormLabel>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type delete to confirm"
                  autoFocus
                />
              </FormControl>
            </VStack>
          </AlertDialogBody>

          <AlertDialogFooter>
            <Button ref={deleteDialogCancelRef} onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            {onDeprecate && (
              <Button
                colorScheme="orange"
                onClick={handleDeprecate}
                ml={3}
              >
                Deprecate
              </Button>
            )}
            {onDelete && (
              <Button
                colorScheme="red"
                onClick={handleDeleteConfirm}
                ml={3}
                isDisabled={deleteConfirmText !== 'delete'}
              >
                Yes, delete
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>

    {/* Source Selection Dialog */}
    <SourceSelectionDialog
      isOpen={isSourceSelectionOpen}
      onClose={() => setIsSourceSelectionOpen(false)}
      onSourceSelected={handleSourceSelected}
      schemaType={formData.type}
    />
  </>
);
}; 