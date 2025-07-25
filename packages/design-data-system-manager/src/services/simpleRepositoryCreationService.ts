import { GitHubApiService } from './githubApi';
import { StorageService } from './storage';

export interface SimpleRepositoryCreationConfig {
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  organization?: string;
  systemId: string;
  platformId: string;
  displayName?: string;
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
}

export interface CreatedRepository {
  id: string;
  name: string;
  fullName: string;
  description?: string;
  visibility: 'public' | 'private';
  htmlUrl: string;
  cloneUrl: string;
  defaultBranch: string;
  initialFilePath: string;
}

export class SimpleRepositoryCreationService {
  /**
   * Create a new GitHub repository with platform extension file
   * Based on the efficient f9cd4df approach
   */
  static async createPlatformExtensionRepository(config: SimpleRepositoryCreationConfig): Promise<CreatedRepository> {
    try {
      // Step 1: Create repository with autoInit: true for initial commit
      const repo = await GitHubApiService.createRepository({
        name: config.name,
        description: config.description || `Platform extension for ${config.platformId}`,
        private: config.visibility === 'private',
        autoInit: true, // Creates initial commit with README.md
        organization: config.organization
      });

      // Step 2: Create platform extension file directly
      const platformExtensionData = {
        systemId: config.systemId,
        platformId: config.platformId,
        version: '1.0.0',
        figmaFileKey: `${config.platformId}-figma-file`,
        metadata: {
          name: config.displayName || config.platformId,
          description: config.description || `Platform extension for ${config.platformId}`,
          maintainer: '',
          lastUpdated: new Date().toISOString().split('T')[0],
          repositoryVisibility: config.visibility
        },
        syntaxPatterns: config.syntaxPatterns || {
          prefix: '',
          suffix: '',
          delimiter: '_',
          capitalization: 'camel',
          formatString: ''
        },
        valueFormatters: config.valueFormatters || {
          color: 'hex',
          dimension: 'px',
          numberPrecision: 2
        },
        algorithmVariableOverrides: [],
        tokenOverrides: [],
        omittedModes: [],
        omittedDimensions: []
      };

      // Create the platform extension file
      await GitHubApiService.createFile(
        repo.full_name,
        'platforms/platform-extension.json',
        JSON.stringify(platformExtensionData, null, 2),
        'main',
        `Add platform extension file for ${config.platformId}`
      );

      // Step 3: Store in localStorage for immediate access
      StorageService.setPlatformExtensionFile(config.platformId, platformExtensionData);
      StorageService.setPlatformExtensionFileContent(config.platformId, JSON.stringify(platformExtensionData, null, 2));

      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        visibility: repo.private ? 'private' : 'public',
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        initialFilePath: 'platforms/platform-extension.json'
      };
    } catch (error) {
      console.error('Simple repository creation failed:', error);
      throw new Error(`Failed to create repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a platform extension file in existing repository
   * Based on the efficient f9cd4df approach
   */
  static async createPlatformExtensionFile(
    fileName: string,
    config: SimpleRepositoryCreationConfig
  ): Promise<void> {
    try {
      // Get current repository info
      const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
      if (!repoInfo) {
        throw new Error('No repository selected. Please select a repository first.');
      }

      // Create platform extension data
      const platformExtensionData = {
        systemId: config.systemId,
        platformId: config.platformId,
        version: '1.0.0',
        figmaFileKey: `${config.platformId}-figma-file`,
        metadata: {
          name: config.displayName || config.platformId,
          description: config.description || `Platform extension for ${config.platformId}`,
          maintainer: '',
          lastUpdated: new Date().toISOString().split('T')[0],
          repositoryVisibility: 'public'
        },
        syntaxPatterns: config.syntaxPatterns || {
          prefix: '',
          suffix: '',
          delimiter: '_',
          capitalization: 'camel',
          formatString: ''
        },
        valueFormatters: config.valueFormatters || {
          color: 'hex',
          dimension: 'px',
          numberPrecision: 2
        },
        algorithmVariableOverrides: [],
        tokenOverrides: [],
        omittedModes: [],
        omittedDimensions: []
      };

      // Use standardized path: platforms/{fileName}
      const filePath = `platforms/${fileName}`;
      
      // Create the file directly
      await GitHubApiService.createFile(
        repoInfo.fullName,
        filePath,
        JSON.stringify(platformExtensionData, null, 2),
        repoInfo.branch,
        `Add platform extension file: ${fileName} for ${config.platformId}`
      );

      // Store in localStorage for immediate access
      StorageService.setPlatformExtensionFile(config.platformId, platformExtensionData);
      StorageService.setPlatformExtensionFileContent(config.platformId, JSON.stringify(platformExtensionData, null, 2));
    } catch (error) {
      console.error('Failed to create platform extension file:', error);
      throw new Error(`Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate repository creation configuration
   */
  static validateConfig(config: SimpleRepositoryCreationConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name?.trim()) {
      errors.push('Repository name is required');
    } else if (!/^[a-zA-Z0-9-_]+$/.test(config.name)) {
      errors.push('Repository name can only contain letters, numbers, hyphens, and underscores');
    }

    if (!config.systemId?.trim()) {
      errors.push('System ID is required');
    }

    if (!config.platformId?.trim()) {
      errors.push('Platform ID is required');
    }

    if (!config.visibility) {
      errors.push('Repository visibility is required');
    } else if (!['public', 'private'].includes(config.visibility)) {
      errors.push('Invalid visibility. Must be one of: public, private');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 