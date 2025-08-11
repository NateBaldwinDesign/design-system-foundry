/**
 * D3 Helper Functions for Circle Pack
 * Based on Observable example: https://observablehq.com/@d3/zoomable-circle-packing
 */

import * as d3 from 'd3';
import type { CirclePackNode, CirclePackData } from '../../../../services/visualizations/types/circle-pack-data';
import type { D3CirclePackNode } from '../types';

/**
 * Create D3 hierarchy from circle pack data
 */
export function createHierarchy(data: CirclePackData): D3CirclePackNode {
  console.log('[D3 Helpers] Creating hierarchy with data:', data);
  
  // Create the hierarchy with proportional values
  const root = d3.hierarchy(data)
    .sum(d => d.value || 1) // Use proportional values
    .sort((a, b) => (b.value || 0) - (a.value || 0));

  console.log('[D3 Helpers] Created hierarchy root:', root);
  console.log('[D3 Helpers] Root children:', root.children?.map(c => ({ name: c.data.name, children: c.children?.length, value: c.value })));
  
  return root as D3CirclePackNode;
}

/**
 * Create D3 pack layout
 */
export function createPackLayout(width: number, height: number, padding: number = 3) {
  return d3.pack<CirclePackNode>()
    .size([width, height])
    .padding(padding);
}

/**
 * Apply pack layout to hierarchy
 */
export function applyPackLayout(root: D3CirclePackNode, width: number, height: number): D3CirclePackNode {
  const pack = createPackLayout(width, height);
  pack(root);
  return root;
}

/**
 * Create zoom behavior
 */
export function createZoomBehavior(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  onZoomChange?: (path: string[]) => void
) {
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
      container.attr("transform", event.transform);
      
      // Update zoom state
      if (onZoomChange) {
        const path = getCurrentPath(event.transform);
        onZoomChange(path);
      }
    });

  svg.call(zoom);
  return zoom;
}

/**
 * Get current zoom path based on transform
 */
function getCurrentPath(_transform: d3.ZoomTransform): string[] {
  // This is a simplified implementation
  // In practice, you'd track the current focused node
  return [];
}

/**
 * Get node color based on hierarchy depth (monochromatic scale)
 * Based on Observable example: https://observablehq.com/@d3/zoomable-circle-packing
 */
export function getNodeColor(node: D3CirclePackNode): string {
  // Use Chakra UI blue scale for monochromatic hierarchy
  const blueScale = [
    '#EBF8FF', // 50 - lightest
    '#BEE3F8', // 100
    '#90CDF4', // 200
    '#63B3ED', // 300
    '#4299E1', // 400
    '#3182CE', // 500
    '#2B6CB0', // 600
    '#2C5282', // 700
    '#2A4365', // 800
    '#1A365D'  // 900 - darkest
  ];
  
  // Use depth to determine color (deeper = darker)
  const depth = node.depth || 0;
  const colorIndex = Math.min(depth, blueScale.length - 1);
  
  return blueScale[colorIndex];
}

/**
 * Get node stroke color (darker version of fill)
 */
export function getNodeStrokeColor(node: D3CirclePackNode): string {
  const baseColor = getNodeColor(node);
  const color = d3.color(baseColor);
  return color ? color.darker(0.5).toString() : baseColor;
}



/**
 * Create tooltip for node
 */
export function createTooltip(): d3.Selection<HTMLDivElement, unknown, null, undefined> {
  return d3.select("body")
    .append("div")
    .attr("class", "circle-pack-tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("z-index", "1000");
}

/**
 * Show tooltip with node information
 */
export function showTooltip(
  tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
  node: CirclePackNode,
  event: MouseEvent
) {
  const content = `
    <div><strong>${node.name}</strong></div>
    <div>Type: ${node.type}</div>
    ${node.entityType ? `<div>Entity: ${node.entityType}</div>` : ''}
    ${node.value ? `<div>Value: ${node.value}</div>` : ''}
    ${node.hasChildren ? `<div>Has children: Yes</div>` : ''}
  `;

  tooltip
    .html(content)
    .style("visibility", "visible")
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 10) + "px");
}

/**
 * Hide tooltip
 */
export function hideTooltip(tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>) {
  tooltip.style("visibility", "hidden");
}

/**
 * Create node circles
 */
export function createNodeCircles(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: D3CirclePackNode[],
  onNodeClick?: (node: D3CirclePackNode) => void,
  onNodeHover?: (node: D3CirclePackNode | null) => void
) {
  const circles = container.append("g")
    .attr("class", "nodes")
    .selectAll("circle")
    .data(nodes)
    .enter()
    .append("circle")
    .attr("r", d => d.r || 10) // Use D3's calculated radius
    .attr("fill", getNodeColor)
    .attr("stroke", getNodeStrokeColor)
    .attr("stroke-width", 2)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      console.log('[D3 Helpers] Circle clicked:', d.data.name, 'depth:', d.depth, 'data:', d.data);
      event.stopPropagation();
      onNodeClick?.(d);
    })
    .on("mouseover", (event, d) => {
      d3.select(event.target)
        .attr("stroke-width", 3)
        .attr("stroke", "#E53E3E");
      onNodeHover?.(d);
    })
    .on("mouseout", (event, d) => {
      d3.select(event.target)
        .attr("stroke-width", 2)
        .attr("stroke", getNodeStrokeColor(d));
      onNodeHover?.(null);
    });

  return circles;
}

/**
 * Create node labels
 */
export function createNodeLabels(
  container: d3.Selection<SVGGElement, unknown, null, undefined>,
  nodes: D3CirclePackNode[],
  showLabels: boolean = true
) {
  if (!showLabels) return null;

  // Enhanced label visibility logic inspired by Observable example
  const visibleNodes = nodes.filter(node => {
    const radius = node.r || 0;
    const hasChildren = node.children && node.children.length > 0;
    const nodeType = node.data.type;
    const name = node.data.name || '';
    
    // Focus node (depth 0) - always show if reasonably sized
    if (node.depth === 0) {
      return radius >= 15;
    }
    
    // Immediate children (depth 1) - show based on size and content
    if (node.depth === 1) {
      // Always show entity nodes (collections, taxonomies, etc.)
      if (nodeType === 'entity') return radius >= 20;
      
      // Show individual items if they're large enough
      if (nodeType === 'token' || nodeType === 'collection' || nodeType === 'taxonomy' || 
          nodeType === 'dimension' || nodeType === 'component' || nodeType === 'tokenOverride') {
        return radius >= 18;
      }
      
      // Show other types if they're large and have meaningful names
      return radius >= 25 && name.length > 0;
    }
    
    // Deeper levels (depth 2) - progressive visibility based on zoom context
    if (node.depth === 2) {
      // Show entity nodes if they're large enough
      if (nodeType === 'entity') return radius >= 25;
      
      // Show individual items with more restrictive size requirements
      if (nodeType === 'token' || nodeType === 'collection' || nodeType === 'taxonomy' || 
          nodeType === 'dimension' || nodeType === 'component' || nodeType === 'tokenOverride') {
        return radius >= 22;
      }
      
      // Show other types only if they're large and have children
      return radius >= 30 && hasChildren;
    }
    
    // Very deep levels (depth 3+) - only show if they're substantial
    if (node.depth >= 3) {
      // Only show if the node is quite large and has meaningful content
      return radius >= 35 && hasChildren && name.length > 0;
    }
    
    return false;
  });

  const labels = container.append("g")
    .attr("class", "labels")
    .selectAll("text")
    .data(visibleNodes)
    .enter()
    .append("text")
    .style("font-size", d => {
      // Enhanced responsive font sizing inspired by Observable example
      const radius = d.r || 0;
      const depth = d.depth || 0;
      
      if (depth === 0) {
        // Focus node - size based on radius with minimum
        return Math.max(16, Math.min(24, radius / 3)) + "px";
      } else if (depth === 1) {
        // Immediate children - proportional to size
        return Math.max(12, Math.min(18, radius / 2.5)) + "px";
      } else if (depth === 2) {
        // Deeper levels - smaller but still readable
        return Math.max(10, Math.min(14, radius / 3)) + "px";
      } else if (depth >= 3) {
        // Very deep levels - minimal but functional
        return Math.max(8, Math.min(12, radius / 4)) + "px";
      }
      
      return "10px";
    })
    .style("font-weight", "bold")
    .style("text-anchor", "middle")
    .style("pointer-events", "none")
    .style("fill", d => {
      // Focus node gets slightly different styling to stand out
      if (d.depth === 0) {
        return "#E2E8F0"; // Slightly off-white for focus node
      }
      return "white";
    })
    .style("text-shadow", d => {
      // Enhanced shadow for focus node
      if (d.depth === 0) {
        return "2px 2px 4px rgba(0,0,0,0.9)"; // Stronger shadow for focus
      }
      return "1px 1px 2px rgba(0,0,0,0.8)"; // Standard shadow for others
    })
    .attr("dy", d => {
      // Position focus node label above the circle, others in center
      if (d.depth === 0) {
        // Focus node - position above circle
        const radius = d.r || 0;
        return -(radius + 25); // 25px above the circle edge
      }
      // Other nodes - center position (default)
      return "0.35em"; // Slight adjustment for better centering
    })
    .text(d => {
      // Enhanced text truncation inspired by Observable example
      const name = d.data.name || '';
      const radius = d.r || 0;
      const depth = d.depth || 0;
      
      // Calculate max length based on radius and depth
      let maxLength;
      if (depth === 0) {
        // Focus node - more space for longer names
        maxLength = Math.max(15, Math.min(25, radius / 2));
      } else if (depth === 1) {
        // Immediate children - moderate length
        maxLength = Math.max(12, Math.min(18, radius / 2.5));
      } else if (depth === 2) {
        // Deeper levels - shorter names
        maxLength = Math.max(8, Math.min(14, radius / 3));
      } else {
        // Very deep levels - minimal names
        maxLength = Math.max(6, Math.min(10, radius / 4));
      }
      
      // Truncate with ellipsis if needed
      if (name.length > maxLength) {
        return name.substring(0, Math.floor(maxLength)) + '...';
      }
      
      return name;
    })
    .style("opacity", d => {
      // Enhanced opacity logic with smooth transitions and context awareness
      const radius = d.r || 0;
      const hasChildren = d.children && d.children.length > 0;
      const nodeType = d.data.type;
      const depth = d.depth || 0;
      const name = d.data.name || '';
      
      if (depth === 0) {
        // Focus node - show if reasonably sized
        return radius >= 15 ? 1 : 0;
      } else if (depth === 1) {
        // Immediate children - progressive opacity based on size
        if (nodeType === 'entity') {
          return radius >= 20 ? 1 : radius >= 15 ? 0.7 : 0;
        }
        if (nodeType === 'token' || nodeType === 'collection' || nodeType === 'taxonomy' || 
            nodeType === 'dimension' || nodeType === 'component' || nodeType === 'tokenOverride') {
          return radius >= 18 ? 1 : radius >= 15 ? 0.6 : 0;
        }
        return radius >= 25 && name.length > 0 ? 1 : 0;
      } else if (depth === 2) {
        // Deeper levels - more restrictive with smooth falloff
        if (nodeType === 'entity') {
          return radius >= 25 ? 1 : radius >= 20 ? 0.8 : 0;
        }
        if (nodeType === 'token' || nodeType === 'collection' || nodeType === 'taxonomy' || 
            nodeType === 'dimension' || nodeType === 'component' || nodeType === 'tokenOverride') {
          return radius >= 22 ? 1 : radius >= 18 ? 0.6 : 0;
        }
        return radius >= 30 && hasChildren ? 0.8 : 0;
      } else if (depth >= 3) {
        // Very deep levels - only show substantial nodes
        return radius >= 35 && hasChildren && name.length > 0 ? 0.6 : 0;
      }
      
      return 0;
    });

  return labels;
}

/**
 * Update node positions during zoom/pan
 */
export function updateNodePositions(
  circles: d3.Selection<SVGCircleElement, D3CirclePackNode, SVGGElement, unknown>,
  labels: d3.Selection<SVGTextElement, D3CirclePackNode, SVGGElement, unknown> | null
) {
  circles
    .attr("cx", d => d.x || 0)
    .attr("cy", d => d.y || 0);

  if (labels) {
    labels
      .attr("x", d => d.x || 0)
      .attr("y", d => d.y || 0)
      .attr("dy", d => {
        // Maintain positioning during zoom/pan
        if (d.depth === 0) {
          // Focus node - position above circle
          const radius = d.r || 0;
          return -(radius + 25); // 25px above the circle edge
        }
        // Other nodes - center position
        return "0.35em";
      });
  }
}

/**
 * Zoom to specific node
 */
export function zoomToNode(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  node: D3CirclePackNode,
  width: number,
  height: number
) {
  const zoom = d3.zoom<SVGSVGElement, unknown>();
  
  const transform = d3.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(80 / (node.r || 1))
    .translate(-(node.x || 0), -(node.y || 0));

  svg.transition()
    .duration(750)
    .call(zoom.transform, transform);
}

/**
 * Reset zoom to show entire visualization
 */
export function resetZoom(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
) {
  const zoom = d3.zoom<SVGSVGElement, unknown>();
  
  svg.transition()
    .duration(750)
    .call(zoom.transform, d3.zoomIdentity);
}

/**
 * Export visualization as SVG
 */
export function exportAsSVG(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>): string {
  const svgElement = svg.node();
  if (!svgElement) return '';
  
  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgElement);
}

/**
 * Export visualization as PNG
 */
export function exportAsPNG(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>): Promise<string> {
  return new Promise((resolve) => {
    const svgElement = svg.node();
    if (!svgElement) {
      resolve('');
      return;
    }

    const svgData = exportAsSVG(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  });
}
