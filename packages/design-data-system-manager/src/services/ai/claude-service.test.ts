import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeService } from './claude-service';
import type { TokenSystem } from '@token-model/data-model';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mock Claude response' }]
      })
    },
    apiKey: 'test-api-key'
  }))
}));

// Mock schema
const mockSchema: TokenSystem = {
  systemName: 'Test System',
  systemId: 'test-system',
  description: 'Test system for AI integration',
  version: '1.0.0',
  versionHistory: [],
  dimensionEvolution: { rules: [] },
  dimensions: [
    {
      id: 'theme',
      displayName: 'Theme',
      modes: [
        { id: 'light', name: 'Light', dimensionId: 'theme' },
        { id: 'dark', name: 'Dark', dimensionId: 'theme' }
      ],
      required: true,
      defaultMode: 'light'
    }
  ],
  dimensionOrder: ['theme'],
  tokenCollections: [
    {
      id: 'colors',
      name: 'Colors',
      resolvedValueTypeIds: ['color'],
      private: false
    }
  ],
  tokens: [],
  platforms: [
    {
      id: 'web',
      displayName: 'Web',
      description: 'Web platform'
    }
  ],
  themes: [],
  taxonomies: [],
  standardPropertyTypes: [],
  propertyTypes: [],
  resolvedValueTypes: [
    {
      id: 'color',
      displayName: 'Color',
      type: 'COLOR'
    }
  ],
  extensions: {}
};

describe('ClaudeService', () => {
  let service: ClaudeService;

  beforeEach(() => {
    service = new ClaudeService(mockSchema, {
      apiKey: 'test-api-key'
    });
  });

  describe('initialization', () => {
    it('should initialize successfully with valid API key', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
    });

    it('should throw error when API key is missing', async () => {
      const serviceWithoutKey = new ClaudeService(mockSchema, {});
      await expect(serviceWithoutKey.initialize()).rejects.toThrow('Claude API key is required');
    });
  });

  describe('context management', () => {
    it('should get initial context', () => {
      const context = service.getContext();
      expect(context).toBeDefined();
      expect(context.schema.systemName).toBe('Test System');
      expect(context.tokens).toEqual([]);
      expect(context.collections).toHaveLength(1);
    });

    it('should update context', () => {
      const newTokens = [{ id: 'test-token', displayName: 'Test Token' } as Record<string, unknown>];
      service.updateContext({ tokens: newTokens });
      
      const context = service.getContext();
      expect(context.tokens).toEqual(newTokens);
    });

    it('should subscribe to context changes', () => {
      const callback = vi.fn();
      const unsubscribe = service.subscribeToContext(callback);
      
      service.updateContext({ currentView: 'test' });
      
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        currentView: 'test'
      }));
      
      unsubscribe();
    });
  });

  describe('AI operations', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should create tokens', async () => {
      const response = await service.createToken('Create a primary button color');
      
      expect(response.success).toBe(true);
      expect(response.content).toBe('Mock Claude response');
    });

    it('should suggest collections', async () => {
      const response = await service.suggestCollection('Where should I put this button token?');
      
      expect(response.success).toBe(true);
      expect(response.content).toBe('Mock Claude response');
    });

    it('should find tokens', async () => {
      const response = await service.findTokens('button colors');
      
      expect(response.success).toBe(true);
      expect(response.content).toBe('Mock Claude response');
    });

    it('should explain concepts', async () => {
      const response = await service.explainConcept('What are design tokens?');
      
      expect(response.success).toBe(true);
      expect(response.content).toBe('Mock Claude response');
    });

    it('should validate data', async () => {
      const validationErrors = [
        { path: 'token.name', message: 'Name is required', severity: 'error' as const }
      ];
      
      const response = await service.validateData(validationErrors);
      
      expect(response.success).toBe(true);
      expect(response.content).toBe('Mock Claude response');
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockError = new Error('API Error');
      const callback = vi.fn();
      
      const serviceWithCallback = new ClaudeService(mockSchema, {
        apiKey: 'test-api-key'
      }, {
        onError: callback
      });

      // Mock the API to throw an error
      const mockClient = {
        messages: {
          create: vi.fn().mockRejectedValue(mockError)
        },
        apiKey: 'test-api-key'
      };
      
      vi.mocked(require('@anthropic-ai/sdk').default).mockImplementation(() => mockClient);
      
      await serviceWithCallback.initialize();
      const response = await serviceWithCallback.createToken('test');
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Failed to create token');
      expect(callback).toHaveBeenCalledWith(mockError);
    });
  });
}); 