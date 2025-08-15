/**
 * NetworkDiagram component types
 * TypeScript interfaces specific to the NetworkDiagram component
 */

import type {
  TokenDependencyGraph,
  TokenNode,
  DependencyEdge,
  NetworkDiagramProps as BaseNetworkDiagramProps
} from '../../../services/visualizations/types/network-data';

// Re-export the base props interface
export type NetworkDiagramProps = BaseNetworkDiagramProps;

// Component-specific interfaces
export interface NetworkDiagramState {
  isLoading: boolean;
  error: string | null;
  selectedNode: TokenNode | null;
  hoveredNode: TokenNode | null;
  highlightedPath: string[];
  showStatistics: boolean;
  currentLayout: 'force' | 'hierarchical' | 'circular';
}

export interface NetworkDiagramRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  focusOnNode: (nodeId: string) => void;
  exportVisualization: (format: 'png' | 'svg' | 'json') => void;
  highlightPath: (tokenIds: string[]) => void;
  clearHighlights: () => void;
  changeLayout: (layout: 'force' | 'hierarchical' | 'circular') => void;
}

export interface ExportOptions {
  format: 'png' | 'svg' | 'json';
  filename?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  includeMetadata?: boolean;
}

// D3 simulation and interaction types
export interface SimulationRefs {
  simulation: d3.Simulation<TokenNode, undefined> | null;
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null;
  drag: d3.DragBehavior<SVGCircleElement, TokenNode, TokenNode> | null;
}

export interface SelectionRefs {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null;
  container: d3.Selection<SVGGElement, unknown, null, undefined> | null;
  nodes: d3.Selection<SVGCircleElement, TokenNode, SVGGElement, unknown> | null;
  edges: d3.Selection<SVGLineElement, DependencyEdge, SVGGElement, unknown> | null;
  labels: d3.Selection<SVGTextElement, TokenNode, SVGGElement, unknown> | null;
}
