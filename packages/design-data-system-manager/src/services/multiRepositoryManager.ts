import { GitHubApiService } from './githubApi';
import { GitHubAuthService } from './githubAuth';
import type { 
  TokenSystem, 
  PlatformExtension,
  ThemeOverrides 
} from '@token-model/data-model';
import { 
  validateTokenSystem, 
  validatePlatformExtension, 
  validateThemeOverrides,
  mergeData,
  validatePlatformExtensionComprehensive
} from '@token-model/data-model';

export interface RepositoryLink {
  id: string;
  type: 'core' | 'platform-extension' | 'theme-override';
  repositoryUri: string;
  branch: string;
  filePath: string;
  platformId?: string; // For platform extensions
  themeId?: string; // For theme overrides
  lastSync?: string;
  status: 'linked' | 'loading' | 'error' | 'synced';
  error?: string;
}

export interface MultiRepositoryData {
  core: TokenSystem | null;
  platformExtensions: Map<string, PlatformExtension>; // platformId -> extension
  themeOverrides: ThemeOverrides | null;
  mergedData: unknown | null; // Will be the merged result
  analytics: {
    totalTokens: number;
    overriddenTokens: number;
    newTokens: number;
    omittedTokens: number;
    platformCount: number;
    themeCount: number;
  };
}

export interface MultiRepositoryCallbacks {
  onDataLoaded?: (data: MultiRepositoryData) => void;
  onDataChanged?: (data: MultiRepositoryData) => void;
  onRepositoryLinked?: (link: RepositoryLink) => void;
  onRepositoryUnlinked?: (linkId: string) => void;
  onError?: (error: string) => void;
}

export class MultiRepositoryManager {
  private static instance: MultiRepositoryManager;
  private callbacks: MultiRepositoryCallbacks = {};
  private linkedRepositories: Map<string, RepositoryLink> = new Map();
  private currentData: MultiRepositoryData = {
    core: null,
    platformExtensions: new Map(),
    themeOverrides: null,
    mergedData: null,
    analytics: {
      totalTokens: 0,
      overriddenTokens: 0,
      newTokens: 0,
      omittedTokens: 0,
      platformCount: 0,
      themeCount: 0
    }
  };

  private constructor() {}

  static getInstance(): MultiRepositoryManager {
    if (!MultiRepositoryManager.instance) {
      MultiRepositoryManager.instance = new MultiRepositoryManager();
    }
    return MultiRepositoryManager.instance;
  }

  /**
   * Set callbacks for the manager
   */
  setCallbacks(callbacks: MultiRepositoryCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Link a new repository
   */
  async linkRepository(
    type: RepositoryLink['type'],
    repositoryUri: string,
    branch: string,
    filePath: string,
    platformId?: string,
    themeId?: string
  ): Promise<RepositoryLink> {
    const linkId = this.generateLinkId(type, repositoryUri, filePath, platformId, themeId);
    
    const link: RepositoryLink = {
      id: linkId,
      type,
      repositoryUri,
      branch,
      filePath,
      platformId,
      themeId,
      status: 'loading'
    };

    this.linkedRepositories.set(linkId, link);
    this.callbacks.onRepositoryLinked?.(link);

    try {
      // Load data from the repository
      await this.loadRepositoryData(link);
      
      // Update merged data
      await this.updateMergedData();
      
      link.status = 'synced';
      link.lastSync = new Date().toISOString();
      
    } catch (error) {
      link.status = 'error';
      link.error = error instanceof Error ? error.message : 'Unknown error';
      this.callbacks.onError?.(link.error);
    }

    return link;
  }

  /**
   * Unlink a repository
   */
  unlinkRepository(linkId: string): void {
    const link = this.linkedRepositories.get(linkId);
    if (!link) return;

    this.linkedRepositories.delete(linkId);
    this.callbacks.onRepositoryUnlinked?.(linkId);

    // Remove data associated with this link
    if (link.type === 'core') {
      this.currentData.core = null;
    } else if (link.type === 'platform-extension' && link.platformId) {
      this.currentData.platformExtensions.delete(link.platformId);
    } else if (link.type === 'theme-override') {
      this.currentData.themeOverrides = null;
    }

    // Update merged data
    this.updateMergedData();
  }

  /**
   * Get all linked repositories
   */
  getLinkedRepositories(): RepositoryLink[] {
    return Array.from(this.linkedRepositories.values());
  }

  /**
   * Get current data
   */
  getCurrentData(): MultiRepositoryData {
    return this.currentData;
  }

  /**
   * Refresh data from all linked repositories
   */
  async refreshAllData(): Promise<void> {
    const links = this.getLinkedRepositories();
    
    for (const link of links) {
      if (link.status === 'synced') {
        link.status = 'loading';
        try {
          await this.loadRepositoryData(link);
          link.status = 'synced';
          link.lastSync = new Date().toISOString();
        } catch (error) {
          link.status = 'error';
          link.error = error instanceof Error ? error.message : 'Unknown error';
        }
      }
    }

    await this.updateMergedData();
  }

  /**
   * Validate platform extensions against core data
   */
  validatePlatformExtensions(): Array<{ platformId: string; isValid: boolean; errors: string[]; warnings: string[] }> {
    if (!this.currentData.core) {
      return [];
    }

    const results = [];
    for (const [platformId, extension] of this.currentData.platformExtensions) {
      const result = validatePlatformExtensionComprehensive({
        coreData: this.currentData.core,
        platformExtension: extension
      });
      
      results.push({
        platformId,
        isValid: result.isValid,
        errors: result.errors,
        warnings: result.warnings
      });
    }

    return results;
  }

  /**
   * Get syntax patterns for a specific platform
   */
  getSyntaxPatternsForPlatform(platformId: string): any {
    if (!this.currentData.core) return null;

    // Figma patterns come from core data
    if (platformId === 'platform-figma') {
      const figmaPlatform = this.currentData.core.platforms.find(p => p.id === 'platform-figma');
      return figmaPlatform?.syntaxPatterns;
    }

    // Other platform patterns come from their extensions
    const extension = this.currentData.platformExtensions.get(platformId);
    return extension?.syntaxPatterns;
  }

  /**
   * Get value formatters for a specific platform
   */
  getValueFormattersForPlatform(platformId: string): any {
    if (!this.currentData.core) return null;

    // Figma formatters come from core data
    if (platformId === 'platform-figma') {
      const figmaPlatform = this.currentData.core.platforms.find(p => p.id === 'platform-figma');
      return figmaPlatform?.valueFormatters;
    }

    // Other platform formatters come from their extensions
    const extension = this.currentData.platformExtensions.get(platformId);
    return extension?.valueFormatters;
  }

  /**
   * Load data from a specific repository
   */
  private async loadRepositoryData(link: RepositoryLink): Promise<void> {
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    const fileContent = await GitHubApiService.getFileContent(
      link.repositoryUri,
      link.filePath,
      link.branch
    );

    const content = JSON.parse(fileContent.content);

    switch (link.type) {
      case 'core':
        const coreData = validateTokenSystem(content);
        this.currentData.core = coreData;
        break;

      case 'platform-extension':
        if (!link.platformId) {
          throw new Error('Platform ID is required for platform extension repositories');
        }
        const platformExtension = validatePlatformExtension(content);
        this.currentData.platformExtensions.set(link.platformId, platformExtension);
        break;

      case 'theme-override':
        const themeOverrides = validateThemeOverrides(content);
        this.currentData.themeOverrides = themeOverrides;
        break;
    }
  }

  /**
   * Update merged data using the data merger
   */
  private async updateMergedData(): Promise<void> {
    if (!this.currentData.core) {
      this.currentData.mergedData = null;
      this.currentData.analytics = {
        totalTokens: 0,
        overriddenTokens: 0,
        newTokens: 0,
        omittedTokens: 0,
        platformCount: 0,
        themeCount: 0
      };
      return;
    }

    const platformExtensions = Array.from(this.currentData.platformExtensions.values());
    
    const mergedResult = mergeData(
      this.currentData.core,
      platformExtensions,
      this.currentData.themeOverrides
    );

    this.currentData.mergedData = mergedResult;
    this.currentData.analytics = mergedResult.analytics;

    this.callbacks.onDataChanged?.(this.currentData);
  }

  /**
   * Generate a unique link ID
   */
  private generateLinkId(
    type: RepositoryLink['type'],
    repositoryUri: string,
    filePath: string,
    platformId?: string,
    themeId?: string
  ): string {
    const parts = [type, repositoryUri, filePath];
    if (platformId) parts.push(platformId);
    if (themeId) parts.push(themeId);
    return parts.join('|');
  }

  /**
   * Check if a repository is already linked
   */
  isRepositoryLinked(
    type: RepositoryLink['type'],
    repositoryUri: string,
    filePath: string,
    platformId?: string,
    themeId?: string
  ): boolean {
    const linkId = this.generateLinkId(type, repositoryUri, filePath, platformId, themeId);
    return this.linkedRepositories.has(linkId);
  }

  /**
   * Get repository link by ID
   */
  getRepositoryLink(linkId: string): RepositoryLink | undefined {
    return this.linkedRepositories.get(linkId);
  }

  /**
   * Update repository link settings
   */
  async updateRepositoryLink(
    linkId: string,
    updates: Partial<Pick<RepositoryLink, 'branch' | 'filePath'>>
  ): Promise<void> {
    const link = this.linkedRepositories.get(linkId);
    if (!link) return;

    Object.assign(link, updates);
    link.status = 'loading';

    try {
      await this.loadRepositoryData(link);
      await this.updateMergedData();
      
      link.status = 'synced';
      link.lastSync = new Date().toISOString();
    } catch (error) {
      link.status = 'error';
      link.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }
} 