import type { Variable } from '../types/algorithm';
import { StorageService } from './storage';

export interface SystemVariable extends Variable {
  // System variables are stored in the algorithm config
  // They have the same structure as algorithm variables
}

export class SystemVariableService {
  /**
   * Get all system variables from the main algorithm config (config.systemVariables)
   */
  static getSystemVariables(): SystemVariable[] {
    // First try to get from the complete algorithm file structure
    const algorithmFile = StorageService.getAlgorithmFile();
    if (algorithmFile && algorithmFile.config && typeof algorithmFile.config === 'object') {
      const config = algorithmFile.config as { systemVariables?: SystemVariable[] };
      if (config.systemVariables && Array.isArray(config.systemVariables)) {
        return config.systemVariables;
      }
    }

    // Fallback: return empty array if no algorithm file structure exists
    return [];
  }

  /**
   * Save a system variable to config.systemVariables in the main algorithm config
   */
  static saveSystemVariable(variable: SystemVariable): boolean {
    // First try to update the complete algorithm file structure
    const algorithmFile = StorageService.getAlgorithmFile();
    if (algorithmFile && algorithmFile.config && typeof algorithmFile.config === 'object') {
      const config = algorithmFile.config as { systemVariables?: SystemVariable[] };
      const systemVariables: SystemVariable[] = Array.isArray(config.systemVariables) ? [...config.systemVariables] : [];
      const idx = systemVariables.findIndex(v => v.id === variable.id);
      if (idx >= 0) {
        systemVariables[idx] = variable;
      } else {
        systemVariables.push(variable);
      }
      
      // Update the algorithm file with new system variables
      const updatedAlgorithmFile = {
        ...algorithmFile,
        config: { ...config, systemVariables }
      };
      StorageService.setAlgorithmFile(updatedAlgorithmFile);
      return true;
    }

    // Fallback: create a new algorithm file structure if none exists
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
        systemVariables: [variable]
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
    return true;
  }

  /**
   * Update a system variable in config.systemVariables
   */
  static updateSystemVariable(variable: SystemVariable): boolean {
    return this.saveSystemVariable(variable);
  }

  /**
   * Delete a system variable from config.systemVariables
   */
  static deleteSystemVariable(variableName: string): boolean {
    // First try to update the complete algorithm file structure
    const algorithmFile = StorageService.getAlgorithmFile();
    if (algorithmFile && algorithmFile.config && typeof algorithmFile.config === 'object') {
      const config = algorithmFile.config as { systemVariables?: SystemVariable[] };
      const systemVariables: SystemVariable[] = Array.isArray(config.systemVariables) ? [...config.systemVariables] : [];
      const filtered = systemVariables.filter(v => v.name !== variableName);
      
      // Update the algorithm file with filtered system variables
      const updatedAlgorithmFile = {
        ...algorithmFile,
        config: { ...config, systemVariables: filtered }
      };
      StorageService.setAlgorithmFile(updatedAlgorithmFile);
      return true;
    }

    // Fallback: return false if no algorithm file structure exists
    return false;
  }

  /**
   * Get a system variable by name
   */
  static getSystemVariableByName(name: string): SystemVariable | null {
    const variables = this.getSystemVariables();
    return variables.find(v => v.name === name) || null;
  }

  /**
   * Check if a system variable exists
   */
  static systemVariableExists(name: string): boolean {
    return this.getSystemVariableByName(name) !== null;
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
          modeValues: {},
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
} 