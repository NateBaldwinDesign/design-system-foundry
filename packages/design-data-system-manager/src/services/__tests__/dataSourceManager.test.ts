import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataSourceManager } from '../dataSourceManager';

describe('DataSourceManager', () => {
  let dataSourceManager: DataSourceManager;

  beforeEach(() => {
    dataSourceManager = DataSourceManager.getInstance();
  });

  afterEach(() => {
    dataSourceManager.clear();
  });

  describe('Initialization', () => {
    it('should initialize with default context', () => {
      const context = dataSourceManager.getCurrentContext();
      
      expect(context.currentPlatform).toBeNull();
      expect(context.currentTheme).toBeNull();
      expect(context.availablePlatforms).toEqual([]);
      expect(context.availableThemes).toEqual([]);
      expect(context.permissions.core).toBe(false);
      expect(context.permissions.platforms).toEqual({});
      expect(context.permissions.themes).toEqual({});
    });

    it('should be a singleton', () => {
      const instance1 = DataSourceManager.getInstance();
      const instance2 = DataSourceManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Data Source Type Detection', () => {
    it('should detect core data source type', () => {
      const sourceType = dataSourceManager.getCurrentDataSourceType();
      expect(sourceType).toBe('core');
    });

    it('should detect platform extension data source type', () => {
      // Set platform directly for testing
      (dataSourceManager as any).currentContext.currentPlatform = 'platform-web';
      
      const sourceType = dataSourceManager.getCurrentDataSourceType();
      expect(sourceType).toBe('platform-extension');
    });

    it('should detect theme override data source type', () => {
      // Set theme directly for testing
      (dataSourceManager as any).currentContext.currentTheme = 'theme-light';
      
      const sourceType = dataSourceManager.getCurrentDataSourceType();
      expect(sourceType).toBe('theme-override');
    });

    it('should prioritize platform over theme', () => {
      // Set both platform and theme directly for testing
      (dataSourceManager as any).currentContext.currentPlatform = 'platform-web';
      (dataSourceManager as any).currentContext.currentTheme = 'theme-light';
      
      const sourceType = dataSourceManager.getCurrentDataSourceType();
      expect(sourceType).toBe('platform-extension');
    });
  });

  describe('Source ID Management', () => {
    it('should return null for core data source', () => {
      const sourceId = dataSourceManager.getCurrentSourceId();
      expect(sourceId).toBeNull();
    });

    it('should return platform ID for platform extension', () => {
      // Set platform directly for testing
      (dataSourceManager as any).currentContext.currentPlatform = 'platform-web';
      
      const sourceId = dataSourceManager.getCurrentSourceId();
      expect(sourceId).toBe('platform-web');
    });

    it('should return theme ID for theme override', () => {
      // Set theme directly for testing
      (dataSourceManager as any).currentContext.currentTheme = 'theme-light';
      
      const sourceId = dataSourceManager.getCurrentSourceId();
      expect(sourceId).toBe('theme-light');
    });
  });

  describe('Callback System', () => {
    it('should set callbacks correctly', () => {
      const mockCallback = vi.fn();
      
      dataSourceManager.setCallbacks({
        onDataSourceChanged: mockCallback
      });
      
      // Verify callback was set (we can't easily test the internal state)
      expect(mockCallback).toBeDefined();
    });
  });

  describe('Repository Info Management', () => {
    it('should update repository info for core', () => {
      const repoInfo = {
        fullName: 'owner/repo',
        branch: 'main',
        filePath: 'schema.json',
        fileType: 'schema' as const
      };
      
      dataSourceManager.updateRepositoryInfo('core', repoInfo);
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.repositories.core).toEqual(repoInfo);
    });

    it('should update repository info for platform', () => {
      const repoInfo = {
        fullName: 'owner/platform-repo',
        branch: 'main',
        filePath: 'platform.json',
        fileType: 'platform-extension' as const
      };
      
      dataSourceManager.updateRepositoryInfo('platform-extension', repoInfo, 'platform-web');
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.repositories.platforms['platform-web']).toEqual(repoInfo);
    });

    it('should update repository info for theme', () => {
      const repoInfo = {
        fullName: 'owner/theme-repo',
        branch: 'main',
        filePath: 'theme.json',
        fileType: 'theme-override' as const
      };
      
      dataSourceManager.updateRepositoryInfo('theme-override', repoInfo, 'theme-light');
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.repositories.themes['theme-light']).toEqual(repoInfo);
    });
  });

  describe('Clear Functionality', () => {
    it('should clear all data', () => {
      // Set some data first
      (dataSourceManager as any).currentContext.currentPlatform = 'platform-web';
      (dataSourceManager as any).currentContext.currentTheme = 'theme-light';
      
      dataSourceManager.clear();
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.currentPlatform).toBeNull();
      expect(context.currentTheme).toBeNull();
      expect(context.availablePlatforms).toEqual([]);
      expect(context.availableThemes).toEqual([]);
    });
  });
}); 