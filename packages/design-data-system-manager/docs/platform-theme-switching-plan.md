# Platform & Theme Switching Implementation Plan

## Overview
This plan outlines the implementation of platform and theme switching functionality in the Design System Foundry web application, allowing users to seamlessly switch between different platform extensions and theme overrides while maintaining a unified UX experience.

## Core Philosophy
- **Unified UX**: Switching platforms/themes should feel like modifying the system, not changing the entire application
- **Dynamic Permissions**: Edit access should change based on the currently selected platform/theme
- **Schema Compliance**: All data must remain compliant with their respective schemas
- **Performance**: Efficient data loading and caching for smooth user experience

## Implementation Status: ~70% Complete

### ✅ Phase 1: Foundation & Data Model (COMPLETED)
- [x] Enhanced schema.json with `overrideSource` and `status` for themes
- [x] Updated Zod schemas and TypeScript types
- [x] Created validation scripts for new theme properties
- [x] Updated example data files

### ✅ Phase 2: Core Services (COMPLETED)
- [x] Created `ThemeOverrideDataService` for fetching external theme data
- [x] Enhanced `DataManager` with theme override pre-loading
- [x] Updated `DataSourceManager` with repository information extraction
- [x] Created `GitHubSearchService` for finding design systems
- [x] Created `FindDesignSystemDialog` component

### ✅ Phase 3: UI Components (COMPLETED)
- [x] Updated `ThemesTab.tsx` with new fields and validation
- [x] Updated `Header.tsx` with platform/theme dropdowns
- [x] Replaced old GitHub repository selector with new "Find New Design System" dialog
- [x] Added view-only logic to all main views

### 🔄 Phase 4: Data Merging & Presentation (IN PROGRESS)
- [ ] Implement `EnhancedDataMerger` for real-time data merging
- [ ] Create `DataSourceContext` for managing current selections
- [ ] Update all views to use merged data for presentation
- [ ] Implement source-aware change tracking

### 🔄 Phase 5: Permission Management (IN PROGRESS)
- [ ] Enhance `PermissionManager` for multi-repository access
- [ ] Implement dynamic permission updates based on current source
- [ ] Update UI to reflect current permissions accurately
- [ ] Add permission indicators in platform/theme dropdowns

### 🔄 Phase 6: Storage & Persistence (IN PROGRESS)
- [ ] Implement `SchemaAwareStorage` for separate presentation/storage data
- [ ] Create `DataTransformationService` for format conversion
- [ ] Update save workflows to use correct schema format
- [ ] Implement source-specific change tracking

### 🔄 Phase 7: Analytics & Validation (IN PROGRESS)
- [ ] Create `EnhancedAnalyticsService` for merged data
- [ ] Implement `ValidationService` for comprehensive validation
- [ ] Add `URLStateManager` for URL parameter management
- [ ] Create comprehensive testing suite

## Recent Major Changes

### New "Load Design System from URL" Feature (COMPLETED)
- **Replaced**: Old GitHub repository selector dialog
- **New**: Direct URL-based design system loading
- **Features**:
  - Direct URL pasting for specific repositories
  - Automatic file scanning and schema validation
  - Permission detection and display
  - Fast loading (no search delays)
  - Error handling for non-compliant repositories

### Key Components Created:
1. **`GitHubSearchService`**: Handles GitHub API URL loading, file scanning, and permission checking
2. **`FindDesignSystemDialog`**: Modern UI for loading design systems from URLs
3. **Updated `Header.tsx`**: Replaced old selector with new URL-based dialog integration

### Technical Implementation:
- **File Scanning**: Recursively scans entire repositories for JSON files (with TODO for future optimization)
- **Schema Validation**: Only shows files compliant with `@schema.json`
- **Fast Loading**: Direct URL processing without search delays
- **Error Handling**: Graceful handling of API limits, network errors, and invalid repositories
- **URL Integration**: Uses existing URL-based loading system for seamless integration

## Next Steps

### Immediate Priorities:
1. **Complete Phase 4**: Implement data merging and presentation logic
2. **Complete Phase 5**: Fix permission management issues
3. **Complete Phase 6**: Implement schema-aware storage
4. **Complete Phase 7**: Add comprehensive validation and analytics

### Future Enhancements:
- **Repository Scaffolding**: Standardize repository structures for better performance
- **Advanced Search**: Add filters for stars, forks, last updated, etc.
- **Batch Operations**: Support for loading multiple design systems
- **Offline Support**: Cache design systems for offline viewing

## Technical Decisions

### Data Flow:
1. User selects platform/theme from dropdowns
2. `DataSourceManager` updates current context
3. `EnhancedDataMerger` merges core + platform + theme data
4. Views display merged data for presentation
5. Storage operations use schema-compliant formats

### Permission Strategy:
- Check permissions for core repository and all extension/override repositories
- Update permissions when platform/theme selection changes
- Display current permissions in UI
- Disable edit actions when user lacks write access

### Caching Strategy:
- Cache search results for 5 minutes
- Cache repository file listings
- Cache permission checks
- Clear cache on authentication changes

## Testing Strategy
- Unit tests for all new services
- Integration tests for data merging
- E2E tests for platform/theme switching
- Performance tests for large repositories
- Permission testing with various access levels

## Migration Notes
- Existing URL-based access remains unchanged
- Old GitHub repository selector completely removed
- New dialog provides better UX and more comprehensive search
- All existing functionality preserved and enhanced 