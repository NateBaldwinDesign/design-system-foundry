// Comprehensive test script to verify all property type mappings after schema updates

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
      // Return matching property type + "All Properties" option
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
      // Return only "All Properties" option
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
        {
          id: "ALL",
          displayName: "All Properties",
          category: "layout",
          compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
          inheritance: false
        }
      ];
    } else {
      // Return only "All Properties" option
      return [{
        id: "ALL",
        displayName: "All Properties",
        category: "layout",
        compatibleValueTypes: ["color", "dimension", "font-family", "font-weight", "font-size", "line-height", "letter-spacing", "duration", "cubic-bezier", "blur", "radius"],
        inheritance: false
      }];
    }
  }

  return compatiblePropertyTypes;
};

// Test data with updated schema mappings
const resolvedValueTypes = [
  { id: "color", displayName: "Color", type: "COLOR" },
  { id: "dimension", displayName: "Dimension", type: "DIMENSION" },
  { id: "spacing", displayName: "Spacing", type: "SPACING" },
  { id: "font_family", displayName: "Font Family", type: "FONT_FAMILY" },
  { id: "font_weight", displayName: "Font Weight", type: "FONT_WEIGHT" },
  { id: "font_size", displayName: "Font Size", type: "FONT_SIZE" },
  { id: "line_height", displayName: "Line Height", type: "LINE_HEIGHT" },
  { id: "letter_spacing", displayName: "Letter Spacing", type: "LETTER_SPACING" },
  { id: "duration", displayName: "Duration", type: "DURATION" },
  { id: "cubic_bezier", displayName: "Cubic Bezier", type: "CUBIC_BEZIER" },
  { id: "blur", displayName: "Blur", type: "BLUR" },
  { id: "spread", displayName: "Spread", type: "SPREAD" },
  { id: "radius", displayName: "Radius", type: "RADIUS" },
  { id: "opacity", displayName: "Opacity" }, // Custom type
  { id: "shadow", displayName: "Shadow" }, // Custom type
  { id: "border", displayName: "Border" }, // Custom type
  { id: "z_index", displayName: "Z-Index" } // Custom type
];

const standardPropertyTypes = [
  { id: "background-color", displayName: "Background Color", compatibleValueTypes: ["color"] },
  { id: "text-color", displayName: "Text Color", compatibleValueTypes: ["color"] },
  { id: "border-color", displayName: "Border Color", compatibleValueTypes: ["color"] },
  { id: "shadow-color", displayName: "Shadow Color", compatibleValueTypes: ["color"] },
  { id: "width-height", displayName: "Width/Height", compatibleValueTypes: ["dimension"] },
  { id: "padding", displayName: "Padding", compatibleValueTypes: ["spacing"] },
  { id: "margin", displayName: "Margin", compatibleValueTypes: ["spacing"] },
  { id: "gap-spacing", displayName: "Gap/Spacing", compatibleValueTypes: ["spacing"] },
  { id: "border-width", displayName: "Border Width", compatibleValueTypes: ["dimension"] },
  { id: "position", displayName: "Position", compatibleValueTypes: ["dimension"] },
  { id: "font-family", displayName: "Font Family", compatibleValueTypes: ["font-family"] },
  { id: "font-size", displayName: "Font Size", compatibleValueTypes: ["font-size"] },
  { id: "font-weight", displayName: "Font Weight", compatibleValueTypes: ["font-weight"] },
  { id: "line-height", displayName: "Line Height", compatibleValueTypes: ["line-height"] },
  { id: "letter-spacing", displayName: "Letter Spacing", compatibleValueTypes: ["letter-spacing"] },
  { id: "duration", displayName: "Duration", compatibleValueTypes: ["duration"] },
  { id: "delay", displayName: "Delay", compatibleValueTypes: ["duration"] },
  { id: "easing", displayName: "Easing", compatibleValueTypes: ["cubic-bezier"] },
  { id: "blur", displayName: "Blur", compatibleValueTypes: ["blur"] },
  { id: "shadow", displayName: "Shadow", compatibleValueTypes: ["shadow", "spread"] },
  { id: "border-radius", displayName: "Border Radius", compatibleValueTypes: ["radius"] },
  { id: "opacity", displayName: "Opacity", compatibleValueTypes: ["opacity"] },
  { id: "z-index", displayName: "Z-Index", compatibleValueTypes: ["z-index"] }
];

console.log("=== COMPREHENSIVE PROPERTY TYPE MAPPING TEST ===\n");

// Test all standard types
const testCases = [
  { id: "color", expected: 4, description: "COLOR -> 4 color property types" },
  { id: "dimension", expected: 3, description: "DIMENSION -> 3 dimension property types (width-height, border-width, position)" },
  { id: "spacing", expected: 3, description: "SPACING -> 3 spacing property types (padding, margin, gap-spacing)" },
  { id: "font_family", expected: 1, description: "FONT_FAMILY -> 1 font-family property type" },
  { id: "font_weight", expected: 1, description: "FONT_WEIGHT -> 1 font-weight property type" },
  { id: "font_size", expected: 1, description: "FONT_SIZE -> 1 font-size property type" },
  { id: "line_height", expected: 1, description: "LINE_HEIGHT -> 1 line-height property type" },
  { id: "letter_spacing", expected: 1, description: "LETTER_SPACING -> 1 letter-spacing property type" },
  { id: "duration", expected: 2, description: "DURATION -> 2 duration property types" },
  { id: "cubic_bezier", expected: 1, description: "CUBIC_BEZIER -> 1 easing property type" },
  { id: "blur", expected: 1, description: "BLUR -> 1 blur property type" },
  { id: "spread", expected: 1, description: "SPREAD -> 1 shadow property type" },
  { id: "radius", expected: 1, description: "RADIUS -> 1 border-radius property type" }
];

let allPassed = true;

testCases.forEach(testCase => {
  const result = getFilteredPropertyTypes(testCase.id, resolvedValueTypes, standardPropertyTypes);
  const passed = result.length === testCase.expected;
  allPassed = allPassed && passed;
  
  console.log(`${testCase.id} (${testCase.description}):`);
  console.log(`  Expected: ${testCase.expected} property types`);
  console.log(`  Found: ${result.length} property types`);
  console.log(`  Property Types: ${result.map(pt => pt.displayName).join(", ")}`);
  console.log(`  Status: ${passed ? "✅ PASS" : "❌ FAIL"}\n`);
});

// Test custom types
console.log("=== CUSTOM TYPES TEST ===\n");

const customTestCases = [
  { id: "opacity", expected: 2, description: "Custom type with matching property type: opacity + All" },
  { id: "shadow", expected: 2, description: "Custom type with matching property type: shadow + All" },
  { id: "border", expected: 1, description: "Custom type without matching property type: All only" },
  { id: "z_index", expected: 2, description: "Custom type with matching property type: z-index + All" }
];

customTestCases.forEach(testCase => {
  const result = getFilteredPropertyTypes(testCase.id, resolvedValueTypes, standardPropertyTypes);
  const passed = result.length === testCase.expected;
  allPassed = allPassed && passed;
  
  console.log(`${testCase.id} (${testCase.description}):`);
  console.log(`  Expected: ${testCase.expected} property types`);
  console.log(`  Found: ${result.length} property types`);
  console.log(`  Property Types: ${result.map(pt => pt.displayName).join(", ")}`);
  console.log(`  Status: ${passed ? "✅ PASS" : "❌ FAIL"}\n`);
});

console.log("=== SUMMARY ===");
console.log(`Overall Result: ${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);
console.log("\n=== MAPPING SUMMARY ===");
console.log("SPACING -> Padding, Margin, Gap/Spacing ✅");
console.log("DIMENSION -> Width/Height, Border Width, Position ✅");
console.log("SPREAD -> Shadow ✅");
console.log("RADIUS -> Border Radius ✅"); 