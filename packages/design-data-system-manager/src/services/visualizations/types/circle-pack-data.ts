/**
 * Circle Pack Visualization Data Types
 * TypeScript interfaces for the zoomable circle pack visualization
 */

export interface CirclePackNode {
  name: string;
  children?: CirclePackNode[];
  value?: number; // For proportional sizing
  type: 'system' | 'core' | 'platform' | 'theme' | 'entity';
  entityType?: string; // 'tokens', 'collections', 'dimensions', etc.
  platformId?: string;
  themeId?: string;
  dataSource?: 'core' | 'platform' | 'theme';
  hasChildren: boolean;
  isLoading?: boolean;
  error?: string;
  // D3 hierarchy properties (added during transformation)
  x?: number;
  y?: number;
  r?: number;
  depth?: number;
  parent?: CirclePackNode;
}

export interface CirclePackData extends CirclePackNode {
  // Root node properties
  name: string;
  children: CirclePackNode[];
  type: 'system';
}

export interface CirclePackStatistics {
  totalNodes: number;
  totalCoreEntities: number;
  totalPlatforms: number;
  totalThemes: number;
  maxDepth: number;
  averageDepth: number;
  largestNode: CirclePackNode | null;
  smallestNode: CirclePackNode | null;
}

export interface CirclePackResult {
  data: CirclePackData;
  statistics: CirclePackStatistics;
  metadata: {
    generatedAt: string;
    dataSources: string[];
    cacheStatus: Record<string, 'fresh' | 'stale' | 'missing'>;
  };
}

// Props interface for CirclePack component
export interface CirclePackProps {
  data: CirclePackData;
  sizeEncoding: 'proportional' | 'uniform';
  onNodeClick?: (node: CirclePackNode) => void;
  onZoomChange?: (path: string[]) => void;
  width?: number;
  height?: number;
  showLabels?: boolean;
  showBreadcrumbs?: boolean;
  interactive?: boolean;
}

// Zoom state interface
export interface CirclePackZoomState {
  currentPath: string[];
  zoomLevel: number;
  focusedNode: any | null; // Will be D3CirclePackNode in component context
  breadcrumbs: Array<{ name: string; type: string }>;
}

// Color scheme configuration
export interface CirclePackColorScheme {
  core: string;
  platform: string;
  theme: string;
  entity: string;
  hover: string;
  selected: string;
}

// Default color scheme
export const DEFAULT_COLOR_SCHEME: CirclePackColorScheme = {
  core: '#4299E1',
  platform: '#48BB78', 
  theme: '#9F7AEA',
  entity: '#4A5568',
  hover: '#2D3748',
  selected: '#E53E3E'
};
