/**
 * Circle Pack Component Types
 * TypeScript interfaces for the CirclePack component
 */

import type { CirclePackData, CirclePackNode, CirclePackZoomState } from '../../../services/visualizations/types/circle-pack-data';

export interface CirclePackProps {
  data: CirclePackData;
  onNodeClick?: (node: D3CirclePackNode) => void;
  onZoomChange?: (path: string[]) => void;
  width?: number;
  height?: number;
  showLabels?: boolean;
  showBreadcrumbs?: boolean;
  interactive?: boolean;
}

export interface CirclePackRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  zoomToNode: (nodeId: string) => void;
  exportVisualization: (format: 'png' | 'svg' | 'json') => void;
  getZoomState: () => CirclePackZoomState;
}

export interface CirclePackState {
  isLoading: boolean;
  error: string | null;
  zoomState: CirclePackZoomState;
  selectedNode: D3CirclePackNode | null;
  hoveredNode: D3CirclePackNode | null;
}

// D3-specific types
export interface D3CirclePackNode extends d3.HierarchyNode<CirclePackNode> {
  x: number;
  y: number;
  r: number;
  depth: number;
  parent: D3CirclePackNode | null;
  children?: D3CirclePackNode[];
  descendants(): D3CirclePackNode[];
  // Access original data properties
  get name(): string;
  get children(): D3CirclePackNode[] | undefined;
  get value(): number | undefined;
  get type(): string;
}

export interface D3Selection {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  container: d3.Selection<SVGGElement, unknown, null, undefined>;
  nodes: d3.Selection<SVGCircleElement, D3CirclePackNode, SVGGElement, unknown>;
  labels: d3.Selection<SVGTextElement, D3CirclePackNode, SVGGElement, unknown>;
}

export interface ZoomBehavior {
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>;
  transform: d3.ZoomTransform;
  scale: number;
  translate: [number, number];
}

// Event handlers
export interface CirclePackEventHandlers {
  onNodeClick: (node: CirclePackNode, event: MouseEvent) => void;
  onNodeHover: (node: CirclePackNode | null, event: MouseEvent) => void;
  onZoomStart: (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => void;
  onZoom: (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => void;
  onZoomEnd: (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => void;
}

// Tooltip configuration
export interface CirclePackTooltip {
  show: boolean;
  content: string;
  position: { x: number; y: number };
  node: CirclePackNode | null;
}

// Breadcrumb item
export interface BreadcrumbItem {
  name: string;
  type: string;
  node: CirclePackNode;
}
