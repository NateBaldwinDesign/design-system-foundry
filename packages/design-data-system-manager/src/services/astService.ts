import * as acorn from 'acorn';
import { ASTNode } from '../types/algorithm';

export class ASTService {
  private static readonly AST_VERSION = '1.0.0';

  /**
   * Parse a JavaScript expression into an AST node
   */
  static parseExpression(expression: string): ASTNode {
    try {
      // Parse the expression using acorn
      const ast = acorn.parse(expression, {
        ecmaVersion: 2020,
        sourceType: 'module',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true
      });

      // Convert acorn AST to our AST format
      const node = this.convertAcornNode(ast.body[0]);
      
      // Add metadata
      node.metadata = {
        astVersion: this.AST_VERSION,
        validationErrors: [],
        complexity: this.calculateComplexity(node)
      };

      return node;
    } catch (error) {
      // Return error node if parsing fails
      return {
        type: 'literal',
        value: expression,
        metadata: {
          astVersion: this.AST_VERSION,
          validationErrors: [error instanceof Error ? error.message : String(error)],
          complexity: 'low'
        }
      };
    }
  }

  /**
   * Generate JavaScript code from an AST node
   */
  static generateJavaScript(ast: ASTNode): string {
    switch (ast.type) {
      case 'binary': {
        if (!ast.left || !ast.right || !ast.operator) {
          throw new Error('Invalid binary operation: missing left, right, or operator');
        }
        return `(${this.generateJavaScript(ast.left)} ${ast.operator} ${this.generateJavaScript(ast.right)})`;
      }

      case 'unary': {
        if (!ast.operand || !ast.operator) {
          throw new Error('Invalid unary operation: missing operand or operator');
        }
        return `${ast.operator}${this.generateJavaScript(ast.operand)}`;
      }

      case 'variable': {
        if (!ast.variableName) {
          throw new Error('Invalid variable: missing variable name');
        }
        return ast.variableName;
      }

      case 'literal': {
        if (ast.value === undefined) {
          throw new Error('Invalid literal: missing value');
        }
        return typeof ast.value === 'string' ? `"${ast.value}"` : String(ast.value);
      }

      case 'function': {
        if (!ast.functionName) {
          throw new Error('Invalid function call: missing function name');
        }
        const args = ast.arguments?.map(arg => this.generateJavaScript(arg)).join(', ') || '';
        return `${ast.functionName}(${args})`;
      }

      case 'assignment': {
        if (!ast.variableName || !ast.expression) {
          throw new Error('Invalid assignment: missing variable name or expression');
        }
        return `${ast.variableName} = ${this.generateJavaScript(ast.expression)}`;
      }

      case 'group': {
        if (!ast.body) {
          throw new Error('Invalid group: missing body expression');
        }
        return `(${this.generateJavaScript(ast.body)})`;
      }

      default:
        throw new Error(`Unsupported AST node type: ${ast.type}`);
    }
  }

  /**
   * Validate an AST node and return validation errors
   */
  static validateAST(ast: ASTNode): string[] {
    const errors: string[] = [];
    
    try {
      // Basic AST structure validation
      if (!ast || typeof ast !== 'object') {
        errors.push('Invalid AST structure: AST must be an object');
        return errors;
      }
      
      // Validate required fields
      if (!ast.type) {
        errors.push('Missing required field: type');
      }
      
      // Validate specific node types
      this.validateNode(ast, errors);
      
      // Check for common issues
      this.checkCommonIssues(ast, errors);
      
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return errors;
  }

  private static validateNode(node: ASTNode, errors: string[]): void {
    if (!node) return;
    
    switch (node.type) {
      case 'binary':
        if (!node.left || !node.right || !node.operator) {
          errors.push(`Invalid binary expression: missing left, right, or operator`);
        }
        this.validateNode(node.left!, errors);
        this.validateNode(node.right!, errors);
        break;
        
      case 'unary':
        if (!node.operand || !node.operator) {
          errors.push(`Invalid unary expression: missing operand or operator`);
        }
        this.validateNode(node.operand!, errors);
        break;
        
      case 'function':
        if (!node.functionName) {
          errors.push(`Invalid function call: missing function name`);
        }
        if (node.arguments) {
          node.arguments.forEach((arg) => {
            this.validateNode(arg, errors);
          });
        }
        break;
        
      case 'variable':
        if (!node.variableName) {
          errors.push(`Invalid variable: missing variable name`);
        }
        break;
        
      case 'literal':
        if (node.value === undefined) {
          errors.push(`Invalid literal: missing value`);
        }
        break;
        
      case 'assignment':
        if (!node.variableName) {
          errors.push(`Invalid assignment: missing variable name`);
        }
        if (!node.expression) {
          errors.push(`Invalid assignment: missing expression`);
        }
        if (node.expression) {
          this.validateNode(node.expression, errors);
        }
        break;
        
      case 'group':
        if (!node.body) {
          errors.push(`Invalid group: missing body expression`);
        }
        if (node.body) {
          this.validateNode(node.body, errors);
        }
        break;
    }
  }

  private static checkCommonIssues(node: ASTNode, errors: string[]): void {
    // Check for division by zero
    if (node.type === 'binary' && node.operator === '/') {
      if (node.right?.type === 'literal' && node.right.value === 0) {
        errors.push(`Warning: Division by zero detected`);
      }
    }
    
    // Check for undefined variables (basic check)
    if (node.type === 'variable' && node.variableName) {
      const commonVars = ['n', 'base', 'exponent', 'value', 'value1', 'value2'];
      if (!commonVars.includes(node.variableName) && !node.variableName.startsWith('system_')) {
        errors.push(`Warning: Variable '${node.variableName}' may be undefined`);
      }
    }
    
    // Check for complex expressions
    if (node.type === 'binary' || node.type === 'function') {
      const complexity = this.calculateComplexityScore(node);
      if (complexity > 5) {
        errors.push(`Warning: Complex expression detected (complexity: ${complexity}). Consider breaking into smaller parts.`);
      }
    }
    
    // Recursively check children
    if (node.left) this.checkCommonIssues(node.left, errors);
    if (node.right) this.checkCommonIssues(node.right, errors);
    if (node.operand) this.checkCommonIssues(node.operand, errors);
    if (node.expression) this.checkCommonIssues(node.expression, errors);
    if (node.body) this.checkCommonIssues(node.body, errors);
    if (node.arguments) {
      node.arguments.forEach(arg => {
        this.checkCommonIssues(arg, errors);
      });
    }
  }

  /**
   * Convert acorn AST node to our AST format
   */
  private static convertAcornNode(node: acorn.Node): ASTNode {
    switch (node.type) {
      case 'ExpressionStatement':
        return this.convertAcornNode((node as acorn.ExpressionStatement).expression);

      case 'BinaryExpression': {
        const binaryNode = node as acorn.BinaryExpression;
        return {
          type: 'binary',
          operator: binaryNode.operator,
          left: this.convertAcornNode(binaryNode.left),
          right: this.convertAcornNode(binaryNode.right)
        };
      }

      case 'UnaryExpression': {
        const unaryNode = node as acorn.UnaryExpression;
        return {
          type: 'unary',
          operator: unaryNode.operator,
          operand: this.convertAcornNode(unaryNode.argument)
        };
      }

      case 'Identifier': {
        const identifierNode = node as acorn.Identifier;
        return {
          type: 'variable',
          variableName: identifierNode.name
        };
      }

      case 'Literal': {
        const literalNode = node as acorn.Literal;
        return {
          type: 'literal',
          value: literalNode.value === null ? undefined : literalNode.value as string | number | boolean
        };
      }

      case 'CallExpression': {
        const callNode = node as acorn.CallExpression;
        return {
          type: 'function',
          functionName: this.getFunctionName(callNode.callee),
          arguments: callNode.arguments.map((arg: acorn.Node) => this.convertAcornNode(arg))
        };
      }

      case 'AssignmentExpression': {
        const assignmentNode = node as acorn.AssignmentExpression;
        return {
          type: 'assignment',
          variableName: (assignmentNode.left as acorn.Identifier).name,
          expression: this.convertAcornNode(assignmentNode.right)
        };
      }

      case 'ParenthesizedExpression': {
        const parenNode = node as acorn.ParenthesizedExpression;
        return {
          type: 'group',
          body: this.convertAcornNode(parenNode.expression)
        };
      }

      case 'MemberExpression': {
        const memberNode = node as acorn.MemberExpression;
        // Handle Math.pow, Math.sqrt, etc.
        if ((memberNode.object as acorn.Identifier).name === 'Math' && 
            memberNode.property.type === 'Identifier') {
          return {
            type: 'function',
            functionName: `Math.${(memberNode.property as acorn.Identifier).name}`,
            arguments: []
          };
        }
        // Fall through to default case
        return {
          type: 'literal',
          value: this.generateMemberExpression(memberNode)
        };
      }

      default:
        // For unsupported nodes, return as literal with the original code
        return {
          type: 'literal',
          value: this.generateCodeFromNode(node)
        };
    }
  }

  /**
   * Get function name from callee node
   */
  private static getFunctionName(callee: acorn.Node): string {
    if (callee.type === 'Identifier') {
      return (callee as acorn.Identifier).name;
    } else if (callee.type === 'MemberExpression') {
      const memberNode = callee as acorn.MemberExpression;
      return `${this.getFunctionName(memberNode.object)}.${(memberNode.property as acorn.Identifier).name}`;
    }
    return 'unknown';
  }

  /**
   * Generate member expression code (e.g., Math.pow)
   */
  private static generateMemberExpression(node: acorn.MemberExpression): string {
    if (node.object.type === 'Identifier' && node.property.type === 'Identifier') {
      return `${(node.object as acorn.Identifier).name}.${(node.property as acorn.Identifier).name}`;
    }
    return 'unknown';
  }

  /**
   * Generate code from an unsupported node
   */
  private static generateCodeFromNode(node: acorn.Node): string {
    // This is a simplified fallback - in a real implementation,
    // you'd want to handle more node types
    return JSON.stringify(node);
  }

  /**
   * Calculate expression complexity
   */
  static calculateComplexity(ast: ASTNode): 'low' | 'medium' | 'high' {
    const complexity = this.calculateComplexityScore(ast);
    
    if (complexity <= 3) return 'low';
    if (complexity <= 8) return 'medium';
    return 'high';
  }

  private static calculateComplexityScore(node: ASTNode): number {
    let complexity = 1;
    
    switch (node.type) {
      case 'binary':
        complexity += this.calculateComplexityScore(node.left!);
        complexity += this.calculateComplexityScore(node.right!);
        break;
      case 'unary':
        complexity += this.calculateComplexityScore(node.operand!);
        break;
      case 'function':
        complexity += 2; // Functions add more complexity
        if (node.arguments) {
          node.arguments.forEach(arg => {
            complexity += this.calculateComplexityScore(arg);
          });
        }
        break;
      case 'group':
        if (node.body) {
          complexity += this.calculateComplexityScore(node.body);
        }
        break;
      case 'assignment':
        if (node.expression) {
          complexity += this.calculateComplexityScore(node.expression);
        }
        break;
    }
    
    return complexity;
  }

  /**
   * Extract variable names from AST
   */
  static extractVariables(ast: ASTNode): string[] {
    const variables: string[] = [];

    const traverse = (node: ASTNode) => {
      if (node.type === 'variable' && node.variableName) {
        variables.push(node.variableName);
      }

      switch (node.type) {
        case 'binary':
          if (node.left) traverse(node.left);
          if (node.right) traverse(node.right);
          break;
        case 'unary':
          if (node.operand) traverse(node.operand);
          break;
        case 'function':
          if (node.arguments) {
            node.arguments.forEach(arg => traverse(arg));
          }
          break;
        case 'assignment':
          if (node.expression) traverse(node.expression);
          break;
        case 'group':
          if (node.body) traverse(node.body);
          break;
      }
    };

    traverse(ast);
    return [...new Set(variables)]; // Remove duplicates
  }

  /**
   * Optimize expression by simplifying constants and removing redundant operations
   */
  static optimizeExpression(ast: ASTNode): ASTNode {
    if (!ast) return ast;
    
    try {
      // Deep clone the AST to avoid modifying the original
      const optimized = this.cloneAST(ast);
      
      // Apply optimization passes
      this.constantFolding(optimized);
      this.removeRedundantOperations(optimized);
      this.simplifyExpressions(optimized);
      
      return optimized;
    } catch (error) {
      console.warn('Expression optimization failed:', error);
      return ast; // Return original if optimization fails
    }
  }

  /**
   * Perform constant folding (evaluate constant expressions)
   */
  private static constantFolding(node: ASTNode): void {
    if (!node) return;
    
    switch (node.type) {
      case 'binary':
        if (node.left && node.right) {
          this.constantFolding(node.left);
          this.constantFolding(node.right);
          
          // If both operands are literals, evaluate the expression
          if (node.left.type === 'literal' && node.right.type === 'literal') {
            const leftVal = Number(node.left.value);
            const rightVal = Number(node.right.value);
            
            if (!isNaN(leftVal) && !isNaN(rightVal)) {
              let result: number;
              switch (node.operator) {
                case '+': result = leftVal + rightVal; break;
                case '-': result = leftVal - rightVal; break;
                case '*': result = leftVal * rightVal; break;
                case '/': result = rightVal !== 0 ? leftVal / rightVal : NaN; break;
                case '^': result = Math.pow(leftVal, rightVal); break;
                default: return;
              }
              
              if (!isNaN(result)) {
                node.type = 'literal';
                node.value = result;
                delete node.left;
                delete node.right;
                delete node.operator;
              }
            }
          }
        }
        break;
        
      case 'unary':
        if (node.operand) {
          this.constantFolding(node.operand);
          
          if (node.operand.type === 'literal') {
            const val = Number(node.operand.value);
            if (!isNaN(val)) {
              let result: number;
              switch (node.operator) {
                case '-': result = -val; break;
                case '!': result = val ? 0 : 1; break;
                default: return;
              }
              
              node.type = 'literal';
              node.value = result;
              delete node.operand;
              delete node.operator;
            }
          }
        }
        break;
        
      case 'function':
        if (node.arguments) {
          node.arguments.forEach(arg => this.constantFolding(arg));
          
          // Evaluate Math functions with constant arguments
          if (node.functionName?.startsWith('Math.') && node.arguments.length > 0) {
            const allConstants = node.arguments.every(arg => arg.type === 'literal');
            if (allConstants) {
              const args = node.arguments.map(arg => Number(arg.value));
              if (args.every(arg => !isNaN(arg))) {
                let result: number;
                switch (node.functionName) {
                  case 'Math.abs': result = Math.abs(args[0]); break;
                  case 'Math.round': result = Math.round(args[0]); break;
                  case 'Math.floor': result = Math.floor(args[0]); break;
                  case 'Math.ceil': result = Math.ceil(args[0]); break;
                  case 'Math.sqrt': result = Math.sqrt(args[0]); break;
                  case 'Math.pow': result = Math.pow(args[0], args[1]); break;
                  case 'Math.min': result = Math.min(...args); break;
                  case 'Math.max': result = Math.max(...args); break;
                  default: return;
                }
                
                if (!isNaN(result)) {
                  node.type = 'literal';
                  node.value = result;
                  delete node.functionName;
                  delete node.arguments;
                }
              }
            }
          }
        }
        break;
        
      case 'group':
        if (node.body) {
          this.constantFolding(node.body);
        }
        break;
        
      case 'assignment':
        if (node.expression) {
          this.constantFolding(node.expression);
        }
        break;
    }
  }

  /**
   * Remove redundant operations (e.g., x + 0, x * 1, x ^ 1)
   */
  private static removeRedundantOperations(node: ASTNode): void {
    if (!node) return;
    
    switch (node.type) {
      case 'binary':
        if (node.left && node.right) {
          this.removeRedundantOperations(node.left);
          this.removeRedundantOperations(node.right);
          
          // x + 0 = x
          if (node.operator === '+' && node.right.type === 'literal' && node.right.value === 0) {
            this.replaceNode(node, node.left);
            return;
          }
          
          // 0 + x = x
          if (node.operator === '+' && node.left.type === 'literal' && node.left.value === 0) {
            this.replaceNode(node, node.right);
            return;
          }
          
          // x * 1 = x
          if (node.operator === '*' && node.right.type === 'literal' && node.right.value === 1) {
            this.replaceNode(node, node.left);
            return;
          }
          
          // 1 * x = x
          if (node.operator === '*' && node.left.type === 'literal' && node.left.value === 1) {
            this.replaceNode(node, node.right);
            return;
          }
          
          // x ^ 1 = x
          if (node.operator === '^' && node.right.type === 'literal' && node.right.value === 1) {
            this.replaceNode(node, node.left);
            return;
          }
          
          // x ^ 0 = 1
          if (node.operator === '^' && node.right.type === 'literal' && node.right.value === 0) {
            node.type = 'literal';
            node.value = 1;
            delete node.left;
            delete node.right;
            delete node.operator;
            return;
          }
        }
        break;
        
      case 'unary':
        if (node.operand) {
          this.removeRedundantOperations(node.operand);
          
          // -(-x) = x
          if (node.operator === '-' && node.operand.type === 'unary' && node.operand.operator === '-') {
            this.replaceNode(node, node.operand.operand!);
            return;
          }
        }
        break;
        
      case 'group':
        if (node.body) {
          this.removeRedundantOperations(node.body);
          
          // Remove unnecessary parentheses around literals or variables
          if (node.body.type === 'literal' || node.body.type === 'variable') {
            this.replaceNode(node, node.body);
            return;
          }
        }
        break;
        
      case 'function':
        if (node.arguments) {
          node.arguments.forEach(arg => this.removeRedundantOperations(arg));
        }
        break;
        
      case 'assignment':
        if (node.expression) {
          this.removeRedundantOperations(node.expression);
        }
        break;
    }
  }

  /**
   * Simplify expressions by combining like terms and other simplifications
   */
  private static simplifyExpressions(node: ASTNode): void {
    if (!node) return;
    
    switch (node.type) {
      case 'binary':
        if (node.left && node.right) {
          this.simplifyExpressions(node.left);
          this.simplifyExpressions(node.right);
          
          // Combine like terms: x + x = 2x
          if (node.operator === '+' && 
              node.left.type === 'variable' && 
              node.right.type === 'variable' &&
              node.left.variableName === node.right.variableName) {
            
            // Create 2 * x
            node.operator = '*';
            node.left = {
              type: 'literal',
              value: 2
            };
            // node.right stays the same (x)
          }
        }
        break;
        
      case 'unary':
        if (node.operand) {
          this.simplifyExpressions(node.operand);
        }
        break;
        
      case 'group':
        if (node.body) {
          this.simplifyExpressions(node.body);
        }
        break;
        
      case 'function':
        if (node.arguments) {
          node.arguments.forEach(arg => this.simplifyExpressions(arg));
        }
        break;
        
      case 'assignment':
        if (node.expression) {
          this.simplifyExpressions(node.expression);
        }
        break;
    }
  }

  /**
   * Deep clone an AST node
   */
  private static cloneAST(node: ASTNode): ASTNode {
    if (!node) return node;
    
    const cloned: ASTNode = { type: node.type };
    
    if (node.operator) cloned.operator = node.operator;
    if (node.value !== undefined) cloned.value = node.value;
    if (node.variableName) cloned.variableName = node.variableName;
    if (node.functionName) cloned.functionName = node.functionName;
    if (node.expression) cloned.expression = this.cloneAST(node.expression);
    if (node.body) cloned.body = this.cloneAST(node.body);
    
    if (node.left) cloned.left = this.cloneAST(node.left);
    if (node.right) cloned.right = this.cloneAST(node.right);
    if (node.operand) cloned.operand = this.cloneAST(node.operand);
    
    if (node.arguments) {
      cloned.arguments = node.arguments.map(arg => this.cloneAST(arg));
    }
    
    if (node.metadata) {
      cloned.metadata = { ...node.metadata };
    }
    
    return cloned;
  }

  /**
   * Replace a node with another node (used in optimization)
   */
  private static replaceNode(target: ASTNode, replacement: ASTNode): void {
    Object.assign(target, replacement);
  }

  /**
   * Generate JavaScript code from AST
   */
  static generateCode(ast: ASTNode): string {
    if (!ast) return '';
    
    try {
      switch (ast.type) {
        case 'literal': {
          return String(ast.value);
        }
          
        case 'variable': {
          return ast.variableName || '';
        }
          
        case 'binary': {
          const left = this.generateCode(ast.left!);
          const right = this.generateCode(ast.right!);
          return `${left} ${ast.operator} ${right}`;
        }
          
        case 'unary': {
          const operand = this.generateCode(ast.operand!);
          return `${ast.operator}${operand}`;
        }
          
        case 'function': {
          const args = ast.arguments?.map(arg => this.generateCode(arg)).join(', ') || '';
          return `${ast.functionName}(${args})`;
        }
          
        case 'group': {
          const body = this.generateCode(ast.body!);
          return `(${body})`;
        }
          
        case 'assignment': {
          const expression = this.generateCode(ast.expression!);
          return `${ast.variableName} = ${expression}`;
        }
          
        default:
          return '';
      }
    } catch (error) {
      console.warn('Code generation failed:', error);
      return '';
    }
  }
} 