import { DataSourceManager } from './dataSourceManager';
import { StatePersistenceManager, type EditModeState, type RepositoryContext } from './statePersistenceManager';
import { RefreshManager } from './refreshManager';

export class EditModeManager {
  private static instance: EditModeManager;

  private constructor() {}

  static getInstance(): EditModeManager {
    if (!EditModeManager.instance) {
      EditModeManager.instance = new EditModeManager();
    }
    return EditModeManager.instance;
  }

  /**
   * Enter edit mode with proper state management
   */
  static enterEditMode(branch: string, sourceType: 'core' | 'platform-extension' | 'theme-override', sourceId?: string): void {
    console.log('[EditModeManager] Entering edit mode:', { branch, sourceType, sourceId });
    
    try {
      // 1. Save current state
      const stateManager = StatePersistenceManager.getInstance();
      const currentState = stateManager.getCurrentState();
      
      // 2. Update edit mode state
      const editModeState: EditModeState = {
        isActive: true,
        branch,
        sourceType,
        sourceId: sourceId || null,
        repositoryContext: currentState.currentRepository
      };
      
      // 3. Persist state
      stateManager.updateEditMode(editModeState);
      
      // 4. Update DataSourceManager
      const dataSourceManager = DataSourceManager.getInstance();
      dataSourceManager.enterEditMode();
      
      console.log('[EditModeManager] Successfully entered edit mode');
      
    } catch (error) {
      console.error('[EditModeManager] Failed to enter edit mode:', error);
      throw error;
    }
  }

  /**
   * Exit edit mode with context preservation
   */
  static async exitEditMode(preserveRepositoryContext: boolean = true): Promise<void> {
    console.log('[EditModeManager] Exiting edit mode, preserve context:', preserveRepositoryContext);
    
    try {
      // 1. Clear edit mode state only
      const stateManager = StatePersistenceManager.getInstance();
      stateManager.clearEditModeOnly();
      
      // 2. Update DataSourceManager
      const dataSourceManager = DataSourceManager.getInstance();
      dataSourceManager.exitEditMode();
      
      // 3. Refresh with context preservation
      await RefreshManager.refreshForExitEditMode();
      
      console.log('[EditModeManager] Successfully exited edit mode');
      
    } catch (error) {
      console.error('[EditModeManager] Failed to exit edit mode:', error);
      throw error;
    }
  }

  /**
   * Get current edit mode state
   */
  static getCurrentEditMode(): EditModeState {
    const stateManager = StatePersistenceManager.getInstance();
    return stateManager.getCurrentEditMode();
  }

  /**
   * Check if currently in edit mode
   */
  static isInEditMode(): boolean {
    const editMode = this.getCurrentEditMode();
    return editMode.isActive;
  }

  /**
   * Get current edit branch
   */
  static getCurrentEditBranch(): string | null {
    const editMode = this.getCurrentEditMode();
    return editMode.branch;
  }

  /**
   * Get current edit source type
   */
  static getCurrentEditSourceType(): 'core' | 'platform-extension' | 'theme-override' {
    const editMode = this.getCurrentEditMode();
    return editMode.sourceType;
  }

  /**
   * Get current edit source ID
   */
  static getCurrentEditSourceId(): string | null {
    const editMode = this.getCurrentEditMode();
    return editMode.sourceId;
  }

  /**
   * Get repository context for current edit mode
   */
  static getCurrentEditRepositoryContext(): RepositoryContext | null {
    const editMode = this.getCurrentEditMode();
    return editMode.repositoryContext;
  }

  /**
   * Update edit mode branch
   */
  static updateEditBranch(branch: string): void {
    console.log('[EditModeManager] Updating edit branch to:', branch);
    
    const stateManager = StatePersistenceManager.getInstance();
    const currentEditMode = stateManager.getCurrentEditMode();
    
    const updatedEditMode: EditModeState = {
      ...currentEditMode,
      branch
    };
    
    stateManager.updateEditMode(updatedEditMode);
  }

  /**
   * Update edit mode source
   */
  static updateEditSource(sourceType: 'core' | 'platform-extension' | 'theme-override', sourceId?: string): void {
    console.log('[EditModeManager] Updating edit source:', { sourceType, sourceId });
    
    const stateManager = StatePersistenceManager.getInstance();
    const currentEditMode = stateManager.getCurrentEditMode();
    
    const updatedEditMode: EditModeState = {
      ...currentEditMode,
      sourceType,
      sourceId: sourceId || null
    };
    
    stateManager.updateEditMode(updatedEditMode);
  }

  /**
   * Validate edit mode state
   */
  static validateEditModeState(): boolean {
    const editMode = this.getCurrentEditMode();
    
    if (!editMode.isActive) {
      return true; // Not in edit mode is valid
    }
    
    // Check required fields when in edit mode
    if (!editMode.branch) {
      console.error('[EditModeManager] Edit mode active but no branch specified');
      return false;
    }
    
    if (!editMode.sourceType) {
      console.error('[EditModeManager] Edit mode active but no source type specified');
      return false;
    }
    
    if (!editMode.repositoryContext) {
      console.error('[EditModeManager] Edit mode active but no repository context');
      return false;
    }
    
    return true;
  }

  /**
   * Reset edit mode state (for error recovery)
   */
  static resetEditModeState(): void {
    console.log('[EditModeManager] Resetting edit mode state');
    
    const stateManager = StatePersistenceManager.getInstance();
    stateManager.clearEditModeOnly();
    
    const dataSourceManager = DataSourceManager.getInstance();
    dataSourceManager.exitEditMode();
  }
} 