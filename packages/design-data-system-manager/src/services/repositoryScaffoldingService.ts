import { GitHubApiService } from './githubApi';

export interface RepositoryScaffoldingConfig {
  name: string;
  description?: string;
  visibility: 'public' | 'private';
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

export interface ScaffoldedRepository {
  owner: string;
  repo: string;
  url: string;
  cloneUrl: string;
}

export class RepositoryScaffoldingService {
  /**
   * Create a new platform extension repository with proper scaffolding
   * Note: Repository creation via GitHub API requires additional permissions
   * This is a placeholder implementation
   */
  static async createPlatformExtensionRepository(
    config: RepositoryScaffoldingConfig
  ): Promise<ScaffoldedRepository> {
    try {
      // TODO: Implement repository creation via GitHub API
      // This requires additional GitHub API permissions and endpoints
      // For now, we'll throw an error with instructions
      
      console.log('Repository creation config:', config);
      
      throw new Error(
        'Repository creation not yet implemented. ' +
        'Please create the repository manually on GitHub and then use the "Link Existing Extension" workflow.'
      );
      
      // Placeholder implementation for when repository creation is available:
      /*
      // 1. Create the repository
      const repoResult = await GitHubApiService.createRepository({
        name: config.name,
        description: config.description || `Platform extension for ${config.platformId}`,
        private: config.visibility === 'private',
        autoInit: false // We'll create the initial commit manually
      });

      const { owner, repo } = repoResult;

      // 2. Create the directory structure and files
      await this.createRepositoryStructure(owner, repo, config);

      return {
        owner,
        repo,
        url: `https://github.com/${owner}/${repo}`,
        cloneUrl: `https://github.com/${owner}/${repo}.git`
      };
      */
    } catch (error) {
      console.error('Failed to create scaffolded repository:', error);
      throw new Error(`Failed to create repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create the proper directory structure and files for a platform extension repository
   */
  private static async createRepositoryStructure(
    owner: string,
    repo: string,
    config: RepositoryScaffoldingConfig
  ): Promise<void> {
    const files = this.generateRepositoryFiles(config);

        // Create files sequentially to avoid conflicts in empty repositories
    // Each file creation depends on the previous commit SHA
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const commitMessage = i === 0 
        ? `Initial commit: Scaffold platform extension repository for ${config.platformId}`
        : `Add ${file.path} for platform extension repository`;
      
      try {
        await GitHubApiService.createFile(
          repo,
          file.path,
          file.content,
          'main',
          commitMessage
        );
      } catch (error) {
        // If file already exists (like README.md from autoInit), update it instead
        if (error instanceof Error && (error.message.includes('409') || error.message.includes('Conflict'))) {
          console.log(`File ${file.path} already exists, updating instead...`);
          await GitHubApiService.createOrUpdateFile(
            repo,
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
  }

  /**
   * Generate all files needed for a scaffolded platform extension repository
   */
  static generateRepositoryFiles(config: RepositoryScaffoldingConfig) {
    const files = [];

    // 1. Main platform extension file (most important)
    const platformExtensionContent = this.generatePlatformExtensionFile(config);
    files.push({
      path: 'platforms/platform-extension.json',
      content: platformExtensionContent
    });

    // 2. README.md (will be updated if autoInit created one)
    const readmeContent = this.generateReadmeFile(config);
    files.push({
      path: 'README.md',
      content: readmeContent
    });

    // 3. .gitignore (essential for any repository)
    const gitignoreContent = this.generateGitignoreFile();
    files.push({
      path: '.gitignore',
      content: gitignoreContent
    });

    // Note: We'll skip the .figma directory structure and .gitkeep files for now
    // to reduce complexity and potential conflicts. These can be added later if needed.

    return files;
  }

  /**
   * Generate the main platform extension JSON file
   */
  static generatePlatformExtensionFile(config: RepositoryScaffoldingConfig): string {
    const extensionData = {
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

    return JSON.stringify(extensionData, null, 2);
  }

  /**
   * Generate README.md file
   */
  private static generateReadmeFile(config: RepositoryScaffoldingConfig): string {
    return `# ${config.displayName || config.platformId} Platform Extension

${config.description || `Platform-specific design tokens and overrides for ${config.platformId}`}

## Overview

This repository contains platform-specific extensions and overrides for the ${config.systemId} design system.

## Structure

\`\`\`
${config.name}/
├── platform-extension.json     # Main platform extension file
├── .figma/                     # Figma integration metadata
│   ├── mappings/               # Token to variable mappings
│   ├── cache/                  # Cached data
│   └── config/                 # Export configuration
└── README.md                   # This file
\`\`\`

## Usage

This platform extension is automatically loaded by the design system manager when linked to the core system.

## Development

1. Edit \`platform-extension.json\` to add platform-specific tokens and overrides
2. Commit and push changes
3. The design system manager will automatically sync changes

## Schema

This repository follows the [Platform Extension Schema](https://designsystem.org/schemas/platform-extension/v1.0.0).

## Support

For questions or issues, please contact the platform team or create an issue in this repository.
`;
  }

  /**
   * Generate .gitignore file
   */
  private static generateGitignoreFile(): string {
    return `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# Temporary folders
tmp/
temp/
`;
  }

  /**
   * Generate .figma directory structure and files
   */
  private static generateFigmaDirectoryFiles(config: RepositoryScaffoldingConfig) {
    const files = [];

    // .figma/.gitkeep
    files.push({
      path: '.figma/.gitkeep',
      content: ''
    });

    // .figma/mappings/.gitkeep
    files.push({
      path: '.figma/mappings/.gitkeep',
      content: ''
    });

    // .figma/cache/.gitkeep
    files.push({
      path: '.figma/cache/.gitkeep',
      content: ''
    });

    // .figma/config/.gitkeep
    files.push({
      path: '.figma/config/.gitkeep',
      content: ''
    });

    // .figma/config/export-settings.json
    const exportSettings = {
      systemId: config.systemId,
      platformId: config.platformId,
      lastUpdated: new Date().toISOString(),
      settings: {
        includeComments: true,
        includeMetadata: false,
        minifyOutput: false
      }
    };
    files.push({
      path: '.figma/config/export-settings.json',
      content: JSON.stringify(exportSettings, null, 2)
    });

    return files;
  }

  /**
   * Generate platforms directory structure and files
   */
  private static generatePlatformsDirectoryFiles() {
    const files = [];

    // platforms/.gitkeep
    files.push({
      path: 'platforms/.gitkeep',
      content: ''
    });

    return files;
  }

  /**
   * Create a platform extension file in the current repository
   */
  static async createPlatformExtensionFile(
    fileName: string,
    config: RepositoryScaffoldingConfig,
    commitMessage?: string
  ): Promise<void> {
    try {
      const content = this.generatePlatformExtensionFile(config);
      
      // Get current repository info
      const repoInfo = GitHubApiService.getSelectedRepositoryInfo();
      if (!repoInfo) {
        throw new Error('No repository selected. Please select a repository first.');
      }
      
      // Use standardized path: platforms/{fileName}
      const filePath = `platforms/${fileName}`;
      
      await GitHubApiService.createFile(
        repoInfo.fullName,
        filePath,
        content,
        repoInfo.branch,
        commitMessage || `Add platform extension file: ${fileName}`
      );
    } catch (error) {
      console.error('Failed to create platform extension file:', error);
      throw new Error(`Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create additional directory structure files (optional)
   * This can be called after the basic scaffolding is complete
   */
  static async createAdditionalDirectoryStructure(
    repoFullName: string,
    config: RepositoryScaffoldingConfig
  ): Promise<void> {
    try {
      const figmaFiles = this.generateFigmaDirectoryFiles(config);
      const platformsFiles = this.generatePlatformsDirectoryFiles();
      const additionalFiles = [...figmaFiles, ...platformsFiles];

      for (let i = 0; i < additionalFiles.length; i++) {
        const file = additionalFiles[i];
        try {
          await GitHubApiService.createFile(
            repoFullName,
            file.path,
            file.content,
            'main',
            `Add ${file.path} for directory structure`
          );
        } catch (error) {
          // If file already exists, skip it
          if (error instanceof Error && (error.message.includes('409') || error.message.includes('Conflict'))) {
            console.log(`File ${file.path} already exists, skipping...`);
          } else {
            throw error;
          }
        }
        
        // No artificial delays - let GitHub API handle rate limiting naturally
      }
    } catch (error) {
      console.error('Failed to create additional directory structure:', error);
      // Don't throw - this is optional
    }
  }
} 