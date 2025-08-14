import { RepositoryContextService } from '../repositoryContextService';
import { DataSourceManager } from '../dataSourceManager';
import { SourceContextManager } from '../sourceContextManager';

// Mock the services to avoid circular dependencies
jest.mock('../dataSourceManager');
jest.mock('../sourceContextManager');

describe('RepositoryContextService Integration', () => {
  let repositoryContextService: RepositoryContextService;
  let mockDataSourceManager: jest.Mocked<DataSourceManager>;
  let mockSourceContextManager: jest.Mocked<SourceContextManager>;

  beforeEach(() => {
    // Reset the singleton instance
    (RepositoryContextService as any).instance = undefined;
    
    // Setup mocks
    mockDataSourceManager = {
      getCurrentContext: jest.fn().mockReturnValue({
        currentPlatform: null,
        currentTheme: null,
        availablePlatforms: [],
        availableThemes: [],
        permissions: { core: false, platforms: {}, themes: {} },
        repositories: {
          core: {
            fullName: 'test/core-repo',
            branch: 'main',
            filePath: 'core.json',
            fileType: 'schema'
          },
          platforms: {},
          themes: {}
        },
        editMode: {
          isActive: false,
          sourceType: 'core',
          sourceId: null,
          targetRepository: null,
          validationSchema: 'schema'
        },
        viewMode: {
          isMerged: false,
          mergeSources: ['core'],
          displayData: 'core-only'
        },
        platformSyntaxPatterns: {}
      })
    } as any;

    mockSourceContextManager = {
      getContext: jest.fn().mockReturnValue({
        sourceType: 'core',
        sourceId: null,
        sourceName: null,
        repositoryInfo: {
          fullName: 'test/core-repo',
          branch: 'main',
          filePath: 'core.json',
          fileType: 'schema'
        },
        schemaType: 'schema'
      })
    } as any;

    (DataSourceManager.getInstance as jest.Mock).mockReturnValue(mockDataSourceManager);
    (SourceContextManager.getInstance as jest.Mock).mockReturnValue(mockSourceContextManager);

    repositoryContextService = RepositoryContextService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Integration', () => {
    test('DataSourceManager should sync with RepositoryContextService', async () => {
      // Simulate platform switching
      const platformContext = {
        currentPlatform: 'test-platform',
        currentTheme: null,
        availablePlatforms: [{ id: 'test-platform', displayName: 'Test Platform' }],
        availableThemes: [],
        permissions: { core: false, platforms: { 'test-platform': true }, themes: {} },
        repositories: {
          core: {
            fullName: 'test/core-repo',
            branch: 'main',
            filePath: 'core.json',
            fileType: 'schema'
          },
          platforms: {
            'test-platform': {
              fullName: 'test/platform-repo',
              branch: 'main',
              filePath: 'platform-extension.json',
              fileType: 'platform-extension'
            }
          },
          themes: {}
        },
        editMode: {
          isActive: false,
          sourceType: 'platform-extension',
          sourceId: 'test-platform',
          targetRepository: {
            fullName: 'test/platform-repo',
            branch: 'main',
            filePath: 'platform-extension.json',
            fileType: 'platform-extension'
          },
          validationSchema: 'platform-extension'
        },
        viewMode: {
          isMerged: true,
          mergeSources: ['core', 'platform-extension'],
          displayData: 'platform-only'
        },
        platformSyntaxPatterns: {}
      };

      mockDataSourceManager.getCurrentContext.mockReturnValue(platformContext);

      // Sync with DataSourceManager
      repositoryContextService.syncWithDataSourceManager();

      // Verify the context was updated
      const context = repositoryContextService.getCurrentContext();
      expect(context.currentSource.sourceType).toBe('platform-extension');
      expect(context.currentSource.sourceId).toBe('test-platform');
      expect(context.platformRepositories['test-platform']).toEqual(platformContext.repositories.platforms['test-platform']);
    });

    test('GitHubSaveDialog should get correct repository info', () => {
      // Set up test context for platform extension
      const platformRepoInfo = {
        fullName: 'test/platform-repo',
        branch: 'main',
        filePath: 'platform-extension.json',
        fileType: 'platform-extension' as const
      };

      repositoryContextService.updateSourceContext({
        sourceType: 'platform-extension',
        sourceId: 'test-platform',
        sourceName: 'Test Platform',
        repositoryInfo: platformRepoInfo,
        schemaType: 'platform-extension'
      });

      // Verify save dialog would get correct info
      const repoInfo = repositoryContextService.getRepositoryInfo();
      expect(repoInfo).toEqual(platformRepoInfo);
      expect(repoInfo?.fileType).toBe('platform-extension');
      expect(repoInfo?.fullName).toBe('test/platform-repo');
    });

    test('Context should be consistent across all services', () => {
      // Update context through RepositoryContextService
      const testRepoInfo = {
        fullName: 'test/consistent-repo',
        branch: 'main',
        filePath: 'test.json',
        fileType: 'schema' as const
      };

      repositoryContextService.updateSourceContext({
        sourceType: 'core',
        sourceId: null,
        sourceName: null,
        repositoryInfo: testRepoInfo,
        schemaType: 'schema'
      });

      // Verify context is consistent
      const context = repositoryContextService.getCurrentContext();
      const sourceContext = repositoryContextService.getCurrentSourceContext();
      const repoInfo = repositoryContextService.getRepositoryInfo();

      expect(context.currentSource.repositoryInfo).toEqual(testRepoInfo);
      expect(sourceContext.repositoryInfo).toEqual(testRepoInfo);
      expect(repoInfo).toEqual(testRepoInfo);
    });
  });

  describe('Event-Driven Updates', () => {
    test('should notify listeners when context changes', () => {
      const mockCallback = jest.fn();
      repositoryContextService.subscribeToChanges('contextUpdated', mockCallback);

      // Update context
      repositoryContextService.updateSourceContext({
        sourceType: 'platform-extension',
        sourceId: 'test-platform'
      });

      expect(mockCallback).toHaveBeenCalled();
      const callData = mockCallback.mock.calls[0][0];
      expect(callData.currentSource.sourceType).toBe('platform-extension');
      expect(callData.currentSource.sourceId).toBe('test-platform');
    });

    test('should notify listeners when source context changes', () => {
      const mockCallback = jest.fn();
      repositoryContextService.subscribeToChanges('sourceContextUpdated', mockCallback);

      // Update source context
      repositoryContextService.updateSourceContext({
        sourceType: 'theme-override',
        sourceId: 'test-theme'
      });

      expect(mockCallback).toHaveBeenCalled();
      const callData = mockCallback.mock.calls[0][0];
      expect(callData.sourceType).toBe('theme-override');
      expect(callData.sourceId).toBe('test-theme');
    });

    test('should notify listeners when edit mode changes', () => {
      const mockCallback = jest.fn();
      repositoryContextService.subscribeToChanges('editModeUpdated', mockCallback);

      // Set edit mode
      const editMode = {
        isActive: true,
        sourceType: 'platform-extension' as const,
        sourceId: 'test-platform',
        targetRepository: {
          fullName: 'test/platform-repo',
          branch: 'main',
          filePath: 'platform-extension.json',
          fileType: 'platform-extension'
        }
      };

      repositoryContextService.setEditMode(editMode);

      expect(mockCallback).toHaveBeenCalledWith(editMode);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle DataSourceManager sync errors gracefully', () => {
      mockDataSourceManager.getCurrentContext.mockImplementation(() => {
        throw new Error('DataSourceManager error');
      });

      expect(() => {
        repositoryContextService.syncWithDataSourceManager();
      }).not.toThrow();
    });

    test('should handle SourceContextManager sync errors gracefully', () => {
      mockSourceContextManager.getContext.mockImplementation(() => {
        throw new Error('SourceContextManager error');
      });

      expect(() => {
        repositoryContextService.syncWithSourceContextManager();
      }).not.toThrow();
    });

    test('should maintain valid state after errors', () => {
      // Force an error during sync
      mockDataSourceManager.getCurrentContext.mockImplementation(() => {
        throw new Error('Test error');
      });

      repositoryContextService.syncWithDataSourceManager();

      // Should still have valid state
      const context = repositoryContextService.getCurrentContext();
      expect(context).toBeDefined();
      expect(context.currentSource).toBeDefined();
      expect(context.currentSource.sourceType).toBe('core');
    });
  });

  describe('Performance and Memory', () => {
    test('should not create memory leaks with event listeners', () => {
      const mockCallback = jest.fn();
      
      // Add and remove listeners multiple times
      for (let i = 0; i < 10; i++) {
        repositoryContextService.subscribeToChanges('testEvent', mockCallback);
        repositoryContextService.unsubscribeFromChanges('testEvent', mockCallback);
      }

      // Should still work correctly
      repositoryContextService.subscribeToChanges('testEvent', mockCallback);
      repositoryContextService.emitEvent('testEvent', { test: 'data' });
      
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    test('should handle large numbers of event listeners', () => {
      const listeners = Array.from({ length: 100 }, (_, i) => jest.fn());
      
      // Add many listeners
      listeners.forEach(listener => {
        repositoryContextService.subscribeToChanges('testEvent', listener);
      });

      // Emit event
      repositoryContextService.emitEvent('testEvent', { test: 'data' });

      // All listeners should be called
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledWith({ test: 'data' });
      });

      // Clean up
      listeners.forEach(listener => {
        repositoryContextService.unsubscribeFromChanges('testEvent', listener);
      });
    });
  });
});
