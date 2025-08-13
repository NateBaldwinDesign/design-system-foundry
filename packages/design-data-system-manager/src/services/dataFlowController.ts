import { unifiedStorageService } from './unifiedStorageService';
import { dataValidationService } from './dataValidationService';
import { dataMigrationService } from './dataMigrationService';
import { StorageService } from './storage';
import { DataSourceManager } from './dataSourceManager';
import { DataManager } from './dataManager';
import { EnhancedDataMerger } from './enhancedDataMerger';
import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrideFile,
  DataSnapshot,
  SourceContext
} from '@token-model/data-model';

// Feature flag for gradual rollout
const DATA_FLOW_CONTROLLER_ENABLED = process.env.REACT_APP_DATA_FLOW_CONTROLLER_ENABLED === 'true' || false;

// Data flow operation types
export type DataFlowOperation = 
  | 'load'
  | 'save'
  | 'merge'
  | 'validate'
  | 'migrate'
  | 'refresh'
  | 'commit'
  | 'rollback';

// Data flow state interface
export interface DataFlowState {
  operation: DataFlowOperation;
  status: 'idle' | 'loading' | 'processing' | 'success' | 'error';
  progress: number; // 0-100
  message: string;
  error?: string;
  timestamp: string;
  dataType?: 'TokenSystem' | 'PlatformExtension' | 'ThemeOverrideFile';
  sourceContext?: SourceContext;
}

// Data flow event interface
export interface DataFlowEvent {
  type: 'state-change' | 'operation-start' | 'operation-complete' | 'error';
  operation: DataFlowOperation;
  state: DataFlowState;
  data?: unknown;
  error?: string;
}

// Data flow options interface
export interface DataFlowOptions {
  enableValidation?: boolean;
  enableCaching?: boolean;
  enableLogging?: boolean;
  forceRefresh?: boolean;
  skipMigration?: boolean;
  timeout?: number; // milliseconds
}

// Default data flow options
const DEFAULT_DATA_FLOW_OPTIONS: DataFlowOptions = {
  enableValidation: true,
  enableCaching: true,
  enableLogging: true,
  forceRefresh: false,
  skipMigration: false,
  timeout: 30000 // 30 seconds
};

// Error types for data flow
export class DataFlowError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly operation: DataFlowOperation,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DataFlowError';
  }
}

/**
 * Data Flow Controller - Unified orchestrator for all data operations
 * 
 * This service provides:
 * - Single orchestrator for all data operations
 * - Unified state management
 * - Predictable data flow patterns
 * - Comprehensive error handling
 * - Integration with existing services
 */
export class DataFlowController {
  private static instance: DataFlowController;
  private currentState: DataFlowState;
  private eventListeners: Array<(event: DataFlowEvent) => void> = [];
  private operationQueue: Array<{
    operation: DataFlowOperation;
    options: DataFlowOptions;
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
  }> = [];
  private isProcessing = false;

  private constructor() {
    this.currentState = {
      operation: 'load',
      status: 'idle',
      progress: 0,
      message: 'Data flow controller initialized',
      timestamp: new Date().toISOString()
    };
    
    console.log('[DataFlowController] Initializing with feature flag:', DATA_FLOW_CONTROLLER_ENABLED);
  }

  static getInstance(): DataFlowController {
    if (!DataFlowController.instance) {
      DataFlowController.instance = new DataFlowController();
    }
    return DataFlowController.instance;
  }

  /**
   * Check if data flow controller is enabled
   */
  static isEnabled(): boolean {
    return DATA_FLOW_CONTROLLER_ENABLED;
  }

  /**
   * Get current state
   */
  getCurrentState(): DataFlowState {
    return { ...this.currentState };
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: DataFlowEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: DataFlowEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: DataFlowEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[DataFlowController] Error in event listener:', error);
      }
    });
  }

  /**
   * Update state and emit event
   */
  private updateState(updates: Partial<DataFlowState>): void {
    this.currentState = {
      ...this.currentState,
      ...updates,
      timestamp: new Date().toISOString()
    };

    this.emitEvent({
      type: 'state-change',
      operation: this.currentState.operation,
      state: this.currentState
    });
  }

  /**
   * Execute data flow operation
   */
  async executeOperation(
    operation: DataFlowOperation,
    options: DataFlowOptions = {}
  ): Promise<unknown> {
    const opts = { ...DEFAULT_DATA_FLOW_OPTIONS, ...options };
    
    console.log(`[DataFlowController] Executing operation: ${operation}`);

    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        operation,
        options: opts,
        resolve,
        reject
      });

      this.processQueue();
    });
  }

  /**
   * Process operation queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.operationQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.operationQueue.length > 0) {
      const { operation, options, resolve, reject } = this.operationQueue.shift()!;

      try {
        this.updateState({
          operation,
          status: 'processing',
          progress: 0,
          message: `Starting ${operation} operation`
        });

        this.emitEvent({
          type: 'operation-start',
          operation,
          state: this.currentState
        });

        const result = await this.performOperation(operation, options);
        
        this.updateState({
          status: 'success',
          progress: 100,
          message: `${operation} operation completed successfully`
        });

        this.emitEvent({
          type: 'operation-complete',
          operation,
          state: this.currentState,
          data: result
        });

        resolve(result);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        this.updateState({
          status: 'error',
          progress: 0,
          message: `${operation} operation failed`,
          error: errorMessage
        });

        this.emitEvent({
          type: 'error',
          operation,
          state: this.currentState,
          error: errorMessage
        });

        reject(error instanceof Error ? error : new Error(errorMessage));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Perform specific operation
   */
  private async performOperation(operation: DataFlowOperation, options: DataFlowOptions): Promise<unknown> {
    switch (operation) {
      case 'load':
        return this.performLoadOperation(options);
      case 'save':
        return this.performSaveOperation(options);
      case 'merge':
        return this.performMergeOperation(options);
      case 'validate':
        return this.performValidateOperation(options);
      case 'migrate':
        return this.performMigrateOperation(options);
      case 'refresh':
        return this.performRefreshOperation(options);
      case 'commit':
        return this.performCommitOperation(options);
      case 'rollback':
        return this.performRollbackOperation(options);
      default:
        throw new DataFlowError(
          `Unknown operation: ${operation}`,
          'UNKNOWN_OPERATION',
          operation
        );
    }
  }

  /**
   * Perform load operation
   */
  private async performLoadOperation(options: DataFlowOptions): Promise<DataSnapshot> {
    this.updateState({ progress: 10, message: 'Loading data from storage' });

    try {
      // Check if migration is needed
      if (!options.skipMigration && dataMigrationService.isMigrationNeeded()) {
        this.updateState({ progress: 20, message: 'Performing data migration' });
        const migrationResult = await dataMigrationService.performMigration();
        
        if (!migrationResult.success) {
          throw new DataFlowError(
            `Migration failed: ${migrationResult.errors.join(', ')}`,
            'MIGRATION_FAILED',
            'load',
            { migrationResult }
          );
        }
      }

      this.updateState({ progress: 40, message: 'Loading data from unified storage' });

      // Load data from unified storage if enabled
      if (unifiedStorageService.isEnabled()) {
        const coreData = unifiedStorageService.getData<TokenSystem>('token-model:unified:core-data', 'TokenSystem');
        const sourceContext = unifiedStorageService.getData<SourceContext>('token-model:unified:source-context');
        const localEdits = unifiedStorageService.getData('token-model:unified:local-edits');

        if (coreData) {
          this.updateState({ progress: 60, message: 'Validating loaded data' });

          // Validate data if enabled
          if (options.enableValidation) {
            const validation = dataValidationService.validateTokenSystem(coreData);
            if (!validation.isValid) {
              throw new DataFlowError(
                `Data validation failed: ${validation.errors.join(', ')}`,
                'VALIDATION_FAILED',
                'load',
                { validation }
              );
            }
          }

          this.updateState({ progress: 80, message: 'Building data snapshot' });

          // Build data snapshot
          const snapshot = this.buildDataSnapshot(coreData, sourceContext, localEdits);
          
          this.updateState({ progress: 100, message: 'Data loaded successfully' });
          return snapshot;
        }
      }

      // Fallback to existing data manager
      this.updateState({ progress: 60, message: 'Loading data from existing storage' });
      const dataManager = DataManager.getInstance();
      const snapshot = dataManager.loadFromStorage();
      
      this.updateState({ progress: 100, message: 'Data loaded successfully' });
      return snapshot;

    } catch (error) {
      throw new DataFlowError(
        `Load operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LOAD_FAILED',
        'load',
        { originalError: error }
      );
    }
  }

  /**
   * Perform save operation
   */
  private async performSaveOperation(options: DataFlowOptions): Promise<void> {
    this.updateState({ progress: 10, message: 'Preparing to save data' });

    try {
      const dataManager = DataManager.getInstance();
      const currentData = dataManager.getCurrentData();

      this.updateState({ progress: 30, message: 'Validating data before save' });

      // Validate data if enabled
      if (options.enableValidation) {
        const validation = dataValidationService.validateTokenSystem(currentData);
        if (!validation.isValid) {
          throw new DataFlowError(
            `Data validation failed: ${validation.errors.join(', ')}`,
            'VALIDATION_FAILED',
            'save',
            { validation }
          );
        }
      }

      this.updateState({ progress: 50, message: 'Saving data to storage' });

      // Save to unified storage if enabled
      if (unifiedStorageService.isEnabled()) {
        unifiedStorageService.setData('token-model:unified:core-data', currentData, 'TokenSystem');
        
        // Save local edits if they exist
        const localEdits = StorageService.getLocalEdits();
        if (localEdits) {
          unifiedStorageService.setData('token-model:unified:local-edits', localEdits);
        }
      }

      this.updateState({ progress: 80, message: 'Saving to existing storage' });

      // Save to existing storage
      dataManager.saveToStorage();

      this.updateState({ progress: 100, message: 'Data saved successfully' });

    } catch (error) {
      throw new DataFlowError(
        `Save operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAVE_FAILED',
        'save',
        { originalError: error }
      );
    }
  }

  /**
   * Perform merge operation
   */
  private async performMergeOperation(options: DataFlowOptions): Promise<DataSnapshot> {
    this.updateState({ progress: 10, message: 'Starting data merge operation' });

    try {
      const dataManager = DataManager.getInstance();
      const sourceContext = DataSourceManager.getInstance().getCurrentContext();

      this.updateState({ progress: 30, message: 'Loading source data' });

      // Load source data
      const coreData = dataManager.getCurrentData();
      const platformExtensions: Record<string, PlatformExtension> = {};
      const themeOverrides: Record<string, ThemeOverrideFile> = {};

      // Load platform extensions
      if (unifiedStorageService.isEnabled()) {
        // Load from unified storage
        const platformKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('token-model:unified:platform-extension-')
        );
        platformKeys.forEach(key => {
          const platformId = key.replace('token-model:unified:platform-extension-', '');
          const platformData = unifiedStorageService.getData<PlatformExtension>(key, 'PlatformExtension');
          if (platformData) {
            platformExtensions[platformId] = platformData;
          }
        });
      } else {
        // Load from existing storage
        const storedPlatformExtensions = StorageService.getPlatformExtensions();
        Object.assign(platformExtensions, storedPlatformExtensions);
      }

      // Load theme overrides
      if (unifiedStorageService.isEnabled()) {
        // Load from unified storage
        const themeKeys = Object.keys(localStorage).filter(key => 
          key.startsWith('token-model:unified:theme-override-')
        );
        themeKeys.forEach(key => {
          const themeId = key.replace('token-model:unified:theme-override-', '');
          const themeData = unifiedStorageService.getData<ThemeOverrideFile>(key, 'ThemeOverrideFile');
          if (themeData) {
            themeOverrides[themeId] = themeData;
          }
        });
      } else {
        // Load from existing storage
        const storedThemeOverrides = StorageService.getThemeOverrides();
        Object.assign(themeOverrides, storedThemeOverrides);
      }

      this.updateState({ progress: 50, message: 'Validating source data' });

      // Validate data if enabled
      if (options.enableValidation) {
        for (const [platformId, platformData] of Object.entries(platformExtensions)) {
          const platformValidation = dataValidationService.validatePlatformExtension(platformData);
          if (!platformValidation.isValid) {
            throw new DataFlowError(
              `Platform extension validation failed for ${platformId}: ${platformValidation.errors.join(', ')}`,
              'VALIDATION_FAILED',
              'merge',
              { validation: platformValidation, platformId }
            );
          }
        }

        for (const [themeId, themeData] of Object.entries(themeOverrides)) {
          const themeValidation = dataValidationService.validateThemeOverrideFile(themeData);
          if (!themeValidation.isValid) {
            throw new DataFlowError(
              `Theme override validation failed for ${themeId}: ${themeValidation.errors.join(', ')}`,
              'VALIDATION_FAILED',
              'merge',
              { validation: themeValidation, themeId }
            );
          }
        }
      }

      this.updateState({ progress: 70, message: 'Performing data merge' });

      // Perform merge using enhanced data merger
      const enhancedMerger = EnhancedDataMerger.getInstance();
      const mergedDataSnapshot = enhancedMerger.mergeData(sourceContext, coreData, platformExtensions, themeOverrides);

      this.updateState({ progress: 90, message: 'Converting merged data to snapshot' });

      // Convert MergedDataSnapshot to DataSnapshot
      const snapshot: DataSnapshot = {
        collections: mergedDataSnapshot.collections,
        modes: mergedDataSnapshot.modes,
        dimensions: mergedDataSnapshot.dimensions,
        resolvedValueTypes: mergedDataSnapshot.resolvedValueTypes,
        platforms: mergedDataSnapshot.platforms,
        themes: mergedDataSnapshot.themes,
        tokens: mergedDataSnapshot.tokens,
        taxonomies: mergedDataSnapshot.taxonomies,
        componentProperties: mergedDataSnapshot.componentProperties,
        componentCategories: mergedDataSnapshot.componentCategories,
        components: mergedDataSnapshot.components,
        algorithms: mergedDataSnapshot.algorithmFile ? [mergedDataSnapshot.algorithmFile] : [],
        taxonomyOrder: mergedDataSnapshot.taxonomyOrder,
        dimensionOrder: mergedDataSnapshot.dimensionOrder,
        algorithmFile: mergedDataSnapshot.algorithmFile,
        linkedRepositories: StorageService.getLinkedRepositories(),
        platformExtensions: platformExtensions,
        themeOverrides: themeOverrides,
        figmaConfiguration: mergedDataSnapshot.figmaConfiguration
      };

      this.updateState({ progress: 100, message: 'Data merge completed successfully' });
      return snapshot;

    } catch (error) {
      throw new DataFlowError(
        `Merge operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MERGE_FAILED',
        'merge',
        { originalError: error }
      );
    }
  }

  /**
   * Perform validate operation
   */
  private async performValidateOperation(options: DataFlowOptions): Promise<unknown> {
    this.updateState({ progress: 10, message: 'Starting data validation' });

    try {
      const dataManager = DataManager.getInstance();
      const currentData = dataManager.getCurrentData();

      this.updateState({ progress: 30, message: 'Validating core data' });

      const validation = dataValidationService.validateTokenSystem(currentData);

      this.updateState({ 
        progress: 100, 
        message: validation.isValid ? 'Validation passed' : 'Validation failed',
        error: validation.isValid ? undefined : validation.errors.join(', ')
      });

      return validation;

    } catch (error) {
      throw new DataFlowError(
        `Validation operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'VALIDATION_FAILED',
        'validate',
        { originalError: error }
      );
    }
  }

  /**
   * Perform migrate operation
   */
  private async performMigrateOperation(options: DataFlowOptions): Promise<unknown> {
    this.updateState({ progress: 10, message: 'Starting data migration' });

    try {
      const result = await dataMigrationService.performMigration();

      this.updateState({ 
        progress: 100, 
        message: result.success ? 'Migration completed' : 'Migration failed',
        error: result.success ? undefined : result.errors.join(', ')
      });

      return result;

    } catch (error) {
      throw new DataFlowError(
        `Migration operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'MIGRATION_FAILED',
        'migrate',
        { originalError: error }
      );
    }
  }

  /**
   * Perform refresh operation
   */
  private async performRefreshOperation(options: DataFlowOptions): Promise<DataSnapshot> {
    this.updateState({ progress: 10, message: 'Starting data refresh' });

    try {
      // Force reload from storage
      const dataManager = DataManager.getInstance();
      dataManager.refreshData();

      this.updateState({ progress: 50, message: 'Loading refreshed data' });

      const snapshot = dataManager.loadFromStorage();

      this.updateState({ progress: 100, message: 'Data refresh completed' });
      return snapshot;

    } catch (error) {
      throw new DataFlowError(
        `Refresh operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'REFRESH_FAILED',
        'refresh',
        { originalError: error }
      );
    }
  }

  /**
   * Perform commit operation
   */
  private async performCommitOperation(options: DataFlowOptions): Promise<void> {
    this.updateState({ progress: 10, message: 'Starting data commit' });

    try {
      // Save current data
      await this.performSaveOperation(options);

      this.updateState({ progress: 100, message: 'Data commit completed' });

    } catch (error) {
      throw new DataFlowError(
        `Commit operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COMMIT_FAILED',
        'commit',
        { originalError: error }
      );
    }
  }

  /**
   * Perform rollback operation
   */
  private async performRollbackOperation(options: DataFlowOptions): Promise<void> {
    this.updateState({ progress: 10, message: 'Starting data rollback' });

    try {
      // Clear local edits
      StorageService.clearLocalEdits();

      if (unifiedStorageService.isEnabled()) {
        unifiedStorageService.deleteData('token-model:unified:local-edits');
      }

      this.updateState({ progress: 50, message: 'Refreshing data' });

      // Refresh data to get original state
      await this.performRefreshOperation(options);

      this.updateState({ progress: 100, message: 'Data rollback completed' });

    } catch (error) {
      throw new DataFlowError(
        `Rollback operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ROLLBACK_FAILED',
        'rollback',
        { originalError: error }
      );
    }
  }

  /**
   * Build data snapshot from various sources
   */
  private buildDataSnapshot(
    coreData: TokenSystem,
    sourceContext?: SourceContext,
    localEdits?: unknown
  ): DataSnapshot {
    return {
      collections: coreData.tokenCollections || [],
      modes: StorageService.getModes(),
      dimensions: coreData.dimensions || [],
      resolvedValueTypes: coreData.resolvedValueTypes || [],
      platforms: coreData.platforms || [],
      themes: coreData.themes || [],
      tokens: coreData.tokens || [],
      taxonomies: coreData.taxonomies || [],
      componentProperties: coreData.componentProperties || [],
      componentCategories: coreData.componentCategories || [],
      components: coreData.components || [],
      algorithms: StorageService.getAlgorithms(),
      taxonomyOrder: coreData.taxonomyOrder || [],
      dimensionOrder: StorageService.getDimensionOrder(),
      algorithmFile: StorageService.getAlgorithmFile(),
      linkedRepositories: StorageService.getLinkedRepositories(),
      platformExtensions: StorageService.getPlatformExtensions(),
      themeOverrides: StorageService.getThemeOverrides(),
      figmaConfiguration: coreData.figmaConfiguration
    };
  }

  /**
   * Get operation statistics
   */
  getOperationStats() {
    return {
      queueLength: this.operationQueue.length,
      isProcessing: this.isProcessing,
      currentState: this.currentState,
      listenerCount: this.eventListeners.length
    };
  }

  /**
   * Clear operation queue
   */
  clearQueue(): void {
    this.operationQueue = [];
    console.log('[DataFlowController] Operation queue cleared');
  }

  /**
   * Reset controller state
   */
  reset(): void {
    this.currentState = {
      operation: 'load',
      status: 'idle',
      progress: 0,
      message: 'Data flow controller reset',
      timestamp: new Date().toISOString()
    };
    
    this.operationQueue = [];
    this.isProcessing = false;
    
    console.log('[DataFlowController] Controller state reset');
  }
}

// Export singleton instance
export const dataFlowController = DataFlowController.getInstance();
