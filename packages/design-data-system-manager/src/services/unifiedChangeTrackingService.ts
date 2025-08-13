import { unifiedStorageService } from './unifiedStorageService';
import { dataValidationService } from './dataValidationService';
import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrideFile,
  Token,
  TokenCollection,
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
const UNIFIED_CHANGE_TRACKING_ENABLED = process.env.REACT_APP_UNIFIED_CHANGE_TRACKING_ENABLED === 'true' || false;

// Change types
export type ChangeType = 'create' | 'update' | 'delete' | 'merge' | 'rollback';

// Change status
export type ChangeStatus = 'pending' | 'applied' | 'committed' | 'rolled-back' | 'error';

// Change entry interface
export interface ChangeEntry {
  id: string;
  timestamp: string;
  type: ChangeType;
  status: ChangeStatus;
  dataType: 'TokenSystem' | 'PlatformExtension' | 'ThemeOverrideFile' | 'Token' | 'TokenCollection' | 'Dimension' | 'Platform' | 'Theme' | 'Taxonomy' | 'ResolvedValueType' | 'ComponentProperty' | 'ComponentCategory' | 'Component';
  entityId: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  error?: string;
}

// Baseline interface
export interface Baseline {
  id: string;
  timestamp: string;
  name: string;
  description?: string;
  dataSnapshot: {
    core: TokenSystem | null;
    platformExtensions: Record<string, PlatformExtension>;
    themeOverrides: Record<string, ThemeOverrideFile>;
  };
  changeCount: number;
  isActive: boolean;
}

// Change tracking options
export interface ChangeTrackingOptions {
  enableValidation?: boolean;
  enableOptimisticUpdates?: boolean;
  enableAutoCommit?: boolean;
  maxChangeHistory?: number;
  baselineRetentionDays?: number;
}

// Default change tracking options
const DEFAULT_CHANGE_TRACKING_OPTIONS: ChangeTrackingOptions = {
  enableValidation: true,
  enableOptimisticUpdates: true,
  enableAutoCommit: false,
  maxChangeHistory: 1000,
  baselineRetentionDays: 30
};

// Change tracking event interface
export interface ChangeTrackingEvent {
  type: 'change-applied' | 'change-committed' | 'change-rolled-back' | 'baseline-created' | 'baseline-activated' | 'validation-failed';
  change?: ChangeEntry;
  baseline?: Baseline;
  error?: string;
}

// Error types for change tracking
export class ChangeTrackingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly changeId?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ChangeTrackingError';
  }
}

/**
 * Unified Change Tracking Service - Unified change tracking with clear baselines
 * 
 * This service provides:
 * - Unified change tracking with clear baselines
 * - Real-time change detection and validation
 * - Optimistic UI updates with rollback capability
 * - Performance optimization for change tracking
 * - Integration with existing change tracking services
 */
export class UnifiedChangeTrackingService {
  private static instance: UnifiedChangeTrackingService;
  private changes: ChangeEntry[] = [];
  private baselines: Baseline[] = [];
  private eventListeners: Array<(event: ChangeTrackingEvent) => void> = [];
  private currentBaselineId: string | null = null;
  private options: ChangeTrackingOptions;

  private constructor() {
    this.options = { ...DEFAULT_CHANGE_TRACKING_OPTIONS };
    console.log('[UnifiedChangeTrackingService] Initializing with feature flag:', UNIFIED_CHANGE_TRACKING_ENABLED);
    this.loadFromStorage();
  }

  static getInstance(): UnifiedChangeTrackingService {
    if (!UnifiedChangeTrackingService.instance) {
      UnifiedChangeTrackingService.instance = new UnifiedChangeTrackingService();
    }
    return UnifiedChangeTrackingService.instance;
  }

  /**
   * Check if unified change tracking is enabled
   */
  static isEnabled(): boolean {
    return UNIFIED_CHANGE_TRACKING_ENABLED;
  }

  /**
   * Configure change tracking options
   */
  configure(options: Partial<ChangeTrackingOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('[UnifiedChangeTrackingService] Configuration updated:', this.options);
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: ChangeTrackingEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: ChangeTrackingEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: ChangeTrackingEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[UnifiedChangeTrackingService] Error in event listener:', error);
      }
    });
  }

  /**
   * Generate unique change ID
   */
  private generateChangeId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique baseline ID
   */
  private generateBaselineId(): string {
    return `baseline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a new baseline
   */
  createBaseline(
    name: string,
    description?: string,
    dataSnapshot?: Baseline['dataSnapshot']
  ): Baseline {
    console.log('[UnifiedChangeTrackingService] Creating baseline:', name);

    const baseline: Baseline = {
      id: this.generateBaselineId(),
      timestamp: new Date().toISOString(),
      name,
      description,
      dataSnapshot: dataSnapshot || {
        core: null,
        platformExtensions: {},
        themeOverrides: {}
      },
      changeCount: 0,
      isActive: false
    };

    this.baselines.push(baseline);
    this.saveToStorage();

    this.emitEvent({
      type: 'baseline-created',
      baseline
    });

    console.log('[UnifiedChangeTrackingService] Baseline created:', baseline.id);
    return baseline;
  }

  /**
   * Activate a baseline
   */
  activateBaseline(baselineId: string): void {
    console.log('[UnifiedChangeTrackingService] Activating baseline:', baselineId);

    // Deactivate current baseline
    if (this.currentBaselineId) {
      const currentBaseline = this.baselines.find(b => b.id === this.currentBaselineId);
      if (currentBaseline) {
        currentBaseline.isActive = false;
      }
    }

    // Activate new baseline
    const baseline = this.baselines.find(b => b.id === baselineId);
    if (!baseline) {
      throw new ChangeTrackingError(
        `Baseline not found: ${baselineId}`,
        'BASELINE_NOT_FOUND',
        undefined,
        { baselineId }
      );
    }

    baseline.isActive = true;
    this.currentBaselineId = baselineId;
    this.saveToStorage();

    this.emitEvent({
      type: 'baseline-activated',
      baseline
    });

    console.log('[UnifiedChangeTrackingService] Baseline activated:', baselineId);
  }

  /**
   * Get current baseline
   */
  getCurrentBaseline(): Baseline | null {
    if (!this.currentBaselineId) {
      return null;
    }
    return this.baselines.find(b => b.id === this.currentBaselineId) || null;
  }

  /**
   * Get all baselines
   */
  getBaselines(): Baseline[] {
    return [...this.baselines];
  }

  /**
   * Track a change
   */
  trackChange(
    type: ChangeType,
    dataType: ChangeEntry['dataType'],
    entityId: string,
    newValue: unknown,
    oldValue?: unknown,
    field?: string,
    metadata?: Record<string, unknown>
  ): ChangeEntry {
    console.log('[UnifiedChangeTrackingService] Tracking change:', {
      type,
      dataType,
      entityId,
      field
    });

    const change: ChangeEntry = {
      id: this.generateChangeId(),
      timestamp: new Date().toISOString(),
      type,
      status: 'pending',
      dataType,
      entityId,
      field,
      oldValue,
      newValue,
      metadata
    };

    // Validate change if enabled
    if (this.options.enableValidation) {
      try {
        this.validateChange(change);
      } catch (error) {
        change.status = 'error';
        change.error = error instanceof Error ? error.message : 'Validation failed';
        
        this.emitEvent({
          type: 'validation-failed',
          change,
          error: change.error
        });

        throw new ChangeTrackingError(
          `Change validation failed: ${change.error}`,
          'VALIDATION_FAILED',
          change.id,
          { change }
        );
      }
    }

    // Apply change optimistically if enabled
    if (this.options.enableOptimisticUpdates) {
      this.applyChangeOptimistically(change);
    }

    // Add to change history
    this.changes.push(change);

    // Update baseline change count
    if (this.currentBaselineId) {
      const baseline = this.baselines.find(b => b.id === this.currentBaselineId);
      if (baseline) {
        baseline.changeCount++;
      }
    }

    // Limit change history
    if (this.changes.length > this.options.maxChangeHistory!) {
      this.changes = this.changes.slice(-this.options.maxChangeHistory!);
    }

    this.saveToStorage();

    this.emitEvent({
      type: 'change-applied',
      change
    });

    console.log('[UnifiedChangeTrackingService] Change tracked:', change.id);
    return change;
  }

  /**
   * Apply change optimistically
   */
  private applyChangeOptimistically(change: ChangeEntry): void {
    try {
      // This would integrate with the actual data storage
      // For now, we just mark the change as applied
      change.status = 'applied';
      
      console.log('[UnifiedChangeTrackingService] Change applied optimistically:', change.id);
    } catch (error) {
      change.status = 'error';
      change.error = error instanceof Error ? error.message : 'Optimistic update failed';
      throw new ChangeTrackingError(
        `Optimistic update failed: ${change.error}`,
        'OPTIMISTIC_UPDATE_FAILED',
        change.id,
        { change, originalError: error }
      );
    }
  }

  /**
   * Validate change
   */
  private validateChange(change: ChangeEntry): void {
    // Basic validation
    if (!change.entityId) {
      throw new Error('Entity ID is required');
    }

    if (!change.newValue && change.type !== 'delete') {
      throw new Error('New value is required for non-delete operations');
    }

    // Data type specific validation
    switch (change.dataType) {
      case 'TokenSystem':
        if (change.newValue && typeof change.newValue === 'object') {
          const validation = dataValidationService.validateTokenSystem(change.newValue);
          if (!validation.isValid) {
            throw new Error(`TokenSystem validation failed: ${validation.errors.join(', ')}`);
          }
        }
        break;
      
      case 'PlatformExtension':
        if (change.newValue && typeof change.newValue === 'object') {
          const validation = dataValidationService.validatePlatformExtension(change.newValue);
          if (!validation.isValid) {
            throw new Error(`PlatformExtension validation failed: ${validation.errors.join(', ')}`);
          }
        }
        break;
      
      case 'ThemeOverrideFile':
        if (change.newValue && typeof change.newValue === 'object') {
          const validation = dataValidationService.validateThemeOverrideFile(change.newValue);
          if (!validation.isValid) {
            throw new Error(`ThemeOverrideFile validation failed: ${validation.errors.join(', ')}`);
          }
        }
        break;
    }
  }

  /**
   * Commit a change
   */
  commitChange(changeId: string): void {
    console.log('[UnifiedChangeTrackingService] Committing change:', changeId);

    const change = this.changes.find(c => c.id === changeId);
    if (!change) {
      throw new ChangeTrackingError(
        `Change not found: ${changeId}`,
        'CHANGE_NOT_FOUND',
        changeId
      );
    }

    if (change.status === 'error') {
      throw new ChangeTrackingError(
        `Cannot commit change with error status: ${change.error}`,
        'COMMIT_ERROR_STATUS',
        changeId,
        { change }
      );
    }

    change.status = 'committed';
    this.saveToStorage();

    this.emitEvent({
      type: 'change-committed',
      change
    });

    console.log('[UnifiedChangeTrackingService] Change committed:', changeId);
  }

  /**
   * Rollback a change
   */
  rollbackChange(changeId: string): void {
    console.log('[UnifiedChangeTrackingService] Rolling back change:', changeId);

    const change = this.changes.find(c => c.id === changeId);
    if (!change) {
      throw new ChangeTrackingError(
        `Change not found: ${changeId}`,
        'CHANGE_NOT_FOUND',
        changeId
      );
    }

    // Restore old value
    if (change.oldValue !== undefined) {
      // This would integrate with the actual data storage
      // For now, we just mark the change as rolled back
      change.status = 'rolled-back';
    } else {
      change.status = 'error';
      change.error = 'Cannot rollback: no old value available';
    }

    this.saveToStorage();

    this.emitEvent({
      type: 'change-rolled-back',
      change
    });

    console.log('[UnifiedChangeTrackingService] Change rolled back:', changeId);
  }

  /**
   * Rollback to baseline
   */
  rollbackToBaseline(baselineId: string): void {
    console.log('[UnifiedChangeTrackingService] Rolling back to baseline:', baselineId);

    const baseline = this.baselines.find(b => b.id === baselineId);
    if (!baseline) {
      throw new ChangeTrackingError(
        `Baseline not found: ${baselineId}`,
        'BASELINE_NOT_FOUND',
        undefined,
        { baselineId }
      );
    }

    // Get changes since baseline
    const baselineIndex = this.baselines.findIndex(b => b.id === baselineId);
    const changesToRollback = this.changes.filter(change => {
      const changeTimestamp = new Date(change.timestamp);
      const baselineTimestamp = new Date(baseline.timestamp);
      return changeTimestamp > baselineTimestamp;
    });

    // Rollback changes in reverse order
    for (let i = changesToRollback.length - 1; i >= 0; i--) {
      const change = changesToRollback[i];
      this.rollbackChange(change.id);
    }

    // Activate baseline
    this.activateBaseline(baselineId);

    console.log('[UnifiedChangeTrackingService] Rolled back to baseline:', baselineId);
  }

  /**
   * Get changes since baseline
   */
  getChangesSinceBaseline(baselineId: string): ChangeEntry[] {
    const baseline = this.baselines.find(b => b.id === baselineId);
    if (!baseline) {
      throw new ChangeTrackingError(
        `Baseline not found: ${baselineId}`,
        'BASELINE_NOT_FOUND',
        undefined,
        { baselineId }
      );
    }

    const baselineTimestamp = new Date(baseline.timestamp);
    return this.changes.filter(change => {
      const changeTimestamp = new Date(change.timestamp);
      return changeTimestamp > baselineTimestamp;
    });
  }

  /**
   * Get all changes
   */
  getChanges(): ChangeEntry[] {
    return [...this.changes];
  }

  /**
   * Get changes by entity
   */
  getChangesByEntity(entityId: string): ChangeEntry[] {
    return this.changes.filter(change => change.entityId === entityId);
  }

  /**
   * Get changes by type
   */
  getChangesByType(type: ChangeType): ChangeEntry[] {
    return this.changes.filter(change => change.type === type);
  }

  /**
   * Get changes by data type
   */
  getChangesByDataType(dataType: ChangeEntry['dataType']): ChangeEntry[] {
    return this.changes.filter(change => change.dataType === dataType);
  }

  /**
   * Clear change history
   */
  clearChangeHistory(): void {
    console.log('[UnifiedChangeTrackingService] Clearing change history');
    this.changes = [];
    this.saveToStorage();
  }

  /**
   * Clean up old baselines
   */
  cleanupOldBaselines(): void {
    const retentionDays = this.options.baselineRetentionDays!;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldBaselines = this.baselines.filter(baseline => {
      const baselineDate = new Date(baseline.timestamp);
      return baselineDate < cutoffDate && !baseline.isActive;
    });

    oldBaselines.forEach(baseline => {
      const index = this.baselines.findIndex(b => b.id === baseline.id);
      if (index > -1) {
        this.baselines.splice(index, 1);
      }
    });

    if (oldBaselines.length > 0) {
      console.log(`[UnifiedChangeTrackingService] Cleaned up ${oldBaselines.length} old baselines`);
      this.saveToStorage();
    }
  }

  /**
   * Get change tracking statistics
   */
  getStatistics(): {
    totalChanges: number;
    pendingChanges: number;
    committedChanges: number;
    rolledBackChanges: number;
    errorChanges: number;
    totalBaselines: number;
    activeBaseline: string | null;
  } {
    return {
      totalChanges: this.changes.length,
      pendingChanges: this.changes.filter(c => c.status === 'pending').length,
      committedChanges: this.changes.filter(c => c.status === 'committed').length,
      rolledBackChanges: this.changes.filter(c => c.status === 'rolled-back').length,
      errorChanges: this.changes.filter(c => c.status === 'error').length,
      totalBaselines: this.baselines.length,
      activeBaseline: this.currentBaselineId
    };
  }

  /**
   * Load data from storage
   */
  private loadFromStorage(): void {
    if (!unifiedStorageService.isEnabled()) {
      return;
    }

    try {
      const storedChanges = unifiedStorageService.getData<ChangeEntry[]>('token-model:unified:change-history');
      if (storedChanges) {
        this.changes = storedChanges;
      }

      const storedBaselines = unifiedStorageService.getData<Baseline[]>('token-model:unified:baselines');
      if (storedBaselines) {
        this.baselines = storedBaselines;
        this.currentBaselineId = this.baselines.find(b => b.isActive)?.id || null;
      }

      console.log('[UnifiedChangeTrackingService] Loaded from storage:', {
        changesCount: this.changes.length,
        baselinesCount: this.baselines.length,
        activeBaseline: this.currentBaselineId
      });
    } catch (error) {
      console.error('[UnifiedChangeTrackingService] Failed to load from storage:', error);
    }
  }

  /**
   * Save data to storage
   */
  private saveToStorage(): void {
    if (!unifiedStorageService.isEnabled()) {
      return;
    }

    try {
      unifiedStorageService.setData('token-model:unified:change-history', this.changes);
      unifiedStorageService.setData('token-model:unified:baselines', this.baselines);
    } catch (error) {
      console.error('[UnifiedChangeTrackingService] Failed to save to storage:', error);
    }
  }
}

// Export singleton instance
export const unifiedChangeTrackingService = UnifiedChangeTrackingService.getInstance();
