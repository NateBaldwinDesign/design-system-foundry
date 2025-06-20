import { 
  convertJavaScriptToLatex, 
  convertLatexToJavaScript,
  parseFormulaToBlocks,
  buildFormulaFromBlocks
} from './utils/formulaTranslationUtils';

// Focused test cases for parentheses, multiplication, and Math.pow
const criticalTestCases = [
  // Math.pow variations
  "Math.pow(Ratio, n)",
  "Math.pow(2, 3)",
  "Math.pow(BaseSize, 2)",
  
  // Multiplication variations
  "BaseSize * Math.pow(Ratio, n)",
  "2 * 3",
  "x * y",
  "BaseSize * MaxSize",
  
  // Parentheses variations
  "BaseSize + (n * StepSize)",
  "(BaseSize * Math.pow(Ratio, n))",
  "Math.sqrt(BaseSize * Math.pow(Ratio, n))",
  "Math.min(BaseSize, MaxSize) * Math.pow(Ratio, n)",
  
  // Complex combinations
  "BaseSize * Math.pow(Ratio, n) + Offset",
  "Math.pow(Ratio, n) * BaseSize + Offset",
  "(BaseSize + Offset) * Math.pow(Ratio, n)"
];

console.log("=== CRITICAL FORMULA TRANSLATION TEST ===\n");

criticalTestCases.forEach((formula, index) => {
  console.log(`\n--- Test ${index + 1}: "${formula}" ---`);
  
  // Step 1: JavaScript → LaTeX
  const latex = convertJavaScriptToLatex(formula);
  console.log(`1. JavaScript → LaTeX:`);
  console.log(`   Input:  ${formula}`);
  console.log(`   Output: ${latex}`);
  
  // Step 2: LaTeX → JavaScript (round-trip)
  const roundTripJs = convertLatexToJavaScript(latex);
  console.log(`\n2. LaTeX → JavaScript (round-trip):`);
  console.log(`   Input:  ${latex}`);
  console.log(`   Output: ${roundTripJs}`);
  console.log(`   Match:  ${formula === roundTripJs ? '✅' : '❌'}`);
  
  // Step 3: Parse to blocks
  const blocks = parseFormulaToBlocks(formula);
  console.log(`\n3. Parse to blocks:`);
  console.log(`   Blocks: ${JSON.stringify(blocks, null, 2)}`);
  
  // Step 4: Build from blocks
  const rebuiltFormula = buildFormulaFromBlocks(blocks);
  console.log(`\n4. Build from blocks:`);
  console.log(`   Input:  ${formula}`);
  console.log(`   Output: ${rebuiltFormula}`);
  console.log(`   Match:  ${formula === rebuiltFormula ? '✅' : '❌'}`);
  
  // Step 5: Blocks → LaTeX
  const blocksToLatex = convertJavaScriptToLatex(rebuiltFormula);
  console.log(`\n5. Blocks → LaTeX:`);
  console.log(`   Input:  ${rebuiltFormula}`);
  console.log(`   Output: ${blocksToLatex}`);
  console.log(`   Match:  ${latex === blocksToLatex ? '✅' : '❌'}`);
  
  console.log(`\n${'='.repeat(60)}`);
});

console.log("\n=== TEST COMPLETE ==="); 