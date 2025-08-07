import type { DataSourceContext } from './dataSourceManager';

export interface PendingOverride {
  tokenId: string;
  sourceType: 'platform-extension' | 'theme-override';
  sourceId: string;
  overrideData: Record<string, unknown>;
  timestamp: string;
  changes: {
    changedFields: string[];
    originalValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
  };
}

export interface OverrideSession {
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
  overrides: PendingOverride[];
  createdAt: string;
  lastModified: string;
}

export class OverrideTrackingService {
  private static readonly STORAGE_KEY = 'token-model-pending-overrides';
  private static currentSession: OverrideSession | null = null;

  /**
   * Initialize or resume override tracking session
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
   * Add or update an override for a token
   */
  static addOverride(
    tokenId: string,
    overrideData: Record<string, unknown>,
    changes: {
      changedFields: string[];
      originalValues: Record<string, unknown>;
      newValues: Record<string, unknown>;
    }
  ): void {
    if (!this.currentSession) {
      console.warn('[OverrideTrackingService] No active session for override tracking');
      return;
    }

    const { sourceType, sourceId } = this.currentSession.dataSourceContext;

    const pendingOverride: PendingOverride = {
      tokenId,
      sourceType,
      sourceId,
      overrideData,
      timestamp: new Date().toISOString(),
      changes
    };

    // Remove existing override for this token if it exists
    this.currentSession.overrides = this.currentSession.overrides.filter(
      o => o.tokenId !== tokenId
    );

    // Add new override
    this.currentSession.overrides.push(pendingOverride);
    this.updateLastModified();
    this.persistSession();

    console.log(`[OverrideTrackingService] Added override for token ${tokenId}:`, pendingOverride);
  }

  /**
   * Remove an override for a token
   */
  static removeOverride(tokenId: string): void {
    if (!this.currentSession) {
      return;
    }

    this.currentSession.overrides = this.currentSession.overrides.filter(
      o => o.tokenId !== tokenId
    );
    this.updateLastModified();
    this.persistSession();

    console.log(`[OverrideTrackingService] Removed override for token ${tokenId}`);
  }

  /**
   * Get all pending overrides for the current session
   */
  static getPendingOverrides(): PendingOverride[] {
    if (!this.currentSession) {
      return [];
    }
    return [...this.currentSession.overrides];
  }

  /**
   * Get pending override for a specific token
   */
  static getPendingOverride(tokenId: string): PendingOverride | null {
    if (!this.currentSession) {
      return null;
    }
    return this.currentSession.overrides.find(o => o.tokenId === tokenId) || null;
  }

  /**
   * Check if a token has pending overrides
   */
  static hasPendingOverride(tokenId: string): boolean {
    return this.getPendingOverride(tokenId) !== null;
  }

  /**
   * Get the current session info
   */
  static getCurrentSession(): OverrideSession | null {
    if (this.currentSession) {
      return { ...this.currentSession };
    }
    return null;
  }

  /**
   * Clear all pending overrides for the current session
   */
  static clearSession(): void {
    this.currentSession = null;
    this.clearPersistedSession();
    console.log('[OverrideTrackingService] Cleared override session');
  }

  /**
   * Get override data for commit (combines all overrides into source-specific format)
   */
  static getOverrideDataForCommit(): Record<string, unknown> | null {
    if (!this.currentSession || this.currentSession.overrides.length === 0) {
      return null;
    }

    const { sourceType, sourceId } = this.currentSession.dataSourceContext;
    const overrides = this.currentSession.overrides;

    if (sourceType === 'platform-extension') {
      // Combine all platform overrides into a single platform extension file
      const tokenOverrides = overrides.map(override => ({
        id: override.tokenId,
        ...override.overrideData
      }));

      return {
        systemId: 'design-system', // TODO: Get from actual context
        platformId: sourceId,
        version: '1.0.0',
        figmaFileKey: `platform-${sourceId}-key`,
        tokenOverrides
      };
    } else if (sourceType === 'theme-override') {
      // Combine all theme overrides into a single theme override file
      const tokenOverrides = overrides.map(override => ({
        tokenId: override.tokenId,
        valuesByMode: override.overrideData.valuesByMode || []
      }));

      return {
        systemId: 'design-system', // TODO: Get from actual context
        themeId: sourceId,
        figmaFileKey: `theme-${sourceId}-key`,
        tokenOverrides
      };
    }

    return null;
  }

  /**
   * Get change count for the current session
   */
  static getChangeCount(): number {
    if (!this.currentSession) {
      return 0;
    }
    return this.currentSession.overrides.length;
  }

  /**
   * Check if there are any pending overrides
   */
  static hasPendingOverrides(): boolean {
    return this.getChangeCount() > 0;
  }

  /**
   * Update last modified timestamp
   */
  private static updateLastModified(): void {
    if (this.currentSession) {
      this.currentSession.lastModified = new Date().toISOString();
    }
  }

  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return `override-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Persist session to local storage
   */
  private static persistSession(): void {
    if (!this.currentSession) {
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentSession));
    } catch (error) {
      console.error('[OverrideTrackingService] Failed to persist session:', error);
    }
  }

  /**
   * Load session from local storage
   */
  private static loadPersistedSession(): OverrideSession | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }
      return JSON.parse(stored) as OverrideSession;
    } catch (error) {
      console.error('[OverrideTrackingService] Failed to load persisted session:', error);
      return null;
    }
  }

  /**
   * Clear persisted session from local storage
   */
  private static clearPersistedSession(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('[OverrideTrackingService] Failed to clear persisted session:', error);
    }
  }
} 