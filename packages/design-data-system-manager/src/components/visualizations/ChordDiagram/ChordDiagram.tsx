/**
 * ChordDiagram Component
 * D3.js chord diagram for analyzing token values across mode combinations and platform overrides
 * Shows mode coupling, platform deviations, and value conflicts
 */

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Box, Alert, AlertIcon, AlertDescription } from '@chakra-ui/react';
import * as d3 from 'd3';
import type { ChordDiagramProps } from '../../../services/visualizations/types/chord-data';
import type { ChordNode } from '../../../services/visualizations/types/chord-data';
import {
  getNodeColor,
  getRibbonColor,
  createNodeTooltip,
  createRibbonTooltip
} from './utils/chord-helpers';
import { createTooltip } from '../NetworkDiagram/utils/interaction-handlers';

export interface ChordDiagramRef {
  exportVisualization: (format: 'png' | 'svg' | 'json') => void;
  highlightType: (type: 'mode-coupling' | 'platform-deviation' | 'conflicts' | null) => void;
  resetView: () => void;
}

export const ChordDiagram = forwardRef<ChordDiagramRef, ChordDiagramProps>((props, ref) => {
  const {
    data,
    onNodeClick,
    onLinkClick,
    onNodeHover,
    showLabels = true,
    width = 600,
    height = 600,
    interactive = true,
    filterOptions
  } = props;

  // Refs for D3 elements
  const svgRef = useRef<SVGSVGElement>(null);
  
  // State management
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ChordNode | null>(null);

  // Tooltip instance
  const tooltipRef = useRef(createTooltip());

  // D3 selections refs
  const selectionsRef = useRef<{
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null;
    container: d3.Selection<SVGGElement, unknown, null, undefined> | null;
    arcs: d3.Selection<SVGPathElement, d3.ChordGroup, SVGGElement, unknown> | null;
    ribbons: d3.Selection<SVGPathElement, d3.Chord, SVGGElement, unknown> | null;
    labels: d3.Selection<SVGTextElement, d3.ChordGroup, SVGGElement, unknown> | null;
  }>({
    svg: null,
    container: null,
    arcs: null,
    ribbons: null,
    labels: null
  });

  // Apply filters to data
  const filteredData = useCallback(() => {
    if (!filterOptions) return data;

    let filteredNodes = [...data.nodes];
    let filteredLinks = [...data.links];

    // Apply conflict threshold filters
    if (filterOptions.minConflictThreshold !== undefined) {
      filteredNodes = filteredNodes.filter(node => 
        node.conflicts >= filterOptions.minConflictThreshold!
      );
    }

    if (filterOptions.maxConflictThreshold !== undefined) {
      filteredNodes = filteredNodes.filter(node => 
        node.conflicts <= filterOptions.maxConflictThreshold!
      );
    }

    // Apply mode/platform filters
    if (filterOptions.selectedModes?.length) {
      filteredNodes = filteredNodes.filter(node => 
        node.type !== 'mode' || filterOptions.selectedModes!.includes(node.modeId!)
      );
    }

    if (filterOptions.selectedPlatforms?.length) {
      filteredNodes = filteredNodes.filter(node => 
        node.type !== 'platform' || filterOptions.selectedPlatforms!.includes(node.platformId!)
      );
    }

    // Apply conflict type filters
    if (filterOptions.conflictTypes?.length) {
      filteredLinks = filteredLinks.filter(link => 
        filterOptions.conflictTypes!.includes(link.conflictType)
      );
    }

    // Filter only conflicts if specified
    if (filterOptions.showOnlyConflicts) {
      filteredLinks = filteredLinks.filter(link => 
        link.conflictType === 'value-conflict' || link.conflictType === 'mode-coupling'
      );
    }

    // Update matrix based on filtered data
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    filteredLinks = filteredLinks.filter(link => 
      nodeIds.has(link.source.id) && nodeIds.has(link.target.id)
    );

    // Rebuild matrix for filtered data
    const filteredMatrix = data.matrix
      .map((row, i) => 
        data.nodes[i] && nodeIds.has(data.nodes[i].id) ? 
        row.filter((_, j) => data.nodes[j] && nodeIds.has(data.nodes[j].id)) : 
        []
      )
      .filter(row => row.length > 0);

    return {
      ...data,
      nodes: filteredNodes,
      links: filteredLinks,
      matrix: filteredMatrix
    };
  }, [data, filterOptions]);

  // Initialize chord diagram
  const initializeChordDiagram = useCallback(() => {
    if (!svgRef.current || !data.nodes.length) return;

    try {
      setError(null);

      // Clear previous visualization
      d3.select(svgRef.current).selectAll('*').remove();

      const currentData = filteredData();
      const svg = d3.select(svgRef.current);
      const container = svg.append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);

      // Calculate basic dimensions (simplified from original chord layout)
      const padding = 40;

      // Create simple visualization showing nodes in a circle
      const nodeCount = currentData.nodes.length;
      if (nodeCount === 0) {
        // Show message if no data
        container.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('font-size', '16px')
          .style('fill', '#718096')
          .text('No mode or platform data available');
        return;
      }

      // Create nodes in a circle
      const nodeRadius = 20;
      const circleRadius = Math.min(width, height) * 0.3;
      
      const nodeGroups = container.append('g')
        .attr('class', 'nodes')
        .selectAll('g')
        .data(currentData.nodes)
        .enter()
        .append('g')
        .attr('transform', (d, i) => {
          const angle = (i / nodeCount) * 2 * Math.PI;
          const x = Math.cos(angle) * circleRadius;
          const y = Math.sin(angle) * circleRadius;
          return `translate(${x}, ${y})`;
        });

      // Add circles for nodes
      const arcs = nodeGroups.append('circle')
        .attr('r', nodeRadius)
        .attr('fill', (d, i) => getNodeColor(d, i))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

      // Add labels if enabled
      let labels = null;
      if (showLabels) {
        labels = nodeGroups.append('text')
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .style('font-size', '10px')
          .style('font-family', 'system-ui')
          .style('fill', '#2D3748')
          .text(d => d.name);
      }

      // Create simple connections if there are links
      const ribbons = container.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(currentData.links)
        .enter()
        .append('line')
        .attr('x1', (d) => {
          const sourceIndex = currentData.nodes.findIndex(n => n.id === d.source.id);
          const angle = (sourceIndex / nodeCount) * 2 * Math.PI;
          return Math.cos(angle) * circleRadius;
        })
        .attr('y1', (d) => {
          const sourceIndex = currentData.nodes.findIndex(n => n.id === d.source.id);
          const angle = (sourceIndex / nodeCount) * 2 * Math.PI;
          return Math.sin(angle) * circleRadius;
        })
        .attr('x2', (d) => {
          const targetIndex = currentData.nodes.findIndex(n => n.id === d.target.id);
          const angle = (targetIndex / nodeCount) * 2 * Math.PI;
          return Math.cos(angle) * circleRadius;
        })
        .attr('y2', (d) => {
          const targetIndex = currentData.nodes.findIndex(n => n.id === d.target.id);
          const angle = (targetIndex / nodeCount) * 2 * Math.PI;
          return Math.sin(angle) * circleRadius;
        })
        .attr('stroke', d => getRibbonColor(d, 0.7))
        .attr('stroke-width', d => Math.max(1, d.value / 10))
        .style('opacity', 0.7);

      // Store selection references
      selectionsRef.current.svg = svg;
      selectionsRef.current.container = container;
      selectionsRef.current.arcs = arcs;
      selectionsRef.current.ribbons = ribbons;
      selectionsRef.current.labels = labels;

      // Setup interactions if interactive
      if (interactive) {
        // Node interactions
        arcs
          .style('cursor', 'pointer')
          .on('click', function(event, d) {
            setSelectedNode(d);
            onNodeClick?.(d);
          })
          .on('mouseenter', function(event, d) {
            const mockGroup = { startAngle: 0, endAngle: Math.PI * 2, value: d.valueCount, index: 0 };
            tooltipRef.current.show(
              createNodeTooltip(d, mockGroup),
              event.pageX,
              event.pageY
            );
            onNodeHover?.(d);
          })
          .on('mouseleave', function() {
            tooltipRef.current.hide();
            onNodeHover?.(null);
          });

        // Link interactions
        ribbons
          .style('cursor', 'pointer')
          .on('click', function(event, d) {
            onLinkClick?.(d);
          })
          .on('mouseenter', function(event, d) {
            const mockChord = { 
              source: { index: 0, startAngle: 0, endAngle: 0, value: 0 }, 
              target: { index: 1, startAngle: 0, endAngle: 0, value: 0 }
            };
            tooltipRef.current.show(
              createRibbonTooltip(d, mockChord),
              event.pageX,
              event.pageY
            );
          })
          .on('mouseleave', function() {
            tooltipRef.current.hide();
          });

        // Background click to clear selection
        svg.on('click', function(event) {
          if (event.target === this) {
            setSelectedNode(null);
            // Simple clear highlights by resetting opacity
            arcs.style('opacity', 1);
            ribbons.style('opacity', 0.7);
          }
        });
      }

      // Simple entrance animation
      arcs
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 100)
        .style('opacity', 1);

      ribbons
        .style('opacity', 0)
        .transition()
        .duration(1000)
        .delay(500)
        .style('opacity', 0.7);

      console.log('[ChordDiagram] Visualization created successfully:', {
        nodes: currentData.nodes.length,
        links: currentData.links.length
      });

    } catch (error) {
      console.error('[ChordDiagram] Error creating visualization:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [data, filteredData, width, height, showLabels, interactive, onNodeClick, onNodeHover, onLinkClick, filterOptions]);

  // Effect to initialize/update visualization
  useEffect(() => {
    initializeChordDiagram();
  }, [initializeChordDiagram]);

  // Imperative handle for ref methods
  useImperativeHandle(ref, () => ({
    exportVisualization: (format) => {
      console.log(`Exporting chord diagram as ${format}`);
      // Export functionality would be implemented here
    },
    highlightType: (type) => {
      if (!selectionsRef.current.arcs || !selectionsRef.current.ribbons) return;
      
      if (type && selectionsRef.current.ribbons) {
        // Highlight specific type of relationships
        selectionsRef.current.ribbons
          .style('opacity', (d) => {
            switch (type) {
              case 'mode-coupling':
                return d.conflictType === 'mode-coupling' ? 0.9 : 0.1;
              case 'platform-deviation':
                return d.conflictType === 'platform-override' ? 0.9 : 0.1;
              case 'conflicts':
                return d.conflictType === 'value-conflict' ? 0.9 : 0.1;
              default:
                return 0.7;
            }
          });
      } else if (selectionsRef.current.arcs && selectionsRef.current.ribbons) {
        // Reset highlights
        selectionsRef.current.arcs.style('opacity', 1);
        selectionsRef.current.ribbons.style('opacity', 0.7);
      }
    },
    resetView: () => {
      setSelectedNode(null);
      if (selectionsRef.current.arcs && selectionsRef.current.ribbons) {
        selectionsRef.current.arcs.style('opacity', 1);
        selectionsRef.current.ribbons.style('opacity', 0.7);
      }
    }
  }));

  // Cleanup effect
  useEffect(() => {
    return () => {
      tooltipRef.current.remove();
    };
  }, []);

  if (error) {
    return (
      <Alert status="error" borderRadius="md">
        <AlertIcon />
        <AlertDescription>
          Failed to render chord diagram: {error}
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
      
      {selectedNode && (
        <Box
          position="absolute"
          top={2}
          left={2}
          bg="white"
          p={2}
          borderRadius="md"
          boxShadow="sm"
          fontSize="sm"
          maxW="200px"
        >
          <strong>{selectedNode.name}</strong>
          <br />
          Type: {selectedNode.type}
          <br />
          Tokens: {selectedNode.tokenIds.length}
          <br />
          Conflicts: {selectedNode.conflicts}
        </Box>
      )}
    </Box>
  );
});

ChordDiagram.displayName = 'ChordDiagram';
