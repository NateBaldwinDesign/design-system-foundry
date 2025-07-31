import { GitHubApiService } from './githubApi';
import { StorageService } from './storage';
import { PermissionManager } from './permissionManager';
import type { Platform, Theme } from '@token-model/data-model';

export interface RepositoryInfo {
  fullName: string;
  branch: string;
  filePath: string;
  fileType: 'schema' | 'platform-extension' | 'theme-override';
}

export interface DataSourceContext {
  currentPlatform: string | null; // null = "none" (core data)
  currentTheme: string | null; // null = "none" (core data)
  availablePlatforms: Platform[];
  availableThemes: Theme[];
  permissions: {
    core: boolean;
    platforms: Record<string, boolean>;
    themes: Record<string, boolean>;
  };
  repositories: {
    core: RepositoryInfo | null;
    platforms: Record<string, RepositoryInfo>;
    themes: Record<string, RepositoryInfo>;
  };
}

export interface DataSourceCallbacks {
  onDataSourceChanged?: (context: DataSourceContext) => void;
  onPermissionsChanged?: (permissions: DataSourceContext['permissions']) => void;
  onError?: (error: string) => void;
}

export class DataSourceManager {
  private static instance: DataSourceManager;
  private callbacks: DataSourceCallbacks = {};
  private currentContext: DataSourceContext = {
    currentPlatform: null,
    currentTheme: null,
    availablePlatforms: [],
    availableThemes: [],
    permissions: {
      core: false,
      platforms: {},
      themes: {}
    },
    repositories: {
      core: null,
      platforms: {},
      themes: {}
    }
  };

  private constructor() {
    this.initializeFromStorage();
  }

  static getInstance(): DataSourceManager {
    if (!DataSourceManager.instance) {
      DataSourceManager.instance = new DataSourceManager();
    }
    return DataSourceManager.instance;
  }

  /**
   * Set callbacks for data source changes
   */
  setCallbacks(callbacks: DataSourceCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Get current data source context
   */
  getCurrentContext(): DataSourceContext {
    return { ...this.currentContext };
  }

  /**
   * Switch to a specific platform
   */
  async switchToPlatform(platformId: string | null): Promise<void> {
    try {
      this.currentContext.currentPlatform = platformId;
      
      // Update permissions for the new context
      await this.updatePermissions();
      
      // Persist to storage
      this.persistToStorage();
      
      // Notify callbacks
      this.callbacks.onDataSourceChanged?.(this.getCurrentContext());
      
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to switch platform');
    }
  }

  /**
   * Switch to a specific theme
   */
  async switchToTheme(themeId: string | null): Promise<void> {
    try {
      this.currentContext.currentTheme = themeId;
      
      // Update permissions for the new context
      await this.updatePermissions();
      
      // Persist to storage
      this.persistToStorage();
      
      // Notify callbacks
      this.callbacks.onDataSourceChanged?.(this.getCurrentContext());
      
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to switch theme');
    }
  }

  /**
   * Update available platforms and themes from current data
   */
  updateAvailableSources(): void {
    try {
      // Get platforms from storage
      const platforms = StorageService.getPlatforms();
      this.currentContext.availablePlatforms = platforms;

      // Get themes from storage
      const themes = StorageService.getThemes();
      this.currentContext.availableThemes = themes;

      // Extract repository information from platforms
      this.currentContext.repositories.platforms = {};
      platforms.forEach(platform => {
        if (platform.extensionSource && platform.extensionSource.repositoryUri !== 'local') {
          this.currentContext.repositories.platforms[platform.id] = {
            fullName: platform.extensionSource.repositoryUri,
            branch: 'main', // Default branch
            filePath: platform.extensionSource.filePath,
            fileType: 'platform-extension'
          };
        }
      });

      // Extract repository information from themes
      this.currentContext.repositories.themes = {};
      console.log('[DataSourceManager] Processing themes:', themes);
      themes.forEach(theme => {
        console.log(`[DataSourceManager] Processing theme ${theme.id}:`, theme);
        if (theme.overrideSource) {
          console.log(`[DataSourceManager] Theme ${theme.id} has overrideSource:`, theme.overrideSource);
          this.currentContext.repositories.themes[theme.id] = {
            fullName: theme.overrideSource.repositoryUri,
            branch: 'main', // Default branch
            filePath: theme.overrideSource.filePath,
            fileType: 'theme-override'
          };
        } else {
          console.log(`[DataSourceManager] Theme ${theme.id} has NO overrideSource`);
        }
      });
      console.log('[DataSourceManager] Final theme repositories:', this.currentContext.repositories.themes);

      // Validate current selections
      this.validateCurrentSelections();
      
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to update available sources');
    }
  }

  /**
   * Update repository information
   */
  updateRepositoryInfo(
    type: 'core' | 'platform-extension' | 'theme-override',
    info: RepositoryInfo | null,
    sourceId?: string
  ): void {
    try {
      switch (type) {
        case 'core':
          this.currentContext.repositories.core = info;
          break;
        case 'platform-extension':
          if (sourceId) {
            this.currentContext.repositories.platforms[sourceId] = info!;
          }
          break;
        case 'theme-override':
          if (sourceId) {
            this.currentContext.repositories.themes[sourceId] = info!;
          }
          break;
      }

      // Persist to storage
      this.persistToStorage();
      
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to update repository info');
    }
  }

  /**
   * Check if user has edit permissions for current data source
   */
  getCurrentEditPermissions(): boolean {
    const { currentPlatform, currentTheme, permissions } = this.currentContext;

    if (currentPlatform && currentPlatform !== 'none') {
      return permissions.platforms[currentPlatform] || false;
    }

    if (currentTheme && currentTheme !== 'none') {
      return permissions.themes[currentTheme] || false;
    }

    return permissions.core;
  }

  /**
   * Get current data source type
   */
  getCurrentDataSourceType(): 'core' | 'platform-extension' | 'theme-override' {
    const { currentPlatform, currentTheme } = this.currentContext;

    if (currentPlatform && currentPlatform !== 'none') {
      return 'platform-extension';
    }

    if (currentTheme && currentTheme !== 'none') {
      return 'theme-override';
    }

    return 'core';
  }

  /**
   * Get current source ID
   */
  getCurrentSourceId(): string | null {
    const { currentPlatform, currentTheme } = this.currentContext;

    if (currentPlatform && currentPlatform !== 'none') {
      return currentPlatform;
    }

    if (currentTheme && currentTheme !== 'none') {
      return currentTheme;
    }

    return null;
  }

  /**
   * Update permissions for all data sources
   */
  async updatePermissions(): Promise<void> {
    try {
      const { repositories } = this.currentContext;
      console.log('[DataSourceManager] Updating permissions for repositories:', {
        core: repositories.core,
        platforms: repositories.platforms,
        themes: repositories.themes
      });
      
      const permissions = {
        core: false,
        platforms: {} as Record<string, boolean>,
        themes: {} as Record<string, boolean>
      };

      // Check core repository permissions
      if (repositories.core) {
        console.log('[DataSourceManager] Checking core repository permissions:', repositories.core.fullName);
        permissions.core = await GitHubApiService.hasWriteAccessToRepository(repositories.core.fullName);
      }

      // Check platform extension repository permissions
      for (const [platformId, repoInfo] of Object.entries(repositories.platforms)) {
        if (repoInfo) {
          console.log('[DataSourceManager] Checking platform repository permissions:', platformId, repoInfo.fullName);
          permissions.platforms[platformId] = await GitHubApiService.hasWriteAccessToRepository(repoInfo.fullName);
        }
      }

      // Check theme override repository permissions
      for (const [themeId, repoInfo] of Object.entries(repositories.themes)) {
        if (repoInfo) {
          console.log('[DataSourceManager] Checking theme repository permissions:', themeId, repoInfo.fullName);
          permissions.themes[themeId] = await GitHubApiService.hasWriteAccessToRepository(repoInfo.fullName);
        }
      }

      console.log('[DataSourceManager] Final permissions:', permissions);
      this.currentContext.permissions = permissions;
      
      // Persist to storage
      this.persistToStorage();
      
      // Notify callbacks
      this.callbacks.onPermissionsChanged?.(permissions);
      
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to update permissions');
    }
  }

  /**
   * Force refresh permissions by clearing cache and re-checking
   */
  async forceRefreshPermissions(): Promise<void> {
    try {
      // Clear permission cache to force fresh checks
      const permissionManager = PermissionManager.getInstance();
      permissionManager.clearCache();
      
      // Re-update permissions
      await this.updatePermissions();
      
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to force refresh permissions');
    }
  }

  /**
   * Initialize from URL parameters
   */
  initializeFromURL(): void {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const platform = urlParams.get('platform');
      const theme = urlParams.get('theme');

      if (platform) {
        this.currentContext.currentPlatform = platform === 'none' ? null : platform;
      }

      if (theme) {
        this.currentContext.currentTheme = theme === 'none' ? null : theme;
      }

      // Validate selections
      this.validateCurrentSelections();
      
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to initialize from URL');
    }
  }

  /**
   * Update URL parameters to reflect current context
   */
  updateURLParameters(): void {
    try {
      const url = new URL(window.location.href);
      const { currentPlatform, currentTheme } = this.currentContext;

      if (currentPlatform) {
        url.searchParams.set('platform', currentPlatform);
      } else {
        url.searchParams.delete('platform');
      }

      if (currentTheme) {
        url.searchParams.set('theme', currentTheme);
      } else {
        url.searchParams.delete('theme');
      }

      window.history.replaceState({}, '', url.toString());
      
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to update URL parameters');
    }
  }

  /**
   * Validate current platform and theme selections
   */
  private validateCurrentSelections(): void {
    const { currentPlatform, currentTheme, availablePlatforms, availableThemes } = this.currentContext;

    // Validate platform selection
    if (currentPlatform && currentPlatform !== 'none') {
      const platformExists = availablePlatforms.some(p => p.id === currentPlatform);
      if (!platformExists) {
        this.currentContext.currentPlatform = null;
      }
    }

    // Validate theme selection
    if (currentTheme && currentTheme !== 'none') {
      const themeExists = availableThemes.some(t => t.id === currentTheme);
      if (!themeExists) {
        this.currentContext.currentTheme = null;
      }
    }
  }

  /**
   * Initialize from storage
   */
  private initializeFromStorage(): void {
    try {
      const storedContext = localStorage.getItem('token-model:data-source-context');
      if (storedContext) {
        const parsed = JSON.parse(storedContext);
        this.currentContext = { ...this.currentContext, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load data source context from storage:', error);
    }
  }

  /**
   * Persist to storage
   */
  private persistToStorage(): void {
    try {
      localStorage.setItem('token-model:data-source-context', JSON.stringify(this.currentContext));
    } catch (error) {
      console.warn('Failed to save data source context to storage:', error);
    }
  }

  /**
   * Clear all data source context
   */
  clear(): void {
    this.currentContext = {
      currentPlatform: null,
      currentTheme: null,
      availablePlatforms: [],
      availableThemes: [],
      permissions: {
        core: false,
        platforms: {},
        themes: {}
      },
      repositories: {
        core: null,
        platforms: {},
        themes: {}
      }
    };

    localStorage.removeItem('token-model:data-source-context');
    
    // Notify callbacks
    this.callbacks.onDataSourceChanged?.(this.getCurrentContext());
  }
} 