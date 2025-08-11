/**
 * Circle Pack Component
 * D3.js zoomable circle pack visualization for system overview
 * Based on Observable example: https://observablehq.com/@d3/zoomable-circle-packing
 */

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Box, Alert, AlertIcon, AlertDescription } from '@chakra-ui/react';
import * as d3 from 'd3';
import type { CirclePackProps, CirclePackRef, CirclePackState, D3CirclePackNode } from './types';
import {
  createHierarchy,
  applyPackLayout,
  createNodeCircles,
  createNodeLabels,
  updateNodePositions,
  exportAsSVG,
  exportAsPNG,
  createTooltip
} from './utils/d3-helpers';

export const CirclePack = forwardRef<CirclePackRef, CirclePackProps>((props, ref) => {
  const {
    data,
  
    onNodeClick,
    onZoomChange,
    width = 800,
    height = 600,
    showLabels = true,
    showBreadcrumbs = true,
    interactive = true
  } = props;

  // Refs for D3 elements
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [state, setState] = useState<CirclePackState>({
    isLoading: false,
    error: null,
    zoomState: {
      currentPath: [],
      zoomLevel: 1,
      focusedNode: null,
      breadcrumbs: []
    },
    selectedNode: null,
    hoveredNode: null
  });

  // D3 selections refs
  const d3Refs = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null;
    container: d3.Selection<SVGGElement, unknown, null, undefined> | null;
    circles: d3.Selection<SVGCircleElement, D3CirclePackNode, SVGGElement, unknown> | null;
    labels: d3.Selection<SVGTextElement, D3CirclePackNode, SVGGElement, unknown> | null;
    zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null;
    tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined> | null;
    focus: D3CirclePackNode | null;
  }>({
    svg: null,
    container: null,
    circles: null,
    labels: null,
    zoom: null,
    tooltip: null,
    focus: null
  });



  // Initialize visualization
  const initializeVisualization = useCallback(() => {
    if (!svgRef.current || !data) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Clear previous visualization
      d3.select(svgRef.current).selectAll('*').remove();

      // Create SVG and container
      const svg = d3.select(svgRef.current);
      const container = svg.append('g');

      // Store references
      d3Refs.current.svg = svg;
      d3Refs.current.container = container;

      // Create tooltip
      d3Refs.current.tooltip = createTooltip();

      // Create hierarchy and apply layout
      const root = createHierarchy(data);
      const layoutRoot = applyPackLayout(root, width, height);

      // Set initial focus to root
      d3Refs.current.focus = layoutRoot;

      // Create zoom behavior for pan/zoom (not for focus transitions)
      if (interactive) {
        // We'll handle focus transitions separately, not through D3 zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([1, 8])
          .on("zoom", (event) => {
            // Only apply zoom if we're not in a focus transition
            if (!d3Refs.current.focus || d3Refs.current.focus.depth === 0) {
              container.attr("transform", event.transform);
            }
          })


        svg.call(zoom);
        d3Refs.current.zoom = zoom;
      }

      // Initial render
      updateVisualization(layoutRoot);

      setState(prev => ({ ...prev, isLoading: false }));

    } catch (error) {
      console.error('[CirclePack] Error initializing visualization:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [data, width, height, interactive, onZoomChange]);

  // Update visualization based on current focus (like Observable example)
  const updateVisualization = useCallback((focus: D3CirclePackNode) => {
    console.log('[CirclePack] Updating visualization for focus:', focus.data.name, 'depth:', focus.depth);
    
    if (!d3Refs.current.container) return;

    const container = d3Refs.current.container;
    
    // Clear previous elements
    container.selectAll('*').remove();

    // Get all descendants of the focus node (including focus node itself)
    const nodes = focus.descendants();
    
    console.log('[CirclePack] Rendering nodes:', nodes.map(n => ({ name: n.data.name, depth: n.depth, r: n.r })));

    // Create node circles
    d3Refs.current.circles = createNodeCircles(
      container,
      nodes,
      handleNodeClick,
      (node: D3CirclePackNode | null) => {
        setState(prev => ({ ...prev, hoveredNode: node }));
      }
    );

    // Create node labels
    d3Refs.current.labels = createNodeLabels(container, nodes, showLabels);

    // Update positions
    updateNodePositions(d3Refs.current.circles, d3Refs.current.labels);

    // Update breadcrumbs
    const breadcrumbs = getBreadcrumbs(focus);
    setState(prev => ({
      ...prev,
      zoomState: {
        ...prev.zoomState,
        focusedNode: focus,
        breadcrumbs: breadcrumbs.map(crumb => ({ name: crumb.name, type: crumb.node.data.type }))
      }
    }));
  }, [showLabels]);

  // Handle node click (zoom into node) - like Observable example
  const handleNodeClick = useCallback((node: D3CirclePackNode) => {
    console.log('[CirclePack] Node clicked:', node.data.name, 'depth:', node.depth, 'children:', node.children?.length);
    console.log('[CirclePack] Node data:', node.data);
    console.log('[CirclePack] Node children:', node.children);
    console.log('[CirclePack] Node data children:', node.data.children);
    
    if (!node.children || node.children.length === 0) {
      // Leaf node - just call the callback
      console.log('[CirclePack] Leaf node clicked, calling callback');
      onNodeClick?.(node);
      return;
    }

    console.log('[CirclePack] Zooming into node:', node.data.name);
    
    // Zoom into the node (like Observable example)
    if (d3Refs.current.svg && d3Refs.current.container) {
      const container = d3Refs.current.container;
      
      // Calculate zoom transform (like Observable example)
      const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(80 / (node.r || 1))
        .translate(-(node.x || 0), -(node.y || 0));

      console.log('[CirclePack] Transform calculated:', {
        x: transform.x,
        y: transform.y,
        k: transform.k,
        nodeX: node.x,
        nodeY: node.y,
        nodeR: node.r
      });

      // Apply transform directly to container (like Observable example)
      container.transition()
        .duration(750)
        .attr("transform", `translate(${transform.x},${transform.y})scale(${transform.k})`);

      console.log('[CirclePack] Transform applied to container');

      // Update focus and visualization
      console.log('[CirclePack] Updating focus from:', d3Refs.current.focus?.data.name, 'to:', node.data.name);
      d3Refs.current.focus = node;
      updateVisualization(node);
    }
  }, [width, height, onNodeClick, updateVisualization]);

  // Handle background click (reset to root) - like Observable example
  const handleBackgroundClick = useCallback(() => {
    console.log('[CirclePack] Background clicked, resetting to root');
    if (!d3Refs.current.focus) {
      console.log('[CirclePack] No focus node, nothing to reset');
      return;
    }

    // Find the root node
    let root = d3Refs.current.focus;
    while (root.parent) {
      root = root.parent;
    }

    // If we're already at the root, do nothing
    if (root === d3Refs.current.focus) {
      console.log('[CirclePack] Already at root, no action needed');
      return;
    }
    
    console.log('[CirclePack] Resetting from', d3Refs.current.focus.data.name, 'to', root.data.name);
    
    if (d3Refs.current.svg && d3Refs.current.container) {
      const container = d3Refs.current.container;
      
      // Reset transform to show entire visualization
      container.transition()
        .duration(750)
        .attr("transform", "translate(0,0)scale(1)");

      // Update focus to root and visualization
      d3Refs.current.focus = root;
      updateVisualization(root);
    }
  }, [updateVisualization]);

  // Get breadcrumbs for current focus
  const getBreadcrumbs = useCallback((focus: D3CirclePackNode): Array<{ name: string; node: D3CirclePackNode }> => {
    const breadcrumbs: Array<{ name: string; node: D3CirclePackNode }> = [];
    let current = focus;
    
    while (current.parent) {
      breadcrumbs.unshift({ name: current.data.name, node: current });
      current = current.parent;
    }
    
    return breadcrumbs;
  }, []);

  // Effect to initialize/update visualization
  useEffect(() => {
    initializeVisualization();
  }, [initializeVisualization]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove tooltip
      if (d3Refs.current.tooltip) {
        d3Refs.current.tooltip.remove();
      }
    };
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (d3Refs.current.svg && d3Refs.current.zoom) {
        const currentTransform = d3.zoomTransform(d3Refs.current.svg.node()!);
        const newScale = Math.min(currentTransform.k * 1.5, 8);
        const newTransform = currentTransform.scale(newScale);
        
        d3Refs.current.svg.transition()
          .duration(300)
          .call(d3Refs.current.zoom.transform, newTransform);
      }
    },
    zoomOut: () => {
      if (d3Refs.current.svg && d3Refs.current.zoom) {
        const currentTransform = d3.zoomTransform(d3Refs.current.svg.node()!);
        const newScale = Math.max(currentTransform.k / 1.5, 1);
        const newTransform = currentTransform.scale(newScale);
        
        d3Refs.current.svg.transition()
          .duration(300)
          .call(d3Refs.current.zoom.transform, newTransform);
      }
    },
    resetView: () => {
      if (d3Refs.current.svg && d3Refs.current.container) {
        // Reset transform
        d3Refs.current.container.transition()
          .duration(750)
          .attr("transform", "translate(0,0)scale(1)");
        
        // Reset focus to root
        if (d3Refs.current.focus && d3Refs.current.focus.parent) {
          let root = d3Refs.current.focus;
          while (root.parent) {
            root = root.parent;
          }
          d3Refs.current.focus = root;
          updateVisualization(root);
        }
      }
    },
    zoomToNode: (nodeId: string) => {
      // Implementation for zooming to specific node
      console.log('[CirclePack] Zoom to node:', nodeId);
    },
    exportVisualization: async (format: 'png' | 'svg' | 'json') => {
      if (!d3Refs.current.svg) return;
      
      const downloadData = (data: string, filename: string, mimeType: string) => {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      switch (format) {
        case 'svg': {
          const svgData = exportAsSVG(d3Refs.current.svg);
          downloadData(svgData, 'circle-pack.svg', 'image/svg+xml');
          break;
        }
        case 'png': {
          const pngData = await exportAsPNG(d3Refs.current.svg);
          downloadData(pngData, 'circle-pack.png', 'image/png');
          break;
        }
        case 'json': {
          const jsonData = JSON.stringify(data, null, 2);
          downloadData(jsonData, 'circle-pack-data.json', 'application/json');
          break;
        }
      }
    },
    getZoomState: () => state.zoomState
  }));

  // Render loading state
  if (state.isLoading) {
    return (
      <Box width={width} height={height} display="flex" alignItems="center" justifyContent="center">
        <Alert status="info">
          <AlertIcon />
          <AlertDescription>Loading circle pack visualization...</AlertDescription>
        </Alert>
      </Box>
    );
  }

  // Render error state
  if (state.error) {
    return (
      <Box width={width} height={height} display="flex" alignItems="center" justifyContent="center">
        <Alert status="error">
          <AlertIcon />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      </Box>
    );
  }

  // Render main visualization
  return (
    <Box ref={containerRef} width={width} height={height} position="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ cursor: interactive ? 'grab' : 'default' }}
        onClick={(e) => {
          // Only handle clicks on the SVG element itself (background)
          if (e.target === e.currentTarget) {
            handleBackgroundClick();
          }
        }}
      >
        {/* Background for click events */}
        <rect
          width={width}
          height={height}
          fill="transparent"
          style={{ cursor: interactive ? 'grab' : 'default' }}
          onClick={(e) => {
            e.stopPropagation();
            handleBackgroundClick();
          }}
        />
      </svg>
      
      {/* Breadcrumbs */}
      {showBreadcrumbs && state.zoomState.breadcrumbs.length > 0 && (
        <Box
          position="absolute"
          top={2}
          left={2}
          bg="white"
          px={2}
          py={1}
          borderRadius="md"
          boxShadow="sm"
          fontSize="sm"
        >
          {state.zoomState.breadcrumbs.map((crumb, index) => (
            <span key={index}>
              {index > 0 && ' > '}
              {crumb.name}
            </span>
          ))}
        </Box>
      )}
    </Box>
  );
});

CirclePack.displayName = 'CirclePack';
