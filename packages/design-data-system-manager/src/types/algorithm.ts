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
  modeBased?: boolean;
  modeValues?: {
    [modeId: string]: string;
  };
  dimensionId?: string;
}

export interface Expression {
  value: string;
  metadata?: {
    allowedOperations?: string[];
  };
}

export interface ASTNode {
  type: 'binary' | 'unary' | 'variable' | 'literal' | 'function' | 'assignment' | 'group';
  operator?: string;
  left?: ASTNode;
  right?: ASTNode;
  operand?: ASTNode;
  value?: string | number | boolean;
  variableName?: string;
  functionName?: string;
  arguments?: ASTNode[];
  expression?: ASTNode;
  body?: ASTNode;
  metadata?: {
    astVersion?: string;
    validationErrors?: string[];
    complexity?: 'low' | 'medium' | 'high';
  };
}

export interface Formula {
  id: string;
  name: string;
  expressions: {
    latex: { value: string };
    javascript: Expression;
    ast: ASTNode;
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

export interface TokenGeneration {
  enabled: boolean;
  iterationRange: {
    start: number;
    end: number;
    step: number;
  };
  bulkAssignments: {
    resolvedValueTypeId: string;
    taxonomies: Array<{ taxonomyId: string; termId: string }>;
    collectionId?: string;
    tokenTier: 'PRIMITIVE' | 'SEMANTIC' | 'COMPONENT';
    private: boolean;
    status: 'experimental' | 'stable' | 'deprecated' | '';
    themeable: boolean;
  };
  logicalMapping: {
    scaleType: 'numeric' | 'tshirt';
    defaultValue: string;
    increasingStep?: number;
    decreasingStep?: number;
    extraPrefix?: string;
    incrementDirection: 'ascending' | 'descending';
    taxonomyId?: string;
    newTaxonomyName?: string;
  };
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
  tokenGeneration?: TokenGeneration;
} 