import { UnifiedPerformanceService, PerformanceError, type PerformanceMetrics, type PerformanceEvent, type CacheEntry, type DebouncedFunction, type ThrottledFunction } from '../unifiedPerformanceService';
import { unifiedUIIntegrationService } from '../unifiedUIIntegrationService';
import { unifiedEditModeService } from '../unifiedEditModeService';
import type { UIComponentType } from '../unifiedUIIntegrationService';
import type { EditSession } from '../unifiedEditModeService';

// Mock services
jest.mock('../unifiedUIIntegrationService');
jest.mock('../unifiedEditModeService');

const mockUnifiedUIIntegrationService = unifiedUIIntegrationService as jest.Mocked<typeof unifiedUIIntegrationService>;
const mockUnifiedEditModeService = unifiedEditModeService as jest.Mocked<typeof unifiedEditModeService>;

// Mock environment variable
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.REACT_APP_UNIFIED_PERFORMANCE_ENABLED = 'true';
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
  // Clear singleton instance
  (UnifiedPerformanceService as any).instance = undefined;
});

describe('UnifiedPerformanceService', () => {
  let service: UnifiedPerformanceService;

  beforeEach(() => {
    // Setup default mock implementations
    mockUnifiedUIIntegrationService.getDataForComponent.mockResolvedValue({});
    mockUnifiedEditModeService.startEditSession.mockReturnValue({
      id: 'test-session',
      componentType: 'TokenEditor',
      entityId: 'test-entity',
      mode: 'edit',
      status: 'editing',
      startTime: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      originalData: {},
      currentData: {},
      validationErrors: [],
      changeCount: 0
    });

    service = UnifiedPerformanceService.getInstance();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = UnifiedPerformanceService.getInstance();
      const instance2 = UnifiedPerformanceService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should check feature flag correctly', () => {
      expect(UnifiedPerformanceService.isEnabled()).toBe(true);
      
      process.env.REACT_APP_UNIFIED_PERFORMANCE_ENABLED = 'false';
      (UnifiedPerformanceService as any).instance = undefined;
      const newService = UnifiedPerformanceService.getInstance();
      expect(UnifiedPerformanceService.isEnabled()).toBe(false);
    });

    it('should configure options', () => {
      const options = {
        enableMonitoring: false,
        cacheSize: 500
      };
      
      service.configure(options);
      
      // Verify configuration was applied by checking statistics
      const stats = service.getStatistics();
      expect(stats.options.enableMonitoring).toBe(false);
      expect(stats.options.cacheSize).toBe(500);
    });
  });

  describe('Event Handling', () => {
    it('should add and remove event listeners', () => {
      const listener = jest.fn();
      
      service.addEventListener(listener);
      expect(service.getStatistics().options).toBeDefined();
      
      service.removeEventListener(listener);
      // Note: We can't easily test listener count without exposing it
    });

    it('should emit events to listeners', () => {
      const listener = jest.fn();
      service.addEventListener(listener);
      
      // Trigger an event by starting an operation
      service.startOperation('test-operation');
      
      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as PerformanceEvent;
      expect(event.type).toBe('operation-start');
    });
  });

  describe('Performance Monitoring', () => {
    it('should start and end operations', () => {
      const operationId = service.startOperation('test-operation', 'TokenEditor');
      
      expect(operationId).toMatch(/^op_\d+_\d+$/);
      
      const metrics = service.endOperation(operationId, true);
      
      expect(metrics).toBeDefined();
      expect(metrics!.operationType).toBe('test-operation');
      expect(metrics!.success).toBe(true);
      expect(metrics!.duration).toBeGreaterThan(0);
    });

    it('should handle operation errors', () => {
      const operationId = service.startOperation('test-operation');
      
      const metrics = service.endOperation(operationId, false, 'Test error');
      
      expect(metrics!.success).toBe(false);
      expect(metrics!.error).toBe('Test error');
    });

    it('should not monitor when disabled', () => {
      service.configure({ enableMonitoring: false });
      
      const operationId = service.startOperation('test-operation');
      
      expect(operationId).toBe('');
      
      const metrics = service.endOperation(operationId, true);
      expect(metrics).toBeNull();
    });

    it('should get operation metrics', () => {
      const operationId = service.startOperation('test-operation');
      
      const metrics = service.getOperationMetrics(operationId);
      expect(metrics).toBeDefined();
      expect(metrics!.operationId).toBe(operationId);
      
      service.endOperation(operationId);
      
      const endedMetrics = service.getOperationMetrics(operationId);
      expect(endedMetrics).toBeNull();
    });

    it('should get active operations', () => {
      const operationId1 = service.startOperation('operation1');
      const operationId2 = service.startOperation('operation2');
      
      const activeOperations = service.getActiveOperations();
      expect(activeOperations).toHaveLength(2);
      expect(activeOperations.map(op => op.operationId)).toContain(operationId1);
      expect(activeOperations.map(op => op.operationId)).toContain(operationId2);
      
      service.endOperation(operationId1);
      
      const remainingOperations = service.getActiveOperations();
      expect(remainingOperations).toHaveLength(1);
      expect(remainingOperations[0].operationId).toBe(operationId2);
    });
  });

  describe('Caching', () => {
    const testData = { id: 'test', name: 'Test Data' };

    it('should cache and retrieve data', () => {
      service.cacheData('test-key', testData);
      
      const cached = service.getCachedData('test-key');
      expect(cached).toEqual(testData);
    });

    it('should not cache when disabled', () => {
      service.configure({ enableCaching: false });
      
      service.cacheData('test-key', testData);
      
      const cached = service.getCachedData('test-key');
      expect(cached).toBeNull();
    });

    it('should handle cache expiration', () => {
      service.configure({ cacheTimeout: 100 }); // 100ms timeout
      
      service.cacheData('test-key', testData);
      
      // Should be available immediately
      expect(service.getCachedData('test-key')).toEqual(testData);
      
      // Wait for expiration
      return new Promise(resolve => {
        setTimeout(() => {
          expect(service.getCachedData('test-key')).toBeNull();
          resolve(undefined);
        }, 150);
      });
    });

    it('should handle cache size limits', () => {
      service.configure({ cacheSize: 2 });
      
      service.cacheData('key1', { data: '1' });
      service.cacheData('key2', { data: '2' });
      service.cacheData('key3', { data: '3' }); // Should trigger cleanup
      
      // Should have only 2 entries after cleanup
      const stats = service.getStatistics();
      expect(stats.cacheSize).toBeLessThanOrEqual(2);
    });
  });

  describe('Debouncing', () => {
    it('should create debounced function', () => {
      const func = jest.fn();
      const debounced = service.debounce(func, 'test-key', 100);
      
      expect(debounced).toHaveProperty('cancel');
      expect(debounced).toHaveProperty('flush');
    });

    it('should debounce function calls', () => {
      const func = jest.fn();
      const debounced = service.debounce(func, 'test-key', 100);
      
      debounced('arg1');
      debounced('arg2');
      debounced('arg3');
      
      // Function should not be called immediately
      expect(func).not.toHaveBeenCalled();
      
      // Wait for debounce delay
      return new Promise(resolve => {
        setTimeout(() => {
          expect(func).toHaveBeenCalledTimes(1);
          expect(func).toHaveBeenCalledWith('arg3');
          resolve(undefined);
        }, 150);
      });
    });

    it('should cancel debounced function', () => {
      const func = jest.fn();
      const debounced = service.debounce(func, 'test-key', 100);
      
      debounced('arg1');
      debounced.cancel();
      
      // Wait for debounce delay
      return new Promise(resolve => {
        setTimeout(() => {
          expect(func).not.toHaveBeenCalled();
          resolve(undefined);
        }, 150);
      });
    });

    it('should flush debounced function', () => {
      const func = jest.fn();
      const debounced = service.debounce(func, 'test-key', 100);
      
      debounced('arg1');
      debounced.flush();
      
      expect(func).toHaveBeenCalledWith('arg1');
    });

    it('should not debounce when disabled', () => {
      service.configure({ enableDebouncing: false });
      
      const func = jest.fn();
      const debounced = service.debounce(func, 'test-key', 100);
      
      debounced('arg1');
      
      expect(func).toHaveBeenCalledWith('arg1');
    });
  });

  describe('Throttling', () => {
    it('should create throttled function', () => {
      const func = jest.fn();
      const throttled = service.throttle(func, 'test-key', 100);
      
      expect(throttled).toHaveProperty('cancel');
    });

    it('should throttle function calls', () => {
      const func = jest.fn();
      const throttled = service.throttle(func, 'test-key', 100);
      
      const startTime = Date.now();
      
      throttled('arg1');
      throttled('arg2');
      throttled('arg3');
      
      // First call should be immediate
      expect(func).toHaveBeenCalledWith('arg1');
      expect(func).toHaveBeenCalledTimes(1);
      
      // Wait for throttle delay
      return new Promise(resolve => {
        setTimeout(() => {
          expect(func).toHaveBeenCalledTimes(2); // Should have one more call
          resolve(undefined);
        }, 150);
      });
    });

    it('should cancel throttled function', () => {
      const func = jest.fn();
      const throttled = service.throttle(func, 'test-key', 100);
      
      throttled('arg1');
      throttled.cancel();
      
      // Wait for throttle delay
      return new Promise(resolve => {
        setTimeout(() => {
          expect(func).toHaveBeenCalledTimes(1); // Only the first call
          resolve(undefined);
        }, 150);
      });
    });

    it('should not throttle when disabled', () => {
      service.configure({ enableThrottling: false });
      
      const func = jest.fn();
      const throttled = service.throttle(func, 'test-key', 100);
      
      throttled('arg1');
      throttled('arg2');
      
      expect(func).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Loading Optimization', () => {
    it('should optimize data loading with cache', async () => {
      const loader = jest.fn().mockResolvedValue({ data: 'test' });
      
      const result = await service.optimizeDataLoading(loader, 'test-key', { useCache: true });
      
      expect(result).toEqual({ data: 'test' });
      expect(loader).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      const result2 = await service.optimizeDataLoading(loader, 'test-key', { useCache: true });
      
      expect(result2).toEqual({ data: 'test' });
      expect(loader).toHaveBeenCalledTimes(1); // Should not call loader again
    });

    it('should handle data loading errors', async () => {
      const loader = jest.fn().mockRejectedValue(new Error('Load failed'));
      
      await expect(
        service.optimizeDataLoading(loader, 'test-key')
      ).rejects.toThrow('Load failed');
    });
  });

  describe('Component Rendering Optimization', () => {
    it('should optimize component rendering', () => {
      const renderFunction = jest.fn();
      
      service.optimizeComponentRendering('TokenEditor', renderFunction);
      
      expect(renderFunction).toHaveBeenCalled();
    });

    it('should optimize component rendering with debouncing', () => {
      const renderFunction = jest.fn();
      
      service.optimizeComponentRendering('TokenEditor', renderFunction, {
        debounceKey: 'render-debounce'
      });
      
      expect(renderFunction).toHaveBeenCalled();
    });

    it('should optimize component rendering with throttling', () => {
      const renderFunction = jest.fn();
      
      service.optimizeComponentRendering('TokenEditor', renderFunction, {
        throttleKey: 'render-throttle'
      });
      
      expect(renderFunction).toHaveBeenCalled();
    });

    it('should handle rendering errors', () => {
      const renderFunction = jest.fn().mockImplementation(() => {
        throw new Error('Render failed');
      });
      
      expect(() => {
        service.optimizeComponentRendering('TokenEditor', renderFunction);
      }).toThrow('Render failed');
    });
  });

  describe('Edit Session Optimization', () => {
    const mockSession: EditSession = {
      id: 'test-session',
      componentType: 'TokenEditor',
      entityId: 'test-entity',
      mode: 'edit',
      status: 'editing',
      startTime: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      originalData: {},
      currentData: {},
      validationErrors: [],
      changeCount: 0
    };

    it('should optimize synchronous edit session operations', () => {
      const operation = jest.fn();
      
      service.optimizeEditSession(mockSession, operation, 'test-operation');
      
      expect(operation).toHaveBeenCalled();
    });

    it('should optimize asynchronous edit session operations', async () => {
      const operation = jest.fn().mockResolvedValue(undefined);
      
      await service.optimizeEditSession(mockSession, operation, 'test-operation');
      
      expect(operation).toHaveBeenCalled();
    });

    it('should handle edit session operation errors', () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new Error('Operation failed');
      });
      
      expect(() => {
        service.optimizeEditSession(mockSession, operation, 'test-operation');
      }).toThrow('Operation failed');
    });

    it('should handle async edit session operation errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Async operation failed'));
      
      await expect(
        service.optimizeEditSession(mockSession, operation, 'test-operation')
      ).rejects.toThrow('Async operation failed');
    });
  });

  describe('Memory Management', () => {
    it('should track memory usage', () => {
      const operationId = service.startOperation('test-operation');
      const metrics = service.endOperation(operationId);
      
      expect(metrics!.memoryUsage).toBeGreaterThanOrEqual(0);
    });

    it('should perform memory cleanup', () => {
      // Add some data to cache
      service.cacheData('key1', { data: '1' });
      service.cacheData('key2', { data: '2' });
      
      // Trigger memory cleanup
      service['performMemoryCleanup']();
      
      // Cache should still exist (not over threshold)
      expect(service.getCachedData('key1')).toBeDefined();
    });
  });

  describe('Performance Thresholds', () => {
    it('should check performance thresholds', () => {
      const listener = jest.fn();
      service.addEventListener(listener);
      
      // Configure low thresholds to trigger warnings
      service.configure({
        performanceThresholds: {
          maxDuration: 1, // 1ms
          maxMemoryUsage: 1024, // 1KB
          warningThreshold: 0.5
        }
      });
      
      const operationId = service.startOperation('test-operation');
      
      // Simulate slow operation
      setTimeout(() => {
        service.endOperation(operationId);
      }, 10);
      
      // Wait for operation to complete
      return new Promise(resolve => {
        setTimeout(() => {
          const thresholdEvents = listener.mock.calls.filter(
            call => (call[0] as PerformanceEvent).type === 'threshold-exceeded'
          );
          expect(thresholdEvents.length).toBeGreaterThan(0);
          resolve(undefined);
        }, 20);
      });
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', () => {
      const stats = service.getStatistics();
      
      expect(stats).toHaveProperty('activeOperations');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('averageMemoryUsage');
      expect(stats).toHaveProperty('totalOperations');
      expect(stats).toHaveProperty('averageOperationDuration');
      expect(stats).toHaveProperty('options');
    });

    it('should track active operations', () => {
      const operationId1 = service.startOperation('operation1');
      const operationId2 = service.startOperation('operation2');
      
      const stats = service.getStatistics();
      expect(stats.activeOperations).toBe(2);
      
      service.endOperation(operationId1);
      
      const updatedStats = service.getStatistics();
      expect(updatedStats.activeOperations).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should clear caches', () => {
      service.cacheData('key1', { data: '1' });
      service.cacheData('key2', { data: '2' });
      
      expect(service.getStatistics().cacheSize).toBe(2);
      
      service.clearCaches();
      
      expect(service.getStatistics().cacheSize).toBe(0);
    });

    it('should reset service state', () => {
      const listener = jest.fn();
      service.addEventListener(listener);
      
      service.startOperation('test-operation');
      service.cacheData('test-key', { data: 'test' });
      
      service.reset();
      
      expect(service.getActiveOperations()).toHaveLength(0);
      expect(service.getStatistics().cacheSize).toBe(0);
    });

    it('should cleanup resources', () => {
      service.cleanup();
      
      expect(service.getActiveOperations()).toHaveLength(0);
      expect(service.getStatistics().cacheSize).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle event listener errors gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      service.addEventListener(errorListener);
      
      // Should not throw error, just log it
      expect(() => {
        service.startOperation('test-operation');
      }).not.toThrow();
    });

    it('should handle cache errors gracefully', () => {
      // Test with invalid data that can't be serialized
      const circularData: any = {};
      circularData.self = circularData;
      
      expect(() => {
        service.cacheData('test-key', circularData);
      }).not.toThrow();
    });
  });
});
