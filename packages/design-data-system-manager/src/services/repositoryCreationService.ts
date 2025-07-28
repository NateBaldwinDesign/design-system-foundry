import { GitHubApiService } from './githubApi';
import { GitHubAuthService } from './githubAuth';
import { RepositoryScaffoldingService, RepositoryScaffoldingConfig } from './repositoryScaffoldingService';
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
      
      // Step 3: Create initial schema file (skip for platform-extension since scaffolding creates it)
      let initialFilePath: string | undefined;
      if (config.schemaType !== 'platform-extension') {
        initialFilePath = await this.createInitialSchemaFile(repoInfo, config);
      } else {
        // For platform extensions, the scaffolding already creates the file
        initialFilePath = 'platforms/platform-extension.json';
      }
      
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
    try {
      // Get current user info
      const userInfo = await GitHubAuthService.getCurrentUser();
      if (!userInfo) {
        throw new Error('GitHub authentication required. Please sign in to GitHub first.');
      }

      // Create the repository using the proper GitHub API
      const repoResult = await GitHubApiService.createRepository({
        name: config.name,
        description: config.description || 'Design system repository',
        private: config.visibility === 'private',
        autoInit: true, // Initialize with README to create initial commit
        organization: config.organization
      });

      return {
        id: repoResult.id,
        name: repoResult.name,
        fullName: repoResult.full_name,
        description: repoResult.description,
        visibility: repoResult.private ? 'private' : 'public',
        htmlUrl: repoResult.html_url,
        cloneUrl: repoResult.clone_url,
        defaultBranch: repoResult.default_branch
      };
    } catch (error) {
      console.error('GitHub repository creation failed:', error);
      throw new Error(`Failed to create GitHub repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      const scaffoldingConfig: RepositoryScaffoldingConfig = {
        name: config.name,
        systemId: config.systemId || this.getCurrentSystemId(),
        platformId: config.platformId || this.generatePlatformId(),
        displayName: config.name,
        description: config.description || `Design tokens for ${config.schemaType}`,
        visibility: config.visibility
      };

      // Scaffold based on schema type
      switch (config.schemaType) {
        case 'platform-extension': {
          // Create the basic platform extension structure
          await this.createPlatformExtensionFile(repoInfo.fullName, scaffoldingConfig);
          
          // Optionally create additional directory structure (non-blocking)
          try {
            await RepositoryScaffoldingService.createAdditionalDirectoryStructure(
              repoInfo.fullName, 
              scaffoldingConfig
            );
          } catch (error) {
            console.warn('Failed to create additional directory structure:', error);
            // Don't fail the entire process for optional files
          }
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
      let platformId: string;
      let themeId: string;
      
      switch (config.schemaType) {
        case 'platform-extension':
          platformId = config.platformId || this.generatePlatformId();
          fileName = `platforms/platform-extension.json`;
          fileContent = this.generatePlatformExtensionSchema(systemId, platformId, config);
          break;
        case 'core':
          fileName = 'design-system.json';
          fileContent = this.generateCoreSchema(systemId, config);
          break;
        case 'theme-override':
          themeId = config.themeId || this.generateThemeId();
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
      taxonomyOrder: []
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
    config: RepositoryScaffoldingConfig
  ): Promise<void> {
    try {
      // Use the RepositoryScaffoldingService to create the full repository structure
      // This will create all necessary directories and files including the platform extension file
      const files = RepositoryScaffoldingService.generateRepositoryFiles(config);
      
      // Create files sequentially to avoid conflicts
      // Each file creation depends on the previous commit SHA
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const commitMessage = i === 0 
          ? `Initial commit: Scaffold platform extension repository for ${config.platformId}`
          : `Add ${file.path} for platform extension repository`;
        
        try {
          await GitHubApiService.createFile(
            repoFullName,
            file.path,
            file.content,
            'main', // Default branch for new repositories
            commitMessage
          );
        } catch (error) {
          // If file already exists (like README.md from autoInit), update it instead
          if (error instanceof Error && (error.message.includes('409') || error.message.includes('Conflict'))) {
            console.log(`File ${file.path} already exists, updating instead...`);
            await GitHubApiService.createOrUpdateFile(
              repoFullName,
              file.path,
              file.content,
              'main',
              `Update ${file.path} for platform extension repository`
            );
          } else {
            throw error;
          }
        }
        
        // No artificial delays - let GitHub API handle rate limiting naturally
      }
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