import { useState, useEffect, useCallback } from 'react';
import { FigmaConfigurationService, type FigmaConfiguration } from '../services/figmaConfigurationService';
import type { SyntaxPatterns } from '../components/shared/SyntaxPatternsEditor';

export const useFigmaConfiguration = () => {
  const [configuration, setConfiguration] = useState<FigmaConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load configuration on mount
  useEffect(() => {
    const loadConfiguration = () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const config = FigmaConfigurationService.getConfiguration();
        if (config) {
          setConfiguration(config);
        } else {
          // Use default configuration if none exists
          const defaultConfig = FigmaConfigurationService.getDefaultConfiguration();
          setConfiguration(defaultConfig);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
        console.error('[useFigmaConfiguration] Error loading configuration:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, []);

  // Update syntax patterns
  const updateSyntaxPatterns = useCallback((syntaxPatterns: SyntaxPatterns) => {
    if (!configuration) return false;
    
    const success = FigmaConfigurationService.updateSyntaxPatterns(syntaxPatterns);
    if (success) {
      setConfiguration(prev => prev ? { ...prev, syntaxPatterns } : null);
    }
    return success;
  }, [configuration]);

  // Update file key
  const updateFileKey = useCallback((fileKey: string) => {
    if (!configuration) return false;
    
    const success = FigmaConfigurationService.updateFileKey(fileKey);
    if (success) {
      setConfiguration(prev => prev ? { ...prev, fileKey } : null);
    }
    return success;
  }, [configuration]);

  // Update access token
  const updateAccessToken = useCallback((accessToken: string) => {
    if (!configuration) return false;
    
    const success = FigmaConfigurationService.updateAccessToken(accessToken);
    if (success) {
      setConfiguration(prev => prev ? { ...prev, accessToken } : null);
    }
    return success;
  }, [configuration]);

  // Update auto publish settings
  const updateAutoPublishSettings = useCallback((autoPublish: boolean, publishStrategy: 'merge' | 'commit') => {
    if (!configuration) return false;
    
    const success = FigmaConfigurationService.updateAutoPublishSettings(autoPublish, publishStrategy);
    if (success) {
      setConfiguration(prev => prev ? { ...prev, autoPublish, publishStrategy } : null);
    }
    return success;
  }, [configuration]);

  // Save full configuration
  const saveConfiguration = useCallback((config: FigmaConfiguration) => {
    const success = FigmaConfigurationService.saveConfiguration(config);
    if (success) {
      setConfiguration(config);
    }
    return success;
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaultConfig = FigmaConfigurationService.getDefaultConfiguration();
    const success = FigmaConfigurationService.saveConfiguration(defaultConfig);
    if (success) {
      setConfiguration(defaultConfig);
    }
    return success;
  }, []);

  // Validate current configuration
  const validateConfiguration = useCallback(() => {
    if (!configuration) return { isValid: false, errors: ['No configuration loaded'] };
    return FigmaConfigurationService.validateConfiguration(configuration);
  }, [configuration]);

  return {
    configuration,
    isLoading,
    error,
    updateSyntaxPatterns,
    updateFileKey,
    updateAccessToken,
    updateAutoPublishSettings,
    saveConfiguration,
    resetToDefaults,
    validateConfiguration
  };
}; 