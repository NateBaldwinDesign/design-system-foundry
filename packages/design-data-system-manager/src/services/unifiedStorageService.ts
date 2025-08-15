import { StorageService } from './storage';
import { DataSourceManager } from './dataSourceManager';
import { RepositoryContextService } from './repositoryContextService';
import { DataManager } from './dataManager';

// Types for the unified service
export interface UnifiedDataContext {
  // Current source information
  sourceType: 'core' | 'platform-extension' | 'theme-override';
  sourceId: string | null;
  sourceName: string | null;
  
  // Repository information
  repositoryInfo: RepositoryInfo | null;
  schemaType: 'schema' | 'platform-extension' | 'theme-override';
  
  // Permissions
  permissions: PermissionMap;
  
  // Data
  data: unknown;
  
  // Edit mode
  editMode: {
    isActive: boolean;
    sourceType: string;
    sourceId: string | null;
    targetRepository: RepositoryInfo | null;
  };
  
  // View mode
  viewMode: {
    isMerged: boolean;
    mergeSources: string[];
    displayData: string;
  };
}

export interface RepositoryInfo {
  fullName: string;
  branch: string;
  filePath: string;
  fileType: 'schema' | 'platform-extension' | 'theme-override';
  hasWriteAccess?: boolean;
}

export interface PermissionMap {
  core: boolean;
  platforms: Record<string, boolean>;
  themes: Record<string, boolean>;
}

export interface SourceContext {
  sourceType: 'core' | 'platform-extension' | 'theme-override';
  sourceId: string | null;
  sourceName: string | null;
  repositoryInfo: RepositoryInfo | null;
  schemaType: 'schema' | 'platform-extension' | 'theme-override';
  editMode: {
    isActive: boolean;
    sourceType: string;
    sourceId: string | null;
    targetRepository: RepositoryInfo | null;
  };
  viewMode: {
    isMerged: boolean;
    mergeSources: string[];
    displayData: string;
  };
}

/**
 * Unified Storage Service
 * 
 * This service consolidates all data storage operations into a single, unified API.
 * It serves as the single source of truth for all data operations in the application.
 * 
 * Responsibilities:
 * - Data storage and retrieval
 * - Source management (core, platform, theme)
 * - Permission management
 * - Repository information management
 * - Edit mode management
 * - State synchronization
 */
export class UnifiedStorageService {
  private static instance: UnifiedStorageService;
  
  // Dependencies
  private storageService: StorageService;
  private dataSourceManager: DataSourceManager;
  private repositoryContextService: RepositoryContextService;
  private dataManager: DataManager;
  
  // Unified state
  private unifiedContext: UnifiedDataContext;
  
  // Event listeners
  private eventListeners: Map<string, Set<(context: UnifiedDataContext) => void>>;
  
  private constructor() {
    console.log('[UnifiedStorageService] Initializing new instance');
    
    // Initialize dependencies
    this.storageService = StorageService;
    this.dataSourceManager = DataSourceManager.getInstance();
    this.repositoryContextService = RepositoryContextService.getInstance();
    this.dataManager = DataManager.getInstance();
    
    // Initialize unified context
    this.unifiedContext = this.getInitialContext();
    
    // Initialize event system
    this.eventListeners = new Map();
    
    // Set up synchronization with existing services
    this.setupServiceSynchronization();
    
    console.log('[UnifiedStorageService] Initialization completed');
  }
  
  public static getInstance(): UnifiedStorageService {
    if (!UnifiedStorageService.instance) {
      UnifiedStorageService.instance = new UnifiedStorageService();
    }
    return UnifiedStorageService.instance;
  }
  
  // ============================================================================
  // PUBLIC API - Data Access
  // ============================================================================
  
  /**
   * Get data for the specified type
   */
  async getData(type: 'schema' | 'platform-extension' | 'theme-override'): Promise<unknown> {
    console.log('[UnifiedStorageService] Getting data for type:', type);
    
    try {
      // For now, return the current snapshot from DataManager
      // This will be enhanced as we implement the unified system
      const snapshot = this.dataManager.getCurrentSnapshot();
      
      switch (type) {
        case 'schema':
          return snapshot;
        case 'platform-extension':
          return snapshot.platformExtensions;
        case 'theme-override':
          return snapshot.themeOverrides;
        default:
          throw new Error(`Unknown data type: ${type}`);
      }
    } catch (error) {
      console.error('[UnifiedStorageService] Error getting data:', error);
      throw error;
    }
  }
  
  /**
   * Set data for the specified type
   */
  async setData(type: 'schema' | 'platform-extension' | 'theme-override', data: unknown): Promise<void> {
    console.log('[UnifiedStorageService] Setting data for type:', type);
    
    try {
      // For now, this is a placeholder
      // This will be enhanced as we implement the unified system
      console.log('[UnifiedStorageService] Setting data (placeholder):', { type, data });
      
      // Update unified context
      this.unifiedContext.data = data;
      this.notifyListeners('dataUpdated', this.unifiedContext);
      
    } catch (error) {
      console.error('[UnifiedStorageService] Error setting data:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // PUBLIC API - Source Management
  // ============================================================================
  
  /**
   * Get current source context
   */
  getCurrentSource(): SourceContext {
    console.log('[UnifiedStorageService] Getting current source');
    return this.unifiedContext as SourceContext;
  }
  
  /**
   * Switch to a different source
   */
  async switchSource(type: 'core' | 'platform-extension' | 'theme-override', id: string | null): Promise<void> {
    console.log('[UnifiedStorageService] Switching source:', { type, id });
    
    try {
      switch (type) {
        case 'core':
          await this.dataSourceManager.switchToPlatform(null);
          await this.dataSourceManager.switchToTheme(null);
          break;
        case 'platform-extension':
          if (id) {
            await this.dataSourceManager.switchToPlatform(id);
          }
          break;
        case 'theme-override':
          if (id) {
            await this.dataSourceManager.switchToTheme(id);
          }
          break;
        default:
          throw new Error(`Unknown source type: ${type}`);
      }
      
      // Update unified context
      this.updateUnifiedContext();
      
    } catch (error) {
      console.error('[UnifiedStorageService] Error switching source:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // PUBLIC API - Permission Management
  // ============================================================================
  
  /**
   * Get all permissions
   */
  getPermissions(): PermissionMap {
    console.log('[UnifiedStorageService] Getting permissions');
    return this.unifiedContext.permissions;
  }
  
  /**
   * Check permission for a specific source
   */
  checkPermission(sourceId: string): boolean {
    console.log('[UnifiedStorageService] Checking permission for:', sourceId);
    
    const { permissions, sourceType, sourceId: currentSourceId } = this.unifiedContext;
    
    // Check if this is the current source
    if (sourceId === currentSourceId) {
      switch (this.unifiedContext.sourceType) {
        case 'platform-extension':
          return permissions.platforms[sourceId] || false;
        case 'theme-override':
          return permissions.themes[sourceId] || false;
        case 'core':
          return permissions.core;
        default:
          return false;
      }
    }
    
    // Check specific source permissions
    if (permissions.platforms[sourceId] !== undefined) {
      return permissions.platforms[sourceId];
    }
    
    if (permissions.themes[sourceId] !== undefined) {
      return permissions.themes[sourceId];
    }
    
    return false;
  }
  
  /**
   * Check if user has edit permissions for current source
   */
  hasEditPermissions(): boolean {
    console.log('[UnifiedStorageService] Checking edit permissions for current source');
    
    const { sourceType, sourceId, permissions } = this.unifiedContext;
    
    switch (sourceType) {
      case 'platform-extension':
        if (sourceId) {
          return permissions.platforms[sourceId] || false;
        }
        break;
      case 'theme-override':
        if (sourceId) {
          return permissions.themes[sourceId] || false;
        }
        break;
      case 'core':
        return permissions.core;
    }
    
    return false;
  }
  
  // ============================================================================
  // PUBLIC API - Repository Management
  // ============================================================================
  
  /**
   * Get repository information for a source
   */
  getRepositoryInfo(sourceId: string): RepositoryInfo | null {
    console.log('[UnifiedStorageService] Getting repository info for:', sourceId);
    
    const { sourceType, sourceId: currentSourceId, repositoryInfo } = this.unifiedContext;
    
    // If this is the current source, return current repository info
    if (sourceId === currentSourceId) {
      return repositoryInfo;
    }
    
    // Otherwise, get from DataSourceManager
    const dataSourceContext = this.dataSourceManager.getCurrentContext();
    
    if (dataSourceContext.repositories.platforms[sourceId]) {
      return dataSourceContext.repositories.platforms[sourceId];
    }
    
    if (dataSourceContext.repositories.themes[sourceId]) {
      return dataSourceContext.repositories.themes[sourceId];
    }
    
    return null;
  }
  
  /**
   * Update repository information for a source
   */
  updateRepositoryInfo(sourceId: string, info: RepositoryInfo): void {
    console.log('[UnifiedStorageService] Updating repository info for:', sourceId);
    
    // Update in DataSourceManager
    const dataSourceContext = this.dataSourceManager.getCurrentContext();
    
    if (dataSourceContext.repositories.platforms[sourceId]) {
      dataSourceContext.repositories.platforms[sourceId] = info;
    } else if (dataSourceContext.repositories.themes[sourceId]) {
      dataSourceContext.repositories.themes[sourceId] = info;
    } else if (sourceId === 'core') {
      dataSourceContext.repositories.core = info;
    }
    
    // Update unified context if this is the current source
    if (sourceId === this.unifiedContext.sourceId) {
      this.unifiedContext.repositoryInfo = info;
      this.notifyListeners('repositoryUpdated', this.unifiedContext);
    }
  }
  
  // ============================================================================
  // PUBLIC API - Edit Mode Management
  // ============================================================================
  
  /**
   * Get current edit mode
   */
  getEditMode() {
    return this.unifiedContext.editMode;
  }
  
  /**
   * Set edit mode
   */
  setEditMode(editMode: UnifiedDataContext['editMode']): void {
    console.log('[UnifiedStorageService] Setting edit mode:', editMode);
    
    this.unifiedContext.editMode = editMode;
    this.notifyListeners('editModeUpdated', this.unifiedContext);
  }
  
  // ============================================================================
  // PUBLIC API - Event System
  // ============================================================================
  
  /**
   * Subscribe to events
   */
  subscribe(event: string, callback: (context: UnifiedDataContext) => void): () => void {
    console.log('[UnifiedStorageService] Subscribing to event:', event);
    
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }
  
  /**
   * Get current unified context
   */
  getUnifiedContext(): UnifiedDataContext {
    return { ...this.unifiedContext };
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private getInitialContext(): UnifiedDataContext {
    return {
      sourceType: 'core',
      sourceId: null,
      sourceName: null,
      repositoryInfo: null,
      schemaType: 'schema',
      permissions: {
        core: false,
        platforms: {},
        themes: {}
      },
      data: null,
      editMode: {
        isActive: false,
        sourceType: 'core',
        sourceId: null,
        targetRepository: null
      },
      viewMode: {
        isMerged: true,
        mergeSources: ['core'],
        displayData: 'core-only'
      }
    };
  }
  
  private setupServiceSynchronization(): void {
    console.log('[UnifiedStorageService] Setting up service synchronization');
    
    // Initial sync
    this.updateUnifiedContext();
    
    // Set up periodic sync (every 5 seconds)
    setInterval(() => {
      this.updateUnifiedContext();
    }, 5000);
  }
  
  private updateUnifiedContext(): void {
    console.log('[UnifiedStorageService] Updating unified context');
    
    try {
      // Get current state from DataSourceManager
      const dataSourceContext = this.dataSourceManager.getCurrentContext();
      
      // Update source information
      if (dataSourceContext.currentPlatform && dataSourceContext.currentPlatform !== 'none') {
        this.unifiedContext.sourceType = 'platform-extension';
        this.unifiedContext.sourceId = dataSourceContext.currentPlatform;
        this.unifiedContext.sourceName = this.getPlatformName(dataSourceContext.currentPlatform, dataSourceContext);
        this.unifiedContext.repositoryInfo = dataSourceContext.repositories.platforms[dataSourceContext.currentPlatform] || null;
        this.unifiedContext.schemaType = 'platform-extension';
      } else if (dataSourceContext.currentTheme && dataSourceContext.currentTheme !== 'none') {
        this.unifiedContext.sourceType = 'theme-override';
        this.unifiedContext.sourceId = dataSourceContext.currentTheme;
        this.unifiedContext.sourceName = this.getThemeName(dataSourceContext.currentTheme, dataSourceContext);
        this.unifiedContext.repositoryInfo = dataSourceContext.repositories.themes[dataSourceContext.currentTheme] || null;
        this.unifiedContext.schemaType = 'theme-override';
      } else {
        this.unifiedContext.sourceType = 'core';
        this.unifiedContext.sourceId = null;
        this.unifiedContext.sourceName = null;
        this.unifiedContext.repositoryInfo = dataSourceContext.repositories.core || null;
        this.unifiedContext.schemaType = 'schema';
      }
      
      // Update permissions
      this.unifiedContext.permissions = dataSourceContext.permissions;
      
      // Update edit mode
      this.unifiedContext.editMode = dataSourceContext.editMode;
      
      // Update view mode
      this.unifiedContext.viewMode = dataSourceContext.viewMode;
      
      console.log('[UnifiedStorageService] Unified context updated:', this.unifiedContext);
      
    } catch (error) {
      console.error('[UnifiedStorageService] Error updating unified context:', error);
    }
  }
  
  private getPlatformName(platformId: string, dataSourceContext: unknown): string | null {
    const context = dataSourceContext as { availablePlatforms?: Array<{ id: string; displayName?: string; name?: string }> };
    const platform = context.availablePlatforms?.find((p) => p.id === platformId);
    return platform?.displayName || platform?.name || null;
  }
  
  private getThemeName(themeId: string, dataSourceContext: unknown): string | null {
    const context = dataSourceContext as { availableThemes?: Array<{ id: string; displayName?: string; name?: string }> };
    const theme = context.availableThemes?.find((t) => t.id === themeId);
    return theme?.displayName || theme?.name || null;
  }
  
  private notifyListeners(event: string, context: UnifiedDataContext): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(context);
        } catch (error) {
          console.error('[UnifiedStorageService] Error in event listener:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const unifiedStorageService = UnifiedStorageService.getInstance();
