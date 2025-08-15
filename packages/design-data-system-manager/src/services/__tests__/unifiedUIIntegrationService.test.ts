import { UnifiedUIIntegrationService, UIIntegrationError, type UIUpdateEvent, type UIComponentType, type DataAccessPattern } from '../unifiedUIIntegrationService';
import { dataFlowController } from '../dataFlowController';
import { unifiedChangeTrackingService } from '../unifiedChangeTrackingService';
import { unifiedStorageService } from '../unifiedStorageService';
import { dataValidationService } from '../dataValidationService';
import { DataManager } from '../dataManager';
import { StorageService } from '../storage';
import type { TokenSystem, Token, TokenCollection, Dimension, Platform, Theme, Taxonomy, Component, DataSnapshot } from '@token-model/data-model';

// Mock services
jest.mock('../dataFlowController');
jest.mock('../unifiedChangeTrackingService');
jest.mock('../unifiedStorageService');
jest.mock('../dataValidationService');
jest.mock('../dataManager');
jest.mock('../storage');

const mockDataFlowController = dataFlowController as jest.Mocked<typeof dataFlowController>;
const mockUnifiedChangeTrackingService = unifiedChangeTrackingService as jest.Mocked<typeof unifiedChangeTrackingService>;
const mockUnifiedStorageService = unifiedStorageService as jest.Mocked<typeof unifiedStorageService>;
const mockDataValidationService = dataValidationService as jest.Mocked<typeof dataValidationService>;
const mockDataManager = DataManager as jest.MockedClass<typeof DataManager>;
const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;

// Mock environment variable
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.REACT_APP_UNIFIED_UI_INTEGRATION_ENABLED = 'true';
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
  // Clear singleton instance
  (UnifiedUIIntegrationService as any).instance = undefined;
});

describe('UnifiedUIIntegrationService', () => {
  let service: UnifiedUIIntegrationService;
  let mockDataManagerInstance: any;

  beforeEach(() => {
    // Setup mock instances
    mockDataManagerInstance = {
      loadFromStorage: jest.fn()
    };
    mockDataManager.getInstance.mockReturnValue(mockDataManagerInstance);

    // Setup default mock implementations
    mockDataFlowController.addEventListener.mockImplementation(() => {});
    mockDataFlowController.removeEventListener.mockImplementation(() => {});
    mockDataFlowController.executeOperation.mockResolvedValue({});
    
    mockUnifiedChangeTrackingService.isEnabled.mockReturnValue(false);
    mockUnifiedChangeTrackingService.addEventListener.mockImplementation(() => {});
    mockUnifiedChangeTrackingService.removeEventListener.mockImplementation(() => {});
    mockUnifiedChangeTrackingService.trackChange.mockImplementation(() => {});
    
    mockUnifiedStorageService.isEnabled.mockReturnValue(false);
    mockDataValidationService.validateTokenSystem.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      validationTime: 0,
      timestamp: new Date().toISOString()
    });
    mockDataValidationService.validatePlatformExtension.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      validationTime: 0,
      timestamp: new Date().toISOString()
    });
    mockDataValidationService.validateThemeOverrideFile.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      validationTime: 0,
      timestamp: new Date().toISOString()
    });

    mockStorageService.getLocalEdits.mockReturnValue(null);

    service = UnifiedUIIntegrationService.getInstance();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = UnifiedUIIntegrationService.getInstance();
      const instance2 = UnifiedUIIntegrationService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should check feature flag correctly', () => {
      expect(UnifiedUIIntegrationService.isEnabled()).toBe(true);
      
      process.env.REACT_APP_UNIFIED_UI_INTEGRATION_ENABLED = 'false';
      (UnifiedUIIntegrationService as any).instance = undefined;
      const newService = UnifiedUIIntegrationService.getInstance();
      expect(UnifiedUIIntegrationService.isEnabled()).toBe(false);
    });

    it('should configure options', () => {
      const options = {
        enableReactiveUpdates: false,
        cacheTimeout: 60000
      };
      
      service.configure(options);
      
      // Verify configuration was applied by checking behavior
      const stats = service.getStatistics();
      expect(stats.options.enableReactiveUpdates).toBe(false);
      expect(stats.options.cacheTimeout).toBe(60000);
    });

    it('should setup event listeners on initialization', () => {
      expect(mockDataFlowController.addEventListener).toHaveBeenCalled();
      expect(mockUnifiedChangeTrackingService.addEventListener).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should add and remove event listeners', () => {
      const listener = jest.fn();
      
      service.addEventListener(listener);
      expect(service.getStatistics().eventListeners).toBe(1);
      
      service.removeEventListener(listener);
      expect(service.getStatistics().eventListeners).toBe(0);
    });

    it('should emit events to listeners', () => {
      const listener = jest.fn();
      service.addEventListener(listener);
      
      // Trigger an event by getting data
      service.getDataForComponent('TokenView', 'read-only');
      
      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as UIUpdateEvent;
      expect(event.type).toBe('data-changed');
    });
  });

  describe('Data Access', () => {
    const mockSnapshot: DataSnapshot = {
      collections: [],
      modes: [],
      dimensions: [],
      resolvedValueTypes: [],
      platforms: [],
      themes: [],
      tokens: [
        { id: 'token1', displayName: 'Token 1', valuesByMode: [] },
        { id: 'token2', displayName: 'Token 2', valuesByMode: [] }
      ],
      taxonomies: [],
      componentProperties: [],
      componentCategories: [],
      components: [],
      algorithms: [],
      taxonomyOrder: [],
      dimensionOrder: [],
      algorithmFile: null,
      linkedRepositories: {},
      platformExtensions: {},
      themeOverrides: {},
      figmaConfiguration: null
    };

    beforeEach(() => {
      mockDataManagerInstance.loadFromStorage.mockReturnValue(mockSnapshot);
    });

    it('should get token data for read-only pattern', async () => {
      const data = await service.getDataForComponent('TokenView', 'read-only');
      
      expect(data).toEqual(mockSnapshot.tokens);
      expect(mockDataManagerInstance.loadFromStorage).toHaveBeenCalled();
    });

    it('should get token data for editable pattern with local edits', async () => {
      const localEdits = {
        tokens: [
          { id: 'token1', displayName: 'Token 1 Modified', valuesByMode: [] }
        ]
      };
      mockStorageService.getLocalEdits.mockReturnValue(localEdits);
      
      const data = await service.getDataForComponent('TokenEditor', 'editable');
      
      expect(data).toEqual(localEdits.tokens);
    });

    it('should get collection data', async () => {
      const data = await service.getDataForComponent('CollectionView', 'read-only');
      
      expect(data).toEqual(mockSnapshot.collections);
    });

    it('should get dimension data', async () => {
      const data = await service.getDataForComponent('DimensionView', 'read-only');
      
      expect(data).toEqual(mockSnapshot.dimensions);
    });

    it('should get platform data', async () => {
      const data = await service.getDataForComponent('PlatformView', 'read-only');
      
      expect(data).toEqual(mockSnapshot.platforms);
    });

    it('should get theme data', async () => {
      const data = await service.getDataForComponent('ThemeView', 'read-only');
      
      expect(data).toEqual(mockSnapshot.themes);
    });

    it('should get taxonomy data', async () => {
      const data = await service.getDataForComponent('TaxonomyView', 'read-only');
      
      expect(data).toEqual(mockSnapshot.taxonomies);
    });

    it('should get component data', async () => {
      const data = await service.getDataForComponent('ComponentView', 'read-only');
      
      expect(data).toEqual(mockSnapshot.components);
    });

    it('should get analysis data', async () => {
      const data = await service.getDataForComponent('AnalysisView', 'read-only');
      
      expect(data).toHaveProperty('tokens');
      expect(data).toHaveProperty('collections');
      expect(data).toHaveProperty('statistics');
      expect((data as any).statistics.totalTokens).toBe(2);
    });

    it('should get dashboard data', async () => {
      const data = await service.getDataForComponent('DashboardView', 'read-only');
      
      expect(data).toHaveProperty('tokens');
      expect(data).toHaveProperty('collections');
      expect(data).toHaveProperty('statistics');
    });

    it('should get Figma config data', async () => {
      const data = await service.getDataForComponent('FigmaConfigView', 'read-only');
      
      expect(data).toEqual({});
    });

    it('should throw error for unknown component type', async () => {
      await expect(
        service.getDataForComponent('UnknownView' as UIComponentType, 'read-only')
      ).rejects.toThrow(UIIntegrationError);
    });

    it('should use data flow controller for non-read-only patterns', async () => {
      await service.getDataForComponent('TokenView', 'merge');
      
      expect(mockDataFlowController.executeOperation).toHaveBeenCalledWith('load');
    });
  });

  describe('Data Filtering', () => {
    const mockTokens: Token[] = [
      { id: 'token1', displayName: 'Token 1', valuesByMode: [] },
      { id: 'token2', displayName: 'Token 2', valuesByMode: [] }
    ];

    it('should filter tokens by ID', async () => {
      mockDataManagerInstance.loadFromStorage.mockReturnValue({
        ...mockSnapshot,
        tokens: mockTokens
      });

      const data = await service.getDataForComponent('TokenView', 'read-only', {
        filters: { id: 'token1' }
      });
      
      expect(data).toHaveLength(1);
      expect((data as Token[])[0].id).toBe('token1');
    });

    it('should filter tokens by display name', async () => {
      mockDataManagerInstance.loadFromStorage.mockReturnValue({
        ...mockSnapshot,
        tokens: mockTokens
      });

      const data = await service.getDataForComponent('TokenView', 'read-only', {
        filters: { displayName: 'Token 2' }
      });
      
      expect(data).toHaveLength(1);
      expect((data as Token[])[0].displayName).toBe('Token 2');
    });
  });

  describe('Data Updates', () => {
    it('should update data for component', async () => {
      const tokenData = { id: 'token1', displayName: 'Updated Token', valuesByMode: [] };
      
      await service.updateDataForComponent('TokenEditor', 'editable', tokenData);
      
      // Should emit events
      expect(mockUnifiedChangeTrackingService.trackChange).toHaveBeenCalled();
    });

    it('should validate data before update', async () => {
      mockDataValidationService.validateTokenSystem.mockReturnValue({
        isValid: false,
        errors: ['Validation error'],
        warnings: [],
        validationTime: 0,
        timestamp: new Date().toISOString()
      });

      const tokenData = { id: 'token1', displayName: 'Invalid Token', valuesByMode: [] };
      
      await expect(
        service.updateDataForComponent('TokenEditor', 'editable', tokenData)
      ).rejects.toThrow(UIIntegrationError);
    });

    it('should skip validation when disabled', async () => {
      service.configure({ enableValidation: false });
      
      const tokenData = { id: 'token1', displayName: 'Token', valuesByMode: [] };
      
      await expect(
        service.updateDataForComponent('TokenEditor', 'editable', tokenData)
      ).resolves.not.toThrow();
    });

    it('should apply optimistic updates', async () => {
      const listener = jest.fn();
      service.addEventListener(listener);
      
      const tokenData = { id: 'token1', displayName: 'Token', valuesByMode: [] };
      
      await service.updateDataForComponent('TokenEditor', 'editable', tokenData);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'data-changed',
          componentType: 'TokenEditor'
        })
      );
    });

    it('should skip optimistic updates when disabled', async () => {
      service.configure({ enableOptimisticUpdates: false });
      
      const listener = jest.fn();
      service.addEventListener(listener);
      
      const tokenData = { id: 'token1', displayName: 'Token', valuesByMode: [] };
      
      await service.updateDataForComponent('TokenEditor', 'editable', tokenData);
      
      // Should not emit data-changed event for optimistic update
      const dataChangedEvents = listener.mock.calls.filter(
        call => (call[0] as UIUpdateEvent).type === 'data-changed'
      );
      expect(dataChangedEvents).toHaveLength(0);
    });
  });

  describe('Loading States', () => {
    it('should set loading state when getting data', async () => {
      service.configure({ enableLoadingStates: true });
      
      const listener = jest.fn();
      service.addEventListener(listener);
      
      service.getDataForComponent('TokenView', 'read-only');
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'loading-started',
          componentType: 'TokenView',
          loading: true
        })
      );
    });

    it('should clear loading state after data fetch', async () => {
      service.configure({ enableLoadingStates: true });
      
      const listener = jest.fn();
      service.addEventListener(listener);
      
      await service.getDataForComponent('TokenView', 'read-only');
      
      const loadingCompletedEvents = listener.mock.calls.filter(
        call => (call[0] as UIUpdateEvent).type === 'loading-completed'
      );
      expect(loadingCompletedEvents.length).toBeGreaterThan(0);
    });

    it('should get loading state for component', () => {
      service.configure({ enableLoadingStates: true });
      
      // Initially not loading
      expect(service.getLoadingState('TokenView')).toBe(false);
      
      // Set loading state
      service.getDataForComponent('TokenView', 'read-only');
      
      // Should be loading
      expect(service.getLoadingState('TokenView')).toBe(true);
    });
  });

  describe('Caching', () => {
    it('should cache data after fetching', async () => {
      const data = await service.getDataForComponent('TokenView', 'read-only');
      
      const stats = service.getStatistics();
      expect(stats.cacheSize).toBeGreaterThan(0);
    });

    it('should return cached data when available', async () => {
      // First call to populate cache
      await service.getDataForComponent('TokenView', 'read-only');
      
      // Second call should use cache
      const data = await service.getDataForComponent('TokenView', 'read-only');
      
      expect(data).toBeDefined();
    });

    it('should force refresh when requested', async () => {
      // First call to populate cache
      await service.getDataForComponent('TokenView', 'read-only');
      
      // Second call with force refresh
      await service.getDataForComponent('TokenView', 'read-only', { forceRefresh: true });
      
      // Should have called loadFromStorage twice
      expect(mockDataManagerInstance.loadFromStorage).toHaveBeenCalledTimes(2);
    });

    it('should clear cache', () => {
      service.clearCache();
      
      const stats = service.getStatistics();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle data fetch errors', async () => {
      mockDataManagerInstance.loadFromStorage.mockImplementation(() => {
        throw new Error('Data fetch failed');
      });

      const listener = jest.fn();
      service.addEventListener(listener);
      
      await expect(
        service.getDataForComponent('TokenView', 'read-only')
      ).rejects.toThrow(UIIntegrationError);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error-occurred',
          componentType: 'TokenView',
          error: 'Data fetch failed'
        })
      );
    });

    it('should handle data update errors', async () => {
      mockDataValidationService.validateTokenSystem.mockReturnValue({
        isValid: false,
        errors: ['Validation failed'],
        warnings: [],
        validationTime: 0,
        timestamp: new Date().toISOString()
      });

      const listener = jest.fn();
      service.addEventListener(listener);
      
      const tokenData = { id: 'token1', displayName: 'Token', valuesByMode: [] };
      
      await expect(
        service.updateDataForComponent('TokenEditor', 'editable', tokenData)
      ).rejects.toThrow(UIIntegrationError);
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error-occurred',
          componentType: 'TokenEditor'
        })
      );
    });

    it('should handle event listener errors gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      service.addEventListener(errorListener);
      
      // Should not throw error, just log it
      expect(() => {
        service.getDataForComponent('TokenView', 'read-only');
      }).not.toThrow();
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', () => {
      const stats = service.getStatistics();
      
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('loadingComponents');
      expect(stats).toHaveProperty('eventListeners');
      expect(stats).toHaveProperty('options');
    });

    it('should track loading components', () => {
      service.configure({ enableLoadingStates: true });
      
      service.getDataForComponent('TokenView', 'read-only');
      service.getDataForComponent('CollectionView', 'read-only');
      
      const stats = service.getStatistics();
      expect(stats.loadingComponents).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', () => {
      service.cleanup();
      
      expect(mockDataFlowController.removeEventListener).toHaveBeenCalled();
      expect(mockUnifiedChangeTrackingService.removeEventListener).toHaveBeenCalled();
      
      const stats = service.getStatistics();
      expect(stats.eventListeners).toBe(0);
      expect(stats.cacheSize).toBe(0);
    });

    it('should reset service state', () => {
      // Add some state
      service.getDataForComponent('TokenView', 'read-only');
      
      service.reset();
      
      const stats = service.getStatistics();
      expect(stats.cacheSize).toBe(0);
      expect(stats.loadingComponents).toBe(0);
    });
  });

  describe('Component Type Mapping', () => {
    it('should map component types to data types correctly', async () => {
      const testCases: Array<{ componentType: UIComponentType; expectedDataType: string }> = [
        { componentType: 'TokenView', expectedDataType: 'Token' },
        { componentType: 'TokenEditor', expectedDataType: 'Token' },
        { componentType: 'CollectionView', expectedDataType: 'TokenCollection' },
        { componentType: 'DimensionView', expectedDataType: 'Dimension' },
        { componentType: 'PlatformView', expectedDataType: 'Platform' },
        { componentType: 'ThemeView', expectedDataType: 'Theme' },
        { componentType: 'TaxonomyView', expectedDataType: 'Taxonomy' },
        { componentType: 'ComponentView', expectedDataType: 'Component' }
      ];

      for (const testCase of testCases) {
        const tokenData = { id: 'test', displayName: 'Test', valuesByMode: [] };
        
        // This will trigger the mapping internally
        await service.updateDataForComponent(testCase.componentType, 'editable', tokenData);
        
        // Verify the correct data type was used for validation
        expect(mockDataValidationService.validateTokenSystem).toHaveBeenCalled();
      }
    });
  });
});
