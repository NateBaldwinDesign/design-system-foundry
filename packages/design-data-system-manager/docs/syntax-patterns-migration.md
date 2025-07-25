# Syntax Patterns Component Migration Guide

## Overview

This guide helps migrate from the legacy `SyntaxPatternsForm.tsx` to the unified `SyntaxPatternsEditor.tsx` component.

## Problem

Two duplicate components existed for syntax patterns:
- `src/components/SyntaxPatternsForm.tsx` (legacy)
- `src/components/shared/SyntaxPatternsEditor.tsx` (unified)

## Solution

**Use `SyntaxPatternsEditor.tsx` for all syntax patterns functionality.** It now supports both legacy and new API patterns.

## Migration Steps

### 1. Update Imports

**Before:**
```typescript
import { SyntaxPatternsForm } from '../components/SyntaxPatternsForm';
```

**After:**
```typescript
import { SyntaxPatternsEditor } from '../components/shared/SyntaxPatternsEditor';
```

### 2. Update Component Usage

#### Legacy Pattern (Individual Field Updates)
**Before:**
```typescript
<SyntaxPatternsForm
  syntaxPatterns={patterns}
  onSyntaxPatternChange={(field, value) => {
    setPatterns(prev => ({ ...prev, [field]: value }));
  }}
  showTitle={true}
/>
```

**After:**
```typescript
<SyntaxPatternsEditor
  syntaxPatterns={patterns}
  onSyntaxPatternsChange={setPatterns}
  showTitle={true}
/>
```

#### New Pattern (Full Object Updates)
**Before:**
```typescript
<SyntaxPatternsEditor
  syntaxPatterns={patterns}
  onSyntaxPatternsChange={setPatterns}
  preview={customPreview}
  isReadOnly={false}
/>
```

**After:**
```typescript
<SyntaxPatternsEditor
  syntaxPatterns={patterns}
  onSyntaxPatternsChange={setPatterns}
  preview={customPreview}
  isReadOnly={false}
/>
```

### 3. Backward Compatibility

The enhanced `SyntaxPatternsEditor` supports both patterns simultaneously:

```typescript
<SyntaxPatternsEditor
  syntaxPatterns={patterns}
  onSyntaxPatternsChange={setPatterns}        // New pattern
  onSyntaxPatternChange={handleFieldChange}   // Legacy pattern (optional)
  preview={customPreview}
  isReadOnly={false}
  showTitle={true}
/>
```

## Component Features

### Enhanced SyntaxPatternsEditor Features:
- ✅ **Read-only mode** for external source files
- ✅ **Auto-generated preview** when not provided
- ✅ **Backward compatibility** with legacy API
- ✅ **Consistent styling** with design system
- ✅ **Type safety** with proper TypeScript interfaces

### Props Interface:
```typescript
interface SyntaxPatternsEditorProps {
  syntaxPatterns: SyntaxPatterns;
  onSyntaxPatternsChange: (patterns: SyntaxPatterns) => void;
  onSyntaxPatternChange?: (field: keyof SyntaxPatterns, value: string | number | undefined) => void; // Legacy
  preview?: string;
  isReadOnly?: boolean;
  title?: string;
  showTitle?: boolean;
}
```

## Migration Checklist

- [ ] Update all imports to use `SyntaxPatternsEditor`
- [ ] Replace `SyntaxPatternsForm` usage with `SyntaxPatternsEditor`
- [ ] Update callback patterns to use `onSyntaxPatternsChange`
- [ ] Test read-only mode functionality
- [ ] Verify preview generation works correctly
- [ ] Remove `SyntaxPatternsForm.tsx` file
- [ ] Update any remaining references

## Benefits

1. **Single Source of Truth**: One component for all syntax patterns functionality
2. **Consistent API**: Unified callback pattern across the application
3. **Better Features**: Read-only mode, improved styling, type safety
4. **Reduced Maintenance**: Only one component to maintain and update
5. **Backward Compatibility**: Existing code continues to work during migration

## Timeline

- **Phase 1**: Update all new code to use `SyntaxPatternsEditor`
- **Phase 2**: Migrate existing `SyntaxPatternsForm` usage
- **Phase 3**: Remove `SyntaxPatternsForm.tsx` file
- **Phase 4**: Clean up any remaining references

## Support

If you encounter issues during migration, the enhanced `SyntaxPatternsEditor` supports both API patterns simultaneously, allowing for gradual migration without breaking existing functionality. 