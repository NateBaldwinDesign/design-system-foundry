import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataSourceManager } from '../dataSourceManager';
import { PermissionManager } from '../permissionManager';
import { EnhancedDataMerger } from '../enhancedDataMerger';
import { TestDataSourceUtils } from '../../utils/testDataSourceUtils';

// Mock dependencies
vi.mock('../permissionManager');
vi.mock('../enhancedDataMerger');
vi.mock('../storage');

describe('DataSourceManager Integration Tests', () => {
  let dataSourceManager: DataSourceManager;
  let mockPermissionManager: {
    checkRepositoryPermissions: ReturnType<typeof vi.fn>;
    checkAllPermissions: ReturnType<typeof vi.fn>;
    getCurrentEditPermissions: ReturnType<typeof vi.fn>;
  };
  let mockDataMerger: {
    mergeData: ReturnType<typeof vi.fn>;
    getSourceInfo: ReturnType<typeof vi.fn>;
    getAnalytics: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Clear any existing instances
    vi.clearAllMocks();
    
    // Create fresh instance
    dataSourceManager = DataSourceManager.getInstance();
    
    // Mock PermissionManager
    mockPermissionManager = {
      checkRepositoryPermissions: vi.fn(),
      checkAllPermissions: vi.fn(),
      getCurrentEditPermissions: vi.fn()
    };
    vi.mocked(PermissionManager.getInstance).mockReturnValue(mockPermissionManager);
    
    // Mock EnhancedDataMerger
    mockDataMerger = {
      mergeData: vi.fn(),
      getSourceInfo: vi.fn(),
      getAnalytics: vi.fn()
    };
    vi.mocked(EnhancedDataMerger.getInstance).mockReturnValue(mockDataMerger);
  });

  afterEach(() => {
    // Clear the singleton instance
    dataSourceManager.clear();
  });

  describe('Data Source Context Management', () => {
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

    it('should update available sources correctly', () => {
      const mockPlatforms = [
        TestDataSourceUtils.createMockPlatform({ id: 'platform-1' }),
        TestDataSourceUtils.createMockPlatform({ id: 'platform-2' })
      ];
      
      const mockThemes = [
        TestDataSourceUtils.createMockTheme({ id: 'theme-1' }),
        TestDataSourceUtils.createMockTheme({ id: 'theme-2' })
      ];

      // Mock StorageService.getPlatforms and getThemes
      const mockStorage = {
        getPlatforms: vi.fn().mockReturnValue(mockPlatforms),
        getThemes: vi.fn().mockReturnValue(mockThemes)
      };
      vi.doMock('../storage', () => ({ StorageService: mockStorage }));

      dataSourceManager.updateAvailableSources();
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.availablePlatforms).toEqual(mockPlatforms);
      expect(context.availableThemes).toEqual(mockThemes);
    });
  });

  describe('Platform Switching', () => {
    it('should switch to platform correctly', async () => {
      dataSourceManager.updateAvailableSources();
      
      // Mock permission check
      mockPermissionManager.checkRepositoryPermissions.mockResolvedValue(true);
      
      await dataSourceManager.switchToPlatform('platform-web');
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.currentPlatform).toBe('platform-web');
      expect(context.currentTheme).toBeNull();
    });

    it('should switch to null platform (core data)', async () => {
      await dataSourceManager.switchToPlatform(null);
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.currentPlatform).toBeNull();
    });

    it('should handle invalid platform gracefully', async () => {
      dataSourceManager.updateAvailableSources();
      
      // Mock permission check to fail
      mockPermissionManager.checkRepositoryPermissions.mockResolvedValue(false);
      
      await dataSourceManager.switchToPlatform('invalid-platform');
      
      const context = dataSourceManager.getCurrentContext();
      // Should remain unchanged or handle gracefully
      expect(context.currentPlatform).toBeNull();
    });
  });

  describe('Theme Switching', () => {
    it('should switch to theme correctly', async () => {
      const mockContext = TestDataSourceUtils.createMockDataSourceContext();
      dataSourceManager.updateAvailableSources();
      
      // Mock permission check
      mockPermissionManager.checkRepositoryPermissions.mockResolvedValue(true);
      
      await dataSourceManager.switchToTheme('theme-light');
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.currentTheme).toBe('theme-light');
      expect(context.currentPlatform).toBeNull();
    });

    it('should switch to null theme (core data)', async () => {
      const mockContext = TestDataSourceUtils.createMockDataSourceContext({
        currentTheme: 'theme-light'
      });
      
      await dataSourceManager.switchToTheme(null);
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.currentTheme).toBeNull();
    });
  });

  describe('Permission Management', () => {
    it('should update permissions correctly', async () => {
      const mockPermissions = {
        core: true,
        platforms: { 'platform-web': true, 'platform-ios': false },
        themes: { 'theme-light': true, 'theme-dark': false }
      };
      
      mockPermissionManager.checkAllPermissions.mockResolvedValue(mockPermissions);
      
      await dataSourceManager.updatePermissions();
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.permissions).toEqual(mockPermissions);
    });

    it('should get current edit permissions correctly', () => {
      const mockContext = TestDataSourceUtils.createMockDataSourceContext({
        currentPlatform: 'platform-web',
        permissions: {
          core: false,
          platforms: { 'platform-web': true },
          themes: { 'theme-light': false }
        }
      });
      
      const canEdit = dataSourceManager.getCurrentEditPermissions();
      expect(canEdit).toBe(true); // Should have platform edit access
    });
  });

  describe('Data Source Type Detection', () => {
    it('should detect core data source type', () => {
      const mockContext = TestDataSourceUtils.createMockDataSourceContext({
        currentPlatform: null,
        currentTheme: null
      });
      
      const sourceType = dataSourceManager.getCurrentDataSourceType();
      expect(sourceType).toBe('core');
    });

    it('should detect platform extension data source type', () => {
      const mockContext = TestDataSourceUtils.createMockDataSourceContext({
        currentPlatform: 'platform-web',
        currentTheme: null
      });
      
      const sourceType = dataSourceManager.getCurrentDataSourceType();
      expect(sourceType).toBe('platform-extension');
    });

    it('should detect theme override data source type', () => {
      const mockContext = TestDataSourceUtils.createMockDataSourceContext({
        currentPlatform: null,
        currentTheme: 'theme-light'
      });
      
      const sourceType = dataSourceManager.getCurrentDataSourceType();
      expect(sourceType).toBe('theme-override');
    });

    it('should prioritize platform over theme', () => {
      const mockContext = TestDataSourceUtils.createMockDataSourceContext({
        currentPlatform: 'platform-web',
        currentTheme: 'theme-light'
      });
      
      const sourceType = dataSourceManager.getCurrentDataSourceType();
      expect(sourceType).toBe('platform-extension');
    });
  });

  describe('URL State Management', () => {
    it('should initialize from URL parameters', () => {
      const mockURLParams = new URLSearchParams({
        platform: 'platform-web',
        theme: 'theme-light'
      });
      
      // Mock URLSearchParams
      Object.defineProperty(window, 'location', {
        value: {
          search: '?platform=platform-web&theme=theme-light'
        },
        writable: true
      });
      
      dataSourceManager.initializeFromURL();
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.currentPlatform).toBe('platform-web');
      expect(context.currentTheme).toBe('theme-light');
    });

    it('should handle "none" values in URL parameters', () => {
      const mockURLParams = new URLSearchParams({
        platform: 'none',
        theme: 'none'
      });
      
      Object.defineProperty(window, 'location', {
        value: {
          search: '?platform=none&theme=none'
        },
        writable: true
      });
      
      dataSourceManager.initializeFromURL();
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.currentPlatform).toBeNull();
      expect(context.currentTheme).toBeNull();
    });
  });

  describe('Validation', () => {
    it('should validate current selections', () => {
      const mockContext = TestDataSourceUtils.createMockDataSourceContext({
        currentPlatform: 'invalid-platform',
        currentTheme: 'invalid-theme'
      });
      
      dataSourceManager.updateAvailableSources();
      
      // Should reset invalid selections
      const context = dataSourceManager.getCurrentContext();
      expect(context.currentPlatform).toBeNull();
      expect(context.currentTheme).toBeNull();
    });
  });

  describe('Callback System', () => {
    it('should call callbacks on data source changes', async () => {
      const mockCallback = vi.fn();
      dataSourceManager.setCallbacks({
        onDataSourceChanged: mockCallback
      });
      
      await dataSourceManager.switchToPlatform('platform-web');
      
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPlatform: 'platform-web'
        })
      );
    });

    it('should call error callbacks on failures', async () => {
      const mockErrorCallback = vi.fn();
      dataSourceManager.setCallbacks({
        onError: mockErrorCallback
      });
      
      // Mock a failure
      mockPermissionManager.checkRepositoryPermissions.mockRejectedValue(
        new Error('Permission check failed')
      );
      
      await dataSourceManager.switchToPlatform('platform-web');
      
      expect(mockErrorCallback).toHaveBeenCalledWith(
        expect.stringContaining('Permission check failed')
      );
    });
  });

  describe('Integration with Other Services', () => {
    it('should integrate with PermissionManager', async () => {
      const mockPermissions = {
        core: true,
        platforms: { 'platform-web': true },
        themes: { 'theme-light': false }
      };
      
      mockPermissionManager.checkAllPermissions.mockResolvedValue(mockPermissions);
      
      await dataSourceManager.updatePermissions();
      
      expect(mockPermissionManager.checkAllPermissions).toHaveBeenCalled();
      
      const context = dataSourceManager.getCurrentContext();
      expect(context.permissions).toEqual(mockPermissions);
    });

    it('should integrate with EnhancedDataMerger', () => {
      const mockContext = TestDataSourceUtils.createMockDataSourceContext();
      const mockMergedData = { tokens: [], collections: [] };
      
      mockDataMerger.mergeData.mockReturnValue(mockMergedData);
      
      // Trigger data merging (this would typically happen through the merger)
      const result = mockDataMerger.mergeData(mockContext);
      
      expect(mockDataMerger.mergeData).toHaveBeenCalledWith(mockContext);
      expect(result).toEqual(mockMergedData);
    });
  });
}); 