import type { DataSourceContext } from '../services/dataSourceManager';
import type { Platform, Theme } from '@token-model/data-model';

/**
 * Test utilities for data source management
 */
export class TestDataSourceUtils {
  /**
   * Create a mock DataSourceContext for testing
   */
  static createMockDataSourceContext(overrides: Partial<DataSourceContext> = {}): DataSourceContext {
    const defaultPlatforms: Platform[] = [
      {
        id: 'platform-web',
        displayName: 'Web Platform',
        description: 'Web-specific platform extension',
        extensionSource: {
          repositoryUri: 'owner/repo-web',
          filePath: 'platform-web.json'
        }
      },
      {
        id: 'platform-ios',
        displayName: 'iOS Platform',
        description: 'iOS-specific platform extension',
        extensionSource: {
          repositoryUri: 'owner/repo-ios',
          filePath: 'platform-ios.json'
        }
      }
    ];

    const defaultThemes: Theme[] = [
      {
        id: 'theme-light',
        displayName: 'Light Theme',
        description: 'Light theme override'
      },
      {
        id: 'theme-dark',
        displayName: 'Dark Theme',
        description: 'Dark theme override'
      }
    ];

    return {
      currentPlatform: null,
      currentTheme: null,
      availablePlatforms: defaultPlatforms,
      availableThemes: defaultThemes,
      permissions: {
        core: true,
        platforms: {
          'platform-web': true,
          'platform-ios': false
        },
        themes: {
          'theme-light': true,
          'theme-dark': false
        }
      },
      repositories: {
        core: {
          fullName: 'owner/core-repo',
          branch: 'main',
          filePath: 'schema.json',
          fileType: 'schema'
        },
        platforms: {
          'platform-web': {
            fullName: 'owner/repo-web',
            branch: 'main',
            filePath: 'platform-web.json',
            fileType: 'platform-extension'
          },
          'platform-ios': {
            fullName: 'owner/repo-ios',
            branch: 'main',
            filePath: 'platform-ios.json',
            fileType: 'platform-extension'
          }
        },
        themes: {
          'theme-light': {
            fullName: 'owner/repo-light',
            branch: 'main',
            filePath: 'theme-light.json',
            fileType: 'theme-override'
          },
          'theme-dark': {
            fullName: 'owner/repo-dark',
            branch: 'main',
            filePath: 'theme-dark.json',
            fileType: 'theme-override'
          }
        }
      },
      ...overrides
    };
  }

  /**
   * Create a mock platform for testing
   */
  static createMockPlatform(overrides: Partial<Platform> = {}): Platform {
    return {
      id: 'test-platform',
      displayName: 'Test Platform',
      description: 'Test platform extension',
      extensionSource: {
        repositoryUri: 'owner/test-repo',
        filePath: 'platform.json'
      },
      ...overrides
    };
  }

  /**
   * Create a mock theme for testing
   */
  static createMockTheme(overrides: Partial<Theme> = {}): Theme {
    return {
      id: 'test-theme',
      displayName: 'Test Theme',
      description: 'Test theme override',
      ...overrides
    };
  }

  /**
   * Create mock permission map for testing
   */
  static createMockPermissions(overrides: Record<string, boolean> = {}): Record<string, boolean> {
    return {
      'owner/core-repo': true,
      'owner/repo-web': true,
      'owner/repo-ios': false,
      'owner/repo-light': true,
      'owner/repo-dark': false,
      ...overrides
    };
  }

  /**
   * Simulate data source switching delay
   */
  static async simulateDataSourceSwitch(delay: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Create mock URL parameters for testing
   */
  static createMockURLParams(overrides: Record<string, string> = {}): URLSearchParams {
    const params = new URLSearchParams({
      repo: 'owner/test-repo',
      path: 'schema.json',
      branch: 'main',
      ...overrides
    });
    return params;
  }

  /**
   * Validate DataSourceContext structure
   */
  static validateDataSourceContext(context: DataSourceContext): boolean {
    // Check required properties
    if (typeof context.currentPlatform !== 'string' && context.currentPlatform !== null) {
      return false;
    }
    if (typeof context.currentTheme !== 'string' && context.currentTheme !== 'null') {
      return false;
    }
    if (!Array.isArray(context.availablePlatforms)) {
      return false;
    }
    if (!Array.isArray(context.availableThemes)) {
      return false;
    }
    if (typeof context.permissions !== 'object' || context.permissions === null) {
      return false;
    }
    if (typeof context.repositories !== 'object' || context.repositories === null) {
      return false;
    }

    // Check permissions structure
    if (typeof context.permissions.core !== 'boolean') {
      return false;
    }
    if (typeof context.permissions.platforms !== 'object') {
      return false;
    }
    if (typeof context.permissions.themes !== 'object') {
      return false;
    }

    // Check repositories structure
    if (typeof context.repositories.core !== 'object' && context.repositories.core !== null) {
      return false;
    }
    if (typeof context.repositories.platforms !== 'object') {
      return false;
    }
    if (typeof context.repositories.themes !== 'object') {
      return false;
    }

    return true;
  }

  /**
   * Create test scenarios for data source switching
   */
  static getTestScenarios() {
    return {
      coreOnly: {
        currentPlatform: null,
        currentTheme: null,
        expectedSource: 'core'
      },
      platformOnly: {
        currentPlatform: 'platform-web',
        currentTheme: null,
        expectedSource: 'platform'
      },
      themeOnly: {
        currentPlatform: null,
        currentTheme: 'theme-light',
        expectedSource: 'theme'
      },
      platformAndTheme: {
        currentPlatform: 'platform-web',
        currentTheme: 'theme-dark',
        expectedSource: 'merged'
      }
    };
  }
} 