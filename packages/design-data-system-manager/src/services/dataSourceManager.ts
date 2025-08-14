import { GitHubApiService } from './githubApi';
import { StorageService } from './storage';
import { PermissionManager } from './permissionManager';
import { ChangeTrackingService } from './changeTrackingService';
import { OverrideTrackingService } from './overrideTrackingService';
import { DataEditorService } from './dataEditorService';
import { SourceManagerService } from './sourceManagerService';
import { SourceContextManager } from './sourceContextManager';
import { PlatformSyntaxPatternService } from './platformSyntaxPatternService';
import { RepositoryContextService, type SourceContext } from './repositoryContextService';
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
  
  // NEW: Edit context properties
  editMode: {
    isActive: boolean;
    sourceType: 'core' | 'platform-extension' | 'theme-override';
    sourceId: string | null;
    targetRepository: RepositoryInfo | null;
    validationSchema: 'schema' | 'platform-extension' | 'theme-override';
  };
  
  // NEW: View context properties
  viewMode: {
    isMerged: boolean;
    mergeSources: Array<'core' | 'platform-extension' | 'theme-override'>;
    displayData: 'merged' | 'core-only' | 'platform-only' | 'theme-only';
  };
  
  // NEW: Platform syntax patterns for code generation
  platformSyntaxPatterns: {
    [platformId: string]: {
      prefix?: string;
      suffix?: string;
      delimiter?: '' | '_' | '-' | '.' | '/';
      capitalization?: 'none' | 'camel' | 'uppercase' | 'lowercase' | 'capitalize';
      formatString?: string;
    };
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
  private repositoryContextService: RepositoryContextService;
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
    },
    editMode: {
      isActive: false,
      sourceType: 'core',
      sourceId: null,
      targetRepository: null,
      validationSchema: 'schema'
    },
    viewMode: {
      isMerged: false,
      mergeSources: ['core'],
      displayData: 'core-only'
    },
    platformSyntaxPatterns: {}
  };

  private constructor() {
    this.repositoryContextService = RepositoryContextService.getInstance();
    this.initializeFromStorage();
    
    // CRITICAL: Initialize RepositoryContextService AFTER DataSourceManager is fully set up
    // This ensures DataSourceManager has all the data before RepositoryContextService tries to read it
    setTimeout(() => {
      this.repositoryContextService.initializeFromExistingServices();
    }, 0);
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
   * Setup event listeners for repository context changes
   */
  private setupEventListeners(): void {
    // Listen for repository context changes
    this.repositoryContextService.subscribeToChanges('contextUpdated', (context) => {
      this.syncFromRepositoryContext(context);
    });
  }

  /**
   * Sync from repository context updates
   */
  private syncFromRepositoryContext(context: any): void {
    console.log('[DataSourceManager] Syncing from repository context:', context);
    
    // Transform repository context to DataSourceContext format
    const dataSourceContext = this.transformToDataSourceContext(context);
    
    // Update current context
    this.currentContext = { ...this.currentContext, ...dataSourceContext };
    
    // CRITICAL: Update permissions when repository context changes
    // This ensures permissions are refreshed for the new repository context
    this.updatePermissions().catch(error => {
      console.error('[DataSourceManager] Failed to update permissions after context sync:', error);
    });
    
    // Notify callbacks
    this.callbacks.onDataSourceChanged?.(this.getCurrentContext());
  }

  /**
   * Transform repository context to DataSourceContext format
   */
  private transformToDataSourceContext(repoContext: any): Partial<DataSourceContext> {
    return {
      currentPlatform: repoContext.currentSource?.sourceType === 'platform-extension' 
        ? repoContext.currentSource.sourceId 
        : null,
      currentTheme: repoContext.currentSource?.sourceType === 'theme-override' 
        ? repoContext.currentSource.sourceId 
        : null,
      repositories: {
        core: repoContext.coreRepository,
        platforms: repoContext.platformRepositories,
        themes: repoContext.themeRepositories
      },
      editMode: repoContext.currentSource?.editMode || this.currentContext.editMode,
      viewMode: this.getViewMode(repoContext.currentSource)
    };
  }

  /**
   * Get view mode based on source context
   */
  private getViewMode(sourceContext: any): DataSourceContext['viewMode'] {
    if (!sourceContext) {
      return this.currentContext.viewMode;
    }

    const sourceType = sourceContext.sourceType;
    const isMerged = sourceType !== 'core';
    const mergeSources: Array<'core' | 'platform-extension' | 'theme-override'> = ['core'];
    
    if (sourceType === 'platform-extension') {
      mergeSources.push('platform-extension');
    } else if (sourceType === 'theme-override') {
      mergeSources.push('theme-override');
    }

    const displayData: 'merged' | 'core-only' | 'platform-only' | 'theme-only' = 
      sourceType === 'core' ? 'core-only' :
      sourceType === 'platform-extension' ? 'platform-only' :
      sourceType === 'theme-override' ? 'theme-only' : 'merged';

    return {
      isMerged,
      mergeSources,
      displayData
    };
  }

  /**
   * Get platform name by ID
   */
  private getPlatformName(platformId: string | null): string | null {
    if (!platformId) return null;
    const platform = this.currentContext.availablePlatforms.find(p => p.id === platformId);
    return platform?.name || null;
  }

  /**
   * Get platform repository by ID
   */
  private getPlatformRepository(platformId: string | null): RepositoryInfo | null {
    if (!platformId) return null;
    return this.currentContext.repositories.platforms[platformId] || null;
  }

  /**
   * Get theme name by ID
   */
  private getThemeName(themeId: string | null): string | null {
    if (!themeId) return null;
    const theme = this.currentContext.availableThemes.find(t => t.id === themeId);
    return theme?.displayName || null;
  }

  /**
   * Get theme repository by ID
   */
  private getThemeRepository(themeId: string | null): RepositoryInfo | null {
    if (!themeId) return null;
    return this.currentContext.repositories.themes[themeId] || null;
  }

  /**
   * Get core repository
   */
  private getCoreRepository(): RepositoryInfo | null {
    return this.currentContext.repositories.core;
  }

  /**
   * Get current data source context
   */
  getCurrentContext(): DataSourceContext {
    // Get context from RepositoryContextService
    const repoContext = this.repositoryContextService.getCurrentContext();
    
    // Transform to DataSourceContext format
    const transformedContext = this.transformToDataSourceContext(repoContext);
    
    // Merge with local context for backward compatibility
    return {
      ...this.currentContext,
      ...transformedContext,
      availablePlatforms: this.currentContext.availablePlatforms,
      availableThemes: this.currentContext.availableThemes,
      permissions: this.currentContext.permissions,
      platformSyntaxPatterns: this.currentContext.platformSyntaxPatterns
    };
  }

  /**
   * Switch to a specific platform with change detection
   */
  async switchToPlatform(platformId: string | null): Promise<void> {
    console.log('[DataSourceManager] Switching to platform:', platformId);
    
    try {
      // Use new SourceManagerService for source switching
      const sourceManager = SourceManagerService.getInstance();
      const dataEditor = DataEditorService.getInstance();
      
      // Check for unsaved changes using new service
      const hasChanges = dataEditor.hasLocalChanges();
      
      if (hasChanges) {
        const changeCount = dataEditor.getChangeCount();
        const shouldProceed = await this.showSourceSwitchWarning(changeCount);
        if (!shouldProceed) {
          return; // User cancelled
        }
      }
      
      // Determine source type based on platformId
      const sourceType = platformId ? 'platform' : 'core';
      
      // Switch source using SourceManagerService
      const switchResult = await sourceManager.switchSource(sourceType, platformId || undefined);
      
      if (!switchResult.success) {
        console.error('[DataSourceManager] Failed to switch platform:', switchResult.error);
        this.callbacks.onError?.(switchResult.error || 'Failed to switch platform');
        return;
      }
      
      // Update local state for backward compatibility
      this.currentContext.currentPlatform = platformId;
      this.updateEditModeContext();
      this.updateViewModeContext();
      
      // CRITICAL: Update available sources FIRST to populate repository info
      await this.updateAvailableSources();
      
      // CRITICAL: Update RepositoryContextService AFTER repository info is populated
      const updates: Partial<SourceContext> = {
        sourceType: platformId ? 'platform-extension' : 'core',
        sourceId: platformId,
        sourceName: this.getPlatformName(platformId),
        repositoryInfo: platformId ? this.getPlatformRepository(platformId) : this.getCoreRepository(),
        schemaType: platformId ? 'platform-extension' : 'schema'
      };
      
      this.repositoryContextService.updateSourceContext(updates);
      
      // CRITICAL: Update edit mode context AFTER repository info is populated
      this.updateEditModeContext();
      
      // Update permissions for the new context (now with populated repository info)
      await this.updatePermissions();
      
      // CRITICAL: Update SourceContextManager with current context
      const sourceContextManager = SourceContextManager.getInstance();
      sourceContextManager.updateFromDataSource();
      
      // Persist to storage
      this.persistToStorage();
      // Notify callbacks
      this.callbacks.onDataSourceChanged?.(this.getCurrentContext());
      
      console.log('[DataSourceManager] Platform switch completed successfully');
    } catch (error) {
      console.error('[DataSourceManager] Platform switch failed:', error);
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to switch platform');
      throw error;
    }
  }

  /**
   * Switch to a specific theme with change detection
   */
  async switchToTheme(themeId: string | null): Promise<void> {
    try {
      // Use new SourceManagerService for source switching
      const sourceManager = SourceManagerService.getInstance();
      const dataEditor = DataEditorService.getInstance();
      
      // Check for unsaved changes using new service
      const hasChanges = dataEditor.hasLocalChanges();
      
      if (hasChanges) {
        const changeCount = dataEditor.getChangeCount();
        const shouldProceed = await this.showSourceSwitchWarning(changeCount);
        if (!shouldProceed) {
          return; // User cancelled
        }
      }
      
      // Determine source type based on themeId
      const sourceType = themeId ? 'theme' : 'core';
      
      // Switch source using SourceManagerService
      const switchResult = await sourceManager.switchSource(sourceType, themeId || undefined);
      
      if (!switchResult.success) {
        console.error('[DataSourceManager] Failed to switch theme:', switchResult.error);
        this.callbacks.onError?.(switchResult.error || 'Failed to switch theme');
        return;
      }
      
      // Update local state for backward compatibility
      this.currentContext.currentTheme = themeId;
      this.updateViewModeContext();
      this.updateBaselineForCurrentSource();
      
      // CRITICAL: Update available sources FIRST to populate repository info
      await this.updateAvailableSources();
      
      // CRITICAL: Update RepositoryContextService AFTER repository info is populated
      const updates: Partial<SourceContext> = {
        sourceType: themeId ? 'theme-override' : 'core',
        sourceId: themeId,
        sourceName: this.getThemeName(themeId),
        repositoryInfo: themeId ? this.getThemeRepository(themeId) : this.getCoreRepository(),
        schemaType: themeId ? 'theme-override' : 'schema'
      };
      
      this.repositoryContextService.updateSourceContext(updates);
      
      // CRITICAL: Update edit mode context AFTER repository info is populated
      this.updateEditModeContext();
      
      // Update permissions for the new context (now with populated repository info)
      await this.updatePermissions();
      
      // CRITICAL: Update SourceContextManager with current context
      const sourceContextManager = SourceContextManager.getInstance();
      sourceContextManager.updateFromDataSource();
      
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
  async updateAvailableSources(): Promise<void> {
    try {
      // Get platforms from storage
      const platforms = StorageService.getPlatforms();
      this.currentContext.availablePlatforms = platforms;

      // Get themes from storage
      const themes = StorageService.getThemes();
      this.currentContext.availableThemes = themes;

      // Extract repository information from platforms
      this.currentContext.repositories.platforms = {};
      console.log('[DataSourceManager] Processing platforms:', platforms);
      
      // Filter out example/placeholder platforms
      const validPlatforms = platforms.filter(platform => {
        if (!platform.extensionSource) {
          console.log(`[DataSourceManager] Platform ${platform.id} has NO extensionSource`);
          return false;
        }
        
        const { repositoryUri } = platform.extensionSource;
        
        console.log(`[DataSourceManager] Platform ${platform.id} has valid extensionSource:`, platform.extensionSource);
        return true;
      });
      
      validPlatforms.forEach(platform => {
        this.currentContext.repositories.platforms[platform.id] = {
          fullName: platform.extensionSource!.repositoryUri,
          branch: 'main', // Default branch
          filePath: platform.extensionSource!.filePath,
          fileType: 'platform-extension'
        };
      });
      
      console.log('[DataSourceManager] Final platform repositories:', this.currentContext.repositories.platforms);

      // CRITICAL: Also populate repository information for dynamically loaded platforms
      // This handles platforms that are loaded from external sources but not in core data
      await this.populateDynamicPlatformRepositories();

      // Extract repository information from themes
      this.currentContext.repositories.themes = {};
      console.log('[DataSourceManager] Processing themes:', themes);
      
      // Filter out example/placeholder themes
      const validThemes = themes.filter(theme => {
        if (!theme.overrideSource) {
          console.log(`[DataSourceManager] Theme ${theme.id} has NO overrideSource`);
          return false;
        }
        
        console.log(`[DataSourceManager] Theme ${theme.id} has valid overrideSource:`, theme.overrideSource);
        return true;
      });
      
      validThemes.forEach(theme => {
        this.currentContext.repositories.themes[theme.id] = {
          fullName: theme.overrideSource!.repositoryUri,
          branch: 'main', // Default branch
          filePath: theme.overrideSource!.filePath,
          fileType: 'theme-override'
        };
      });
      
      console.log('[DataSourceManager] Final theme repositories:', this.currentContext.repositories.themes);

      // Validate current selections
      this.validateCurrentSelections();
      
      // Collect syntax patterns from all platforms
      console.log('[DataSourceManager] Calling collectAndStoreSyntaxPatterns in updateAvailableSources');
      PlatformSyntaxPatternService.getInstance().collectAndStoreSyntaxPatterns().catch((error: unknown) => {
        console.error('[DataSourceManager] Error collecting syntax patterns:', error);
      });
      
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
    console.log('[DataSourceManager] getCurrentEditPermissions - Starting permission check');
    
    // CRITICAL: Always use the working permission logic as primary source
    const { currentPlatform, currentTheme, permissions } = this.currentContext;
    console.log('[DataSourceManager] getCurrentEditPermissions - Current context:', { currentPlatform, currentTheme, permissions });

    // Check platform permissions
    if (currentPlatform && currentPlatform !== 'none') {
      const platformPermission = permissions.platforms[currentPlatform] || false;
      console.log('[DataSourceManager] getCurrentEditPermissions - Platform permission:', platformPermission);
      return platformPermission;
    }

    // Check theme permissions
    if (currentTheme && currentTheme !== 'none') {
      const themePermission = permissions.themes[currentTheme] || false;
      console.log('[DataSourceManager] getCurrentEditPermissions - Theme permission:', themePermission);
      return themePermission;
    }

    // Check core permissions
    const corePermission = permissions.core || false;
    console.log('[DataSourceManager] getCurrentEditPermissions - Core permission:', corePermission);
    return corePermission;
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
      
      // CRITICAL: Update RepositoryContextService with current repository information
      // This ensures the unified service has the correct repository info for permission checks
      this.updateRepositoryContextService();
      
      // Persist to storage
      this.persistToStorage();
      
      // Notify callbacks
      this.callbacks.onPermissionsChanged?.(permissions);
      
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error.message : 'Failed to update permissions');
    }
  }

  /**
   * Update RepositoryContextService with current repository information
   */
  private updateRepositoryContextService(): void {
    try {
      console.log('[DataSourceManager] Updating RepositoryContextService with current context');
      
      // Get current context and update RepositoryContextService
      const currentContext = this.getCurrentContext();
      this.repositoryContextService.mergeFromDataSourceContext(currentContext);
      
      console.log('[DataSourceManager] RepositoryContextService updated successfully');
    } catch (error) {
      console.error('[DataSourceManager] Failed to update RepositoryContextService:', error);
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
      const repo = urlParams.get('repo');
      const path = urlParams.get('path');
      const branch = urlParams.get('branch') || 'main';

      if (platform) {
        this.currentContext.currentPlatform = platform === 'none' ? null : platform;
      }

      if (theme) {
        this.currentContext.currentTheme = theme === 'none' ? null : theme;
      }

      // CRITICAL: Set up core repository information from URL parameters
      if (repo && path) {
        this.currentContext.repositories.core = {
          fullName: repo,
          branch: branch,
          filePath: path,
          fileType: 'schema'
        };
        console.log('[DataSourceManager] Set core repository from URL:', this.currentContext.repositories.core);
      }

      // Validate selections
      this.validateCurrentSelections();
      
      // CRITICAL: Update RepositoryContextService with the new repository information
      this.updateRepositoryContextService();
      
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
      },
      editMode: {
        isActive: false,
        sourceType: 'core',
        sourceId: null,
        targetRepository: null,
        validationSchema: 'schema'
      },
      viewMode: {
        isMerged: false,
        mergeSources: ['core'],
        displayData: 'core-only'
      },
      platformSyntaxPatterns: {}
    };

    localStorage.removeItem('token-model:data-source-context');
    
    // Notify callbacks
    this.callbacks.onDataSourceChanged?.(this.getCurrentContext());
  }

  /**
   * Update edit mode context based on current platform/theme selection
   */
  private updateEditModeContext(): void {
    const { currentPlatform, currentTheme, repositories } = this.currentContext;
    
    // Determine edit source type and target repository
    if (currentPlatform && currentPlatform !== 'none') {
      // Platform extension editing
      this.currentContext.editMode = {
        isActive: false, // Will be activated when user enters edit mode
        sourceType: 'platform-extension',
        sourceId: currentPlatform,
        targetRepository: repositories.platforms[currentPlatform] || null,
        validationSchema: 'platform-extension'
      };
    } else if (currentTheme && currentTheme !== 'none') {
      // Theme override editing
      this.currentContext.editMode = {
        isActive: false, // Will be activated when user enters edit mode
        sourceType: 'theme-override',
        sourceId: currentTheme,
        targetRepository: repositories.themes[currentTheme] || null,
        validationSchema: 'theme-override'
      };
    } else {
      // Core data editing
      this.currentContext.editMode = {
        isActive: false, // Will be activated when user enters edit mode
        sourceType: 'core',
        sourceId: null,
        targetRepository: repositories.core,
        validationSchema: 'schema'
      };
    }
  }

  /**
   * Update view mode context based on current platform/theme selection
   */
  private updateViewModeContext(): void {
    const { currentPlatform, currentTheme } = this.currentContext;
    
    const mergeSources: Array<'core' | 'platform-extension' | 'theme-override'> = ['core'];
    let displayData: 'merged' | 'core-only' | 'platform-only' | 'theme-only' = 'core-only';
    let isMerged = false;

    if (currentPlatform && currentPlatform !== 'none') {
      mergeSources.push('platform-extension');
      isMerged = true;
      displayData = currentTheme && currentTheme !== 'none' ? 'merged' : 'platform-only';
    }

    if (currentTheme && currentTheme !== 'none') {
      mergeSources.push('theme-override');
      isMerged = true;
      displayData = currentPlatform && currentPlatform !== 'none' ? 'merged' : 'theme-only';
    }

    this.currentContext.viewMode = {
      isMerged,
      mergeSources,
      displayData
    };
  }

  /**
   * Enter edit mode for current data source
   */
  enterEditMode(): void {
    this.currentContext.editMode.isActive = true;
    
    // CRITICAL: Sync current platform/theme with edit mode context
    if (this.currentContext.editMode.sourceType === 'platform-extension' && this.currentContext.editMode.sourceId) {
      this.currentContext.currentPlatform = this.currentContext.editMode.sourceId;
      console.log(`[DataSourceManager] Entering edit mode for platform: ${this.currentContext.editMode.sourceId}`);
    } else if (this.currentContext.editMode.sourceType === 'theme-override' && this.currentContext.editMode.sourceId) {
      this.currentContext.currentTheme = this.currentContext.editMode.sourceId;
      console.log(`[DataSourceManager] Entering edit mode for theme: ${this.currentContext.editMode.sourceId}`);
    } else if (this.currentContext.editMode.sourceType === 'core') {
      this.currentContext.currentPlatform = null;
      this.currentContext.currentTheme = null;
      console.log('[DataSourceManager] Entering edit mode for core data');
    }
    
    // Initialize override tracking session for platform/theme editing
    OverrideTrackingService.initializeSession(this.currentContext);
    
    // CRITICAL: Update SourceContextManager with current context
    const sourceContextManager = SourceContextManager.getInstance();
    sourceContextManager.updateFromDataSource();
    
    this.persistToStorage();
    this.callbacks.onDataSourceChanged?.(this.getCurrentContext());
  }

  /**
   * Exit edit mode
   */
  exitEditMode(): void {
    this.currentContext.editMode.isActive = false;
    
    // Clear override tracking session when exiting edit mode
    OverrideTrackingService.clearSession();
    
    this.persistToStorage();
    this.callbacks.onDataSourceChanged?.(this.getCurrentContext());
  }

  /**
   * Get current edit mode information
   */
  getCurrentEditMode(): DataSourceContext['editMode'] {
    return { ...this.currentContext.editMode };
  }

  /**
   * Get current view mode information
   */
  getCurrentViewMode(): DataSourceContext['viewMode'] {
    return { ...this.currentContext.viewMode };
  }

  /**
   * Update platform syntax patterns in the current context
   */
  updatePlatformSyntaxPatterns(patterns: DataSourceContext['platformSyntaxPatterns']): void {
    console.log('[DataSourceManager] Updating platform syntax patterns:', {
      patterns,
      patternsKeys: Object.keys(patterns || {}),
      patternsCount: Object.keys(patterns || {}).length
    });
    
    this.currentContext.platformSyntaxPatterns = patterns;
    
    // Trigger callback if provided
    if (this.callbacks.onDataSourceChanged) {
      this.callbacks.onDataSourceChanged(this.currentContext);
    }
    
    console.log('[DataSourceManager] Platform syntax patterns updated successfully');
  }

  /**
   * Update baseline for the current merged data state
   * This ensures the change log compares against the correct merged baseline
   */
  private updateBaselineForCurrentSource(): void {
    // Get the current merged data snapshot (what the user sees)
    const currentDataSnapshot = ChangeTrackingService.getCurrentDataSnapshot();
    
    if (currentDataSnapshot) {
      // Set the baseline to the current merged state
      // This ensures change tracking compares against the merged data, not individual sources
      ChangeTrackingService.setBaselineData(currentDataSnapshot);
    }
  }

  /**
   * Show warning dialog for source switching with unsaved changes
   */
  private async showSourceSwitchWarning(changeCount: number): Promise<boolean> {
    // This will be handled by the UI layer through callbacks
    // For now, return true to allow switching (UI will handle the warning)
    return new Promise((resolve) => {
      // Dispatch custom event for UI to handle
      const event = new CustomEvent('token-model:source-switch-warning', {
        detail: {
          changeCount,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false)
        }
      });
      window.dispatchEvent(event);
    });
  }

  /**
   * Reset to main branch for the specified source
   */
  private async resetToMainBranchForSource(
    sourceType: 'platform-extension' | 'theme-override',
    sourceId: string | null
  ): Promise<void> {
    try {
      if (!sourceId) return;
      
      const repository = sourceType === 'platform-extension' 
        ? this.currentContext.repositories.platforms[sourceId]
        : this.currentContext.repositories.themes[sourceId];
      
      if (repository && repository.branch !== 'main') {
        // Update repository branch to main
        this.updateRepositoryInfo(sourceType, {
          ...repository,
          branch: 'main'
        }, sourceId);
        
        // Clear change tracking for this source
        ChangeTrackingService.clearOverrideChanges();
        
        // Notify that branch was reset
        this.callbacks.onDataSourceChanged?.(this.getCurrentContext());
      }
    } catch (error) {
      console.error('Failed to reset to main branch:', error);
    }
  }

  /**
   * Populate repository information for dynamically loaded platforms
   * This handles platforms that are loaded from external sources but not in core data
   */
  private async populateDynamicPlatformRepositories(): Promise<void> {
    try {
      // Get platform extension data from storage (dynamically loaded platforms)
      const platformExtensionData = StorageService.getPlatformExtensionData();
      console.log('[DataSourceManager] Populating dynamic platform repositories from:', platformExtensionData);
      
      if (!platformExtensionData) {
        console.log('[DataSourceManager] No dynamic platform data found');
        return;
      }

      // Process each dynamically loaded platform
      for (const [platformId, platformData] of Object.entries(platformExtensionData)) {
        // Skip if already in repositories (from core data)
        if (this.currentContext.repositories.platforms[platformId]) {
          console.log(`[DataSourceManager] Platform ${platformId} already in repositories, skipping`);
          continue;
        }

        // Try to get repository information from core data first
        const coreData = StorageService.getCoreData();
        const platform = coreData?.platforms?.find(p => p.id === platformId);
        
        if (platform?.extensionSource) {
          console.log(`[DataSourceManager] Adding dynamic platform ${platformId} with repository from core data: ${platform.extensionSource.repositoryUri}`);
          
          this.currentContext.repositories.platforms[platformId] = {
            fullName: platform.extensionSource.repositoryUri,
            branch: 'main', // Default branch
            filePath: platform.extensionSource.filePath,
            fileType: 'platform-extension'
          };
        } else {
          console.log(`[DataSourceManager] Platform ${platformId} not found in core data, trying to get from source context`);
          
                  // Try to get from source context (for dynamically loaded platforms)
        const sourceContext = StorageService.getSourceContext();
        if (sourceContext?.sourceType === 'platform' && sourceContext.sourceId === platformId) {
          console.log(`[DataSourceManager] Adding dynamic platform ${platformId} with repository from source context: ${sourceContext.sourceRepository.fullName}`);
          
          this.currentContext.repositories.platforms[platformId] = {
            fullName: sourceContext.sourceRepository.fullName,
            branch: sourceContext.sourceRepository.branch,
            filePath: sourceContext.sourceRepository.filePath,
            fileType: 'platform-extension'
          };
        } else {
          // Try to get from core data as a fallback
          const coreData = StorageService.getCoreData();
          const platform = coreData?.platforms?.find(p => p.id === platformId);
          
          if (platform?.extensionSource) {
            console.log(`[DataSourceManager] Adding dynamic platform ${platformId} with repository from core data: ${platform.extensionSource.repositoryUri}`);
            
            this.currentContext.repositories.platforms[platformId] = {
              fullName: platform.extensionSource.repositoryUri,
              branch: 'main', // Default branch
              filePath: platform.extensionSource.filePath,
              fileType: 'platform-extension'
            };
          } else {
            console.log(`[DataSourceManager] Platform ${platformId} has no repository information available`);
          }
        }
        }
      }
      
      console.log('[DataSourceManager] Final repositories after dynamic population:', this.currentContext.repositories.platforms);
    } catch (error) {
      console.error('[DataSourceManager] Error populating dynamic platform repositories:', error);
    }
  }
} 