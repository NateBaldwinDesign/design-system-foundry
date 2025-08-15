import { UnifiedChangeTrackingService, ChangeTrackingError, type ChangeEntry, type Baseline, type ChangeTrackingEvent } from '../unifiedChangeTrackingService';
import { unifiedStorageService } from '../unifiedStorageService';
import { dataValidationService } from '../dataValidationService';
import type { TokenSystem, PlatformExtension, ThemeOverrideFile } from '@token-model/data-model';

// Mock services
jest.mock('../unifiedStorageService');
jest.mock('../dataValidationService');

const mockUnifiedStorageService = unifiedStorageService as jest.Mocked<typeof unifiedStorageService>;
const mockDataValidationService = dataValidationService as jest.Mocked<typeof dataValidationService>;

// Mock environment variable
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.REACT_APP_UNIFIED_CHANGE_TRACKING_ENABLED = 'true';
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
  // Clear singleton instance
  (UnifiedChangeTrackingService as any).instance = undefined;
});

describe('UnifiedChangeTrackingService', () => {
  let service: UnifiedChangeTrackingService;

  beforeEach(() => {
    // Setup default mock implementations
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

    service = UnifiedChangeTrackingService.getInstance();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = UnifiedChangeTrackingService.getInstance();
      const instance2 = UnifiedChangeTrackingService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should check feature flag correctly', () => {
      expect(UnifiedChangeTrackingService.isEnabled()).toBe(true);
      
      process.env.REACT_APP_UNIFIED_CHANGE_TRACKING_ENABLED = 'false';
      (UnifiedChangeTrackingService as any).instance = undefined;
      const newService = UnifiedChangeTrackingService.getInstance();
      expect(UnifiedChangeTrackingService.isEnabled()).toBe(false);
    });

    it('should configure options', () => {
      const options = {
        enableValidation: false,
        maxChangeHistory: 500
      };
      
      service.configure(options);
      
      // Verify configuration was applied by checking behavior
      const change = service.trackChange('update', 'Token', 'test-token', { value: 'new' });
      expect(change.status).toBe('applied'); // Should be applied since validation is disabled
    });
  });

  describe('Event Handling', () => {
    it('should add and remove event listeners', () => {
      const listener = jest.fn();
      
      service.addEventListener(listener);
      
      // Trigger an event by creating a baseline
      service.createBaseline('Test Baseline');
      
      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as ChangeTrackingEvent;
      expect(event.type).toBe('baseline-created');
      
      // Remove listener
      service.removeEventListener(listener);
      
      // Clear listener calls
      listener.mockClear();
      
      // Trigger another event
      service.createBaseline('Test Baseline 2');
      
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Baseline Management', () => {
    it('should create baseline', () => {
      const baseline = service.createBaseline('Test Baseline', 'Test Description');
      
      expect(baseline.id).toMatch(/^baseline_\d+_/);
      expect(baseline.name).toBe('Test Baseline');
      expect(baseline.description).toBe('Test Description');
      expect(baseline.timestamp).toBeDefined();
      expect(baseline.changeCount).toBe(0);
      expect(baseline.isActive).toBe(false);
    });

    it('should activate baseline', () => {
      const baseline = service.createBaseline('Test Baseline');
      
      service.activateBaseline(baseline.id);
      
      const currentBaseline = service.getCurrentBaseline();
      expect(currentBaseline).toBeDefined();
      expect(currentBaseline!.id).toBe(baseline.id);
      expect(currentBaseline!.isActive).toBe(true);
    });

    it('should throw error when activating non-existent baseline', () => {
      expect(() => {
        service.activateBaseline('non-existent-baseline');
      }).toThrow(ChangeTrackingError);
    });

    it('should get all baselines', () => {
      const baseline1 = service.createBaseline('Baseline 1');
      const baseline2 = service.createBaseline('Baseline 2');
      
      const baselines = service.getBaselines();
      expect(baselines).toHaveLength(2);
      expect(baselines.map(b => b.id)).toContain(baseline1.id);
      expect(baselines.map(b => b.id)).toContain(baseline2.id);
    });

    it('should deactivate previous baseline when activating new one', () => {
      const baseline1 = service.createBaseline('Baseline 1');
      const baseline2 = service.createBaseline('Baseline 2');
      
      service.activateBaseline(baseline1.id);
      service.activateBaseline(baseline2.id);
      
      const baselines = service.getBaselines();
      const activeBaselines = baselines.filter(b => b.isActive);
      expect(activeBaselines).toHaveLength(1);
      expect(activeBaselines[0].id).toBe(baseline2.id);
    });
  });

  describe('Change Tracking', () => {
    it('should track change successfully', () => {
      const change = service.trackChange('update', 'Token', 'test-token', { value: 'new' }, { value: 'old' });
      
      expect(change.id).toMatch(/^change_\d+_/);
      expect(change.type).toBe('update');
      expect(change.dataType).toBe('Token');
      expect(change.entityId).toBe('test-token');
      expect(change.newValue).toEqual({ value: 'new' });
      expect(change.oldValue).toEqual({ value: 'old' });
      expect(change.status).toBe('applied');
      expect(change.timestamp).toBeDefined();
    });

    it('should validate change when validation is enabled', () => {
      mockDataValidationService.validateTokenSystem.mockReturnValue({
        isValid: false,
        errors: ['Validation error'],
        warnings: [],
        validationTime: 0,
        timestamp: new Date().toISOString()
      });

      expect(() => {
        service.trackChange('update', 'TokenSystem', 'test-system', { invalid: 'data' });
      }).toThrow(ChangeTrackingError);
    });

    it('should skip validation when disabled', () => {
      service.configure({ enableValidation: false });
      
      mockDataValidationService.validateTokenSystem.mockReturnValue({
        isValid: false,
        errors: ['Validation error'],
        warnings: [],
        validationTime: 0,
        timestamp: new Date().toISOString()
      });

      const change = service.trackChange('update', 'TokenSystem', 'test-system', { invalid: 'data' });
      expect(change.status).toBe('applied');
    });

    it('should require entity ID', () => {
      expect(() => {
        service.trackChange('update', 'Token', '', { value: 'new' });
      }).toThrow(ChangeTrackingError);
    });

    it('should require new value for non-delete operations', () => {
      expect(() => {
        service.trackChange('update', 'Token', 'test-token', undefined);
      }).toThrow(ChangeTrackingError);
    });

    it('should allow delete operations without new value', () => {
      const change = service.trackChange('delete', 'Token', 'test-token', undefined, { value: 'old' });
      expect(change.type).toBe('delete');
      expect(change.status).toBe('applied');
    });

    it('should update baseline change count', () => {
      const baseline = service.createBaseline('Test Baseline');
      service.activateBaseline(baseline.id);
      
      service.trackChange('update', 'Token', 'test-token', { value: 'new' });
      
      const updatedBaseline = service.getCurrentBaseline();
      expect(updatedBaseline!.changeCount).toBe(1);
    });
  });

  describe('Change Management', () => {
    it('should commit change', () => {
      const change = service.trackChange('update', 'Token', 'test-token', { value: 'new' });
      
      service.commitChange(change.id);
      
      const changes = service.getChanges();
      const committedChange = changes.find(c => c.id === change.id);
      expect(committedChange!.status).toBe('committed');
    });

    it('should throw error when committing non-existent change', () => {
      expect(() => {
        service.commitChange('non-existent-change');
      }).toThrow(ChangeTrackingError);
    });

    it('should throw error when committing change with error status', () => {
      // Create a change with error status
      const change = service.trackChange('update', 'Token', 'test-token', { value: 'new' });
      (change as any).status = 'error';
      (change as any).error = 'Test error';
      
      expect(() => {
        service.commitChange(change.id);
      }).toThrow(ChangeTrackingError);
    });

    it('should rollback change', () => {
      const change = service.trackChange('update', 'Token', 'test-token', { value: 'new' }, { value: 'old' });
      
      service.rollbackChange(change.id);
      
      const changes = service.getChanges();
      const rolledBackChange = changes.find(c => c.id === change.id);
      expect(rolledBackChange!.status).toBe('rolled-back');
    });

    it('should throw error when rolling back non-existent change', () => {
      expect(() => {
        service.rollbackChange('non-existent-change');
      }).toThrow(ChangeTrackingError);
    });

    it('should handle rollback without old value', () => {
      const change = service.trackChange('update', 'Token', 'test-token', { value: 'new' });
      
      service.rollbackChange(change.id);
      
      const changes = service.getChanges();
      const rolledBackChange = changes.find(c => c.id === change.id);
      expect(rolledBackChange!.status).toBe('error');
      expect(rolledBackChange!.error).toContain('no old value available');
    });
  });

  describe('Baseline Rollback', () => {
    it('should rollback to baseline', () => {
      const baseline = service.createBaseline('Test Baseline');
      service.activateBaseline(baseline.id);
      
      // Make some changes
      const change1 = service.trackChange('update', 'Token', 'token1', { value: 'new1' });
      const change2 = service.trackChange('update', 'Token', 'token2', { value: 'new2' });
      
      // Rollback to baseline
      service.rollbackToBaseline(baseline.id);
      
      const changes = service.getChanges();
      const rolledBackChanges = changes.filter(c => c.status === 'rolled-back');
      expect(rolledBackChanges).toHaveLength(2);
    });

    it('should throw error when rolling back to non-existent baseline', () => {
      expect(() => {
        service.rollbackToBaseline('non-existent-baseline');
      }).toThrow(ChangeTrackingError);
    });

    it('should get changes since baseline', () => {
      const baseline = service.createBaseline('Test Baseline');
      service.activateBaseline(baseline.id);
      
      // Make some changes
      service.trackChange('update', 'Token', 'token1', { value: 'new1' });
      service.trackChange('update', 'Token', 'token2', { value: 'new2' });
      
      const changesSinceBaseline = service.getChangesSinceBaseline(baseline.id);
      expect(changesSinceBaseline).toHaveLength(2);
    });
  });

  describe('Change Queries', () => {
    beforeEach(() => {
      // Create some test changes
      service.trackChange('create', 'Token', 'token1', { value: 'new1' });
      service.trackChange('update', 'Token', 'token2', { value: 'new2' }, { value: 'old2' });
      service.trackChange('delete', 'Token', 'token3', undefined, { value: 'old3' });
      service.trackChange('update', 'TokenCollection', 'collection1', { name: 'new' });
    });

    it('should get all changes', () => {
      const changes = service.getChanges();
      expect(changes).toHaveLength(4);
    });

    it('should get changes by entity', () => {
      const changes = service.getChangesByEntity('token1');
      expect(changes).toHaveLength(1);
      expect(changes[0].entityId).toBe('token1');
    });

    it('should get changes by type', () => {
      const createChanges = service.getChangesByType('create');
      expect(createChanges).toHaveLength(1);
      expect(createChanges[0].type).toBe('create');
    });

    it('should get changes by data type', () => {
      const tokenChanges = service.getChangesByDataType('Token');
      expect(tokenChanges).toHaveLength(3);
      
      const collectionChanges = service.getChangesByDataType('TokenCollection');
      expect(collectionChanges).toHaveLength(1);
    });
  });

  describe('Storage Integration', () => {
    beforeEach(() => {
      mockUnifiedStorageService.isEnabled.mockReturnValue(true);
    });

    it('should load from storage on initialization', () => {
      const storedChanges: ChangeEntry[] = [
        {
          id: 'test-change',
          timestamp: new Date().toISOString(),
          type: 'update',
          status: 'applied',
          dataType: 'Token',
          entityId: 'test-token',
          newValue: { value: 'new' }
        }
      ];

      const storedBaselines: Baseline[] = [
        {
          id: 'test-baseline',
          timestamp: new Date().toISOString(),
          name: 'Test Baseline',
          dataSnapshot: {
            core: null,
            platformExtensions: {},
            themeOverrides: {}
          },
          changeCount: 1,
          isActive: true
        }
      ];

      mockUnifiedStorageService.getData.mockImplementation((key: string) => {
        if (key === 'token-model:unified:change-history') {
          return storedChanges;
        }
        if (key === 'token-model:unified:baselines') {
          return storedBaselines;
        }
        return null;
      });

      // Create new instance to trigger storage loading
      (UnifiedChangeTrackingService as any).instance = undefined;
      const newService = UnifiedChangeTrackingService.getInstance();

      const changes = newService.getChanges();
      const baselines = newService.getBaselines();

      expect(changes).toHaveLength(1);
      expect(baselines).toHaveLength(1);
    });

    it('should save to storage when changes are made', () => {
      service.trackChange('update', 'Token', 'test-token', { value: 'new' });
      
      expect(mockUnifiedStorageService.setData).toHaveBeenCalledWith(
        'token-model:unified:change-history',
        expect.any(Array)
      );
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should clear change history', () => {
      service.trackChange('update', 'Token', 'test-token', { value: 'new' });
      service.trackChange('update', 'Token', 'test-token2', { value: 'new2' });
      
      expect(service.getChanges()).toHaveLength(2);
      
      service.clearChangeHistory();
      
      expect(service.getChanges()).toHaveLength(0);
    });

    it('should cleanup old baselines', () => {
      // Create old baseline
      const oldBaseline = service.createBaseline('Old Baseline');
      oldBaseline.timestamp = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(); // 31 days ago
      
      // Create recent baseline
      const recentBaseline = service.createBaseline('Recent Baseline');
      
      // Create active baseline (should not be cleaned up)
      const activeBaseline = service.createBaseline('Active Baseline');
      service.activateBaseline(activeBaseline.id);
      
      service.cleanupOldBaselines();
      
      const baselines = service.getBaselines();
      expect(baselines).toHaveLength(2); // Recent and active baselines should remain
      expect(baselines.find(b => b.id === oldBaseline.id)).toBeUndefined();
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', () => {
      // Create baseline
      const baseline = service.createBaseline('Test Baseline');
      service.activateBaseline(baseline.id);
      
      // Make various types of changes
      service.trackChange('create', 'Token', 'token1', { value: 'new1' });
      service.trackChange('update', 'Token', 'token2', { value: 'new2' });
      service.trackChange('delete', 'Token', 'token3', undefined, { value: 'old3' });
      
      // Commit some changes
      const changes = service.getChanges();
      service.commitChange(changes[0].id);
      
      const stats = service.getStatistics();
      
      expect(stats.totalChanges).toBe(3);
      expect(stats.pendingChanges).toBe(2);
      expect(stats.committedChanges).toBe(1);
      expect(stats.rolledBackChanges).toBe(0);
      expect(stats.errorChanges).toBe(0);
      expect(stats.totalBaselines).toBe(1);
      expect(stats.activeBaseline).toBe(baseline.id);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', () => {
      mockUnifiedStorageService.isEnabled.mockReturnValue(true);
      mockUnifiedStorageService.setData.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // Should not throw error, just log it
      expect(() => {
        service.trackChange('update', 'Token', 'test-token', { value: 'new' });
      }).not.toThrow();
    });

    it('should handle event listener errors gracefully', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      service.addEventListener(errorListener);
      
      // Should not throw error, just log it
      expect(() => {
        service.createBaseline('Test Baseline');
      }).not.toThrow();
    });
  });
});
