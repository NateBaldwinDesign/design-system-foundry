import { StorageService } from './storage';
import type { 
  TokenSystem, 
  PlatformExtension, 
  ThemeOverrideFile 
} from '@token-model/data-model';
import type { 
  Change, 
  ChangeTracking, 
  SourceContext 
} from '../types/dataManagement';

export class DataEditorService {
  private static instance: DataEditorService;

  private constructor() {}

  static getInstance(): DataEditorService {
    if (!DataEditorService.instance) {
      DataEditorService.instance = new DataEditorService();
    }
    return DataEditorService.instance;
  }

  /**
   * Check if there are local changes compared to source snapshot
   */
  hasLocalChanges(): boolean {
    const snapshot = StorageService.getSourceSnapshot();
    const localEdits = StorageService.getLocalEdits();
    
    if (!snapshot || !localEdits) {
      return false;
    }

    return !this.isEqual(snapshot, localEdits);
  }

  /**
   * Get the count of changes between source snapshot and local edits
   */
  getChangeCount(): number {
    const changes = this.getChanges();
    return changes.length;
  }

  /**
   * Get detailed change information
   */
  getChanges(): Change[] {
    const snapshot = StorageService.getSourceSnapshot();
    const localEdits = StorageService.getLocalEdits();
    
    if (!snapshot || !localEdits) {
      return [];
    }

    return this.computeChanges(snapshot, localEdits);
  }

  /**
   * Get change tracking information
   */
  getChangeTracking(): ChangeTracking {
    const changes = this.getChanges();
    const hasChanges = changes.length > 0;
    
    return {
      hasChanges,
      changeCount: changes.length,
      changes,
      lastModified: new Date().toISOString()
    };
  }

  /**
   * Get changes by entity type
   */
  getChangesByEntityType(entityType: Change['entityType']): Change[] {
    return this.getChanges().filter(change => change.entityType === entityType);
  }

  /**
   * Get changes by change type
   */
  getChangesByType(changeType: Change['type']): Change[] {
    return this.getChanges().filter(change => change.type === changeType);
  }

  /**
   * Get changes for a specific entity
   */
  getChangesForEntity(entityId: string): Change[] {
    return this.getChanges().filter(change => change.entityId === entityId);
  }

  /**
   * Get change summary by entity type
   */
  getChangeSummary(): Record<Change['entityType'], { added: number; modified: number; deleted: number }> {
    const changes = this.getChanges();
    const summary: Record<Change['entityType'], { added: number; modified: number; deleted: number }> = {
      token: { added: 0, modified: 0, deleted: 0 },
      collection: { added: 0, modified: 0, deleted: 0 },
      dimension: { added: 0, modified: 0, deleted: 0 },
      platform: { added: 0, modified: 0, deleted: 0 },
      theme: { added: 0, modified: 0, deleted: 0 }
    };

    changes.forEach(change => {
      summary[change.entityType][change.type]++;
    });

    return summary;
  }

  /**
   * Check if specific entity has changes
   */
  hasEntityChanges(entityId: string): boolean {
    return this.getChangesForEntity(entityId).length > 0;
  }

  /**
   * Get the most recent change
   */
  getMostRecentChange(): Change | null {
    const changes = this.getChanges();
    return changes.length > 0 ? changes[changes.length - 1] : null;
  }

  /**
   * Get changes since a specific timestamp
   */
  getChangesSince(timestamp: string): Change[] {
    const changes = this.getChanges();
    const sinceDate = new Date(timestamp);
    
    return changes.filter(change => {
      // For now, we'll return all changes since we don't track individual change timestamps
      // In a full implementation, each change would have its own timestamp
      return true;
    });
  }

  /**
   * Update local edits with new data
   */
  updateLocalEdits(data: TokenSystem | PlatformExtension | ThemeOverrideFile): void {
    StorageService.setLocalEdits(data);
    
    // Update source context to reflect changes
    const sourceContext = StorageService.getSourceContext();
    if (sourceContext) {
      sourceContext.hasLocalChanges = this.hasLocalChanges();
      sourceContext.lastLoadedAt = new Date().toISOString();
      StorageService.setSourceContext(sourceContext);
    }

    console.log('[DataEditorService] Local edits updated');
  }

  /**
   * Reset local edits to match source snapshot
   */
  resetLocalEdits(): void {
    const sourceSnapshot = StorageService.getSourceSnapshot();
    if (sourceSnapshot) {
      StorageService.setLocalEdits(sourceSnapshot);
      
      // Update source context
      const sourceContext = StorageService.getSourceContext();
      if (sourceContext) {
        sourceContext.hasLocalChanges = false;
        StorageService.setSourceContext(sourceContext);
      }

      console.log('[DataEditorService] Local edits reset to source snapshot');
    }
  }

  /**
   * Enter edit mode
   */
  enterEditMode(): void {
    const sourceContext = StorageService.getSourceContext();
    if (sourceContext) {
      sourceContext.editMode.isActive = true;
      sourceContext.editMode.sourceType = sourceContext.sourceType === 'platform' ? 'platform-extension' : 
                                         sourceContext.sourceType === 'theme' ? 'theme-override' : 'core';
      sourceContext.editMode.sourceId = sourceContext.sourceId;
      sourceContext.editMode.targetRepository = sourceContext.sourceRepository;
      
      StorageService.setSourceContext(sourceContext);
      console.log('[DataEditorService] Entered edit mode');
    }
  }

  /**
   * Exit edit mode
   */
  exitEditMode(): void {
    const sourceContext = StorageService.getSourceContext();
    if (sourceContext) {
      sourceContext.editMode.isActive = false;
      sourceContext.editMode.targetRepository = null;
      
      StorageService.setSourceContext(sourceContext);
      console.log('[DataEditorService] Exited edit mode');
    }
  }

  /**
   * Get current edit mode state
   */
  getEditModeState(): { isActive: boolean; sourceType: string; sourceId: string | null } {
    const sourceContext = StorageService.getSourceContext();
    if (sourceContext) {
      return {
        isActive: sourceContext.editMode.isActive,
        sourceType: sourceContext.editMode.sourceType,
        sourceId: sourceContext.editMode.sourceId
      };
    }
    
    return {
      isActive: false,
      sourceType: 'core',
      sourceId: null
    };
  }

  /**
   * Save changes to source repository (placeholder for GitHub integration)
   */
  async saveChanges(): Promise<{ success: boolean; error?: string }> {
    try {
      const localEdits = StorageService.getLocalEdits();
      if (!localEdits) {
        return {
          success: false,
          error: 'No local edits to save'
        };
      }

      // Update source snapshot to match local edits
      StorageService.setSourceSnapshot(localEdits);
      
      // Update source context
      const sourceContext = StorageService.getSourceContext();
      if (sourceContext) {
        sourceContext.hasLocalChanges = false;
        sourceContext.lastLoadedAt = new Date().toISOString();
        StorageService.setSourceContext(sourceContext);
      }

      console.log('[DataEditorService] Changes saved successfully');
      return { success: true };

    } catch (error) {
      console.error('[DataEditorService] Error saving changes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save changes'
      };
    }
  }

  /**
   * Discard changes and reset to source snapshot
   */
  discardChanges(): void {
    this.resetLocalEdits();
    console.log('[DataEditorService] Changes discarded');
  }

  /**
   * Deep comparison of two objects
   */
  private isEqual(obj1: unknown, obj2: unknown): boolean {
    if (obj1 === obj2) {
      return true;
    }

    if (obj1 == null || obj2 == null) {
      return obj1 === obj2;
    }

    if (typeof obj1 !== typeof obj2) {
      return false;
    }

    if (typeof obj1 !== 'object') {
      return obj1 === obj2;
    }

    if (Array.isArray(obj1) !== Array.isArray(obj2)) {
      return false;
    }

    if (Array.isArray(obj1)) {
      if (obj1.length !== (obj2 as unknown[]).length) {
        return false;
      }
      for (let i = 0; i < obj1.length; i++) {
        if (!this.isEqual(obj1[i], (obj2 as unknown[])[i])) {
          return false;
        }
      }
      return true;
    }

    const keys1 = Object.keys(obj1 as Record<string, unknown>);
    const keys2 = Object.keys(obj2 as Record<string, unknown>);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (!keys2.includes(key)) {
        return false;
      }
      if (!this.isEqual((obj1 as Record<string, unknown>)[key], (obj2 as Record<string, unknown>)[key])) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compute detailed changes between two objects
   */
  private computeChanges(snapshot: unknown, localEdits: unknown): Change[] {
    const changes: Change[] = [];
    
    if (this.isEqual(snapshot, localEdits)) {
      return changes;
    }

    // Enhanced change detection for TokenSystem structure
    if (this.isTokenSystem(snapshot) && this.isTokenSystem(localEdits)) {
      changes.push(...this.computeTokenSystemChanges(snapshot, localEdits));
    } else if (this.isPlatformExtension(snapshot) && this.isPlatformExtension(localEdits)) {
      changes.push(...this.computePlatformExtensionChanges(snapshot, localEdits));
    } else if (this.isThemeOverride(snapshot) && this.isThemeOverride(localEdits)) {
      changes.push(...this.computeThemeOverrideChanges(snapshot, localEdits));
    } else {
      // Fallback for unknown types
      changes.push({
        type: 'modified',
        path: [],
        oldValue: snapshot,
        newValue: localEdits,
        entityType: 'token',
        entityId: 'unknown'
      });
    }

    return changes;
  }

  /**
   * Compute changes for TokenSystem objects
   */
  private computeTokenSystemChanges(snapshot: any, localEdits: any): Change[] {
    const changes: Change[] = [];

    // Compare tokens
    changes.push(...this.compareArrays(
      snapshot.tokens || [],
      localEdits.tokens || [],
      'token',
      'id'
    ));

    // Compare token collections
    changes.push(...this.compareArrays(
      snapshot.tokenCollections || [],
      localEdits.tokenCollections || [],
      'collection',
      'id'
    ));

    // Compare dimensions
    changes.push(...this.compareArrays(
      snapshot.dimensions || [],
      localEdits.dimensions || [],
      'dimension',
      'id'
    ));

    // Compare platforms
    changes.push(...this.compareArrays(
      snapshot.platforms || [],
      localEdits.platforms || [],
      'platform',
      'id'
    ));

    // Compare themes
    changes.push(...this.compareArrays(
      snapshot.themes || [],
      localEdits.themes || [],
      'theme',
      'id'
    ));

    return changes;
  }

  /**
   * Compute changes for PlatformExtension objects
   */
  private computePlatformExtensionChanges(snapshot: any, localEdits: any): Change[] {
    const changes: Change[] = [];

    // Compare token overrides
    changes.push(...this.compareArrays(
      snapshot.tokenOverrides || [],
      localEdits.tokenOverrides || [],
      'token',
      'id'
    ));

    // Compare algorithm variable overrides
    changes.push(...this.compareArrays(
      snapshot.algorithmVariableOverrides || [],
      localEdits.algorithmVariableOverrides || [],
      'token',
      'variableId'
    ));

    return changes;
  }

  /**
   * Compute changes for ThemeOverride objects
   */
  private computeThemeOverrideChanges(snapshot: any, localEdits: any): Change[] {
    const changes: Change[] = [];

    // Compare token overrides
    changes.push(...this.compareArrays(
      snapshot.tokenOverrides || [],
      localEdits.tokenOverrides || [],
      'token',
      'tokenId'
    ));

    return changes;
  }

  /**
   * Compare two arrays and detect changes
   */
  private compareArrays(
    oldArray: any[],
    newArray: any[],
    entityType: Change['entityType'],
    idField: string
  ): Change[] {
    const changes: Change[] = [];
    const oldMap = new Map(oldArray.map(item => [item[idField], item]));
    const newMap = new Map(newArray.map(item => [item[idField], item]));

    // Find added items
    for (const [id, newItem] of newMap) {
      if (!oldMap.has(id)) {
        changes.push({
          type: 'added',
          path: [entityType + 's'],
          newValue: newItem,
          entityType,
          entityId: id
        });
      }
    }

    // Find deleted items
    for (const [id, oldItem] of oldMap) {
      if (!newMap.has(id)) {
        changes.push({
          type: 'deleted',
          path: [entityType + 's'],
          oldValue: oldItem,
          entityType,
          entityId: id
        });
      }
    }

    // Find modified items
    for (const [id, newItem] of newMap) {
      const oldItem = oldMap.get(id);
      if (oldItem && !this.isEqual(oldItem, newItem)) {
        changes.push({
          type: 'modified',
          path: [entityType + 's', id],
          oldValue: oldItem,
          newValue: newItem,
          entityType,
          entityId: id
        });
      }
    }

    return changes;
  }

  /**
   * Type guards for different data types
   */
  private isTokenSystem(data: unknown): data is any {
    return data && typeof data === 'object' && 'systemId' in data && 'tokens' in data;
  }

  private isPlatformExtension(data: unknown): data is any {
    return data && typeof data === 'object' && 'platformId' in data;
  }

  private isThemeOverride(data: unknown): data is any {
    return data && typeof data === 'object' && 'themeId' in data;
  }

  /**
   * Get the current data that should be used for editing
   */
  getCurrentEditData(): TokenSystem | PlatformExtension | ThemeOverrideFile | null {
    return StorageService.getLocalEdits();
  }

  /**
   * Get the current data that should be displayed in the UI
   */
  getCurrentDisplayData(): TokenSystem | null {
    return StorageService.getMergedData();
  }

  /**
   * Update the merged data (called by DataMergerService)
   */
  updateMergedData(mergedData: TokenSystem): void {
    StorageService.setMergedData(mergedData);
    console.log('[DataEditorService] Merged data updated');
  }
} 