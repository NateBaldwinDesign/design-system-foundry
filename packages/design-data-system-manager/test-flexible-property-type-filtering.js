// Test script to verify flexible property type filtering logic

const getFilteredPropertyTypes = (resolvedValueTypeId, resolvedValueTypes, standardPropertyTypes) => {
  const resolvedValueType = resolvedValueTypes.find(vt => vt.id === resolvedValueTypeId);
  if (!resolvedValueType) {
    return [];
  }

  // If this is a custom type (no standard type), handle specially
  if (!resolvedValueType.type) {
    // For custom types, check if there's a matching property type by ID pattern
    const matchingPropertyType = standardPropertyTypes.find(pt => 
      pt.id === resolvedValueTypeId || 
      pt.id === resolvedValueTypeId.replace(/_/g, '-') ||
      pt.id === resolvedValueTypeId.replace(/-/g, '_')
    );
    
    if (matchingPropertyType) {
      // Return the matching property type + "All" option
      return [
        matchingPropertyType,
        {
          id: "ALL",
          displayName: "All Properties",
          category: "layout",
          compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
          inheritance: false
        }
      ];
    } else {
      // Return only "All" option for custom types without matching property types
      return [{
        id: "ALL",
        displayName: "All Properties",
        category: "layout",
        compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
        inheritance: false
      }];
    }
  }

  // For standard types, filter based on compatible value types
  return standardPropertyTypes.filter(pt => 
    pt.compatibleValueTypes.includes(resolvedValueTypeId) ||
    pt.compatibleValueTypes.includes(resolvedValueTypeId.replace(/_/g, '-'))
  );
};

// Test data - ResolvedValueTypes from example data
const resolvedValueTypes = [
  { id: "color", displayName: "Color", type: "COLOR" },
  { id: "font_family", displayName: "Font Family", type: "FONT_FAMILY" },
  { id: "line_height", displayName: "Line Height", type: "LINE_HEIGHT" },
  { id: "font_weight", displayName: "Font Weight", type: "FONT_WEIGHT" },
  { id: "spacing", displayName: "Spacing", type: "SPACING" },
  { id: "opacity", displayName: "Opacity" }, // CUSTOM - no type
  { id: "shadow", displayName: "Shadow" }, // CUSTOM - no type
  { id: "border", displayName: "Border" }, // CUSTOM - no type
  { id: "radius", displayName: "Radius", type: "RADIUS" },
  { id: "z_index", displayName: "Z Index" }, // CUSTOM - no type, but matches z-index property type
  { id: "font-size", displayName: "Font Size", type: "FONT_SIZE" }
];

// Test data - StandardPropertyTypes from schema
const standardPropertyTypes = [
  { id: "background-color", displayName: "Background Color", compatibleValueTypes: ["color"] },
  { id: "text-color", displayName: "Text Color", compatibleValueTypes: ["color"] },
  { id: "border-color", displayName: "Border Color", compatibleValueTypes: ["color"] },
  { id: "shadow-color", displayName: "Shadow Color", compatibleValueTypes: ["color"] },
  { id: "width-height", displayName: "Width/Height", compatibleValueTypes: ["dimension"] },
  { id: "padding", displayName: "Padding", compatibleValueTypes: ["dimension"] },
  { id: "margin", displayName: "Margin", compatibleValueTypes: ["dimension"] },
  { id: "gap-spacing", displayName: "Gap/Spacing", compatibleValueTypes: ["dimension"] },
  { id: "border-radius", displayName: "Border Radius", compatibleValueTypes: ["dimension", "radius"] },
  { id: "font-family", displayName: "Font Family", compatibleValueTypes: ["font-family"] },
  { id: "font-size", displayName: "Font Size", compatibleValueTypes: ["font-size"] },
  { id: "font-weight", displayName: "Font Weight", compatibleValueTypes: ["font-weight"] },
  { id: "font-style", displayName: "Font Style", compatibleValueTypes: ["font-style"] },
  { id: "line-height", displayName: "Line Height", compatibleValueTypes: ["line-height"] },
  { id: "letter-spacing", displayName: "Letter Spacing", compatibleValueTypes: ["letter-spacing"] },
  { id: "text-alignment", displayName: "Text Alignment", compatibleValueTypes: ["text-alignment"] },
  { id: "text-transform", displayName: "Text Transform", compatibleValueTypes: ["text-transform"] },
  { id: "opacity", displayName: "Opacity", compatibleValueTypes: ["opacity"] },
  { id: "shadow", displayName: "Shadow", compatibleValueTypes: ["shadow"] },
  { id: "blur", displayName: "Blur", compatibleValueTypes: ["blur"] },
  { id: "border-width", displayName: "Border Width", compatibleValueTypes: ["dimension"] },
  { id: "position", displayName: "Position", compatibleValueTypes: ["dimension"] },
  { id: "z-index", displayName: "Z-Index", compatibleValueTypes: ["z-index"] },
  { id: "flex-properties", displayName: "Flex Properties", compatibleValueTypes: ["flex"] },
  { id: "duration", displayName: "Duration", compatibleValueTypes: ["duration"] },
  { id: "easing", displayName: "Easing", compatibleValueTypes: ["cubic-bezier"] },
  { id: "delay", displayName: "Delay", compatibleValueTypes: ["duration"] }
];

console.log("=== FLEXIBLE PROPERTY TYPE FILTERING TEST ===\n");

let allTestsPassed = true;
const testResults = [];

resolvedValueTypes.forEach(rvt => {
  const result = getFilteredPropertyTypes(rvt.id, resolvedValueTypes, standardPropertyTypes);
  
  // Determine expected behavior based on type
  let expectedBehavior = '';
  let testPassed = false;
  
  if (rvt.type) {
    // Standard type - should filter by compatibleValueTypes
    const expectedCount = standardPropertyTypes.filter(pt => 
      pt.compatibleValueTypes.includes(rvt.id) || 
      pt.compatibleValueTypes.includes(rvt.id.replace(/_/g, '-'))
    ).length;
    expectedBehavior = `Standard type: ${expectedCount} compatible property types`;
    testPassed = result.length === expectedCount;
  } else {
    // Custom type - check if it matches a property type
    const matchingPropertyType = standardPropertyTypes.find(pt => 
      pt.id === rvt.id || 
      pt.id === rvt.id.replace(/_/g, '-') ||
      pt.id === rvt.id.replace(/-/g, '_')
    );
    
    if (matchingPropertyType) {
      expectedBehavior = `Custom type with matching property type: 2 options (matching + All)`;
      testPassed = result.length === 2 && result.some(pt => pt.id === matchingPropertyType.id) && result.some(pt => pt.id === "ALL");
    } else {
      expectedBehavior = `Custom type without matching property type: 1 option (All only)`;
      testPassed = result.length === 1 && result[0].id === "ALL";
    }
  }
  
  allTestsPassed = allTestsPassed && testPassed;
  
  testResults.push({
    resolvedValueType: rvt.id,
    type: rvt.type || 'CUSTOM',
    found: result.length,
    expectedBehavior,
    passed: testPassed,
    propertyTypes: result.map(pt => pt.displayName)
  });
  
  console.log(`${rvt.id} (${rvt.type || 'CUSTOM'}):`);
  console.log(`  Expected: ${expectedBehavior}`);
  console.log(`  Found: ${result.length} property types`);
  console.log(`  Property Types: ${result.map(pt => pt.displayName).join(', ') || 'None'}`);
  console.log(`  Status: ${testPassed ? '✅ PASS' : '❌ FAIL'}\n`);
});

console.log("=== SUMMARY ===");
console.log(`Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

// Show detailed failures
const failures = testResults.filter(r => !r.passed);
if (failures.length > 0) {
  console.log("\n=== FAILURES ===");
  failures.forEach(f => {
    console.log(`${f.resolvedValueType}: ${f.expectedBehavior}, got ${f.found} property types`);
  });
}

// Show behavior summary
console.log("\n=== BEHAVIOR SUMMARY ===");
console.log("Standard Types (with type field): Filter by compatibleValueTypes");
console.log("Custom Types (no type field):");
console.log("  - If matches property type ID: Show matching property type + All");
console.log("  - If no match: Show All only"); 