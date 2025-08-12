import { validateTokenSystem } from '@token-model/data-model';
import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrideFile,
  Token,
  TokenCollection,
  Mode,
  Dimension,
  Platform,
  Theme,
  Taxonomy,
  ResolvedValueType,
  ComponentProperty,
  ComponentCategory,
  Component
} from '@token-model/data-model';

// Feature flag for gradual rollout
const UNIFIED_STORAGE_ENABLED = process.env.REACT_APP_UNIFIED_STORAGE_ENABLED === 'true' || false;

// Storage keys for unified storage
const UNIFIED_STORAGE_KEYS = {
  CORE_DATA: 'token-model:unified:core-data',
  SOURCE_SNAPSHOT: 'token-model:unified:source-snapshot',
  LOCAL_EDITS: 'token-model:unified:local-edits',
  MERGED_DATA: 'token-model:unified:merged-data',
  SOURCE_CONTEXT: 'token-model:unified:source-context',
  TRANSACTION_LOG: 'token-model:unified:transaction-log',
  MIGRATION_STATUS: 'token-model:unified:migration-status'
} as const;

// Data types supported by unified storage
export type UnifiedDataType = 'TokenSystem' | 'PlatformExtension' | 'ThemeOverrideFile';

// Transaction interface for atomic operations
export interface StorageTransaction {
  id: string;
  timestamp: string;
  operations: Array<{
    type: 'read' | 'write' | 'delete';
    key: string;
    data?: unknown;
    previousData?: unknown;
  }>;
  status: 'pending' | 'committed' | 'rolled-back';
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: unknown;
}

// Error types for unified storage
export class UnifiedStorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'UnifiedStorageError';
  }
}

// Migration status interface
export interface MigrationStatus {
  isComplete: boolean;
  completedSteps: string[];
  failedSteps: string[];
  lastUpdated: string;
  errors: string[];
}

/**
 * Unified Storage Service - Single API for all data storage operations
 * 
 * This service consolidates all data storage operations with:
 * - Single API for all data access patterns
 * - Comprehensive TypeScript types and validation
 * - Atomic operations with transaction support
 * - Detailed logging for debugging
 * - Performance monitoring and optimization
 */
export class UnifiedStorageService {
  private static instance: UnifiedStorageService;
  private transactionLog: StorageTransaction[] = [];
  private validationCache = new Map<string, ValidationResult>();

  private constructor() {
    console.log('[UnifiedStorageService] Initializing with feature flag:', UNIFIED_STORAGE_ENABLED);
    this.initializeMigrationStatus();
  }

  static getInstance(): UnifiedStorageService {
    if (!UnifiedStorageService.instance) {
      UnifiedStorageService.instance = new UnifiedStorageService();
    }
    return UnifiedStorageService.instance;
  }

  /**
   * Check if unified storage is enabled
   */
  static isEnabled(): boolean {
    return UNIFIED_STORAGE_ENABLED;
  }

  /**
   * Initialize migration status
   */
  private initializeMigrationStatus(): void {
    const existingStatus = this.getMigrationStatus();
    if (!existingStatus) {
      const initialStatus: MigrationStatus = {
        isComplete: false,
        completedSteps: [],
        failedSteps: [],
        lastUpdated: new Date().toISOString(),
        errors: []
      };
      this.setMigrationStatus(initialStatus);
    }
  }

  /**
   * Get migration status
   */
  private getMigrationStatus(): MigrationStatus | null {
    try {
      const status = localStorage.getItem(UNIFIED_STORAGE_KEYS.MIGRATION_STATUS);
      return status ? JSON.parse(status) : null;
    } catch (error) {
      console.error('[UnifiedStorageService] Failed to get migration status:', error);
      return null;
    }
  }

  /**
   * Set migration status
   */
  private setMigrationStatus(status: MigrationStatus): void {
    try {
      localStorage.setItem(UNIFIED_STORAGE_KEYS.MIGRATION_STATUS, JSON.stringify(status));
    } catch (error) {
      console.error('[UnifiedStorageService] Failed to set migration status:', error);
    }
  }

  /**
   * Update migration status
   */
  private updateMigrationStatus(updates: Partial<MigrationStatus>): void {
    const currentStatus = this.getMigrationStatus();
    if (currentStatus) {
      const updatedStatus: MigrationStatus = {
        ...currentStatus,
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      this.setMigrationStatus(updatedStatus);
    }
  }

  /**
   * Start a new transaction
   */
  private startTransaction(): StorageTransaction {
    const transaction: StorageTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      operations: [],
      status: 'pending'
    };
    
    console.log('[UnifiedStorageService] Started transaction:', transaction.id);
    return transaction;
  }

  /**
   * Commit a transaction
   */
  private commitTransaction(transaction: StorageTransaction): void {
    try {
      // Apply all operations atomically
      for (const operation of transaction.operations) {
        switch (operation.type) {
          case 'write':
            localStorage.setItem(operation.key, JSON.stringify(operation.data));
            break;
          case 'delete':
            localStorage.removeItem(operation.key);
            break;
        }
      }

      transaction.status = 'committed';
      this.transactionLog.push(transaction);
      
      console.log('[UnifiedStorageService] Committed transaction:', transaction.id);
    } catch (error) {
      console.error('[UnifiedStorageService] Failed to commit transaction:', transaction.id, error);
      this.rollbackTransaction(transaction);
      throw new UnifiedStorageError(
        `Failed to commit transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSACTION_COMMIT_FAILED',
        { transactionId: transaction.id }
      );
    }
  }

  /**
   * Rollback a transaction
   */
  private rollbackTransaction(transaction: StorageTransaction): void {
    try {
      // Rollback operations in reverse order
      for (let i = transaction.operations.length - 1; i >= 0; i--) {
        const operation = transaction.operations[i];
        if (operation.previousData !== undefined) {
          localStorage.setItem(operation.key, JSON.stringify(operation.previousData));
        } else {
          localStorage.removeItem(operation.key);
        }
      }

      transaction.status = 'rolled-back';
      console.log('[UnifiedStorageService] Rolled back transaction:', transaction.id);
    } catch (error) {
      console.error('[UnifiedStorageService] Failed to rollback transaction:', transaction.id, error);
      throw new UnifiedStorageError(
        `Failed to rollback transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSACTION_ROLLBACK_FAILED',
        { transactionId: transaction.id }
      );
    }
  }

  /**
   * Validate data against schema
   */
  private validateData(data: unknown, dataType: UnifiedDataType): ValidationResult {
    const cacheKey = `${dataType}_${JSON.stringify(data)}`;
    
    // Check cache first
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: []
    };

    try {
      switch (dataType) {
        case 'TokenSystem':
          if (data && typeof data === 'object') {
            const validationResult = validateTokenSystem(data as TokenSystem);
            result.isValid = validationResult.isValid;
            result.errors = validationResult.errors || [];
            result.warnings = validationResult.warnings || [];
            result.data = data;
          } else {
            result.errors.push('Data is not a valid object');
          }
          break;
        
        case 'PlatformExtension':
          // Basic validation for PlatformExtension
          if (data && typeof data === 'object' && 'platformId' in data) {
            result.isValid = true;
            result.data = data;
          } else {
            result.errors.push('Data is not a valid PlatformExtension');
          }
          break;
        
        case 'ThemeOverrideFile':
          // Basic validation for ThemeOverrideFile
          if (data && typeof data === 'object' && 'themeId' in data) {
            result.isValid = true;
            result.data = data;
          } else {
            result.errors.push('Data is not a valid ThemeOverrideFile');
          }
          break;
        
        default:
          result.errors.push(`Unknown data type: ${dataType}`);
      }
    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Cache result
    this.validationCache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Get data from storage with validation
   */
  getData<T>(key: string, dataType?: UnifiedDataType): T | null {
    try {
      console.log('[UnifiedStorageService] Getting data:', key);
      
      const data = localStorage.getItem(key);
      if (!data) {
        return null;
      }

      const parsedData = JSON.parse(data);
      
      // Validate data if type is specified
      if (dataType) {
        const validation = this.validateData(parsedData, dataType);
        if (!validation.isValid) {
          console.warn('[UnifiedStorageService] Data validation failed:', validation.errors);
          throw new UnifiedStorageError(
            `Data validation failed: ${validation.errors.join(', ')}`,
            'DATA_VALIDATION_FAILED',
            { key, dataType, errors: validation.errors }
          );
        }
      }

      return parsedData as T;
    } catch (error) {
      console.error('[UnifiedStorageService] Failed to get data:', key, error);
      if (error instanceof UnifiedStorageError) {
        throw error;
      }
      throw new UnifiedStorageError(
        `Failed to get data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATA_GET_FAILED',
        { key }
      );
    }
  }

  /**
   * Set data in storage with validation
   */
  setData<T>(key: string, data: T, dataType?: UnifiedDataType): void {
    try {
      console.log('[UnifiedStorageService] Setting data:', key);
      
      // Validate data if type is specified
      if (dataType) {
        const validation = this.validateData(data, dataType);
        if (!validation.isValid) {
          console.error('[UnifiedStorageService] Data validation failed:', validation.errors);
          throw new UnifiedStorageError(
            `Data validation failed: ${validation.errors.join(', ')}`,
            'DATA_VALIDATION_FAILED',
            { key, dataType, errors: validation.errors }
          );
        }
      }

      // Start transaction for atomic operation
      const transaction = this.startTransaction();
      
      // Store previous data for rollback
      const previousData = localStorage.getItem(key);
      
      transaction.operations.push({
        type: 'write',
        key,
        data,
        previousData: previousData ? JSON.parse(previousData) : undefined
      });

      this.commitTransaction(transaction);
      
      console.log('[UnifiedStorageService] Successfully set data:', key);
    } catch (error) {
      console.error('[UnifiedStorageService] Failed to set data:', key, error);
      if (error instanceof UnifiedStorageError) {
        throw error;
      }
      throw new UnifiedStorageError(
        `Failed to set data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATA_SET_FAILED',
        { key }
      );
    }
  }

  /**
   * Delete data from storage
   */
  deleteData(key: string): void {
    try {
      console.log('[UnifiedStorageService] Deleting data:', key);
      
      // Start transaction for atomic operation
      const transaction = this.startTransaction();
      
      // Store previous data for rollback
      const previousData = localStorage.getItem(key);
      
      transaction.operations.push({
        type: 'delete',
        key,
        previousData: previousData ? JSON.parse(previousData) : undefined
      });

      this.commitTransaction(transaction);
      
      console.log('[UnifiedStorageService] Successfully deleted data:', key);
    } catch (error) {
      console.error('[UnifiedStorageService] Failed to delete data:', key, error);
      throw new UnifiedStorageError(
        `Failed to delete data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DATA_DELETE_FAILED',
        { key }
      );
    }
  }

  /**
   * Check if data exists in storage
   */
  hasData(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error('[UnifiedStorageService] Failed to check data existence:', key, error);
      return false;
    }
  }

  /**
   * Clear all unified storage data
   */
  clearAllData(): void {
    try {
      console.log('[UnifiedStorageService] Clearing all unified storage data');
      
      const transaction = this.startTransaction();
      
      // Store previous data for all keys
      Object.values(UNIFIED_STORAGE_KEYS).forEach(key => {
        const previousData = localStorage.getItem(key);
        if (previousData) {
          transaction.operations.push({
            type: 'delete',
            key,
            previousData: JSON.parse(previousData)
          });
        }
      });

      this.commitTransaction(transaction);
      
      // Clear validation cache
      this.validationCache.clear();
      
      console.log('[UnifiedStorageService] Successfully cleared all unified storage data');
    } catch (error) {
      console.error('[UnifiedStorageService] Failed to clear all data:', error);
      throw new UnifiedStorageError(
        `Failed to clear all data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CLEAR_ALL_FAILED'
      );
    }
  }

  /**
   * Get transaction log for debugging
   */
  getTransactionLog(): StorageTransaction[] {
    return [...this.transactionLog];
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    totalKeys: number;
    totalSize: number;
    transactionCount: number;
    validationCacheSize: number;
  } {
    try {
      let totalSize = 0;
      let totalKeys = 0;
      
      Object.values(UNIFIED_STORAGE_KEYS).forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          totalSize += data.length;
          totalKeys++;
        }
      });

      return {
        totalKeys,
        totalSize,
        transactionCount: this.transactionLog.length,
        validationCacheSize: this.validationCache.size
      };
    } catch (error) {
      console.error('[UnifiedStorageService] Failed to get storage stats:', error);
      return {
        totalKeys: 0,
        totalSize: 0,
        transactionCount: this.transactionLog.length,
        validationCacheSize: this.validationCache.size
      };
    }
  }

  /**
   * Clear validation cache
   */
  clearValidationCache(): void {
    this.validationCache.clear();
    console.log('[UnifiedStorageService] Cleared validation cache');
  }

  /**
   * Get migration status
   */
  getMigrationStatus(): MigrationStatus | null {
    return this.getMigrationStatus();
  }

  /**
   * Update migration step
   */
  updateMigrationStep(step: string, success: boolean): void {
    const currentStatus = this.getMigrationStatus();
    if (currentStatus) {
      if (success) {
        currentStatus.completedSteps.push(step);
      } else {
        currentStatus.failedSteps.push(step);
        currentStatus.errors.push(`Failed to complete step: ${step}`);
      }
      
      if (currentStatus.failedSteps.length === 0) {
        currentStatus.isComplete = true;
      }
      
      this.setMigrationStatus(currentStatus);
    }
  }
}

// Export singleton instance
export const unifiedStorageService = UnifiedStorageService.getInstance();
