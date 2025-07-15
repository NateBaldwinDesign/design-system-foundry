// Analyze missing property type mappings

console.log("=== ANALYZING MISSING PROPERTY TYPE MAPPINGS ===\n");

// Current resolved value types that need property type mappings
const missingMappings = [
  "spacing",    // SPACING type
  "border",     // CUSTOM type
];

// Current standard property types
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

console.log("=== CURRENT PROPERTY TYPES THAT SHOULD BE COMPATIBLE ===\n");

missingMappings.forEach(rvtId => {
  console.log(`${rvtId}:`);
  
  // Find property types that should logically be compatible
  const compatiblePropertyTypes = standardPropertyTypes.filter(pt => {
    // For spacing, it should be compatible with dimension-based properties
    if (rvtId === "spacing") {
      return pt.compatibleValueTypes.includes("dimension") || 
             pt.id.includes("spacing") || 
             pt.id.includes("padding") || 
             pt.id.includes("margin") ||
             pt.id.includes("gap");
    }
    
    // For border, it should be compatible with border-related properties
    if (rvtId === "border") {
      return pt.id.includes("border") || 
             pt.compatibleValueTypes.includes("dimension");
    }
    
    return false;
  });
  
  if (compatiblePropertyTypes.length > 0) {
    console.log(`  Should be compatible with: ${compatiblePropertyTypes.map(pt => pt.displayName).join(', ')}`);
  } else {
    console.log(`  No obvious compatible property types found`);
  }
  console.log("");
});

console.log("=== RECOMMENDED FIXES ===\n");

console.log("1. For 'spacing' resolved value type, these property types should be updated:");
console.log("   - padding: add 'spacing' to compatibleValueTypes");
console.log("   - margin: add 'spacing' to compatibleValueTypes");
console.log("   - gap-spacing: add 'spacing' to compatibleValueTypes");

console.log("\n2. For 'border' resolved value type, these property types should be updated:");
console.log("   - border-width: add 'border' to compatibleValueTypes");
console.log("   - border-radius: add 'border' to compatibleValueTypes");
console.log("   - border-color: add 'border' to compatibleValueTypes");

console.log("\n3. Alternative approach: Create new property types specifically for these resolved value types"); 