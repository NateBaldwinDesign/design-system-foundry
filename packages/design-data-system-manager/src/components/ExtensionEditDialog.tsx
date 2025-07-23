import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  FormControl,
  FormLabel,
  Input,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Divider,
  Alert,
  AlertIcon,
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
  Badge,
  useToast,
  Flex
} from '@chakra-ui/react';
import { RepositoryLink } from '../services/multiRepositoryManager';
import type { Platform } from '@token-model/data-model';
import { StorageService } from '../services/storage';
import {
  WorkflowSelector,
  CreateFileFields,
  CreateRepositoryFields,
  SaveToCoreFields,
  PlatformFields,
  SyntaxPatternsForm,
  ValueFormattersForm,
  type SyntaxPatterns,
  type ValueFormatters,
  type ExtensionWorkflow
} from './shared/ExtensionFormComponents';

interface ExportOptions {
  includeComments?: boolean;
  includeMetadata?: boolean;
  minifyOutput?: boolean;
}

interface ExtensionEditDialogProps {
  repository: RepositoryLink;
  open: boolean;
  onClose: () => void;
  onSave: (updates: {
    repositoryUri: string;
    branch: string;
    filePath: string;
    platformId?: string;
    themeId?: string;
    syntaxPatterns?: SyntaxPatterns;
    valueFormatters?: ValueFormatters;
    exportOptions?: ExportOptions;
    displayName?: string;
    description?: string;
  }) => Promise<void>;
  onDelete?: (repositoryId: string) => void;
  onDeprecate?: (repositoryId: string) => void;
}

export const ExtensionEditDialog: React.FC<ExtensionEditDialogProps> = ({
  repository,
  open,
  onClose,
  onSave,
  onDelete,
  onDeprecate
}) => {
  const [formData, setFormData] = useState({
    repositoryUri: repository.repositoryUri,
    branch: repository.branch,
    filePath: repository.filePath,
    platformId: repository.platformId || '',
    themeId: repository.themeId || '',
    displayName: '',
    description: ''
  });

  const [workflow, setWorkflow] = useState<ExtensionWorkflow>('link-existing');
  const [newFileName, setNewFileName] = useState('platform-extension.json');
  const [newRepositoryName, setNewRepositoryName] = useState('');
  const [newRepositoryDescription, setNewRepositoryDescription] = useState('');
  const [newRepositoryVisibility, setNewRepositoryVisibility] = useState<'public' | 'private'>('public');

  const [syntaxPatterns, setSyntaxPatterns] = useState<SyntaxPatterns>({
    prefix: '',
    suffix: '',
    delimiter: '_',
    capitalization: 'none',
    formatString: ''
  });

  const [valueFormatters, setValueFormatters] = useState<ValueFormatters>({
    colorFormat: 'hex',
    dimensionUnit: 'px',
    numberPrecision: 2
  });

  const [exportOptions] = useState<ExportOptions>({
    includeComments: true,
    includeMetadata: false,
    minifyOutput: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [platformData, setPlatformData] = useState<Platform | undefined>(undefined);
  const [errors] = useState<Record<string, string>>({});
  const deleteDialogCancelRef = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  // Load platform data to check extensionSource
  useEffect(() => {
    const loadPlatformData = async () => {
      if (repository.platformId) {
        const { StorageService } = await import('../services/storage');
        const platforms = StorageService.getPlatforms();
        const platform = platforms.find(p => p.id === repository.platformId);
        setPlatformData(platform);
        
        // Pre-select workflow based on extensionSource
        if (platform) {
          if (!platform.extensionSource) {
            // No extensionSource means it's core data
            setWorkflow('save-to-core');
          } else if (platform.extensionSource.repositoryUri === 'local') {
            // Local extensionSource means it's an extension file
            setWorkflow('create-file');
          } else {
            // Any other extensionSource means it's a linked external repository
            setWorkflow('link-existing');
          }
        }
      }
    };
    
    loadPlatformData();
  }, [repository.platformId]);

  // Use CodeSyntaxService for preview (from PlatformEditorDialog)
  const preview = useMemo(() => {
    if (repository.type !== 'platform-extension') return '';
    
    // Simple preview generation based on syntax patterns
    const { prefix = '', suffix = '', delimiter = '_', capitalization = 'none' } = syntaxPatterns;
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
  }, [syntaxPatterns, repository.type]);

  // Reset form when repository changes
  useEffect(() => {
    setFormData({
      repositoryUri: repository.repositoryUri,
      branch: repository.branch,
      filePath: repository.filePath,
      platformId: repository.platformId || '',
      themeId: repository.themeId || '',
      displayName: '',
      description: ''
    });
    setIsDirty(false);
  }, [repository]);

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleSyntaxPatternChange = (field: keyof SyntaxPatterns, value: string | number | undefined) => {
    setSyntaxPatterns(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleValueFormatterChange = (field: keyof ValueFormatters, value: string | number | undefined) => {
    setValueFormatters(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave({
        repositoryUri: formData.repositoryUri,
        branch: formData.branch,
        filePath: formData.filePath,
        platformId: formData.platformId || undefined,
        themeId: formData.themeId || undefined,
        syntaxPatterns,
        valueFormatters,
        exportOptions,
        displayName: formData.displayName || undefined,
        description: formData.description || undefined
      });
      
      setIsDirty(false);
      toast({
        title: 'Extension Updated',
        description: 'Extension settings have been saved successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Failed to update extension settings.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
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

  const getTypeDisplayName = (type: RepositoryLink['type']) => {
    switch (type) {
      case 'core': return 'Core Data';
      case 'platform-extension': return 'Platform Extension';
      case 'theme-override': return 'Theme Override';
      default: return type;
    }
  };

  // Get current system ID from storage
  const getCurrentSystemId = (): string => {
    const rootData = StorageService.getRootData();
    return rootData.systemId || 'system-default';
  };

  const renderWorkflowSpecificFields = () => {
    switch (workflow) {
      case 'link-existing':
        return (
          <Card>
            <CardHeader>
              <Heading size="sm">Repository Settings</Heading>
              <Text fontSize="sm" color="gray.600">
                Configure the repository connection and file path
              </Text>
            </CardHeader>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Repository URI</FormLabel>
                  <Input
                    size="sm"
                    value={formData.repositoryUri}
                    onChange={(e) => handleFormChange('repositoryUri', e.target.value)}
                    placeholder="owner/repository"
                  />
                </FormControl>

                <HStack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Branch</FormLabel>
                    <Input
                      size="sm"
                      value={formData.branch}
                      onChange={(e) => handleFormChange('branch', e.target.value)}
                      placeholder="main"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel fontSize="sm">File Path</FormLabel>
                    <Input
                      size="sm"
                      value={formData.filePath}
                      onChange={(e) => handleFormChange('filePath', e.target.value)}
                      placeholder="path/to/file.json"
                    />
                  </FormControl>
                </HStack>

                {repository.type === 'platform-extension' && (
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Platform ID</FormLabel>
                    <Input
                      size="sm"
                      value={formData.platformId}
                      onChange={(e) => handleFormChange('platformId', e.target.value)}
                      placeholder="platform-ios"
                    />
                  </FormControl>
                )}

                {repository.type === 'theme-override' && (
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Theme ID</FormLabel>
                    <Input
                      size="sm"
                      value={formData.themeId}
                      onChange={(e) => handleFormChange('themeId', e.target.value)}
                      placeholder="theme-dark"
                    />
                  </FormControl>
                )}
              </VStack>
            </CardBody>
          </Card>
        );
      case 'create-file':
        return (
          <Card>
            <CardHeader>
              <Heading size="sm">File Settings</Heading>
              <Text fontSize="sm" color="gray.600">
                Configure the new extension file
              </Text>
            </CardHeader>
            <CardBody>
              <CreateFileFields
                newFileName={newFileName}
                onNewFileNameChange={setNewFileName}
                errors={errors}
              />
            </CardBody>
          </Card>
        );
      case 'create-repository':
        return (
          <Card>
            <CardHeader>
              <Heading size="sm">Repository Settings</Heading>
              <Text fontSize="sm" color="gray.600">
                Configure the new repository
              </Text>
            </CardHeader>
            <CardBody>
              <CreateRepositoryFields
                newRepositoryName={newRepositoryName}
                newRepositoryDescription={newRepositoryDescription}
                newRepositoryVisibility={newRepositoryVisibility}
                onNewRepositoryNameChange={setNewRepositoryName}
                onNewRepositoryDescriptionChange={setNewRepositoryDescription}
                onNewRepositoryVisibilityChange={setNewRepositoryVisibility}
                errors={errors}
              />
            </CardBody>
          </Card>
        );
      case 'save-to-core':
        return (
          <Card>
            <CardHeader>
              <Heading size="sm">Save to Core</Heading>
              <Text fontSize="sm" color="gray.600">
                Configure how to save the extension to the core data repository.
              </Text>
            </CardHeader>
            <CardBody>
              <SaveToCoreFields
                repositoryUri={formData.repositoryUri}
                branch={formData.branch}
                filePath={formData.filePath}
                onRepositoryUriChange={(value: string) => handleFormChange('repositoryUri', value)}
                onBranchChange={(value: string) => handleFormChange('branch', value)}
                onFilePathChange={(value: string) => handleFormChange('filePath', value)}
                errors={errors}
              />
            </CardBody>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <>
    <Modal isOpen={open} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh" maxW="900px">
        <ModalHeader>
          <VStack align="start" spacing={2}>
            <Text>Edit Extension</Text>
            <HStack spacing={2}>
              {platformData?.extensionSource ? (
                platformData.extensionSource.repositoryUri === 'local' ? (
                  <Badge colorScheme="blue" variant="outline">Local</Badge>
                ) : (
                  <Badge colorScheme="green" variant="outline">External</Badge>
                )
              ) : (
                <Badge colorScheme="blue" variant="outline">
                  {getTypeDisplayName(repository.type)}
                </Badge>
              )}
            </HStack>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack spacing={6} align="stretch">
            {/* Workflow Selector */}
            <Card>
              <CardHeader>
                <Heading size="sm">Extension Workflow</Heading>
                <Text fontSize="sm" color="gray.600">
                  Choose how to manage this extension
                </Text>
              </CardHeader>
              <CardBody>
                <WorkflowSelector
                  workflow={workflow}
                  onWorkflowChange={setWorkflow}
                />
              </CardBody>
            </Card>

            <Divider />

            {/* Workflow-specific fields */}
            {renderWorkflowSpecificFields()}

            {/* Platform Settings - Only show for platform extensions */}
            {repository.type === 'platform-extension' && (
              <>
                <Divider />
                
                {/* Basic Platform Information */}
                <Card>
                  <CardHeader>
                    <Heading size="sm">Platform Information</Heading>
                    <Text fontSize="sm" color="gray.600">
                      Configure platform display name and description
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <PlatformFields
                      platformId={formData.platformId}
                      displayName={formData.displayName}
                      description={formData.description}
                      systemId={getCurrentSystemId()}
                      workflow={workflow}
                      onPlatformIdChange={(value) => handleFormChange('platformId', value)}
                      onDisplayNameChange={(value) => handleFormChange('displayName', value)}
                      onDescriptionChange={(value) => handleFormChange('description', value)}
                      errors={errors}
                    />
                  </CardBody>
                </Card>
                
                {/* Syntax Patterns */}
                <Card>
                  <CardHeader>
                    <Heading size="sm">Syntax Patterns</Heading>
                    <Text fontSize="sm" color="gray.600">
                      Define how token names are formatted in the exported code
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <SyntaxPatternsForm
                      syntaxPatterns={syntaxPatterns}
                      onSyntaxPatternChange={handleSyntaxPatternChange}
                      preview={preview}
                    />
                  </CardBody>
                </Card>

                {/* Value Formatters */}
                <Card>
                  <CardHeader>
                    <Heading size="sm">Value Formatters</Heading>
                    <Text fontSize="sm" color="gray.600">
                      Define how token values are formatted in the exported code
                    </Text>
                  </CardHeader>
                  <CardBody>
                    <ValueFormattersForm
                      valueFormatters={valueFormatters}
                      onValueFormatterChange={handleValueFormatterChange}
                    />
                  </CardBody>
                </Card>
              </>
            )}

            {isDirty && (
              <Alert status="info" size="sm">
                <AlertIcon />
                You have unsaved changes. Click &quot;Save Changes&quot; to apply them.
              </Alert>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Flex width="100%" justify="space-between">
            {(onDelete || onDeprecate) && (
              <Button
                colorScheme="red"
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete
              </Button>
            )}
            <HStack spacing={3}>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSave}
                isLoading={isLoading}
                isDisabled={!isDirty}
              >
                Save Changes
              </Button>
            </HStack>
          </Flex>
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
                  <Text>• Remove the repository link</Text>
                  <Text>• Delete the extension file from the repository</Text>
                  <Text>• This action cannot be undone</Text>
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
  </>
);
}; 