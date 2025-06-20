import { Algorithm, Formula, Condition } from '../types/algorithm';

export interface DependencyGraph {
  nodes: FormulaNode[];
  edges: DependencyEdge[];
  executionOrder: string[];
  variableUsage: VariableUsageMap;
}

export interface FormulaNode {
  id: string;
  name: string;
  type: 'formula' | 'condition';
  inputs: string[]; // Variable names used
  outputs: string[]; // Variables this formula could affect
  dependencies: string[]; // Other formulas this depends on
  stepIndex?: number; // Position in execution order
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: 'variable' | 'formula' | 'condition';
  variableName?: string; // For variable dependencies
}

export interface VariableUsageMap {
  [variableName: string]: {
    formulas: string[]; // Formula IDs that use this variable
    conditions: string[]; // Condition IDs that use this variable
    isSystemVariable: boolean;
  };
}

export interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  message: string;
  formulaId?: string;
  conditionId?: string;
  variableName?: string;
}

export interface ExecutionTrace {
  steps: ExecutionStep[];
  finalResult: unknown;
  errors: string[];
  executionTime: number;
}

export interface ExecutionStep {
  stepId: string;
  stepName: string;
  stepType: 'formula' | 'condition';
  inputValues: Record<string, unknown>;
  outputValue: unknown;
  error?: string;
  executionTime: number;
  dependencies: string[]; // Variables used in this step
}

export class FormulaDependencyService {
  /**
   * Analyze formula dependencies to create a dependency graph
   */
  static analyzeFormulaDependencies(algorithm: Algorithm): DependencyGraph {
    const nodes: FormulaNode[] = [];
    const edges: DependencyEdge[] = [];
    const variableUsage: VariableUsageMap = {};
    
    // Initialize variable usage tracking
    algorithm.variables.forEach(variable => {
      variableUsage[variable.name] = {
        formulas: [],
        conditions: [],
        isSystemVariable: false
      };
    });
    
    // Add system variable 'n'
    variableUsage['n'] = {
      formulas: [],
      conditions: [],
      isSystemVariable: true
    };

    // Analyze formulas
    algorithm.formulas.forEach(formula => {
      const variableDependencies = this.extractVariableDependencies(formula.expressions.javascript.value);
      
      // Track which formulas use each variable
      variableDependencies.forEach(varName => {
        if (variableUsage[varName]) {
          variableUsage[varName].formulas.push(formula.id);
        }
      });

      // Create formula node
      const node: FormulaNode = {
        id: formula.id,
        name: formula.name,
        type: 'formula',
        inputs: variableDependencies,
        outputs: [], // Will be populated by analyzing variable assignments
        dependencies: [],
        stepIndex: algorithm.steps.findIndex(step => step.id === formula.id)
      };

      // Try to detect output variables (simplified approach)
      // This looks for patterns like "variableName = ..." or "return variableName"
      const outputVars = this.extractOutputVariables(formula.expressions.javascript.value);
      node.outputs = outputVars;

      nodes.push(node);
    });

    // Analyze conditions
    algorithm.conditions.forEach(condition => {
      const variableDependencies = this.extractVariableDependencies(condition.expression);
      
      // Track which conditions use each variable
      variableDependencies.forEach(varName => {
        if (variableUsage[varName]) {
          variableUsage[varName].conditions.push(condition.id);
        }
      });

      const node: FormulaNode = {
        id: condition.id,
        name: condition.name,
        type: 'condition',
        inputs: variableDependencies,
        outputs: [], // Conditions don't produce outputs
        dependencies: [],
        stepIndex: algorithm.steps.findIndex(step => step.id === condition.id)
      };

      nodes.push(node);
    });

    // Create edges based on variable dependencies
    nodes.forEach(node => {
      node.inputs.forEach(inputVar => {
        // Find formulas that produce this variable
        const producingFormulas = nodes.filter(n => 
          n.type === 'formula' && n.outputs.includes(inputVar)
        );

        producingFormulas.forEach(producer => {
          // Only create edge if producer comes before consumer in execution order
          if (producer.stepIndex !== undefined && 
              node.stepIndex !== undefined && 
              producer.stepIndex < node.stepIndex) {
            
            edges.push({
              source: producer.id,
              target: node.id,
              type: 'formula',
              variableName: inputVar
            });

            node.dependencies.push(producer.id);
          }
        });
      });
    });

    // Determine execution order based on steps array
    const executionOrder = algorithm.steps.map(step => step.id);

    return {
      nodes,
      edges,
      executionOrder,
      variableUsage
    };
  }

  /**
   * Get detailed variable usage information for a specific formula
   */
  static getVariableUsage(formula: Formula): string[] {
    return this.extractVariableDependencies(formula.expressions.javascript.value);
  }

  /**
   * Validate formula dependencies and identify potential issues
   */
  static validateFormulaDependencies(algorithm: Algorithm): ValidationResult[] {
    const results: ValidationResult[] = [];
    const graph = this.analyzeFormulaDependencies(algorithm);

    // Check for undefined variables
    graph.nodes.forEach(node => {
      node.inputs.forEach(inputVar => {
        const variableExists = algorithm.variables.some(v => v.name === inputVar);
        const isSystemVariable = inputVar === 'n';
        
        if (!variableExists && !isSystemVariable) {
          results.push({
            type: 'error',
            message: `Undefined variable '${inputVar}' used in ${node.type} '${node.name}'`,
            formulaId: node.type === 'formula' ? node.id : undefined,
            conditionId: node.type === 'condition' ? node.id : undefined,
            variableName: inputVar
          });
        }
      });
    });

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(graph);
    circularDeps.forEach(circle => {
      results.push({
        type: 'error',
        message: `Circular dependency detected: ${circle.join(' -> ')}`,
        formulaId: circle[0]
      });
    });

    // Check for unused variables
    algorithm.variables.forEach(variable => {
      const usage = graph.variableUsage[variable.name];
      if (!usage || (usage.formulas.length === 0 && usage.conditions.length === 0)) {
        results.push({
          type: 'warning',
          message: `Variable '${variable.name}' is defined but never used`,
          variableName: variable.name
        });
      }
    });

    return results;
  }

  /**
   * Generate execution trace for debugging and visualization
   */
  static generateExecutionTrace(
    algorithm: Algorithm, 
    context: Record<string, unknown> = {}
  ): ExecutionTrace {
    const startTime = Date.now();
    const steps: ExecutionStep[] = [];
    const errors: string[] = [];
    let finalResult: unknown = null;

    try {
      // Initialize variables with default values
      const variables: Record<string, unknown> = {
        ...context,
        n: context.n || 0 // System variable
      };

      algorithm.variables.forEach(variable => {
        if (!(variable.name in variables)) {
          variables[variable.name] = this.parseVariableValue(
            variable.defaultValue || '', 
            variable.type
          );
        }
      });

      // Execute steps in order
      algorithm.steps.forEach((step, index) => {
        const stepStartTime = Date.now();
        let stepResult: unknown = null;
        let stepError: string | undefined = undefined;

        try {
          if (step.type === 'formula') {
            const formula = algorithm.formulas.find(f => f.id === step.id);
            if (formula) {
              stepResult = this.evaluateFormula(formula, variables);
              finalResult = stepResult;
            }
          } else if (step.type === 'condition') {
            const condition = algorithm.conditions.find(c => c.id === step.id);
            if (condition) {
              stepResult = this.evaluateCondition(condition, variables);
            }
          }

          const stepEndTime = Date.now();
          const variableDependencies = step.type === 'formula' 
            ? this.extractVariableDependencies(algorithm.formulas.find(f => f.id === step.id)?.expressions.javascript.value || '')
            : this.extractVariableDependencies(algorithm.conditions.find(c => c.id === step.id)?.expression || '');

          steps.push({
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            inputValues: { ...variables },
            outputValue: stepResult,
            error: stepError,
            executionTime: stepEndTime - stepStartTime,
            dependencies: variableDependencies
          });

        } catch (error) {
          stepError = error instanceof Error ? error.message : String(error);
          errors.push(`Step ${index + 1} (${step.name}): ${stepError}`);
          
          steps.push({
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            inputValues: { ...variables },
            outputValue: null,
            error: stepError,
            executionTime: Date.now() - stepStartTime,
            dependencies: []
          });
        }
      });

    } catch (error) {
      errors.push(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      steps,
      finalResult,
      errors,
      executionTime: Date.now() - startTime
    };
  }

  /**
   * Extract variable names from a JavaScript expression
   */
  private static extractVariableDependencies(expression: string): string[] {
    const dependencies: string[] = [];
    
    // Simple regex to find variable names (excluding function names and keywords)
    const variablePattern = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g;
    const matches = expression.match(variablePattern) || [];
    
    // Filter out common JavaScript keywords and functions
    const keywords = [
      'Math', 'sin', 'cos', 'tan', 'sqrt', 'pow', 'abs', 'round', 'floor', 'ceil', 
      'max', 'min', 'log', 'exp', 'true', 'false', 'null', 'undefined', 'if', 'else',
      'for', 'while', 'function', 'return', 'var', 'let', 'const'
    ];
    
    matches.forEach(match => {
      if (!keywords.includes(match)) {
        dependencies.push(match);
      }
    });

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Extract output variables from a JavaScript expression (simplified)
   */
  private static extractOutputVariables(expression: string): string[] {
    const outputs: string[] = [];
    
    // Look for assignment patterns like "variableName = ..."
    const assignmentPattern = /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/;
    const match = expression.match(assignmentPattern);
    
    if (match) {
      outputs.push(match[1]);
    }
    
    return outputs;
  }

  /**
   * Detect circular dependencies in the dependency graph
   */
  private static detectCircularDependencies(graph: DependencyGraph): string[][] {
    const circles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        circles.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = graph.nodes.find(n => n.id === nodeId);
      if (node) {
        node.dependencies.forEach(depId => {
          dfs(depId, [...path, nodeId]);
        });
      }

      recursionStack.delete(nodeId);
    };

    graph.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    });

    return circles;
  }

  /**
   * Parse variable value based on type
   */
  private static parseVariableValue(value: string, type: string): unknown {
    switch (type) {
      case 'number':
        return Number(value) || 0;
      case 'string':
        return value;
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'color':
        return value;
      default:
        return value;
    }
  }

  /**
   * Evaluate a formula with given variable context
   */
  private static evaluateFormula(formula: Formula, variables: Record<string, unknown>): unknown {
    try {
      const expression = formula.expressions.javascript.value;
      
      // Create a safe evaluation function with all variables in scope
      const variableNames = Object.keys(variables);
      const variableValues = Object.values(variables);
      
      // Create function with explicit variable names
      const evalFunction = new Function(...variableNames, `return ${expression}`);
      
      // Execute with variable values
      return evalFunction(...variableValues);
    } catch (error) {
      throw new Error(`Formula evaluation failed for ${formula.name}: ${error}`);
    }
  }

  /**
   * Evaluate a condition with given variable context
   */
  private static evaluateCondition(condition: Condition, variables: Record<string, unknown>): boolean {
    try {
      const expression = condition.expression;
      
      // Create a safe evaluation function with all variables in scope
      const variableNames = Object.keys(variables);
      const variableValues = Object.values(variables);
      
      // Create function with explicit variable names
      const evalFunction = new Function(...variableNames, `return ${expression}`);
      
      // Execute with variable values
      return Boolean(evalFunction(...variableValues));
    } catch (error) {
      throw new Error(`Condition evaluation failed for ${condition.name}: ${error}`);
    }
  }
} 