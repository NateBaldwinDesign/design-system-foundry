/**
 * D3 Helper Functions
 * Reusable D3 utilities for network diagrams
 * Based on existing TokenAnalysis.tsx patterns
 */

import * as d3 from 'd3';
import type { TokenNode, DependencyEdge } from '../../../../services/visualizations/types/network-data';

/**
 * Create and configure a force simulation for the network diagram
 */
export function createForceSimulation(
  width: number,
  height: number,
  options: {
    linkDistance?: number;
    linkStrength?: number;
    chargeStrength?: number;
    chargeDistance?: number;
    collisionRadius?: number;
    centerStrength?: number;
    clustering?: boolean;
  } = {}
): d3.Simulation<TokenNode, undefined> {
  const {
    linkDistance = 150,
    linkStrength = 0.2,
    chargeStrength = -400,
    chargeDistance = 300,
    collisionRadius = 30,
    centerStrength = 0.1,
    clustering = true
  } = options;

  const simulation = d3.forceSimulation<TokenNode>()
    .force('link', d3.forceLink<TokenNode, DependencyEdge>()
      .id(d => d.id)
      .distance(linkDistance)
      .strength(linkStrength))
    .force('charge', d3.forceManyBody()
      .strength(chargeStrength)
      .distanceMax(chargeDistance))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide(collisionRadius))
    .force('x', d3.forceX(width / 2).strength(centerStrength))
    .force('y', d3.forceY(height / 2).strength(centerStrength));

  // Add clustering force if enabled after simulation is created
  if (clustering) {
    simulation.force('cluster', createClusteringForce(simulation, 0.2));
  }

  return simulation;
}

/**
 * Create a clustering force that groups nodes by resolved value type
 */
export function createClusteringForce(simulation: d3.Simulation<TokenNode, undefined>, strength: number = 0.2) {
  return (alpha: number) => {
    const nodes = simulation.nodes();
    
    // Group nodes by value type category
    const groups = new Map<string, TokenNode[]>();
    nodes.forEach(node => {
      const type = node.resolvedValueTypeCategory;
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)?.push(node);
    });
    
    // Calculate centroids for each group
    const centroids = new Map<string, { x: number; y: number }>();
    groups.forEach((groupNodes, type) => {
      const centroid = {
        x: d3.mean(groupNodes, d => d.x ?? 0) ?? 0,
        y: d3.mean(groupNodes, d => d.y ?? 0) ?? 0
      };
      centroids.set(type, centroid);
    });
    
    // Apply force to move nodes toward their group's centroid
    nodes.forEach(node => {
      const centroid = centroids.get(node.resolvedValueTypeCategory);
      if (centroid) {
        const dx = centroid.x - (node.x ?? 0);
        const dy = centroid.y - (node.y ?? 0);
        node.x = (node.x ?? 0) + dx * strength * alpha;
        node.y = (node.y ?? 0) + dy * strength * alpha;
      }
    });
  };
}

/**
 * Create zoom behavior for the visualization
 */
export function createZoomBehavior<SVGElementType extends SVGElement>(
  containerSelector: string,
  scaleExtent: [number, number] = [0.1, 4]
): d3.ZoomBehavior<SVGElementType, unknown> {
  return d3.zoom<SVGElementType, unknown>()
    .scaleExtent(scaleExtent)
    .on('zoom', (event) => {
      d3.select(containerSelector)
        .select('g')
        .attr('transform', event.transform);
    });
}

/**
 * Create drag behavior for nodes
 */
export function createDragBehavior(
  simulation: d3.Simulation<TokenNode, undefined>
): d3.DragBehavior<SVGCircleElement, TokenNode, TokenNode> {
  const dragstarted = (event: d3.D3DragEvent<SVGCircleElement, TokenNode, TokenNode>) => {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  };

  const dragged = (event: d3.D3DragEvent<SVGCircleElement, TokenNode, TokenNode>) => {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  };

  const dragended = (event: d3.D3DragEvent<SVGCircleElement, TokenNode, TokenNode>) => {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  };

  return d3.drag<SVGCircleElement, TokenNode>()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
}

/**
 * Apply bounds constraints to keep nodes within the viewport
 */
export function applyBounds(
  nodes: TokenNode[],
  width: number,
  height: number,
  padding: number = 50
): void {
  nodes.forEach(node => {
    node.x = Math.max(padding, Math.min(width - padding, node.x ?? 0));
    node.y = Math.max(padding, Math.min(height - padding, node.y ?? 0));
  });
}

/**
 * Calculate appropriate node size based on usage count
 */
export function calculateNodeSize(
  usageCount: number,
  baseSize: number = 8,
  maxSize: number = 20
): number {
  if (usageCount === 0) return baseSize;
  
  // Logarithmic scaling for usage count
  const scale = Math.log(usageCount + 1) / Math.log(10); // Log base 10
  return Math.min(maxSize, baseSize + scale * 6);
}

/**
 * Get node color based on type and resolved value type
 */
export function getNodeColor(node: TokenNode): string {
  // Colors for different token types
  const typeColors = {
    base: '#48BB78',      // Green
    alias: '#4299E1',     // Blue  
    circular: '#F56565'   // Red for circular dependencies
  };

  // If it's a circular dependency, always use red
  if (node.hasCircularDependency) {
    return typeColors.circular;
  }

  // Return color based on token type
  return typeColors[node.type] || typeColors.base;
}

/**
 * Get edge color based on dependency type
 */
export function getEdgeColor(edge: DependencyEdge): string {
  const typeColors = {
    direct: '#4A5568',     // Gray
    indirect: '#A0AEC0',   // Light gray
    circular: '#F56565'    // Red
  };

  return typeColors[edge.type] || typeColors.direct;
}

/**
 * Get edge stroke width based on dependency strength
 */
export function getEdgeStrokeWidth(edge: DependencyEdge): number {
  const baseWidth = 1;
  const maxWidth = 4;
  
  // Scale stroke width based on strength (0-1)
  return baseWidth + (edge.strength * (maxWidth - baseWidth));
}

/**
 * Create tooltip content for a node
 */
export function createNodeTooltip(node: TokenNode): string {
  return `
    <div style="padding: 8px; background: white; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;">
      <strong>${node.displayName}</strong><br/>
      Type: ${node.type}<br/>
      Value Type: ${node.resolvedValueTypeName}<br/>
      Dependency Depth: ${node.dependencyDepth}<br/>
      Usage Count: ${node.usageCount}
      ${node.hasCircularDependency ? '<br/><span style="color: red;">⚠ Circular Dependency</span>' : ''}
    </div>
  `;
}

/**
 * Create tooltip content for an edge
 */
export function createEdgeTooltip(edge: DependencyEdge): string {
  return `
    <div style="padding: 8px; background: white; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;">
      <strong>Dependency</strong><br/>
      From: ${edge.source.displayName}<br/>
      To: ${edge.target.displayName}<br/>
      Type: ${edge.type}<br/>
      Strength: ${edge.strength.toFixed(2)}
    </div>
  `;
}
