import type { DataSourceContext } from './dataSourceManager';

export interface FigmaConfigurationOverride {
  sourceType: 'platform-extension' | 'theme-override';
  sourceId: string;
  figmaFileKey?: string;
  fileColorProfile?: 'srgb' | 'display-p3';
  syntaxPatterns?: {
    prefix?: string;
    suffix?: string;
    delimiter?: string;
    capitalization?: string;
    formatString?: string;
  };
  timestamp: string;
}

export interface FigmaConfigurationOverrideSession {
  sessionId: string;
  dataSourceContext: {
    sourceType: 'platform-extension' | 'theme-override';
    sourceId: string;
    targetRepository: {
      fullName: string;
      branch: string;
      filePath: string;
    } | null;
  };
  overrides: FigmaConfigurationOverride[];
  createdAt: string;
  lastModified: string;
}

export class FigmaConfigurationOverrideService {
  private static readonly STORAGE_KEY = 'token-model-figma-config-overrides';
  private static currentSession: FigmaConfigurationOverrideSession | null = null;

  /**
   * Initialize or resume Figma configuration override session
   */
  static initializeSession(dataSourceContext: DataSourceContext): void {
    if (!dataSourceContext.editMode.isActive || dataSourceContext.editMode.sourceType === 'core') {
      return;
    }

    const { sourceType, sourceId, targetRepository } = dataSourceContext.editMode;
    
    if (sourceType === 'core' || !sourceId) {
      return;
    }

    // Try to resume existing session
    const existingSession = this.getCurrentSession();
    if (existingSession && 
        existingSession.dataSourceContext.sourceType === sourceType &&
        existingSession.dataSourceContext.sourceId === sourceId) {
      this.currentSession = existingSession;
      this.updateLastModified();
      return;
    }

    // Create new session
    this.currentSession = {
      sessionId: this.generateSessionId(),
      dataSourceContext: {
        sourceType,
        sourceId,
        targetRepository
      },
      overrides: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    this.persistSession();
  }

  /**
   * Stage Figma configuration changes for the current source
   */
  static stageConfigurationChange(
    figmaFileKey?: string,
    syntaxPatterns?: {
      prefix?: string;
      suffix?: string;
      delimiter?: string;
      capitalization?: string;
      formatString?: string;
    },
    fileColorProfile?: 'srgb' | 'display-p3'
  ): void {
    if (!this.currentSession) {
      console.warn('[FigmaConfigurationOverrideService] No active session for configuration tracking');
      return;
    }

    const { sourceType, sourceId } = this.currentSession.dataSourceContext;

    const configurationOverride: FigmaConfigurationOverride = {
      sourceType,
      sourceId,
      figmaFileKey,
      fileColorProfile,
      syntaxPatterns,
      timestamp: new Date().toISOString()
    };

    // Remove existing override for this source if it exists
    this.currentSession.overrides = this.currentSession.overrides.filter(
      o => o.sourceId !== sourceId
    );

    // Add new override
    this.currentSession.overrides.push(configurationOverride);
    this.updateLastModified();
    this.persistSession();

    console.log(`[FigmaConfigurationOverrideService] Staged configuration change for ${sourceType} ${sourceId}:`, configurationOverride);
  }

  /**
   * Get staged configuration changes for the current session
   */
  static getStagedConfigurationChanges(): FigmaConfigurationOverride | null {
    if (!this.currentSession || this.currentSession.overrides.length === 0) {
      return null;
    }

    // Return the most recent override for the current source
    const currentSourceId = this.currentSession.dataSourceContext.sourceId;
    const overrides = this.currentSession.overrides.filter(o => o.sourceId === currentSourceId);
    
    if (overrides.length === 0) {
      return null;
    }

    // Return the most recent one
    return overrides[overrides.length - 1];
  }

  /**
   * Check if there are staged configuration changes
   */
  static hasStagedChanges(): boolean {
    return this.getStagedConfigurationChanges() !== null;
  }

  /**
   * Get the current session
   */
  static getCurrentSession(): FigmaConfigurationOverrideSession | null {
    return this.currentSession;
  }

  /**
   * Clear the current session
   */
  static clearSession(): void {
    this.currentSession = null;
    this.clearPersistedSession();
  }

  /**
   * Get override data for commit (consolidated format)
   */
  static getOverrideDataForCommit(): Record<string, unknown> | null {
    const stagedChanges = this.getStagedConfigurationChanges();
    if (!stagedChanges) {
      return null;
    }

    const { sourceType, sourceId, figmaFileKey, fileColorProfile, syntaxPatterns } = stagedChanges;

    if (sourceType === 'platform-extension') {
      return {
        systemId: 'design-system', // This should come from context
        platformId: sourceId,
        version: '1.0.0',
        figmaFileKey,
        fileColorProfile,
        syntaxPatterns
      };
    } else if (sourceType === 'theme-override') {
      return {
        systemId: 'design-system', // This should come from context
        themeId: sourceId,
        figmaFileKey,
        fileColorProfile
      };
    }

    return null;
  }

  // Private helper methods
  private static updateLastModified(): void {
    if (this.currentSession) {
      this.currentSession.lastModified = new Date().toISOString();
    }
  }

  private static generateSessionId(): string {
    return `figma-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static persistSession(): void {
    if (this.currentSession) {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentSession));
      } catch (error) {
        console.error('[FigmaConfigurationOverrideService] Failed to persist session:', error);
      }
    }
  }

  private static loadPersistedSession(): FigmaConfigurationOverrideSession | null {
    try {
      const persisted = localStorage.getItem(this.STORAGE_KEY);
      if (persisted) {
        return JSON.parse(persisted);
      }
    } catch (error) {
      console.error('[FigmaConfigurationOverrideService] Failed to load persisted session:', error);
    }
    return null;
  }

  private static clearPersistedSession(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('[FigmaConfigurationOverrideService] Failed to clear persisted session:', error);
    }
  }
} 