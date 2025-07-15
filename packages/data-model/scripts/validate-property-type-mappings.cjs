#!/usr/bin/env node

/**
 * Property Type Mapping Validation Script
 * 
 * This script validates that resolved value types correctly map to their
 * corresponding property types according to the schema and project rules.
 * 
 * Expected mappings:
 * - DIMENSION -> Width/Height, Border Width, Position
 * - SPACING -> Padding, Margin, Gap/Spacing
 * - COLOR -> Background Color, Text Color, Border Color, Shadow Color
 * - RADIUS -> Border Radius
 * - SPREAD -> Shadow
 * - FONT_FAMILY -> Font Family
 */

const fs = require('fs');
const path = require('path');

// Load schema
const schemaPath = path.join(__dirname, '../src/schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Get the default values from the schema
const standardPropertyTypes = schema.properties.standardPropertyTypes.default || [];

// Create resolved value types from the schema enum
const resolvedValueTypeEnum = schema.properties.resolvedValueTypes.items.properties.type.enum;
const resolvedValueTypes = resolvedValueTypeEnum.map(type => ({
  id: type.toLowerCase().replace(/_/g, '_'),
  displayName: type.replace(/_/g, ' '),
  type: type
}));

// Helper function to get filtered property types for a resolved value type
function getFilteredPropertyTypes(resolvedValueTypeId) {
  const resolvedValueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  if (!resolvedValueType) return [];
  
  // For custom types (no standard type), handle specially
  if (!resolvedValueType.type) {
    // Check if there's a matching property type by ID pattern
    const matchingPropertyType = standardPropertyTypes.find(pt => 
      pt.id === resolvedValueTypeId || 
      pt.id === resolvedValueTypeId.replace(/_/g, '-') ||
      pt.id === resolvedValueTypeId.replace(/-/g, '_')
    );
    
    if (matchingPropertyType) {
      // Return matching property type + "All Properties" option
      return [
        matchingPropertyType,
        { id: 'ALL', displayName: 'All Properties', category: 'custom', compatibleValueTypes: [], platformMappings: {}, inheritance: false }
      ];
    } else {
      // Return only "All Properties" option
      return [
        { id: 'ALL', displayName: 'All Properties', category: 'custom', compatibleValueTypes: [], platformMappings: {}, inheritance: false }
      ];
    }
  }

  // For standard types, filter by compatible value types
  const compatiblePropertyTypes = standardPropertyTypes.filter(pt => 
    pt.compatibleValueTypes.includes(resolvedValueTypeId) ||
    pt.compatibleValueTypes.includes(resolvedValueTypeId.replace(/_/g, '-'))
  );

  // If no compatible property types found for a standard type, treat as custom type
  if (compatiblePropertyTypes.length === 0) {
    // Check if there's a matching property type by ID pattern
    const matchingPropertyType = standardPropertyTypes.find(pt => 
      pt.id === resolvedValueTypeId || 
      pt.id === resolvedValueTypeId.replace(/_/g, '-') ||
      pt.id === resolvedValueTypeId.replace(/-/g, '_')
    );
    
    if (matchingPropertyType) {
      // Return matching property type + "All Properties" option
      return [
        matchingPropertyType,
        { id: 'ALL', displayName: 'All Properties', category: 'custom', compatibleValueTypes: [], platformMappings: {}, inheritance: false }
      ];
    } else {
      // Return only "All Properties" option
      return [
        { id: 'ALL', displayName: 'All Properties', category: 'custom', compatibleValueTypes: [], platformMappings: {}, inheritance: false }
      ];
    }
  }

  // Always include "All Properties" option as a UX fallback
  const allPropertiesOption = { id: 'ALL', displayName: 'All Properties', category: 'custom', compatibleValueTypes: [], platformMappings: {}, inheritance: false };
  
  // Return compatible property types + "All Properties" option
  return [...compatiblePropertyTypes, allPropertiesOption];
}

// Test cases for standard types (including "All Properties" option)
const standardTypeTests = [
  {
    id: 'dimension',
    expected: ['width-height', 'border-width', 'position', 'ALL'],
    description: 'DIMENSION -> Width/Height, Border Width, Position + All Properties'
  },
  {
    id: 'spacing',
    expected: ['padding', 'margin', 'gap-spacing', 'ALL'],
    description: 'SPACING -> Padding, Margin, Gap/Spacing + All Properties'
  },
  {
    id: 'color',
    expected: ['background-color', 'text-color', 'border-color', 'shadow-color', 'ALL'],
    description: 'COLOR -> Background Color, Text Color, Border Color, Shadow Color + All Properties'
  },
  {
    id: 'radius',
    expected: ['border-radius', 'ALL'],
    description: 'RADIUS -> Border Radius + All Properties'
  },
  {
    id: 'spread',
    expected: ['shadow', 'ALL'],
    description: 'SPREAD -> Shadow + All Properties'
  },
  {
    id: 'font_family',
    expected: ['font-family', 'ALL'],
    description: 'FONT_FAMILY -> Font Family + All Properties'
  }
];



function runTests() {
  console.log('🔍 Validating Property Type Mappings...\n');
  
  let allTestsPassed = true;
  let testCount = 0;
  let passedCount = 0;

  // Test standard types
  console.log('📋 Testing Standard Types:');
  for (const testCase of standardTypeTests) {
    testCount++;
    const result = getFilteredPropertyTypes(testCase.id);
    const resultIds = result.map(pt => pt.id);
    
    const passed = testCase.expected.every(expectedId => resultIds.includes(expectedId)) &&
                   resultIds.length === testCase.expected.length;
    
    if (passed) {
      passedCount++;
      console.log(`  ✅ ${testCase.description}`);
    } else {
      allTestsPassed = false;
      console.log(`  ❌ ${testCase.description}`);
      console.log(`     Expected: ${testCase.expected.join(', ')}`);
      console.log(`     Got: ${resultIds.join(', ')}`);
    }
  }



  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`  Total tests: ${testCount}`);
  console.log(`  Passed: ${passedCount}`);
  console.log(`  Failed: ${testCount - passedCount}`);
  
  if (allTestsPassed) {
    console.log('\n✅ All property type mapping tests passed!');
    return 0;
  } else {
    console.log('\n❌ Some property type mapping tests failed!');
    return 1;
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const exitCode = runTests();
  process.exit(exitCode);
}

module.exports = { getFilteredPropertyTypes, runTests }; 