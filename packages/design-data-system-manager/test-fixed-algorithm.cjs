const fs = require('fs');
const path = require('path');

// Load the algorithm data
const algorithmDataPath = path.join(__dirname, '../data-model/examples/algorithms/example-minimal-algorithms.json');
const algorithmData = JSON.parse(fs.readFileSync(algorithmDataPath, 'utf8'));

// Find the progressive-size-algorithm
const progressiveAlgorithm = algorithmData.algorithms.find(alg => alg.id === 'progressive-size-algorithm');

console.log('=== Testing Fixed Progressive Size Algorithm ===\n');

// Helper function to filter valid JavaScript identifiers
const getValidIdentifiers = (variables) => {
  const validVars = {};
  Object.keys(variables).forEach(key => {
    // Only use keys that are valid JavaScript identifiers (no spaces, start with letter/underscore)
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      validVars[key] = variables[key];
    }
  });
  return validVars;
};

// Simulate the execution context - match the improved AlgorithmExecutionService
const createExecutionContext = (iterationValue) => {
  const variables = {};
  
  // Parse variables with default values - map by both ID and name
  progressiveAlgorithm.variables.forEach(variable => {
    const defaultValue = variable.defaultValue;
    const type = variable.type;
    
    let parsedValue;
    if (type === 'string') {
      if (defaultValue.trim().startsWith('[') && defaultValue.trim().endsWith(']')) {
        try {
          parsedValue = JSON.parse(defaultValue);
        } catch (error) {
          parsedValue = defaultValue;
        }
      } else {
        parsedValue = defaultValue;
      }
    } else if (type === 'number') {
      parsedValue = Number(defaultValue) || 0;
    }
    
    // Store by both ID and name for flexibility (matching the service)
    variables[variable.id] = parsedValue;
    variables[variable.name] = parsedValue;
  });
  
  // Add system variable 'n'
  variables['n'] = iterationValue;
  
  // Always provide Math and Array in the context for all steps (matching the service)
  variables['Math'] = {
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
  
  variables['Array'] = {
    isArray: Array.isArray
  };
  
  return variables;
};

// Test execution for different iteration values
const testIterations = [0, 1, 2, 3, 4];

testIterations.forEach(iterationValue => {
  console.log(`\n--- Testing Iteration ${iterationValue} ---`);
  
  try {
    const variables = createExecutionContext(iterationValue);
    
    console.log('Initial variables:');
    console.log('  p (Position Array):', variables['Position Array']);
    console.log('  z (Zoom Array):', variables['Zoom Array']);
    console.log('  n (Index):', variables['n']);
    
    // Execute each step - match the service logic
    progressiveAlgorithm.steps.forEach((step, stepIndex) => {
      console.log(`\nStep ${stepIndex + 1}: ${step.name}`);
      
      if (step.type === 'condition') {
        const condition = progressiveAlgorithm.conditions.find(c => c.id === step.id);
        if (condition) {
          // Create evaluation context with all variables and functions
          const evaluationContext = {
            ...variables,
            Math: variables['Math'],
            Array: variables['Array'],
            console: console
          };
          
          // Filter to only valid JavaScript identifiers for function parameters
          const validContext = getValidIdentifiers(evaluationContext);
          
          const evalFunction = new Function(...Object.keys(validContext), `return ${condition.expression}`);
          const result = evalFunction(...Object.values(validContext));
          console.log(`  Condition result: ${result}`);
          
          if (!result) {
            console.log(`  ⚠️  Condition failed: ${condition.expression}`);
          }
        }
      } else if (step.type === 'formula') {
        const formula = progressiveAlgorithm.formulas.find(f => f.id === step.id);
        if (formula) {
          const expression = formula.expressions.javascript.value;
          
          // Create evaluation context with all variables and functions
          const evaluationContext = {
            ...variables,
            Math: variables['Math'],
            Array: variables['Array'],
            console: console
          };
          
          // Handle assignment expressions (e.g., "p_s = p[n] + z[n]")
          if (expression.includes('=')) {
            const parts = expression.split('=').map(part => part.trim());
            if (parts.length === 2) {
              const variableName = parts[0];
              const valueExpression = parts[1];
              
              // Filter to only valid JavaScript identifiers for function parameters
              const validContext = getValidIdentifiers(evaluationContext);
              
              const evalFunction = new Function(...Object.keys(validContext), `return ${valueExpression}`);
              const result = evalFunction(...Object.values(validContext));
              
              // Store the result in the variables context (by name and id if possible)
              variables[variableName] = result;
              evaluationContext[variableName] = result;
              
              console.log(`  ${variableName} = ${result}`);
            }
          } else {
            // Filter to only valid JavaScript identifiers for function parameters
            const validContext = getValidIdentifiers(evaluationContext);
            
            const evalFunction = new Function(...Object.keys(validContext), `return ${expression}`);
            const result = evalFunction(...Object.values(validContext));
            console.log(`  Result: ${result}`);
          }
        }
      }
    });
    
    // Get final result (last formula result)
    const lastFormula = progressiveAlgorithm.formulas[progressiveAlgorithm.formulas.length - 1];
    if (lastFormula) {
      const finalVariable = lastFormula.expressions.javascript.value.split('=')[0].trim();
      const finalResult = variables[finalVariable];
      console.log(`\n🎯 Final Result (${finalVariable}): ${finalResult}`);
    }
    
  } catch (error) {
    console.error(`❌ Error in iteration ${iterationValue}:`, error.message);
  }
});

console.log('\n=== Test Complete ==='); 