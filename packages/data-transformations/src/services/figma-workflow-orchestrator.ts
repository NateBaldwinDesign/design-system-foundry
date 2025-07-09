import type { TokenSystem } from '@token-model/data-model';
import type { 
  FigmaTransformerOptions, 
  FigmaTransformationResult,
  FigmaFileVariablesResponse,
  FigmaCreateVariablesResponse
} from '../types/figma';
import { FigmaTransformer } from '../transformers/figma';
import { FigmaIdManager } from './figma-id-manager';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Orchestrates the complete Figma integration workflow
 * Implements the 8-step process as specified in the requirements
 */
export class FigmaWorkflowOrchestrator {
  private transformer: FigmaTransformer;
  private idManager: FigmaIdManager;

  constructor() {
    this.transformer = new FigmaTransformer();
    this.idManager = new FigmaIdManager();
  }

  /**
   * Execute the complete 8-step Figma integration workflow
   */
  async executeWorkflow(
    tokenSystem: TokenSystem,
    options: FigmaTransformerOptions
  ): Promise<{
    success: boolean;
    result?: FigmaTransformationResult;
    error?: string;
    tempToRealIdMapping?: Record<string, string>;
  }> {
    try {
      console.log('[FigmaWorkflowOrchestrator] Starting 8-step workflow');

      // Step 1: GET local variables from Figma file ('variables/local' endpoint)
      const existingFigmaData = await this.getLocalVariables(options);
      console.log('[FigmaWorkflowOrchestrator] Step 1: Retrieved local variables');

      // Step 2: Get tempToRealId from .figma/mappings/{fileid}.json
      const tempToRealId = await this.loadTempToRealIdMapping(options.fileKey);
      console.log('[FigmaWorkflowOrchestrator] Step 2: Loaded tempToRealId mapping');

      // Step 3: Prune tempToRealId by removing non-existent Figma IDs
      const prunedTempToRealId = this.pruneTempToRealIdMapping(tempToRealId, existingFigmaData);
      console.log('[FigmaWorkflowOrchestrator] Step 3: Pruned tempToRealId mapping');

      // Step 4: Transform canonical data to Figma POST format
      const transformationOptions: FigmaTransformerOptions = {
        ...options,
        existingFigmaData,
        tempToRealId: prunedTempToRealId
      };

      const transformationResult = await this.transformer.transform(tokenSystem, transformationOptions);
      console.log('[FigmaWorkflowOrchestrator] Step 4: Transformed data to Figma format');

      if (!transformationResult.success || transformationResult.error) {
        throw new Error(`Transformation failed: ${transformationResult.error?.message || 'Unknown error'}`);
      }

      const result = transformationResult.data!;

      // Step 5: POST transformed data to Figma REST API
      const apiResponse = await this.postToFigmaAPI(result, options);
      console.log('[FigmaWorkflowOrchestrator] Step 5: Posted data to Figma API');

      // Step 6: Merge API response tempToRealId with existing mapping
      const mergedTempToRealId = this.mergeApiResponse(prunedTempToRealId, apiResponse);
      console.log('[FigmaWorkflowOrchestrator] Step 6: Merged API response with existing mapping');

      // Step 7: Update .figma/mappings/{filekey}.json
      await this.updateMappingsFile(options.fileKey, mergedTempToRealId);
      console.log('[FigmaWorkflowOrchestrator] Step 7: Updated mappings file');

      // Step 8: Commit changes to branch
      await this.commitChanges(options.fileKey);
      console.log('[FigmaWorkflowOrchestrator] Step 8: Committed changes to branch');

      console.log('[FigmaWorkflowOrchestrator] Workflow completed successfully');

      return {
        success: true,
        result: result,
        tempToRealIdMapping: mergedTempToRealId
      };

    } catch (error) {
      console.error('[FigmaWorkflowOrchestrator] Workflow failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Step 1: GET local variables from Figma file ('variables/local' endpoint)
   */
  private async getLocalVariables(options: FigmaTransformerOptions): Promise<FigmaFileVariablesResponse | undefined> {
    if (!options.fileKey || !options.accessToken) {
      console.warn('[FigmaWorkflowOrchestrator] Missing Figma credentials, skipping local variables fetch');
      return undefined;
    }

    try {
      const response = await fetch(`https://api.figma.com/v1/files/${options.fileKey}/variables/local`, {
        headers: {
          'X-Figma-Token': options.accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch local variables: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as FigmaFileVariablesResponse;
    } catch (error) {
      console.warn('[FigmaWorkflowOrchestrator] Failed to fetch local variables:', error);
      return undefined;
    }
  }

  /**
   * Step 2: Get tempToRealId from .figma/mappings/{fileid}.json
   */
  private async loadTempToRealIdMapping(fileKey: string): Promise<Record<string, string> | undefined> {
    const mappingsDir = '.figma/mappings';
    const mappingsFile = path.join(mappingsDir, `${fileKey}.json`);

    try {
      // Ensure mappings directory exists
      if (!fs.existsSync(mappingsDir)) {
        fs.mkdirSync(mappingsDir, { recursive: true });
        console.log('[FigmaWorkflowOrchestrator] Created mappings directory');
      }

      // Check if mappings file exists
      if (!fs.existsSync(mappingsFile)) {
        console.log('[FigmaWorkflowOrchestrator] No existing mappings file found, starting fresh');
        return {};
      }

      const fileContent = fs.readFileSync(mappingsFile, 'utf-8');
      const mappings = JSON.parse(fileContent);
      
      console.log(`[FigmaWorkflowOrchestrator] Loaded ${Object.keys(mappings).length} mappings from ${mappingsFile}`);
      return mappings;
    } catch (error) {
      console.warn('[FigmaWorkflowOrchestrator] Failed to load mappings file:', error);
      return {};
    }
  }

  /**
   * Step 3: Prune tempToRealId by removing non-existent Figma IDs
   */
  private pruneTempToRealIdMapping(
    tempToRealId: Record<string, string> | undefined,
    existingFigmaData: FigmaFileVariablesResponse | undefined
  ): Record<string, string> {
    if (!tempToRealId || !existingFigmaData) {
      return tempToRealId || {};
    }

    const existingFigmaIds = new Set<string>();
    
    // Extract existing Figma IDs from local variables
    Object.keys(existingFigmaData.variables || {}).forEach(id => {
      existingFigmaIds.add(id);
    });

    Object.keys(existingFigmaData.variableCollections || {}).forEach(id => {
      existingFigmaIds.add(id);
    });

    // Prune mappings where the Figma ID doesn't exist
    const prunedMapping: Record<string, string> = {};
    const prunedIds: string[] = [];

    for (const [tempId, realFigmaId] of Object.entries(tempToRealId)) {
      if (existingFigmaIds.has(realFigmaId)) {
        prunedMapping[tempId] = realFigmaId;
      } else {
        prunedIds.push(tempId);
      }
    }

    console.log(`[FigmaWorkflowOrchestrator] Pruned ${prunedIds.length} invalid mappings:`, prunedIds);
    console.log(`[FigmaWorkflowOrchestrator] Remaining valid mappings: ${Object.keys(prunedMapping).length}`);

    return prunedMapping;
  }

  /**
   * Step 5: POST transformed data to Figma REST API
   */
  private async postToFigmaAPI(
    transformationResult: FigmaTransformationResult,
    options: FigmaTransformerOptions
  ): Promise<FigmaCreateVariablesResponse> {
    if (!options.fileKey || !options.accessToken) {
      throw new Error('Figma credentials required for API posting');
    }

    const response = await fetch(`https://api.figma.com/v1/files/${options.fileKey}/variables`, {
      method: 'POST',
      headers: {
        'X-Figma-Token': options.accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        variables: transformationResult.variables,
        variableCollections: transformationResult.collections,
        variableModes: transformationResult.variableModes,
        variableModeValues: transformationResult.variableModeValues
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Figma API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data as FigmaCreateVariablesResponse;
  }

  /**
   * Step 6: Merge API response tempToRealId with existing mapping
   */
  private mergeApiResponse(
    existingMapping: Record<string, string>,
    apiResponse: FigmaCreateVariablesResponse
  ): Record<string, string> {
    const mergedMapping = { ...existingMapping };

    // Merge new mappings from API response
    if (apiResponse.tempToRealId) {
      Object.assign(mergedMapping, apiResponse.tempToRealId);
    }

    console.log(`[FigmaWorkflowOrchestrator] Merged ${Object.keys(apiResponse.tempToRealId || {}).length} new mappings`);
    console.log(`[FigmaWorkflowOrchestrator] Total mappings: ${Object.keys(mergedMapping).length}`);

    return mergedMapping;
  }

  /**
   * Step 7: Update .figma/mappings/{filekey}.json
   */
  private async updateMappingsFile(fileKey: string, tempToRealId: Record<string, string>): Promise<void> {
    const mappingsDir = '.figma/mappings';
    const mappingsFile = path.join(mappingsDir, `${fileKey}.json`);

    // Ensure mappings directory exists
    if (!fs.existsSync(mappingsDir)) {
      fs.mkdirSync(mappingsDir, { recursive: true });
    }

    // Write updated mappings
    const fileContent = JSON.stringify(tempToRealId, null, 2);
    fs.writeFileSync(mappingsFile, fileContent, 'utf-8');

    console.log(`[FigmaWorkflowOrchestrator] Updated mappings file: ${mappingsFile}`);
  }

  /**
   * Step 8: Commit changes to branch
   */
  private async commitChanges(fileKey: string): Promise<void> {
    const mappingsFile = `.figma/mappings/${fileKey}.json`;

    try {
      // Add the mappings file to git
      const { execSync } = require('child_process');
      
      // Check if file is tracked
      try {
        execSync(`git ls-files --error-unmatch ${mappingsFile}`, { stdio: 'ignore' });
        // File is tracked, add it
        execSync(`git add ${mappingsFile}`);
      } catch {
        // File is not tracked, add it
        execSync(`git add ${mappingsFile}`);
      }

      // Commit the changes
      const commitMessage = `Update Figma mappings for file ${fileKey}`;
      execSync(`git commit -m "${commitMessage}"`, { stdio: 'ignore' });

      console.log(`[FigmaWorkflowOrchestrator] Committed changes: ${commitMessage}`);
    } catch (error) {
      console.warn('[FigmaWorkflowOrchestrator] Failed to commit changes:', error);
      // Don't throw error for commit failures, as the transformation was successful
    }
  }

  /**
   * Get the current tempToRealId mapping
   */
  getTempToRealIdMapping(): Record<string, string> {
    return this.transformer.getTempToRealIdMapping();
  }

  /**
   * Validate workflow prerequisites
   */
  validatePrerequisites(options: FigmaTransformerOptions): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!options.fileKey) {
      errors.push('Figma file key is required');
    }

    if (!options.accessToken) {
      errors.push('Figma access token is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 