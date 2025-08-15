import { RepositoryContextService } from './repositoryContextService';

export interface RepositoryInfo {
  fullName: string;
  branch: string;
  filePath: string;
  fileType: 'schema' | 'platform-extension' | 'theme-override';
}

export interface SourceContext {
  sourceType: 'core' | 'platform-extension' | 'theme-override';
  sourceId: string | null;
  sourceName: string | null;
  repositoryInfo: RepositoryInfo | null;
  schemaType: 'schema' | 'platform-extension' | 'theme-override';
}

/**
 * Centralized service for GitHub repository information
 * Ensures all GitHub operations use the same repository targeting logic
 */
export class GitHubRepositoryService {
  private static instance: GitHubRepositoryService;
  private repositoryContextService: RepositoryContextService;

  private constructor() {
    this.repositoryContextService = RepositoryContextService.getInstance();
  }

  static getInstance(): GitHubRepositoryService {
    if (!GitHubRepositoryService.instance) {
      GitHubRepositoryService.instance = new GitHubRepositoryService();
    }
    return GitHubRepositoryService.instance;
  }

  /**
   * Get the current repository information for GitHub operations
   * Uses RepositoryContextService as single source of truth
   */
  getCurrentRepositoryInfo(): RepositoryInfo | null {
    // Direct access to RepositoryContextService
    const sourceContext = this.repositoryContextService.getCurrentSourceContext();
    
    console.log('[GitHubRepositoryService] Getting repository info from RepositoryContextService:', sourceContext);
    
    return sourceContext?.repositoryInfo || null;
  }

  /**
   * Get the current source context for GitHub operations
   */
  getCurrentSourceContext(): SourceContext | null {
    // Direct access to RepositoryContextService
    return this.repositoryContextService.getCurrentSourceContext();
  }

  /**
   * Check if the current source is a platform extension
   */
  isPlatformExtension(): boolean {
    const sourceContext = this.getCurrentSourceContext();
    return sourceContext?.sourceType === 'platform-extension';
  }

  /**
   * Check if the current source is a theme override
   */
  isThemeOverride(): boolean {
    const sourceContext = this.getCurrentSourceContext();
    return sourceContext?.sourceType === 'theme-override';
  }

  /**
   * Check if the current source is core data
   */
  isCoreData(): boolean {
    const sourceContext = this.getCurrentSourceContext();
    return sourceContext?.sourceType === 'core';
  }

  /**
   * Get the current source type
   */
  getCurrentSourceType(): 'core' | 'platform-extension' | 'theme-override' {
    const sourceContext = this.getCurrentSourceContext();
    return sourceContext?.sourceType || 'core';
  }

  /**
   * Get the current schema type
   */
  getCurrentSchemaType(): 'schema' | 'platform-extension' | 'theme-override' {
    const sourceContext = this.getCurrentSourceContext();
    return sourceContext?.schemaType || 'schema';
  }
}
