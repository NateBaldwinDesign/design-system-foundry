# Repository Scaffolding Strategy

## Overview

This document outlines the strategy for creating and managing design system repositories with proper scaffolding for Figma integration and theme overrides. The system supports both core design system repositories and modular theme override repositories.

## Architecture Principles

### 1. Repository Types
- **Core System Repository**: Contains main design system data (`design-system.json`)
- **Theme Override Repository**: Contains theme-specific overrides (also `design-system.json` but with theme override structure)

### 2. Directory Structure
Both repository types follow the same structure for consistency:

```
repository-name/
├── design-system.json          # Main data file (core or theme override)
├── algorithms/                 # Algorithm definitions (core only)
│   └── core-algorithms.json
├── .figma/                     # Figma integration metadata (auto-managed)
│   ├── mappings/
│   │   └── {fileKey}.json      # Maps token IDs to Figma variable IDs
│   ├── cache/
│   │   └── last-sync.json      # Cached data for performance
│   └── config/
│       └── export-settings.json # Export configuration
├── theme-overrides/            # Theme override files (core only)
│   └── .gitkeep
└── README.md                   # Repository documentation
```

### 3. Figma Integration Strategy

#### Mapping Data Structure
```typescript
interface FigmaMappingData {
  fileKey: string;              // Figma file key
  systemId: string;             // Links to design system
  lastUpdated: string;          // ISO timestamp
  tempToRealId: {
    variables: Record<string, string>;    // tempId -> realId
    collections: Record<string, string>;  // tempId -> realId
    modes: Record<string, string>;        // tempId -> realId
  };
  repositoryContext: {
    owner: string;
    repo: string;
    type: 'core' | 'theme-override';
    systemId: string;
    themeId?: string;           // Only for theme repositories
  };
  metadata?: {
    figmaFileName?: string;
    collectionName?: string;
    exportVersion?: string;
    exportedFrom?: string;
    themeId?: string;
  };
}
```

#### Repository Context
```typescript
interface RepositoryInfo {
  owner: string;
  repo: string;
  type: 'core' | 'theme-override';
  systemId: string;
  themeId?: string;             // Only for theme repositories
}
```

## Implementation Strategy

### 1. Repository Creation

#### Core System Repository
```typescript
// Create repository: {systemId}-design-system
const coreRepo = await RepositoryScaffoldingService.createSystemRepository(
  systemName: string,
  systemId: string,
  description?: string
);
```

#### Theme Override Repository
```typescript
// Create repository: {systemId}-{themeId}-theme
const themeRepo = await RepositoryScaffoldingService.createThemeRepository(
  themeName: string,
  themeId: string,
  systemId: string,
  description?: string
);
```

### 2. Figma Mapping Management

#### Save Mapping
```typescript
await FigmaMappingService.saveMapping(
  fileKey: string,
  mappingData: FigmaMappingData,
  repoInfo: RepositoryInfo
);
```

#### Get Mapping
```typescript
const mapping = await FigmaMappingService.getMapping(
  fileKey: string,
  repoInfo: RepositoryInfo
);
```

#### List System Mappings
```typescript
const allMappings = await FigmaMappingService.listSystemMappings(
  systemId: string,
  repositories: RepositoryInfo[]
);
```

### 3. Export Workflow Integration

```typescript
// Enhanced FigmaExportService
async exportToFigma(
  tokenSystem: TokenSystem,
  options: FigmaExportOptions,
  repositories: RepositoryInfo[]
): Promise<FigmaExportResult> {
  // 1. Transform data to Figma format
  const result = await this.transformer.transform(tokenSystem, options);
  
  // 2. Save mappings to all relevant repositories
  if (result.success && options.fileId && repositories.length > 0) {
    for (const repoInfo of repositories) {
      const mappingData: FigmaMappingData = {
        fileKey: options.fileId,
        systemId: tokenSystem.systemId,
        tempToRealId: result.data.tempToRealId,
        metadata: {
          figmaFileName: options.fileName,
          collectionName: options.fileName,
          exportVersion: '1.0.0',
          exportedFrom: repoInfo.type,
          themeId: repoInfo.themeId
        }
      };
      
      await FigmaMappingService.saveMapping(
        options.fileId,
        mappingData,
        repoInfo
      );
    }
  }
  
  return result;
}
```

## Service Implementations

### 1. FigmaMappingService

```typescript
export class FigmaMappingService {
  private static readonly FIGMA_DIR = '.figma';
  private static readonly MAPPINGS_DIR = `${FigmaMappingService.FIGMA_DIR}/mappings`;
  
  /**
   * Ensure the .figma directory structure exists
   */
  static async ensureFigmaDirectory(repoOwner: string, repoName: string): Promise<void> {
    // Create .figma/, .figma/mappings/, .figma/cache/, .figma/config/ directories
    // with .gitkeep files if they don't exist
  }
  
  /**
   * Save Figma mapping data with repository context
   */
  static async saveMapping(
    fileKey: string,
    mappingData: FigmaMappingData,
    repoInfo: RepositoryInfo
  ): Promise<void> {
    // Ensure directory structure exists
    await this.ensureFigmaDirectory(repoInfo.owner, repoInfo.repo);
    
    const filename = `${this.MAPPINGS_DIR}/${fileKey}.json`;
    const enhancedMappingData = {
      ...mappingData,
      repositoryContext: {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        type: repoInfo.type,
        systemId: repoInfo.systemId,
        themeId: repoInfo.themeId
      },
      lastUpdated: new Date().toISOString()
    };
    
    // Try to update existing file, create if doesn't exist
    try {
      await GitHubApiService.updateFile(filename, JSON.stringify(enhancedMappingData, null, 2), ...);
    } catch {
      await GitHubApiService.createFile(filename, JSON.stringify(enhancedMappingData, null, 2), ...);
    }
  }
  
  /**
   * Get Figma mapping data with validation
   */
  static async getMapping(
    fileKey: string,
    repoInfo: RepositoryInfo
  ): Promise<FigmaMappingData | null> {
    // Load mapping and validate systemId matches
  }
  
  /**
   * List all mappings across multiple repositories for a system
   */
  static async listSystemMappings(
    systemId: string,
    repositories: RepositoryInfo[]
  ): Promise<FigmaMappingData[]> {
    // Collect mappings from all repositories, filter by systemId
  }
}
```

### 2. RepositoryScaffoldingService

```typescript
export class RepositoryScaffoldingService {
  /**
   * Create a new design system repository with proper structure
   */
  static async createSystemRepository(
    systemName: string,
    systemId: string,
    description?: string
  ): Promise<{ owner: string; repo: string; url: string }> {
    // 1. Create GitHub repository
    // 2. Create initial commit with scaffolding files
    // 3. Return repository info
  }
  
  /**
   * Create a new theme override repository
   */
  static async createThemeRepository(
    themeName: string,
    themeId: string,
    systemId: string,
    description?: string
  ): Promise<{ owner: string; repo: string; url: string }> {
    // 1. Create GitHub repository with theme naming convention
    // 2. Create initial commit with theme override structure
    // 3. Return repository info
  }
  
  /**
   * Generate initial schema-compliant JSON
   */
  private static generateInitialSchema(
    systemName: string,
    systemId: string,
    description?: string
  ): string {
    // Generate schema-compliant design-system.json with basic structure
  }
  
  /**
   * Generate initial theme override JSON
   */
  private static generateInitialThemeOverride(
    themeName: string,
    themeId: string,
    systemId: string,
    description?: string
  ): string {
    // Generate theme override structure with systemId reference
  }
}
```

## Integration Points

### 1. GitHub Integration
- Leverages existing `GitHubApiService` for repository operations
- Uses existing authentication and file management
- Integrates with current GitHub save/load workflows

### 2. Figma Integration
- Enhances existing `FigmaExportService` with mapping storage
- Integrates with `FigmaTransformer` for data transformation
- Maintains compatibility with existing Figma API workflows

### 3. Web App Integration
```typescript
// In web app components
const handleCreateSystem = async () => {
  const repoInfo = await RepositoryScaffoldingService.createSystemRepository(
    systemName,
    systemId,
    description
  );
  
  // Navigate to new system or load it
  await loadSystemFromRepository(repoInfo);
};

const handleFigmaExport = async () => {
  const repositories = await getSystemRepositories(systemId);
  
  const result = await figmaExportService.exportToFigma(
    tokenSystem,
    exportOptions,
    repositories
  );
  
  // Mappings are automatically saved to all relevant repositories
};
```

## Benefits

### 1. Consistency
- Same structure across all repository types
- Unified mapping storage approach
- Consistent naming conventions

### 2. Scalability
- Supports multiple repositories per system
- Easy to add new repository types
- Handles complex multi-repository scenarios

### 3. Team Collaboration
- Version controlled mapping data
- Shared access across team members
- Clear separation of concerns

### 4. Maintainability
- Auto-managed operational data
- Clear documentation structure
- Easy to understand and extend

## Future Considerations

### 1. Additional Repository Types
- Algorithm repositories
- Documentation repositories
- Asset repositories

### 2. Enhanced Mapping Features
- Mapping validation and repair
- Cross-repository mapping synchronization
- Mapping conflict resolution

### 3. Performance Optimizations
- Local caching of mapping data
- Incremental mapping updates
- Background synchronization

## Implementation Checklist

- [ ] Implement `FigmaMappingService` with repository context support
- [ ] Enhance `RepositoryScaffoldingService` for theme repositories
- [ ] Update `FigmaExportService` to save mappings to multiple repositories
- [ ] Add repository context validation in mapping operations
- [ ] Create UI components for repository creation and management
- [ ] Add mapping visualization and management in web app
- [ ] Implement mapping cleanup and maintenance utilities
- [ ] Add comprehensive error handling and recovery
- [ ] Create documentation and user guides
- [ ] Add automated testing for all new functionality

This strategy provides a robust, scalable foundation for managing design system repositories with proper Figma integration support across both core systems and theme overrides. 