import type { Platform, Theme } from '@token-model/data-model';

export interface RepositoryContext {
  fullName: string;
  branch: string;
  filePath: string;
  fileType: 'schema' | 'platform-extension' | 'theme-override';
}

export interface EditModeState {
  isActive: boolean;
  branch: string | null;
  sourceType: 'core' | 'platform-extension' | 'theme-override';
  sourceId: string | null;
  repositoryContext: RepositoryContext | null;
}

export interface CacheState {
  lastRefreshTimestamp: number;
  repositoryBranches: Record<string, string[]>; // repo -> branch list
  permissions: Record<string, boolean>; // repo -> has access
}

export interface DataSourceContext {
  currentPlatform: string | null;
  currentTheme: string | null;
  availablePlatforms: Platform[];
  availableThemes: Theme[];
}

export interface PersistentState {
  // Repository context
  currentRepository: RepositoryContext | null;
  
  // Data source context
  dataSourceContext: DataSourceContext;
  
  // Edit mode state
  editMode: EditModeState;
  
  // Cache state
  cacheState: CacheState;
  
  // Version for migration
  version: string;
}

const STORAGE_KEY = 'token-model:persistent-state';
const CURRENT_VERSION = '1.0.0';

const DEFAULT_STATE: PersistentState = {
  currentRepository: null,
  dataSourceContext: {
    currentPlatform: null,
    currentTheme: null,
    availablePlatforms: [],
    availableThemes: []
  },
  editMode: {
    isActive: false,
    branch: null,
    sourceType: 'core',
    sourceId: null,
    repositoryContext: null
  },
  cacheState: {
    lastRefreshTimestamp: 0,
    repositoryBranches: {},
    permissions: {}
  },
  version: CURRENT_VERSION
};

export class StatePersistenceManager {
  private static instance: StatePersistenceManager;
  private currentState: PersistentState;

  private constructor() {
    this.currentState = this.loadState();
  }

  static getInstance(): StatePersistenceManager {
    if (!StatePersistenceManager.instance) {
      StatePersistenceManager.instance = new StatePersistenceManager();
    }
    return StatePersistenceManager.instance;
  }

  /**
   * Save current state to localStorage
   */
  saveState(): void {
    try {
      // Update timestamp before saving
      this.currentState.cacheState.lastRefreshTimestamp = Date.now();
      this.currentState.version = CURRENT_VERSION;
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentState));
      console.log('[StatePersistenceManager] State saved successfully');
    } catch (error) {
      console.error('[StatePersistenceManager] Failed to save state:', error);
    }
  }

  /**
   * Load state from localStorage
   */
  loadState(): PersistentState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        console.log('[StatePersistenceManager] No stored state found, using defaults');
        return { ...DEFAULT_STATE };
      }

      const parsed = JSON.parse(stored) as PersistentState;
      
      // Handle version migration if needed
      if (parsed.version !== CURRENT_VERSION) {
        console.log('[StatePersistenceManager] Migrating state from version', parsed.version, 'to', CURRENT_VERSION);
        return this.migrateState(parsed);
      }

      console.log('[StatePersistenceManager] State loaded successfully');
      return parsed;
    } catch (error) {
      console.error('[StatePersistenceManager] Failed to load state:', error);
      return { ...DEFAULT_STATE };
    }
  }

  /**
   * Get current state
   */
  getCurrentState(): PersistentState {
    return { ...this.currentState };
  }

  /**
   * Update repository context
   */
  updateRepositoryContext(repo: RepositoryContext): void {
    console.log('[StatePersistenceManager] Updating repository context:', repo);
    this.currentState.currentRepository = { ...repo };
    this.saveState();
  }

  /**
   * Get current repository context
   */
  getCurrentRepositoryContext(): RepositoryContext | null {
    return this.currentState.currentRepository ? { ...this.currentState.currentRepository } : null;
  }

  /**
   * Update edit mode state
   */
  updateEditMode(editMode: EditModeState): void {
    console.log('[StatePersistenceManager] Updating edit mode state:', editMode);
    this.currentState.editMode = { ...editMode };
    this.saveState();
  }

  /**
   * Get current edit mode state
   */
  getCurrentEditMode(): EditModeState {
    return { ...this.currentState.editMode };
  }

  /**
   * Update data source context
   */
  updateDataSourceContext(context: DataSourceContext): void {
    console.log('[StatePersistenceManager] Updating data source context');
    this.currentState.dataSourceContext = { ...context };
    this.saveState();
  }

  /**
   * Get current data source context
   */
  getCurrentDataSourceContext(): DataSourceContext {
    return { ...this.currentState.dataSourceContext };
  }

  /**
   * Update cache state
   */
  updateCacheState(cacheState: Partial<CacheState>): void {
    console.log('[StatePersistenceManager] Updating cache state');
    this.currentState.cacheState = { ...this.currentState.cacheState, ...cacheState };
    this.saveState();
  }

  /**
   * Get current cache state
   */
  getCurrentCacheState(): CacheState {
    return { ...this.currentState.cacheState };
  }

  /**
   * Clear edit mode only (preserve repository context)
   */
  clearEditModeOnly(): void {
    console.log('[StatePersistenceManager] Clearing edit mode only');
    this.currentState.editMode = { ...DEFAULT_STATE.editMode };
    this.saveState();
  }

  /**
   * Clear all state
   */
  clearAll(): void {
    console.log('[StatePersistenceManager] Clearing all state');
    this.currentState = { ...DEFAULT_STATE };
    this.saveState();
  }

  /**
   * Restore repository context after refresh
   */
  restoreRepositoryContext(repo?: RepositoryContext): void {
    const contextToRestore = repo || this.currentState.currentRepository;
    if (contextToRestore) {
      console.log('[StatePersistenceManager] Restoring repository context:', contextToRestore);
      this.currentState.currentRepository = { ...contextToRestore };
      this.saveState();
    }
  }

  /**
   * Check if we have a valid repository context
   */
  hasValidRepositoryContext(): boolean {
    return !!(
      this.currentState.currentRepository?.fullName &&
      this.currentState.currentRepository?.branch &&
      this.currentState.currentRepository?.filePath
    );
  }

  /**
   * Get repository branches from cache state
   */
  getRepositoryBranches(repoFullName: string): string[] {
    return this.currentState.cacheState.repositoryBranches[repoFullName] || [];
  }

  /**
   * Set repository branches in cache state
   */
  setRepositoryBranches(repoFullName: string, branches: string[]): void {
    this.currentState.cacheState.repositoryBranches[repoFullName] = [...branches];
    this.saveState();
  }

  /**
   * Get permission for repository
   */
  getRepositoryPermission(repoFullName: string): boolean {
    return this.currentState.cacheState.permissions[repoFullName] || false;
  }

  /**
   * Set permission for repository
   */
  setRepositoryPermission(repoFullName: string, hasPermission: boolean): void {
    this.currentState.cacheState.permissions[repoFullName] = hasPermission;
    this.saveState();
  }

  /**
   * Migrate state from older version
   */
  private migrateState(oldState: any): PersistentState {
    // For now, just return default state if version mismatch
    // In future, implement proper migration logic
    console.warn('[StatePersistenceManager] State migration not implemented, using defaults');
    return { ...DEFAULT_STATE };
  }
} 