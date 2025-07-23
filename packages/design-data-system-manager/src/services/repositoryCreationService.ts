import { GitHubApiService } from './githubApi';
import { GitHubAuthService } from './githubAuth';
import { RepositoryScaffoldingService } from './repositoryScaffoldingService';
import { StorageService } from './storage';
import { createUniqueId } from '../utils/id';

export interface RepositoryCreationConfig {
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  organization?: string;
  schemaType: 'core' | 'platform-extension' | 'theme-override';
  systemId?: string;
  platformId?: string;
  themeId?: string;
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
  schemaType: string;
  initialFilePath?: string;
}

export class RepositoryCreationService {
  /**
   * Create a new GitHub repository with scaffolding
   */
  static async createRepository(config: RepositoryCreationConfig): Promise<CreatedRepository> {
    try {
      // Step 1: Create the repository
      const repoInfo = await this.createGitHubRepository(config);
      
      // Step 2: Scaffold the repository structure
      await this.scaffoldRepository(repoInfo, config);
      
      // Step 3: Create initial schema file
      const initialFilePath = await this.createInitialSchemaFile(repoInfo, config);
      
      return {
        ...repoInfo,
        schemaType: config.schemaType,
        initialFilePath
      };
    } catch (error) {
      console.error('Repository creation failed:', error);
      throw new Error(`Failed to create repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new GitHub repository
   */
  private static async createGitHubRepository(config: RepositoryCreationConfig): Promise<{
    id: string;
    name: string;
    fullName: string;
    description?: string;
    visibility: 'public' | 'private';
    htmlUrl: string;
    cloneUrl: string;
    defaultBranch: string;
  }> {
    // Get current user info
    const user = GitHubAuthService.getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated. Please authenticate with GitHub first.');
    }

    // Repository will be created under the user's account or specified organization
    const repoOwner = config.organization || user.login;
    
    // Create repository via GitHub API
    const repoData = {
      name: config.name,
      description: config.description || `Design tokens for ${config.schemaType}`,
      private: config.visibility === 'private',
      auto_init: true, // Initialize with README
      gitignore_template: 'Node', // Add .gitignore
      license_template: 'mit' // Add MIT license
    };

    const accessToken = await GitHubAuthService.getValidAccessToken();
    const response = await fetch(`https://api.github.com/user/repos`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(repoData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub API error: ${errorData.message || response.statusText}`);
    }

    const repo = await response.json();
    
    return {
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      visibility: repo.private ? 'private' : 'public',
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch
    };
  }

  /**
   * Scaffold the repository with proper directory structure
   */
  private static async scaffoldRepository(
    repoInfo: { fullName: string; defaultBranch: string },
    config: RepositoryCreationConfig
  ): Promise<void> {
    try {
      // Use existing RepositoryScaffoldingService to scaffold the repository
      const scaffoldingConfig = {
        systemId: config.systemId || this.getCurrentSystemId(),
        platformId: config.platformId || this.generatePlatformId(),
        themeId: config.themeId,
        displayName: config.name,
        description: config.description || `Design tokens for ${config.schemaType}`,
        visibility: config.visibility
      };

      // Scaffold based on schema type
      switch (config.schemaType) {
        case 'platform-extension': {
          // For now, we'll create the platform extension file directly
          // since the scaffolding service doesn't have the methods we need
          await this.createPlatformExtensionFile(repoInfo.fullName, scaffoldingConfig, repoInfo.defaultBranch);
          break;
        }
        case 'core': {
          // TODO: Implement core repository scaffolding
          console.warn('Core repository scaffolding not yet implemented');
          break;
        }
        case 'theme-override': {
          // TODO: Implement theme override repository scaffolding
          console.warn('Theme override repository scaffolding not yet implemented');
          break;
        }
        default:
          throw new Error(`Unsupported schema type: ${config.schemaType}`);
      }
    } catch (error) {
      console.error('Repository scaffolding failed:', error);
      // Don't throw here - let the user manually create files if scaffolding fails
      throw new Error(`Repository created successfully, but scaffolding failed. You can manually create the required files. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create initial schema file in the repository
   */
  private static async createInitialSchemaFile(
    repoInfo: { fullName: string; defaultBranch: string },
    config: RepositoryCreationConfig
  ): Promise<string> {
    try {
      const systemId = config.systemId || this.getCurrentSystemId();
      let fileName: string;
      let fileContent: string;

      // Generate appropriate schema file based on type
      switch (config.schemaType) {
        case 'platform-extension':
          const platformId = config.platformId || this.generatePlatformId();
          fileName = 'platform-extension.json';
          fileContent = this.generatePlatformExtensionSchema(systemId, platformId, config);
          break;
        case 'core':
          fileName = 'design-system.json';
          fileContent = this.generateCoreSchema(systemId, config);
          break;
        case 'theme-override':
          const themeId = config.themeId || this.generateThemeId();
          fileName = 'theme-override.json';
          fileContent = this.generateThemeOverrideSchema(systemId, themeId, config);
          break;
        default:
          throw new Error(`Unsupported schema type: ${config.schemaType}`);
      }

      // Create the file in the repository
      await GitHubApiService.createFile(
        repoInfo.fullName,
        fileName,
        fileContent,
        repoInfo.defaultBranch,
        `Add initial ${config.schemaType} schema file`
      );

      return fileName;
    } catch (error) {
      console.error('Initial schema file creation failed:', error);
      throw new Error(`Repository created and scaffolded, but initial schema file creation failed. You can manually create the schema file. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate platform extension schema content
   */
  private static generatePlatformExtensionSchema(
    systemId: string,
    platformId: string,
    config: RepositoryCreationConfig
  ): string {
    const schema = {
      systemId,
      platformId,
      version: '1.0.0',
      figmaFileKey: `${platformId}-figma-file`,
      metadata: {
        name: config.name,
        description: config.description || `Platform extension for ${platformId}`,
        maintainer: '',
        lastUpdated: new Date().toISOString().split('T')[0],
        repositoryVisibility: config.visibility
      },
      syntaxPatterns: {
        prefix: '',
        suffix: '',
        delimiter: '_',
        capitalization: 'camel',
        formatString: ''
      },
      valueFormatters: {
        color: 'hex',
        dimension: 'px',
        numberPrecision: 2
      },
      algorithmVariableOverrides: [],
      tokenOverrides: [],
      omittedModes: [],
      omittedDimensions: []
    };

    return JSON.stringify(schema, null, 2);
  }

  /**
   * Generate core schema content
   */
  private static generateCoreSchema(
    systemId: string,
    config: RepositoryCreationConfig
  ): string {
    const schema = {
      systemId,
      version: '1.0.0',
      figmaConfiguration: {
        syntaxPatterns: {
          prefix: '',
          suffix: '',
          delimiter: '_',
          capitalization: 'camel',
          formatString: ''
        },
        fileKey: 'default-design-system-figma'
      },
      metadata: {
        name: config.name,
        description: config.description || 'Core design system tokens',
        maintainer: '',
        lastUpdated: new Date().toISOString().split('T')[0],
        repositoryVisibility: config.visibility
      },
      platforms: [],
      dimensions: [],
      modes: [],
      resolvedValueTypes: [],
      tokens: [],
      collections: [],
      taxonomies: [],
      algorithms: [],
      namingRules: []
    };

    return JSON.stringify(schema, null, 2);
  }

  /**
   * Generate theme override schema content
   */
  private static generateThemeOverrideSchema(
    systemId: string,
    themeId: string,
    config: RepositoryCreationConfig
  ): string {
    const schema = {
      systemId,
      themeId,
      version: '1.0.0',
      metadata: {
        name: config.name,
        description: config.description || `Theme override for ${themeId}`,
        maintainer: '',
        lastUpdated: new Date().toISOString().split('T')[0],
        repositoryVisibility: config.visibility
      },
      tokenOverrides: [],
      platformOverrides: []
    };

    return JSON.stringify(schema, null, 2);
  }

  /**
   * Get current system ID from storage
   */
  private static getCurrentSystemId(): string {
    const rootData = StorageService.getRootData();
    return rootData.systemId || 'system-default';
  }

  /**
   * Generate unique platform ID
   */
  private static generatePlatformId(): string {
    return createUniqueId('platform');
  }

  /**
   * Generate unique theme ID
   */
  private static generateThemeId(): string {
    return createUniqueId('theme');
  }

  /**
   * Create platform extension file in repository
   */
  private static async createPlatformExtensionFile(
    repoFullName: string,
    config: RepositoryScaffoldingConfig,
    _branch: string
  ): Promise<void> {
    try {
      await RepositoryScaffoldingService.createPlatformExtensionFile(
        'platform-extension.json',
        config,
        `Add initial platform extension file`
      );
    } catch (error) {
      console.error('Failed to create platform extension file:', error);
      throw new Error(`Failed to create platform extension file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate repository creation configuration
   */
  static validateConfig(config: RepositoryCreationConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.name?.trim()) {
      errors.push('Repository name is required');
    } else if (!/^[a-zA-Z0-9-_]+$/.test(config.name)) {
      errors.push('Repository name can only contain letters, numbers, hyphens, and underscores');
    }

    if (!config.schemaType) {
      errors.push('Schema type is required');
    } else if (!['core', 'platform-extension', 'theme-override'].includes(config.schemaType)) {
      errors.push('Invalid schema type. Must be one of: core, platform-extension, theme-override');
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