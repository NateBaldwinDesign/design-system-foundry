export interface Variable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean';
  defaultValue?: string | number | boolean;
}

export interface Formula {
  id: string;
  name: string;
  expression: string;
  latexExpression: string;
  description: string;
  variableIds: string[];
}

export interface Condition {
  id: string;
  name: string;
  expression: string;
  variableIds: string[];
}

export interface AlgorithmStep {
  type: 'formula' | 'condition';
  id: string;
  name: string;
}

export interface Algorithm {
  id: string;
  name: string;
  description?: string;
  variables: Variable[];
  formulas: Formula[];
  conditions: Condition[];
  steps: AlgorithmStep[];
} 