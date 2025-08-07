import { StatePersistenceManager, type RepositoryContext } from './statePersistenceManager';
import { DataSourceManager } from './dataSourceManager';

export class URLStateManager {
  private static instance: URLStateManager;

  private constructor() {}

  static getInstance(): URLStateManager {
    if (!URLStateManager.instance) {
      URLStateManager.instance = new URLStateManager();
    }
    return URLStateManager.instance;
  }

  /**
   * Update URL with current context
   */
  static updateURLWithContext(context: RepositoryContext): void {
    console.log('[URLStateManager] Updating URL with context:', context);
    
    try {
      const url = new URL(window.location.href);
      
      // Update repository parameters
      url.searchParams.set('repo', context.fullName);
      url.searchParams.set('branch', context.branch);
      url.searchParams.set('path', context.filePath);
      
      // Preserve platform/theme context
      const dataSourceManager = DataSourceManager.getInstance();
      const dataSourceContext = dataSourceManager.getCurrentContext();
      
      if (dataSourceContext.currentPlatform && dataSourceContext.currentPlatform !== 'none') {
        url.searchParams.set('platform', dataSourceContext.currentPlatform);
      } else {
        url.searchParams.delete('platform');
      }
      
      if (dataSourceContext.currentTheme && dataSourceContext.currentTheme !== 'none') {
        url.searchParams.set('theme', dataSourceContext.currentTheme);
      } else {
        url.searchParams.delete('theme');
      }
      
      // Update URL without triggering navigation
      window.history.replaceState({}, '', url.toString());
      
      console.log('[URLStateManager] URL updated successfully');
      
    } catch (error) {
      console.error('[URLStateManager] Error updating URL:', error);
    }
  }

  /**
   * Load context from URL parameters
   */
  static loadContextFromURL(): RepositoryContext | null {
    console.log('[URLStateManager] Loading context from URL');
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const repo = urlParams.get('repo');
      const branch = urlParams.get('branch');
      const path = urlParams.get('path');
      
      if (!repo || !branch || !path) {
        console.log('[URLStateManager] Missing required URL parameters');
        return null;
      }
      
      const context: RepositoryContext = {
        fullName: repo,
        branch,
        filePath: path,
        fileType: this.determineFileType(path)
      };
      
      console.log('[URLStateManager] Loaded context from URL:', context);
      return context;
      
    } catch (error) {
      console.error('[URLStateManager] Error loading context from URL:', error);
      return null;
    }
  }

  /**
   * Update URL with edit mode state
   * Note: Edit mode is not persisted in URL for security reasons
   */
  static updateURLWithEditMode(isEditMode: boolean, editBranch: string | null): void {
    console.log('[URLStateManager] Updating URL with edit mode:', { isEditMode, editBranch });
    
    try {
      const url = new URL(window.location.href);
      
      if (isEditMode && editBranch) {
        // Only update the branch, don't persist edit mode in URL
        url.searchParams.set('branch', editBranch);
      }
      // Note: We intentionally don't set or delete 'edit' parameter
      // Edit mode is ephemeral and should not be persisted in URLs
      
      // Update URL without triggering navigation
      window.history.replaceState({}, '', url.toString());
      
      console.log('[URLStateManager] URL updated with edit mode (branch only)');
      
    } catch (error) {
      console.error('[URLStateManager] Error updating URL with edit mode:', error);
    }
  }

  /**
   * Sync URL with current state
   */
  static syncURLWithCurrentState(): void {
    console.log('[URLStateManager] Syncing URL with current state');
    
    try {
      const stateManager = StatePersistenceManager.getInstance();
      const currentRepository = stateManager.getCurrentRepositoryContext();
      const currentEditMode = stateManager.getCurrentEditMode();
      
      if (currentRepository) {
        this.updateURLWithContext(currentRepository);
      }
      
      if (currentEditMode.isActive) {
        this.updateURLWithEditMode(true, currentEditMode.branch);
      }
      
      console.log('[URLStateManager] URL synced with current state');
      
    } catch (error) {
      console.error('[URLStateManager] Error syncing URL with current state:', error);
    }
  }

  /**
   * Get current URL parameters
   */
  static getCurrentURLParams(): {
    repo: string | null;
    branch: string | null;
    path: string | null;
    platform: string | null;
    theme: string | null;
  } {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      
      return {
        repo: urlParams.get('repo'),
        branch: urlParams.get('branch'),
        path: urlParams.get('path'),
        platform: urlParams.get('platform'),
        theme: urlParams.get('theme')
      };
      
    } catch (error) {
      console.error('[URLStateManager] Error getting URL parameters:', error);
      return {
        repo: null,
        branch: null,
        path: null,
        platform: null,
        theme: null
      };
    }
  }

  /**
   * Check if URL has changed from current state
   */
  static hasURLChanged(): boolean {
    try {
      const urlContext = this.loadContextFromURL();
      const stateManager = StatePersistenceManager.getInstance();
      const stateContext = stateManager.getCurrentRepositoryContext();
      
      if (!urlContext && !stateContext) {
        return false; // Both are null, no change
      }
      
      if (!urlContext || !stateContext) {
        return true; // One is null, other isn't
      }
      
      // Compare contexts
      return (
        urlContext.fullName !== stateContext.fullName ||
        urlContext.branch !== stateContext.branch ||
        urlContext.filePath !== stateContext.filePath ||
        urlContext.fileType !== stateContext.fileType
      );
      
    } catch (error) {
      console.error('[URLStateManager] Error checking if URL changed:', error);
      return false;
    }
  }

  /**
   * Reset URL to main branch
   */
  static resetURLToMainBranch(): void {
    console.log('[URLStateManager] Resetting URL to main branch');
    
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('branch', 'main');
      
      window.history.replaceState({}, '', url.toString());
      
      console.log('[URLStateManager] URL reset to main branch');
      
    } catch (error) {
      console.error('[URLStateManager] Error resetting URL to main branch:', error);
    }
  }

  /**
   * Update URL with platform/theme context
   */
  static updateURLWithPlatformTheme(platform: string | null, theme: string | null): void {
    console.log('[URLStateManager] Updating URL with platform/theme:', { platform, theme });
    
    try {
      const url = new URL(window.location.href);
      
      if (platform && platform !== 'none') {
        url.searchParams.set('platform', platform);
      } else {
        url.searchParams.delete('platform');
      }
      
      if (theme && theme !== 'none') {
        url.searchParams.set('theme', theme);
      } else {
        url.searchParams.delete('theme');
      }
      
      window.history.replaceState({}, '', url.toString());
      
      console.log('[URLStateManager] URL updated with platform/theme');
      
    } catch (error) {
      console.error('[URLStateManager] Error updating URL with platform/theme:', error);
    }
  }

  /**
   * Determine file type from path
   */
  private static determineFileType(path: string): 'schema' | 'platform-extension' | 'theme-override' {
    const lowerPath = path.toLowerCase();
    
    if (lowerPath.includes('platform-extension') || lowerPath.includes('platform_extension')) {
      return 'platform-extension';
    }
    
    if (lowerPath.includes('theme-override') || lowerPath.includes('theme_override')) {
      return 'theme-override';
    }
    
    // Default to schema
    return 'schema';
  }

  /**
   * Get clean URL
   */
  static getCleanURL(): string {
    try {
      const url = new URL(window.location.href);
      return url.toString();
    } catch (error) {
      console.error('[URLStateManager] Error getting clean URL:', error);
      return window.location.href;
    }
  }

  /**
   * Navigate to URL without triggering page reload
   */
  static navigateToURL(url: string, replace: boolean = true): void {
    console.log('[URLStateManager] Navigating to URL:', url);
    
    try {
      if (replace) {
        window.history.replaceState({}, '', url);
      } else {
        window.history.pushState({}, '', url);
      }
      
      console.log('[URLStateManager] Navigation completed');
      
    } catch (error) {
      console.error('[URLStateManager] Error navigating to URL:', error);
    }
  }

  /**
   * Listen for URL changes
   */
  static addURLChangeListener(callback: () => void): () => void {
    const handlePopState = () => {
      console.log('[URLStateManager] URL changed via browser navigation');
      callback();
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }
} 