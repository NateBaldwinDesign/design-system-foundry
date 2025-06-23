/**
 * Debug script for token generation with mode-specific variables
 * Run this script to test and debug token generation functionality
 */

import { TokenGenerationService } from './services/tokenGenerationService';
import { StorageService } from './services/storage';
import { Algorithm } from './types/algorithm';
import { generateId } from './utils/id';

// Enable console logging for debugging
console.log('🔍 Debug Token Generation: Starting debug script');

// Create a test algorithm with mode-specific variables
function createTestAlgorithm(): Algorithm {
  console.log('🔧 Debug Token Generation: Creating test algorithm');
  
  const algorithm: Algorithm = {
    id: generateId('algorithm'),
    name: 'Debug Test Algorithm',
    resolvedValueTypeId: 'spacing',
    description: 'Test algorithm for debugging mode-specific variables',
    variables: [
      {
        id: generateId('variable'),
        name: 'baseSpacing',
        type: 'number',
        defaultValue: '16',
        modeBased: false
      },
      {
        id: generateId('variable'),
        name: 'viewportWidth',
        type: 'number',
        defaultValue: '1200',
        modeBased: true,
        dimensionId: 'viewport',
        modeValues: {
          'mobile': '375',
          'tablet': '768',
          'desktop': '1200',
          'wide': '1920'
        }
      },
      {
        id: generateId('variable'),
        name: 'density',
        type: 'number',
        defaultValue: '1',
        modeBased: true,
        dimensionId: 'density',
        modeValues: {
          'compact': '0.8',
          'comfortable': '1',
          'spacious': '1.2'
        }
      }
    ],
    formulas: [
      {
        id: generateId('formula'),
        name: 'calculateSpacing',
        description: 'Calculate spacing based on viewport and density',
        expressions: {
          latex: { value: 'baseSpacing \\times density \\times (viewportWidth / 1200)^{0.5}' },
          javascript: { 
            value: 'baseSpacing * density * Math.pow(viewportWidth / 1200, 0.5)',
            metadata: {
              allowedOperations: ['math']
            }
          },
          ast: {
            type: 'binary',
            operator: '*',
            left: {
              type: 'binary',
              operator: '*',
              left: { type: 'variable', variableName: 'baseSpacing' },
              right: { type: 'variable', variableName: 'density' }
            },
            right: {
              type: 'function',
              functionName: 'Math.pow',
              arguments: [
                {
                  type: 'binary',
                  operator: '/',
                  left: { type: 'variable', variableName: 'viewportWidth' },
                  right: { type: 'literal', value: 1200 }
                },
                { type: 'literal', value: 0.5 }
              ]
            },
            metadata: {
              astVersion: '1.0.0',
              validationErrors: [],
              complexity: 'medium'
            }
          }
        },
        variableIds: ['baseSpacing', 'density', 'viewportWidth']
      }
    ],
    conditions: [],
    steps: [
      {
        type: 'formula',
        id: 'calculateSpacing',
        name: 'calculateSpacing'
      }
    ],
    tokenGeneration: {
      enabled: true,
      iterationRange: { start: 0, end: 2, step: 1 },
      bulkAssignments: {
        resolvedValueTypeId: 'spacing',
        taxonomies: [],
        tokenTier: 'PRIMITIVE',
        private: false,
        status: 'stable',
        themeable: false
      },
      logicalMapping: {
        scaleType: 'numeric',
        defaultValue: '16',
        increasingStep: 8,
        decreasingStep: 4,
        extraPrefix: 'X',
        incrementDirection: 'ascending',
        taxonomyId: undefined,
        newTaxonomyName: 'Debug Spacing Scale'
      }
    }
  };

  console.log('✅ Debug Token Generation: Test algorithm created', {
    algorithmId: algorithm.id,
    algorithmName: algorithm.name,
    variablesCount: algorithm.variables.length,
    formulasCount: algorithm.formulas.length,
    stepsCount: algorithm.steps.length
  });

  return algorithm;
}

// Create test dimensions and modes
function createTestDimensions() {
  console.log('🔧 Debug Token Generation: Creating test dimensions');
  
  const dimensions = [
    {
      id: 'viewport',
      displayName: 'Viewport Size',
      modes: [
        { id: 'mobile', name: 'Mobile' },
        { id: 'tablet', name: 'Tablet' },
        { id: 'desktop', name: 'Desktop' },
        { id: 'wide', name: 'Wide' }
      ]
    },
    {
      id: 'density',
      displayName: 'Density',
      modes: [
        { id: 'compact', name: 'Compact' },
        { id: 'comfortable', name: 'Comfortable' },
        { id: 'spacious', name: 'Spacious' }
      ]
    }
  ];

  // Store dimensions in localStorage
  localStorage.setItem('token-model:dimensions', JSON.stringify(dimensions));
  console.log('✅ Debug Token Generation: Test dimensions created and stored', {
    dimensionsCount: dimensions.length,
    dimensions: dimensions.map(d => ({
      id: d.id,
      displayName: d.displayName,
      modesCount: d.modes.length
    }))
  });

  return dimensions;
}

// Test token generation
async function testTokenGeneration() {
  console.log('🚀 Debug Token Generation: Starting token generation test');
  
  try {
    // Create test data
    const algorithm = createTestAlgorithm();
    createTestDimensions();
    
    // Get existing data from storage
    const existingTokens = StorageService.getTokens();
    const collections = StorageService.getCollections();
    const taxonomies = StorageService.getTaxonomies();
    
    console.log('📊 Debug Token Generation: Retrieved existing data', {
      existingTokensCount: existingTokens.length,
      collectionsCount: collections.length,
      taxonomiesCount: taxonomies.length
    });

    // Test with different mode selections
    const testCases = [
      {
        name: 'All modes selected',
        selectedModes: {
          'viewport': ['mobile', 'tablet', 'desktop', 'wide'],
          'density': ['compact', 'comfortable', 'spacious']
        }
      },
      {
        name: 'Partial modes selected',
        selectedModes: {
          'viewport': ['mobile', 'desktop'],
          'density': ['comfortable']
        }
      },
      {
        name: 'Single mode per dimension',
        selectedModes: {
          'viewport': ['tablet'],
          'density': ['spacious']
        }
      }
    ];

    for (const testCase of testCases) {
      console.log(`\n🧪 Debug Token Generation: Testing "${testCase.name}"`);
      console.log('=' .repeat(60));
      
      try {
        const result = TokenGenerationService.generateTokens(
          algorithm,
          existingTokens,
          collections,
          taxonomies,
          false, // Don't modify taxonomies in place
          testCase.selectedModes
        );

        console.log(`✅ Debug Token Generation: "${testCase.name}" completed`, {
          tokensGenerated: result.tokens.length,
          errorsCount: result.errors.length,
          newTaxonomiesCount: result.newTaxonomies?.length || 0,
          updatedTaxonomiesCount: result.updatedTaxonomies?.length || 0
        });

        if (result.errors.length > 0) {
          console.error(`❌ Debug Token Generation: "${testCase.name}" had errors:`, result.errors);
        }

        if (result.tokens.length > 0) {
          console.log(`📋 Debug Token Generation: "${testCase.name}" generated tokens:`, 
            result.tokens.map(token => ({
              id: token.id,
              displayName: token.displayName,
              value: token.valuesByMode[0]?.value,
              modeIds: token.valuesByMode[0]?.modeIds,
              iterationValue: token.description?.match(/n=(\d+)/)?.[1]
            }))
          );
        }
      } catch (error) {
        console.error(`💥 Debug Token Generation: "${testCase.name}" failed:`, error);
      }
    }

    console.log('\n🎉 Debug Token Generation: All tests completed');
    
  } catch (error) {
    console.error('💥 Debug Token Generation: Test failed:', error);
  }
}

// Run the debug test
if (typeof window !== 'undefined') {
  // Browser environment
  console.log('🌐 Debug Token Generation: Running in browser environment');
  testTokenGeneration();
} else {
  // Node.js environment
  console.log('🖥️ Debug Token Generation: Running in Node.js environment');
  testTokenGeneration();
}

export { testTokenGeneration, createTestAlgorithm, createTestDimensions }; 