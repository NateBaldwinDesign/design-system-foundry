/**
 * Service for managing Figma tempToRealId mappings
 * This service handles storing and retrieving the mapping between temporary IDs
 * used during transformation and the real Figma IDs returned by the API
 */

import { GitHubApiService } from './githubApi';

export interface FigmaMappingData {
  fileKey: string;
  systemId: string;
  lastUpdated: string;
  tempToRealId: Record<string, string>;
  metadata?: {
    figmaFileName?: string;
    collectionName?: string;
    exportVersion?: string;
    exportedFrom?: string;
    lastExport?: string;
  };
  repositoryContext?: {
    owner: string;
    repo: string;
    type: 'core' | 'platform-extension' | 'theme-override';
    systemId: string;
    themeId?: string;
  };
}

export interface RepositoryInfo {
  owner: string;
  repo: string;
  type: 'core' | 'platform-extension' | 'theme-override';
  systemId: string;
  themeId?: string;
}

export class FigmaMappingService {
  private static readonly STORAGE_KEY_PREFIX = 'figma-mapping:';
  private static readonly FIGMA_DIR = '.figma';
  private static readonly MAPPINGS_DIR = `${FigmaMappingService.FIGMA_DIR}/mappings`;
  
  // Debounce auto-commit to prevent race conditions
  private static autoCommitTimers: Map<string, NodeJS.Timeout> = new Map();
  private static readonly AUTO_COMMIT_DEBOUNCE_MS = 10000; // 10 seconds

  /**
   * Save tempToRealId mapping for a specific Figma file (localStorage only)
   */
  static saveMapping(fileKey: string, mappingData: FigmaMappingData): void {
    const storageKey = `${this.STORAGE_KEY_PREFIX}${fileKey}`;
    const dataToStore = {
      ...mappingData,
      lastUpdated: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(dataToStore));
      console.log(`[FigmaMappingService] Saved mapping for file ${fileKey}:`, dataToStore);
    } catch (error) {
      console.error(`[FigmaMappingService] Failed to save mapping for file ${fileKey}:`, error);
    }
  }

  /**
   * Save mapping data to GitHub repository
   */
  static async saveMappingToGitHub(
    fileKey: string, 
    mappingData: FigmaMappingData, 
    repoInfo: RepositoryInfo
  ): Promise<void> {
    try {
      // Ensure the .figma directory structure exists
      await this.ensureFigmaDirectory(repoInfo.owner, repoInfo.repo);
      
      const filename = `${this.MAPPINGS_DIR}/${fileKey}.json`;
      
      // Enhance mapping data with repository context
      const enhancedMappingData: FigmaMappingData = {
        ...mappingData,
        repositoryContext: {
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          type: repoInfo.type,
          systemId: repoInfo.systemId,
          themeId: repoInfo.themeId
        },
        lastUpdated: new Date().toISOString()
      };
      
      const content = JSON.stringify(enhancedMappingData, null, 2);
      const commitMessage = `AUTOCOMMIT: Update Figma mapping for ${fileKey} - ${new Date().toLocaleString()}`;
      
      // Get the current file SHA if it exists
      let currentSha: string | undefined;
      try {
        const existingFile = await GitHubApiService.getFileContent(
          `${repoInfo.owner}/${repoInfo.repo}`,
          filename,
          'main'
        );
        currentSha = existingFile.sha;
        console.log(`[FigmaMappingService] Found existing file with SHA: ${currentSha}`);
      } catch (error) {
        // File doesn't exist, which is fine for creating new files
        console.log(`[FigmaMappingService] File doesn't exist, will create new: ${filename}`);
      }
      
      // Try to update existing file, create if doesn't exist
      try {
        await GitHubApiService.createOrUpdateFile(
          `${repoInfo.owner}/${repoInfo.repo}`,
          filename,
          content,
          'main', // Default branch
          commitMessage
        );
        console.log(`[FigmaMappingService] Successfully saved mapping to GitHub: ${filename}`);
      } catch (error) {
        // If we get a 409 conflict, it means the file was modified by someone else
        // Try to get the latest SHA and retry with exponential backoff
        if (error instanceof Error && error.message.includes('409')) {
          console.log(`[FigmaMappingService] Got 409 conflict, retrying with exponential backoff...`);
          
          // Try up to 3 times with exponential backoff
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              // Exponential backoff: 2^attempt seconds (2s, 4s, 8s)
              const delay = Math.pow(2, attempt) * 1000;
              console.log(`[FigmaMappingService] Retry attempt ${attempt}/3, waiting ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              
              // Retry - GitHubApiService will automatically fetch the latest SHA
              await GitHubApiService.createOrUpdateFile(
                `${repoInfo.owner}/${repoInfo.repo}`,
                filename,
                content,
                'main',
                commitMessage
              );
              console.log(`[FigmaMappingService] Successfully saved mapping to GitHub after retry attempt ${attempt}: ${filename}`);
              return; // Success, exit the retry loop
            } catch (retryError) {
              console.warn(`[FigmaMappingService] Retry attempt ${attempt}/3 failed:`, retryError);
              if (attempt === 3) {
                // Final attempt failed
                console.error(`[FigmaMappingService] All retry attempts failed for file ${fileKey}`);
                throw retryError;
              }
              // Continue to next attempt
            }
          }
        } else {
          console.error(`[FigmaMappingService] Failed to save mapping to GitHub:`, error);
          throw error;
        }
      }
    } catch (error) {
      console.error(`[FigmaMappingService] Failed to save mapping to GitHub for file ${fileKey}:`, error);
      throw error;
    }
  }

  /**
   * Ensure the .figma directory structure exists in the repository
   */
  private static async ensureFigmaDirectory(owner: string, repo: string): Promise<void> {
    const directories = [
      this.FIGMA_DIR,
      this.MAPPINGS_DIR,
      `${this.FIGMA_DIR}/cache`,
      `${this.FIGMA_DIR}/config`
    ];
    
    for (const dir of directories) {
      try {
        // Try to create a .gitkeep file in each directory to ensure it exists
        const gitkeepPath = `${dir}/.gitkeep`;
        await GitHubApiService.createFile(
          `${owner}/${repo}`,
          gitkeepPath,
          '# This file ensures the directory is tracked by Git\n',
          'main',
          `Add .gitkeep for ${dir} directory`
        );
        console.log(`[FigmaMappingService] Created directory structure: ${dir}`);
      } catch (error) {
        // Directory might already exist, which is fine
        console.log(`[FigmaMappingService] Directory ${dir} might already exist:`, error);
      }
    }
  }

  /**
   * Get tempToRealId mapping from GitHub repository
   */
  static async getMappingFromGitHub(
    fileKey: string, 
    repoInfo: RepositoryInfo
  ): Promise<FigmaMappingData | null> {
    try {
      const filename = `${this.MAPPINGS_DIR}/${fileKey}.json`;
      const fileData = await GitHubApiService.getFileContent(
        `${repoInfo.owner}/${repoInfo.repo}`,
        filename,
        'main'
      );
      
      const mappingData = JSON.parse(fileData.content) as FigmaMappingData;
      
      // Validate that the mapping belongs to the correct system
      if (mappingData.systemId !== repoInfo.systemId) {
        console.warn(`[FigmaMappingService] System ID mismatch for mapping ${fileKey}: expected ${repoInfo.systemId}, got ${mappingData.systemId}`);
        return null;
      }
      
      console.log(`[FigmaMappingService] Retrieved mapping from GitHub for file ${fileKey}:`, mappingData);
      return mappingData;
    } catch (error) {
      console.log(`[FigmaMappingService] No mapping found in GitHub for file ${fileKey}:`, error);
      return null;
    }
  }

  /**
   * Check if GitHub integration is available
   */
  static async isGitHubIntegrationAvailable(): Promise<boolean> {
    // Check if we have a selected repository using the newer GitHubApiService
    try {
      const { GitHubApiService } = await import('./githubApi');
      return GitHubApiService.hasSelectedRepository();
    } catch (error) {
      console.error('[FigmaMappingService] Failed to check GitHub integration availability:', error);
      // Fallback to old method
      const selectedRepo = localStorage.getItem('github_selected_repo');
      return selectedRepo !== null;
    }
  }

  /**
   * Get current repository info from localStorage
   */
  static async getCurrentRepositoryInfo(): Promise<RepositoryInfo | null> {
    try {
      // Use the newer GitHubApiService method first
      const { GitHubApiService } = await import('./githubApi');
      const selectedRepo = GitHubApiService.getSelectedRepositoryInfo();
      
      if (selectedRepo) {
        // Convert the newer format to our RepositoryInfo format
        const [owner, repo] = selectedRepo.fullName.split('/');
        return {
          owner,
          repo,
          type: selectedRepo.fileType === 'theme-override' ? 'theme-override' : 'core',
          systemId: 'design-system', // Default system ID
          themeId: selectedRepo.fileType === 'theme-override' ? 'default-theme' : undefined
        };
      }
      
      // Fallback to old method
      const selectedRepoStr = localStorage.getItem('github_selected_repo');
      if (!selectedRepoStr) return null;
      
      const repoData = JSON.parse(selectedRepoStr);
      return {
        owner: repoData.owner || repoData.fullName?.split('/')[0],
        repo: repoData.repo || repoData.fullName?.split('/')[1],
        type: repoData.fileType === 'theme-override' ? 'theme-override' : 'core',
        systemId: 'design-system', // Default system ID
        themeId: repoData.fileType === 'theme-override' ? 'default-theme' : undefined
      };
    } catch (error) {
      console.error('[FigmaMappingService] Failed to get current repository info:', error);
      return null;
    }
  }

  /**
   * Test GitHub connection
   */
  static async testGitHubConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const repoInfo = await this.getCurrentRepositoryInfo();
      if (!repoInfo) {
        return {
          success: false,
          message: 'No GitHub repository selected'
        };
      }
      
      // Try to access the repository
      await GitHubApiService.getFileContent(
        `${repoInfo.owner}/${repoInfo.repo}`,
        'README.md',
        'main'
      );
      
      return {
        success: true,
        message: `Successfully connected to ${repoInfo.owner}/${repoInfo.repo}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect to GitHub: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get tempToRealId mapping for a specific Figma file
   */
  static getMapping(fileKey: string): FigmaMappingData | null {
    const storageKey = `${this.STORAGE_KEY_PREFIX}${fileKey}`;
    
    try {
      const storedData = localStorage.getItem(storageKey);
      if (!storedData) {
        console.log(`[FigmaMappingService] No mapping found for file ${fileKey}`);
        return null;
      }
      
      const mappingData = JSON.parse(storedData) as FigmaMappingData;
      console.log(`[FigmaMappingService] Retrieved mapping for file ${fileKey}:`, mappingData);
      return mappingData;
    } catch (error) {
      console.error(`[FigmaMappingService] Failed to retrieve mapping for file ${fileKey}:`, error);
      return null;
    }
  }

  /**
   * Update tempToRealId mapping from Figma API response
   * This processes the response from the Figma Variables API and updates the mapping
   */
  static async updateMappingFromApiResponse(
    fileKey: string, 
    apiResponse: Record<string, unknown>
  ): Promise<void> {
    console.log(`[FigmaMappingService] Processing API response for file ${fileKey}:`, apiResponse);
    console.log(`[FigmaMappingService] API response keys:`, Object.keys(apiResponse));
    
    // Extract the new tempToRealId mapping from the API response
    const newMapping: Record<string, string> = {};
    
    // Debug: Log the structure of the response
    if (apiResponse.variables) {
      console.log(`[FigmaMappingService] Variables structure:`, typeof apiResponse.variables, apiResponse.variables);
    }
    if (apiResponse.variableCollections) {
      console.log(`[FigmaMappingService] VariableCollections structure:`, typeof apiResponse.variableCollections, apiResponse.variableCollections);
    }
    if (apiResponse.meta) {
      console.log(`[FigmaMappingService] Meta structure:`, typeof apiResponse.meta, apiResponse.meta);
    }
    
    // Process variables - handle different possible response structures
    if (apiResponse.variables && typeof apiResponse.variables === 'object') {
      const variables = apiResponse.variables as Record<string, unknown>;
      console.log(`[FigmaMappingService] Processing variables:`, variables);
      
      for (const [tempId, variableData] of Object.entries(variables)) {
        console.log(`[FigmaMappingService] Processing variable entry:`, tempId, variableData);
        const variable = variableData as Record<string, unknown>;
        if (variable.id && typeof variable.id === 'string') {
          newMapping[tempId] = variable.id;
          console.log(`[FigmaMappingService] Mapped variable ${tempId} -> ${variable.id}`);
        } else {
          console.warn(`[FigmaMappingService] Variable ${tempId} missing or invalid id:`, variable.id);
        }
      }
    }
    
    // Process collections - handle different possible response structures
    if (apiResponse.variableCollections && typeof apiResponse.variableCollections === 'object') {
      const collections = apiResponse.variableCollections as Record<string, unknown>;
      console.log(`[FigmaMappingService] Processing collections:`, collections);
      
      for (const [tempId, collectionData] of Object.entries(collections)) {
        console.log(`[FigmaMappingService] Processing collection entry:`, tempId, collectionData);
        const collection = collectionData as Record<string, unknown>;
        if (collection.id && typeof collection.id === 'string') {
          newMapping[tempId] = collection.id;
          console.log(`[FigmaMappingService] Mapped collection ${tempId} -> ${collection.id}`);
        } else {
          console.warn(`[FigmaMappingService] Collection ${tempId} missing or invalid id:`, collection.id);
        }
      }
    }
    
    // Check the meta object for mapping data (this is likely where the actual data is)
    if (apiResponse.meta && typeof apiResponse.meta === 'object') {
      const meta = apiResponse.meta as Record<string, unknown>;
      console.log(`[FigmaMappingService] Processing meta object:`, meta);
      console.log(`[FigmaMappingService] Meta keys:`, Object.keys(meta));
      
      // Debug: Log the exact structure of tempIdToRealId if it exists
      if (meta.tempIdToRealId) {
        console.log(`[FigmaMappingService] tempIdToRealId structure:`, typeof meta.tempIdToRealId, meta.tempIdToRealId);
        if (typeof meta.tempIdToRealId === 'object') {
          console.log(`[FigmaMappingService] tempIdToRealId keys:`, Object.keys(meta.tempIdToRealId as Record<string, unknown>));
        }
      }
      
      // Check if meta contains variables
      if (meta.variables && typeof meta.variables === 'object') {
        const variables = meta.variables as Record<string, unknown>;
        console.log(`[FigmaMappingService] Processing meta.variables:`, variables);
        
        for (const [tempId, variableData] of Object.entries(variables)) {
          console.log(`[FigmaMappingService] Processing meta variable entry:`, tempId, variableData);
          const variable = variableData as Record<string, unknown>;
          if (variable.id && typeof variable.id === 'string') {
            newMapping[tempId] = variable.id;
            console.log(`[FigmaMappingService] Mapped meta variable ${tempId} -> ${variable.id}`);
          } else {
            console.warn(`[FigmaMappingService] Meta variable ${tempId} missing or invalid id:`, variable.id);
          }
        }
      }
      
      // Check if meta contains variableCollections
      if (meta.variableCollections && typeof meta.variableCollections === 'object') {
        const collections = meta.variableCollections as Record<string, unknown>;
        console.log(`[FigmaMappingService] Processing meta.variableCollections:`, collections);
        
        for (const [tempId, collectionData] of Object.entries(collections)) {
          console.log(`[FigmaMappingService] Processing meta collection entry:`, tempId, collectionData);
          const collection = collectionData as Record<string, unknown>;
          if (collection.id && typeof collection.id === 'string') {
            newMapping[tempId] = collection.id;
            console.log(`[FigmaMappingService] Mapped meta collection ${tempId} -> ${collection.id}`);
          } else {
            console.warn(`[FigmaMappingService] Meta collection ${tempId} missing or invalid id:`, collection.id);
          }
        }
      }
      
      // Check if meta contains the mapping directly (tempToRealId or tempIdToRealId)
      if (meta.tempToRealId && typeof meta.tempToRealId === 'object') {
        const tempToRealId = meta.tempToRealId as Record<string, unknown>;
        console.log(`[FigmaMappingService] Processing meta.tempToRealId:`, tempToRealId);
        
        for (const [key, value] of Object.entries(tempToRealId)) {
          if (typeof value === 'string') {
            newMapping[key] = value;
            console.log(`[FigmaMappingService] Found meta tempToRealId mapping ${key} -> ${value}`);
          }
        }
      }
      
      // Check for tempIdToRealId (the actual structure from the API)
      if (meta.tempIdToRealId && typeof meta.tempIdToRealId === 'object') {
        const tempIdToRealId = meta.tempIdToRealId as Record<string, unknown>;
        console.log(`[FigmaMappingService] Processing meta.tempIdToRealId:`, tempIdToRealId);
        
        for (const [key, value] of Object.entries(tempIdToRealId)) {
          if (typeof value === 'string') {
            newMapping[key] = value;
            console.log(`[FigmaMappingService] Found meta tempIdToRealId mapping ${key} -> ${value}`);
          }
        }
      }
      
      // Check if meta contains created/updated items
      if (meta.created && typeof meta.created === 'object') {
        const created = meta.created as Record<string, unknown>;
        console.log(`[FigmaMappingService] Processing meta.created:`, created);
        
        // Process created variables
        if (created.variables && typeof created.variables === 'object') {
          const variables = created.variables as Record<string, unknown>;
          for (const [tempId, variableData] of Object.entries(variables)) {
            const variable = variableData as Record<string, unknown>;
            if (variable.id && typeof variable.id === 'string') {
              newMapping[tempId] = variable.id;
              console.log(`[FigmaMappingService] Mapped created variable ${tempId} -> ${variable.id}`);
            }
          }
        }
        
        // Process created collections
        if (created.variableCollections && typeof created.variableCollections === 'object') {
          const collections = created.variableCollections as Record<string, unknown>;
          for (const [tempId, collectionData] of Object.entries(collections)) {
            const collection = collectionData as Record<string, unknown>;
            if (collection.id && typeof collection.id === 'string') {
              newMapping[tempId] = collection.id;
              console.log(`[FigmaMappingService] Mapped created collection ${tempId} -> ${collection.id}`);
            }
          }
        }
      }
      
      if (meta.updated && typeof meta.updated === 'object') {
        const updated = meta.updated as Record<string, unknown>;
        console.log(`[FigmaMappingService] Processing meta.updated:`, updated);
        
        // Process updated variables
        if (updated.variables && typeof updated.variables === 'object') {
          const variables = updated.variables as Record<string, unknown>;
          for (const [tempId, variableData] of Object.entries(variables)) {
            const variable = variableData as Record<string, unknown>;
            if (variable.id && typeof variable.id === 'string') {
              newMapping[tempId] = variable.id;
              console.log(`[FigmaMappingService] Mapped updated variable ${tempId} -> ${variable.id}`);
            }
          }
        }
        
        // Process updated collections
        if (updated.variableCollections && typeof updated.variableCollections === 'object') {
          const collections = updated.variableCollections as Record<string, unknown>;
          for (const [tempId, collectionData] of Object.entries(collections)) {
            const collection = collectionData as Record<string, unknown>;
            if (collection.id && typeof collection.id === 'string') {
              newMapping[tempId] = collection.id;
              console.log(`[FigmaMappingService] Mapped updated collection ${tempId} -> ${collection.id}`);
            }
          }
        }
      }
    }
    
    // Alternative: Check if the response has a different structure
    // Some APIs return the mapping directly in a different format
    if (Object.keys(newMapping).length === 0) {
      console.log(`[FigmaMappingService] No mappings found in standard structure, checking alternative formats...`);
      
      // Check if the response itself is the mapping
      if (typeof apiResponse === 'object' && apiResponse !== null) {
        for (const [key, value] of Object.entries(apiResponse)) {
          if (typeof value === 'string' && (key.includes('token') || key.includes('collection') || key.includes('variable'))) {
            newMapping[key] = value;
            console.log(`[FigmaMappingService] Found direct mapping ${key} -> ${value}`);
          }
        }
      }
      
      // Check if there's a nested mapping structure
      if (apiResponse.mapping && typeof apiResponse.mapping === 'object') {
        const mapping = apiResponse.mapping as Record<string, unknown>;
        for (const [key, value] of Object.entries(mapping)) {
          if (typeof value === 'string') {
            newMapping[key] = value;
            console.log(`[FigmaMappingService] Found nested mapping ${key} -> ${value}`);
          }
        }
      }
      
      // Check if there's a tempToRealId field directly
      if (apiResponse.tempToRealId && typeof apiResponse.tempToRealId === 'object') {
        const tempToRealId = apiResponse.tempToRealId as Record<string, unknown>;
        for (const [key, value] of Object.entries(tempToRealId)) {
          if (typeof value === 'string') {
            newMapping[key] = value;
            console.log(`[FigmaMappingService] Found tempToRealId mapping ${key} -> ${value}`);
          }
        }
      }
    }
    
    console.log(`[FigmaMappingService] Extracted new mappings:`, newMapping);
    console.log(`[FigmaMappingService] Total new mappings found:`, Object.keys(newMapping).length);
    
    // Merge with existing mapping
    const existingMapping = this.getMapping(fileKey);
    const mergedMapping = {
      ...existingMapping?.tempToRealId,
      ...newMapping
    };
    
    console.log(`[FigmaMappingService] Existing mappings:`, existingMapping?.tempToRealId);
    console.log(`[FigmaMappingService] Merged mappings:`, mergedMapping);
    
    // Save the updated mapping
    const mappingData: FigmaMappingData = {
      fileKey,
      systemId: existingMapping?.systemId || 'design-system',
      lastUpdated: new Date().toISOString(),
      tempToRealId: mergedMapping,
      metadata: {
        ...existingMapping?.metadata,
        lastExport: new Date().toISOString()
      }
    };
    
    // Save to localStorage
    this.saveMapping(fileKey, mappingData);
    
    // Save to GitHub if available
    const repoInfo = await this.getCurrentRepositoryInfo();
    const isGitHubAvailable = await this.isGitHubIntegrationAvailable();
    
    console.log(`[FigmaMappingService] Auto-commit check for file ${fileKey}:`, {
      hasRepoInfo: !!repoInfo,
      isGitHubAvailable,
      repoInfo: repoInfo ? {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        type: repoInfo.type
      } : null
    });
    
    if (repoInfo && isGitHubAvailable) {
      // Clear any existing timer for this file
      const existingTimer = this.autoCommitTimers.get(fileKey);
      if (existingTimer) {
        clearTimeout(existingTimer);
        console.log(`[FigmaMappingService] Cleared existing auto-commit timer for file ${fileKey}`);
      }
      
      // Set up debounced auto-commit
      const timer = setTimeout(async () => {
        try {
          console.log(`[FigmaMappingService] Executing debounced auto-commit for file ${fileKey}...`);
          await this.saveMappingToGitHub(fileKey, mappingData, repoInfo);
          console.log(`[FigmaMappingService] ✅ Successfully auto-committed mapping to both localStorage and GitHub for file ${fileKey}`);
        } catch (error) {
          console.error(`[FigmaMappingService] ❌ Failed to auto-commit mapping to GitHub for file ${fileKey}:`, error);
          // Continue with localStorage only if GitHub save fails
        } finally {
          // Clean up timer reference
          this.autoCommitTimers.delete(fileKey);
        }
      }, this.AUTO_COMMIT_DEBOUNCE_MS);
      
      this.autoCommitTimers.set(fileKey, timer);
      console.log(`[FigmaMappingService] Scheduled debounced auto-commit for file ${fileKey} in ${this.AUTO_COMMIT_DEBOUNCE_MS}ms`);
    } else {
      console.log(`[FigmaMappingService] ⚠️ GitHub integration not available for auto-commit, saved mapping to localStorage only for file ${fileKey}`);
      if (!repoInfo) {
        console.log(`[FigmaMappingService] Reason: No repository info available`);
      }
      if (!isGitHubAvailable) {
        console.log(`[FigmaMappingService] Reason: GitHub integration not available`);
      }
    }
    
    console.log(`[FigmaMappingService] Updated mapping for file ${fileKey}:`, mappingData);
  }

  /**
   * Clear mapping for a specific file
   */
  static clearMapping(fileKey: string): void {
    const storageKey = `${this.STORAGE_KEY_PREFIX}${fileKey}`;
    localStorage.removeItem(storageKey);
    console.log(`[FigmaMappingService] Cleared mapping for file ${fileKey}`);
  }

  /**
   * List all stored mappings
   */
  static listAllMappings(): FigmaMappingData[] {
    const mappings: FigmaMappingData[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_KEY_PREFIX)) {
        try {
          const mappingData = JSON.parse(localStorage.getItem(key) || '');
          mappings.push(mappingData);
        } catch (error) {
          console.error(`[FigmaMappingService] Failed to parse mapping from key ${key}:`, error);
        }
      }
    }
    
    return mappings;
  }

  /**
   * Get tempToRealId mapping for transformer options
   */
  static async getTransformerOptions(fileKey: string): Promise<{ tempToRealId?: Record<string, string> }> {
    console.log(`[FigmaMappingService] Getting transformer options for fileKey: ${fileKey}`);
    
    // First try to get from localStorage
    const localMapping = this.getMapping(fileKey);
    if (localMapping?.tempToRealId) {
      console.log(`[FigmaMappingService] ✅ Found mapping in localStorage for ${fileKey}:`, {
        mappingCount: Object.keys(localMapping.tempToRealId).length,
        sampleMappings: Object.entries(localMapping.tempToRealId).slice(0, 5)
      });
      return {
        tempToRealId: localMapping.tempToRealId
      };
    }
    
    // If not found in localStorage, try to load from GitHub
    console.log(`[FigmaMappingService] No mapping found in localStorage, trying GitHub...`);
    const repoInfo = await this.getCurrentRepositoryInfo();
    const isGitHubAvailable = await this.isGitHubIntegrationAvailable();
    if (repoInfo && isGitHubAvailable) {
      try {
        const githubMapping = await this.getMappingFromGitHub(fileKey, repoInfo);
        if (githubMapping?.tempToRealId) {
          console.log(`[FigmaMappingService] ✅ Found mapping in GitHub for ${fileKey}:`, {
            mappingCount: Object.keys(githubMapping.tempToRealId).length,
            sampleMappings: Object.entries(githubMapping.tempToRealId).slice(0, 5)
          });
          
          // Save to localStorage for future use
          this.saveMapping(fileKey, githubMapping);
          
          return {
            tempToRealId: githubMapping.tempToRealId
          };
        } else {
          console.log(`[FigmaMappingService] ❌ No mapping found in GitHub for ${fileKey}`);
        }
      } catch (error) {
        console.error(`[FigmaMappingService] Error loading mapping from GitHub for ${fileKey}:`, error);
      }
    } else {
      console.log(`[FigmaMappingService] GitHub integration not available for ${fileKey}`);
    }
    
    console.log(`[FigmaMappingService] ❌ No mapping found anywhere for ${fileKey}`);
    return {
      tempToRealId: undefined
    };
  }
} 