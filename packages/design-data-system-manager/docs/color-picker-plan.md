# Atomic Color Picker Component - Test-Based Development Plan

## Overview
This document outlines a **bottom-up, test-driven approach** for building a high-performance color picker component by creating atomic parts first, then combining them into the final complex component. This approach avoids the complexity issues of the previous top-down implementation.

## Core Philosophy

### Atomic Development Strategy
- **Start Small**: Build the smallest possible atomic components first
- **Test Everything**: Each atomic component must have comprehensive tests and Storybook stories
- **Incremental Complexity**: Only combine atomic parts once they're fully tested and stable
- **Schema Compliance**: Every component must follow the project's schema-driven development principles

### Test-Based Approach
- **Unit Tests First**: Write tests before implementing each atomic component
- **Storybook Integration**: Create comprehensive stories for every atomic component
- **Integration Tests**: Test atomic components working together
- **Performance Tests**: Validate performance characteristics of each atomic part

## 1. Project Structure (Simplified)

```
packages/design-data-system-manager/src/
├── components/
│   ├── ColorPicker/
│   │   ├── parts/                          # All individual, modular parts as components
│   │   ├── ColorPicker.tsx                 # Final combined component
│   │   ├── ColorPicker.stories.tsx         # Main component stories
│   │   └── index.ts                        # Barrel export
├── hooks/
│   ├── useColorInput.ts                    # Color input validation using Colorjs.io
│   ├── useColorConversion.ts               # Color space conversion using Colorjs.io
│   ├── useColorCanvas.ts                   # Canvas rendering logic
│   └── useColorPicker.ts                   # Main color picker logic
├── utils/
│   ├── colorValidation.ts                  # Color validation utilities using Colorjs.io
│   ├── colorConversion.ts                  # Color conversion utilities using Colorjs.io
│   └── canvasRendering.ts                  # Canvas rendering utilities
└── types/
    └── colorPicker.ts                      # TypeScript interfaces
```

## 2. Key Architectural Decisions

### A. Color Space Management
- **Color manipulation**: all conversions, validation, gamut mapping done using Colorjs.io

### B. Performance Optimizations
- **Canvas Caching**: Pre-render color gradients and cache them
- **Throttled Updates**: Debounce user interactions for smooth performance
- **Efficient Re-renders**: Use React.memo and proper dependency arrays
- **Object Reuse**: Reuse Color objects when possible to avoid parsing overhead

### D. Chakra UI Integration
- **Chakra Components**: Use Chakra UI v3 for all UI elements
- **Theme Support**: Support both light and dark modes
- **Accessibility**: Built-in Chakra UI accessibility features
- **Consistent Styling**: Follow existing design patterns
- **Custom Component Styling**: For new or custom components, leverate Chakra UI CSS styles

## 3. Atomic Component Development Order
1. **Color area**: A two dimensional canvas gradient
2. **Color gamut overlay**: An overlay of the Color area indicating gamut boundaries
3. **Color slider**: A slider with background gradient for a single color channel
4. **Color channel controls**: Combination of Color area and/or slider(s) for 3-4 channel color selection
5. **Color input**: A text input that displays and accepts a wide range of formatted color strings
6. **Color picker**: Combination of all elements with additional controls for complex color picking

## 4. Testing Strategy

### A. Unit Testing (Vitest)
FOR EXAMPLE ONLY
```typescript
// colorValidation.test.ts
import { describe, it, expect } from 'vitest';
import { validateHexColor, validateRGBColor } from '../utils/colorValidation';

describe('Color Validation', () => {
  describe('validateHexColor', () => {
    it('should validate correct hex colors', () => {
      expect(validateHexColor('#007AFF')).toBe(true);
      expect(validateHexColor('#007AFF80')).toBe(true); // with alpha
    });

    it('should reject invalid hex colors', () => {
      expect(validateHexColor('#invalid')).toBe(false);
      expect(validateHexColor('not-a-color')).toBe(false);
    });
  });
});
```

### B. Storybook Testing
FOR EXAMPLE ONLY
```typescript
// Using @storybook/test for interactive testing
import { expect, userEvent, within } from '@storybook/test';

export const InteractiveColorInput: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox');
    
    await userEvent.clear(input);
    await userEvent.type(input, '#FF0000');
    
    // Verify the color preview updates
    const preview = canvas.getByTestId('color-preview');
    expect(preview).toHaveStyle({ backgroundColor: 'rgb(255, 0, 0)' });
  }
};
```

### C. Performance Testing
FOR EXAMPLE ONLY
```typescript
// canvasRendering.test.ts
import { describe, it, expect } from 'vitest';
import { renderSaturationValueGradient } from '../utils/canvasRendering';

describe('Canvas Rendering Performance', () => {
  it('should render gradient within performance budget', () => {
    const startTime = performance.now();
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    
    renderSaturationValueGradient(canvas, 0, 200, 200);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Should render in under 16ms for 60fps
    expect(renderTime).toBeLessThan(16);
  });
});
```

## 5. Storybook Integration Patterns

### A. Consistent Story Structure
```typescript
// Standard story template for all atomic components
export default {
  title: 'Components/ColorPicker/Atomic/[ComponentName]',
  component: [ComponentName],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '[Component description]'
      }
    }
  },
  decorators: [
    (Story) => (
      <ChakraProvider>
        <Story />
      </ChakraProvider>
    ),
  ],
  argTypes: {
    // Component-specific controls
  }
} as Meta<typeof [ComponentName]>;
```

### B. Interactive Debug Stories
```typescript
// Debug story for each atomic component
export const Debug: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    const [error, setError] = useState<string | null>(null);
    
    return (
      <VStack spacing={4} align="stretch">
        <ComponentName
          {...args}
          value={value}
          onChange={setValue}
          onError={setError}
        />
        
        {/* Debug information */}
        <Box p={4} bg="gray.50" borderRadius="md">
          <Text fontWeight="bold">Debug Info:</Text>
          <Text>Value: {value}</Text>
          <Text>Error: {error || 'None'}</Text>
        </Box>
      </VStack>
    );
  }
};
```

### C. Integration Stories
```typescript
// Show atomic components working together
export const AtomicIntegration: Story = {
  render: () => {
    const [color, setColor] = useState('#007AFF');
    
    return (
      <HStack spacing={4}>
        <ColorInput
          value={color}
          onChange={setColor}
          format="hex"
        />
        <ColorPreview value={color} />
        <HueSlider
          value={color}
          onChange={setColor}
        />
      </HStack>
    );
  }
};
```

## 6. Development Workflow

### A. Component Development Cycle
1. **Write Tests First**: Create unit tests and Storybook stories
2. **Implement Component**: Build the atomic component
3. **Validate Tests**: Ensure all tests pass
4. **Create Stories**: Add comprehensive Storybook stories
5. **Performance Test**: Validate performance characteristics
6. **Document**: Update documentation and examples under /design-data-system-manager/src/docs/colorPicker/

### B. Integration Testing
1. **Atomic Integration**: Test atomic components working together
2. **Schema Validation**: Ensure schema compliance with final component's input/output
3. **Performance Validation**: Test combined performance
4. **Accessibility Testing**: Validate accessibility features

### C. Quality Gates
- **100% Test Coverage**: All atomic components must have full test coverage
- **Storybook Stories**: Every component must have comprehensive stories
- **Performance Budget**: All components must meet performance requirements
- **Schema Compliance**: All components must follow schema constraints

## 7. Technical Constraints

### Project Rules Compliance
- **Colorjs.io Integration**: All color calculations must use colorjs.io
- **Schema-Driven**: Follow schema.json for all data structures
- **Chakra UI v2**: Use Chakra UI for all UI components (or version defined in /design-data-system-manager/package.json)
- **TypeScript**: Maintain strict type safety throughout
- **Component Patterns**: Follow existing component patterns and naming conventions

### Performance Requirements
- **60fps Rendering**: Canvas components must render at 60fps
- **Memory Efficiency**: Efficient Color object reuse
- **Responsive Design**: Support for different screen sizes
- **Accessibility**: Full keyboard navigation and screen reader support

### Integration Requirements
- **Backward Compatibility**: Support existing color token values
- **TokenValuePicker Integration**: Seamless integration with existing components
- **Theme Support**: Support both light and dark themes
- **Error Handling**: Comprehensive error handling and validation

## 8. Success Metrics

### Development Metrics
- **Test Coverage**: 100% for all atomic components
- **Storybook Coverage**: Comprehensive stories for all components
- **Performance**: All components meet 60fps requirement
- **Type Safety**: Zero TypeScript errors

### Quality Metrics
- **Schema Compliance**: All components follow schema constraints when output is intended to write to local data
- **Accessibility**: WCAG 2.1 AA compliance
- **Browser Support**: Support for all target browsers
- **Error Handling**: Comprehensive error handling and user feedback

This plan provides a clear, test-driven approach for building the color picker component from atomic parts, ensuring quality, performance, and maintainability while following all project constraints and patterns. 