import { unifiedUIIntegrationService } from './unifiedUIIntegrationService';
import { unifiedChangeTrackingService } from './unifiedChangeTrackingService';
import { dataValidationService } from './dataValidationService';
import { DataManager } from './dataManager';
import { StorageService } from './storage';
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
import type { UIComponentType } from './unifiedUIIntegrationService';

// Feature flag for gradual rollout
const UNIFIED_EDIT_MODE_ENABLED = process.env.REACT_APP_UNIFIED_EDIT_MODE_ENABLED === 'true' || false;

// Edit mode types
export type EditModeType = 'view' | 'edit' | 'create' | 'delete' | 'merge' | 'validate';

// Edit mode status
export type EditModeStatus = 'idle' | 'editing' | 'saving' | 'validating' | 'error' | 'success';

// Edit session interface
export interface EditSession {
  id: string;
  componentType: UIComponentType;
  entityId: string;
  mode: EditModeType;
  status: EditModeStatus;
  startTime: string;
  lastModified: string;
  originalData: unknown;
  currentData: unknown;
  validationErrors: string[];
  changeCount: number;
  metadata?: Record<string, unknown>;
}

// Edit mode options
export interface EditModeOptions {
  enableAutoSave?: boolean;
  enableRealTimeValidation?: boolean;
  enableOptimisticUpdates?: boolean;
  enableChangeTracking?: boolean;
  autoSaveInterval?: number; // milliseconds
  validationDebounce?: number; // milliseconds
  maxUndoSteps?: number;
}

// Default edit mode options
const DEFAULT_EDIT_MODE_OPTIONS: EditModeOptions = {
  enableAutoSave: true,
  enableRealTimeValidation: true,
  enableOptimisticUpdates: true,
  enableChangeTracking: true,
  autoSaveInterval: 5000, // 5 seconds
  validationDebounce: 300, // 300ms
  maxUndoSteps: 50
};

// Edit mode event interface
export interface EditModeEvent {
  type: 'session-started' | 'session-ended' | 'data-changed' | 'validation-failed' | 'auto-saved' | 'undo-performed' | 'redo-performed';
  session: EditSession;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Undo/Redo entry interface
export interface UndoRedoEntry {
  id: string;
  timestamp: string;
  data: unknown;
  description: string;
  sessionId: string;
}

// Error types for edit mode
export class EditModeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly sessionId: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EditModeError';
  }
}

/**
 * Unified Edit Mode Service - Unified edit mode state management
 * 
 * This service provides:
 * - Unified edit mode state management
 * - Consistent edit workflow across all data types
 * - Real-time validation during editing
 * - Clear user feedback for edit operations
 * - Integration with existing edit mode logic
 */
export class UnifiedEditModeService {
  private static instance: UnifiedEditModeService;
  private activeSessions: Map<string, EditSession> = new Map();
  private eventListeners: Array<(event: EditModeEvent) => void> = [];
  private undoStacks: Map<string, UndoRedoEntry[]> = new Map();
  private redoStacks: Map<string, UndoRedoEntry[]> = new Map();
  private autoSaveTimers: Map<string, NodeJS.Timeout> = new Map();
  private validationTimers: Map<string, NodeJS.Timeout> = new Map();
  private options: EditModeOptions;

  private constructor() {
    this.options = { ...DEFAULT_EDIT_MODE_OPTIONS };
    console.log('[UnifiedEditModeService] Initializing with feature flag:', UNIFIED_EDIT_MODE_ENABLED);
  }

  static getInstance(): UnifiedEditModeService {
    if (!UnifiedEditModeService.instance) {
      UnifiedEditModeService.instance = new UnifiedEditModeService();
    }
    return UnifiedEditModeService.instance;
  }

  /**
   * Check if unified edit mode is enabled
   */
  static isEnabled(): boolean {
    return UNIFIED_EDIT_MODE_ENABLED;
  }

  /**
   * Configure edit mode options
   */
  configure(options: Partial<EditModeOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('[UnifiedEditModeService] Configuration updated:', this.options);
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: EditModeEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: EditModeEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: EditModeEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[UnifiedEditModeService] Error in event listener:', error);
      }
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start edit session
   */
  startEditSession(
    componentType: UIComponentType,
    entityId: string,
    mode: EditModeType,
    initialData: unknown,
    metadata?: Record<string, unknown>
  ): EditSession {
    console.log('[UnifiedEditModeService] Starting edit session:', {
      componentType,
      entityId,
      mode
    });

    const sessionId = this.generateSessionId();
    const now = new Date().toISOString();

    const session: EditSession = {
      id: sessionId,
      componentType,
      entityId,
      mode,
      status: 'editing',
      startTime: now,
      lastModified: now,
      originalData: this.deepClone(initialData),
      currentData: this.deepClone(initialData),
      validationErrors: [],
      changeCount: 0,
      metadata
    };

    this.activeSessions.set(sessionId, session);

    // Initialize undo/redo stacks
    this.undoStacks.set(sessionId, []);
    this.redoStacks.set(sessionId, []);

    // Start auto-save timer if enabled
    if (this.options.enableAutoSave) {
      this.startAutoSaveTimer(sessionId);
    }

    // Track change if change tracking is enabled
    if (this.options.enableChangeTracking && unifiedChangeTrackingService.isEnabled()) {
      unifiedChangeTrackingService.trackChange(
        'create',
        this.mapComponentTypeToDataType(componentType),
        entityId,
        initialData,
        undefined,
        'edit-session'
      );
    }

    this.emitEvent({
      type: 'session-started',
      session
    });

    console.log('[UnifiedEditModeService] Edit session started:', sessionId);
    return session;
  }

  /**
   * Update data in edit session
   */
  updateSessionData(
    sessionId: string,
    newData: unknown,
    description?: string
  ): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new EditModeError(
        `Edit session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    console.log('[UnifiedEditModeService] Updating session data:', sessionId);

    // Add to undo stack
    this.addToUndoStack(sessionId, session.currentData, description || 'Data update');

    // Update session data
    session.currentData = this.deepClone(newData);
    session.lastModified = new Date().toISOString();
    session.changeCount++;

    // Clear redo stack
    this.redoStacks.set(sessionId, []);

    // Perform real-time validation if enabled
    if (this.options.enableRealTimeValidation) {
      this.scheduleValidation(sessionId);
    }

    // Track change if change tracking is enabled
    if (this.options.enableChangeTracking && unifiedChangeTrackingService.isEnabled()) {
      unifiedChangeTrackingService.trackChange(
        'update',
        this.mapComponentTypeToDataType(session.componentType),
        session.entityId,
        newData,
        session.originalData,
        'data-update'
      );
    }

    this.emitEvent({
      type: 'data-changed',
      session
    });
  }

  /**
   * Validate session data
   */
  async validateSession(sessionId: string): Promise<{ isValid: boolean; errors: string[] }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new EditModeError(
        `Edit session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    console.log('[UnifiedEditModeService] Validating session:', sessionId);

    try {
      session.status = 'validating';
      const dataType = this.mapComponentTypeToDataType(session.componentType);
      
      let validation: { isValid: boolean; errors: string[]; warnings: string[] };
      
      switch (dataType) {
        case 'TokenSystem':
          validation = dataValidationService.validateTokenSystem(session.currentData as TokenSystem);
          break;
        case 'PlatformExtension':
          validation = dataValidationService.validatePlatformExtension(session.currentData as PlatformExtension);
          break;
        case 'ThemeOverrideFile':
          validation = dataValidationService.validateThemeOverrideFile(session.currentData as ThemeOverrideFile);
          break;
        default:
          validation = { isValid: true, errors: [], warnings: [] };
      }

      session.validationErrors = validation.errors;
      session.status = validation.isValid ? 'editing' : 'error';

      if (!validation.isValid) {
        this.emitEvent({
          type: 'validation-failed',
          session,
          error: validation.errors.join(', ')
        });
      }

      return {
        isValid: validation.isValid,
        errors: validation.errors
      };

    } catch (error) {
      session.status = 'error';
      const errorMessage = error instanceof Error ? error.message : 'Validation failed';
      session.validationErrors = [errorMessage];

      this.emitEvent({
        type: 'validation-failed',
        session,
        error: errorMessage
      });

      throw new EditModeError(
        `Validation failed: ${errorMessage}`,
        'VALIDATION_FAILED',
        sessionId,
        { originalError: error }
      );
    }
  }

  /**
   * Save session data
   */
  async saveSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new EditModeError(
        `Edit session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    console.log('[UnifiedEditModeService] Saving session:', sessionId);

    try {
      session.status = 'saving';

      // Validate data before saving
      const validation = await this.validateSession(sessionId);
      if (!validation.isValid) {
        throw new EditModeError(
          `Cannot save invalid data: ${validation.errors.join(', ')}`,
          'VALIDATION_FAILED',
          sessionId
        );
      }

      // Update data through UI integration service
      await unifiedUIIntegrationService.updateDataForComponent(
        session.componentType,
        'editable',
        session.currentData,
        {
          validate: false, // Already validated
          optimistic: this.options.enableOptimisticUpdates
        }
      );

      session.status = 'success';

      this.emitEvent({
        type: 'session-ended',
        session
      });

      console.log('[UnifiedEditModeService] Session saved successfully:', sessionId);

    } catch (error) {
      session.status = 'error';
      const errorMessage = error instanceof Error ? error.message : 'Save failed';

      this.emitEvent({
        type: 'session-ended',
        session,
        error: errorMessage
      });

      throw new EditModeError(
        `Save failed: ${errorMessage}`,
        'SAVE_FAILED',
        sessionId,
        { originalError: error }
      );
    }
  }

  /**
   * End edit session
   */
  endEditSession(sessionId: string, saveChanges: boolean = false): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new EditModeError(
        `Edit session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    console.log('[UnifiedEditModeService] Ending edit session:', sessionId);

    // Clear timers
    this.clearAutoSaveTimer(sessionId);
    this.clearValidationTimer(sessionId);

    // Save changes if requested
    if (saveChanges && session.status === 'editing') {
      this.saveSession(sessionId).catch(error => {
        console.error('[UnifiedEditModeService] Failed to save session on end:', error);
      });
    }

    // Remove session
    this.activeSessions.delete(sessionId);
    this.undoStacks.delete(sessionId);
    this.redoStacks.delete(sessionId);

    this.emitEvent({
      type: 'session-ended',
      session
    });

    console.log('[UnifiedEditModeService] Edit session ended:', sessionId);
  }

  /**
   * Undo last change
   */
  undo(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new EditModeError(
        `Edit session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    const undoStack = this.undoStacks.get(sessionId) || [];
    if (undoStack.length === 0) {
      throw new EditModeError(
        'Nothing to undo',
        'NOTHING_TO_UNDO',
        sessionId
      );
    }

    console.log('[UnifiedEditModeService] Undoing change in session:', sessionId);

    // Get last undo entry
    const undoEntry = undoStack.pop()!;
    
    // Add current state to redo stack
    const redoStack = this.redoStacks.get(sessionId) || [];
    redoStack.push({
      id: this.generateSessionId(),
      timestamp: new Date().toISOString(),
      data: session.currentData,
      description: 'Redo entry',
      sessionId
    });
    this.redoStacks.set(sessionId, redoStack);

    // Restore previous state
    session.currentData = this.deepClone(undoEntry.data);
    session.lastModified = new Date().toISOString();
    session.changeCount--;

    this.emitEvent({
      type: 'undo-performed',
      session,
      metadata: { undoEntry }
    });

    console.log('[UnifiedEditModeService] Undo completed:', sessionId);
  }

  /**
   * Redo last undone change
   */
  redo(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new EditModeError(
        `Edit session not found: ${sessionId}`,
        'SESSION_NOT_FOUND',
        sessionId
      );
    }

    const redoStack = this.redoStacks.get(sessionId) || [];
    if (redoStack.length === 0) {
      throw new EditModeError(
        'Nothing to redo',
        'NOTHING_TO_REDO',
        sessionId
      );
    }

    console.log('[UnifiedEditModeService] Redoing change in session:', sessionId);

    // Get last redo entry
    const redoEntry = redoStack.pop()!;
    
    // Add current state to undo stack
    const undoStack = this.undoStacks.get(sessionId) || [];
    undoStack.push({
      id: this.generateSessionId(),
      timestamp: new Date().toISOString(),
      data: session.currentData,
      description: 'Undo entry',
      sessionId
    });
    this.undoStacks.set(sessionId, undoStack);

    // Restore redo state
    session.currentData = this.deepClone(redoEntry.data);
    session.lastModified = new Date().toISOString();
    session.changeCount++;

    this.emitEvent({
      type: 'redo-performed',
      session,
      metadata: { redoEntry }
    });

    console.log('[UnifiedEditModeService] Redo completed:', sessionId);
  }

  /**
   * Get active session
   */
  getSession(sessionId: string): EditSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): EditSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get sessions by component type
   */
  getSessionsByComponentType(componentType: UIComponentType): EditSession[] {
    return Array.from(this.activeSessions.values()).filter(
      session => session.componentType === componentType
    );
  }

  /**
   * Check if component has active edit session
   */
  hasActiveSession(componentType: UIComponentType, entityId: string): boolean {
    return Array.from(this.activeSessions.values()).some(
      session => session.componentType === componentType && session.entityId === entityId
    );
  }

  /**
   * Get undo/redo stack sizes
   */
  getStackSizes(sessionId: string): { undo: number; redo: number } {
    const undoStack = this.undoStacks.get(sessionId) || [];
    const redoStack = this.redoStacks.get(sessionId) || [];
    
    return {
      undo: undoStack.length,
      redo: redoStack.length
    };
  }

  /**
   * Map component type to data type
   */
  private mapComponentTypeToDataType(componentType: UIComponentType): 'TokenSystem' | 'PlatformExtension' | 'ThemeOverrideFile' | 'Token' | 'TokenCollection' | 'Dimension' | 'Platform' | 'Theme' | 'Taxonomy' | 'ResolvedValueType' | 'ComponentProperty' | 'ComponentCategory' | 'Component' {
    switch (componentType) {
      case 'TokenView':
      case 'TokenEditor':
        return 'Token';
      case 'CollectionView':
        return 'TokenCollection';
      case 'DimensionView':
        return 'Dimension';
      case 'PlatformView':
        return 'Platform';
      case 'ThemeView':
        return 'Theme';
      case 'TaxonomyView':
        return 'Taxonomy';
      case 'ComponentView':
        return 'Component';
      default:
        return 'TokenSystem';
    }
  }

  /**
   * Deep clone data
   */
  private deepClone<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Add entry to undo stack
   */
  private addToUndoStack(sessionId: string, data: unknown, description: string): void {
    const undoStack = this.undoStacks.get(sessionId) || [];
    
    undoStack.push({
      id: this.generateSessionId(),
      timestamp: new Date().toISOString(),
      data: this.deepClone(data),
      description,
      sessionId
    });

    // Limit undo stack size
    if (undoStack.length > this.options.maxUndoSteps!) {
      undoStack.shift();
    }

    this.undoStacks.set(sessionId, undoStack);
  }

  /**
   * Start auto-save timer
   */
  private startAutoSaveTimer(sessionId: string): void {
    this.clearAutoSaveTimer(sessionId);

    const timer = setInterval(() => {
      this.performAutoSave(sessionId);
    }, this.options.autoSaveInterval!);

    this.autoSaveTimers.set(sessionId, timer);
  }

  /**
   * Clear auto-save timer
   */
  private clearAutoSaveTimer(sessionId: string): void {
    const timer = this.autoSaveTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(sessionId);
    }
  }

  /**
   * Perform auto-save
   */
  private async performAutoSave(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session || session.status !== 'editing') {
      return;
    }

    try {
      console.log('[UnifiedEditModeService] Performing auto-save for session:', sessionId);
      
      // Validate data
      const validation = await this.validateSession(sessionId);
      if (!validation.isValid) {
        console.warn('[UnifiedEditModeService] Auto-save skipped due to validation errors:', validation.errors);
        return;
      }

      // Save data
      await unifiedUIIntegrationService.updateDataForComponent(
        session.componentType,
        'editable',
        session.currentData,
        {
          validate: false,
          optimistic: true
        }
      );

      this.emitEvent({
        type: 'auto-saved',
        session
      });

      console.log('[UnifiedEditModeService] Auto-save completed for session:', sessionId);

    } catch (error) {
      console.error('[UnifiedEditModeService] Auto-save failed for session:', sessionId, error);
    }
  }

  /**
   * Schedule validation
   */
  private scheduleValidation(sessionId: string): void {
    this.clearValidationTimer(sessionId);

    const timer = setTimeout(() => {
      this.validateSession(sessionId).catch(error => {
        console.error('[UnifiedEditModeService] Scheduled validation failed:', error);
      });
    }, this.options.validationDebounce!);

    this.validationTimers.set(sessionId, timer);
  }

  /**
   * Clear validation timer
   */
  private clearValidationTimer(sessionId: string): void {
    const timer = this.validationTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.validationTimers.delete(sessionId);
    }
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    activeSessions: number;
    totalEventListeners: number;
    options: EditModeOptions;
  } {
    return {
      activeSessions: this.activeSessions.size,
      totalEventListeners: this.eventListeners.length,
      options: this.options
    };
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    console.log('[UnifiedEditModeService] Clearing all sessions');

    // End all active sessions
    const sessionIds = Array.from(this.activeSessions.keys());
    sessionIds.forEach(sessionId => {
      this.endEditSession(sessionId, false);
    });

    // Clear all timers
    this.autoSaveTimers.forEach(timer => clearInterval(timer));
    this.autoSaveTimers.clear();

    this.validationTimers.forEach(timer => clearTimeout(timer));
    this.validationTimers.clear();

    console.log('[UnifiedEditModeService] All sessions cleared');
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.clearAllSessions();
    this.eventListeners = [];
    console.log('[UnifiedEditModeService] Service state reset');
  }
}

// Export singleton instance
export const unifiedEditModeService = UnifiedEditModeService.getInstance();
