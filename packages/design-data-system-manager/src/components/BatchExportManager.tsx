import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Progress,
  Badge,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  Textarea,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import type { 
  ExportTarget, 
  BatchExportJob, 
  ExportSettings,
  ExportFormat 
} from '../services/enhancedExportService';

interface BatchExportManagerProps {
  onStartExport: (targets: ExportTarget[], settings: ExportSettings) => Promise<BatchExportJob>;
  onGetActiveJobs: () => BatchExportJob[];
  onCancelJob: (jobId: string) => boolean;
  supportedFormats: ExportFormat[];
}

export const BatchExportManager: React.FC<BatchExportManagerProps> = ({
  onStartExport,
  onGetActiveJobs,
  onCancelJob,
  supportedFormats
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeJobs, setActiveJobs] = useState<BatchExportJob[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [formData, setFormData] = useState({
    repositoryUri: '',
    branch: 'main',
    commitMessage: 'Export design tokens',
    createPullRequest: false,
    pullRequestTitle: '',
    pullRequestBody: ''
  });
  const [selectedTargets, setSelectedTargets] = useState<ExportTarget[]>([]);
  const toast = useToast();

  // Mock platforms for demonstration
  const mockPlatforms = [
    { id: 'platform-ios', name: 'iOS' },
    { id: 'platform-android', name: 'Android' },
    { id: 'platform-web', name: 'Web' },
    { id: 'platform-figma', name: 'Figma' }
  ];

  useEffect(() => {
    // Load active jobs on mount
    setActiveJobs(onGetActiveJobs());
    
    // Set up polling for job updates
    const interval = setInterval(() => {
      setActiveJobs(onGetActiveJobs());
    }, 2000);

    return () => clearInterval(interval);
  }, [onGetActiveJobs]);

  const handleStartExport = async () => {
    if (selectedTargets.length === 0) {
      toast({
        title: 'No Targets Selected',
        description: 'Please select at least one export target.',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    if (!formData.repositoryUri) {
      toast({
        title: 'Repository Required',
        description: 'Please enter a repository URI.',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    setIsStarting(true);
    try {
      const settings: ExportSettings = {
        repositoryUri: formData.repositoryUri,
        branch: formData.branch,
        commitMessage: formData.commitMessage,
        createPullRequest: formData.createPullRequest,
        pullRequestTitle: formData.pullRequestTitle,
        pullRequestBody: formData.pullRequestBody
      };

      await onStartExport(selectedTargets, settings);
      
      toast({
        title: 'Export Started',
        description: 'Batch export job has been created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      setIsModalOpen(false);
      setSelectedTargets([]);
      setFormData({
        repositoryUri: '',
        branch: 'main',
        commitMessage: 'Export design tokens',
        createPullRequest: false,
        pullRequestTitle: '',
        pullRequestBody: ''
      });

    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Failed to start export',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleCancelJob = (jobId: string) => {
    const success = onCancelJob(jobId);
    if (success) {
      toast({
        title: 'Job Cancelled',
        description: 'The export job has been cancelled.',
        status: 'info',
        duration: 3000,
        isClosable: true
      });
    }
  };

  const addTarget = (platformId: string, formatId: string) => {
    const platform = mockPlatforms.find(p => p.id === platformId);
    const format = supportedFormats.find(f => f.id === formatId);
    
    if (!platform || !format) return;

    const newTarget: ExportTarget = {
      platformId,
      platformName: platform.name,
      format,
      includeComments: true,
      includeMetadata: true,
      minify: false
    };

    setSelectedTargets(prev => [...prev, newTarget]);
  };

  const removeTarget = (index: number) => {
    setSelectedTargets(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusColor = (status: BatchExportJob['status']) => {
    switch (status) {
      case 'completed': return 'green';
      case 'processing': return 'blue';
      case 'failed': return 'red';
      case 'pending': return 'yellow';
      default: return 'gray';
    }
  };

  return (
    <VStack spacing={6} align="stretch">
      {/* Header */}
      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <Box>
              <Heading size="md">Batch Export Manager</Heading>
              <Text color="gray.600" mt={1}>
                Export design tokens to multiple platforms and formats simultaneously
              </Text>
            </Box>
            <Button
              colorScheme="blue"
              onClick={() => setIsModalOpen(true)}
            >
              Start New Export
            </Button>
          </HStack>
        </CardHeader>
      </Card>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <Card>
          <CardHeader>
            <Heading size="sm">Active Export Jobs</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              {activeJobs.map((job) => (
                <Card key={job.id} variant="outline">
                  <CardBody>
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <HStack>
                          <Badge colorScheme={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                          <Text fontSize="sm" color="gray.600">
                            Job {job.id}
                          </Text>
                        </HStack>
                        <Text fontSize="xs" color="gray.500">
                          {new Date(job.createdAt).toLocaleString()}
                        </Text>
                      </HStack>

                      {job.status === 'processing' && (
                        <Box>
                          <HStack justify="space-between" mb={2}>
                            <Text fontSize="sm">
                              Processing: {job.progress.currentTarget}
                            </Text>
                            <Text fontSize="sm">
                              {job.progress.current} / {job.progress.total}
                            </Text>
                          </HStack>
                          <Progress 
                            value={(job.progress.current / job.progress.total) * 100} 
                            size="sm"
                          />
                        </Box>
                      )}

                      {job.error && (
                        <Alert status="error" size="sm">
                          <AlertIcon />
                          {job.error}
                        </Alert>
                      )}

                      {job.results.length > 0 && (
                        <TableContainer>
                          <Table size="sm" variant="simple">
                            <Thead>
                              <Tr>
                                <Th>Platform</Th>
                                <Th>Format</Th>
                                <Th>Status</Th>
                                <Th>File</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {job.results.map((result, index) => (
                                <Tr key={index}>
                                  <Td>{result.target.platformName}</Td>
                                  <Td>{result.target.format.name}</Td>
                                  <Td>
                                    <Badge
                                      colorScheme={result.success ? 'green' : 'red'}
                                      size="sm"
                                    >
                                      {result.success ? 'Success' : 'Failed'}
                                    </Badge>
                                  </Td>
                                  <Td>
                                    {result.success && result.fileUrl ? (
                                      <Button
                                        size="xs"
                                        variant="link"
                                        onClick={() => window.open(result.fileUrl, '_blank')}
                                      >
                                        View File
                                      </Button>
                                    ) : (
                                      <Text fontSize="xs" color="red.500">
                                        {result.error}
                                      </Text>
                                    )}
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </TableContainer>
                      )}

                      {job.status === 'pending' && (
                        <HStack justify="flex-end">
                          <Button
                            size="sm"
                            variant="outline"
                            colorScheme="red"
                            onClick={() => handleCancelJob(job.id)}
                          >
                            Cancel Job
                          </Button>
                        </HStack>
                      )}
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </CardBody>
        </Card>
      )}

      {/* Start Export Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Start Batch Export</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6} align="stretch">
              {/* Export Targets */}
              <Box>
                <Heading size="sm" mb={4}>Export Targets</Heading>
                <VStack spacing={3} align="stretch">
                  {mockPlatforms.map((platform) => (
                    <Box key={platform.id}>
                      <Text fontWeight="medium" mb={2}>{platform.name}</Text>
                      <HStack spacing={2}>
                        {supportedFormats.map((format) => (
                          <Button
                            key={format.id}
                            size="sm"
                            variant="outline"
                            onClick={() => addTarget(platform.id, format.id)}
                          >
                            {format.name}
                          </Button>
                        ))}
                      </HStack>
                    </Box>
                  ))}
                </VStack>

                {selectedTargets.length > 0 && (
                  <Box mt={4}>
                    <Text fontWeight="medium" mb={2}>Selected Targets:</Text>
                    <VStack spacing={2} align="stretch">
                      {selectedTargets.map((target, index) => (
                        <HStack key={index} justify="space-between" p={2} bg="gray.50" borderRadius="md">
                          <Text fontSize="sm">
                            {target.platformName} - {target.format.name}
                          </Text>
                          <Button
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => removeTarget(index)}
                          >
                            Remove
                          </Button>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                )}
              </Box>

              {/* Export Settings */}
              <Box>
                <Heading size="sm" mb={4}>Export Settings</Heading>
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Repository URI</FormLabel>
                    <Input
                      size="sm"
                      value={formData.repositoryUri}
                      onChange={(e) => setFormData({ ...formData, repositoryUri: e.target.value })}
                      placeholder="owner/repository"
                    />
                  </FormControl>

                  <HStack spacing={4}>
                    <FormControl>
                      <FormLabel fontSize="sm">Branch</FormLabel>
                      <Input
                        size="sm"
                        value={formData.branch}
                        onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                        placeholder="main"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel fontSize="sm">Commit Message</FormLabel>
                      <Input
                        size="sm"
                        value={formData.commitMessage}
                        onChange={(e) => setFormData({ ...formData, commitMessage: e.target.value })}
                        placeholder="Export design tokens"
                      />
                    </FormControl>
                  </HStack>

                  <FormControl>
                    <Checkbox
                      checked={formData.createPullRequest}
                      onChange={(e) => setFormData({ ...formData, createPullRequest: e.target.checked })}
                    >
                      Create Pull Request
                    </Checkbox>
                  </FormControl>

                  {formData.createPullRequest && (
                    <VStack spacing={3} align="stretch">
                      <FormControl>
                        <FormLabel fontSize="sm">Pull Request Title</FormLabel>
                        <Input
                          size="sm"
                          value={formData.pullRequestTitle}
                          onChange={(e) => setFormData({ ...formData, pullRequestTitle: e.target.value })}
                          placeholder="Export design tokens"
                        />
                      </FormControl>

                      <FormControl>
                        <FormLabel fontSize="sm">Pull Request Body</FormLabel>
                        <Textarea
                          size="sm"
                          value={formData.pullRequestBody}
                          onChange={(e) => setFormData({ ...formData, pullRequestBody: e.target.value })}
                          placeholder="Description of the exported tokens..."
                          rows={3}
                        />
                      </FormControl>
                    </VStack>
                  )}
                </VStack>
              </Box>

              {/* Actions */}
              <HStack spacing={3} justify="flex-end">
                <Button onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleStartExport}
                  isLoading={isStarting}
                  loadingText="Starting Export..."
                  isDisabled={selectedTargets.length === 0}
                >
                  Start Export
                </Button>
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}; 