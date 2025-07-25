import React from 'react';
import {
  VStack,
  HStack,
  Text,
  FormControl,
  FormLabel,
  Input,
  Select,
  Box,
  useColorMode,
  Radio,
  RadioGroup,
  Stack,
  Icon,
  Badge,
  Tooltip,
  IconButton,
  Spinner,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { LuLink, LuFileText, LuGitBranch, LuRefreshCw } from 'react-icons/lu';
import type { GitHubOrganization, GitHubRepo, GitHubBranch } from '../../config/github';
import type { ValidFile } from '../../services/githubApi';

// Shared interfaces
export interface SyntaxPatterns {
  prefix?: string;
  suffix?: string;
  delimiter?: '' | '_' | '-' | '.' | '/' | undefined;
  capitalization?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  formatString?: string;
}

export interface ValueFormatters {
  colorFormat?: 'hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla';
  dimensionUnit?: 'px' | 'rem' | 'em' | 'pt' | 'dp' | 'sp';
  numberPrecision?: number;
  dateFormat?: string;
}

export type ExtensionWorkflow = 'link-existing' | 'create-file' | 'create-repository' | 'save-to-core';

// Workflow Selector Component
interface WorkflowSelectorProps {
  workflow: ExtensionWorkflow;
  onWorkflowChange: (workflow: ExtensionWorkflow) => void;
}

export const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({
  workflow,
  onWorkflowChange
}) => (
  <VStack spacing={4} align="stretch">
    <Text fontWeight="bold" fontSize="sm" color="gray.600">
      Extension Workflow
    </Text>
    
    <RadioGroup value={workflow} onChange={(value) => onWorkflowChange(value as ExtensionWorkflow)}>
      <Stack spacing={3}>
        <Radio value="save-to-core">
          <HStack spacing={2}>
            <Icon as={LuFileText} />
            <VStack align="start" spacing={0}>
              <Text fontWeight="medium">Save to Core Data</Text>
              <Text fontSize="sm" color="gray.500">Save platform data directly to the main design system</Text>
            </VStack>
          </HStack>
        </Radio>
        
        <Radio value="link-existing">
          <HStack spacing={2}>
            <Icon as={LuLink} />
            <VStack align="start" spacing={0}>
              <Text fontWeight="medium">Link Existing Extension</Text>
              <Text fontSize="sm" color="gray.500">Connect to an existing platform extension repository</Text>
            </VStack>
          </HStack>
        </Radio>
        
        <Radio value="create-file">
          <HStack spacing={2}>
            <Icon as={LuFileText} />
            <VStack align="start" spacing={0}>
              <Text fontWeight="medium">Create Extension File</Text>
              <Text fontSize="sm" color="gray.500">Create a new platform extension file in the current repository</Text>
            </VStack>
          </HStack>
        </Radio>
        
        <Radio value="create-repository">
          <HStack spacing={2}>
            <Icon as={LuGitBranch} />
            <VStack align="start" spacing={0}>
              <Text fontWeight="medium">Create New Repository</Text>
              <Text fontSize="sm" color="gray.500">Create a new repository with scaffolded platform extension structure</Text>
            </VStack>
          </HStack>
        </Radio>
      </Stack>
    </RadioGroup>
  </VStack>
);

// Repository Selection Component
interface RepositorySelectionProps {
  organizations: GitHubOrganization[];
  filteredRepositories: GitHubRepo[];
  branches: GitHubBranch[];
  validFiles: ValidFile[];
  selectedOrg: GitHubOrganization | null;
  selectedRepo: GitHubRepo | null;
  selectedBranch: string;
  selectedFile: ValidFile | null;
  loading: boolean;
  loadingStep: 'orgs' | 'repos' | 'branches' | 'files' | null;
  error: string;
  cacheStats: {
    totalEntries: number;
    expiredEntries: number;
    validEntries: number;
    totalSize: number;
  } | null;
  onOrgChange: (orgLogin: string) => void;
  onRepoChange: (repoFullName: string) => void;
  onBranchChange: (branchName: string) => void;
  onFileSelect: (filePath: string) => void;
  onRefreshCache: () => void;
  currentSystemId: string;
  extensionType: string;
  orgSelectRef: React.RefObject<HTMLSelectElement>;
  repoSelectRef: React.RefObject<HTMLSelectElement>;
  branchSelectRef: React.RefObject<HTMLSelectElement>;
  fileSelectRef: React.RefObject<HTMLSelectElement>;
}

export const RepositorySelection: React.FC<RepositorySelectionProps> = ({
  organizations,
  filteredRepositories,
  branches,
  validFiles,
  selectedOrg,
  selectedRepo,
  selectedBranch,
  selectedFile,
  loading,
  loadingStep,
  error,
  cacheStats,
  onOrgChange,
  onRepoChange,
  onBranchChange,
  onFileSelect,
  onRefreshCache,
  currentSystemId,
  extensionType,
  orgSelectRef,
  repoSelectRef,
  branchSelectRef,
  fileSelectRef
}) => {
  const getCacheStatusText = () => {
    if (!cacheStats) return 'Unknown';
    
    if (cacheStats.validEntries === 0) return 'No cached data';
    if (cacheStats.expiredEntries > 0) return `${cacheStats.validEntries} valid, ${cacheStats.expiredEntries} expired`;
    return `${cacheStats.validEntries} cached items`;
  };

  return (
    <VStack spacing={4} align="stretch">
      <Text fontWeight="bold" fontSize="sm" color="gray.600">
        Repository Settings
      </Text>
      
      {error && (
        <Alert status="error">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      {/* Organization Selection */}
      <Box>
        <Text fontWeight="medium" mb={2}>Organization</Text>
        <Select
          value={selectedOrg?.login || ''}
          onChange={(e) => onOrgChange(e.target.value)}
          isDisabled={loading}
          placeholder="Select organization"
          ref={orgSelectRef}
        >
          {organizations.map((org) => (
            <option key={org.login} value={org.login}>
              {org.name || org.login}
            </option>
          ))}
        </Select>
      </Box>

      {/* Repository Selection */}
      <Box>
        <Text fontWeight="medium" mb={2}>Repository</Text>
        <Select
          value={selectedRepo?.full_name || ''}
          onChange={(e) => onRepoChange(e.target.value)}
          isDisabled={loading || !selectedOrg}
          placeholder="Select repository"
          ref={repoSelectRef}
        >
          {filteredRepositories.map((repo) => (
            <option key={repo.full_name} value={repo.full_name}>
              {repo.name}
            </option>
          ))}
        </Select>
      </Box>

      {/* Branch Selection */}
      <Box>
        <Text fontWeight="medium" mb={2}>Branch</Text>
        <Select
          value={selectedBranch}
          onChange={(e) => onBranchChange(e.target.value)}
          isDisabled={loading || !selectedRepo}
          placeholder="Select branch"
          ref={branchSelectRef}
        >
          {branches.map((branch) => (
            <option key={branch.name} value={branch.name}>
              {branch.name}
            </option>
          ))}
        </Select>
      </Box>

      {/* File Selection */}
      <Box>
        <Text fontWeight="medium" mb={2}>File</Text>
        <Select
          value={selectedFile?.path || ''}
          onChange={(e) => onFileSelect(e.target.value)}
          isDisabled={loading || !selectedBranch}
          placeholder="Select file"
          ref={fileSelectRef}
        >
          {validFiles.map((file) => (
            <option key={file.path} value={file.path}>
              {file.name} ({file.type})
            </option>
          ))}
        </Select>
        {validFiles.length === 0 && selectedBranch && !loading && (
          <Text fontSize="sm" color="gray.500" mt={1}>
            {extensionType === 'platform-extension' 
              ? `No platform extension files found with matching systemId: ${currentSystemId}`
              : `No ${extensionType} files found in this branch`
            }
          </Text>
        )}
      </Box>

      {/* Loading Indicator */}
      {loading && (
        <HStack justify="center" py={4}>
          <Spinner size="sm" />
          <Text fontSize="sm">
            {loadingStep === 'orgs' && 'Loading organizations...'}
            {loadingStep === 'repos' && 'Loading repositories...'}
            {loadingStep === 'branches' && 'Loading branches...'}
            {loadingStep === 'files' && 'Scanning files...'}
          </Text>
        </HStack>
      )}

      {/* Cache Status */}
      <HStack justify="space-between" align="center">
        <Text fontSize="sm" color="gray.500">
          {extensionType === 'platform-extension' 
            ? `Looking for platform extension files with systemId: ${currentSystemId}`
            : `Looking for ${extensionType} files`
          }
        </Text>
        <HStack spacing={2}>
          {cacheStats && (
            <Badge colorScheme={cacheStats.validEntries > 0 ? 'green' : 'gray'} variant="subtle" fontSize="xs">
              {getCacheStatusText()}
            </Badge>
          )}
          <Tooltip label="Refresh cache and fetch latest data">
            <IconButton
              aria-label="Refresh cache"
              icon={<LuRefreshCw />}
              size="sm"
              variant="ghost"
              onClick={onRefreshCache}
              isLoading={loading}
            />
          </Tooltip>
        </HStack>
      </HStack>
    </VStack>
  );
};

// Create File Fields Component
interface CreateFileFieldsProps {
  newFileName: string;
  onNewFileNameChange: (value: string) => void;
  errors: Record<string, string>;
}

export const CreateFileFields: React.FC<CreateFileFieldsProps> = ({
  newFileName,
  onNewFileNameChange,
  errors
}) => (
  <VStack spacing={4} align="stretch">
    <Text fontWeight="bold" fontSize="sm" color="gray.600">
      File Settings
    </Text>
    
    <FormControl isRequired isInvalid={!!errors.newFileName}>
      <FormLabel>File Name</FormLabel>
      <Input
        value={newFileName}
        onChange={(e) => onNewFileNameChange(e.target.value)}
        placeholder="platform-extension.json"
      />
      <Text fontSize="xs" color="gray.500" mt={1}>
        File will be created in the current repository
      </Text>
    </FormControl>
  </VStack>
);

// Create Repository Fields Component
interface CreateRepositoryFieldsProps {
  newRepositoryName: string;
  newRepositoryDescription: string;
  newRepositoryVisibility: 'public' | 'private';
  onNewRepositoryNameChange: (value: string) => void;
  onNewRepositoryDescriptionChange: (value: string) => void;
  onNewRepositoryVisibilityChange: (value: 'public' | 'private') => void;
  errors: Record<string, string>;
}

export const CreateRepositoryFields: React.FC<CreateRepositoryFieldsProps> = ({
  newRepositoryName,
  newRepositoryDescription,
  newRepositoryVisibility,
  onNewRepositoryNameChange,
  onNewRepositoryDescriptionChange,
  onNewRepositoryVisibilityChange,
  errors
}) => (
  <VStack spacing={4} align="stretch">
    <Text fontWeight="bold" fontSize="sm" color="gray.600">
      Repository Settings
    </Text>
    
    <FormControl isRequired isInvalid={!!errors.newRepositoryName}>
      <FormLabel>Repository Name</FormLabel>
      <Input
        value={newRepositoryName}
        onChange={(e) => onNewRepositoryNameChange(e.target.value)}
        placeholder="my-platform-extension"
      />
      <Text fontSize="xs" color="gray.500" mt={1}>
        Repository will be created as: {newRepositoryName ? `${newRepositoryName}` : 'your-org/repo-name'}
      </Text>
    </FormControl>
    
    <FormControl>
      <FormLabel>Description</FormLabel>
      <Input
        value={newRepositoryDescription}
        onChange={(e) => onNewRepositoryDescriptionChange(e.target.value)}
        placeholder="Platform-specific design tokens and overrides"
      />
    </FormControl>
    
    <FormControl>
      <FormLabel>Visibility</FormLabel>
      <Select
        value={newRepositoryVisibility}
        onChange={(e) => onNewRepositoryVisibilityChange(e.target.value as 'public' | 'private')}
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

// Save to Core Fields Component
interface SaveToCoreFieldsProps {
  repositoryUri: string;
  branch: string;
  filePath: string;
  onRepositoryUriChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onFilePathChange: (value: string) => void;
  errors: Record<string, string>;
}

export const SaveToCoreFields: React.FC<SaveToCoreFieldsProps> = ({
  repositoryUri,
  branch,
  filePath,
  onRepositoryUriChange,
  onBranchChange,
  onFilePathChange,
  errors
}) => (
  <VStack spacing={4} align="stretch">
    <Text fontWeight="bold" fontSize="sm" color="gray.600">
      Core Data Settings
    </Text>
    
    <FormControl isRequired isInvalid={!!errors.repositoryUri}>
      <FormLabel>Core Data Repository URI</FormLabel>
      <Input
        value={repositoryUri}
        onChange={(e) => onRepositoryUriChange(e.target.value)}
        placeholder="owner/repository"
      />
      <Text fontSize="xs" color="gray.500" mt={1}>
        The main design system repository where core data is stored
      </Text>
    </FormControl>
    
    <HStack spacing={4}>
      <FormControl isRequired isInvalid={!!errors.branch}>
        <FormLabel>Branch</FormLabel>
        <Input
          value={branch}
          onChange={(e) => onBranchChange(e.target.value)}
          placeholder="main"
        />
      </FormControl>
      
      <FormControl isRequired isInvalid={!!errors.filePath}>
        <FormLabel>File Path</FormLabel>
        <Input
          value={filePath}
          onChange={(e) => onFilePathChange(e.target.value)}
          placeholder="path/to/file.json"
        />
      </FormControl>
    </HStack>
    
    <Alert status="info" size="sm">
      <AlertIcon />
      Platform data will be saved directly to the core design system repository
    </Alert>
  </VStack>
);

// Platform Fields Component
interface PlatformFieldsProps {
  platformId: string;
  displayName: string;
  description: string;
  systemId: string;
  workflow: ExtensionWorkflow;
  onPlatformIdChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  errors: Record<string, string>;
}

export const PlatformFields: React.FC<PlatformFieldsProps> = ({
  platformId,
  displayName,
  description,
  systemId,
  workflow,
  onPlatformIdChange,
  onDisplayNameChange,
  onDescriptionChange,
  errors
}) => {
  const { colorMode } = useColorMode();

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
            <Input
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="iOS Platform"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Description</FormLabel>
            <Input
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Platform-specific extensions for iOS"
            />
          </FormControl>
        </VStack>
      </Box>

      {/* Platform ID - Only show for link-existing workflow */}
      {workflow === 'link-existing' ? (
        <FormControl isRequired isInvalid={!!errors.platformId}>
          <FormLabel>Platform ID</FormLabel>
          <Input
            value={platformId}
            onChange={(e) => onPlatformIdChange(e.target.value)}
            placeholder="e.g., platform-ios, platform-android"
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            Platform ID from the selected file will be auto-populated
          </Text>
        </FormControl>
      ) : (
        /* For create workflows, show auto-generated Platform ID in read-only display */
        <Box p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>Platform ID</Text>
          <Text fontSize="sm" color="gray.500" fontFamily="mono">
            {platformId || 'Generating...'}
          </Text>
          <Text fontSize="xs" color="gray.400" mt={1}>
            Auto-generated unique identifier for the new platform extension
          </Text>
        </Box>
      )}
      
      {/* System ID is hidden and auto-populated */}
      <Box p={3} borderWidth={1} borderRadius="md" bg={colorMode === 'dark' ? 'gray.800' : 'gray.50'} borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}>
        <Text fontSize="sm" fontWeight="medium" mb={2}>System ID</Text>
        <Text fontSize="sm" color="gray.500">
          {systemId}
        </Text>
        <Text fontSize="xs" color="gray.400" mt={1}>
          Auto-populated from current system
        </Text>
      </Box>
    </VStack>
  );
};



// Re-export the unified SyntaxPatternsEditor
export { SyntaxPatternsEditor } from './SyntaxPatternsEditor';

// Value Formatters Component
interface ValueFormattersProps {
  valueFormatters: ValueFormatters;
  onValueFormatterChange: (field: keyof ValueFormatters, value: string | number | undefined) => void;
}

export const ValueFormattersForm: React.FC<ValueFormattersProps> = ({
  valueFormatters,
  onValueFormatterChange
}) => (
  <VStack spacing={4} align="stretch">
    <Text fontWeight="bold" fontSize="sm" color="gray.600">
      Value Formatters
    </Text>
    <HStack spacing={4}>
      <FormControl>
        <FormLabel>Color Format</FormLabel>
        <Select
          value={valueFormatters.colorFormat || 'hex'}
          onChange={(e) => onValueFormatterChange('colorFormat', e.target.value)}
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
          value={valueFormatters.dimensionUnit || 'px'}
          onChange={(e) => onValueFormatterChange('dimensionUnit', e.target.value)}
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
        value={valueFormatters.numberPrecision || 2}
        onChange={(e) => onValueFormatterChange('numberPrecision', parseInt(e.target.value))}
      />
    </FormControl>
  </VStack>
); 