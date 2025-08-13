import { DataFlowController, DataFlowError, type DataFlowEvent, type DataFlowState } from '../dataFlowController';
import { unifiedStorageService } from '../unifiedStorageService';
import { dataValidationService } from '../dataValidationService';
import { dataMigrationService } from '../dataMigrationService';
import { DataManager } from '../dataManager';
import { DataSourceManager } from '../dataSourceManager';
import { StorageService } from '../storage';
import type { TokenSystem, DataSnapshot } from '@token-model/data-model';

// Mock services
jest.mock('../unifiedStorageService');
jest.mock('../dataValidationService');
jest.mock('../dataMigrationService');
jest.mock('../dataManager');
jest.mock('../dataSourceManager');
jest.mock('../storage');

const mockUnifiedStorageService = unifiedStorageService as jest.Mocked<typeof unifiedStorageService>;
const mockDataValidationService = dataValidationService as jest.Mocked<typeof dataValidationService>;
const mockDataMigrationService = dataMigrationService as jest.Mocked<typeof dataMigrationService>;
const mockDataManager = DataManager as jest.MockedClass<typeof DataManager>;
const mockDataSourceManager = DataSourceManager as jest.MockedClass<typeof DataSourceManager>;
const mockStorageService = StorageService as jest.Mocked<typeof StorageService>;

// Mock environment variable
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.REACT_APP_DATA_FLOW_CONTROLLER_ENABLED = 'true';
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
  // Clear singleton instance
  (DataFlowController as any).instance = undefined;
});

describe('DataFlowController', () => {
  let controller: DataFlowController;
  let mockDataManagerInstance: any;
  let mockDataSourceManagerInstance: any;

  beforeEach(() => {
    // Setup mock instances
    mockDataManagerInstance = {
      loadFromStorage: jest.fn(),
      getCurrentData: jest.fn(),
      saveToStorage: jest.fn(),
      refreshData: jest.fn()
    };
    mockDataManager.getInstance.mockReturnValue(mockDataManagerInstance);

    mockDataSourceManagerInstance = {
      getCurrentContext: jest.fn().mockReturnValue({
        currentPlatform: 'none',
        currentTheme: 'none'
      })
    };
    mockDataSourceManager.getInstance.mockReturnValue(mockDataSourceManagerInstance);

    // Setup default mock implementations
    mockUnifiedStorageService.isEnabled.mockReturnValue(false);
    mockDataValidationService.validateTokenSystem.mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      validationTime: 0,
      timestamp: new Date().toISOString()
    });
    mockDataMigrationService.isMigrationNeeded.mockReturnValue(false);
    mockStorageService.getModes.mockReturnValue([]);
    mockStorageService.getDimensionOrder.mockReturnValue([]);
    mockStorageService.getAlgorithms.mockReturnValue([]);
    mockStorageService.getAlgorithmFile.mockReturnValue(null);
    mockStorageService.getLinkedRepositories.mockReturnValue({});
    mockStorageService.getPlatformExtensions.mockReturnValue({});
    mockStorageService.getThemeOverrides.mockReturnValue({});
    mockStorageService.getLocalEdits.mockReturnValue(null);
    mockStorageService.clearLocalEdits.mockImplementation(() => {});

    controller = DataFlowController.getInstance();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = DataFlowController.getInstance();
      const instance2 = DataFlowController.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should check feature flag correctly', () => {
      expect(DataFlowController.isEnabled()).toBe(true);
      
      process.env.REACT_APP_DATA_FLOW_CONTROLLER_ENABLED = 'false';
      (DataFlowController as any).instance = undefined;
      const newController = DataFlowController.getInstance();
      expect(DataFlowController.isEnabled()).toBe(false);
    });

    it('should initialize with default state', () => {
      const state = controller.getCurrentState();
      expect(state.operation).toBe('load');
      expect(state.status).toBe('idle');
      expect(state.progress).toBe(0);
      expect(state.message).toBe('Data flow controller initialized');
    });
  });

  describe('Event Handling', () => {
    it('should add and remove event listeners', () => {
      const listener = jest.fn();
      
      controller.addEventListener(listener);
      expect(controller.getOperationStats().listenerCount).toBe(1);
      
      controller.removeEventListener(listener);
      expect(controller.getOperationStats().listenerCount).toBe(0);
    });

    it('should emit events to listeners', () => {
      const listener = jest.fn();
      controller.addEventListener(listener);
      
      // Trigger a state change by executing an operation
      controller.executeOperation('validate');
      
      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as DataFlowEvent;
      expect(event.type).toBe('state-change');
    });
  });

  describe('Operation Execution', () => {
    it('should execute load operation successfully', async () => {
      const mockSnapshot: DataSnapshot = {
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        tokens: [],
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
      
      mockDataManagerInstance.loadFromStorage.mockReturnValue(mockSnapshot);

      const result = await controller.executeOperation('load');
      expect(result).toEqual(mockSnapshot);
    });

    it('should execute save operation successfully', async () => {
      const mockTokenSystem: TokenSystem = {
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
      
      mockDataManagerInstance.getCurrentData.mockReturnValue(mockTokenSystem);

      await controller.executeOperation('save');
      expect(mockDataManagerInstance.saveToStorage).toHaveBeenCalled();
    });

    it('should execute validate operation successfully', async () => {
      const mockTokenSystem: TokenSystem = {
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
      
      mockDataManagerInstance.getCurrentData.mockReturnValue(mockTokenSystem);

      const result = await controller.executeOperation('validate');
      expect(mockDataValidationService.validateTokenSystem).toHaveBeenCalledWith(mockTokenSystem);
    });

    it('should execute migrate operation successfully', async () => {
      const mockMigrationResult = {
        success: true,
        completedSteps: ['step1'],
        failedSteps: [],
        errors: [],
        warnings: [],
        rollbackRequired: false
      };
      
      mockDataMigrationService.performMigration.mockResolvedValue(mockMigrationResult);

      const result = await controller.executeOperation('migrate');
      expect(result).toEqual(mockMigrationResult);
    });

    it('should execute refresh operation successfully', async () => {
      const mockSnapshot: DataSnapshot = {
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        tokens: [],
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
      
      mockDataManagerInstance.loadFromStorage.mockReturnValue(mockSnapshot);

      const result = await controller.executeOperation('refresh');
      expect(mockDataManagerInstance.refreshData).toHaveBeenCalled();
      expect(result).toEqual(mockSnapshot);
    });

    it('should execute commit operation successfully', async () => {
      const mockTokenSystem: TokenSystem = {
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
      
      mockDataManagerInstance.getCurrentData.mockReturnValue(mockTokenSystem);

      await controller.executeOperation('commit');
      expect(mockDataManagerInstance.saveToStorage).toHaveBeenCalled();
    });

    it('should execute rollback operation successfully', async () => {
      const mockSnapshot: DataSnapshot = {
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        tokens: [],
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
      
      mockDataManagerInstance.loadFromStorage.mockReturnValue(mockSnapshot);

      await controller.executeOperation('rollback');
      expect(mockStorageService.clearLocalEdits).toHaveBeenCalled();
      expect(mockDataManagerInstance.refreshData).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle load operation errors', async () => {
      mockDataManagerInstance.loadFromStorage.mockImplementation(() => {
        throw new Error('Load failed');
      });

      await expect(controller.executeOperation('load')).rejects.toThrow(DataFlowError);
    });

    it('should handle validation errors', async () => {
      const mockTokenSystem: TokenSystem = {
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
      
      mockDataManagerInstance.getCurrentData.mockReturnValue(mockTokenSystem);
      mockDataValidationService.validateTokenSystem.mockReturnValue({
        isValid: false,
        errors: ['Validation error'],
        warnings: [],
        validationTime: 0,
        timestamp: new Date().toISOString()
      });

      await expect(controller.executeOperation('save')).rejects.toThrow(DataFlowError);
    });

    it('should handle migration errors', async () => {
      mockDataMigrationService.isMigrationNeeded.mockReturnValue(true);
      mockDataMigrationService.performMigration.mockResolvedValue({
        success: false,
        completedSteps: [],
        failedSteps: ['migration'],
        errors: ['Migration failed'],
        warnings: [],
        rollbackRequired: true
      });

      await expect(controller.executeOperation('load')).rejects.toThrow(DataFlowError);
    });

    it('should handle unknown operations', async () => {
      await expect(controller.executeOperation('unknown' as any)).rejects.toThrow(DataFlowError);
    });
  });

  describe('State Management', () => {
    it('should update state during operation execution', async () => {
      const mockSnapshot: DataSnapshot = {
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        tokens: [],
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
      
      mockDataManagerInstance.loadFromStorage.mockReturnValue(mockSnapshot);

      const stateChanges: DataFlowState[] = [];
      const listener = (event: DataFlowEvent) => {
        if (event.type === 'state-change') {
          stateChanges.push(event.state);
        }
      };
      
      controller.addEventListener(listener);
      await controller.executeOperation('load');

      expect(stateChanges.length).toBeGreaterThan(0);
      expect(stateChanges[stateChanges.length - 1].status).toBe('success');
    });

    it('should handle operation queue', async () => {
      const mockSnapshot: DataSnapshot = {
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        tokens: [],
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
      
      mockDataManagerInstance.loadFromStorage.mockReturnValue(mockSnapshot);

      // Queue multiple operations
      const promises = [
        controller.executeOperation('load'),
        controller.executeOperation('validate'),
        controller.executeOperation('refresh')
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
    });
  });

  describe('Operation Statistics', () => {
    it('should return operation statistics', () => {
      const stats = controller.getOperationStats();
      expect(stats).toHaveProperty('queueLength');
      expect(stats).toHaveProperty('isProcessing');
      expect(stats).toHaveProperty('currentState');
      expect(stats).toHaveProperty('listenerCount');
    });

    it('should clear operation queue', () => {
      controller.clearQueue();
      const stats = controller.getOperationStats();
      expect(stats.queueLength).toBe(0);
    });

    it('should reset controller state', () => {
      controller.reset();
      const state = controller.getCurrentState();
      expect(state.status).toBe('idle');
      expect(state.progress).toBe(0);
    });
  });

  describe('Unified Storage Integration', () => {
    it('should use unified storage when enabled', async () => {
      mockUnifiedStorageService.isEnabled.mockReturnValue(true);
      
      const mockTokenSystem: TokenSystem = {
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
      
      mockUnifiedStorageService.getData.mockReturnValue(mockTokenSystem);

      await controller.executeOperation('load');
      expect(mockUnifiedStorageService.getData).toHaveBeenCalled();
    });
  });

  describe('Data Flow Options', () => {
    it('should respect enableValidation option', async () => {
      const mockTokenSystem: TokenSystem = {
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
      
      mockDataManagerInstance.getCurrentData.mockReturnValue(mockTokenSystem);

      await controller.executeOperation('save', { enableValidation: false });
      expect(mockDataValidationService.validateTokenSystem).not.toHaveBeenCalled();
    });

    it('should respect skipMigration option', async () => {
      mockDataMigrationService.isMigrationNeeded.mockReturnValue(true);
      
      const mockSnapshot: DataSnapshot = {
        collections: [],
        modes: [],
        dimensions: [],
        resolvedValueTypes: [],
        platforms: [],
        themes: [],
        tokens: [],
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
      
      mockDataManagerInstance.loadFromStorage.mockReturnValue(mockSnapshot);

      await controller.executeOperation('load', { skipMigration: true });
      expect(mockDataMigrationService.performMigration).not.toHaveBeenCalled();
    });
  });
});
