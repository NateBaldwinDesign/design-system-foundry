import type { Variable } from '../types/algorithm';
import { StorageService } from './storage';
import { generateId } from '../utils/id';

export interface SystemVariable extends Variable {
  // System variables are stored in the algorithm config
  // They have the same structure as algorithm variables
}

export class SystemVariableService {
  private static readonly STORAGE_KEY = 'systemVariables';

  /**
   * Normalize a system variable to the expected format for the UI
   */
  private static normalizeSystemVariable(variable: Record<string, unknown>): SystemVariable {
    // Ensure all required properties are present
    return {
      id: (variable.id as string) || generateId('system-variable'),
      name: (variable.name as string) || '',
      type: (variable.type as Variable['type']) || 'string',
      defaultValue: (variable.defaultValue as string) || '',
      description: (variable.description as string) || '',
      modeBased: (variable.modeBased as boolean) || false,
      valuesByMode: (variable.valuesByMode as { modeIds: string[]; value: string | number | boolean }[]) || [],
      dimensionId: variable.dimensionId as string | undefined
    };
  }

  /**
   * Get all system variables from the main algorithm config (config.systemVariables)
   */
  static getSystemVariables(): SystemVariable[] {
    try {
      const uniqueVariables = new Map<string, SystemVariable>();
      const algorithmFile = StorageService.getAlgorithmFile();
      if (algorithmFile && algorithmFile.config && typeof algorithmFile.config === 'object') {
        const config = algorithmFile.config as { systemVariables?: Record<string, unknown>[] };
        if (config.systemVariables && Array.isArray(config.systemVariables)) {
          config.systemVariables.forEach(variable => {
            if (variable.id && typeof variable.id === 'string') {
              const normalizedVariable = this.normalizeSystemVariable(variable);
              uniqueVariables.set(variable.id, normalizedVariable);
            }
          });
        }
      }
      const userVariables = this.getUserSystemVariables();
      userVariables.forEach(variable => {
        if (variable.id) {
          uniqueVariables.set(variable.id, variable);
        }
      });
      return Array.from(uniqueVariables.values());
    } catch (error) {
      console.error('Error loading system variables:', error);
      return [];
    }
  }

  /**
   * Get user-created system variables from localStorage
   */
  private static getUserSystemVariables(): SystemVariable[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading user system variables:', error);
      return [];
    }
  }

  /**
   * Save a system variable to localStorage (for user-created variables)
   */
  static saveSystemVariable(variable: SystemVariable): boolean {
    try {
      const algorithmFile = StorageService.getAlgorithmFile();
      if (algorithmFile && algorithmFile.config && typeof algorithmFile.config === 'object') {
        const config = algorithmFile.config as { systemVariables?: Record<string, unknown>[] };
        if (config.systemVariables && Array.isArray(config.systemVariables)) {
          const existingConfigIndex = config.systemVariables.findIndex(v => v.id === variable.id);
          if (existingConfigIndex >= 0) {
            const configVariable: Record<string, unknown> = { ...variable };
            // valuesByMode is already schema-compliant, no conversion needed
            const updatedConfig = {
              ...algorithmFile,
              config: {
                ...config,
                systemVariables: config.systemVariables.map((v, index) => 
                  index === existingConfigIndex ? configVariable : v
                )
              }
            };
            StorageService.setAlgorithmFile(updatedConfig);
            return true;
          }
        }
      }
      const variables = this.getUserSystemVariables();
      if (!variable.id) {
        variable.id = generateId('system-variable');
      }
      const existingIndex = variables.findIndex(v => v.id === variable.id);
      if (existingIndex >= 0) {
        variables[existingIndex] = { ...variable };
      } else {
        variables.push({ ...variable });
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(variables));
      return true;
    } catch (error) {
      console.error('Error saving system variable:', error);
      return false;
    }
  }

  /**
   * Update a system variable in localStorage
   */
  static updateSystemVariable(variable: SystemVariable): boolean {
    return this.saveSystemVariable(variable);
  }

  /**
   * Delete a system variable from localStorage
   */
  static deleteSystemVariable(variableId: string): boolean {
    try {
      // Check if this variable exists in the config
      const algorithmFile = StorageService.getAlgorithmFile();
      if (algorithmFile && algorithmFile.config && typeof algorithmFile.config === 'object') {
        const config = algorithmFile.config as { systemVariables?: SystemVariable[] };
        if (config.systemVariables && Array.isArray(config.systemVariables)) {
          const existingConfigIndex = config.systemVariables.findIndex(v => v.id === variableId);
          if (existingConfigIndex >= 0) {
            // Remove from config
            const updatedConfig = {
              ...algorithmFile,
              config: {
                ...config,
                systemVariables: config.systemVariables.filter((_, index) => index !== existingConfigIndex)
              }
            };
            StorageService.setAlgorithmFile(updatedConfig);
            return true;
          }
        }
      }

      // If not in config, delete from user variables
      const variables = this.getUserSystemVariables();
      const filteredVariables = variables.filter(v => v.id !== variableId);
      
      if (filteredVariables.length === variables.length) {
        return false; // Variable not found
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredVariables));
      return true;
    } catch (error) {
      console.error('Error deleting system variable:', error);
      return false;
    }
  }

  /**
   * Get a system variable by name (checks both config and user variables)
   */
  static getSystemVariableByName(name: string): SystemVariable | undefined {
    const variables = this.getSystemVariables();
    return variables.find(v => v.name === name);
  }

  /**
   * Check if a system variable exists
   */
  static systemVariableExists(name: string): boolean {
    return this.getSystemVariableByName(name) !== undefined;
  }

  /**
   * Export system variables to algorithm config format
   * This can be used when creating or updating algorithm files
   */
  static exportToConfig(): Record<string, string | number | boolean> {
    const variables = this.getSystemVariables();
    const config: Record<string, string | number | boolean> = {};
    
    variables.forEach(variable => {
      if (variable.defaultValue !== undefined) {
        config[variable.name] = this.parseValue(variable.defaultValue, variable.type);
      }
    });
    
    return config;
  }

  /**
   * Import system variables from algorithm config
   */
  static importFromConfig(config: Record<string, string | number | boolean>): void {
    const systemVariables: SystemVariable[] = [];
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        systemVariables.push({
          id: `system-${key}`,
          name: key,
          type: this.inferType(value),
          defaultValue: String(value),
          description: `System variable: ${key}`,
          modeBased: false,
          valuesByMode: [],
          dimensionId: undefined
        });
      }
    }
    
    // Update the algorithm file structure with imported system variables
    const algorithmFile = StorageService.getAlgorithmFile();
    if (algorithmFile) {
      const currentConfig = algorithmFile.config && typeof algorithmFile.config === 'object' 
        ? algorithmFile.config as Record<string, unknown>
        : {};
      const updatedAlgorithmFile = {
        ...algorithmFile,
        config: { 
          ...currentConfig, 
          systemVariables 
        }
      };
      StorageService.setAlgorithmFile(updatedAlgorithmFile);
    } else {
      // Create new algorithm file structure if none exists
      const newAlgorithmFile = {
        schemaVersion: "5.0.0",
        profile: "basic",
        metadata: {
          name: "Algorithm Collection",
          description: "Algorithm collection",
          version: "1.0.0",
          author: "Design System Manager"
        },
        config: {
          systemVariables
        },
        algorithms: [],
        execution: {
          order: [],
          parallel: false,
          onError: "stop"
        },
        integration: {
          targetSchema: "https://designsystem.org/schemas/tokens/v1.0.0",
          outputFormat: "design-tokens",
          mergeStrategy: "merge",
          validation: true
        },
        examples: []
      };
      StorageService.setAlgorithmFile(newAlgorithmFile);
    }
  }

  /**
   * Infer the type of a value
   */
  private static inferType(value: string | number | boolean): Variable['type'] {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      // Try to detect if it's a color
      if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
        return 'color';
      }
      return 'string';
    }
    return 'string';
  }

  /**
   * Parse a string value to the appropriate type
   */
  private static parseValue(value: string | undefined, type: Variable['type']): string | number | boolean {
    if (!value) return '';
    
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'color':
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Get a system variable by ID (checks both config and user variables)
   */
  static getSystemVariableById(id: string): SystemVariable | undefined {
    const variables = this.getSystemVariables();
    return variables.find(v => v.id === id);
  }

  // Helper method to get variable name by ID
  static getVariableNameById(id: string): string | undefined {
    const variable = this.getSystemVariableById(id);
    return variable?.name;
  }

  // Helper method to get variable ID by name
  static getVariableIdByName(name: string): string | undefined {
    const variable = this.getSystemVariableByName(name);
    return variable?.id;
  }
} 