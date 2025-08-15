import { UnifiedStorageService, type UnifiedDataContext, type SourceContext } from './unifiedStorageService';
import { DataSourceManager } from './dataSourceManager';
import { DataManager } from './dataManager';
import { RepositoryContextService } from './repositoryContextService';

// Types for the data flow controller
export interface DataFlowState {
  // Current unified context
  unifiedContext: UnifiedDataContext;
  
  // Data loading state
  isLoading: boolean;
  lastLoadTime: string | null;
  
  // Error state
  error: string | null;
  
  // Change tracking
  hasUnsavedChanges: boolean;
  lastSaveTime: string | null;
}

export interface DataFlowOperation {
  id: string;
  type: 'load' | 'save' | 'switch' | 'merge' | 'validate';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  timestamp: string;
  data?: unknown;
  error?: string;
}

/**
 * Data Flow Controller
 * 
 * This service serves as a unified orchestrator for all data operations.
 * It provides predictable data flow patterns and comprehensive error handling.
 * 
 * Responsibilities:
 * - Orchestrate all data operations
 * - Manage unified state
 * - Provide predictable data flow patterns
 * - Handle all error scenarios
 * - Coordinate between services
 */
export class DataFlowController {
  private static instance: DataFlowController;
  
  // Dependencies
  private unifiedStorage: UnifiedStorageService;
  private dataSourceManager: DataSourceManager;
  private dataManager: DataManager;
  private repositoryContextService: RepositoryContextService;
  
  // State
  private state: DataFlowState;
  private operations: Map<string, DataFlowOperation>;
  
  // Event listeners
  private eventListeners: Map<string, Set<(state: DataFlowState) => void>>;
  
  private constructor() {
    console.log('[DataFlowController] Initializing new instance');
    
    // Initialize dependencies
    this.unifiedStorage = UnifiedStorageService.getInstance();
    this.dataSourceManager = DataSourceManager.getInstance();
    this.dataManager = DataManager.getInstance();
    this.repositoryContextService = RepositoryContextService.getInstance();
    
    // Initialize state
    this.state = this.getInitialState();
    this.operations = new Map();
    this.eventListeners = new Map();
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log('[DataFlowController] Initialization completed');
  }
  
  public static getInstance(): DataFlowController {
    if (!DataFlowController.instance) {
      DataFlowController.instance = new DataFlowController();
    }
    return DataFlowController.instance;
  }
  
  // ============================================================================
  // PUBLIC API - State Management
  // ============================================================================
  
  /**
   * Get current data flow state
   */
  getState(): DataFlowState {
    return { ...this.state };
  }
  
  /**
   * Get current unified context
   */
  getUnifiedContext(): UnifiedDataContext {
    return this.unifiedStorage.getUnifiedContext();
  }
  
  /**
   * Get current source context
   */
  getCurrentSource(): SourceContext {
    return this.unifiedStorage.getCurrentSource();
  }
  
  // ============================================================================
  // PUBLIC API - Data Operations
  // ============================================================================
  
  /**
   * Load data for the current source
   */
  async loadData(): Promise<void> {
    const operationId = this.startOperation('load');
    
    try {
      console.log('[DataFlowController] Loading data for current source');
      
      this.updateState({ isLoading: true, error: null });
      
      // Get current source context
      const sourceContext = this.unifiedStorage.getCurrentSource();
      
      // Load data based on source type
      const data = await this.unifiedStorage.getData(sourceContext.schemaType);
      
      // Update state
      this.updateState({
        isLoading: false,
        lastLoadTime: new Date().toISOString(),
        error: null
      });
      
      this.completeOperation(operationId, { data });
      
      console.log('[DataFlowController] Data loaded successfully');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DataFlowController] Error loading data:', error);
      
      this.updateState({
        isLoading: false,
        error: errorMessage
      });
      
      this.failOperation(operationId, errorMessage);
      throw error;
    }
  }
  
  /**
   * Save data for the current source
   */
  async saveData(data: unknown): Promise<void> {
    const operationId = this.startOperation('save');
    
    try {
      console.log('[DataFlowController] Saving data for current source');
      
      // Get current source context
      const sourceContext = this.unifiedStorage.getCurrentSource();
      
      // Save data based on source type
      await this.unifiedStorage.setData(sourceContext.schemaType, data);
      
      // Update state
      this.updateState({
        hasUnsavedChanges: false,
        lastSaveTime: new Date().toISOString(),
        error: null
      });
      
      this.completeOperation(operationId, { data });
      
      console.log('[DataFlowController] Data saved successfully');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DataFlowController] Error saving data:', error);
      
      this.updateState({ error: errorMessage });
      this.failOperation(operationId, errorMessage);
      throw error;
    }
  }
  
  /**
   * Switch to a different source
   */
  async switchSource(type: 'core' | 'platform-extension' | 'theme-override', id: string | null): Promise<void> {
    const operationId = this.startOperation('switch');
    
    try {
      console.log('[DataFlowController] Switching source:', { type, id });
      
      // Switch source using unified storage
      await this.unifiedStorage.switchSource(type, id);
      
      // Load data for the new source
      await this.loadData();
      
      this.completeOperation(operationId);
      
      console.log('[DataFlowController] Source switched successfully');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DataFlowController] Error switching source:', error);
      
      this.updateState({ error: errorMessage });
      this.failOperation(operationId, errorMessage);
      throw error;
    }
  }
  
  /**
   * Merge data from multiple sources
   */
  async mergeData(sources: Array<{ type: string; id: string | null }>): Promise<unknown> {
    const operationId = this.startOperation('merge');
    
    try {
      console.log('[DataFlowController] Merging data from sources:', sources);
      
      // For now, this is a placeholder implementation
      // This will be enhanced as we implement the unified merging system
      const mergedData = {};
      
             for (const source of sources) {
         const data = await this.unifiedStorage.getData(source.type as 'schema' | 'platform-extension' | 'theme-override');
         Object.assign(mergedData, data);
       }
      
      this.completeOperation(operationId, { data: mergedData });
      
      console.log('[DataFlowController] Data merged successfully');
      
      return mergedData;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DataFlowController] Error merging data:', error);
      
      this.updateState({ error: errorMessage });
      this.failOperation(operationId, errorMessage);
      throw error;
    }
  }
  
  /**
   * Validate data for the current source
   */
  async validateData(data: unknown): Promise<{ isValid: boolean; errors: string[] }> {
    const operationId = this.startOperation('validate');
    
    try {
      console.log('[DataFlowController] Validating data');
      
      // For now, this is a basic validation
      // This will be enhanced with proper schema validation
      const errors: string[] = [];
      
      if (!data) {
        errors.push('Data is required');
      }
      
      if (typeof data !== 'object') {
        errors.push('Data must be an object');
      }
      
      const isValid = errors.length === 0;
      
      this.completeOperation(operationId, { data: { isValid, errors } });
      
      console.log('[DataFlowController] Data validation completed:', { isValid, errors });
      
      return { isValid, errors };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DataFlowController] Error validating data:', error);
      
      this.updateState({ error: errorMessage });
      this.failOperation(operationId, errorMessage);
      throw error;
    }
  }
  
  // ============================================================================
  // PUBLIC API - Permission Management
  // ============================================================================
  
  /**
   * Check if user has edit permissions for current source
   */
  hasEditPermissions(): boolean {
    return this.unifiedStorage.hasEditPermissions();
  }
  
  /**
   * Check permission for a specific source
   */
  checkPermission(sourceId: string): boolean {
    return this.unifiedStorage.checkPermission(sourceId);
  }
  
  /**
   * Get all permissions
   */
  getPermissions() {
    return this.unifiedStorage.getPermissions();
  }
  
  // ============================================================================
  // PUBLIC API - Repository Management
  // ============================================================================
  
  /**
   * Get repository information for a source
   */
  getRepositoryInfo(sourceId: string) {
    return this.unifiedStorage.getRepositoryInfo(sourceId);
  }
  
  /**
   * Update repository information for a source
   */
  updateRepositoryInfo(sourceId: string, info: unknown): void {
    this.unifiedStorage.updateRepositoryInfo(sourceId, info);
  }
  
  // ============================================================================
  // PUBLIC API - Edit Mode Management
  // ============================================================================
  
  /**
   * Get current edit mode
   */
  getEditMode() {
    return this.unifiedStorage.getEditMode();
  }
  
  /**
   * Set edit mode
   */
  setEditMode(editMode: unknown): void {
    this.unifiedStorage.setEditMode(editMode);
  }
  
  // ============================================================================
  // PUBLIC API - Event System
  // ============================================================================
  
  /**
   * Subscribe to state changes
   */
  subscribe(event: string, callback: (state: DataFlowState) => void): () => void {
    console.log('[DataFlowController] Subscribing to event:', event);
    
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
   * Get operation history
   */
  getOperations(): DataFlowOperation[] {
    return Array.from(this.operations.values());
  }
  
  /**
   * Get operation by ID
   */
  getOperation(operationId: string): DataFlowOperation | undefined {
    return this.operations.get(operationId);
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private getInitialState(): DataFlowState {
    return {
      unifiedContext: this.unifiedStorage.getUnifiedContext(),
      isLoading: false,
      lastLoadTime: null,
      error: null,
      hasUnsavedChanges: false,
      lastSaveTime: null
    };
  }
  
  private setupEventListeners(): void {
    console.log('[DataFlowController] Setting up event listeners');
    
    // Listen to unified storage events
    this.unifiedStorage.subscribe('dataUpdated', (context) => {
      this.updateState({ unifiedContext: context });
    });
    
    this.unifiedStorage.subscribe('editModeUpdated', (context) => {
      this.updateState({ unifiedContext: context });
    });
    
    this.unifiedStorage.subscribe('repositoryUpdated', (context) => {
      this.updateState({ unifiedContext: context });
    });
  }
  
  private updateState(updates: Partial<DataFlowState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners('stateUpdated', this.state);
  }
  
  private startOperation(type: DataFlowOperation['type']): string {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const operation: DataFlowOperation = {
      id: operationId,
      type,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    
    this.operations.set(operationId, operation);
    
    // Update operation status to in-progress
    setTimeout(() => {
      const op = this.operations.get(operationId);
      if (op) {
        op.status = 'in-progress';
        this.operations.set(operationId, op);
      }
    }, 0);
    
    console.log('[DataFlowController] Started operation:', operationId, type);
    return operationId;
  }
  
  private completeOperation(operationId: string, data?: { data?: unknown }): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.status = 'completed';
      if (data) {
        operation.data = data.data;
      }
      this.operations.set(operationId, operation);
    }
    
    console.log('[DataFlowController] Completed operation:', operationId);
  }
  
  private failOperation(operationId: string, error: string): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.status = 'failed';
      operation.error = error;
      this.operations.set(operationId, operation);
    }
    
    console.log('[DataFlowController] Failed operation:', operationId, error);
  }
  
  private notifyListeners(event: string, state: DataFlowState): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(state);
        } catch (error) {
          console.error('[DataFlowController] Error in event listener:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const dataFlowController = DataFlowController.getInstance();
