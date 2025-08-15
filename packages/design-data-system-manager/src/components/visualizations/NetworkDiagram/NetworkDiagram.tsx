/**
 * NetworkDiagram Component
 * Force-directed graph visualization for token dependency analysis
 * Based on existing TokenAnalysis.tsx patterns and D3.js best practices
 */

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Box, Alert, AlertIcon, AlertDescription } from '@chakra-ui/react';
import * as d3 from 'd3';
import type { 
  NetworkDiagramProps, 
  NetworkDiagramRef, 
  NetworkDiagramState,
  SimulationRefs,
  SelectionRefs
} from './types';
import type { TokenNode, DependencyEdge } from '../../../services/visualizations/types/network-data';
import {
  createForceSimulation,
  createZoomBehavior,
  createDragBehavior,
  applyBounds,
  calculateNodeSize,
  getNodeColor,
  getEdgeColor,
  getEdgeStrokeWidth
} from './utils/d3-helpers';
import {
  applyLayout,
  focusOnNodes,
  type LayoutType
} from './utils/layout-algorithms';
import {
  setupNodeInteractions,
  setupEdgeInteractions,
  setupBackgroundInteractions,
  highlightPath,
  clearHighlights,
  showConnections,
  clearConnections,
  createTooltip,
  type InteractionCallbacks
} from './utils/interaction-handlers';

export const NetworkDiagram = forwardRef<NetworkDiagramRef, NetworkDiagramProps>((props, ref) => {
  const {
    data,
    onNodeClick,
    onEdgeClick,
    onNodeHover,
    highlightPath: highlightPathProp = [],
    layout = 'force',
    showLabels = true,
    showLegend = false,
    showStatistics = false,
    width = 800,
    height = 600,
    interactive = true,
    clustered = true,
    filterOptions
  } = props;

  // Refs for D3 elements
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [state, setState] = useState<NetworkDiagramState>({
    isLoading: false,
    error: null,
    selectedNode: null,
    hoveredNode: null,
    highlightedPath: [],
    showStatistics: false,
    currentLayout: layout
  });

  // D3 references
  const simulationRefs = useRef<SimulationRefs>({
    simulation: null,
    zoom: null,
    drag: null
  });

  const selectionRefs = useRef<SelectionRefs>({
    svg: null,
    container: null,
    nodes: null,
    edges: null,
    labels: null
  });

  // Tooltip instance
  const tooltipRef = useRef(createTooltip());

  // Filtered data based on filter options
  const filteredData = useCallback(() => {
    if (!filterOptions) return data;

    let filteredNodes = [...data.nodes];
    let filteredEdges = [...data.edges];

    // Apply node filters
    if (filterOptions.hideIsolatedNodes) {
      filteredNodes = filteredNodes.filter(node => 
        node.usageCount > 0 || node.dependencyDepth > 0
      );
    }

    if (filterOptions.showOnlyCircular) {
      filteredNodes = filteredNodes.filter(node => node.hasCircularDependency);
    }

    if (filterOptions.minDependencyDepth !== undefined) {
      filteredNodes = filteredNodes.filter(node => 
        node.dependencyDepth >= filterOptions.minDependencyDepth!
      );
    }

    if (filterOptions.maxDependencyDepth !== undefined) {
      filteredNodes = filteredNodes.filter(node => 
        node.dependencyDepth <= filterOptions.maxDependencyDepth!
      );
    }

    if (filterOptions.resolvedValueTypes?.length) {
      filteredNodes = filteredNodes.filter(node => 
        filterOptions.resolvedValueTypes!.includes(node.resolvedValueTypeId)
      );
    }

    if (filterOptions.collections?.length) {
      filteredNodes = filteredNodes.filter(node => 
        node.collectionIds.some(id => filterOptions.collections!.includes(id))
      );
    }

    // Filter edges to only include those between remaining nodes
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    filteredEdges = filteredEdges.filter(edge => 
      nodeIds.has(edge.source.id) && nodeIds.has(edge.target.id)
    );

    return {
      ...data,
      nodes: filteredNodes,
      edges: filteredEdges
    };
  }, [data, filterOptions]);

  // Initialize visualization
  const initializeVisualization = useCallback(() => {
    if (!svgRef.current || !data.nodes.length) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Clear previous visualization
      d3.select(svgRef.current).selectAll('*').remove();

      const currentData = filteredData();
      const svg = d3.select(svgRef.current);
      const container = svg.append('g');

      // Store references
      selectionRefs.current.svg = svg;
      selectionRefs.current.container = container;

      // Create simulation
      const simulation = createForceSimulation(width, height, {
        clustering: clustered,
        linkDistance: 150,
        linkStrength: 0.2,
        chargeStrength: -400
      });

      // Create zoom behavior
      const zoom = createZoomBehavior<SVGSVGElement>('svg');
      svg.call(zoom);

      // Create drag behavior
      const drag = createDragBehavior(simulation);

      // Store behavior references
      simulationRefs.current = { simulation, zoom, drag };

      // Create edges
      const edges = container.append('g')
        .attr('class', 'edges')
        .selectAll('line')
        .data(currentData.edges)
        .enter()
        .append('line')
        .attr('stroke', getEdgeColor)
        .attr('stroke-width', getEdgeStrokeWidth)
        .attr('stroke-opacity', 0.8);

      // Create nodes
      const nodes = container.append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(currentData.nodes)
        .enter()
        .append('circle')
        .attr('r', d => calculateNodeSize(d.usageCount))
        .attr('fill', getNodeColor)
        .attr('stroke', d => {
          const baseColor = getNodeColor(d);
          return d3.color(baseColor)?.darker(0.5).toString() || baseColor;
        })
        .attr('stroke-width', 2);

      // Create labels if enabled
      let labels: d3.Selection<SVGTextElement, TokenNode, SVGGElement, unknown> | null = null;
      if (showLabels) {
        labels = container.append('g')
          .attr('class', 'labels')
          .selectAll('text')
          .data(currentData.nodes)
          .enter()
          .append('text')
          .text(d => d.displayName)
          .attr('font-size', 12)
          .attr('dx', 12)
          .attr('dy', 4)
          .attr('fill', '#2D3748')
          .attr('pointer-events', 'none');
      }

      // Store selection references
      selectionRefs.current.nodes = nodes;
      selectionRefs.current.edges = edges;
      selectionRefs.current.labels = labels;

      // Setup interactions if interactive
      if (interactive) {
        const callbacks: InteractionCallbacks = {
          onNodeClick: (node, event) => {
            setState(prev => ({ ...prev, selectedNode: node }));
            showConnections(nodes, edges, node);
            onNodeClick?.(node);
          },
          onNodeHover: (node, event) => {
            setState(prev => ({ ...prev, hoveredNode: node }));
            if (node && event) {
              tooltipRef.current.show(
                `<strong>${node.displayName}</strong><br/>
                Type: ${node.type}<br/>
                Dependencies: ${node.dependencyDepth}<br/>
                Usage: ${node.usageCount}`,
                event.pageX,
                event.pageY
              );
            } else {
              tooltipRef.current.hide();
            }
            onNodeHover?.(node);
          },
          onEdgeClick: (edge, event) => {
            onEdgeClick?.(edge);
          },
          onBackgroundClick: () => {
            setState(prev => ({ ...prev, selectedNode: null }));
            clearConnections(nodes, edges);
          }
        };

        setupNodeInteractions(nodes, callbacks);
        setupEdgeInteractions(edges, callbacks);
        setupBackgroundInteractions(svg, callbacks);

        // Apply drag behavior to nodes
        nodes.call(drag);
      }

      // Setup simulation
      simulation.force<d3.ForceLink<TokenNode, DependencyEdge>>('link')?.links(currentData.edges);
      simulation.nodes(currentData.nodes);

      // Update positions on tick
      simulation.on('tick', () => {
        // Apply bounds to keep nodes in viewport
        applyBounds(currentData.nodes, width, height, 50);

        // Update edge positions
        edges
          .attr('x1', d => d.source.x || 0)
          .attr('y1', d => d.source.y || 0)
          .attr('x2', d => d.target.x || 0)
          .attr('y2', d => d.target.y || 0);

        // Update node positions
        nodes
          .attr('cx', d => d.x || 0)
          .attr('cy', d => d.y || 0);

        // Update label positions
        if (labels) {
          labels
            .attr('x', d => d.x || 0)
            .attr('y', d => d.y || 0);
        }
      });

      // Apply initial layout
      applyLayout(state.currentLayout as LayoutType, currentData.nodes, currentData.edges, simulation, {
        width,
        height
      });

      setState(prev => ({ ...prev, isLoading: false }));

    } catch (error) {
      console.error('[NetworkDiagram] Error initializing visualization:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [data, width, height, showLabels, interactive, clustered, filteredData, state.currentLayout, onNodeClick, onNodeHover, onEdgeClick]);

  // Effect to initialize/update visualization
  useEffect(() => {
    initializeVisualization();
  }, [initializeVisualization]);

  // Effect to handle highlight path changes
  useEffect(() => {
    if (highlightPathProp.length > 0 && selectionRefs.current.nodes && selectionRefs.current.edges) {
      highlightPath(selectionRefs.current.nodes, selectionRefs.current.edges, highlightPathProp);
      setState(prev => ({ ...prev, highlightedPath: highlightPathProp }));
    }
  }, [highlightPathProp]);

  // Imperative handle for ref methods
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (simulationRefs.current.zoom && svgRef.current) {
        simulationRefs.current.zoom.scaleBy(d3.select(svgRef.current), 1.3);
      }
    },
    zoomOut: () => {
      if (simulationRefs.current.zoom && svgRef.current) {
        simulationRefs.current.zoom.scaleBy(d3.select(svgRef.current), 0.7);
      }
    },
    resetView: () => {
      if (simulationRefs.current.zoom && svgRef.current) {
        d3.select(svgRef.current)
          .transition()
          .duration(750)
          .call(simulationRefs.current.zoom.transform, d3.zoomIdentity);
      }
    },
    focusOnNode: (nodeId: string) => {
      const node = data.nodes.find(n => n.id === nodeId);
      if (node && simulationRefs.current.zoom && svgRef.current) {
        const { transform } = focusOnNodes([node], data.nodes, { width, height });
        d3.select(svgRef.current)
          .transition()
          .duration(750)
          .call(simulationRefs.current.zoom.transform, transform);
      }
    },
    exportVisualization: (format) => {
      // Export functionality would be implemented here
      console.log(`Exporting as ${format}`);
    },
    highlightPath: (tokenIds: string[]) => {
      if (selectionRefs.current.nodes && selectionRefs.current.edges) {
        highlightPath(selectionRefs.current.nodes, selectionRefs.current.edges, tokenIds);
        setState(prev => ({ ...prev, highlightedPath: tokenIds }));
      }
    },
    clearHighlights: () => {
      if (selectionRefs.current.nodes && selectionRefs.current.edges) {
        clearHighlights(selectionRefs.current.nodes, selectionRefs.current.edges);
        setState(prev => ({ ...prev, highlightedPath: [] }));
      }
    },
    changeLayout: (newLayout) => {
      setState(prev => ({ ...prev, currentLayout: newLayout }));
      if (simulationRefs.current.simulation) {
        const currentData = filteredData();
        applyLayout(newLayout, currentData.nodes, currentData.edges, simulationRefs.current.simulation, {
          width,
          height
        });
      }
    }
  }));

  // Cleanup effect
  useEffect(() => {
    return () => {
      tooltipRef.current.remove();
    };
  }, []);

  if (state.error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <AlertDescription>
          Failed to render network diagram: {state.error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Box position="relative" width={width} height={height}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ 
          background: '#F7FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '6px'
        }}
      />
      
      {state.isLoading && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="white"
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderRadius="6px"
        >
          Loading visualization...
        </Box>
      )}
    </Box>
  );
});

NetworkDiagram.displayName = 'NetworkDiagram';
