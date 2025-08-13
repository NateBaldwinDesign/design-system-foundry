import { UnifiedEditModeService, EditModeError, type EditSession, type EditModeEvent, type EditModeType, type EditModeStatus } from '../unifiedEditModeService';
import { unifiedUIIntegrationService } from '../unifiedUIIntegrationService';
import { unifiedChangeTrackingService } from '../unifiedChangeTrackingService';
import { dataValidationService } from '../dataValidationService';
import type { Token, TokenCollection, Dimension, Platform, Theme, Taxonomy, Component } from '@token-model/data-model';

// Mock services
jest.mock('../unifiedUIIntegrationService');
jest.mock('../unifiedChangeTrackingService');
jest.mock('../dataValidationService');

const mockUnifiedUIIntegrationService = unifiedUIIntegrationService as jest.Mocked<typeof unifiedUIIntegrationService>;
const mockUnifiedChangeTrackingService = unifiedChangeTrackingService as jest.Mocked<typeof unifiedChangeTrackingService>;
const mockDataValidationService = dataValidationService as jest.Mocked<typeof dataValidationService>;

// Mock environment variable
const originalEnv = process.env;
beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.REACT_APP_UNIFIED_EDIT_MODE_ENABLED = 'true';
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
  // Clear singleton instance
  (UnifiedEditModeService as any).instance = undefined;
});

describe('UnifiedEditModeService', () => {
  let service: UnifiedEditModeService;

  beforeEach(() => {
    // Setup default mock implementations
    mockUnifiedUIIntegrationService.updateDataForComponent.mockResolvedValue();
    mockUnifiedChangeTrackingService.isEnabled.mockReturnValue(false);
    mockUnifiedChangeTrackingService.trackChange.mockImplementation(() => {});
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

    service = UnifiedEditModeService.getInstance();
  });

  describe('Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = UnifiedEditModeService.getInstance();
      const instance2 = UnifiedEditModeService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should check feature flag correctly', () => {
      expect(UnifiedEditModeService.isEnabled()).toBe(true);
      
      process.env.REACT_APP_UNIFIED_EDIT_MODE_ENABLED = 'false';
      (UnifiedEditModeService as any).instance = undefined;
      const newService = UnifiedEditModeService.getInstance();
      expect(UnifiedEditModeService.isEnabled()).toBe(false);
    });

    it('should configure options', () => {
      const options = {
        enableAutoSave: false,
        maxUndoSteps: 100
      };
      
      service.configure(options);
      
      // Verify configuration was applied by checking statistics
      const stats = service.getStatistics();
      expect(stats.options.enableAutoSave).toBe(false);
      expect(stats.options.maxUndoSteps).toBe(100);
    });
  });

  describe('Event Handling', () => {
    it('should add and remove event listeners', () => {
      const listener = jest.fn();
      
      service.addEventListener(listener);
      expect(service.getStatistics().totalEventListeners).toBe(1);
      
      service.removeEventListener(listener);
      expect(service.getStatistics().totalEventListeners).toBe(0);
    });

    it('should emit events to listeners', () => {
      const listener = jest.fn();
      service.addEventListener(listener);
      
      // Trigger an event by starting a session
      const tokenData = { id: 'token1', displayName: 'Token 1', valuesByMode: [] };
      service.startEditSession('TokenEditor', 'token1', 'edit', tokenData);
      
      expect(listener).toHaveBeenCalled();
      const event = listener.mock.calls[0][0] as EditModeEvent;
      expect(event.type).toBe('session-started');
    });
  });

  describe('Edit Session Management', () => {
    const mockTokenData: Token = {
      id: 'token1',
      displayName: 'Test Token',
      valuesByMode: []
    };

    it('should start edit session', () => {
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      expect(session.id).toMatch(/^session_\d+_/);
      expect(session.componentType).toBe('TokenEditor');
      expect(session.entityId).toBe('token1');
      expect(session.mode).toBe('edit');
      expect(session.status).toBe('editing');
      expect(session.originalData).toEqual(mockTokenData);
      expect(session.currentData).toEqual(mockTokenData);
      expect(session.changeCount).toBe(0);
    });

    it('should update session data', () => {
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      const updatedData = { ...mockTokenData, displayName: 'Updated Token' };
      
      service.updateSessionData(session.id, updatedData, 'Update display name');
      
      const updatedSession = service.getSession(session.id);
      expect(updatedSession!.currentData).toEqual(updatedData);
      expect(updatedSession!.changeCount).toBe(1);
      expect(updatedSession!.lastModified).not.toBe(session.lastModified);
    });

    it('should throw error when updating non-existent session', () => {
      expect(() => {
        service.updateSessionData('non-existent-session', mockTokenData);
      }).toThrow(EditModeError);
    });

    it('should end edit session', () => {
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      service.endEditSession(session.id);
      
      const endedSession = service.getSession(session.id);
      expect(endedSession).toBeNull();
    });

    it('should end edit session with save', () => {
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      service.endEditSession(session.id, true);
      
      // Should have attempted to save
      expect(mockUnifiedUIIntegrationService.updateDataForComponent).toHaveBeenCalled();
    });

    it('should get active sessions', () => {
      const session1 = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      const session2 = service.startEditSession('CollectionView', 'collection1', 'edit', { id: 'collection1', name: 'Collection 1' });
      
      const activeSessions = service.getActiveSessions();
      expect(activeSessions).toHaveLength(2);
      expect(activeSessions.map(s => s.id)).toContain(session1.id);
      expect(activeSessions.map(s => s.id)).toContain(session2.id);
    });

    it('should get sessions by component type', () => {
      service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      service.startEditSession('TokenEditor', 'token2', 'edit', { id: 'token2', displayName: 'Token 2', valuesByMode: [] });
      service.startEditSession('CollectionView', 'collection1', 'edit', { id: 'collection1', name: 'Collection 1' });
      
      const tokenSessions = service.getSessionsByComponentType('TokenEditor');
      expect(tokenSessions).toHaveLength(2);
      
      const collectionSessions = service.getSessionsByComponentType('CollectionView');
      expect(collectionSessions).toHaveLength(1);
    });

    it('should check if component has active session', () => {
      service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      expect(service.hasActiveSession('TokenEditor', 'token1')).toBe(true);
      expect(service.hasActiveSession('TokenEditor', 'token2')).toBe(false);
      expect(service.hasActiveSession('CollectionView', 'token1')).toBe(false);
    });
  });

  describe('Validation', () => {
    const mockTokenData: Token = {
      id: 'token1',
      displayName: 'Test Token',
      valuesByMode: []
    };

    it('should validate session data successfully', async () => {
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      const result = await service.validateSession(session.id);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      const updatedSession = service.getSession(session.id);
      expect(updatedSession!.status).toBe('editing');
      expect(updatedSession!.validationErrors).toHaveLength(0);
    });

    it('should handle validation errors', async () => {
      mockDataValidationService.validateTokenSystem.mockReturnValue({
        isValid: false,
        errors: ['Token ID is required', 'Display name is required'],
        warnings: [],
        validationTime: 0,
        timestamp: new Date().toISOString()
      });

      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      const result = await service.validateSession(session.id);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      
      const updatedSession = service.getSession(session.id);
      expect(updatedSession!.status).toBe('error');
      expect(updatedSession!.validationErrors).toHaveLength(2);
    });

    it('should throw error when validating non-existent session', async () => {
      await expect(
        service.validateSession('non-existent-session')
      ).rejects.toThrow(EditModeError);
    });

    it('should validate different data types', async () => {
      // Test Token validation
      const tokenSession = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      await service.validateSession(tokenSession.id);
      expect(mockDataValidationService.validateTokenSystem).toHaveBeenCalled();

      // Test Collection validation
      const collectionData = { id: 'collection1', name: 'Collection 1' };
      const collectionSession = service.startEditSession('CollectionView', 'collection1', 'edit', collectionData);
      await service.validateSession(collectionSession.id);
      expect(mockDataValidationService.validateTokenSystem).toHaveBeenCalled();
    });
  });

  describe('Saving', () => {
    const mockTokenData: Token = {
      id: 'token1',
      displayName: 'Test Token',
      valuesByMode: []
    };

    it('should save session data successfully', async () => {
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      await service.saveSession(session.id);
      
      expect(mockUnifiedUIIntegrationService.updateDataForComponent).toHaveBeenCalledWith(
        'TokenEditor',
        'editable',
        mockTokenData,
        {
          validate: false,
          optimistic: true
        }
      );
      
      const updatedSession = service.getSession(session.id);
      expect(updatedSession!.status).toBe('success');
    });

    it('should validate before saving', async () => {
      mockDataValidationService.validateTokenSystem.mockReturnValue({
        isValid: false,
        errors: ['Validation error'],
        warnings: [],
        validationTime: 0,
        timestamp: new Date().toISOString()
      });

      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      await expect(
        service.saveSession(session.id)
      ).rejects.toThrow(EditModeError);
      
      const updatedSession = service.getSession(session.id);
      expect(updatedSession!.status).toBe('error');
    });

    it('should throw error when saving non-existent session', async () => {
      await expect(
        service.saveSession('non-existent-session')
      ).rejects.toThrow(EditModeError);
    });

    it('should handle save errors', async () => {
      mockUnifiedUIIntegrationService.updateDataForComponent.mockRejectedValue(
        new Error('Save failed')
      );

      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      await expect(
        service.saveSession(session.id)
      ).rejects.toThrow(EditModeError);
      
      const updatedSession = service.getSession(session.id);
      expect(updatedSession!.status).toBe('error');
    });
  });

  describe('Undo/Redo', () => {
    const mockTokenData: Token = {
      id: 'token1',
      displayName: 'Test Token',
      valuesByMode: []
    };

    it('should undo changes', () => {
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      // Make some changes
      const updatedData1 = { ...mockTokenData, displayName: 'Updated Token 1' };
      const updatedData2 = { ...mockTokenData, displayName: 'Updated Token 2' };
      
      service.updateSessionData(session.id, updatedData1, 'First update');
      service.updateSessionData(session.id, updatedData2, 'Second update');
      
      // Undo last change
      service.undo(session.id);
      
      const updatedSession = service.getSession(session.id);
      expect(updatedSession!.currentData).toEqual(updatedData1);
      expect(updatedSession!.changeCount).toBe(1);
    });

    it('should redo changes', () => {
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      // Make a change
      const updatedData = { ...mockTokenData, displayName: 'Updated Token' };
      service.updateSessionData(session.id, updatedData, 'Update');
      
      // Undo the change
      service.undo(session.id);
      
      // Redo the change
      service.redo(session.id);
      
      const updatedSession = service.getSession(session.id);
      expect(updatedSession!.currentData).toEqual(updatedData);
      expect(updatedSession!.changeCount).toBe(1);
    });

    it('should throw error when undoing with empty stack', () => {
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      expect(() => {
        service.undo(session.id);
      }).toThrow(EditModeError);
    });

    it('should throw error when redoing with empty stack', () => {
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      expect(() => {
        service.redo(session.id);
      }).toThrow(EditModeError);
    });

    it('should get stack sizes', () => {
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      // Initially empty
      let stackSizes = service.getStackSizes(session.id);
      expect(stackSizes.undo).toBe(0);
      expect(stackSizes.redo).toBe(0);
      
      // Make a change
      const updatedData = { ...mockTokenData, displayName: 'Updated Token' };
      service.updateSessionData(session.id, updatedData, 'Update');
      
      stackSizes = service.getStackSizes(session.id);
      expect(stackSizes.undo).toBe(1);
      expect(stackSizes.redo).toBe(0);
      
      // Undo the change
      service.undo(session.id);
      
      stackSizes = service.getStackSizes(session.id);
      expect(stackSizes.undo).toBe(0);
      expect(stackSizes.redo).toBe(1);
    });

    it('should limit undo stack size', () => {
      service.configure({ maxUndoSteps: 2 });
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      // Make more changes than the limit
      for (let i = 1; i <= 5; i++) {
        const updatedData = { ...mockTokenData, displayName: `Updated Token ${i}` };
        service.updateSessionData(session.id, updatedData, `Update ${i}`);
      }
      
      const stackSizes = service.getStackSizes(session.id);
      expect(stackSizes.undo).toBe(2); // Should be limited to maxUndoSteps
    });
  });

  describe('Auto-save', () => {
    const mockTokenData: Token = {
      id: 'token1',
      displayName: 'Test Token',
      valuesByMode: []
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should perform auto-save when enabled', async () => {
      service.configure({ enableAutoSave: true, autoSaveInterval: 1000 });
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      // Fast-forward time to trigger auto-save
      jest.advanceTimersByTime(1000);
      
      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockUnifiedUIIntegrationService.updateDataForComponent).toHaveBeenCalled();
    });

    it('should not perform auto-save when disabled', async () => {
      service.configure({ enableAutoSave: false });
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      // Fast-forward time
      jest.advanceTimersByTime(5000);
      
      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockUnifiedUIIntegrationService.updateDataForComponent).not.toHaveBeenCalled();
    });

    it('should skip auto-save for invalid data', async () => {
      service.configure({ enableAutoSave: true, autoSaveInterval: 1000 });
      mockDataValidationService.validateTokenSystem.mockReturnValue({
        isValid: false,
        errors: ['Validation error'],
        warnings: [],
        validationTime: 0,
        timestamp: new Date().toISOString()
      });

      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      // Fast-forward time to trigger auto-save
      jest.advanceTimersByTime(1000);
      
      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockUnifiedUIIntegrationService.updateDataForComponent).not.toHaveBeenCalled();
    });
  });

  describe('Real-time Validation', () => {
    const mockTokenData: Token = {
      id: 'token1',
      displayName: 'Test Token',
      valuesByMode: []
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should schedule validation on data update', async () => {
      service.configure({ enableRealTimeValidation: true, validationDebounce: 300 });
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      const updatedData = { ...mockTokenData, displayName: 'Updated Token' };
      service.updateSessionData(session.id, updatedData);
      
      // Validation should not be called immediately
      expect(mockDataValidationService.validateTokenSystem).not.toHaveBeenCalled();
      
      // Fast-forward time to trigger validation
      jest.advanceTimersByTime(300);
      
      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockDataValidationService.validateTokenSystem).toHaveBeenCalled();
    });

    it('should not schedule validation when disabled', async () => {
      service.configure({ enableRealTimeValidation: false });
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      const updatedData = { ...mockTokenData, displayName: 'Updated Token' };
      service.updateSessionData(session.id, updatedData);
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockDataValidationService.validateTokenSystem).not.toHaveBeenCalled();
    });
  });

  describe('Change Tracking Integration', () => {
    const mockTokenData: Token = {
      id: 'token1',
      displayName: 'Test Token',
      valuesByMode: []
    };

    it('should track changes when change tracking is enabled', () => {
      mockUnifiedChangeTrackingService.isEnabled.mockReturnValue(true);
      
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      expect(mockUnifiedChangeTrackingService.trackChange).toHaveBeenCalledWith(
        'create',
        'Token',
        'token1',
        mockTokenData,
        undefined,
        'edit-session'
      );
      
      const updatedData = { ...mockTokenData, displayName: 'Updated Token' };
      service.updateSessionData(session.id, updatedData);
      
      expect(mockUnifiedChangeTrackingService.trackChange).toHaveBeenCalledWith(
        'update',
        'Token',
        'token1',
        updatedData,
        mockTokenData,
        'data-update'
      );
    });

    it('should not track changes when change tracking is disabled', () => {
      mockUnifiedChangeTrackingService.isEnabled.mockReturnValue(false);
      
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      const updatedData = { ...mockTokenData, displayName: 'Updated Token' };
      service.updateSessionData(session.id, updatedData);
      
      expect(mockUnifiedChangeTrackingService.trackChange).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', () => {
      const stats = service.getStatistics();
      
      expect(stats).toHaveProperty('activeSessions');
      expect(stats).toHaveProperty('totalEventListeners');
      expect(stats).toHaveProperty('options');
      expect(stats.activeSessions).toBe(0);
      expect(stats.totalEventListeners).toBe(0);
    });

    it('should track active sessions', () => {
      const mockTokenData: Token = {
        id: 'token1',
        displayName: 'Test Token',
        valuesByMode: []
      };

      service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      service.startEditSession('CollectionView', 'collection1', 'edit', { id: 'collection1', name: 'Collection 1' });
      
      const stats = service.getStatistics();
      expect(stats.activeSessions).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should clear all sessions', () => {
      const mockTokenData: Token = {
        id: 'token1',
        displayName: 'Test Token',
        valuesByMode: []
      };

      service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      service.startEditSession('CollectionView', 'collection1', 'edit', { id: 'collection1', name: 'Collection 1' });
      
      expect(service.getActiveSessions()).toHaveLength(2);
      
      service.clearAllSessions();
      
      expect(service.getActiveSessions()).toHaveLength(0);
    });

    it('should reset service state', () => {
      const listener = jest.fn();
      service.addEventListener(listener);
      
      const mockTokenData: Token = {
        id: 'token1',
        displayName: 'Test Token',
        valuesByMode: []
      };
      service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      service.reset();
      
      expect(service.getActiveSessions()).toHaveLength(0);
      expect(service.getStatistics().totalEventListeners).toBe(0);
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
        const mockTokenData: Token = {
          id: 'token1',
          displayName: 'Test Token',
          valuesByMode: []
        };
        service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      }).not.toThrow();
    });

    it('should handle auto-save errors gracefully', async () => {
      jest.useFakeTimers();
      
      service.configure({ enableAutoSave: true, autoSaveInterval: 1000 });
      mockUnifiedUIIntegrationService.updateDataForComponent.mockRejectedValue(
        new Error('Auto-save failed')
      );

      const mockTokenData: Token = {
        id: 'token1',
        displayName: 'Test Token',
        valuesByMode: []
      };
      const session = service.startEditSession('TokenEditor', 'token1', 'edit', mockTokenData);
      
      // Fast-forward time to trigger auto-save
      jest.advanceTimersByTime(1000);
      
      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));
      
      // Should not throw error, just log it
      expect(service.getSession(session.id)).toBeDefined();
      
      jest.useRealTimers();
    });
  });
});
