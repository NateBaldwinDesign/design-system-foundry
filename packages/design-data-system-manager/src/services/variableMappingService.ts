import { Variable } from '../types/algorithm';
import { SystemVariableService, SystemVariable } from './systemVariableService';
import { ASTNode } from '../types/algorithm';

export interface VariableMapping {
  id: string;
  name: string;
  type: 'algorithm' | 'system';
}

export class VariableMappingService {
  /**
   * Get all variables (algorithm + system) with their mappings
   */
  static getAllVariableMappings(algorithmVariables: Variable[]): VariableMapping[] {
    const systemVariables = SystemVariableService.getSystemVariables();
    
    const algorithmMappings: VariableMapping[] = algorithmVariables.map(v => ({
      id: v.id,
      name: v.name,
      type: 'algorithm' as const
    }));
    
    const systemMappings: VariableMapping[] = systemVariables.map(v => ({
      id: v.id,
      name: v.name,
      type: 'system' as const
    }));
    
    return [...algorithmMappings, ...systemMappings];
  }

  /**
   * Get variable name by ID
   */
  static getVariableNameById(id: string, algorithmVariables: Variable[]): string | undefined {
    // Check algorithm variables first
    const algorithmVar = algorithmVariables.find(v => v.id === id);
    if (algorithmVar) {
      return algorithmVar.name;
    }
    
    // Check system variables
    return SystemVariableService.getVariableNameById(id);
  }

  /**
   * Get variable ID by name
   */
  static getVariableIdByName(name: string, algorithmVariables: Variable[]): string | undefined {
    // Check algorithm variables first
    const algorithmVar = algorithmVariables.find(v => v.name === name);
    if (algorithmVar) {
      return algorithmVar.id;
    }
    
    // Check system variables
    return SystemVariableService.getVariableIdByName(name);
  }

  /**
   * Convert formula from display names to IDs for backend storage
   */
  static convertFormulaToIds(formula: string, algorithmVariables: Variable[]): string {
    const mappings = this.getAllVariableMappings(algorithmVariables);
    
    return formula.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match, varName) => {
      // Skip JavaScript keywords and functions
      const jsKeywords = ['Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Function', 'undefined', 'null', 'true', 'false', 'NaN', 'Infinity'];
      if (jsKeywords.includes(varName)) {
        return match;
      }
      
      // Check if it's a number
      if (/^\d+(\.\d+)?$/.test(varName)) {
        return match;
      }
      
      // Find the variable mapping
      const mapping = mappings.find(m => m.name === varName);
      if (mapping) {
        return mapping.id;
      }
      
      // If not found, return original (could be a function call or other identifier)
      return match;
    });
  }

  /**
   * Convert formula from IDs to display names for UI display
   */
  static convertFormulaToNames(formula: string, algorithmVariables: Variable[]): string {
    const mappings = this.getAllVariableMappings(algorithmVariables);
    
    return formula.replace(/\b([a-zA-Z0-9-_]+)\b/g, (match, id) => {
      // Skip JavaScript keywords and functions
      const jsKeywords = ['Math', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'RegExp', 'Function', 'undefined', 'null', 'true', 'false', 'NaN', 'Infinity'];
      if (jsKeywords.includes(id)) {
        return match;
      }
      
      // Check if it's a number
      if (/^\d+(\.\d+)?$/.test(id)) {
        return match;
      }
      
      // Find the variable mapping
      const mapping = mappings.find(m => m.id === id);
      if (mapping) {
        return mapping.name;
      }
      
      // If not found, return original (could be a function call or other identifier)
      return match;
    });
  }

  /**
   * Convert LaTeX expression from display names to IDs
   */
  static convertLatexToIds(latex: string, algorithmVariables: Variable[]): string {
    const mappings = this.getAllVariableMappings(algorithmVariables);
    
    return latex.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, varName) => {
      const mapping = mappings.find(m => m.name === varName);
      if (mapping) {
        return `{${mapping.id}}`;
      }
      return match;
    });
  }

  /**
   * Convert LaTeX expression from IDs to display names
   */
  static convertLatexToNames(latex: string, algorithmVariables: Variable[]): string {
    const mappings = this.getAllVariableMappings(algorithmVariables);
    
    return latex.replace(/\{([a-zA-Z0-9-_]+)\}/g, (match, id) => {
      const mapping = mappings.find(m => m.id === id);
      if (mapping) {
        return `{${mapping.name}}`;
      }
      return match;
    });
  }

  /**
   * Convert AST from display names to IDs
   */
  static convertASTToIds(ast: ASTNode, algorithmVariables: Variable[]): ASTNode {
    if (!ast || typeof ast !== 'object') {
      return ast;
    }

    const mappings = this.getAllVariableMappings(algorithmVariables);
    
    if (ast.type === 'variable' && ast.variableName) {
      const mapping = mappings.find(m => m.name === ast.variableName);
      if (mapping) {
        return {
          ...ast,
          variableName: mapping.id
        };
      }
    }
    
    // Recursively process child nodes
    const result = { ...ast };
    
    // Process left and right nodes for binary operations
    if (result.left) {
      result.left = this.convertASTToIds(result.left, algorithmVariables);
    }
    if (result.right) {
      result.right = this.convertASTToIds(result.right, algorithmVariables);
    }
    
    // Process operand for unary operations
    if (result.operand) {
      result.operand = this.convertASTToIds(result.operand, algorithmVariables);
    }
    
    // Process arguments for function calls
    if (result.arguments && Array.isArray(result.arguments)) {
      result.arguments = result.arguments.map(arg => this.convertASTToIds(arg, algorithmVariables));
    }
    
    // Process expression for assignment nodes
    if (result.expression) {
      result.expression = this.convertASTToIds(result.expression, algorithmVariables);
    }
    
    // Process body for group nodes
    if (result.body) {
      result.body = this.convertASTToIds(result.body, algorithmVariables);
    }
    
    return result;
  }

  /**
   * Convert AST from IDs to display names
   */
  static convertASTToNames(ast: ASTNode, algorithmVariables: Variable[]): ASTNode {
    if (!ast || typeof ast !== 'object') {
      return ast;
    }

    const mappings = this.getAllVariableMappings(algorithmVariables);
    
    if (ast.type === 'variable' && ast.variableName) {
      const mapping = mappings.find(m => m.id === ast.variableName);
      if (mapping) {
        return {
          ...ast,
          variableName: mapping.name
        };
      }
    }
    
    // Recursively process child nodes
    const result = { ...ast };
    
    // Process left and right nodes for binary operations
    if (result.left) {
      result.left = this.convertASTToNames(result.left, algorithmVariables);
    }
    if (result.right) {
      result.right = this.convertASTToNames(result.right, algorithmVariables);
    }
    
    // Process operand for unary operations
    if (result.operand) {
      result.operand = this.convertASTToNames(result.operand, algorithmVariables);
    }
    
    // Process arguments for function calls
    if (result.arguments && Array.isArray(result.arguments)) {
      result.arguments = result.arguments.map(arg => this.convertASTToNames(arg, algorithmVariables));
    }
    
    // Process expression for assignment nodes
    if (result.expression) {
      result.expression = this.convertASTToNames(result.expression, algorithmVariables);
    }
    
    // Process body for group nodes
    if (result.body) {
      result.body = this.convertASTToNames(result.body, algorithmVariables);
    }
    
    return result;
  }

  /**
   * Create evaluation context with variable names mapped to their values
   */
  static createEvaluationContext(algorithmVariables: Variable[], systemVariables: SystemVariable[] = []): Record<string, unknown> {
    const context: Record<string, unknown> = {};
    
    // Add algorithm variables by name
    algorithmVariables.forEach(variable => {
      context[variable.name] = this.parseVariableValue(variable.defaultValue || '', variable.type);
    });
    
    // Add system variables by name
    systemVariables.forEach(variable => {
      context[variable.name] = this.parseVariableValue(variable.defaultValue || '', variable.type);
    });
    
    return context;
  }

  /**
   * Parse variable value based on type
   */
  private static parseVariableValue(value: string, type: string): unknown {
    switch (type) {
      case 'number':
        return parseFloat(value) || 0;
      case 'boolean':
        return value === 'true' || value === '1';
      case 'string':
      default:
        return value;
    }
  }
} 