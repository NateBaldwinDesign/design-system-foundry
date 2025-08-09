/**
 * Interaction Handlers for Network Diagrams
 * Mouse, touch, and keyboard interaction logic
 */

import * as d3 from 'd3';
import type { TokenNode, DependencyEdge } from '../../../../services/visualizations/types/network-data';

export interface InteractionCallbacks {
  onNodeClick?: (node: TokenNode, event: MouseEvent) => void;
  onNodeHover?: (node: TokenNode | null, event?: MouseEvent) => void;
  onEdgeClick?: (edge: DependencyEdge, event: MouseEvent) => void;
  onEdgeHover?: (edge: DependencyEdge | null, event?: MouseEvent) => void;
  onBackgroundClick?: (event: MouseEvent) => void;
}

/**
 * Setup node interaction handlers
 */
export function setupNodeInteractions(
  nodeSelection: d3.Selection<SVGCircleElement, TokenNode, any, any>,
  callbacks: InteractionCallbacks
): void {
  nodeSelection
    .style('cursor', 'pointer')
    .on('click', function(event, d) {
      event.stopPropagation();
      callbacks.onNodeClick?.(d, event);
    })
    .on('mouseenter', function(event, d) {
      // Highlight the node
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', function() {
          const currentRadius = parseFloat(d3.select(this).attr('r'));
          return currentRadius * 1.3;
        })
        .attr('stroke-width', 3);
      
      callbacks.onNodeHover?.(d, event);
    })
    .on('mouseleave', function(event, d) {
      // Reset node appearance
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', function() {
          const currentRadius = parseFloat(d3.select(this).attr('r'));
          return currentRadius / 1.3;
        })
        .attr('stroke-width', 2);
      
      callbacks.onNodeHover?.(null, event);
    });
}

/**
 * Setup edge interaction handlers
 */
export function setupEdgeInteractions(
  edgeSelection: d3.Selection<SVGLineElement, DependencyEdge, any, any>,
  callbacks: InteractionCallbacks
): void {
  edgeSelection
    .style('cursor', 'pointer')
    .on('click', function(event, d) {
      event.stopPropagation();
      callbacks.onEdgeClick?.(d, event);
    })
    .on('mouseenter', function(event, d) {
      // Highlight the edge
      d3.select(this)
        .transition()
        .duration(200)
        .attr('stroke-width', function() {
          const currentWidth = parseFloat(d3.select(this).attr('stroke-width'));
          return Math.max(3, currentWidth * 2);
        })
        .attr('stroke-opacity', 1);
      
      callbacks.onEdgeHover?.(d, event);
    })
    .on('mouseleave', function(event, d) {
      // Reset edge appearance
      d3.select(this)
        .transition()
        .duration(200)
        .attr('stroke-width', function() {
          const currentWidth = parseFloat(d3.select(this).attr('stroke-width'));
          return Math.max(1, currentWidth / 2);
        })
        .attr('stroke-opacity', 0.8);
      
      callbacks.onEdgeHover?.(null, event);
    });
}

/**
 * Setup background interaction handlers
 */
export function setupBackgroundInteractions(
  svgSelection: d3.Selection<SVGSVGElement, any, any, any>,
  callbacks: InteractionCallbacks
): void {
  svgSelection.on('click', function(event) {
    // Only trigger if clicking on the background (not on nodes/edges)
    if (event.target === this) {
      callbacks.onBackgroundClick?.(event);
    }
  });
}

/**
 * Highlight nodes and edges in a dependency path
 */
export function highlightPath(
  nodeSelection: d3.Selection<SVGCircleElement, TokenNode, any, any>,
  edgeSelection: d3.Selection<SVGLineElement, DependencyEdge, any, any>,
  pathTokenIds: string[],
  highlightColor: string = '#F56565'
): void {
  // Reset all highlights first
  clearHighlights(nodeSelection, edgeSelection);
  
  // Highlight nodes in the path
  nodeSelection
    .filter(d => pathTokenIds.includes(d.id))
    .attr('stroke', highlightColor)
    .attr('stroke-width', 4)
    .style('filter', 'drop-shadow(0 0 6px rgba(245, 101, 101, 0.6))');
  
  // Highlight edges in the path
  edgeSelection
    .filter(d => {
      const sourceInPath = pathTokenIds.includes(d.source.id);
      const targetInPath = pathTokenIds.includes(d.target.id);
      return sourceInPath && targetInPath;
    })
    .attr('stroke', highlightColor)
    .attr('stroke-width', 4)
    .attr('stroke-opacity', 1)
    .style('filter', 'drop-shadow(0 0 4px rgba(245, 101, 101, 0.6))');
}

/**
 * Clear all highlights from nodes and edges
 */
export function clearHighlights(
  nodeSelection: d3.Selection<SVGCircleElement, TokenNode, any, any>,
  edgeSelection: d3.Selection<SVGLineElement, DependencyEdge, any, any>
): void {
  // Reset node highlights
  nodeSelection
    .attr('stroke', function(d) {
      // Restore original stroke color based on node type
      const colors = {
        base: '#2D6A4F',
        alias: '#1E40AF',
        circular: '#DC2626'
      };
      return colors[d.type] || colors.base;
    })
    .attr('stroke-width', 2)
    .style('filter', null);
  
  // Reset edge highlights
  edgeSelection
    .attr('stroke', function(d) {
      const colors = {
        direct: '#4A5568',
        indirect: '#A0AEC0',
        circular: '#F56565'
      };
      return colors[d.type] || colors.direct;
    })
    .attr('stroke-width', function(d) {
      return 1 + (d.strength * 3); // Original width calculation
    })
    .attr('stroke-opacity', 0.8)
    .style('filter', null);
}

/**
 * Show connected nodes and edges for a given node
 */
export function showConnections(
  nodeSelection: d3.Selection<SVGCircleElement, TokenNode, any, any>,
  edgeSelection: d3.Selection<SVGLineElement, DependencyEdge, any, any>,
  targetNode: TokenNode,
  options: {
    fadeUnconnected?: boolean;
    highlightColor?: string;
    connectionColor?: string;
  } = {}
): void {
  const {
    fadeUnconnected = true,
    highlightColor = '#F59E0B',
    connectionColor = '#3B82F6'
  } = options;
  
  // Find connected edges
  const connectedEdges = edgeSelection.filter(d => 
    d.source.id === targetNode.id || d.target.id === targetNode.id
  );
  
  // Find connected nodes
  const connectedNodeIds = new Set<string>();
  connectedEdges.each(d => {
    connectedNodeIds.add(d.source.id);
    connectedNodeIds.add(d.target.id);
  });
  
  // Highlight the target node
  nodeSelection
    .filter(d => d.id === targetNode.id)
    .attr('stroke', highlightColor)
    .attr('stroke-width', 4)
    .style('filter', 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))');
  
  // Highlight connected nodes
  nodeSelection
    .filter(d => connectedNodeIds.has(d.id) && d.id !== targetNode.id)
    .attr('stroke', connectionColor)
    .attr('stroke-width', 3);
  
  // Highlight connected edges
  connectedEdges
    .attr('stroke', connectionColor)
    .attr('stroke-width', 3)
    .attr('stroke-opacity', 1);
  
  if (fadeUnconnected) {
    // Fade unconnected nodes
    nodeSelection
      .filter(d => !connectedNodeIds.has(d.id))
      .transition()
      .duration(300)
      .style('opacity', 0.3);
    
    // Fade unconnected edges
    edgeSelection
      .filter(d => !(d.source.id === targetNode.id || d.target.id === targetNode.id))
      .transition()
      .duration(300)
      .style('opacity', 0.2);
  }
}

/**
 * Clear connection highlights and restore full opacity
 */
export function clearConnections(
  nodeSelection: d3.Selection<SVGCircleElement, TokenNode, any, any>,
  edgeSelection: d3.Selection<SVGLineElement, DependencyEdge, any, any>
): void {
  // Clear highlights
  clearHighlights(nodeSelection, edgeSelection);
  
  // Restore full opacity
  nodeSelection
    .transition()
    .duration(300)
    .style('opacity', 1);
  
  edgeSelection
    .transition()
    .duration(300)
    .style('opacity', 0.8);
}

/**
 * Create a simple tooltip system
 */
export function createTooltip(): {
  show: (content: string, x: number, y: number) => void;
  hide: () => void;
  remove: () => void;
} {
  let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null = null;
  
  const show = (content: string, x: number, y: number) => {
    if (!tooltip) {
      tooltip = d3.select('body')
        .append('div')
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px 12px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', '1000')
        .style('opacity', 0);
    }
    
    tooltip
      .html(content)
      .style('left', `${x + 10}px`)
      .style('top', `${y - 10}px`)
      .transition()
      .duration(200)
      .style('opacity', 1);
  };
  
  const hide = () => {
    if (tooltip) {
      tooltip
        .transition()
        .duration(200)
        .style('opacity', 0);
    }
  };
  
  const remove = () => {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  };
  
  return { show, hide, remove };
}
