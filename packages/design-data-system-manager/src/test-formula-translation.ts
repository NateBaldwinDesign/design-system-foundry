import { parseFormulaToBlocks, buildFormulaFromBlocks, convertJavaScriptToLatex, convertLatexToJavaScript } from './utils/formulaTranslationUtils';

// Test data for formula translation testing
const testAlgorithms = [
  {
    id: 'test-algo-1',
    name: 'Test Algorithm 1',
    formulas: [
      {
        id: 'formula1',
        name: 'Sum',
        expressions: {
          javascript: { value: 'x + y' },
          latex: { value: '{x} + {y}' }
        }
      },
      {
        id: 'formula2',
        name: 'Product',
        expressions: {
          javascript: { value: 'x * y' },
          latex: { value: '{x} \\times {y}' }
        }
      }
    ]
  },
  {
    id: 'typescale-algorithm',
    name: 'Typography Scale Algorithm',
    formulas: [
      {
        id: 'formula-typescale',
        name: 'Type Scale',
        expressions: {
          javascript: { value: 'Base * Math.pow(Ratio, n)' },
          latex: { value: '\\mathit{Base} \\times \\mathit{Ratio}^{n}' }
        }
      }
    ]
  }
];

interface TranslationTest {
  name: string;
  originalJavaScript: string;
  originalLatex: string;
  expectedBlocks: Array<{ type: string; content: string }>;
  description: string;
}

// Define expected translations for each algorithm
const translationTests: TranslationTest[] = [
  {
    name: "Simple Addition",
    originalJavaScript: "x + y",
    originalLatex: "{x} + {y}",
    expectedBlocks: [
      { type: 'variable', content: 'x' },
      { type: 'operator', content: '+' },
      { type: 'variable', content: 'y' }
    ],
    description: "Basic addition of two variables"
  },
  {
    name: "Simple Multiplication",
    originalJavaScript: "x * y",
    originalLatex: "{x} \\times {y}",
    expectedBlocks: [
      { type: 'variable', content: 'x' },
      { type: 'operator', content: '*' },
      { type: 'variable', content: 'y' }
    ],
    description: "Basic multiplication of two variables"
  },
  {
    name: "Math.pow Expression",
    originalJavaScript: "Base * Math.pow(Ratio, Increment)",
    originalLatex: "{Base} \\times {Ratio}^{{Increment}}",
    expectedBlocks: [
      { type: 'variable', content: 'Base' },
      { type: 'operator', content: '*' },
      { type: 'function', content: 'Math.pow' }
    ],
    description: "Complex expression with Math.pow function"
  },
  {
    name: "Spacing Scale",
    originalJavaScript: "BaseSpacing * Math.pow(Multiplier, n)",
    originalLatex: "{BaseSpacing} \\times {Multiplier}^{n}",
    expectedBlocks: [
      { type: 'variable', content: 'BaseSpacing' },
      { type: 'operator', content: '*' },
      { type: 'function', content: 'Math.pow' }
    ],
    description: "Spacing scale with Math.pow and system variable n"
  }
];

// Test function to run all translations
function runTranslationTests() {
  console.log('=== FORMULA TRANSLATION PIPELINE TEST ===\n');

  translationTests.forEach((test, index) => {
    console.log(`\n--- Test ${index + 1}: ${test.name} ---`);
    console.log(`Description: ${test.description}`);
    console.log(`Original JavaScript: "${test.originalJavaScript}"`);
    console.log(`Original LaTeX: "${test.originalLatex}"`);

    // Step 1: JavaScript → Blocks
    console.log('\n1. JavaScript → Blocks:');
    const actualBlocks = parseFormulaToBlocks(test.originalJavaScript);
    console.log('   Expected blocks:', JSON.stringify(test.expectedBlocks, null, 2));
    console.log('   Actual blocks:', JSON.stringify(actualBlocks.map((b: { type: string; content: string }) => ({ type: b.type, content: b.content })), null, 2));
    
    const blocksMatch = JSON.stringify(actualBlocks.map((b: { type: string; content: string }) => ({ type: b.type, content: b.content }))) === 
                       JSON.stringify(test.expectedBlocks);
    console.log(`   ✅ Blocks match: ${blocksMatch}`);

    // Step 2: Blocks → JavaScript
    console.log('\n2. Blocks → JavaScript:');
    const reconstructedJavaScript = buildFormulaFromBlocks(actualBlocks);
    console.log(`   Expected: "${test.originalJavaScript}"`);
    console.log(`   Actual:   "${reconstructedJavaScript}"`);
    const jsMatch = reconstructedJavaScript === test.originalJavaScript;
    console.log(`   ✅ JavaScript match: ${jsMatch}`);

    // Step 3: JavaScript → LaTeX
    console.log('\n3. JavaScript → LaTeX:');
    const actualLatex = convertJavaScriptToLatex(test.originalJavaScript);
    console.log(`   Expected: "${test.originalLatex}"`);
    console.log(`   Actual:   "${actualLatex}"`);
    const latexMatch = actualLatex === test.originalLatex;
    console.log(`   ✅ LaTeX match: ${latexMatch}`);

    // Step 4: LaTeX → JavaScript
    console.log('\n4. LaTeX → JavaScript:');
    const reconstructedFromLatex = convertLatexToJavaScript(test.originalLatex);
    console.log(`   Expected: "${test.originalJavaScript}"`);
    console.log(`   Actual:   "${reconstructedFromLatex}"`);
    const latexToJsMatch = reconstructedFromLatex === test.originalJavaScript;
    console.log(`   ✅ LaTeX → JavaScript match: ${latexToJsMatch}`);

    // Step 5: Test round-trip consistency
    console.log('\n5. Round-trip consistency:');
    const roundTripLatex = convertJavaScriptToLatex(reconstructedJavaScript);
    const roundTripMatch = roundTripLatex === actualLatex;
    console.log(`   Original → LaTeX: "${actualLatex}"`);
    console.log(`   Round-trip → LaTeX: "${roundTripLatex}"`);
    console.log(`   ✅ Round-trip match: ${roundTripMatch}`);

    // Overall test result
    const allPassed = blocksMatch && jsMatch && latexMatch && latexToJsMatch && roundTripMatch;
    console.log(`\n🎯 Overall test result: ${allPassed ? 'PASS' : 'FAIL'}`);
    
    if (!allPassed) {
      console.log('❌ Issues found:');
      if (!blocksMatch) console.log('   - Block parsing mismatch');
      if (!jsMatch) console.log('   - JavaScript reconstruction mismatch');
      if (!latexMatch) console.log('   - JavaScript → LaTeX conversion mismatch');
      if (!latexToJsMatch) console.log('   - LaTeX → JavaScript conversion mismatch');
      if (!roundTripMatch) console.log('   - Round-trip consistency issue');
    }
  });

  // Test with actual algorithm data
  console.log('\n\n=== TESTING WITH ACTUAL ALGORITHM DATA ===\n');
  
  testAlgorithms.forEach((algorithm, algIndex) => {
    console.log(`\n--- Algorithm ${algIndex + 1}: ${algorithm.name} ---`);
    
    algorithm.formulas?.forEach((formula, formulaIndex) => {
      console.log(`\nFormula ${formulaIndex + 1}: ${formula.name}`);
      console.log(`JavaScript: "${formula.expressions.javascript.value}"`);
      console.log(`LaTeX: "${formula.expressions.latex.value}"`);

      // Test the actual pipeline
      const blocks = parseFormulaToBlocks(formula.expressions.javascript.value);
      const reconstructedJs = buildFormulaFromBlocks(blocks);
      const reconstructedLatex = convertJavaScriptToLatex(reconstructedJs);
      const reconstructedFromLatex = convertLatexToJavaScript(formula.expressions.latex.value);

      console.log('Blocks:', blocks.map((b: { type: string; content: string }) => ({ type: b.type, content: b.content })));
      console.log(`Reconstructed JS: "${reconstructedJs}"`);
      console.log(`Reconstructed LaTeX: "${reconstructedLatex}"`);
      console.log(`LaTeX → JS: "${reconstructedFromLatex}"`);

      const jsConsistent = reconstructedJs === formula.expressions.javascript.value;
      const latexConsistent = reconstructedLatex === formula.expressions.latex.value;
      const latexToJsConsistent = reconstructedFromLatex === formula.expressions.javascript.value;

      console.log(`✅ JS consistent: ${jsConsistent}`);
      console.log(`✅ LaTeX consistent: ${latexConsistent}`);
      console.log(`✅ LaTeX → JS consistent: ${latexToJsConsistent}`);
    });
  });

  // Test pattern-based translation with arbitrary formulas
  console.log('\n\n=== TESTING PATTERN-BASED TRANSLATION ===\n');
  
  const patternTests = [
    { js: "Math.sqrt(x + y)", latex: "\\sqrt{{x} + {y}}" },
    { js: "Math.abs(x * y)", latex: "|{x} \\times {y}|" },
    { js: "Math.floor(x / y)", latex: "\\lfloor {x} \\div {y} \\rfloor" },
    { js: "Math.ceil(x % y)", latex: "\\lceil {x} \\bmod {y} \\rceil" },
    { js: "Math.min(x, y, z)", latex: "\\min({x}, {y}, {z})" },
    { js: "Math.max(x, y)", latex: "\\max({x}, {y})" },
    { js: "Math.sin(x)", latex: "\\sin({x})" },
    { js: "Math.cos(y)", latex: "\\cos({y})" },
    { js: "Math.tan(z)", latex: "\\tan({z})" },
    { js: "Math.log(x)", latex: "\\ln({x})" },
    { js: "Math.log10(y)", latex: "\\log_{10}({y})" },
    { js: "Math.exp(x)", latex: "e^{{x}}" },
    { js: "x >= y", latex: "{x} \\geq {y}" },
    { js: "x <= y", latex: "{x} \\leq {y}" },
    { js: "x != y", latex: "{x} \\neq {y}" },
    { js: "x => y", latex: "{x} \\Rightarrow {y}" }
  ];

  patternTests.forEach((test, index) => {
    console.log(`\nPattern Test ${index + 1}:`);
    console.log(`JS: "${test.js}"`);
    console.log(`LaTeX: "${test.latex}"`);
    
    const jsToLatex = convertJavaScriptToLatex(test.js);
    const latexToJs = convertLatexToJavaScript(test.latex);
    
    console.log(`JS → LaTeX: "${jsToLatex}" (match: ${jsToLatex === test.latex})`);
    console.log(`LaTeX → JS: "${latexToJs}" (match: ${latexToJs === test.js})`);
  });
}

// Run the tests
runTranslationTests();

export { runTranslationTests, translationTests }; 