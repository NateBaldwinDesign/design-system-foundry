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
   * Helper function to filter valid JavaScript identifiers
   * Prevents "Arg string terminates parameters early" error when variable names contain spaces
   */
  private static getValidIdentifiers(variables: Record<string, unknown>): Record<string, unknown> {
    const validVars: Record<string, unknown> = {};
    Object.keys(variables).forEach(key => {
      // Only use keys that are valid JavaScript identifiers (no spaces, start with letter/underscore)
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
        validVars[key] = variables[key];
      }
    });
    return validVars;
  }

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
      // Initialize variables with default values - map by both ID and name
      algorithm.variables.forEach(variable => {
        const parsedValue = this.parseVariableValue(
          variable.defaultValue || '', 
          variable.type
        );
        // Store by both ID and name for flexibility
        executionContext.variables[variable.id] = parsedValue;
        executionContext.variables[variable.name] = parsedValue;
      });

      // Add system variable 'n'
      executionContext.variables['n'] = iterationValue;
      
      // Add any additional context
      Object.assign(executionContext.variables, context);

      // Always provide Math and Array in the context for all steps
      executionContext.variables['Math'] = {
        pow: Math.pow,
        max: Math.max,
        min: Math.min,
        abs: Math.abs,
        floor: Math.floor,
        ceil: Math.ceil,
        round: Math.round,
        sqrt: Math.sqrt,
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        log: Math.log,
        exp: Math.exp
      };
      executionContext.variables['Array'] = {
        isArray: Array.isArray
      };

      // Execute steps in order, propagating variables between steps
      algorithm.steps.forEach(step => {
        if (step.type === 'formula') {
          const formula = algorithm.formulas.find(f => f.id === step.id);
          if (formula) {
            // Evaluate the formula, which may be an assignment or pure expression
            const result = this.evaluateFormula(formula, executionContext.variables);
            // Store result by formula name for reference
            executionContext.results[formula.name] = result;
            // The last formula result is the final result
            executionContext.finalResult = result;
          }
        } else if (step.type === 'condition') {
          const condition = algorithm.conditions.find(c => c.id === step.id);
          if (condition) {
            // Evaluate the condition with the current variable context
            const result = this.evaluateCondition(condition, executionContext.variables);
            executionContext.results[condition.name] = result;
            // If a condition fails, you may want to throw or handle it (not altering existing design)
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
   * Supports assignment (e.g., "a = b + c") and pure expressions (e.g., "b + c")
   * Propagates new variables into the context for subsequent steps
   */
  static evaluateFormula(
    formula: Formula,
    variables: Record<string, unknown>
  ): unknown {
    try {
      const expression = formula.expressions.javascript.value;
      // Create a safe evaluation context with all necessary functions and variables
      const evaluationContext: Record<string, unknown> = {
        ...variables,
        Math: variables['Math'] || Math,
        Array: variables['Array'] || Array,
        console: console
      };
      // Handle assignment expressions (e.g., "p_s = p[n] + z[n]")
      if (expression.includes('=')) {
        const parts = expression.split('=').map(part => part.trim());
        if (parts.length === 2) {
          const variableName = parts[0];
          const valueExpression = parts[1];
          // Evaluate the right side of the assignment
          const evalFunction = new Function(...Object.keys(this.getValidIdentifiers(evaluationContext)), `return ${valueExpression}`);
          const result = evalFunction(...Object.values(this.getValidIdentifiers(evaluationContext)));
          // Store the result in the variables context (by name and id if possible)
          variables[variableName] = result;
          evaluationContext[variableName] = result;
          // Also propagate to id if variableName matches a variable id
          // (This is a non-destructive enhancement for context propagation)
          for (const key of Object.keys(variables)) {
            if (key === variableName) continue;
            if (variables[key] === result) {
              variables[key] = result;
              evaluationContext[key] = result;
            }
          }
          return result;
        }
      }
      // For non-assignment expressions, evaluate directly
      const evalFunction = new Function(...Object.keys(this.getValidIdentifiers(evaluationContext)), `return ${expression}`);
      const result = evalFunction(...Object.values(this.getValidIdentifiers(evaluationContext)));
      return result;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      console.error('Expression:', formula.expressions.javascript.value);
      console.error('Variables:', variables);
      throw new Error(`Formula evaluation failed for ${formula.name}: ${error}`);
    }
  }

  /**
   * Evaluate a condition with given variable context
   * Always provides Math and Array in the context
   */
  static evaluateCondition(
    condition: Condition,
    variables: Record<string, unknown>
  ): boolean {
    try {
      const expression = condition.expression;
      // Create a safe evaluation context with all necessary functions and variables
      const evaluationContext: Record<string, unknown> = {
        ...variables,
        Math: variables['Math'] || Math,
        Array: variables['Array'] || Array,
        console: console
      };
      // Debug logging
      // console.log('Condition evaluation debug:');
      // console.log('  Expression:', expression);
      // console.log('  Variable names:', Object.keys(variables));
      // console.log('  Variable values:', Object.values(variables));
      // console.log('  Variable types:', Object.values(variables).map(v => typeof v));
      // Create function with explicit variable names
      const evalFunction = new Function(...Object.keys(this.getValidIdentifiers(evaluationContext)), `return ${expression}`);
      // Execute with variable values
      const result = evalFunction(...Object.values(this.getValidIdentifiers(evaluationContext)));
      // console.log('  Result:', result);
      return Boolean(result);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      console.error('  Expression:', condition.expression);
      console.error('  Variables:', variables);
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
        // Return pure numeric values without units
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          return numValue.toString();
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
      case 'number': {
        const numResult = Number(value) || 0;
        return numResult;
      }
      case 'string': {
        // Check if the string looks like a JSON array and parse it
        if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
          try {
            const arrayResult = JSON.parse(value);
            return arrayResult;
          } catch (error) {
            // If JSON parsing fails, return as regular string
            return String(value);
          }
        }
        return String(value);
      }
      case 'boolean': {
        const boolResult = value === 'true' || value === '1';
        return boolResult;
      }
      case 'color': {
        return String(value);
      }
      default: {
        return value;
      }
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