import { DataSourceManager } from './dataSourceManager';
import { MultiRepositoryManager } from './multiRepositoryManager';
import { StorageService } from './storage';

export interface SyntaxPatterns {
  prefix?: string;
  suffix?: string;
  delimiter?: '' | '_' | '-' | '.' | '/';
  capitalization?: 'none' | 'camel' | 'uppercase' | 'lowercase' | 'capitalize';
  formatString?: string;
}

export class PlatformSyntaxPatternService {
  private static instance: PlatformSyntaxPatternService;
  private multiRepositoryManager = MultiRepositoryManager.getInstance();

  private constructor() {}

  static getInstance(): PlatformSyntaxPatternService {
    if (!PlatformSyntaxPatternService.instance) {
      PlatformSyntaxPatternService.instance = new PlatformSyntaxPatternService();
    }
    return PlatformSyntaxPatternService.instance;
  }

  /**
   * Collect syntax patterns from all available platforms and store them in DataSourceContext
   */
  async collectAndStoreSyntaxPatterns(): Promise<void> {
    console.log('[PlatformSyntaxPatternService] === STARTING SYNTAX PATTERN COLLECTION ===');
    
    const syntaxPatterns: Record<string, SyntaxPatterns> = {};
    
    try {
      // Method 1: Get syntax patterns from core platforms (from main schema)
      console.log('[PlatformSyntaxPatternService] Method 1: Checking core platforms from StorageService...');
      const coreData = StorageService.getCoreData();
      console.log('[PlatformSyntaxPatternService] DEBUG - Core data systemId:', coreData?.systemId);
      console.log('[PlatformSyntaxPatternService] DEBUG - Core data systemName:', coreData?.systemName);
      
      // Use platforms from core data directly (ignore StorageService.getPlatforms() which returns example data)
      const platforms = coreData?.platforms || [];
      console.log('[PlatformSyntaxPatternService] Core platforms found:', platforms.length);
      console.log('[PlatformSyntaxPatternService] Core platform details:', platforms.map(p => ({ 
        id: p.id, 
        displayName: p.displayName,
        hasSyntaxPatterns: !!p.syntaxPatterns,
        syntaxPatterns: p.syntaxPatterns,
        extensionSource: p.extensionSource
      })));
      
      // Process platforms from core data
      for (const platform of platforms) {
        if (platform.syntaxPatterns) {
          syntaxPatterns[platform.id] = this.normalizeSyntaxPatterns(platform.syntaxPatterns);
          console.log(`[PlatformSyntaxPatternService] ✅ Collected syntax patterns for core platform: ${platform.id}`, platform.syntaxPatterns);
        } else {
          console.log(`[PlatformSyntaxPatternService] ❌ Core platform ${platform.id} has no syntax patterns`);
        }
      }

      // Method 1.5: Load platform extension files for platforms with extensionSource
      console.log('[PlatformSyntaxPatternService] Method 1.5: Loading platform extension files...');
      for (const platform of platforms) {
        if (platform.extensionSource) {
          console.log(`[PlatformSyntaxPatternService] Platform ${platform.id} has extensionSource:`, platform.extensionSource);
          try {
            // Load platform extension data from the referenced file
            const extensionData = await this.loadPlatformExtensionFile(platform.extensionSource);
            console.log(`[PlatformSyntaxPatternService] DEBUG - Extension data for ${platform.id}:`, {
              extensionData,
              hasSyntaxPatterns: !!extensionData?.syntaxPatterns,
              syntaxPatterns: extensionData?.syntaxPatterns,
              extensionDataKeys: extensionData ? Object.keys(extensionData) : 'null/undefined',
              extensionDataType: typeof extensionData
            });
            
            if (extensionData?.syntaxPatterns) {
              syntaxPatterns[platform.id] = this.normalizeSyntaxPatterns(extensionData.syntaxPatterns);
              console.log(`[PlatformSyntaxPatternService] ✅ Collected syntax patterns for platform ${platform.id} from extension file:`, extensionData.syntaxPatterns);
            } else {
              console.log(`[PlatformSyntaxPatternService] ❌ Platform extension file for ${platform.id} has no syntax patterns`);
            }
          } catch (error) {
            console.error(`[PlatformSyntaxPatternService] ❌ Error loading platform extension for ${platform.id}:`, error);
          }
        } else {
          console.log(`[PlatformSyntaxPatternService] Platform ${platform.id} has no extensionSource`);
        }
      }

      // Method 1.6: Get syntax patterns from figmaConfiguration if no platforms found
      if (platforms.length === 0) {
        console.log('[PlatformSyntaxPatternService] No platforms found, checking figmaConfiguration...');
        const coreData = StorageService.getCoreData();
        if (coreData?.figmaConfiguration?.syntaxPatterns) {
          syntaxPatterns['figma'] = this.normalizeSyntaxPatterns(coreData.figmaConfiguration.syntaxPatterns);
          console.log(`[PlatformSyntaxPatternService] ✅ Collected syntax patterns from figmaConfiguration:`, coreData.figmaConfiguration.syntaxPatterns);
        } else {
          console.log('[PlatformSyntaxPatternService] ❌ No figmaConfiguration.syntaxPatterns found');
        }
      }

      // Method 2: Get syntax patterns from platform extension data (from platform extension files)
      console.log('[PlatformSyntaxPatternService] Method 2: Checking platform extension data from StorageService...');
      const allPlatformExtensionData = StorageService.getAllPlatformExtensionData();
      console.log('[PlatformSyntaxPatternService] Platform extension data keys:', Object.keys(allPlatformExtensionData));
      console.log('[PlatformSyntaxPatternService] Platform extension data details:', Object.entries(allPlatformExtensionData).map(([id, data]) => ({
        id,
        hasSyntaxPatterns: !!data.syntaxPatterns,
        syntaxPatterns: data.syntaxPatterns
      })));
      
      for (const [platformId, extensionData] of Object.entries(allPlatformExtensionData)) {
        if (extensionData.syntaxPatterns) {
          syntaxPatterns[platformId] = this.normalizeSyntaxPatterns(extensionData.syntaxPatterns);
          console.log(`[PlatformSyntaxPatternService] ✅ Collected syntax patterns for platform extension: ${platformId}`, extensionData.syntaxPatterns);
        } else {
          console.log(`[PlatformSyntaxPatternService] ❌ Platform extension ${platformId} has no syntax patterns`);
        }
      }

      // Method 3: Get syntax patterns from MultiRepositoryManager (fallback)
      console.log('[PlatformSyntaxPatternService] Method 3: Checking MultiRepositoryManager...');
      const multiRepoData = this.multiRepositoryManager.getCurrentData();
      console.log('[PlatformSyntaxPatternService] MultiRepositoryManager data:', {
        hasPlatformExtensions: !!multiRepoData.platformExtensions,
        platformExtensionsSize: multiRepoData.platformExtensions?.size || 0
      });
      
      if (multiRepoData.platformExtensions && multiRepoData.platformExtensions.size > 0) {
        const platformExtensionKeys = Array.from(multiRepoData.platformExtensions.keys());
        console.log('[PlatformSyntaxPatternService] MultiRepositoryManager platform extension keys:', platformExtensionKeys);
        
        for (const [platformId, extension] of multiRepoData.platformExtensions) {
          console.log(`[PlatformSyntaxPatternService] Checking MultiRepositoryManager extension ${platformId}:`, {
            hasSyntaxPatterns: !!extension.syntaxPatterns,
            syntaxPatterns: extension.syntaxPatterns
          });
          
          if (extension.syntaxPatterns && !syntaxPatterns[platformId]) {
            syntaxPatterns[platformId] = this.normalizeSyntaxPatterns(extension.syntaxPatterns);
            console.log(`[PlatformSyntaxPatternService] ✅ Collected syntax patterns from MultiRepositoryManager for platform: ${platformId}`, extension.syntaxPatterns);
          } else if (extension.syntaxPatterns) {
            console.log(`[PlatformSyntaxPatternService] ⚠️ Skipping MultiRepositoryManager syntax patterns for ${platformId} (already collected from other source)`);
          } else {
            console.log(`[PlatformSyntaxPatternService] ❌ MultiRepositoryManager extension ${platformId} has no syntax patterns`);
          }
        }
      } else {
        console.log('[PlatformSyntaxPatternService] ❌ No platform extensions found in MultiRepositoryManager');
      }

      // Update DataSourceContext with collected patterns
      console.log('[PlatformSyntaxPatternService] Updating DataSourceContext...');
      const dataSourceManager = DataSourceManager.getInstance();
      const currentContext = dataSourceManager.getCurrentContext();
      console.log('[PlatformSyntaxPatternService] Current DataSourceContext before update:', {
        platformSyntaxPatterns: currentContext.platformSyntaxPatterns,
        platformSyntaxPatternsKeys: Object.keys(currentContext.platformSyntaxPatterns || {})
      });
      
      // Use the proper method to update platform syntax patterns
      dataSourceManager.updatePlatformSyntaxPatterns(syntaxPatterns);

      // Verify the context was updated
      const updatedContext = dataSourceManager.getCurrentContext();
      console.log('[PlatformSyntaxPatternService] DataSourceContext after update:', {
        platformSyntaxPatterns: updatedContext.platformSyntaxPatterns,
        platformSyntaxPatternsKeys: Object.keys(updatedContext.platformSyntaxPatterns || {}),
        platformSyntaxPatternsCount: Object.keys(updatedContext.platformSyntaxPatterns || {}).length
      });

      console.log(`[PlatformSyntaxPatternService] === COLLECTION COMPLETE ===`);
      console.log(`[PlatformSyntaxPatternService] Successfully collected syntax patterns for ${Object.keys(syntaxPatterns).length} platforms:`, Object.keys(syntaxPatterns));
      console.log('[PlatformSyntaxPatternService] Final syntax patterns object:', syntaxPatterns);
      
    } catch (error) {
      console.error('[PlatformSyntaxPatternService] ❌ Error collecting syntax patterns:', error);
    }
  }

  /**
   * Get syntax patterns for a specific platform
   */
  getSyntaxPatternsForPlatform(platformId: string): SyntaxPatterns | null {
    const dataSourceManager = DataSourceManager.getInstance();
    const currentContext = dataSourceManager.getCurrentContext();
    return currentContext.platformSyntaxPatterns[platformId] || null;
  }

  /**
   * Get syntax patterns for all platforms
   */
  getAllSyntaxPatterns(): Record<string, SyntaxPatterns> {
    const dataSourceManager = DataSourceManager.getInstance();
    const currentContext = dataSourceManager.getCurrentContext();
    return { ...currentContext.platformSyntaxPatterns };
  }

  /**
   * Get syntax patterns based on current source context
   * - For core source: returns all platform syntax patterns
   * - For platform source: returns only the selected platform's syntax patterns
   */
  async getSyntaxPatternsForCurrentContext(): Promise<Record<string, SyntaxPatterns>> {
    console.log('[PlatformSyntaxPatternService] getSyntaxPatternsForCurrentContext called');
    const dataSourceManager = DataSourceManager.getInstance();
    const currentContext = dataSourceManager.getCurrentContext();
    const allPatterns = currentContext.platformSyntaxPatterns;
    
    console.log('[PlatformSyntaxPatternService] Current context details:', {
      editModeSourceType: currentContext.editMode.sourceType,
      editModeSourceId: currentContext.editMode.sourceId,
      currentPlatform: currentContext.currentPlatform,
      allPatterns,
      allPatternsKeys: Object.keys(allPatterns || {}),
      allPatternsCount: Object.keys(allPatterns || {}).length,
      allPatternsType: typeof allPatterns,
      allPatternsString: JSON.stringify(allPatterns)
    });
    
    // If no patterns have been collected yet, trigger collection
    if (Object.keys(allPatterns || {}).length === 0) {
      console.log('[PlatformSyntaxPatternService] No patterns found, triggering collection...');
      // For immediate use, collect patterns synchronously
      try {
        await this.collectAndStoreSyntaxPatterns();
        // Get the updated context after collection
        const updatedContext = dataSourceManager.getCurrentContext();
        const updatedPatterns = updatedContext.platformSyntaxPatterns;
        console.log('[PlatformSyntaxPatternService] Collection completed, updated patterns:', {
          updatedPatterns,
          updatedPatternsKeys: Object.keys(updatedPatterns || {}),
          updatedPatternsCount: Object.keys(updatedPatterns || {}).length
        });
        return updatedPatterns || {};
      } catch (error) {
        console.error('[PlatformSyntaxPatternService] Error during collection:', error);
        return {};
      }
    }
    
    // If we're in core mode, return all patterns
    if (!currentContext.currentPlatform || currentContext.currentPlatform === 'none') {
      console.log('[PlatformSyntaxPatternService] Core mode detected, returning all patterns:', {
        allPatterns,
        allPatternsKeys: Object.keys(allPatterns || {}),
        allPatternsCount: Object.keys(allPatterns || {}).length
      });
      return allPatterns;
    }
    
    // If we're in platform mode, return only the current platform's patterns
    const currentPlatformPatterns: Record<string, SyntaxPatterns> = {};
    if (allPatterns[currentContext.currentPlatform]) {
      currentPlatformPatterns[currentContext.currentPlatform] = allPatterns[currentContext.currentPlatform];
      console.log('[PlatformSyntaxPatternService] Platform mode detected, returning current platform patterns:', {
        currentPlatform: currentContext.currentPlatform,
        currentPlatformPatterns,
        currentPlatformPatternsKeys: Object.keys(currentPlatformPatterns),
        currentPlatformPatternsCount: Object.keys(currentPlatformPatterns).length
      });
    } else {
      console.log('[PlatformSyntaxPatternService] Platform mode detected but no patterns found for current platform:', {
        currentPlatform: currentContext.currentPlatform,
        availablePatterns: Object.keys(allPatterns || {})
      });
    }
    
    return currentPlatformPatterns;
  }

  /**
   * Normalize syntax patterns to ensure consistent format
   */
  private normalizeSyntaxPatterns(patterns: Record<string, unknown>): SyntaxPatterns {
    return {
      prefix: (patterns.prefix as string) || '',
      suffix: (patterns.suffix as string) || '',
      delimiter: (patterns.delimiter as '' | '_' | '-' | '.' | '/') || '_',
      capitalization: (patterns.capitalization as 'none' | 'camel' | 'uppercase' | 'lowercase' | 'capitalize') || 'none',
      formatString: (patterns.formatString as string) || ''
    };
  }

  /**
   * Load platform extension file from the specified source
   */
  private async loadPlatformExtensionFile(extensionSource: { repositoryUri: string; filePath: string }): Promise<{ syntaxPatterns?: Record<string, unknown> } | null> {
    console.log('[PlatformSyntaxPatternService] Loading platform extension file:', extensionSource);
    
    try {
      // Try to get from StorageService first (if already loaded)
      const storedData = StorageService.getPlatformExtensionData(extensionSource.repositoryUri);
      if (storedData) {
        console.log('[PlatformSyntaxPatternService] Found platform extension data in storage:', {
          storedData,
          hasSyntaxPatterns: !!storedData.syntaxPatterns,
          syntaxPatterns: storedData.syntaxPatterns,
          storedDataKeys: Object.keys(storedData),
          storedDataType: typeof storedData
        });
        return storedData;
      }

      // If not in storage, try to load from GitHub
      const url = `https://raw.githubusercontent.com/${extensionSource.repositoryUri}/main/${extensionSource.filePath}`;
      console.log('[PlatformSyntaxPatternService] Loading from GitHub:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load platform extension: ${response.status} ${response.statusText}`);
      }
      
      const extensionData = await response.json();
      console.log('[PlatformSyntaxPatternService] Loaded platform extension data:', extensionData);
      
      // Store in StorageService for future use
      StorageService.setPlatformExtensionData(extensionSource.repositoryUri, extensionData);
      
      return extensionData;
    } catch (error) {
      console.error('[PlatformSyntaxPatternService] Error loading platform extension file:', error);
      throw error;
    }
  }

  /**
   * Refresh syntax patterns (called when data is reloaded)
   */
  async refreshSyntaxPatterns(): Promise<void> {
    console.log('[PlatformSyntaxPatternService] Refreshing syntax patterns...');
    await this.collectAndStoreSyntaxPatterns();
  }
} 