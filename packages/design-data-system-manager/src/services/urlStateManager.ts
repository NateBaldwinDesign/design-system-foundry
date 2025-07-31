import type { DataSourceContext } from './dataSourceManager';

export interface URLParameters {
  repo?: string;
  path?: string;
  branch?: string;
  platform?: string;
  theme?: string;
}

/**
 * URL State Manager
 * 
 * Manages URL parameters for data source context, including platform and theme selections.
 * Handles URL parameter parsing, validation, and updates.
 */
export class URLStateManager {
  private static readonly URL_PARAMS = {
    REPO: 'repo',
    PATH: 'path',
    BRANCH: 'branch',
    PLATFORM: 'platform',
    THEME: 'theme'
  } as const;

  /**
   * Parse URL parameters from current URL
   */
  static parseURLParameters(): URLParameters {
    const urlParams = new URLSearchParams(window.location.search);
    
    return {
      repo: urlParams.get(this.URL_PARAMS.REPO) || undefined,
      path: urlParams.get(this.URL_PARAMS.PATH) || undefined,
      branch: urlParams.get(this.URL_PARAMS.BRANCH) || undefined,
      platform: urlParams.get(this.URL_PARAMS.PLATFORM) || undefined,
      theme: urlParams.get(this.URL_PARAMS.THEME) || undefined
    };
  }

  /**
   * Update URL parameters for data source context
   */
  static updateURLParameters(dataSourceContext: DataSourceContext): void {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    // Update platform parameter
    if (dataSourceContext.currentPlatform && dataSourceContext.currentPlatform !== 'none') {
      searchParams.set(this.URL_PARAMS.PLATFORM, dataSourceContext.currentPlatform);
    } else {
      searchParams.delete(this.URL_PARAMS.PLATFORM);
    }

    // Update theme parameter
    if (dataSourceContext.currentTheme && dataSourceContext.currentTheme !== 'none') {
      searchParams.set(this.URL_PARAMS.THEME, dataSourceContext.currentTheme);
    } else {
      searchParams.delete(this.URL_PARAMS.THEME);
    }

    // Update browser URL without reloading the page
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Update specific URL parameter
   */
  static updateURLParameter(key: keyof URLParameters, value: string | undefined): void {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }

    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Initialize data source context from URL parameters
   */
  static initializeFromURL(): {
    currentPlatform: string | null;
    currentTheme: string | null;
  } {
    const params = this.parseURLParameters();
    
    return {
      currentPlatform: params.platform || null,
      currentTheme: params.theme || null
    };
  }

  /**
   * Validate URL parameters
   */
  static validateURLParameters(params: URLParameters): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate repository parameters
    if (params.repo && !this.isValidRepositoryFormat(params.repo)) {
      errors.push('Invalid repository format. Expected format: owner/repository');
    }

    if (params.repo && !params.path) {
      warnings.push('Repository specified but no file path provided');
    }

    if (params.path && !params.repo) {
      warnings.push('File path specified but no repository provided');
    }

    // Validate platform parameter
    if (params.platform && params.platform === 'none') {
      warnings.push('Platform parameter set to "none" - this is redundant');
    }

    // Validate theme parameter
    if (params.theme && params.theme === 'none') {
      warnings.push('Theme parameter set to "none" - this is redundant');
    }

    // Validate branch parameter
    if (params.branch && !this.isValidBranchName(params.branch)) {
      warnings.push('Branch name may contain invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check if repository format is valid
   */
  private static isValidRepositoryFormat(repo: string): boolean {
    // Basic validation: should be in format "owner/repository"
    const parts = repo.split('/');
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
  }

  /**
   * Check if branch name is valid
   */
  private static isValidBranchName(branch: string): boolean {
    // Basic validation: should not contain certain characters
    const invalidChars = /[<>:"\\|?*]/;
    return !invalidChars.test(branch);
  }

  /**
   * Get current URL as shareable link
   */
  static getShareableURL(): string {
    return window.location.href;
  }

  /**
   * Create shareable URL with specific parameters
   */
  static createShareableURL(params: URLParameters): string {
    const url = new URL(window.location.origin + window.location.pathname);
    const searchParams = url.searchParams;

    // Add all parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  /**
   * Clear all URL parameters
   */
  static clearURLParameters(): void {
    const url = new URL(window.location.origin + window.location.pathname);
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Listen for URL parameter changes
   */
  static onURLChange(callback: (params: URLParameters) => void): () => void {
    const handlePopState = () => {
      const params = this.parseURLParameters();
      callback(params);
    };

    window.addEventListener('popstate', handlePopState);

    // Return cleanup function
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }

  /**
   * Get URL parameter value
   */
  static getURLParameter(key: keyof URLParameters): string | null {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(key);
  }

  /**
   * Set URL parameter value
   */
  static setURLParameter(key: keyof URLParameters, value: string): void {
    this.updateURLParameter(key, value);
  }

  /**
   * Remove URL parameter
   */
  static removeURLParameter(key: keyof URLParameters): void {
    this.updateURLParameter(key, undefined);
  }

  /**
   * Check if URL has specific parameter
   */
  static hasURLParameter(key: keyof URLParameters): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has(key);
  }

  /**
   * Get all current URL parameters as object
   */
  static getAllURLParameters(): Record<string, string> {
    const urlParams = new URLSearchParams(window.location.search);
    const params: Record<string, string> = {};
    
    urlParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return params;
  }

  /**
   * Update multiple URL parameters at once
   */
  static updateMultipleURLParameters(updates: Partial<URLParameters>): void {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        searchParams.set(key, value);
      } else {
        searchParams.delete(key);
      }
    });

    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Preserve existing URL parameters while updating specific ones
   */
  static preserveAndUpdateURLParameters(
    updates: Partial<URLParameters>,
    preserveKeys: (keyof URLParameters)[] = []
  ): void {
    const currentParams = this.getAllURLParameters();
    const preservedParams: Partial<URLParameters> = {};

    // Preserve specified parameters
    preserveKeys.forEach(key => {
      if (currentParams[key]) {
        preservedParams[key] = currentParams[key];
      }
    });

    // Merge preserved params with updates
    const mergedParams = { ...preservedParams, ...updates };

    // Update URL with merged parameters
    this.updateMultipleURLParameters(mergedParams);
  }
} 