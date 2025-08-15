/**
 * ChordDiagram component types
 * TypeScript interfaces specific to the ChordDiagram component
 */

import type {
  ChordDiagramData,
  ChordNode,
  ChordLink,
  ChordDiagramProps as BaseChordDiagramProps
} from '../../../services/visualizations/types/chord-data';

// Re-export the base props interface
export type ChordDiagramProps = BaseChordDiagramProps;

// Component-specific interfaces
export interface ChordDiagramState {
  isLoading: boolean;
  error: string | null;
  selectedNode: ChordNode | null;
  hoveredNode: ChordNode | null;
  highlightedType: 'mode-coupling' | 'platform-deviation' | 'conflicts' | null;
}

export interface ChordDiagramRef {
  exportVisualization: (format: 'png' | 'svg' | 'json') => void;
  highlightType: (type: 'mode-coupling' | 'platform-deviation' | 'conflicts' | null) => void;
  resetView: () => void;
}

// D3 chord-specific types
export interface ChordSelectionRefs {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null;
  container: d3.Selection<SVGGElement, unknown, null, undefined> | null;
  arcs: d3.Selection<SVGPathElement, d3.ChordGroup, SVGGElement, unknown> | null;
  ribbons: d3.Selection<SVGPathElement, d3.Chord, SVGGElement, unknown> | null;
  labels: d3.Selection<SVGTextElement, d3.ChordGroup, SVGGElement, unknown> | null;
}
