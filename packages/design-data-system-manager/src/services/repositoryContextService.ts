import { DataSourceManager } from './dataSourceManager';
import { SourceContextManager } from './sourceContextManager';
import { StatePersistenceManager } from './statePersistenceManager';

// Core Interfaces
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
  editMode: {
    isActive: boolean;
    sourceType: 'core' | 'platform-extension' | 'theme-override';
    sourceId: string | null;
    targetRepository: RepositoryInfo | null;
  };
}

export interface RepositoryContext {
  coreRepository: RepositoryInfo | null;
  platformRepositories: Record<string, RepositoryInfo>;
  themeRepositories: Record<string, RepositoryInfo>;
  currentSource: SourceContext;
  lastUpdated: string;
}

export class RepositoryContextService {
  private static instance: RepositoryContextService;
  private context: RepositoryContext;
  private eventListeners: Map<string, Function[]>;

  private constructor() {
    console.log('[RepositoryContextService] Initializing new instance');
    this.context = this.getInitialContext();
    this.eventListeners = new Map();
    // Don't initialize from existing services during construction to avoid circular dependency
    // This will be called later when needed
  }

  static getInstance(): RepositoryContextService {
    if (!RepositoryContextService.instance) {
      RepositoryContextService.instance = new RepositoryContextService();
    }
    return RepositoryContextService.instance;
  }

  // State Management Methods
  getCurrentContext(): RepositoryContext {
    console.log('[RepositoryContextService] Getting current context:', this.context);
    return { ...this.context };
  }

  getCurrentSourceContext(): SourceContext {
    console.log('[RepositoryContextService] Getting current source context:', this.context.currentSource);
    return { ...this.context.currentSource };
  }

  getRepositoryInfo(): RepositoryInfo | null {
    const repoInfo = this.context.currentSource.repositoryInfo;
    console.log('[RepositoryContextService] Getting repository info:', repoInfo);
    return repoInfo ? { ...repoInfo } : null;
  }

  // State Update Methods
  updateContext(updates: Partial<RepositoryContext>): void {
    console.log('[RepositoryContextService] Updating context with:', updates);
    
    try {
      this.context = { ...this.context, ...updates };
      this.context.lastUpdated = new Date().toISOString();
      
      // Emit context updated event
      this.emitEvent('contextUpdated', this.context);
      
      console.log('[RepositoryContextService] Context updated successfully');
    } catch (error) {
      console.error('[RepositoryContextService] Error updating context:', error);
      throw error;
    }
  }

  updateSourceContext(updates: Partial<SourceContext>): void {
    console.log('[RepositoryContextService] Updating source context with:', updates);
    
    try {
      this.context.currentSource = { ...this.context.currentSource, ...updates };
      this.context.lastUpdated = new Date().toISOString();
      
      // Emit source context updated event
      this.emitEvent('sourceContextUpdated', this.context.currentSource);
      this.emitEvent('contextUpdated', this.context);
      
      console.log('[RepositoryContextService] Source context updated successfully');
    } catch (error) {
      console.error('[RepositoryContextService] Error updating source context:', error);
      throw error;
    }
  }

  setEditMode(editMode: SourceContext['editMode']): void {
    console.log('[RepositoryContextService] Setting edit mode:', editMode);
    
    try {
      this.context.currentSource.editMode = { ...editMode };
      this.context.lastUpdated = new Date().toISOString();
      
      // Emit edit mode updated event
      this.emitEvent('editModeUpdated', editMode);
      this.emitEvent('contextUpdated', this.context);
      
      console.log('[RepositoryContextService] Edit mode updated successfully');
    } catch (error) {
      console.error('[RepositoryContextService] Error setting edit mode:', error);
      throw error;
    }
  }

  // Event System Methods
  subscribeToChanges(eventType: string, callback: Function): void {
    console.log('[RepositoryContextService] Subscribing to event:', eventType);
    
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    
    this.eventListeners.get(eventType)!.push(callback);
    console.log('[RepositoryContextService] Subscription added successfully');
  }

  unsubscribeFromChanges(eventType: string, callback: Function): void {
    console.log('[RepositoryContextService] Unsubscribing from event:', eventType);
    
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        console.log('[RepositoryContextService] Unsubscription successful');
      }
    }
  }

  emitEvent(eventType: string, data: any): void {
    console.log('[RepositoryContextService] Emitting event:', eventType, 'with data:', data);
    
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[RepositoryContextService] Error in event callback:', error);
        }
      });
    }
  }

  // Integration Methods
  initializeFromExistingServices(): void {
    console.log('[RepositoryContextService] Initializing from existing services');
    
    try {
      // Initialize from DataSourceManager
      const dataSourceManager = DataSourceManager.getInstance();
      const dataSourceContext = dataSourceManager.getCurrentContext();
      
      // Initialize from SourceContextManager
      const sourceContextManager = SourceContextManager.getInstance();
      const sourceContext = sourceContextManager.getContext();
      
      // Initialize from StatePersistenceManager
      const stateManager = StatePersistenceManager.getInstance();
      const stateContext = stateManager.getCurrentState();
      
      // Merge state into unified context
      this.mergeExistingState(dataSourceContext, sourceContext, stateContext);
      
      console.log('[RepositoryContextService] Initialization completed successfully');
    } catch (error) {
      console.error('[RepositoryContextService] Initialization failed:', error);
      // Fallback to default state
      this.context = this.getInitialContext();
    }
  }

  syncWithDataSourceManager(): void {
    console.log('[RepositoryContextService] Syncing with DataSourceManager');
    
    try {
      const dataSourceManager = DataSourceManager.getInstance();
      const dataSourceContext = dataSourceManager.getCurrentContext();
      
      this.mergeFromDataSourceContext(dataSourceContext);
      console.log('[RepositoryContextService] Sync with DataSourceManager completed');
    } catch (error) {
      console.error('[RepositoryContextService] Error syncing with DataSourceManager:', error);
      throw error;
    }
  }

  syncWithSourceContextManager(): void {
    console.log('[RepositoryContextService] Syncing with SourceContextManager');
    
    try {
      const sourceContextManager = SourceContextManager.getInstance();
      const sourceContext = sourceContextManager.getContext();
      
      if (sourceContext) {
        this.mergeFromSourceContext(sourceContext);
      }
      console.log('[RepositoryContextService] Sync with SourceContextManager completed');
    } catch (error) {
      console.error('[RepositoryContextService] Error syncing with SourceContextManager:', error);
      throw error;
    }
  }

  // Private Methods
  private getInitialContext(): RepositoryContext {
    console.log('[RepositoryContextService] Creating initial context');
    
    return {
      coreRepository: null,
      platformRepositories: {},
      themeRepositories: {},
      currentSource: {
        sourceType: 'core',
        sourceId: null,
        sourceName: null,
        repositoryInfo: null,
        schemaType: 'schema',
        editMode: {
          isActive: false,
          sourceType: 'core',
          sourceId: null,
          targetRepository: null
        }
      },
      lastUpdated: new Date().toISOString()
    };
  }



  private mergeExistingState(
    dataSourceContext: any,
    sourceContext: any,
    stateContext: any
  ): void {
    console.log('[RepositoryContextService] Merging existing state');
    
    // Priority: DataSourceManager > SourceContextManager > StatePersistenceManager
    
    // Merge repository information
    this.context.coreRepository = dataSourceContext?.repositories?.core || 
                                  sourceContext?.repositoryInfo || 
                                  stateContext?.currentRepository;
    
    // Merge platform repositories
    this.context.platformRepositories = dataSourceContext?.repositories?.platforms || {};
    
    // Merge theme repositories
    this.context.themeRepositories = dataSourceContext?.repositories?.themes || {};
    
    // Merge current source context
    this.context.currentSource = this.mergeSourceContext(
      dataSourceContext,
      sourceContext,
      stateContext
    );
    
    this.context.lastUpdated = new Date().toISOString();
    
    console.log('[RepositoryContextService] State merging completed');
  }

  private mergeSourceContext(
    dataSourceContext: any,
    sourceContext: any,
    stateContext: any
  ): SourceContext {
    console.log('[RepositoryContextService] Merging source context');
    console.log('[RepositoryContextService] DataSourceContext for merging:', dataSourceContext);
    
    // Determine source type and ID
    let sourceType: 'core' | 'platform-extension' | 'theme-override' = 'core';
    let sourceId: string | null = null;
    
    if (dataSourceContext?.currentPlatform && dataSourceContext.currentPlatform !== 'none') {
      sourceType = 'platform-extension';
      sourceId = dataSourceContext.currentPlatform;
    } else if (dataSourceContext?.currentTheme && dataSourceContext.currentTheme !== 'none') {
      sourceType = 'theme-override';
      sourceId = dataSourceContext.currentTheme;
    }
    
    // Determine repository info
    let repositoryInfo: RepositoryInfo | null = null;
    console.log('[RepositoryContextService] Determining repository info for source type:', sourceType, 'sourceId:', sourceId);
    console.log('[RepositoryContextService] DataSourceContext repositories:', dataSourceContext?.repositories);
    
    if (sourceType === 'platform-extension' && sourceId) {
      repositoryInfo = dataSourceContext?.repositories?.platforms?.[sourceId] || null;
      console.log('[RepositoryContextService] Platform repository info:', repositoryInfo);
    } else if (sourceType === 'theme-override' && sourceId) {
      repositoryInfo = dataSourceContext?.repositories?.themes?.[sourceId] || null;
      console.log('[RepositoryContextService] Theme repository info:', repositoryInfo);
    } else if (sourceType === 'core') {
      repositoryInfo = dataSourceContext?.repositories?.core || null;
      console.log('[RepositoryContextService] Core repository info:', repositoryInfo);
    }
    
    console.log('[RepositoryContextService] Determined repository info:', repositoryInfo);
    
    // Determine edit mode
    const editMode = dataSourceContext?.editMode || {
      isActive: false,
      sourceType: sourceType,
      sourceId: sourceId,
      targetRepository: repositoryInfo
    };
    
    const mergedContext: SourceContext = {
      sourceType,
      sourceId,
      sourceName: this.getSourceName(sourceType, sourceId, dataSourceContext),
      repositoryInfo,
      schemaType: sourceType === 'core' ? 'schema' : sourceType,
      editMode
    };
    
    console.log('[RepositoryContextService] Source context merged:', mergedContext);
    return mergedContext;
  }

  private getSourceName(
    sourceType: 'core' | 'platform-extension' | 'theme-override',
    sourceId: string | null,
    dataSourceContext: any
  ): string | null {
    if (sourceType === 'platform-extension' && sourceId) {
      const platform = dataSourceContext?.availablePlatforms?.find((p: any) => p.id === sourceId);
      return platform?.name || null;
    } else if (sourceType === 'theme-override' && sourceId) {
      const theme = dataSourceContext?.availableThemes?.find((t: any) => t.id === sourceId);
      return theme?.name || null;
    }
    return null;
  }

  public mergeFromDataSourceContext(dataSourceContext: any): void {
    console.log('[RepositoryContextService] Merging from DataSourceContext');
    console.log('[RepositoryContextService] DataSourceContext repositories:', dataSourceContext?.repositories);
    
    if (!dataSourceContext) {
      console.warn('[RepositoryContextService] No DataSourceContext provided for merging');
      return;
    }
    
    // SIMPLIFIED: Update repositories directly from DataSourceManager
    this.context.coreRepository = dataSourceContext.repositories?.core || this.context.coreRepository;
    this.context.platformRepositories = dataSourceContext.repositories?.platforms || this.context.platformRepositories;
    this.context.themeRepositories = dataSourceContext.repositories?.themes || this.context.themeRepositories;
    
    console.log('[RepositoryContextService] Updated context repositories:', {
      core: this.context.coreRepository,
      platforms: this.context.platformRepositories,
      themes: this.context.themeRepositories
    });
    
    // SIMPLIFIED: Update current source with clear logic
    const { currentPlatform, currentTheme, repositories } = dataSourceContext;
    
    let sourceType: 'core' | 'platform-extension' | 'theme-override' = 'core';
    let sourceId: string | null = null;
    let repositoryInfo: RepositoryInfo | null = null;
    
    if (currentPlatform && currentPlatform !== 'none') {
      sourceType = 'platform-extension';
      sourceId = currentPlatform;
      repositoryInfo = repositories?.platforms?.[currentPlatform] || null;
    } else if (currentTheme && currentTheme !== 'none') {
      sourceType = 'theme-override';
      sourceId = currentTheme;
      repositoryInfo = repositories?.themes?.[currentTheme] || null;
    } else {
      // Core data - CRITICAL: Use repositories.core directly
      sourceType = 'core';
      sourceId = null;
      repositoryInfo = repositories?.core || null;
    }
    
    this.context.currentSource = {
      ...this.context.currentSource,
      sourceType,
      sourceId,
      sourceName: this.getSourceName(sourceType, sourceId, dataSourceContext),
      repositoryInfo,
      schemaType: sourceType === 'core' ? 'schema' : sourceType,
      editMode: dataSourceContext.editMode || this.context.currentSource.editMode
    };
    
    this.context.lastUpdated = new Date().toISOString();
    console.log('[RepositoryContextService] DataSourceContext merge completed');
    console.log('[RepositoryContextService] Final current source:', this.context.currentSource);
  }

  private mergeFromSourceContext(sourceContext: any): void {
    console.log('[RepositoryContextService] Merging from SourceContext');
    
    if (!sourceContext) {
      console.warn('[RepositoryContextService] No SourceContext provided for merging');
      return;
    }
    
    // Only update if the source context has more recent information
    if (sourceContext.repositoryInfo) {
      this.context.currentSource.repositoryInfo = sourceContext.repositoryInfo;
    }
    
    if (sourceContext.sourceType) {
      this.context.currentSource.sourceType = sourceContext.sourceType;
    }
    
    if (sourceContext.sourceId) {
      this.context.currentSource.sourceId = sourceContext.sourceId;
    }
    
    this.context.lastUpdated = new Date().toISOString();
    console.log('[RepositoryContextService] SourceContext merge completed');
  }
}
