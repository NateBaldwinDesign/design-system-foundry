import { DataSourceManager } from './dataSourceManager';
import { SourceContextManager } from './sourceContextManager';
import { GitHubApiService } from './githubApi';

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
  repositoryInfo: RepositoryInfo;
  schemaType: 'schema' | 'platform-extension' | 'theme-override';
}

/**
 * Centralized service for GitHub repository information
 * Ensures all GitHub operations use the same repository targeting logic
 */
export class GitHubRepositoryService {
  private static instance: GitHubRepositoryService;

  private constructor() {}

  static getInstance(): GitHubRepositoryService {
    if (!GitHubRepositoryService.instance) {
      GitHubRepositoryService.instance = new GitHubRepositoryService();
    }
    return GitHubRepositoryService.instance;
  }

  /**
   * Get the current repository information for GitHub operations
   * Uses the same priority system as GitHubSaveDialog
   */
  getCurrentRepositoryInfo(): RepositoryInfo | null {
    // PRIORITY 1: Use SourceContextManager (most up-to-date)
    const sourceContextManager = SourceContextManager.getInstance();
    const currentSourceContext = sourceContextManager.getContext();
    
    if (currentSourceContext?.repositoryInfo) {
      console.log('[GitHubRepositoryService] Using SourceContextManager repository info:', currentSourceContext.repositoryInfo);
      return currentSourceContext.repositoryInfo;
    }

    // PRIORITY 2: Use DataSourceManager
    const dataSourceManager = DataSourceManager.getInstance();
    const dataSourceContext = dataSourceManager.getCurrentContext();
    
    if (dataSourceContext) {
      if (dataSourceContext.currentPlatform && dataSourceContext.currentPlatform !== 'none') {
        const platformRepo = dataSourceContext.repositories.platforms[dataSourceContext.currentPlatform];
        console.log('[GitHubRepositoryService] Using platform repository from DataSourceManager:', platformRepo);
        return platformRepo || null;
      } else if (dataSourceContext.currentTheme && dataSourceContext.currentTheme !== 'none') {
        const themeRepo = dataSourceContext.repositories.themes[dataSourceContext.currentTheme];
        console.log('[GitHubRepositoryService] Using theme repository from DataSourceManager:', themeRepo);
        return themeRepo || null;
      } else {
        const coreRepo = dataSourceContext.repositories.core;
        console.log('[GitHubRepositoryService] Using core repository from DataSourceManager:', coreRepo);
        return coreRepo || null;
      }
    }

    // PRIORITY 3: Fallback to old method (least reliable)
    const fallbackRepo = GitHubApiService.getSelectedRepositoryInfo();
    console.log('[GitHubRepositoryService] Using fallback repository info:', fallbackRepo);
    return fallbackRepo;
  }

  /**
   * Get the current source context for GitHub operations
   */
  getCurrentSourceContext(): SourceContext | null {
    // PRIORITY 1: Use SourceContextManager
    const sourceContextManager = SourceContextManager.getInstance();
    const currentSourceContext = sourceContextManager.getContext();
    
    if (currentSourceContext) {
      return currentSourceContext;
    }

    // PRIORITY 2: Build from DataSourceManager
    const dataSourceManager = DataSourceManager.getInstance();
    const dataSourceContext = dataSourceManager.getCurrentContext();
    
    if (!dataSourceContext) {
      return null;
    }

    let sourceType: 'core' | 'platform-extension' | 'theme-override' = 'core';
    let schemaType: 'schema' | 'platform-extension' | 'theme-override' = 'schema';
    let sourceId: string | null = null;
    let sourceName: string | null = null;
    let repositoryInfo: RepositoryInfo | null = null;

    if (dataSourceContext.currentPlatform && dataSourceContext.currentPlatform !== 'none') {
      sourceType = 'platform-extension';
      schemaType = 'platform-extension';
      sourceId = dataSourceContext.currentPlatform;
      sourceName = dataSourceContext.availablePlatforms.find(p => p.id === sourceId)?.displayName || null;
      repositoryInfo = dataSourceContext.repositories.platforms[sourceId];
    } else if (dataSourceContext.currentTheme && dataSourceContext.currentTheme !== 'none') {
      sourceType = 'theme-override';
      schemaType = 'theme-override';
      sourceId = dataSourceContext.currentTheme;
      sourceName = dataSourceContext.availableThemes.find(t => t.id === sourceId)?.displayName || null;
      repositoryInfo = dataSourceContext.repositories.themes[sourceId];
    } else {
      repositoryInfo = dataSourceContext.repositories.core;
    }

    if (!repositoryInfo) {
      return null;
    }

    return {
      sourceType,
      sourceId,
      sourceName,
      repositoryInfo,
      schemaType
    };
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
