export interface Variable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'color';
  defaultValue?: string;
  description?: string;
  constraints?: {
    min?: number;
    max?: number;
    step?: number;
    pattern?: string;
  };
}

export interface Expression {
  value: string;
  metadata?: {
    allowedOperations?: Array<'math' | 'color' | 'dimension'>;
  };
}

export interface Formula {
  id: string;
  name: string;
  expressions: {
    latex: { value: string };
    javascript: Expression;
  };
  description?: string;
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
  resolvedValueTypeId: string;
  variables: Variable[];
  formulas: Formula[];
  conditions: Condition[];
  steps: AlgorithmStep[];
} 