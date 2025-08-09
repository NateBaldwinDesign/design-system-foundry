/**
 * Layout Algorithms for Network Diagrams
 * Different positioning strategies for network visualizations
 */

import * as d3 from 'd3';
import type { TokenNode, DependencyEdge } from '../../../../services/visualizations/types/network-data';

export type LayoutType = 'force' | 'hierarchical' | 'circular' | 'grid';

export interface LayoutOptions {
  width: number;
  height: number;
  padding?: number;
  animated?: boolean;
  duration?: number;
}

/**
 * Apply force-directed layout (default from D3 simulation)
 */
export function applyForceLayout(
  nodes: TokenNode[],
  edges: DependencyEdge[],
  simulation: d3.Simulation<TokenNode, undefined>
): void {
  // Force layout is handled by the D3 simulation itself
  // This function serves as a placeholder for consistency
  simulation.nodes(nodes);
  simulation.force<d3.ForceLink<TokenNode, DependencyEdge>>('link')?.links(edges);
  simulation.alpha(1).restart();
}

/**
 * Apply hierarchical layout based on dependency depth
 */
export function applyHierarchicalLayout(
  nodes: TokenNode[],
  options: LayoutOptions
): void {
  const { width, height, padding = 50 } = options;
  
  // Group nodes by dependency depth
  const depthGroups = new Map<number, TokenNode[]>();
  let maxDepth = 0;
  
  nodes.forEach(node => {
    const depth = node.dependencyDepth;
    maxDepth = Math.max(maxDepth, depth);
    
    if (!depthGroups.has(depth)) {
      depthGroups.set(depth, []);
    }
    depthGroups.get(depth)!.push(node);
  });

  // Calculate layer positions
  const layerHeight = (height - 2 * padding) / Math.max(1, maxDepth);
  
  depthGroups.forEach((groupNodes, depth) => {
    const y = padding + (depth * layerHeight);
    const layerWidth = width - 2 * padding;
    const nodeSpacing = layerWidth / Math.max(1, groupNodes.length - 1);
    
    groupNodes.forEach((node, index) => {
      if (groupNodes.length === 1) {
        node.x = width / 2;
      } else {
        node.x = padding + (index * nodeSpacing);
      }
      node.y = y;
      
      // Fix positions for hierarchical layout
      node.fx = node.x;
      node.fy = node.y;
    });
  });
}

/**
 * Apply circular layout arranging nodes in concentric circles
 */
export function applyCircularLayout(
  nodes: TokenNode[],
  options: LayoutOptions
): void {
  const { width, height, padding = 50 } = options;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) / 2 - padding;
  
  // Group nodes by resolved value type for different rings
  const typeGroups = new Map<string, TokenNode[]>();
  nodes.forEach(node => {
    const type = node.resolvedValueTypeCategory;
    if (!typeGroups.has(type)) {
      typeGroups.set(type, []);
    }
    typeGroups.get(type)!.push(node);
  });

  const ringCount = typeGroups.size;
  const ringSpacing = maxRadius / Math.max(1, ringCount);
  
  let ringIndex = 0;
  typeGroups.forEach((groupNodes) => {
    const radius = ringSpacing * (ringIndex + 1);
    const angleStep = (2 * Math.PI) / groupNodes.length;
    
    groupNodes.forEach((node, index) => {
      const angle = index * angleStep;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
      
      // Fix positions for circular layout
      node.fx = node.x;
      node.fy = node.y;
    });
    
    ringIndex++;
  });
}

/**
 * Apply grid layout for systematic arrangement
 */
export function applyGridLayout(
  nodes: TokenNode[],
  options: LayoutOptions
): void {
  const { width, height, padding = 50 } = options;
  
  // Calculate grid dimensions
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  
  const cellWidth = (width - 2 * padding) / cols;
  const cellHeight = (height - 2 * padding) / rows;
  
  // Sort nodes by name for consistent positioning
  const sortedNodes = [...nodes].sort((a, b) => a.displayName.localeCompare(b.displayName));
  
  sortedNodes.forEach((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    node.x = padding + (col * cellWidth) + (cellWidth / 2);
    node.y = padding + (row * cellHeight) + (cellHeight / 2);
    
    // Fix positions for grid layout
    node.fx = node.x;
    node.fy = node.y;
  });
}

/**
 * Clear fixed positions to allow free movement
 */
export function clearFixedPositions(nodes: TokenNode[]): void {
  nodes.forEach(node => {
    node.fx = null;
    node.fy = null;
  });
}

/**
 * Apply layout based on type with animation support
 */
export function applyLayout(
  layoutType: LayoutType,
  nodes: TokenNode[],
  edges: DependencyEdge[],
  simulation: d3.Simulation<TokenNode, undefined>,
  options: LayoutOptions
): void {
  // Clear any existing fixed positions first
  clearFixedPositions(nodes);
  
  switch (layoutType) {
    case 'hierarchical':
      applyHierarchicalLayout(nodes, options);
      break;
    case 'circular':
      applyCircularLayout(nodes, options);
      break;
    case 'grid':
      applyGridLayout(nodes, options);
      break;
    case 'force':
    default:
      applyForceLayout(nodes, edges, simulation);
      break;
  }
  
  // If not using force layout, we need to restart the simulation
  // to update positions smoothly
  if (layoutType !== 'force') {
    simulation.alpha(0.3).restart();
    
    // After a short time, clear fixed positions to allow natural settling
    if (options.animated !== false) {
      setTimeout(() => {
        if (layoutType === 'force') {
          clearFixedPositions(nodes);
        }
      }, options.duration || 1000);
    }
  }
}

/**
 * Calculate optimal positioning for a subset of highlighted nodes
 */
export function focusOnNodes(
  targetNodes: TokenNode[],
  allNodes: TokenNode[],
  options: LayoutOptions
): { transform: d3.ZoomTransform; boundingBox: { x: number; y: number; width: number; height: number } } {
  if (targetNodes.length === 0) {
    // Return identity transform if no nodes to focus on
    return {
      transform: d3.zoomIdentity,
      boundingBox: { x: 0, y: 0, width: options.width, height: options.height }
    };
  }
  
  // Calculate bounding box of target nodes
  const xs = targetNodes.map(n => n.x || 0);
  const ys = targetNodes.map(n => n.y || 0);
  
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  const boundingBox = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
  
  // Add padding around the bounding box
  const padding = 100;
  const paddedWidth = boundingBox.width + 2 * padding;
  const paddedHeight = boundingBox.height + 2 * padding;
  
  // Calculate scale to fit the bounding box in the viewport
  const scaleX = options.width / paddedWidth;
  const scaleY = options.height / paddedHeight;
  const scale = Math.min(scaleX, scaleY, 2); // Cap scale at 2x
  
  // Calculate translation to center the bounding box
  const centerX = minX + boundingBox.width / 2;
  const centerY = minY + boundingBox.height / 2;
  const translateX = options.width / 2 - centerX * scale;
  const translateY = options.height / 2 - centerY * scale;
  
  const transform = d3.zoomIdentity
    .translate(translateX, translateY)
    .scale(scale);
  
  return { transform, boundingBox };
}
