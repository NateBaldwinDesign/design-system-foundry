# Example Data Patterns and Conventions

## Overview
This document describes the patterns and conventions used in the example data files for the component registry implementation. These examples demonstrate best practices for organizing component data, platform extensions, and maintaining referential integrity.

---

## File Structure

### Complete Design System Files
Files that contain a complete design system with all required properties:

- `examples/unthemed/empty-data.json` - Minimal empty design system
- `examples/unthemed/example-minimal-data.json` - Minimal populated design system
- `examples/themed/core-data.json` - Themed design system with comprehensive data
- `examples/themed/TEMP.json` - Temporary themed design system

### Platform Extension Files
Standalone platform extension files:

- `examples/platform-extensions/web-platform-extension.json` - Web platform implementation
- `examples/platform-extensions/ios-platform-extension.json` - iOS platform implementation

### Partial Schema Files
Files containing specific schema examples:

- `examples/property-types-example.json` - Property type definitions
- `examples/algorithms/algorithm-example.json` - Algorithm examples
- `examples/algorithms/core-algorithms.json` - Core algorithm definitions
- `examples/algorithms/example-minimal-algorithms.json` - Minimal algorithm examples

---

## Component Categories Pattern

### Standard Categories
All complete design system files include these standard component categories:

```json
"componentCategories": [
  {
    "id": "input",
    "displayName": "Input",
    "description": "Input components such as text fields, checkboxes, etc."
  },
  {
    "id": "navigation",
    "displayName": "Navigation", 
    "description": "Navigation components such as menus, tabs, etc."
  },
  {
    "id": "feedback",
    "displayName": "Feedback",
    "description": "Feedback components such as alerts, snackbars, etc."
  }
]
```

### Category ID Conventions
- Use lowercase, descriptive names
- Keep IDs short but meaningful
- Use consistent naming across all examples

---

## Component Properties Pattern

### Boolean Properties
Properties with true/false values:

```json
{
  "id": "component-property-0000-0000-0000",
  "displayName": "Quiet",
  "description": "A quiet component",
  "type": "boolean",
  "default": false
}
```

### List Properties
Properties with predefined options:

```json
{
  "id": "component-property-1111-1111-1111",
  "displayName": "Size",
  "description": "Component size variants",
  "type": "list",
  "options": [
    {
      "id": "component-option-aaaa-aaaa-aaaa",
      "displayName": "Small",
      "description": "Small size variant"
    },
    {
      "id": "component-option-bbbb-bbbb-bbbb", 
      "displayName": "Medium",
      "description": "Medium size variant"
    },
    {
      "id": "component-option-cccc-cccc-cccc",
      "displayName": "Large", 
      "description": "Large size variant"
    }
  ],
  "default": "component-option-bbbb-bbbb-bbbb"
}
```

### Property ID Conventions
- Use UUID-style IDs with descriptive prefixes
- Boolean properties: `component-property-0000-0000-0000`
- List properties: `component-property-1111-1111-1111`
- Options: `component-option-aaaa-aaaa-aaaa`, etc.

---

## Components Pattern

### Component Definition
Components reference properties and categories:

```json
{
  "id": "button",
  "displayName": "Button",
  "description": "A clickable button component",
  "componentCategoryId": "input",
  "componentProperties": [
    {
      "componentPropertyId": "component-property-0000-0000-0000",
      "description": "Quiet buttons should be used sparingly",
      "default": false
    },
    {
      "componentPropertyId": "component-property-1111-1111-1111",
      "description": "Priority changes the strength of visual appearance for the button",
      "supportedOptionIds": [
        "component-option-aaaa-aaaa-aaaa",
        "component-option-bbbb-bbbb-bbbb"
      ],
      "default": "component-option-bbbb-bbbb-bbbb"
    }
  ]
}
```

### Component ID Conventions
- Use lowercase, descriptive names
- Keep IDs short but meaningful
- Use consistent naming across all examples

---

## Platform Extension Pattern

### Basic Structure
Platform extensions include metadata and component implementations:

```json
{
  "systemId": "core-design-system",
  "platformId": "platform-web",
  "version": "1.0.0",
  "figmaFileKey": "web-platform-extension",
  "packageUri": "https://github.com/designsystem/web-components",
  "documentationUri": "https://designsystem.com/web",
  "componentImplementations": [...]
}
```

### Component Implementations
Rich metadata for platform-specific component implementations:

```json
{
  "componentId": "button",
  "componentName": "Button",
  "description": "Web implementation of the Button component using React",
  "componentCategoryId": "input",
  "packageName": "@designsystem/web-button",
  "storybookStory": "https://storybook.designsystem.com/web/?path=/story/components-button--default",
  "playgroundUrl": "https://playground.designsystem.com/web/button",
  "status": "stable",
  "imageUrl": "https://designsystem.com/images/web-button.png",
  "tokenUsage": [
    {
      "attribute": "backgroundColor",
      "tokenTypes": ["color"],
      "defaultTokenId": "color-primary-500",
      "description": "Background color of the button"
    }
  ],
  "examples": {
    "storybookId": "components-button--default",
    "documentationUri": "https://designsystem.com/web/components/button",
    "codeExample": "<Button variant=\"primary\">Click me</Button>"
  }
}
```

### Platform-Only Components
Components that don't exist in the core system:

```json
{
  "componentId": "",
  "componentName": "WebOnlyComponent",
  "description": "A web-specific component that doesn't exist in the core",
  "componentCategoryId": "feedback",
  "packageName": "@designsystem/web-only",
  "status": "experimental"
}
```

---

## Token Usage Pattern

### Token Usage Documentation
Document how components use tokens:

```json
"tokenUsage": [
  {
    "attribute": "backgroundColor",
    "tokenTypes": ["color"],
    "defaultTokenId": "color-primary-500",
    "description": "Background color of the button"
  },
  {
    "attribute": "color",
    "tokenTypes": ["color"],
    "defaultTokenId": "color-white", 
    "description": "Text color of the button"
  },
  {
    "attribute": "padding",
    "tokenTypes": ["spacing"],
    "defaultTokenId": "spacing-4",
    "description": "Padding around button content"
  },
  {
    "attribute": "borderRadius",
    "tokenTypes": ["radius"],
    "defaultTokenId": "radius-md",
    "description": "Border radius of the button"
  }
]
```

### Token Usage Conventions
- Use descriptive attribute names
- Specify token types that the attribute accepts
- Provide default token IDs when appropriate
- Include clear descriptions of how tokens are used

---

## URL Patterns

### Package and Documentation URLs
Platform extension metadata URLs:

```json
"packageUri": "https://github.com/designsystem/web-components",
"documentationUri": "https://designsystem.com/web"
```

### Component Implementation URLs
Rich metadata URLs for component implementations:

```json
"storybookStory": "https://storybook.designsystem.com/web/?path=/story/components-button--default",
"playgroundUrl": "https://playground.designsystem.com/web/button",
"imageUrl": "https://designsystem.com/images/web-button.png"
```

### URL Conventions
- Use HTTPS URLs
- Include descriptive paths
- Use consistent domain patterns
- Provide fallback URLs when appropriate

---

## Status Patterns

### Component Implementation Status
Track the lifecycle of component implementations:

```json
"status": "stable"  // experimental, stable, deprecated
```

### Status Conventions
- `experimental`: New or experimental implementations
- `stable`: Production-ready implementations
- `deprecated`: Implementations that should not be used for new work

---

## Referential Integrity

### Cross-References
All references must be valid:

1. **Component Categories**: `componentCategoryId` must reference an existing category
2. **Component Properties**: `componentPropertyId` must reference an existing property
3. **Property Options**: `supportedOptionIds` must reference valid options for list properties
4. **Default Values**: `default` values must be valid for the property type
5. **Token References**: `defaultTokenId` must reference existing tokens

### Validation Rules
- All IDs must follow the specified patterns
- Boolean properties cannot have `supportedOptionIds`
- List properties must have valid option references
- Component implementations must reference valid core components (or be platform-only)

---

## File Organization

### Directory Structure
```
examples/
├── unthemed/                    # Unthemed design systems
│   ├── empty-data.json         # Minimal empty system
│   └── example-minimal-data.json # Minimal populated system
├── themed/                      # Themed design systems
│   ├── core-data.json          # Core themed system
│   ├── TEMP.json               # Temporary themed system
│   ├── brand-a-overrides.json  # Brand A theme overrides
│   └── brand-b-overrides.json  # Brand B theme overrides
├── platform-extensions/         # Platform extension examples
│   ├── web-platform-extension.json
│   └── ios-platform-extension.json
├── algorithms/                  # Algorithm examples
│   ├── algorithm-example.json
│   ├── core-algorithms.json
│   └── example-minimal-algorithms.json
└── property-types-example.json  # Property type examples
```

### Naming Conventions
- Use descriptive, lowercase names
- Include the type of example in the filename
- Use consistent naming patterns across directories

---

## Best Practices

### Data Consistency
- Maintain consistent IDs across related examples
- Use the same component categories in all examples
- Ensure all references are valid
- Follow established naming conventions

### Documentation
- Include clear descriptions for all entities
- Document token usage patterns
- Provide examples and code snippets
- Include status information for lifecycle management

### Validation
- All examples must pass schema validation
- Cross-references must be valid
- URLs must be properly formatted
- Token references must exist

### Extensibility
- Design examples to be easily extended
- Use clear patterns that can be replicated
- Include examples of different complexity levels
- Provide templates for common use cases

---

## Summary

The example data files demonstrate a comprehensive approach to component registry implementation with:

- **Clear patterns** for organizing component data
- **Consistent conventions** for naming and structure
- **Rich metadata** for platform implementations
- **Comprehensive validation** ensuring data integrity
- **Extensible design** supporting future enhancements

These patterns provide a solid foundation for implementing component registries in real-world design systems while maintaining clarity, consistency, and extensibility. 