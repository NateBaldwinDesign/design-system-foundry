/**
 * Gemini AI Context Provider
 * Provides AI functionality throughout the application
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '@chakra-ui/react';
import { GeminiAIService } from '../services/ai/GeminiAIService';
import { GeminiContextBuilderInstance } from '../services/ai/GeminiContextBuilder';
import { GeminiCostManagerInstance } from '../services/ai/GeminiCostManager';
import { StorageService } from '../services/storage';
import type { 
  TokenSystem, 
  Token, 
  TokenCollection, 
  Mode, 
  Dimension, 
  ResolvedValueType, 
  Platform, 
  Theme, 
  Taxonomy, 
  ComponentProperty, 
  ComponentCategory, 
  Component 
} from '@token-model/data-model';
import type { Algorithm } from '../types/algorithm';
import type { PlatformExtension } from '@token-model/data-model';

export interface ConversationMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  cost?: number;
}

export interface CostStatistics {
  monthlyQueries: number;
  monthlyCost: number;
  averageCostPerQuery: number;
  budgetStatus: {
    currentUsage: number;
    budget: number;
    remaining: number;
    percentageUsed: number;
    isOverBudget: boolean;
  };
}

export interface BudgetSettings {
  monthlyBudget: number;
  costAlerts: boolean;
  autoFallback: boolean;
}

export interface GeminiAIContextValue {
  isAvailable: boolean;
  isLoading: boolean;
  conversation: ConversationMessage[];
  askQuestion: (question: string) => Promise<void>;
  clearConversation: () => void;
  costStats: CostStatistics;
  budgetSettings: BudgetSettings;
  updateBudgetSettings: (settings: Partial<BudgetSettings>) => void;
}

const GeminiAIContext = createContext<GeminiAIContextValue | null>(null);

export { GeminiAIContext };

export const useGeminiAI = () => {
  const context = useContext(GeminiAIContext);
  if (!context) {
    throw new Error('useGeminiAI must be used within GeminiAIProvider');
  }
  return context;
};

interface GeminiAIProviderProps {
  children: React.ReactNode;
                // Current design system data from the UI
              currentData?: {
                tokens: Token[];
                collections: TokenCollection[];
                modes: Mode[];
                dimensions: Dimension[];
                resolvedValueTypes: ResolvedValueType[];
                platforms: Platform[];
                themes: Theme[];
                taxonomies: Taxonomy[];
                componentProperties: ComponentProperty[];
                componentCategories: ComponentCategory[];
                components: Component[];
                algorithms: Algorithm[];
                platformExtensions?: Record<string, unknown>;
                themeOverrides?: Record<string, unknown>;
              };
}

export const GeminiAIProvider: React.FC<GeminiAIProviderProps> = ({ children, currentData }) => {
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [costStats, setCostStats] = useState<CostStatistics>({
    monthlyQueries: 0,
    monthlyCost: 0,
    averageCostPerQuery: 0,
    budgetStatus: {
      currentUsage: 0,
      budget: 5.00,
      remaining: 5.00,
      percentageUsed: 0,
      isOverBudget: false
    }
  });
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>({
    monthlyBudget: 5.00,
    costAlerts: true,
    autoFallback: true
  });

  const toast = useToast();

  // Load budget settings on mount
  useEffect(() => {
    const settings = GeminiCostManagerInstance.getBudgetSettings();
    setBudgetSettings(settings);
  }, []);

  // Update cost stats periodically
  useEffect(() => {
    const updateCostStats = () => {
      const metrics = GeminiCostManagerInstance.getUsageMetrics();
      const budgetStatus = GeminiCostManagerInstance.getBudgetStatus();
      
      setCostStats({
        monthlyQueries: metrics.monthlyQueries,
        monthlyCost: metrics.monthlyCost,
        averageCostPerQuery: metrics.costPerQuery,
        budgetStatus
      });
    };

    updateCostStats();
    const interval = setInterval(updateCostStats, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Listen for budget alerts
  useEffect(() => {
    const handleBudgetAlert = (event: CustomEvent) => {
      const { type, message } = event.detail;
      
      toast({
        title: type === 'error' ? 'Budget Exceeded' : 'Budget Warning',
        description: message,
        status: type,
        duration: 5000,
        isClosable: true,
      });
    };

    window.addEventListener('gemini-ai:budget-alert', handleBudgetAlert as EventListener);
    
    return () => {
      window.removeEventListener('gemini-ai:budget-alert', handleBudgetAlert as EventListener);
    };
  }, [toast]);

  const getCurrentDesignSystemData = useCallback(async (): Promise<TokenSystem> => {
    // First, try to get the complete merged data which includes all token overrides and merged data
    let mergedData = StorageService.getMergedData();
    
    // If no merged data exists, try to compute it
    if (!mergedData) {
      console.log('[GeminiAI] No merged data found, attempting to compute it...');
      const { DataMergerService } = await import('../services/dataMergerService');
      const mergerService = DataMergerService.getInstance();
      mergedData = await mergerService.computeMergedData();
    }
    
    // ALWAYS ensure we have ALL platform extensions and theme overrides for AI context
    // regardless of what's in merged data (which only includes currently selected ones)
    const allPlatforms = mergedData?.platforms || StorageService.getPlatforms();
    const allThemes = mergedData?.themes || StorageService.getThemes();

    // Debug: Check what's actually in storage
    console.log('[GeminiAI] Debug storage contents:', {
      platforms: allPlatforms?.map(p => ({ id: p.id, displayName: p.displayName, extensionSource: p.extensionSource })),
      themes: allThemes?.map(t => ({ id: t.id, displayName: t.displayName, overrideSource: t.overrideSource })),
      platformExtensionsFromStorage: StorageService.getPlatformExtensions(),
      themeOverridesFromStorage: StorageService.getThemeOverrides()
    });

    // ATTEMPT TO LOAD MISSING PLATFORM EXTENSIONS AND THEME OVERRIDES
    console.log('[GeminiAI] Attempting to load missing platform extensions and theme overrides...');
    
    const fetchedPlatformExtensions: Record<string, { tokenOverrides?: Array<{ id: string }> }> = {};
    const fetchedThemeOverrides: Record<string, { tokenOverrides?: Array<unknown> }> = {};

    // Load platform extensions if they're missing
    for (const platform of allPlatforms || []) {
      if (platform.extensionSource && !StorageService.getPlatformExtensionData(platform.id)) {
        const { repositoryUri, filePath } = platform.extensionSource;
        const branch = 'main';
        console.log(`[GeminiAI] Loading platform extension for ${platform.id} from ${repositoryUri}/${filePath}`);
        try {
          const { PlatformExtensionDataService } = await import('../services/platformExtensionDataService');
          const result = await PlatformExtensionDataService.getPlatformExtensionData(
            repositoryUri,
            filePath,
            branch,
            platform.id
          );
          if (result.data) {
            // Persist to StorageService for downstream consumers
            StorageService.setPlatformExtensionData(platform.id, result.data as unknown as PlatformExtension);
            fetchedPlatformExtensions[platform.id] = { tokenOverrides: result.data.tokenOverrides?.map(o => ({ id: o.id })) };
            console.log(`[GeminiAI] Successfully fetched and stored platform extension for ${platform.id}`, {
              tokenOverridesCount: result.data.tokenOverrides?.length || 0
            });
          } else {
            console.warn(`[GeminiAI] Platform extension fetch returned no data for ${platform.id}`, { source: result.source, error: result.error });
          }
        } catch (error) {
          console.warn(`[GeminiAI] Failed to load platform extension for ${platform.id}:`, error);
        }
      }
    }

    // Load theme overrides if they're missing
    for (const theme of allThemes || []) {
      if (theme.overrideSource && !StorageService.getThemeOverrideData(theme.id)) {
        const { repositoryUri, filePath } = theme.overrideSource;
        const branch = 'main';
        console.log(`[GeminiAI] Loading theme override for ${theme.id} from ${repositoryUri}/${filePath}`);
        try {
          const { ThemeOverrideDataService } = await import('../services/themeOverrideDataService');
          const result = await ThemeOverrideDataService.getThemeOverrideData(
            repositoryUri,
            filePath,
            branch,
            theme.id
          );
          if (result.data) {
            // Persist to StorageService for downstream consumers
            StorageService.setThemeOverrideData(theme.id, result.data);
            fetchedThemeOverrides[theme.id] = { tokenOverrides: result.data.tokenOverrides };
            console.log(`[GeminiAI] Successfully fetched and stored theme override for ${theme.id}`, {
              tokenOverridesCount: result.data.tokenOverrides?.length || 0
            });
          } else {
            console.warn(`[GeminiAI] Theme override fetch returned no data for ${theme.id}`, { source: result.source, error: result.error });
          }
        } catch (error) {
          console.warn(`[GeminiAI] Failed to load theme override for ${theme.id}:`, error);
        }
      }
    }

    // Get ALL platform extensions from storage AND MultiRepositoryManager
    const fromStoragePlatformExtensions = StorageService.getPlatformExtensions();
    const perPlatformExtensions: Record<string, unknown> = {};
    (allPlatforms || []).forEach(platform => {
      const data = StorageService.getPlatformExtensionData(platform.id) || fetchedPlatformExtensions[platform.id];
      if (data) {
        console.log(`[GeminiAI] Found platform extension data for ${platform.id}:`, {
          hasTokenOverrides: !!(data as { tokenOverrides?: Array<unknown> }).tokenOverrides,
          tokenOverridesCount: (data as { tokenOverrides?: Array<unknown> }).tokenOverrides?.length || 0,
          platformId: platform.id
        });
        perPlatformExtensions[platform.id] = data;
      } else {
        console.log(`[GeminiAI] No platform extension data found for ${platform.id}`);
      }
    });

    // Get ALL theme overrides from storage AND MultiRepositoryManager
    const fromStorageThemeOverrides = StorageService.getAllThemeOverrideData();
    const perThemeOverrides: Record<string, unknown> = {};
    (allThemes || []).forEach(theme => {
      const data = StorageService.getThemeOverrideData(theme.id) || fetchedThemeOverrides[theme.id];
      if (data) {
        console.log(`[GeminiAI] Found theme override data for ${theme.id}:`, {
          hasTokenOverrides: !!(data as { tokenOverrides?: Array<unknown> }).tokenOverrides,
          tokenOverridesCount: (data as { tokenOverrides?: Array<unknown> }).tokenOverrides?.length || 0,
          themeId: theme.id
        });
        perThemeOverrides[theme.id] = data;
      } else {
        console.log(`[GeminiAI] No theme override data found for ${theme.id}`);
      }
    });

    console.log('[GeminiAI] Fetched (in-memory) override sources:', {
      fetchedPlatformExtensionsCount: Object.keys(fetchedPlatformExtensions).length,
      fetchedThemeOverridesCount: Object.keys(fetchedThemeOverrides).length
    });

    // ALSO check MultiRepositoryManager for platform extensions and theme overrides
    const { MultiRepositoryManager } = await import('../services/multiRepositoryManager');
    const multiRepoManager = MultiRepositoryManager.getInstance();
    const multiRepoData = multiRepoManager.getCurrentData();
    
    console.log('[GeminiAI] MultiRepositoryManager data:', {
      hasCore: !!multiRepoData.core,
      platformExtensionsCount: multiRepoData.platformExtensions.size,
      hasThemeOverrides: !!multiRepoData.themeOverrides,
      platformExtensionIds: Array.from(multiRepoData.platformExtensions.keys())
    });

    // Convert MultiRepositoryManager Map to plain objects
    const multiRepoPlatformExtensions: Record<string, unknown> = {};
    multiRepoData.platformExtensions.forEach((extension, platformId) => {
      console.log(`[GeminiAI] Found MultiRepo platform extension for ${platformId}:`, {
        hasTokenOverrides: !!extension.tokenOverrides,
        tokenOverridesCount: extension.tokenOverrides?.length || 0
      });
      multiRepoPlatformExtensions[platformId] = extension;
    });

    const multiRepoThemeOverrides: Record<string, unknown> = {};
    if (multiRepoData.themeOverrides) {
      console.log('[GeminiAI] Found MultiRepo theme overrides:', {
        hasTokenOverrides: !!multiRepoData.themeOverrides.tokenOverrides,
        tokenOverridesCount: multiRepoData.themeOverrides.tokenOverrides?.length || 0
      });
      multiRepoThemeOverrides['multi-repo-themes'] = multiRepoData.themeOverrides;
    }

    // Combine ALL platform extensions and theme overrides
    const allPlatformExtensions = {
      ...fromStoragePlatformExtensions,
      ...perPlatformExtensions,
      ...fetchedPlatformExtensions
    };
    
    const allThemeOverrides = {
      ...fromStorageThemeOverrides,
      ...perThemeOverrides,
      ...fetchedThemeOverrides
    };

    // LOAD ALL SCHEMA FILES FOR AI CONTEXT
    console.log('[GeminiAI] Loading schema files for AI context...');
    let schemas: Record<string, unknown> = {};
    try {
      // Import schema files from data-model package
      const schemaModule = await import('@token-model/data-model');
      schemas = {
        mainSchema: schemaModule.default || schemaModule,
        platformExtensionSchema: await import('@token-model/data-model/src/platform-extension-schema.json'),
        themeOverridesSchema: await import('@token-model/data-model/src/theme-overrides-schema.json'),
        algorithmSchema: await import('@token-model/data-model/src/algorithm-schema.json')
      };
      console.log('[GeminiAI] Successfully loaded schema files');
    } catch (error) {
      console.warn('[GeminiAI] Failed to load schema files:', error);
    }

    // Build the enriched design system object
    const enriched = {
      ...mergedData,
      platformExtensions: allPlatformExtensions,
      themeOverrides: allThemeOverrides,
      // Include all schema definitions
      schemas: {
        main: schemas.mainSchema,
        platformExtension: schemas.platformExtensionSchema,
        themeOverride: schemas.themeOverridesSchema,
        algorithm: schemas.algorithmSchema
      },
      // EXPLICIT OVERRIDE SUMMARY for AI
      overrideSummary: {
        platformOverrides: Object.entries(allPlatformExtensions).map(([platformId, data]) => ({
          platformId,
          tokenOverridesCount: (data as { tokenOverrides?: Array<unknown> }).tokenOverrides?.length || 0,
          tokenOverrides: (data as { tokenOverrides?: Array<{ id: string }> }).tokenOverrides?.map(o => o.id) || []
        })),
        themeOverrides: Object.entries(allThemeOverrides).map(([themeId, data]) => ({
          themeId,
          tokenOverridesCount: (data as { tokenOverrides?: Array<unknown> }).tokenOverrides?.length || 0,
          tokenOverrides: (data as { tokenOverrides?: Array<unknown> }).tokenOverrides || []
        })),
        totalPlatformOverrides: Object.values(allPlatformExtensions).reduce((sum: number, data) => 
          sum + ((data as { tokenOverrides?: Array<unknown> }).tokenOverrides?.length || 0), 0),
        totalThemeOverrides: Object.values(allThemeOverrides).reduce((sum: number, data) => 
          sum + ((data as { tokenOverrides?: Array<unknown> }).tokenOverrides?.length || 0), 0)
      }
    } as unknown as TokenSystem & { 
      platformExtensions?: Record<string, unknown>; 
      themeOverrides?: Record<string, unknown>;
      schemas?: Record<string, unknown>;
      overrideSummary?: {
        platformOverrides: Array<{ platformId: string; tokenOverridesCount: number; tokenOverrides: string[] }>;
        themeOverrides: Array<{ themeId: string; tokenOverridesCount: number; tokenOverrides: unknown[] }>;
        totalPlatformOverrides: number;
        totalThemeOverrides: number;
      };
    };

    // DEBUG: Log the exact structure being sent to AI
    console.log('[GeminiAI] FINAL enriched data structure being sent to AI:', {
      hasPlatformExtensions: !!enriched.platformExtensions,
      platformExtensionsKeys: enriched.platformExtensions ? Object.keys(enriched.platformExtensions) : [],
      platformExtensionsCount: enriched.platformExtensions ? Object.keys(enriched.platformExtensions).length : 0,
      hasThemeOverrides: !!enriched.themeOverrides,
      themeOverridesKeys: enriched.themeOverrides ? Object.keys(enriched.themeOverrides) : [],
      themeOverridesCount: enriched.themeOverrides ? Object.keys(enriched.themeOverrides).length : 0,
      hasOverrideSummary: !!enriched.overrideSummary,
      overrideSummary: enriched.overrideSummary,
      samplePlatformExtension: enriched.platformExtensions ? Object.values(enriched.platformExtensions)[0] : null,
      sampleThemeOverride: enriched.themeOverrides ? Object.values(enriched.themeOverrides)[0] : null,
      hasSchemas: !!enriched.schemas,
      schemaKeys: enriched.schemas ? Object.keys(enriched.schemas) : []
    });

    // Also log the raw data to see what's actually in the objects
    console.log('[GeminiAI] Raw platform extensions data:', allPlatformExtensions);
    console.log('[GeminiAI] Raw theme overrides data:', allThemeOverrides);

    console.log('[GeminiAI] Using enriched data with ALL override information:', {
      tokensCount: enriched.tokens?.length || 0,
      collectionsCount: enriched.tokenCollections?.length || 0,
      dimensionsCount: enriched.dimensions?.length || 0,
      componentsCount: enriched.components?.length || 0,
      taxonomiesCount: enriched.taxonomies?.length || 0,
      resolvedValueTypesCount: enriched.resolvedValueTypes?.length || 0,
      platformsCount: enriched.platforms?.length || 0,
      themesCount: enriched.themes?.length || 0,
      algorithmsCount: (enriched as TokenSystem & { algorithms?: unknown[] }).algorithms?.length || 0,
      componentCategoriesCount: enriched.componentCategories?.length || 0,
      componentPropertiesCount: enriched.componentProperties?.length || 0,
      platformExtensionsCount: Object.keys(allPlatformExtensions).length,
      themeOverridesCount: Object.keys(allThemeOverrides).length,
      schemasCount: Object.keys(schemas).length,
      platformExtensionSources: {
        fromStorage: Object.keys(fromStoragePlatformExtensions).length,
        perPlatform: Object.keys(perPlatformExtensions).length,
        fromMultiRepo: Object.keys(multiRepoPlatformExtensions).length
      },
      themeOverrideSources: {
        fromStorage: Object.keys(fromStorageThemeOverrides).length,
        perTheme: Object.keys(perThemeOverrides).length,
        fromMultiRepo: Object.keys(multiRepoThemeOverrides).length
      }
    });
    
    return enriched;
  }, [currentData]);

  const askQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;

    setIsLoading(true);
    
    try {
      // Check if feature is available
      if (!GeminiCostManagerInstance.isFeatureAvailable()) {
        throw new Error('AI features are currently disabled due to budget limits. Please try again next month.');
      }

      // Get current design system data
      const designSystem = await getCurrentDesignSystemData();

      // Diagnostics: compute and log override counts per platform and theme
      try {
        const platformExtensions = (designSystem as unknown as { platformExtensions?: Record<string, { tokenOverrides?: Array<{ id: string }> }> }).platformExtensions || {};
        const themeOverrides = (designSystem as unknown as { themeOverrides?: Record<string, { tokenOverrides?: Array<unknown> }> }).themeOverrides || {};
        const coreTokenIds = new Set((designSystem.tokens || []).map(t => t.id));

        const platformOverrideSummary: Array<{ platformId: string; count: number }> = Object.entries(platformExtensions)
          .map(([platformId, ext]) => {
            const matches = (ext.tokenOverrides || []).filter(ov => ov && typeof ov.id === 'string' && coreTokenIds.has(ov.id)).length;
            return { platformId, count: matches };
          })
          .filter(e => e.count > 0);

        const themeOverrideSummary: Array<{ themeId: string; count: number }> = Object.entries(themeOverrides)
          .map(([themeId, ov]) => ({
            themeId,
            count: Array.isArray(ov?.tokenOverrides) ? ov.tokenOverrides.length : 0
          }))
          .filter(e => e.count > 0);

        const totalPlatformOverrides = platformOverrideSummary.reduce((sum, e) => sum + e.count, 0);
        const totalThemeOverrides = themeOverrideSummary.reduce((sum, e) => sum + e.count, 0);

        console.log('[GeminiAI][Diagnostics] Override counts:', {
          totalPlatformOverrides,
          totalThemeOverrides,
          byPlatform: platformOverrideSummary,
          byTheme: themeOverrideSummary
        });
      } catch (diagErr) {
        console.warn('[GeminiAI][Diagnostics] Failed to compute override diagnostics:', diagErr);
      }
      
      // Build context
      const context = GeminiContextBuilderInstance.buildDesignSystemContext(designSystem);
      
      // Check if context is within budget
      if (!GeminiContextBuilderInstance.isContextWithinBudget(context)) {
        throw new Error('This query would exceed your monthly budget. Please try a more specific question.');
      }

      // Make API call
      const response = await GeminiAIService.query(question, context);
      
      // Add messages to conversation
      setConversation(prev => [...prev, 
        { 
          type: 'user', 
          content: question, 
          timestamp: new Date() 
        },
        { 
          type: 'assistant', 
          content: response.answer, 
          timestamp: new Date(),
          cost: response.cost
        }
      ]);
      
      // Track usage
      GeminiCostManagerInstance.trackUsage(question, response.cost);
      
      // Update cost stats
      const metrics = GeminiCostManagerInstance.getUsageMetrics();
      const budgetStatus = GeminiCostManagerInstance.getBudgetStatus();
      
      setCostStats({
        monthlyQueries: metrics.monthlyQueries,
        monthlyCost: metrics.monthlyCost,
        averageCostPerQuery: metrics.costPerQuery,
        budgetStatus
      });

      console.log(`[GeminiAI] Query completed: $${response.cost.toFixed(4)}`);
      
    } catch (error) {
      console.error('[GeminiAI] Query failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Add error message to conversation
      setConversation(prev => [...prev, 
        { 
          type: 'user', 
          content: question, 
          timestamp: new Date() 
        },
        { 
          type: 'assistant', 
          content: `Sorry, I encountered an error: ${errorMessage}`,
          timestamp: new Date()
        }
      ]);

      // Show error toast
      toast({
        title: 'AI Query Failed',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentDesignSystemData, toast]);

  const clearConversation = useCallback(() => {
    setConversation([]);
  }, []);

  const updateBudgetSettings = useCallback((settings: Partial<BudgetSettings>) => {
    const newSettings = { ...budgetSettings, ...settings };
    setBudgetSettings(newSettings);
    GeminiCostManagerInstance.updateBudgetSettings(newSettings);
    
    toast({
      title: 'Settings Updated',
      description: 'Budget settings have been updated successfully.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  }, [budgetSettings, toast]);

  const contextValue: GeminiAIContextValue = {
    isAvailable: GeminiCostManagerInstance.isFeatureAvailable(),
    isLoading,
    conversation,
    askQuestion,
    clearConversation,
    costStats,
    budgetSettings,
    updateBudgetSettings
  };

  return (
    <GeminiAIContext.Provider value={contextValue}>
      {children}
    </GeminiAIContext.Provider>
  );
};
