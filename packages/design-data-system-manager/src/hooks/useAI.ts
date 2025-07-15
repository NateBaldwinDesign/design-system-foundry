import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClaudeService, type AIContext, type AIResponse, type ClaudeServiceOptions } from '../services/ai/index';
import type { TokenSystem } from '@token-model/data-model';
import type { ExtendedToken } from '../components/TokenEditorDialog';

export interface UseAIOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  autoInitialize?: boolean;
}

export interface UseAIReturn {
  // AI Service
  aiService: ClaudeService | null;
  isInitialized: boolean;
  isInitializing: boolean;
  
  // Context
  context: AIContext | null;
  updateContext: (updates: Partial<AIContext>) => void;
  
  // AI Operations
  createToken: (userInput: string) => Promise<AIResponse>;
  suggestCollection: (userInput: string) => Promise<AIResponse>;
  validateData: (validationErrors: Record<string, unknown>) => Promise<AIResponse>;
  findTokens: (userInput: string) => Promise<AIResponse>;
  explainConcept: (userInput: string) => Promise<AIResponse>;
  
  // State
  lastResponse: AIResponse | null;
  isLoading: boolean;
  error: string | null;
  
  // Utilities
  getContextSummary: () => Record<string, unknown> | null;
  resetError: () => void;
  initializeManually: () => Promise<void>;
}

/**
 * AI Integration Hook
 * Provides easy access to Claude AI services throughout the application
 */
export function useAI(
  schema: TokenSystem,
  options: UseAIOptions = {}
): UseAIReturn {
  const [aiService, setAiService] = useState<ClaudeService | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [context, setContext] = useState<AIContext | null>(null);
  const [lastResponse, setLastResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    apiKey,
    model = 'claude-3-5-sonnet-20241022',
    maxTokens = 4000,
    temperature = 0.3,
    autoInitialize = false
  } = options;

  // Initialize AI service
  const initializeAI = useCallback(async () => {
    if (isInitialized || isInitializing) return;

    setIsInitializing(true);
    setError(null);

    try {
      const serviceOptions: ClaudeServiceOptions = {
        apiKey,
        model,
        maxTokens,
        temperature
      };

      const service = new ClaudeService(schema, serviceOptions, {
        onError: (err) => {
          console.error('[useAI] Claude Service error:', err);
          setError(err.message);
        },
        onContextUpdate: (newContext) => {
          setContext(newContext);
        }
      });

      await service.initialize();
      setAiService(service);
      setIsInitialized(true);

      // Subscribe to context changes
      service.subscribeToContext((newContext) => {
        setContext(newContext);
      });

      // Get initial context
      setContext(service.getContext());

      console.log('[useAI] Claude service initialized successfully');
    } catch (err) {
      console.error('[useAI] Failed to initialize Claude service:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize Claude service');
      setIsInitialized(false);
    } finally {
      setIsInitializing(false);
    }
  }, [schema, apiKey, model, maxTokens, temperature, isInitialized, isInitializing]);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize && schema && !isInitialized && !isInitializing) {
      initializeAI();
    }
  }, [autoInitialize, schema, isInitialized, isInitializing, initializeAI]);

  // Update context
  const updateContext = useCallback((updates: Partial<AIContext>) => {
    if (aiService) {
      aiService.updateContext(updates);
    }
  }, [aiService]);

  // AI Operations
  const createToken = useCallback(async (userInput: string): Promise<AIResponse> => {
    if (!aiService) {
      throw new Error('Claude service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await aiService.createToken(userInput);
      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create token';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  const suggestCollection = useCallback(async (userInput: string): Promise<AIResponse> => {
    if (!aiService) {
      throw new Error('Claude service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await aiService.suggestCollection(userInput);
      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to suggest collection';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  const validateData = useCallback(async (validationErrors: Record<string, unknown>): Promise<AIResponse> => {
    if (!aiService) {
      throw new Error('Claude service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert to ValidationError format
      const errors = Object.entries(validationErrors).map(([path, value]) => ({
        path,
        message: typeof value === 'string' ? value : 'Validation error',
        severity: 'error' as const
      }));
      const response = await aiService.validateData(errors);
      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate data';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  const findTokens = useCallback(async (userInput: string): Promise<AIResponse> => {
    if (!aiService) {
      throw new Error('Claude service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await aiService.findTokens(userInput);
      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find tokens';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  const explainConcept = useCallback(async (userInput: string): Promise<AIResponse> => {
    if (!aiService) {
      throw new Error('Claude service not initialized');
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await aiService.explainConcept(userInput);
      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to explain concept';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [aiService]);

  // Utilities
  const getContextSummary = useCallback((): Record<string, unknown> | null => {
    if (!context) return null;

    return {
      systemName: context.schema.systemName,
      systemId: context.schema.systemId,
      tokenCount: context.tokens.length,
      collectionCount: context.collections.length,
      dimensionCount: context.dimensions.length,
      currentView: context.currentView,
      selectedTokens: context.selectedTokens.length,
      recentTokens: context.recentTokens.slice(0, 5)
    };
  }, [context]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Manual initialization
  const initializeManually = useCallback(async () => {
    if (isInitialized || isInitializing) return;
    
    setIsInitializing(true);
    setError(null);
    
    try {
      const serviceOptions: ClaudeServiceOptions = {
        apiKey,
        model,
        maxTokens,
        temperature
      };

      const service = new ClaudeService(schema, serviceOptions, {
        onError: (err) => {
          console.error('[useAI] Claude Service error:', err);
          setError(err.message);
        },
        onContextUpdate: (newContext) => {
          setContext(newContext);
        }
      });

      await service.initialize();
      setAiService(service);
      setIsInitialized(true);

      // Subscribe to context changes
      service.subscribeToContext((newContext) => {
        setContext(newContext);
      });

      // Get initial context
      setContext(service.getContext());

      console.log('[useAI] Claude service initialized successfully');
    } catch (err) {
      console.error('[useAI] Failed to initialize Claude service:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize Claude service');
      setIsInitialized(false);
    } finally {
      setIsInitializing(false);
    }
  }, [schema, apiKey, model, maxTokens, temperature, isInitialized, isInitializing]);

  // Memoized return value
  const returnValue = useMemo<UseAIReturn>(() => ({
    aiService,
    isInitialized,
    isInitializing,
    context,
    updateContext,
    createToken,
    suggestCollection,
    validateData,
    findTokens,
    explainConcept,
    lastResponse,
    isLoading,
    error,
    getContextSummary,
    resetError,
    initializeManually
  }), [
    aiService,
    isInitialized,
    isInitializing,
    context,
    updateContext,
    createToken,
    suggestCollection,
    validateData,
    findTokens,
    explainConcept,
    lastResponse,
    isLoading,
    error,
    getContextSummary,
    resetError,
    initializeManually
  ]);

  return returnValue;
}

/**
 * Hook for syncing AI context with data manager changes
 */
export function useAIContextSync(
  aiHook: UseAIReturn,
  dataSnapshot: {
    tokens: ExtendedToken[];
    collections: Record<string, unknown>[];
    dimensions: Record<string, unknown>[];
    resolvedValueTypes: Record<string, unknown>[];
    modes: Record<string, unknown>[];
    algorithms: Record<string, unknown>[];
  } | null
) {
  useEffect(() => {
    if (aiHook.isInitialized && dataSnapshot) {
      aiHook.updateContext({
        tokens: dataSnapshot.tokens,
        collections: dataSnapshot.collections,
        dimensions: dataSnapshot.dimensions,
        resolvedValueTypes: dataSnapshot.resolvedValueTypes,
        modes: dataSnapshot.modes,
        algorithms: dataSnapshot.algorithms
      });
    }
  }, [aiHook, dataSnapshot]);
} 