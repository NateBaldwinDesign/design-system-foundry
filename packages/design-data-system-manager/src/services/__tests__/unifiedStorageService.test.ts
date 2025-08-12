import { UnifiedStorageService, UnifiedStorageError, type ValidationResult } from '../unifiedStorageService';
import type { TokenSystem } from '@token-model/data-model';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock environment variable
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.REACT_APP_UNIFIED_STORAGE_ENABLED = 'true';
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
  // Clear singleton instance
  (UnifiedStorageService as any).instance = undefined;
});

describe('UnifiedStorageService', () => {
  let service: UnifiedStorageService;

  beforeEach(() => {
    service = UnifiedStorageService.getInstance();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = UnifiedStorageService.getInstance();
      const instance2 = UnifiedStorageService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should check feature flag correctly', () => {
      expect(UnifiedStorageService.isEnabled()).toBe(true);
      
      process.env.REACT_APP_UNIFIED_STORAGE_ENABLED = 'false';
      (UnifiedStorageService as any).instance = undefined;
      const newService = UnifiedStorageService.getInstance();
      expect(UnifiedStorageService.isEnabled()).toBe(false);
    });

    it('should initialize migration status', () => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'token-model:unified:migration-status',
        expect.stringContaining('"isComplete":false')
      );
    });
  });

  describe('Data Operations', () => {
    const testData = { test: 'data' };
    const testKey = 'test-key';

    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));
    });

    describe('getData', () => {
      it('should get data successfully', () => {
        const result = service.getData(testKey);
        expect(result).toEqual(testData);
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith(testKey);
      });

      it('should return null for non-existent data', () => {
        mockLocalStorage.getItem.mockReturnValue(null);
        const result = service.getData(testKey);
        expect(result).toBeNull();
      });

      it('should handle invalid JSON', () => {
        mockLocalStorage.getItem.mockReturnValue('invalid json');
        expect(() => service.getData(testKey)).toThrow(UnifiedStorageError);
      });

      it('should validate data when type is specified', () => {
        const validTokenSystem: TokenSystem = {
          systemId: 'test-system',
          systemName: 'Test System',
          version: '1.0.0',
          tokens: [],
          tokenCollections: [],
          dimensions: [],
          platforms: [],
          themes: [],
          taxonomies: [],
          resolvedValueTypes: [],
          componentProperties: [],
          componentCategories: [],
          components: [],
          taxonomyOrder: [],
          versionHistory: []
        };

        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(validTokenSystem));
        const result = service.getData<TokenSystem>(testKey, 'TokenSystem');
        expect(result).toEqual(validTokenSystem);
      });

      it('should throw error for invalid data type', () => {
        const invalidData = { invalid: 'data' };
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(invalidData));
        
        expect(() => service.getData(testKey, 'TokenSystem')).toThrow(UnifiedStorageError);
      });
    });

    describe('setData', () => {
      it('should set data successfully', () => {
        service.setData(testKey, testData);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(testKey, JSON.stringify(testData));
      });

      it('should validate data when type is specified', () => {
        const validTokenSystem: TokenSystem = {
          systemId: 'test-system',
          systemName: 'Test System',
          version: '1.0.0',
          tokens: [],
          tokenCollections: [],
          dimensions: [],
          platforms: [],
          themes: [],
          taxonomies: [],
          resolvedValueTypes: [],
          componentProperties: [],
          componentCategories: [],
          components: [],
          taxonomyOrder: [],
          versionHistory: []
        };

        service.setData(testKey, validTokenSystem, 'TokenSystem');
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(testKey, JSON.stringify(validTokenSystem));
      });

      it('should throw error for invalid data type', () => {
        const invalidData = { invalid: 'data' };
        expect(() => service.setData(testKey, invalidData, 'TokenSystem')).toThrow(UnifiedStorageError);
      });

      it('should handle localStorage errors', () => {
        mockLocalStorage.setItem.mockImplementation(() => {
          throw new Error('Storage error');
        });

        expect(() => service.setData(testKey, testData)).toThrow(UnifiedStorageError);
      });
    });

    describe('deleteData', () => {
      it('should delete data successfully', () => {
        service.deleteData(testKey);
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(testKey);
      });

      it('should handle localStorage errors', () => {
        mockLocalStorage.removeItem.mockImplementation(() => {
          throw new Error('Storage error');
        });

        expect(() => service.deleteData(testKey)).toThrow(UnifiedStorageError);
      });
    });

    describe('hasData', () => {
      it('should return true for existing data', () => {
        mockLocalStorage.getItem.mockReturnValue('data');
        expect(service.hasData(testKey)).toBe(true);
      });

      it('should return false for non-existing data', () => {
        mockLocalStorage.getItem.mockReturnValue(null);
        expect(service.hasData(testKey)).toBe(false);
      });

      it('should handle localStorage errors', () => {
        mockLocalStorage.getItem.mockImplementation(() => {
          throw new Error('Storage error');
        });
        expect(service.hasData(testKey)).toBe(false);
      });
    });
  });

  describe('Transaction Support', () => {
    it('should log transactions', () => {
      service.setData('test-key', { data: 'test' });
      const log = service.getTransactionLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].status).toBe('committed');
    });

    it('should handle transaction rollback on error', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => service.setData('test-key', { data: 'test' })).toThrow(UnifiedStorageError);
      
      const log = service.getTransactionLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].status).toBe('rolled-back');
    });
  });

  describe('Validation', () => {
    it('should validate TokenSystem correctly', () => {
      const validTokenSystem: TokenSystem = {
        systemId: 'test-system',
        systemName: 'Test System',
        version: '1.0.0',
        tokens: [],
        tokenCollections: [],
        dimensions: [],
        platforms: [],
        themes: [],
        taxonomies: [],
        resolvedValueTypes: [],
        componentProperties: [],
        componentCategories: [],
        components: [],
        taxonomyOrder: [],
        versionHistory: []
      };

      service.setData('test-key', validTokenSystem, 'TokenSystem');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should validate PlatformExtension correctly', () => {
      const validPlatformExtension = {
        platformId: 'test-platform',
        systemId: 'test-system',
        version: '1.0.0'
      };

      service.setData('test-key', validPlatformExtension, 'PlatformExtension');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should validate ThemeOverrideFile correctly', () => {
      const validThemeOverride = {
        themeId: 'test-theme',
        systemId: 'test-system'
      };

      service.setData('test-key', validThemeOverride, 'ThemeOverrideFile');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should reject invalid data types', () => {
      const invalidData = { invalid: 'data' };
      
      expect(() => service.setData('test-key', invalidData, 'TokenSystem')).toThrow(UnifiedStorageError);
      expect(() => service.setData('test-key', invalidData, 'PlatformExtension')).toThrow(UnifiedStorageError);
      expect(() => service.setData('test-key', invalidData, 'ThemeOverrideFile')).toThrow(UnifiedStorageError);
    });
  });

  describe('Storage Statistics', () => {
    it('should return storage statistics', () => {
      mockLocalStorage.getItem.mockReturnValue('test data');
      
      const stats = service.getStorageStats();
      expect(stats).toHaveProperty('totalKeys');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('transactionCount');
      expect(stats).toHaveProperty('validationCacheSize');
    });

    it('should handle errors in statistics calculation', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const stats = service.getStorageStats();
      expect(stats.totalKeys).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear validation cache', () => {
      service.clearValidationCache();
      // No direct way to test cache clearing, but should not throw
      expect(() => service.clearValidationCache()).not.toThrow();
    });
  });

  describe('Migration Status', () => {
    it('should update migration step successfully', () => {
      service.updateMigrationStep('test-step', true);
      // Verify migration status was updated
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'token-model:unified:migration-status',
        expect.stringContaining('test-step')
      );
    });

    it('should handle failed migration steps', () => {
      service.updateMigrationStep('failed-step', false);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'token-model:unified:migration-status',
        expect.stringContaining('failed-step')
      );
    });
  });

  describe('Error Handling', () => {
    it('should create UnifiedStorageError with correct properties', () => {
      const error = new UnifiedStorageError('Test error', 'TEST_ERROR', { key: 'test' });
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.details).toEqual({ key: 'test' });
      expect(error.name).toBe('UnifiedStorageError');
    });
  });

  describe('Clear All Data', () => {
    it('should clear all unified storage data', () => {
      service.clearAllData();
      expect(mockLocalStorage.removeItem).toHaveBeenCalled();
    });

    it('should handle errors during clear all', () => {
      mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => service.clearAllData()).toThrow(UnifiedStorageError);
    });
  });
});
