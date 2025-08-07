/**
 * JSON Validator Utility
 * 
 * Helps validate and debug JSON files with syntax errors.
 */
export class JsonValidator {
  /**
   * Validate JSON string and provide detailed error information
   */
  static validateJson(jsonString: string, context: string = 'JSON'): {
    isValid: boolean;
    error?: string;
    lineNumber?: number;
    columnNumber?: number;
    position?: number;
    problematicLine?: string;
    suggestions?: string[];
  } {
    try {
      JSON.parse(jsonString);
      return { isValid: true };
    } catch (error) {
      if (error instanceof SyntaxError) {
        const result = this.analyzeSyntaxError(error, jsonString, context);
        return {
          isValid: false,
          error: error.message,
          ...result
        };
      }
      
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown JSON error'
      };
    }
  }

  /**
   * Analyze syntax error and provide detailed information
   */
  private static analyzeSyntaxError(
    error: SyntaxError, 
    jsonString: string, 
    context: string
  ): {
    lineNumber?: number;
    columnNumber?: number;
    position?: number;
    problematicLine?: string;
    suggestions?: string[];
  } {
    const result: {
      lineNumber?: number;
      columnNumber?: number;
      position?: number;
      problematicLine?: string;
      suggestions?: string[];
    } = {};

    // Extract position from error message
    const positionMatch = error.message.match(/position (\d+)/);
    if (positionMatch) {
      const position = parseInt(positionMatch[1]);
      result.position = position;

      // Calculate line and column numbers
      const lines = jsonString.split('\n');
      let currentPos = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineLength = line.length + 1; // +1 for newline
        
        if (currentPos + lineLength > position) {
          result.lineNumber = i + 1;
          result.columnNumber = position - currentPos;
          result.problematicLine = line;
          break;
        }
        
        currentPos += lineLength;
      }
    }

    // Generate suggestions based on error type
    result.suggestions = this.generateSuggestions(error, result.problematicLine);

    return result;
  }

  /**
   * Generate suggestions for common JSON syntax errors
   */
  private static generateSuggestions(
    error: SyntaxError, 
    problematicLine?: string
  ): string[] {
    const suggestions: string[] = [];

    if (error.message.includes('Unexpected token')) {
      suggestions.push('Check for missing commas between object properties or array elements');
      suggestions.push('Ensure all strings are properly quoted with double quotes');
      suggestions.push('Verify that all brackets and braces are properly closed');
    }

    if (error.message.includes('Unexpected end of JSON input')) {
      suggestions.push('Check for missing closing brackets, braces, or quotes');
      suggestions.push('Ensure the JSON file is complete and not truncated');
    }

    if (error.message.includes('Unexpected number')) {
      suggestions.push('Check for invalid number formats (e.g., leading zeros, invalid decimals)');
      suggestions.push('Ensure numbers are not quoted as strings');
    }

    if (error.message.includes('Unexpected string')) {
      suggestions.push('Check for unescaped quotes within strings');
      suggestions.push('Ensure all strings use double quotes, not single quotes');
    }

    if (problematicLine) {
      // Analyze the specific line for common issues
      if (problematicLine.includes("'") && !problematicLine.includes('"')) {
        suggestions.push('Replace single quotes with double quotes for JSON strings');
      }

      if (problematicLine.includes(',,') || problematicLine.includes(',]') || problematicLine.includes(',}')) {
        suggestions.push('Remove trailing comma before closing bracket or brace');
      }

      if (problematicLine.includes('undefined') || problematicLine.includes('null')) {
        suggestions.push('Use "null" instead of "undefined" in JSON');
      }

      if (problematicLine.includes('//') || problematicLine.includes('/*')) {
        suggestions.push('Remove JavaScript-style comments - JSON does not support comments');
      }
    }

    return suggestions;
  }

  /**
   * Format error information for console output
   */
  static formatErrorInfo(
    error: SyntaxError,
    jsonString: string,
    context: string
  ): string {
    const analysis = this.analyzeSyntaxError(error, jsonString, context);
    
    let output = `\n[JsonValidator] JSON Syntax Error in ${context}:\n`;
    output += `Error: ${error.message}\n`;
    
    if (analysis.lineNumber && analysis.columnNumber) {
      output += `Location: Line ${analysis.lineNumber}, Column ${analysis.columnNumber}\n`;
    }
    
    if (analysis.problematicLine) {
      output += `Problematic Line: ${analysis.problematicLine}\n`;
      
      // Show the line with a caret pointing to the error
      if (analysis.columnNumber) {
        const indent = ' '.repeat(analysis.columnNumber - 1);
        output += `              ${indent}^\n`;
      }
    }
    
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      output += `Suggestions:\n`;
      analysis.suggestions.forEach(suggestion => {
        output += `  - ${suggestion}\n`;
      });
    }
    
    return output;
  }

  /**
   * Validate and format JSON with proper indentation
   */
  static formatJson(jsonString: string): {
    isValid: boolean;
    formatted?: string;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(jsonString);
      const formatted = JSON.stringify(parsed, null, 2);
      return {
        isValid: true,
        formatted
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 