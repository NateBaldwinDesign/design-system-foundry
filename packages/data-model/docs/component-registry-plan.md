# Component Registry Implementation Plan

## Overview
This document outlines a phased plan to implement a robust, reference-based component registry in the design token system. The plan covers updates to `schema.json`, `platform-extension-schema.json`, validation logic, and example data. The approach ensures clarity, referential integrity, and extensibility, while balancing centralized governance with platform autonomy.

---

## Phase 1: Schema Updates (Core)

### 1. Add `componentCategories` to `schema.json`
- **Location:** Top-level property
- **Structure:**
  ```json
  "componentCategories": {
    "type": "array",
    "description": "Standard categories for organizing components",
    "items": {
      "type": "object",
      "required": ["id", "displayName"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-zA-Z0-9-_]+$" },
        "displayName": { "type": "string" },
        "description": { "type": "string" }
      }
    }
  }
  ```

### 2. Update `components` in `schema.json`
- **Location:** Top-level property
- **Structure:**
  ```json
  "components": {
    "type": "array",
    "description": "Registry of standardized components with governed properties and component-specific context",
    "items": {
      "type": "object",
      "required": ["id", "displayName", "componentProperties", "componentCategoryId"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-zA-Z0-9-_]+$" },
        "displayName": { "type": "string" },
        "description": { "type": "string" },
        "componentCategoryId": {
          "type": "string",
          "description": "ID of the component category (must reference an id in componentCategories)"
        },
        "componentProperties": {
          "type": "array",
          "description": "Component properties with component-specific context and option restrictions",
          "items": {
            "type": "object",
            "required": ["componentPropertyId", "description"],
            "properties": {
              "componentPropertyId": {
                "type": "string",
                "pattern": "^[a-zA-Z0-9-_]+$",
                "description": "ID of the component property (must reference an id in componentProperties)"
              },
              "description": {
                "type": "string",
                "description": "Component-specific description of how this property applies to this component"
              },
              "supportedOptionIds": {
                "type": "array",
                "description": "For list-type properties, specifies which option ids are supported by this component. If omitted, all options are supported.",
                "items": { "type": "string", "pattern": "^[a-zA-Z0-9-_]+$" }
              },
              "default": {
                "oneOf": [
                  { "type": "boolean", "description": "Component-specific default for boolean properties" },
                  { "type": "string", "description": "Component-specific default option id for list properties" }
                ],
                "description": "Component-specific default value (overrides the property's global default)"
              }
            }
          }
        }
      }
    }
  }
  ```

### 3. Update `componentProperties` in `schema.json`
- Ensure all referenced IDs in `componentProperties` are unique and match references in `components`.

---

## Phase 2: Schema Updates (Platform Extensions)

### 1. Update `platform-extension-schema.json` (Basic)
- **Add/Update:** Platform-specific `components` property
- **Structure:**
  ```json
  "components": {
    "type": "array",
    "description": "Platform-specific component support and option restrictions",
    "items": {
      "type": "object",
      "required": ["id", "componentProperties"],
      "properties": {
        "id": { "type": "string", "pattern": "^[a-zA-Z0-9-_]+$" },
        "componentProperties": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["componentPropertyId"],
            "properties": {
              "componentPropertyId": { "type": "string", "pattern": "^[a-zA-Z0-9-_]+$" },
              "supportedOptionIds": {
                "type": "array",
                "items": { "type": "string", "pattern": "^[a-zA-Z0-9-_]+$" }
              },
              "default": {
                "oneOf": [
                  { "type": "boolean" },
                  { "type": "string" }
                ]
              }
            }
          }
        }
      }
    }
  }
  ```
- **Validation:** All referenced IDs must exist in the core schema.

### 2. Platform Extension Component Implementations (Enhanced)
- **Add/Update:** Rich metadata and implementation details for platform components.
- **Add top-level properties:**
  - `packageUri`: NPM, GitHub, or Storybook URL for the platform extension
  - `documentationUri`: Documentation URL for the platform extension
- **Add/Update:** `componentImplementations` array for platform-specific component implementation metadata.
- **Structure:**
  ```json
  "componentImplementations": {
    "type": "array",
    "description": "How this platform implements component contracts",
    "items": {
      "type": "object",
      "required": ["componentId", "componentName"],
      "properties": {
        "componentId": { "type": "string", "description": "Contract this implements (optional for platform-only components)" },
        "componentName": { "type": "string", "description": "Platform component name (defaults to component name from contract withn the UI)" },
        "description": { "type": "string" },
        "componentCategoryId": { "type": "string", "description": "Category this component belongs to (optional, defaults to 'other')" },
        "packageName": { "type": "string", "description": "NPM package name for this component (optional, defaults to platform name)" },
        "storybookStory": { "type": "string", "description": "Link to Storybook story for this component (optional)" },
        "playgroundUrl": { "type": "string", "description": "Link to interactive playground for this component (optional)" },
        "status": { "type": "string", "enum": ["experimental", "stable", "deprecated"], "description": "Status of this component implementation" },
        "imageUrl": { "type": "string", "description": "Optional image URL for this component (e.g., screenshot or icon)" },
        "tokenUsage": {
          "type": "array",
          "description": "How this component uses tokens (for documentation/UI generation)",
          "items": {
            "type": "object",
            "required": ["attribute", "tokenTypes"],
            "properties": {
              "attribute": { "type": "string", "description": "Platform-specific attribute name" },
              "tokenTypes": { "type": "array", "items": { "type": "string" } },
              "defaultTokenId": { "type": "string" },
              "description": { "type": "string" }
            }
          }
        },
        "examples": {
          "type": "object",
          "description": "Links to live examples and documentation",
          "properties": {
            "storybookId": { "type": "string" },
            "documentationUri": { "type": "string" },
            "codeExample": { "type": "string" }
          }
        }
      }
    }
  }
  ```
- **Guidance:**
  - Use `componentId` to reference core contracts, or leave blank for platform-only components.
  - Use `componentCategoryId` to reference core categories, or default to 'other'.
  - Provide as much metadata as possible for UI embedding and documentation.

---

## Phase 3: Validation Logic

### 1. Referential Integrity
- Validate that all `componentCategoryId` in `components` reference an ID in `componentCategories`.
- Validate that all `componentPropertyId` in `components.componentProperties` reference an ID in `componentProperties`.
- Validate that all `supportedOptionIds` reference valid option IDs in the referenced `componentProperty`.
- Validate that all `componentId` and `componentCategoryId` in `componentImplementations` reference valid core schema IDs, or are explicitly allowed as platform-only.

### 2. Default Value Validation
- If `default` is present, ensure it matches the type and is a valid value/option for the property.

### 3. Platform Extension Validation
- Validate that all platform extension `componentPropertyId` and `supportedOptionIds` reference valid core schema IDs/options.
- Validate that platform-specific `default` values are valid for the supported options.
- Validate that all URLs (packageUri, documentationUri, imageUrl, playgroundUrl, etc.) are valid URLs.

---

## Phase 4: Example Data Updates

### 1. Add Example `componentCategories`
- Provide a sample set of categories (e.g., input, navigation, feedback, layout, media, overlay).

### 2. Add Example `components`
- Include at least one component (e.g., Button) with multiple properties, component-specific descriptions, and restricted options.

### 3. Add Example `componentProperties`
- Ensure all properties referenced in components are defined, with options for list types.

### 4. Add Example Platform Extension
- Show a platform that supports a subset of options for a property and/or omits some properties.
- Show a platform extension with rich `componentImplementations` metadata, including documentation, images, playgrounds, and token usage.

---

## Phase 5: UI/UX and Documentation

### 1. Update UI to Use Reference Data
- Ensure all UI for editing/selecting categories, properties, and options uses the canonical lists (no hand-typed values).
- Update the web app to display platform extension component implementations, including:
  - Embedded documentation links, images, playgrounds, and Storybook stories
  - Token usage mapping for each component
  - Status and category display for each implementation

### 2. Add Documentation
- Document the relationships and reference requirements in the schema and in developer docs.
- Provide migration guidance for existing data.
- Document how the web app can consume and display platform extension component implementation metadata.

---

## Phase 6: Ongoing Governance

### 1. Enforce Reference Integrity
- Add automated tests to ensure all references remain valid as data evolves.
- Add tests to ensure all URLs are valid and resolve where possible.

### 2. Review and Iterate
- Gather feedback from platform teams and design system users.
- Refine schema and validation as new use cases emerge.

---

**End of Plan** 