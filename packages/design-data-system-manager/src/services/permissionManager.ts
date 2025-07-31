import { GitHubApiService } from './githubApi';

export interface PermissionMap {
  core: boolean;
  platforms: Record<string, boolean>;
  themes: Record<string, boolean>;
}

export interface RepositoryInfo {
  fullName: string;
  branch: string;
  filePath: string;
  fileType: 'schema' | 'platform-extension' | 'theme-override';
}

export interface PermissionCallbacks {
  onPermissionsChanged?: (permissions: PermissionMap) => void;
  onError?: (error: string) => void;
}

export class PermissionManager {
  private static instance: PermissionManager;
  private callbacks: PermissionCallbacks = {};
  private permissionCache: Map<string, { permissions: boolean; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Set callbacks for permission changes
   */
  setCallbacks(callbacks: PermissionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Check permissions for a specific repository
   */
  async checkRepositoryPermissions(repoUri: string): Promise<boolean> {
    try {
      // Check cache first
      const cached = this.permissionCache.get(repoUri);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.permissions;
      }

      // Check permissions via GitHub API
      const hasAccess = await GitHubApiService.hasWriteAccessToRepository(repoUri);

      // Cache the result
      this.permissionCache.set(repoUri, {
        permissions: hasAccess,
        timestamp: Date.now()
      });

      return hasAccess;
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to check repository permissions');
      return false; // Default to no access on error
    }
  }

  /**
   * Check permissions for all repositories
   */
  async checkAllPermissions(repositories: {
    core: RepositoryInfo | null;
    platforms: Record<string, RepositoryInfo>;
    themes: Record<string, RepositoryInfo>;
  }): Promise<PermissionMap> {
    try {
      const permissions: PermissionMap = {
        core: false,
        platforms: {},
        themes: {}
      };

      // Check core repository permissions
      if (repositories.core) {
        permissions.core = await this.checkRepositoryPermissions(repositories.core.fullName);
      }

      // Check platform extension repository permissions
      for (const [platformId, repoInfo] of Object.entries(repositories.platforms)) {
        if (repoInfo) {
          permissions.platforms[platformId] = await this.checkRepositoryPermissions(repoInfo.fullName);
        }
      }

      // Check theme override repository permissions
      for (const [themeId, repoInfo] of Object.entries(repositories.themes)) {
        if (repoInfo) {
          permissions.themes[themeId] = await this.checkRepositoryPermissions(repoInfo.fullName);
        }
      }

      // Notify callbacks
      this.callbacks.onPermissionsChanged?.(permissions);

      return permissions;
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to check all permissions');
      return {
        core: false,
        platforms: {},
        themes: {}
      };
    }
  }

  /**
   * Get current edit permissions based on data source context
   */
  getCurrentEditPermissions(
    currentPlatform: string | null,
    currentTheme: string | null,
    permissions: PermissionMap
  ): boolean {
    if (currentPlatform && currentPlatform !== 'none') {
      return permissions.platforms[currentPlatform] || false;
    }

    if (currentTheme && currentTheme !== 'none') {
      return permissions.themes[currentTheme] || false;
    }

    return permissions.core;
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.permissionCache.clear();
  }

  /**
   * Clear cache for specific repository
   */
  clearCacheForRepository(repoUri: string): void {
    this.permissionCache.delete(repoUri);
  }

  /**
   * Get cached permissions for a repository
   */
  getCachedPermissions(repoUri: string): boolean | null {
    const cached = this.permissionCache.get(repoUri);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.permissions;
    }
    return null;
  }

  /**
   * Check if cache is valid for a repository
   */
  isCacheValid(repoUri: string): boolean {
    const cached = this.permissionCache.get(repoUri);
    return cached !== undefined && Date.now() - cached.timestamp < this.CACHE_DURATION;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
  } {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, cached] of this.permissionCache.entries()) {
      if (now - cached.timestamp < this.CACHE_DURATION) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.permissionCache.size,
      validEntries,
      expiredEntries
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [repoUri, cached] of this.permissionCache.entries()) {
      if (now - cached.timestamp >= this.CACHE_DURATION) {
        this.permissionCache.delete(repoUri);
      }
    }
  }
} 