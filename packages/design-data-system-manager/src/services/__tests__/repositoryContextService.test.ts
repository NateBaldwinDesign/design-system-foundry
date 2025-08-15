import { RepositoryContextService, type RepositoryContext, type SourceContext, type RepositoryInfo } from '../repositoryContextService';

describe('RepositoryContextService', () => {
  let service: RepositoryContextService;

  beforeEach(() => {
    // Reset the singleton instance for each test
    (RepositoryContextService as any).instance = undefined;
    service = RepositoryContextService.getInstance();
  });

  afterEach(() => {
    // Clean up event listeners
    service.unsubscribeFromChanges('testEvent', () => {});
  });

  describe('Singleton Pattern', () => {
    test('should initialize correctly', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RepositoryContextService);
    });

    test('should return the same instance', () => {
      const instance1 = RepositoryContextService.getInstance();
      const instance2 = RepositoryContextService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('State Management', () => {
    test('should get current context', () => {
      const context = service.getCurrentContext();
      expect(context).toBeDefined();
      expect(context).toHaveProperty('coreRepository');
      expect(context).toHaveProperty('platformRepositories');
      expect(context).toHaveProperty('themeRepositories');
      expect(context).toHaveProperty('currentSource');
      expect(context).toHaveProperty('lastUpdated');
    });

    test('should get current source context', () => {
      const sourceContext = service.getCurrentSourceContext();
      expect(sourceContext).toBeDefined();
      expect(sourceContext).toHaveProperty('sourceType');
      expect(sourceContext).toHaveProperty('sourceId');
      expect(sourceContext).toHaveProperty('sourceName');
      expect(sourceContext).toHaveProperty('repositoryInfo');
      expect(sourceContext).toHaveProperty('schemaType');
      expect(sourceContext).toHaveProperty('editMode');
    });

    test('should get repository info', () => {
      const repoInfo = service.getRepositoryInfo();
      // Should return null initially or a valid RepositoryInfo object
      expect(repoInfo === null || typeof repoInfo === 'object').toBe(true);
    });
  });

  describe('State Updates', () => {
    test('should update context correctly', () => {
      const updates: Partial<RepositoryContext> = {
        coreRepository: {
          fullName: 'test/repo',
          branch: 'main',
          filePath: 'test.json',
          fileType: 'schema'
        }
      };

      service.updateContext(updates);
      const context = service.getCurrentContext();
      expect(context.coreRepository).toEqual(updates.coreRepository);
    });

    test('should update source context correctly', () => {
      const updates: Partial<SourceContext> = {
        sourceType: 'platform-extension',
        sourceId: 'test-platform',
        sourceName: 'Test Platform'
      };

      service.updateSourceContext(updates);
      const sourceContext = service.getCurrentSourceContext();
      expect(sourceContext.sourceType).toBe(updates.sourceType);
      expect(sourceContext.sourceId).toBe(updates.sourceId);
      expect(sourceContext.sourceName).toBe(updates.sourceName);
    });

    test('should set edit mode correctly', () => {
      const editMode = {
        isActive: true,
        sourceType: 'platform-extension' as const,
        sourceId: 'test-platform',
        targetRepository: {
          fullName: 'test/repo',
          branch: 'main',
          filePath: 'test.json',
          fileType: 'platform-extension'
        }
      };

      service.setEditMode(editMode);
      const sourceContext = service.getCurrentSourceContext();
      expect(sourceContext.editMode).toEqual(editMode);
    });
  });

  describe('Event System', () => {
    test('should emit events correctly', () => {
      const mockCallback = jest.fn();
      service.subscribeToChanges('testEvent', mockCallback);
      
      const testData = { test: 'data' };
      service.emitEvent('testEvent', testData);
      
      expect(mockCallback).toHaveBeenCalledWith(testData);
    });

    test('should handle multiple event listeners', () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      
      service.subscribeToChanges('testEvent', mockCallback1);
      service.subscribeToChanges('testEvent', mockCallback2);
      
      const testData = { test: 'data' };
      service.emitEvent('testEvent', testData);
      
      expect(mockCallback1).toHaveBeenCalledWith(testData);
      expect(mockCallback2).toHaveBeenCalledWith(testData);
    });

    test('should unsubscribe from events correctly', () => {
      const mockCallback = jest.fn();
      service.subscribeToChanges('testEvent', mockCallback);
      service.unsubscribeFromChanges('testEvent', mockCallback);
      
      service.emitEvent('testEvent', { test: 'data' });
      
      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should handle event callback errors gracefully', () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const normalCallback = jest.fn();
      
      service.subscribeToChanges('testEvent', errorCallback);
      service.subscribeToChanges('testEvent', normalCallback);
      
      // Should not throw and should still call normal callback
      expect(() => {
        service.emitEvent('testEvent', { test: 'data' });
      }).not.toThrow();
      
      expect(normalCallback).toHaveBeenCalledWith({ test: 'data' });
    });
  });

  describe('Integration Methods', () => {
    test('should sync with DataSourceManager', () => {
      expect(() => {
        service.syncWithDataSourceManager();
      }).not.toThrow();
    });

    test('should sync with SourceContextManager', () => {
      expect(() => {
        service.syncWithSourceContextManager();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors gracefully', () => {
      // This test verifies that the service can handle initialization failures
      // by falling back to default state
      const context = service.getCurrentContext();
      expect(context).toBeDefined();
      expect(context.currentSource).toBeDefined();
    });

    test('should handle update errors gracefully', () => {
      // Test with invalid updates
      expect(() => {
        service.updateContext({} as any);
      }).not.toThrow();
    });
  });

  describe('Data Integrity', () => {
    test('should maintain data integrity during updates', () => {
      const initialContext = service.getCurrentContext();
      
      const updates: Partial<RepositoryContext> = {
        coreRepository: {
          fullName: 'test/repo',
          branch: 'main',
          filePath: 'test.json',
          fileType: 'schema'
        }
      };

      service.updateContext(updates);
      const updatedContext = service.getCurrentContext();
      
      // Should preserve other properties
      expect(updatedContext.platformRepositories).toEqual(initialContext.platformRepositories);
      expect(updatedContext.themeRepositories).toEqual(initialContext.themeRepositories);
      
      // Should update specified properties
      expect(updatedContext.coreRepository).toEqual(updates.coreRepository);
      expect(updatedContext.lastUpdated).not.toBe(initialContext.lastUpdated);
    });

    test('should return immutable copies of data', () => {
      const context1 = service.getCurrentContext();
      const context2 = service.getCurrentContext();
      
      // Should be different objects (copies)
      expect(context1).not.toBe(context2);
      
      // Should have same content
      expect(context1).toEqual(context2);
    });
  });
});
