import { GitHubApiService } from './githubApi';
import { GitHubAuthService } from './githubAuth';
import { DataManager } from './dataManager';
import { DataTypeDetector, type DataType } from './dataTypeDetector';
import type { 
  TokenSystem, 
  ThemeOverrides,
  PlatformExtension
} from '@token-model/data-model';
import { 
  validateTokenSystem, 
  validateThemeOverrides,
  validatePlatformExtension
} from '@token-model/data-model';

// Import data merging functionality
import { mergeData } from '@token-model/data-model';

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

  private constructor() {
    // Load persisted data on initialization
    this.loadPersistedData();
  }

  private dataManager = DataManager.getInstance();

  /**
   * Detect the current data type based on loaded data
   */
  private detectCurrentDataType(snapshot: any): DataType {
    // Check if we have core data indicators
    if (snapshot.tokenCollections && snapshot.tokenCollections.length > 0) {
      return 'core';
    }
    
    // Check if we have extension data indicators
    if (snapshot.platformExtensions && Object.keys(snapshot.platformExtensions).length > 0) {
      return 'extension';
    }
    
    // Default to core if we can't determine
    return 'core';
  }

  static getInstance(): MultiRepositoryManager {
    if (!MultiRepositoryManager.instance) {
      MultiRepositoryManager.instance = new MultiRepositoryManager();
    }
    return MultiRepositoryManager.instance;
  }

  /**
   * Load persisted data from DataManager
   */
  private loadPersistedData(): void {
    try {
      const snapshot = this.dataManager.getCurrentSnapshot();
      
      // Load linked repositories
      this.linkedRepositories.clear();
      snapshot.linkedRepositories.forEach((repo: any) => {
        this.linkedRepositories.set(repo.id, repo);
      });

      // Load platform extensions
      this.currentData.platformExtensions.clear();
      Object.entries(snapshot.platformExtensions).forEach(([platformId, extension]) => {
        this.currentData.platformExtensions.set(platformId, extension as PlatformExtension);
      });

      // Load theme overrides
      this.currentData.themeOverrides = snapshot.themeOverrides as ThemeOverrides | null;

      console.log('[MultiRepositoryManager] Loaded persisted data:', {
        repositories: this.linkedRepositories.size,
        platformExtensions: this.currentData.platformExtensions.size,
        hasThemeOverrides: !!this.currentData.themeOverrides
      });
    } catch (error) {
      console.error('[MultiRepositoryManager] Failed to load persisted data:', error);
    }
  }

  /**
   * Persist current data through DataManager
   */
  private persistData(): void {
    try {
      // Get current snapshot
      const currentSnapshot = this.dataManager.getCurrentSnapshot();
      
      // Update with MultiRepositoryManager data
      const updatedSnapshot = {
        ...currentSnapshot,
        linkedRepositories: Array.from(this.linkedRepositories.values()),
        platformExtensions: Object.fromEntries(this.currentData.platformExtensions),
        themeOverrides: this.currentData.themeOverrides
      };

      // Update through DataManager
      this.dataManager.updateData(updatedSnapshot);

      console.log('[MultiRepositoryManager] Persisted data through DataManager');
    } catch (error) {
      console.error('[MultiRepositoryManager] Failed to persist data:', error);
    }
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
    // Get current data type to enforce linking restrictions
    const currentSnapshot = this.dataManager.getCurrentSnapshot();
    const currentDataType = this.detectCurrentDataType(currentSnapshot);
    
    // Enforce linking restrictions based on current data type
    if (currentDataType === 'core' && type !== 'platform-extension') {
      throw new Error('Core data can only link to platform extension repositories');
    }
    
    if (currentDataType === 'extension' && type !== 'core') {
      throw new Error('Extension data can only link to core repositories');
    }
    
    // For extension data, ensure only one core link exists
    if (currentDataType === 'extension' && type === 'core') {
      const existingCoreLinks = Array.from(this.linkedRepositories.values())
        .filter(link => link.type === 'core');
      if (existingCoreLinks.length > 0) {
        throw new Error('Extension data can only have one core repository link');
      }
    }

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
    this.persistData(); // Persist the new repository link
    this.callbacks.onRepositoryLinked?.(link);

    try {
      // Load data from the repository
      await this.loadRepositoryData(link);
      
      // Update merged data
      await this.updateMergedData();
      
      link.status = 'synced';
      link.lastSync = new Date().toISOString();
      this.persistData(); // Persist updated status
      
    } catch (error) {
      link.status = 'error';
      link.error = error instanceof Error ? error.message : 'Unknown error';
      this.persistData(); // Persist error status
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
    this.persistData(); // Persist the removal
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
    this.persistData(); // Persist the data changes
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
      try {
        // Basic validation - check if extension has required fields
        const isValid = !!(extension.systemId && extension.platformId && extension.version);
        const errors: string[] = [];
        const warnings: string[] = [];
        
        if (!extension.systemId) errors.push('Missing systemId');
        if (!extension.platformId) errors.push('Missing platformId');
        if (!extension.version) errors.push('Missing version');
        
        // Check system ID match if core data exists
        if (this.currentData.core && extension.systemId !== this.currentData.core.systemId) {
          errors.push(`System ID mismatch: extension has "${extension.systemId}", core has "${this.currentData.core.systemId}"`);
        }
        
        results.push({
          platformId,
          isValid,
          errors,
          warnings
        });
      } catch (error) {
        results.push({
          platformId,
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: []
        });
      }
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
    console.log('[MultiRepositoryManager] Loading repository data:', link);
    
    const accessToken = await GitHubAuthService.getValidAccessToken();
    
    const fileContent = await GitHubApiService.getFileContent(
      link.repositoryUri,
      link.filePath,
      link.branch
    );

    console.log('[MultiRepositoryManager] File content received:', {
      size: fileContent.content.length,
      encoding: fileContent.encoding
    });

    const content = JSON.parse(fileContent.content);
    console.log('[MultiRepositoryManager] Parsed content keys:', Object.keys(content));

    // Auto-detect file type based on content structure
    const detectedType = this.detectFileType(content);
    console.log('[MultiRepositoryManager] Detected file type:', detectedType, 'vs requested type:', link.type);

    // Warn if detected type doesn't match requested type
    if (detectedType !== link.type) {
      console.warn(`[MultiRepositoryManager] File type mismatch! Detected: ${detectedType}, Requested: ${link.type}`);
    }

    try {
      switch (detectedType) {
        case 'core': {
          console.log('[MultiRepositoryManager] Validating core data...');
          const coreData = validateTokenSystem(content);
          this.currentData.core = coreData;
          console.log('[MultiRepositoryManager] Core data validated and stored');
          break;
        }

        case 'platform-extension': {
          // Auto-extract platform ID from file content if not provided
          let platformId = link.platformId;
          if (!platformId && content.platformId) {
            platformId = content.platformId;
            console.log('[MultiRepositoryManager] Auto-extracted platform ID from file:', platformId);
          }
          
          if (!platformId) {
            throw new Error('Platform ID is required for platform extension repositories. Please provide it in the UI or ensure the file contains a platformId field.');
          }
          
          console.log('[MultiRepositoryManager] Validating platform extension data...');
          const platformExtension = validatePlatformExtension(content);
          this.currentData.platformExtensions.set(platformId, platformExtension);
          console.log('[MultiRepositoryManager] Platform extension validated and stored for platform:', platformId);
          break;
        }

        case 'theme-override': {
          console.log('[MultiRepositoryManager] Validating theme override data...');
          const themeOverrides = validateThemeOverrides(content);
          this.currentData.themeOverrides = themeOverrides;
          console.log('[MultiRepositoryManager] Theme override validated and stored');
          break;
        }
      }
    } catch (error) {
      console.error('[MultiRepositoryManager] Validation error:', error);
      throw error;
    }
  }

  /**
   * Auto-detect file type based on content structure
   */
  private detectFileType(content: Record<string, unknown>): 'core' | 'platform-extension' | 'theme-override' {
    // Check for core schema structure
    if (content.tokenCollections && content.dimensions && content.tokens && content.platforms) {
      return 'core';
    }
    
    // Check for platform extension structure
    if (content.systemId && content.platformId && content.version) {
      return 'platform-extension';
    }
    
    // Check for theme override structure
    if (content.systemId && content.themeId && content.tokenOverrides) {
      return 'theme-override';
    }
    
    throw new Error('Unable to detect file type. File does not match any known schema structure.');
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