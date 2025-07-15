// Test script to verify spacing resolved value type fix

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

// Test data
const resolvedValueTypes = [
  { id: "spacing", displayName: "Spacing", type: "SPACING" },
  { id: "color", displayName: "Color", type: "COLOR" },
  { id: "font_family", displayName: "Font Family", type: "FONT_FAMILY" }
];

const standardPropertyTypes = [
  { id: "background-color", displayName: "Background Color", compatibleValueTypes: ["color"] },
  { id: "text-color", displayName: "Text Color", compatibleValueTypes: ["color"] },
  { id: "font-family", displayName: "Font Family", compatibleValueTypes: ["font-family"] },
  { id: "gap-spacing", displayName: "Gap/Spacing", compatibleValueTypes: ["dimension"] }
];

console.log("=== TESTING SPACING FIX ===\n");

// Test spacing
const spacingResult = getFilteredPropertyTypes("spacing", resolvedValueTypes, standardPropertyTypes);
console.log("spacing (SPACING):");
console.log(`  Expected: Standard type with no compatible property types -> should show "All Properties" only`);
console.log(`  Found: ${spacingResult.length} property types`);
console.log(`  Property Types: ${spacingResult.map(pt => pt.displayName).join(", ")}`);
console.log(`  Status: ${spacingResult.length === 1 && spacingResult[0].id === "ALL" ? "✅ PASS" : "❌ FAIL"}\n`);

// Test color (should work as before)
const colorResult = getFilteredPropertyTypes("color", resolvedValueTypes, standardPropertyTypes);
console.log("color (COLOR):");
console.log(`  Expected: Standard type with compatible property types`);
console.log(`  Found: ${colorResult.length} property types`);
console.log(`  Property Types: ${colorResult.map(pt => pt.displayName).join(", ")}`);
console.log(`  Status: ${colorResult.length === 2 ? "✅ PASS" : "❌ FAIL"}\n`);

// Test font_family (should work as before)
const fontFamilyResult = getFilteredPropertyTypes("font_family", resolvedValueTypes, standardPropertyTypes);
console.log("font_family (FONT_FAMILY):");
console.log(`  Expected: Standard type with compatible property types`);
console.log(`  Found: ${fontFamilyResult.length} property types`);
console.log(`  Property Types: ${fontFamilyResult.map(pt => pt.displayName).join(", ")}`);
console.log(`  Status: ${fontFamilyResult.length === 1 ? "✅ PASS" : "❌ FAIL"}\n`);

console.log("=== SUMMARY ===");
console.log("spacing now shows 'All Properties' option when no compatible property types exist");
console.log("This allows users to select any property type for spacing tokens"); 