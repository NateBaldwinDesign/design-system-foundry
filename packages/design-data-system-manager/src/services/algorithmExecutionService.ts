import type { TokenValue } from '@token-model/data-model';
import { Algorithm, Variable, Formula, Condition } from '../types/algorithm';

export interface ExecutionContext {
  variables: Record<string, unknown>;
  results: Record<string, unknown>;
  iterationValue: number;
  finalResult: unknown;
}

export interface TokenGenerationResult {
  tokenId: string;
  displayName: string;
  value: TokenValue;
  iterationValue: number;
  formulaName: string;
  error?: string;
}

export class AlgorithmExecutionService {
  /**
   * Execute an algorithm for a specific iteration value and return the final result
   */
  static executeAlgorithm(
    algorithm: Algorithm,
    iterationValue: number,
    context: Record<string, unknown> = {}
  ): ExecutionContext {
    const executionContext: ExecutionContext = {
      variables: {},
      results: {},
      iterationValue,
      finalResult: null
    };

    try {
      // Initialize variables with default values
      algorithm.variables.forEach(variable => {
        executionContext.variables[variable.name] = this.parseVariableValue(
          variable.defaultValue || '', 
          variable.type
        );
      });

      // Add system variables
      executionContext.variables['n'] = iterationValue;
      
      // Add any additional context
      Object.assign(executionContext.variables, context);

      // Execute steps in order
      algorithm.steps.forEach(step => {
        if (step.type === 'formula') {
          const formula = algorithm.formulas.find(f => f.id === step.id);
          if (formula) {
            const result = this.evaluateFormula(formula, executionContext.variables);
            executionContext.results[formula.name] = result;
            executionContext.finalResult = result;
          }
        } else if (step.type === 'condition') {
          const condition = algorithm.conditions.find(c => c.id === step.id);
          if (condition) {
            const result = this.evaluateCondition(condition, executionContext.variables);
            executionContext.results[condition.name] = result;
            // Conditions don't change the final result, but can be used for branching
          }
        }
      });

      return executionContext;
    } catch (error) {
      console.error('Algorithm execution error:', error);
      throw new Error(`Algorithm execution failed: ${error}`);
    }
  }

  /**
   * Evaluate a formula with given variable context
   */
  static evaluateFormula(
    formula: Formula,
    variables: Record<string, unknown>
  ): unknown {
    try {
      const expression = formula.expressions.javascript.value;
      
      // Create a safe evaluation function with all variables in scope
      const variableNames = Object.keys(variables);
      const variableValues = Object.values(variables);
      
      // Create function with explicit variable names
      const evalFunction = new Function(...variableNames, `return ${expression}`);
      
      // Execute with variable values
      const result = evalFunction(...variableValues);
      
      return result;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      throw new Error(`Formula evaluation failed for ${formula.name}: ${error}`);
    }
  }

  /**
   * Evaluate a condition with given variable context
   */
  static evaluateCondition(
    condition: Condition,
    variables: Record<string, unknown>
  ): boolean {
    try {
      const expression = condition.expression;
      
      // Create a safe evaluation function with all variables in scope
      const variableNames = Object.keys(variables);
      const variableValues = Object.values(variables);
      
      // Create function with explicit variable names
      const evalFunction = new Function(...variableNames, `return ${expression}`);
      
      // Execute with variable values
      const result = evalFunction(...variableValues);
      
      return Boolean(result);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      throw new Error(`Condition evaluation failed for ${condition.name}: ${error}`);
    }
  }

  /**
   * Generate tokens for an algorithm based on iteration range
   */
  static generateTokensForAlgorithm(
    algorithm: Algorithm
  ): TokenGenerationResult[] {
    const results: TokenGenerationResult[] = [];
    
    if (!algorithm.tokenGeneration?.enabled) {
      return results;
    }

    const { iterationRange } = algorithm.tokenGeneration;
    
    // Generate iteration values
    const iterationValues: number[] = [];
    for (let i = iterationRange.start; i <= iterationRange.end; i += iterationRange.step) {
      iterationValues.push(i);
    }

    // Execute algorithm for each iteration
    iterationValues.forEach(iterationValue => {
      try {
        const executionContext = this.executeAlgorithm(algorithm, iterationValue);
        
        // Generate token display name based on iteration
        const displayName = this.generateTokenDisplayName(algorithm, iterationValue);
        
        // Create token value
        const tokenValue: TokenValue = { 
          value: this.formatValueForTokenType(
            executionContext.finalResult, 
            algorithm.resolvedValueTypeId
          ) 
        };

        // Generate unique token ID
        const tokenId = `${algorithm.id}-${iterationValue}`;

        results.push({
          tokenId,
          displayName,
          value: tokenValue,
          iterationValue,
          formulaName: this.getLastExecutedFormulaName(algorithm)
        });
      } catch (error) {
        console.error(`Error generating token for iteration ${iterationValue}:`, error);
        results.push({
          tokenId: `${algorithm.id}-${iterationValue}`,
          displayName: `Error-${iterationValue}`,
          value: { value: '' },
          iterationValue,
          formulaName: 'Error',
          error: String(error)
        });
      }
    });

    return results;
  }

  /**
   * Generate a display name for a token based on algorithm and iteration
   */
  private static generateTokenDisplayName(algorithm: Algorithm, iterationValue: number): string {
    const baseName = algorithm.name.replace(/\s+/g, '-').toLowerCase();
    
    // Handle negative iterations
    if (iterationValue < 0) {
      return `${baseName}-minus-${Math.abs(iterationValue)}`;
    }
    
    return `${baseName}-${iterationValue}`;
  }

  /**
   * Format a value for the specific token type
   */
  private static formatValueForTokenType(value: unknown, resolvedValueTypeId: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (resolvedValueTypeId) {
      case 'dimension':
      case 'gap':
      case 'font-size': {
        // Ensure numeric values have units
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          return `${numValue}px`;
        }
        return String(value);
      }
      
      case 'color': {
        // Handle color values
        if (typeof value === 'string' && (value.startsWith('#') || value.startsWith('rgb'))) {
          return value;
        }
        // For numeric values, assume they're hex codes
        const colorValue = Number(value);
        if (!isNaN(colorValue)) {
          return `#${colorValue.toString(16).padStart(6, '0')}`;
        }
        return String(value);
      }
      
      default:
        return String(value);
    }
  }

  /**
   * Get the name of the last executed formula
   */
  private static getLastExecutedFormulaName(
    algorithm: Algorithm
  ): string {
    // Find the last formula step that was executed
    for (let i = algorithm.steps.length - 1; i >= 0; i--) {
      const step = algorithm.steps[i];
      if (step.type === 'formula') {
        return step.name;
      }
    }
    return 'Unknown';
  }

  /**
   * Parse variable value based on its type
   */
  private static parseVariableValue(value: string, type: Variable['type']): unknown {
    switch (type) {
      case 'number':
        return Number(value) || 0;
      case 'string':
        return String(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'color':
        return String(value);
      default:
        return value;
    }
  }

  /**
   * Validate algorithm structure
   */
  static validateAlgorithm(algorithm: Algorithm): string[] {
    const errors: string[] = [];

    // Check required fields
    if (!algorithm.id) errors.push('Algorithm ID is required');
    if (!algorithm.name) errors.push('Algorithm name is required');
    if (!algorithm.resolvedValueTypeId) errors.push('Resolved value type ID is required');

    // Validate variables
    algorithm.variables.forEach((variable, index) => {
      if (!variable.id) errors.push(`Variable ${index}: ID is required`);
      if (!variable.name) errors.push(`Variable ${index}: Name is required`);
      if (!variable.type) errors.push(`Variable ${index}: Type is required`);
    });

    // Validate formulas
    algorithm.formulas.forEach((formula, index) => {
      if (!formula.id) errors.push(`Formula ${index}: ID is required`);
      if (!formula.name) errors.push(`Formula ${index}: Name is required`);
      if (!formula.expressions?.javascript?.value) {
        errors.push(`Formula ${index}: JavaScript expression is required`);
      }
    });

    // Validate steps
    algorithm.steps.forEach((step, index) => {
      if (!step.type) errors.push(`Step ${index}: Type is required`);
      if (!step.id) errors.push(`Step ${index}: ID is required`);
      if (!step.name) errors.push(`Step ${index}: Name is required`);
      
      // Validate step references
      if (step.type === 'formula') {
        const formula = algorithm.formulas.find(f => f.id === step.id);
        if (!formula) {
          errors.push(`Step ${index}: Referenced formula '${step.id}' not found`);
        }
      } else if (step.type === 'condition') {
        const condition = algorithm.conditions.find(c => c.id === step.id);
        if (!condition) {
          errors.push(`Step ${index}: Referenced condition '${step.id}' not found`);
        }
      }
    });

    return errors;
  }
} 