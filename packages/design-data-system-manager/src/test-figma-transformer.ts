import { FigmaTransformer } from '@token-model/data-transformations';
import { FigmaExportService } from './services/figmaExport';
import exampleData from '@token-model/data-model/examples/unthemed/example-minimal-data.json';
import type { TokenSystem } from '@token-model/data-model';

/**
 * Comprehensive test for Figma transformer functionality
 * This test ensures that the transformer correctly processes example data
 * and returns the expected collections, modes, variables, and variable mode values
 */
async function testFigmaTransformer() {
  console.log('🧪 Starting Figma Transformer Test');
  console.log('=====================================');

  // Test 1: Direct transformer test
  console.log('\n📋 Test 1: Direct Transformer Test');
  console.log('-------------------------------------');
  
  const transformer = new FigmaTransformer();
  
  console.log('🔍 Input data summary:');
  console.log(`- Tokens: ${exampleData.tokens?.length || 0}`);
  console.log(`- Collections: ${exampleData.tokenCollections?.length || 0}`);
  console.log(`- Dimensions: ${exampleData.dimensions?.length || 0}`);
  console.log(`- Platforms: ${exampleData.platforms?.length || 0}`);
  console.log(`- Figma Configuration: ${JSON.stringify(exampleData.figmaConfiguration, null, 2)}`);

  // Validate input
  console.log('\n🔍 Validating input data...');
  const validation = await transformer.validate(exampleData as TokenSystem);
  console.log(`Validation result: ${validation.isValid ? '✅ PASS' : '❌ FAIL'}`);
  if (!validation.isValid) {
    console.log(`Validation errors: ${validation.errorsCount}`);
    console.log('First few errors:', validation.errors.slice(0, 3));
  }

  // Transform data
  console.log('\n🔍 Transforming data...');
  const result = await transformer.transform(exampleData as TokenSystem);
  console.log(`Transformation result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (result.success && result.data) {
    console.log('\n📊 Transformation Results:');
    console.log(`- Collections: ${result.data.collections?.length || 0}`);
    console.log(`- Modes: ${result.data.variableModes?.length || 0}`);
    console.log(`- Variables: ${result.data.variables?.length || 0}`);
    console.log(`- Variable Mode Values: ${result.data.variableModeValues?.length || 0}`);
    
    // Check for empty arrays
    const issues = [];
    if (!result.data.collections || result.data.collections.length === 0) {
      issues.push('❌ Collections array is empty');
    }
    if (!result.data.variableModes || result.data.variableModes.length === 0) {
      issues.push('❌ Variable modes array is empty');
    }
    if (!result.data.variables || result.data.variables.length === 0) {
      issues.push('❌ Variables array is empty');
    }
    if (!result.data.variableModeValues || result.data.variableModeValues.length === 0) {
      issues.push('❌ Variable mode values array is empty');
    }
    
    if (issues.length > 0) {
      console.log('\n🚨 ISSUES FOUND:');
      issues.forEach(issue => console.log(issue));
    } else {
      console.log('\n✅ All arrays have data!');
    }
    
    // Log sample data
    if (result.data.collections && result.data.collections.length > 0) {
      console.log('\n📋 Sample Collection:', result.data.collections[0]);
    }
    if (result.data.variables && result.data.variables.length > 0) {
      console.log('\n📋 Sample Variable:', result.data.variables[0]);
    }
    if (result.data.variableModeValues && result.data.variableModeValues.length > 0) {
      console.log('\n📋 Sample Variable Mode Value:', result.data.variableModeValues[0]);
    }
  } else {
    console.log('\n❌ Transformation failed');
    console.log('Error:', result.error);
  }

  // Test 2: FigmaExportService test
  console.log('\n\n📋 Test 2: FigmaExportService Test');
  console.log('-------------------------------------');
  
  const figmaExportService = new FigmaExportService();
  
  try {
      console.log('🔍 Testing FigmaExportService.exportToFigma...');
  const exportResult = await figmaExportService.exportToFigma({
      fileKey: 'test-file-key',
      accessToken: 'test-token'
    });
    
    console.log(`Export result: ${exportResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (exportResult.success && exportResult.data) {
      console.log('\n📊 Export Results:');
      console.log(`- Collections: ${exportResult.data.collections?.length || 0}`);
      console.log(`- Modes: ${exportResult.data.variableModes?.length || 0}`);
      console.log(`- Variables: ${exportResult.data.variables?.length || 0}`);
      console.log(`- Variable Mode Values: ${exportResult.data.variableModeValues?.length || 0}`);
    } else {
      console.log('Export error:', exportResult.error);
    }
  } catch (error) {
    console.log('❌ FigmaExportService test failed:', error);
  }

  // Test 3: Debug token processing
  console.log('\n\n📋 Test 3: Debug Token Processing');
  console.log('-------------------------------------');
  
  console.log('🔍 Analyzing tokens for Figma compatibility...');
  const tokens = exampleData.tokens || [];
  let tokensWithValues = 0;
  let tokensWithCodeSyntax = 0;
  
  tokens.forEach((token, index) => {
    const hasValues = token.valuesByMode && token.valuesByMode.length > 0;
    const hasCodeSyntax = token.codeSyntax && token.codeSyntax.length > 0;
    
    if (hasValues) tokensWithValues++;
    if (hasCodeSyntax) tokensWithCodeSyntax++;
    
    if (index < 3) { // Log first 3 tokens for debugging
      console.log(`Token ${index + 1}: "${token.displayName}"`);
      console.log(`  - Has values: ${hasValues}`);
      console.log(`  - Has code syntax: ${hasCodeSyntax}`);
      console.log(`  - Value type: ${token.resolvedValueTypeId}`);
      console.log(`  - Values by mode: ${token.valuesByMode?.length || 0}`);
      console.log(`  - Code syntax entries: ${token.codeSyntax?.length || 0}`);
    }
  });
  
  console.log(`\n📊 Token Analysis:`);
  console.log(`- Total tokens: ${tokens.length}`);
  console.log(`- Tokens with values: ${tokensWithValues}`);
  console.log(`- Tokens with code syntax: ${tokensWithCodeSyntax}`);

  // Test 4: Check Figma configuration
  console.log('\n\n📋 Test 4: Figma Configuration Check');
  console.log('-------------------------------------');
  
  const figmaConfig = exampleData.figmaConfiguration;
  console.log('Figma Configuration:', JSON.stringify(figmaConfig, null, 2));
  
  if (!figmaConfig) {
    console.log('❌ No Figma configuration found in example data');
  } else if (!figmaConfig.syntaxPatterns) {
    console.log('❌ No syntax patterns found in Figma configuration');
  } else {
    console.log('✅ Figma configuration looks good');
  }

  console.log('\n\n🏁 Test Complete');
  console.log('=====================================');
}

// Run the test
testFigmaTransformer().catch(console.error); 