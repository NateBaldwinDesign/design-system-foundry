#!/usr/bin/env node

import { validateThemeOverrideFile } from '../dist/schema.js';
import { SchemaValidationService } from '../dist/validation/schema-validation.js';

console.log('🔍 Testing Validation Error Cases...\n');

let allTestsPassed = true;

// Test 1: Missing figmaFileKey
console.log('📋 Test 1: Missing figmaFileKey');
console.log('='.repeat(50));

const invalidThemeOverride = {
  systemId: "core-design-system",
  themeId: "theme-invalid",
  tokenOverrides: [
    {
      tokenId: "token-test",
      valuesByMode: [
        {
          modeIds: [],
          value: { value: "#FF0000" }
        }
      ]
    }
  ]
};

try {
  validateThemeOverrideFile(invalidThemeOverride);
  console.log('❌ Test failed: Should have thrown error for missing figmaFileKey');
  allTestsPassed = false;
} catch (error) {
  console.log('✅ Correctly caught missing figmaFileKey error');
  console.log(`   Error: ${error.message}`);
}
console.log('');

// Test 2: Invalid figmaFileKey format
console.log('📋 Test 2: Invalid figmaFileKey format');
console.log('='.repeat(50));

const invalidFormatThemeOverride = {
  systemId: "core-design-system",
  themeId: "theme-invalid",
  figmaFileKey: "invalid@key#with$special%chars",
  tokenOverrides: [
    {
      tokenId: "token-test",
      valuesByMode: [
        {
          modeIds: [],
          value: { value: "#FF0000" }
        }
      ]
    }
  ]
};

try {
  validateThemeOverrideFile(invalidFormatThemeOverride);
  console.log('❌ Test failed: Should have thrown error for invalid figmaFileKey format');
  allTestsPassed = false;
} catch (error) {
  console.log('✅ Correctly caught invalid figmaFileKey format error');
  console.log(`   Error: ${error.message}`);
}
console.log('');

// Test 3: Duplicate figmaFileKey
console.log('📋 Test 3: Duplicate figmaFileKey');
console.log('='.repeat(50));

const platformExtensions = [
  {
    platformId: "platform-test",
    figmaFileKey: "duplicate-key"
  }
];

const themeOverrideFiles = [
  {
    systemId: "core-design-system",
    themeId: "theme-1",
    figmaFileKey: "duplicate-key",
    tokenOverrides: []
  }
];

const uniquenessResult = SchemaValidationService.validateFigmaFileKeyUniquenessAcrossAll(
  platformExtensions,
  themeOverrideFiles
);

if (uniquenessResult.isValid) {
  console.log('❌ Test failed: Should have detected duplicate figmaFileKey');
  allTestsPassed = false;
} else {
  console.log('✅ Correctly detected duplicate figmaFileKey');
  uniquenessResult.errors.forEach(error => console.log(`   Error: ${error}`));
}
console.log('');

// Test 4: Missing required fields
console.log('📋 Test 4: Missing required fields');
console.log('='.repeat(50));

const missingFieldsThemeOverride = {
  figmaFileKey: "valid-key",
  tokenOverrides: []
};

try {
  validateThemeOverrideFile(missingFieldsThemeOverride);
  console.log('❌ Test failed: Should have thrown error for missing required fields');
  allTestsPassed = false;
} catch (error) {
  console.log('✅ Correctly caught missing required fields error');
  console.log(`   Error: ${error.message}`);
}
console.log('');

// Test 5: Empty token overrides
console.log('📋 Test 5: Empty token overrides (should be valid with warning)');
console.log('='.repeat(50));

const emptyOverridesThemeOverride = {
  systemId: "core-design-system",
  themeId: "theme-empty",
  figmaFileKey: "empty-overrides-key",
  tokenOverrides: []
};

try {
  const validatedData = validateThemeOverrideFile(emptyOverridesThemeOverride);
  console.log('✅ Empty token overrides is valid (as expected)');
  console.log(`   Theme ID: ${validatedData.themeId}`);
  console.log(`   Token Overrides Count: ${validatedData.tokenOverrides.length}`);
} catch (error) {
  console.log('❌ Test failed: Empty token overrides should be valid');
  console.log(`   Error: ${error.message}`);
  allTestsPassed = false;
}
console.log('');

// Test 6: Valid theme override with all fields
console.log('📋 Test 6: Valid theme override with all fields');
console.log('='.repeat(50));

const validThemeOverride = {
  systemId: "core-design-system",
  themeId: "theme-valid",
  figmaFileKey: "valid-theme-key",
  tokenOverrides: [
    {
      tokenId: "token-1",
      valuesByMode: [
        {
          modeIds: [],
          value: { value: "#FF0000" }
        }
      ]
    },
    {
      tokenId: "token-2",
      valuesByMode: [
        {
          modeIds: ["mode-light"],
          value: { value: "#00FF00" }
        },
        {
          modeIds: ["mode-dark"],
          value: { value: "#0000FF" }
        }
      ]
    }
  ]
};

try {
  const validatedData = validateThemeOverrideFile(validThemeOverride);
  console.log('✅ Valid theme override passed validation');
  console.log(`   Theme ID: ${validatedData.themeId}`);
  console.log(`   Figma File Key: ${validatedData.figmaFileKey}`);
  console.log(`   Token Overrides Count: ${validatedData.tokenOverrides.length}`);
} catch (error) {
  console.log('❌ Test failed: Valid theme override should pass validation');
  console.log(`   Error: ${error.message}`);
  allTestsPassed = false;
}

console.log('\n' + '='.repeat(50));
if (allTestsPassed) {
  console.log('🎉 All validation error tests passed!');
  console.log('✅ Missing figmaFileKey correctly caught');
  console.log('✅ Invalid figmaFileKey format correctly caught');
  console.log('✅ Duplicate figmaFileKey correctly detected');
  console.log('✅ Missing required fields correctly caught');
  console.log('✅ Empty token overrides correctly handled');
  console.log('✅ Valid theme override correctly validated');
  process.exit(0);
} else {
  console.log('❌ Some validation error tests failed');
  process.exit(1);
} 