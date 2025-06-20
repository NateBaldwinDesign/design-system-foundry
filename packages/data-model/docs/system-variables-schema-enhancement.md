# System Variables Schema Enhancement Plan

## Overview
This document outlines the plan to enhance the algorithm schema to support mode-based system variables in the config section.

## Current State
The current algorithm schema has a `config` section that supports basic primitive values:
```json
{
  "config": {
    "defaultBaseValue": 16,
    "defaultRatio": 1.25,
    "defaultSpacing": 4
  }
}
```

## Proposed Enhancement
To support mode-based system variables, we need to enhance the config section to support both simple values and mode-based objects.

### Enhanced Config Schema
```json
{
  "config": {
    "simpleVariable": 16,
    "modeBasedVariable": {
      "type": "number",
      "defaultValue": 16,
      "modeValues": {
        "light": 16,
        "dark": 20,
        "mobile": 14,
        "desktop": 18
      },
      "dimensionId": "theme-dimension-id"
    }
  }
}
```

### Schema Changes Required

#### 1. Update algorithm-schema.json
The `config` section in `algorithm-schema.json` needs to be updated to support both simple values and mode-based objects:

```json
{
  "config": {
    "type": "object",
    "description": "Global configuration values used across algorithms. Supports both simple values and mode-based variables.",
    "additionalProperties": {
      "oneOf": [
        { "type": "string" },
        { "type": "number" },
        { "type": "boolean" },
        {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "enum": ["string", "number", "boolean", "color"]
            },
            "defaultValue": {
              "oneOf": [
                { "type": "string" },
                { "type": "number" },
                { "type": "boolean" }
              ]
            },
            "description": { "type": "string" },
            "modeValues": {
              "type": "object",
              "additionalProperties": {
                "oneOf": [
                  { "type": "string" },
                  { "type": "number" },
                  { "type": "boolean" }
                ]
              }
            },
            "dimensionId": { "type": "string" }
          },
          "required": ["type", "defaultValue"]
        }
      ]
    }
  }
}
```

#### 2. Update SystemVariableService
The `SystemVariableService` will need to be updated to:
- Export system variables to the enhanced config format
- Import system variables from the enhanced config format
- Handle both simple and mode-based variables

#### 3. Update AlgorithmEditor
The `AlgorithmEditor` will need to be updated to:
- Load system variables from the config section
- Make system variables available to algorithms
- Support mode-based variable resolution

## Implementation Steps

### Phase 1: Schema Update
1. Update `algorithm-schema.json` with the enhanced config schema
2. Update TypeScript types to reflect the new structure
3. Add validation for the new schema

### Phase 2: Service Enhancement
1. Update `SystemVariableService` to support the new format
2. Add methods to convert between simple and mode-based formats
3. Add validation for mode-based variables

### Phase 3: Integration
1. Update `AlgorithmEditor` to load system variables from config
2. Add system variable resolution logic
3. Update algorithm execution to use system variables

### Phase 4: UI Enhancement
1. Update the system variables UI to show mode-based information
2. Add export/import functionality for algorithm configs
3. Add validation and error handling

## Benefits
1. **Consistency**: System variables will follow the same pattern as algorithm variables
2. **Flexibility**: Support for both simple and mode-based variables
3. **Integration**: Seamless integration with existing algorithm system
4. **Scalability**: Easy to extend for future variable types

## Migration Strategy
1. **Backward Compatibility**: Existing simple config values will continue to work
2. **Gradual Migration**: System variables can be migrated to mode-based format over time
3. **Validation**: Add validation to ensure config values follow the new schema

## Example Usage
```json
{
  "schemaVersion": "5.0.0",
  "profile": "basic",
  "metadata": {
    "name": "Enhanced System Variables",
    "version": "1.0.0"
  },
  "config": {
    "baseSpacing": 4,
    "baseFontSize": {
      "type": "number",
      "defaultValue": 16,
      "modeValues": {
        "mobile": 14,
        "tablet": 16,
        "desktop": 18
      },
      "dimensionId": "breakpoint-dimension-id"
    },
    "primaryColor": {
      "type": "color",
      "defaultValue": "#007bff",
      "modeValues": {
        "light": "#007bff",
        "dark": "#0056b3"
      },
      "dimensionId": "theme-dimension-id"
    }
  },
  "algorithms": []
}
```

## Next Steps
1. Review and approve the schema enhancement plan
2. Implement Phase 1 (Schema Update)
3. Test with existing algorithm files
4. Implement remaining phases
5. Update documentation and examples 