/**
 * Unit tests for GeminiAIService
 */

import { GeminiAIService } from '../GeminiAIService';
import { GeminiContextBuilderInstance } from '../GeminiContextBuilder';
import { GeminiCostManagerInstance } from '../GeminiCostManager';
import type { TokenSystem } from '@token-model/data-model';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('GeminiAIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('buildContext', () => {
    test('should build context correctly with all core concepts', () => {
      const mockDesignSystem: TokenSystem = {
        systemName: 'Test Design System',
        systemId: 'test-system',
        systemDescription: 'A test design system',
        tokens: [
          {
            id: 'token-1',
            displayName: 'Primary Color',
            tokenCollectionId: 'collection-1',
            resolvedValueTypeId: 'color',
            valuesByMode: {
              'mode-1': { value: '#000000' }
            }
          }
        ],
        tokenCollections: [
          {
            id: 'collection-1',
            name: 'Colors',
            description: 'Color tokens',
            resolvedValueTypeIds: ['color']
          }
        ],
        dimensions: [
          {
            id: 'dimension-1',
            displayName: 'Theme',
            description: 'Theme dimension',
            modes: [
              { id: 'mode-1', name: 'Light' },
              { id: 'mode-2', name: 'Dark' }
            ],
            defaultMode: 'mode-1',
            required: true,
            resolvedValueTypeIds: ['color']
          }
        ],
        resolvedValueTypes: [
          {
            id: 'color',
            displayName: 'Color',
            type: 'COLOR'
          }
        ],
        components: [],
        componentCategories: [],
        componentProperties: [],
        platforms: [],
        themes: [],
        taxonomies: [],
        algorithms: [],
        platformExtensions: []
      };

      const context = GeminiContextBuilderInstance.buildDesignSystemContext(mockDesignSystem);

      expect(context.coreConcepts.resolvedValueTypes).toBeDefined();
      expect(context.coreConcepts.dimensions).toBeDefined();
      expect(context.coreConcepts.modes).toBeDefined();
      expect(context.coreConcepts.tokenCollections).toBeDefined();
      expect(context.coreConcepts.aliases).toBeDefined();
      
      expect(context.systemName).toBe('Test Design System');
      expect(context.systemId).toBe('test-system');
      expect(context.metadata.tokenCount).toBe(1);
      expect(context.metadata.collectionCount).toBe(1);
      expect(context.metadata.dimensionCount).toBe(1);
    });

    test('should handle empty design system gracefully', () => {
      const emptyDesignSystem: TokenSystem = {
        systemName: 'Empty System',
        systemId: 'empty-system',
        systemDescription: 'An empty design system',
        tokens: [],
        tokenCollections: [],
        dimensions: [],
        resolvedValueTypes: [],
        components: [],
        componentCategories: [],
        componentProperties: [],
        platforms: [],
        themes: [],
        taxonomies: [],
        algorithms: [],
        platformExtensions: []
      };

      const context = GeminiContextBuilderInstance.buildDesignSystemContext(emptyDesignSystem);

      expect(context.coreConcepts.resolvedValueTypes).toEqual([]);
      expect(context.coreConcepts.dimensions).toEqual([]);
      expect(context.coreConcepts.modes).toEqual([]);
      expect(context.coreConcepts.tokenCollections).toEqual([]);
      expect(context.coreConcepts.aliases).toEqual([]);
      expect(context.metadata.tokenCount).toBe(0);
    });
  });

  describe('cost calculation', () => {
    test('should calculate costs correctly', () => {
      const cost = GeminiCostManagerInstance.calculateCost(1000, 500);
      expect(cost).toBe(0.0015); // (1500 / 1000) * 0.001
    });

    test('should respect budget limits', () => {
      // Mock current usage to be $4.50
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        month: new Date().toISOString().slice(0, 7),
        totalCost: 4.50,
        queryCount: 10
      }));

      const canAfford = GeminiCostManagerInstance.checkBudget(0.25); // $0.25 estimated cost
      expect(canAfford).toBe(false); // $4.50 + $0.25 = $4.75, which is under $5.00

      const cannotAfford = GeminiCostManagerInstance.checkBudget(1.00); // $1.00 estimated cost
      expect(cannotAfford).toBe(false); // $4.50 + $1.00 = $5.50, which exceeds $5.00
    });

    test('should track usage correctly', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        month: new Date().toISOString().slice(0, 7),
        queries: [],
        totalCost: 0,
        queryCount: 0
      }));

      GeminiCostManagerInstance.trackUsage('test query', 0.001);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'gemini-ai:monthly-usage',
        expect.stringContaining('"totalCost":0.001')
      );
    });
  });

  describe('context optimization', () => {
    test('should optimize context for cost when too large', () => {
      const largeDesignSystem: TokenSystem = {
        systemName: 'Large System',
        systemId: 'large-system',
        systemDescription: 'A large design system',
        tokens: Array.from({ length: 100 }, (_, i) => ({
          id: `token-${i}`,
          displayName: `Token ${i}`,
          tokenCollectionId: 'collection-1',
          resolvedValueTypeId: 'color',
          valuesByMode: {
            'mode-1': { value: '#000000' }
          }
        })),
        tokenCollections: Array.from({ length: 20 }, (_, i) => ({
          id: `collection-${i}`,
          name: `Collection ${i}`,
          description: `Collection ${i}`,
          resolvedValueTypeIds: ['color']
        })),
        dimensions: [],
        resolvedValueTypes: [],
        components: [],
        componentCategories: [],
        componentProperties: [],
        platforms: [],
        themes: [],
        taxonomies: [],
        algorithms: [],
        platformExtensions: []
      };

      const context = GeminiContextBuilderInstance.buildDesignSystemContext(largeDesignSystem);

      // Should prioritize tokens (limit to 50)
      expect(context.data.tokens.length).toBeLessThanOrEqual(50);
      // Should limit collections to 10
      expect(context.data.collections.length).toBeLessThanOrEqual(10);
    });
  });

  describe('budget status', () => {
    test('should return correct budget status', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        month: new Date().toISOString().slice(0, 7),
        totalCost: 2.50,
        queryCount: 5
      }));

      const status = GeminiCostManagerInstance.getBudgetStatus();

      expect(status.currentUsage).toBe(2.50);
      expect(status.budget).toBe(5.00);
      expect(status.remaining).toBe(2.50);
      expect(status.percentageUsed).toBe(50);
      expect(status.isOverBudget).toBe(false);
    });

    test('should handle over budget scenario', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        month: new Date().toISOString().slice(0, 7),
        totalCost: 6.00,
        queryCount: 10
      }));

      const status = GeminiCostManagerInstance.getBudgetStatus();

      expect(status.isOverBudget).toBe(true);
      expect(status.remaining).toBe(0);
      expect(status.percentageUsed).toBe(120);
    });
  });

  describe('feature availability', () => {
    test('should return true when under budget', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        month: new Date().toISOString().slice(0, 7),
        totalCost: 3.00,
        queryCount: 5
      }));

      expect(GeminiCostManagerInstance.isFeatureAvailable()).toBe(true);
    });

    test('should return false when over budget', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        month: new Date().toISOString().slice(0, 7),
        totalCost: 6.00,
        queryCount: 10
      }));

      expect(GeminiCostManagerInstance.isFeatureAvailable()).toBe(false);
    });
  });
});
