// Block model for formulas
export interface FormulaBlock {
  id: string;
  type: 'variable' | 'operator' | 'group' | 'value' | 'function';
  content: string;
  value?: string | number;
  children?: FormulaBlock[];
  args?: FormulaBlock[]; // for function blocks
}

// --- Utility helpers ---
function isSimpleVar(str: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str.trim());
}
function isNumber(str: string): boolean {
  return /^\d+(\.\d+)?$/.test(str.trim());
}
function wrapIfNeeded(str: string): string {
  str = str.trim();
  if (isSimpleVar(str)) return `{${str}}`;
  if (isNumber(str)) return str;
  if (/^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(str)) return str;
  if (/^\(.*\)$/.test(str)) return str;
  return `{${str}}`;
}
function unwrapIfNeeded(str: string): string {
  str = str.trim();
  if (/^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(str)) return str.slice(1, -1);
  if (/^\([^()]+\)$/.test(str)) {
    const inner = str.slice(1, -1);
    if (isSimpleVar(inner) || isNumber(inner)) return inner;
  }
  if (/^\\mathit\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/.test(str)) return str.replace(/^\\mathit\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/, '$1');
  return str;
}

// --- JavaScript → LaTeX ---
export function convertJavaScriptToLatex(js: string): string {
  let latex = js;

  // Math functions
  latex = latex.replace(/Math\.pow\(([^,]+),\s*([^)]+)\)/g, (_, base, exp) => `${wrapIfNeeded(base)}^{${wrapIfNeeded(exp)}}`);
  latex = latex.replace(/Math\.sqrt\(([^)]+)\)/g, (_, arg) => `\\sqrt{${wrapIfNeeded(arg)}}`);
  latex = latex.replace(/Math\.abs\(([^)]+)\)/g, (_, arg) => `|${wrapIfNeeded(arg)}|`);
  latex = latex.replace(/Math\.floor\(([^)]+)\)/g, (_, arg) => `\\lfloor ${wrapIfNeeded(arg)} \\rfloor`);
  latex = latex.replace(/Math\.ceil\(([^)]+)\)/g, (_, arg) => `\\lceil ${wrapIfNeeded(arg)} \\rceil`);
  latex = latex.replace(/Math\.round\(([^)]+)\)/g, (_, arg) => `\\text{round}(${wrapIfNeeded(arg)})`);
  latex = latex.replace(/Math\.min\(([^)]+)\)/g, (_, args) => `\\min(${args.split(',').map((a: string) => wrapIfNeeded(a.trim())).join(', ')})`);
  latex = latex.replace(/Math\.max\(([^)]+)\)/g, (_, args) => `\\max(${args.split(',').map((a: string) => wrapIfNeeded(a.trim())).join(', ')})`);
  latex = latex.replace(/Math\.sin\(([^)]+)\)/g, (_, arg) => `\\sin(${wrapIfNeeded(arg)})`);
  latex = latex.replace(/Math\.cos\(([^)]+)\)/g, (_, arg) => `\\cos(${wrapIfNeeded(arg)})`);
  latex = latex.replace(/Math\.tan\(([^)]+)\)/g, (_, arg) => `\\tan(${wrapIfNeeded(arg)})`);
  latex = latex.replace(/Math\.log10\(([^)]+)\)/g, (_, arg) => `\\log_{10}(${wrapIfNeeded(arg)})`);
  latex = latex.replace(/Math\.log\(([^)]+)\)/g, (_, arg) => `\\ln(${wrapIfNeeded(arg)})`);
  latex = latex.replace(/Math\.exp\(([^)]+)\)/g, (_, arg) => `e^{${wrapIfNeeded(arg)}}`);

  // Operators: more robust regex to handle various cases
  latex = latex.replace(/([a-zA-Z0-9_{}]+)\s*\*\s*([a-zA-Z0-9_{}]+)/g, '$1 \\times $2');
  latex = latex.replace(/([a-zA-Z0-9_{}]+)\s*\/\s*([a-zA-Z0-9_{}]+)/g, '$1 \\div $2');
  latex = latex.replace(/([a-zA-Z0-9_{}]+)\s*%\s*([a-zA-Z0-9_{}]+)/g, '$1 \\bmod $2');
  latex = latex.replace(/([a-zA-Z0-9_{}]+)\s*\+\s*([a-zA-Z0-9_{}]+)/g, '$1 + $2');
  latex = latex.replace(/([a-zA-Z0-9_{}]+)\s*-\s*([a-zA-Z0-9_{}]+)/g, '$1 - $2');

  // Comparisons
  latex = latex.replace(/>=/g, ' \\geq ');
  latex = latex.replace(/<=/g, ' \\leq ');
  latex = latex.replace(/!=/g, ' \\neq ');
  latex = latex.replace(/=>/g, ' \\Rightarrow ');

  // Fallback: wrap unknowns as {variable}, but avoid double wrapping
  latex = latex.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match, varName) => {
    if ([
      'sin','cos','tan','log','ln','min','max','round','sqrt','exp','pow','abs','floor','ceil','div','bmod','geq','leq','neq','Rightarrow','lfloor','rfloor','lceil','rceil','e'
    ].includes(varName)) return varName;
    if (isNumber(varName)) return varName;
    if (/^\{[a-zA-Z_][a-zA-Z0-9_]*\}$/.test(match)) return match;
    return `{${varName}}`;
  });

  // Remove double braces
  latex = latex.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, '{$1}');

  // Ensure function calls have parentheses
  latex = latex.replace(/(\\[a-z]+)\{([a-zA-Z0-9_{}]+)\}/g, (match, func, arg) => `${func}(${arg})`);

  // Clean up spaces: ensure space after } and before {, and around operators
  latex = latex.replace(/}([a-zA-Z\\])/g, '} $1');
  latex = latex.replace(/([a-zA-Z\\])\{/g, '$1 {');
  latex = latex.replace(/\s+/g, ' ').trim();

  return latex;
}

// --- LaTeX → JavaScript ---
export function convertLatexToJavaScript(latex: string): string {
  let js = latex;

  // Remove \mathit{} wrapper
  js = js.replace(/\\mathit\{([^}]+)\}/g, (match, varName) => varName);

  // Handle power expressions first (before other functions)
  js = js.replace(/([a-zA-Z0-9_{}]+)\^\{([^}]+)\}/g, (match, base, exp) => `Math.pow(${unwrapIfNeeded(base)}, ${unwrapIfNeeded(exp)})`);

  // Functions with proper argument handling
  js = js.replace(/\\sqrt\{([^}]+)\}/g, (match, arg) => `Math.sqrt(${unwrapIfNeeded(arg)})`);
  js = js.replace(/\\sin\(([^)]+)\)/g, (match, arg) => `Math.sin(${unwrapIfNeeded(arg)})`);
  js = js.replace(/\\cos\(([^)]+)\)/g, (match, arg) => `Math.cos(${unwrapIfNeeded(arg)})`);
  js = js.replace(/\\tan\(([^)]+)\)/g, (match, arg) => `Math.tan(${unwrapIfNeeded(arg)})`);
  js = js.replace(/\\ln\(([^)]+)\)/g, (match, arg) => `Math.log(${unwrapIfNeeded(arg)})`);
  js = js.replace(/\\log_\{10\}\(([^)]+)\)/g, (match, arg) => `Math.log10(${unwrapIfNeeded(arg)})`);
  js = js.replace(/\\min\(([^)]+)\)/g, (match, args) => `Math.min(${args.split(',').map((a: string) => unwrapIfNeeded(a.trim())).join(', ')})`);
  js = js.replace(/\\max\(([^)]+)\)/g, (match, args) => `Math.max(${args.split(',').map((a: string) => unwrapIfNeeded(a.trim())).join(', ')})`);
  js = js.replace(/\\lfloor ([^\\]+) \\rfloor/g, (match, arg) => `Math.floor(${unwrapIfNeeded(arg)})`);
  js = js.replace(/\\lceil ([^\\]+) \\rceil/g, (match, arg) => `Math.ceil(${unwrapIfNeeded(arg)})`);
  js = js.replace(/\\text\{round\}\(([^)]+)\)/g, (match, arg) => `Math.round(${unwrapIfNeeded(arg)})`);
  js = js.replace(/e\^\{([^}]+)\}/g, (match, arg) => `Math.exp(${unwrapIfNeeded(arg)})`);
  js = js.replace(/\|([^|]+)\|/g, (match, arg) => `Math.abs(${unwrapIfNeeded(arg)})`);

  // Operators - handle LaTeX operators properly (including the specific format with spaces)
  js = js.replace(/\\\s*times/g, '*');
  js = js.replace(/\\\s*div/g, '/');
  js = js.replace(/\\\s*bmod/g, '%');
  
  // Clean up operator spacing
  js = js.replace(/\s*\+\s*/g, ' + ');
  js = js.replace(/\s*\*\s*/g, ' * ');
  js = js.replace(/\s*\/\s*/g, ' / ');
  js = js.replace(/\s*%\s*/g, ' % ');

  // Comparisons
  js = js.replace(/\s*\\geq\s*/g, ' >= ');
  js = js.replace(/\s*\\leq\s*/g, ' <= ');
  js = js.replace(/\s*\\neq\s*/g, ' != ');
  js = js.replace(/\s*\\Rightarrow\s*/g, ' => ');

  // Fallback: unwrap {var} to var, but be more careful about nested expressions
  js = js.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, varName) => varName);

  // Remove extra whitespace
  js = js.replace(/\s+/g, ' ').trim();

  return js;
}

// Helper function to build formula from blocks (tree structure)
export function buildFormulaFromBlocks(blocks: FormulaBlock[]): string {
  let formula = '';
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];
    
    switch (block.type) {
      case 'variable':
        formula += block.content;
        break;
      case 'operator':
        if (block.content === '^') {
          // Handle power operator - convert to Math.pow if there are variables
          const base = formula.trim();
          i++;
          if (i < blocks.length) {
            const exponent = buildFormulaFromBlocks([blocks[i]]);
            // Check if base and exponent are variables (not numbers)
            const baseIsVar = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(base);
            const exponentIsVar = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(exponent);
            
            if (baseIsVar || exponentIsVar) {
              // Use Math.pow for variables
              formula = `Math.pow(${base}, ${exponent})`;
            } else {
              // Use ^ for simple expressions
              formula += ` ^ ${exponent}`;
            }
          }
        } else {
          formula += ` ${block.content} `;
        }
        break;
      case 'function':
        // Handle function blocks (e.g., Math.pow)
        if (block.content === 'Math.pow' && block.args && block.args.length === 2) {
          const base = buildFormulaFromBlocks([block.args[0]]);
          const exponent = buildFormulaFromBlocks([block.args[1]]);
          formula += `Math.pow(${base}, ${exponent})`;
        } else if (block.content === 'Math.sqrt' && block.args && block.args.length === 1) {
          const arg = buildFormulaFromBlocks([block.args[0]]);
          formula += `Math.sqrt(${arg})`;
        } else if (block.content === 'Math.abs' && block.args && block.args.length === 1) {
          const arg = buildFormulaFromBlocks([block.args[0]]);
          formula += `Math.abs(${arg})`;
        } else if (block.content === 'Math.floor' && block.args && block.args.length === 1) {
          const arg = buildFormulaFromBlocks([block.args[0]]);
          formula += `Math.floor(${arg})`;
        } else if (block.content === 'Math.ceil' && block.args && block.args.length === 1) {
          const arg = buildFormulaFromBlocks([block.args[0]]);
          formula += `Math.ceil(${arg})`;
        } else if (block.content === 'Math.round' && block.args && block.args.length === 1) {
          const arg = buildFormulaFromBlocks([block.args[0]]);
          formula += `Math.round(${arg})`;
        } else if (block.content === 'Math.min' && block.args && block.args.length >= 1) {
          const args = block.args.map(arg => buildFormulaFromBlocks([arg])).join(', ');
          formula += `Math.min(${args})`;
        } else if (block.content === 'Math.max' && block.args && block.args.length >= 1) {
          const args = block.args.map(arg => buildFormulaFromBlocks([arg])).join(', ');
          formula += `Math.max(${args})`;
        } else if (block.content === 'Math.sin' && block.args && block.args.length === 1) {
          const arg = buildFormulaFromBlocks([block.args[0]]);
          formula += `Math.sin(${arg})`;
        } else if (block.content === 'Math.cos' && block.args && block.args.length === 1) {
          const arg = buildFormulaFromBlocks([block.args[0]]);
          formula += `Math.cos(${arg})`;
        } else if (block.content === 'Math.tan' && block.args && block.args.length === 1) {
          const arg = buildFormulaFromBlocks([block.args[0]]);
          formula += `Math.tan(${arg})`;
        } else if (block.content === 'Math.log' && block.args && block.args.length === 1) {
          const arg = buildFormulaFromBlocks([block.args[0]]);
          formula += `Math.log(${arg})`;
        } else if (block.content === 'Math.log10' && block.args && block.args.length === 1) {
          const arg = buildFormulaFromBlocks([block.args[0]]);
          formula += `Math.log10(${arg})`;
        } else if (block.content === 'Math.exp' && block.args && block.args.length === 1) {
          const arg = buildFormulaFromBlocks([block.args[0]]);
          formula += `Math.exp(${arg})`;
        } else {
          // Generic function call
          const args = block.args ? block.args.map(arg => buildFormulaFromBlocks([arg])).join(', ') : '';
          formula += `${block.content}(${args})`;
        }
        break;
      case 'group': {
        // Preserve parentheses for groups - they are important for operator precedence
        // But don't add parentheses for groups that are function arguments
        const groupContent = block.children ? buildFormulaFromBlocks(block.children) : '';
        // Check if this group is a function argument (no parentheses needed)
        // or a regular group (parentheses needed)
        if (block.content === '()' && block.children && block.children.length > 1) {
          formula += `(${groupContent})`;
        } else {
          formula += groupContent;
        }
        break;
      }
      case 'value':
        formula += block.content;
        break;
      default:
        formula += '';
    }
    i++;
  }

  return formula.trim();
}

// Helper function to parse formula string into blocks (tree structure)
export function parseFormulaToBlocks(formula: string): FormulaBlock[] {
  // Handle complex nested expressions by parsing the entire formula
  const blocks: FormulaBlock[] = [];
  let currentIndex = 0;
  
  while (currentIndex < formula.length) {
    const remainingFormula = formula.slice(currentIndex);
    
    // Try to match Math functions first
    const mathFunctionMatch = remainingFormula.match(/^Math\.(pow|sqrt|abs|floor|ceil|round|min|max|sin|cos|tan|log|log10|exp)\(/);
    if (mathFunctionMatch) {
      const funcName = `Math.${mathFunctionMatch[1]}`;
      const funcStart = currentIndex + mathFunctionMatch[0].length;
      
      // Find the closing parenthesis for this function
      let parenCount = 1;
      let funcEnd = funcStart;
      
      while (funcEnd < formula.length && parenCount > 0) {
        if (formula[funcEnd] === '(') parenCount++;
        if (formula[funcEnd] === ')') parenCount--;
        funcEnd++;
      }
      
      if (parenCount === 0) {
        const argsString = formula.slice(funcStart, funcEnd - 1);
        const args = parseFunctionArguments(argsString);
        
        blocks.push({
          id: `func_${Date.now()}_${Math.random()}`,
          type: 'function',
          content: funcName,
          args: args
        });
        
        currentIndex = funcEnd;
        continue;
      }
    }
    
    // Try to match operators
    const operatorMatch = remainingFormula.match(/^(\s*[+\-*/=><]\s*)/);
    if (operatorMatch) {
      blocks.push({
        id: `op_${Date.now()}_${Math.random()}`,
        type: 'operator',
        content: operatorMatch[1].trim()
      });
      currentIndex += operatorMatch[1].length;
      continue;
    }
    
    // Try to match parentheses groups
    if (remainingFormula.startsWith('(')) {
      let parenCount = 1;
      let groupEnd = 1;
      
      while (groupEnd < remainingFormula.length && parenCount > 0) {
        if (remainingFormula[groupEnd] === '(') parenCount++;
        if (remainingFormula[groupEnd] === ')') parenCount--;
        groupEnd++;
      }
      
      if (parenCount === 0) {
        const innerFormula = remainingFormula.slice(1, groupEnd - 1);
        blocks.push({
          id: `group_${Date.now()}_${Math.random()}`,
          type: 'group',
          content: '()',
          children: parseFormulaToBlocks(innerFormula)
        });
        currentIndex += groupEnd;
        continue;
      }
    }
    
    // Try to match variables or numbers
    const tokenMatch = remainingFormula.match(/^([a-zA-Z_][a-zA-Z0-9_]*|\d+(?:\.\d+)?)/);
    if (tokenMatch) {
      const token = tokenMatch[1];
      if (isNumber(token)) {
        blocks.push({
          id: `value_${Date.now()}_${Math.random()}`,
          type: 'value',
          content: token,
          value: Number(token)
        });
      } else {
        blocks.push({
          id: `var_${Date.now()}_${Math.random()}`,
          type: 'variable',
          content: token
        });
      }
      currentIndex += token.length;
      continue;
    }
    
    // Skip whitespace
    const whitespaceMatch = remainingFormula.match(/^\s+/);
    if (whitespaceMatch) {
      currentIndex += whitespaceMatch[0].length;
      continue;
    }
    
    // If we get here, we have an unrecognized character
    blocks.push({
      id: `var_${Date.now()}_${Math.random()}`,
      type: 'variable',
      content: remainingFormula[0]
    });
    currentIndex++;
  }
  
  return blocks;
}

// Helper function to parse function arguments
function parseFunctionArguments(argsString: string): FormulaBlock[] {
  const args: FormulaBlock[] = [];
  let currentIndex = 0;
  let parenCount = 0;
  let currentArg = '';
  
  while (currentIndex < argsString.length) {
    const char = argsString[currentIndex];
    
    if (char === '(') {
      parenCount++;
      currentArg += char;
    } else if (char === ')') {
      parenCount--;
      currentArg += char;
    } else if (char === ',' && parenCount === 0) {
      // End of argument
      if (currentArg.trim()) {
        // Parse the entire argument as a single expression
        const parsedBlocks = parseFormulaToBlocks(currentArg.trim());
        if (parsedBlocks.length === 1) {
          args.push(parsedBlocks[0]);
        } else {
          // If multiple blocks, create a group for function arguments
          args.push({
            id: `group_${Date.now()}_${Math.random()}`,
            type: 'group',
            content: '()',
            children: parsedBlocks
          });
        }
      }
      currentArg = '';
    } else {
      currentArg += char;
    }
    
    currentIndex++;
  }
  
  // Add the last argument
  if (currentArg.trim()) {
    const parsedBlocks = parseFormulaToBlocks(currentArg.trim());
    if (parsedBlocks.length === 1) {
      args.push(parsedBlocks[0]);
    } else {
      // If multiple blocks, create a group for function arguments
      args.push({
        id: `group_${Date.now()}_${Math.random()}`,
        type: 'group',
        content: '()',
        children: parsedBlocks
      });
    }
  }
  
  return args;
} 