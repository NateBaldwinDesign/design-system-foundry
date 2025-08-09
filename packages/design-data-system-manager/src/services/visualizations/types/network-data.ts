/**
 * Network diagram specific data types
 * Based on existing D3 patterns from TokenAnalysis.tsx and schema compliance
 */
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export interface TokenNode extends SimulationNodeDatum {
  id: string;
  name: string;
  displayName: string;
  tokenId: string;
  type: 'base' | 'alias' | 'circular';
  resolvedValueTypeId: string;
  resolvedValueTypeName: string;
  resolvedValueTypeCategory: string;
  collectionIds: string[];
  platformId?: string;
  themeId?: string;
  dependencyDepth: number;
  usageCount: number;
  hasCircularDependency: boolean;
  value?: Record<string, unknown>;
  // D3 simulation properties
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  cluster?: number;
}

export interface DependencyEdge extends SimulationLinkDatum<TokenNode> {
  id: string;
  source: TokenNode;
  target: TokenNode;
  type: 'direct' | 'indirect' | 'circular';
  strength: number;
  distance: number;
  platformSpecific?: boolean;
  themeSpecific?: boolean;
}

export interface TokenDependencyGraph {
  nodes: TokenNode[];
  edges: DependencyEdge[];
  clusters: ClusterInfo[];
  circularDependencies: CircularDependency[];
  statistics: DependencyStatistics;
}

export interface ClusterInfo {
  id: string;
  type: 'resolvedValueType' | 'collection' | 'platform' | 'theme';
  name: string;
  nodeIds: string[];
  centroid?: { x: number; y: number };
  color: string;
}

export interface CircularDependency {
  id: string;
  tokenIds: string[];
  path: string[];
  severity: 'warning' | 'error';
  description: string;
}

export interface DependencyStatistics {
  totalTokens: number;
  totalDependencies: number;
  circularDependencies: number;
  maxDependencyDepth: number;
  avgDependencyDepth: number;
  isolatedTokens: number;
  mostReferencedToken?: {
    tokenId: string;
    name: string;
    referenceCount: number;
  };
  deepestDependencyChain?: {
    tokenIds: string[];
    depth: number;
  };
}

// Props interface for NetworkDiagram component
export interface NetworkDiagramProps {
  data: TokenDependencyGraph;
  onNodeClick?: (token: TokenNode) => void;
  onEdgeClick?: (dependency: DependencyEdge) => void;
  onNodeHover?: (token: TokenNode | null) => void;
  highlightPath?: string[]; // Token IDs to highlight
  layout?: 'force' | 'hierarchical' | 'circular';
  showLabels?: boolean;
  showLegend?: boolean;
  showStatistics?: boolean;
  width?: number;
  height?: number;
  interactive?: boolean;
  clustered?: boolean;
  filterOptions?: FilterOptions;
}

export interface FilterOptions {
  hideIsolatedNodes?: boolean;
  showOnlyCircular?: boolean;
  minDependencyDepth?: number;
  maxDependencyDepth?: number;
  resolvedValueTypes?: string[];
  collections?: string[];
}

// D3 specific types
export interface D3DragEvent extends d3.D3DragEvent<SVGCircleElement, TokenNode, TokenNode> {
  active: number;
  fx?: number | null;
  fy?: number | null;
}
