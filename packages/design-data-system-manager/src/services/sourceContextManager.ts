import { DataSourceManager } from './dataSourceManager';
import { SourceManagerService } from './sourceManagerService';

export interface SourceContext {
  sourceType: 'core' | 'platform-extension' | 'theme-override';
  sourceId: string | null;
  sourceName: string | null;
  repositoryInfo: {
    fullName: string;
    branch: string;
    filePath: string;
    fileType: string;
  };
  schemaType: 'schema' | 'platform-extension' | 'theme-override';
  editMode?: {
    isActive: boolean;
    branchName?: string;
  };
}

export class SourceContextManager {
  private static instance: SourceContextManager;
  private currentContext: SourceContext | null = null;

  private constructor() {}

  static getInstance(): SourceContextManager {
    if (!SourceContextManager.instance) {
      SourceContextManager.instance = new SourceContextManager();
    }
    return SourceContextManager.instance;
  }

  /**
   * Set the current source context
   */
  setContext(context: SourceContext): void {
    console.log('[SourceContextManager] Setting context:', context);
    this.currentContext = context;
    
    // Dispatch event for other services to listen
    window.dispatchEvent(new CustomEvent('source-context-changed', {
      detail: { context }
    }));
  }

  /**
   * Get the current source context
   */
  getContext(): SourceContext | null {
    return this.currentContext;
  }

  /**
   * Validate that the current context is complete and valid
   */
  validateContext(): boolean {
    if (!this.currentContext) {
      console.warn('[SourceContextManager] No context available');
      return false;
    }

    const { sourceType, repositoryInfo, schemaType } = this.currentContext;
    
    if (!sourceType || !repositoryInfo?.fullName || !schemaType) {
      console.warn('[SourceContextManager] Invalid context:', this.currentContext);
      return false;
    }

    return true;
  }

  /**
   * Clear the current context
   */
  clearContext(): void {
    console.log('[SourceContextManager] Clearing context');
    this.currentContext = null;
    
    window.dispatchEvent(new CustomEvent('source-context-cleared'));
  }

  /**
   * Update context from current data source state
   */
  updateFromDataSource(): void {
    const dataSourceManager = DataSourceManager.getInstance();
    const currentContext = dataSourceManager.getCurrentContext();
    const sourceManager = SourceManagerService.getInstance();
    const sourceContext = sourceManager.getCurrentSourceContext();

    if (!sourceContext) {
      console.warn('[SourceContextManager] No source context available');
      return;
    }

    // Determine source type and schema type
    let sourceType: 'core' | 'platform-extension' | 'theme-override' = 'core';
    let schemaType: 'schema' | 'platform-extension' | 'theme-override' = 'schema';
    let sourceId: string | null = null;
    let sourceName: string | null = null;

    if (currentContext.currentPlatform && currentContext.currentPlatform !== 'none') {
      sourceType = 'platform-extension';
      schemaType = 'platform-extension';
      sourceId = currentContext.currentPlatform;
      sourceName = currentContext.platforms.find(p => p.id === sourceId)?.displayName || null;
    } else if (currentContext.currentTheme && currentContext.currentTheme !== 'none') {
      sourceType = 'theme-override';
      schemaType = 'theme-override';
      sourceId = currentContext.currentTheme;
      sourceName = currentContext.themes.find(t => t.id === sourceId)?.displayName || null;
    }

    // Get repository information
    let repositoryInfo = currentContext.repositories.core;
    if (sourceType === 'platform-extension' && sourceId) {
      repositoryInfo = currentContext.repositories.platforms[sourceId];
    } else if (sourceType === 'theme-override' && sourceId) {
      repositoryInfo = currentContext.repositories.themes[sourceId];
    }

    if (!repositoryInfo) {
      console.warn('[SourceContextManager] No repository info available for source type:', sourceType);
      return;
    }

    const context: SourceContext = {
      sourceType,
      sourceId,
      sourceName,
      repositoryInfo: {
        fullName: repositoryInfo.fullName,
        branch: repositoryInfo.branch,
        filePath: repositoryInfo.filePath,
        fileType: repositoryInfo.fileType
      },
      schemaType,
      editMode: sourceContext.editMode
    };

    this.setContext(context);
  }

  /**
   * Get the target schema type for the current context
   */
  getTargetSchemaType(): 'schema' | 'platform-extension' | 'theme-override' {
    if (!this.validateContext()) {
      return 'schema'; // Default to core schema
    }
    return this.currentContext!.schemaType;
  }

  /**
   * Get the target repository info for the current context
   */
  getTargetRepositoryInfo(): { fullName: string; branch: string; filePath: string; fileType: string } | null {
    if (!this.validateContext()) {
      return null;
    }
    return this.currentContext!.repositoryInfo;
  }

  /**
   * Check if the current context is for a platform extension
   */
  isPlatformExtension(): boolean {
    return this.currentContext?.sourceType === 'platform-extension';
  }

  /**
   * Check if the current context is for a theme override
   */
  isThemeOverride(): boolean {
    return this.currentContext?.sourceType === 'theme-override';
  }

  /**
   * Check if the current context is for core data
   */
  isCoreData(): boolean {
    return this.currentContext?.sourceType === 'core';
  }
}
