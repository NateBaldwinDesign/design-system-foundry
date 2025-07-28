import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, HStack } from '@chakra-ui/react';
import * as d3 from 'd3';
import { ValidationService } from '../services/validation';
import type { TokenCollection, Dimension, Platform, Taxonomy, ResolvedValueType } from '@token-model/data-model';
import type { ExtendedToken } from '../components/TokenEditorDialog';

interface TokenNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  valueTypeName: string;
  valueTypeCategory: string;
  group: number;
  value?: Record<string, unknown>;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  cluster?: number;
}

interface TokenLink extends d3.SimulationLinkDatum<TokenNode> {
  source: TokenNode;
  target: TokenNode;
  value: number;
}

interface D3DragEvent extends d3.D3DragEvent<SVGCircleElement, TokenNode, TokenNode> {
  active: number;
  fx?: number | null;
  fy?: number | null;
}

interface TokenAnalysisProps {
  tokens: ExtendedToken[];
  collections: TokenCollection[];
  dimensions: Dimension[];
  platforms: Platform[];
  taxonomies: Taxonomy[];
  resolvedValueTypes: ResolvedValueType[];
}

export const TokenAnalysis: React.FC<TokenAnalysisProps> = ({ 
  tokens, 
  collections, 
  dimensions, 
  platforms, 
  taxonomies, 
  resolvedValueTypes 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const simulationRef = useRef<d3.Simulation<TokenNode, undefined> | null>(null);

  // Create complete schema object
  const schema = {
    systemName: 'Token Analysis',
    systemId: 'token-analysis',
    tokens,
    resolvedValueTypes,
    tokenCollections: collections,
    dimensions,
    platforms,
    taxonomies,
    version: '1.0.0',
    versionHistory: []
  };

  // Log loaded data
  useEffect(() => {
    console.log('Loaded Data:', {
      tokenCount: tokens?.length,
      collectionCount: collections?.length,
      dimensionCount: dimensions?.length,
      platformCount: platforms?.length,
      taxonomyCount: taxonomies?.length,
      valueTypeCount: resolvedValueTypes?.length,
      sampleTokens: tokens?.slice(0, 2),
      sampleValueTypes: resolvedValueTypes?.slice(0, 2)
    });
  }, [tokens, collections, dimensions, platforms, taxonomies, resolvedValueTypes]);

  // Initialize zoom behavior when SVG is mounted
  useEffect(() => {
    const checkSvg = () => {
      if (svgRef.current) {
        console.log('SVG element found:', svgRef.current);
        const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.1, 4])
          .on('zoom', (event) => {
            const g = d3.select(svgRef.current).select('g');
            g.attr('transform', event.transform);
          });
        zoomRef.current = zoomBehavior;
        setIsInitialized(true);
        console.log('Zoom behavior initialized');
        return true;
      }
      return false;
    };

    // Try immediately
    if (!checkSvg()) {
      // If not found, set up a polling interval
      const interval = setInterval(() => {
        if (checkSvg()) {
          clearInterval(interval);
        }
      }, 100);

      // Cleanup interval after 5 seconds
      const timeout = setTimeout(() => {
        clearInterval(interval);
      }, 5000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  // Validate schema and create visualization when everything is ready
  useEffect(() => {
    console.log('Checking visualization readiness...', {
      isInitialized,
      hasSvgRef: !!svgRef.current,
      hasZoom: !!zoomRef.current,
      hasTokens: !!tokens,
      hasValueTypes: !!resolvedValueTypes
    });

    if (!isInitialized || !svgRef.current || !zoomRef.current) {
      console.log('Not ready for visualization yet');
      return;
    }

    try {
      // Check if we have the minimum required data
      if (!tokens || !resolvedValueTypes) {
        console.error('Missing required data:', { 
          hasTokens: !!tokens, 
          hasValueTypes: !!resolvedValueTypes 
        });
        return;
      }

      const validationResult = ValidationService.validateData(schema);
      if (!validationResult.isValid) {
        console.error('Invalid schema:', validationResult.errors);
        return;
      }

      console.log('Creating visualization...');
      // Create visualization
      createVisualization();
    } catch (error) {
      console.error('Error creating visualization:', error);
    }
  }, [isInitialized, schema]);

  // Drag functions
  const dragstarted = (event: D3DragEvent) => {
    if (!event.active && simulationRef.current) {
      simulationRef.current.alphaTarget(0.3).restart();
    }
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  };

  const dragged = (event: D3DragEvent) => {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  };

  const dragended = (event: D3DragEvent) => {
    if (!event.active && simulationRef.current) {
      simulationRef.current.alphaTarget(0);
    }
    event.subject.fx = null;
    event.subject.fy = null;
  };

  const createVisualization = () => {
    if (!svgRef.current || !zoomRef.current) {
      console.error('Missing required refs:', { 
        hasSvgRef: !!svgRef.current, 
        hasZoom: !!zoomRef.current 
      });
      return;
    }

    try {
      // Clear previous visualization
      d3.select(svgRef.current).selectAll('*').remove();

      // Create color scale for value types
      const valueTypeColors: Record<string, string> = {
        'COLOR': '#48BB78', // Green
        'DIMENSION': '#4299E1', // Blue
        'SPACING': '#667EEA', // Indigo
        'FONT_FAMILY': '#9F7AEA', // Purple
        'FONT_WEIGHT': '#ED64A6', // Pink
        'FONT_SIZE': '#F56565', // Red
        'LINE_HEIGHT': '#ED8936', // Orange
        'LETTER_SPACING': '#ECC94B', // Yellow
        'DURATION': '#38B2AC', // Teal
        'CUBIC_BEZIER': '#4FD1C5', // Cyan
        'BLUR': '#4A5568', // Gray
        'SPREAD': '#718096', // Gray
        'RADIUS': '#A0AEC0' // Gray
      };

      // Create nodes from tokens with value type information
      const nodes: TokenNode[] = tokens.map(token => {
        const valueType = resolvedValueTypes.find(t => t.id === token.resolvedValueTypeId);
        return {
          id: token.id,
          name: token.displayName,
          type: token.resolvedValueTypeId,
          valueTypeName: valueType?.displayName || 'Unknown',
          valueTypeCategory: valueType?.type || 'Unknown',
          group: 1,
          value: token.valuesByMode?.[0]?.value
        };
      });

      // Create links for token references
      const links: TokenLink[] = [];
      tokens.forEach(token => {
        // Debug log the token we're processing
        console.log(`Processing token: ${token.displayName} (${token.id})`);
        
        // Check each mode's value for token references
        token.valuesByMode?.forEach(mode => {
          const value = mode.value;
          // Debug log the value we're checking
          console.log(`Checking value for mode:`, mode);
          
          // Check if value is an object with tokenId property
          if (value && typeof value === 'object' && 'tokenId' in value) {
            const targetTokenId = value.tokenId;
            console.log(`Found tokenId reference: ${targetTokenId}`);
            
            const targetToken = tokens.find(t => t.id === targetTokenId);
            if (targetToken) {
              console.log(`Found target token: ${targetToken.displayName} (${targetToken.id})`);
              
              // Only add the link if it doesn't already exist
              const linkExists = links.some(
                link => link.source.id === token.id && link.target.id === targetToken.id
              );
              
              if (!linkExists) {
                // Find the corresponding node objects
                const sourceNode = nodes.find(n => n.id === token.id);
                const targetNode = nodes.find(n => n.id === targetToken.id);
                
                if (sourceNode && targetNode) {
                  links.push({
                    source: sourceNode,
                    target: targetNode,
                    value: 1
                  });
                  console.log(`Created link: ${token.displayName} -> ${targetToken.displayName}`);
                } else {
                  console.log(`Could not find node objects for link: ${token.displayName} -> ${targetToken.displayName}`);
                }
              } else {
                console.log(`Link already exists between ${token.displayName} and ${targetToken.displayName}`);
              }
            } else {
              console.log(`Target token not found for ID: ${targetTokenId}`);
            }
          } else {
            // Debug log when value doesn't contain a tokenId
            console.log(`Value does not contain tokenId:`, value);
          }
        });
      });

      // Debug log all created links
      console.log('All created links:', links.map(link => ({
        source: link.source.name,
        target: link.target.name,
        sourceId: link.source.id,
        targetId: link.target.id
      })));

      console.log('Visualization Data:', {
        nodeCount: nodes.length,
        linkCount: links.length,
        sampleNodes: nodes.slice(0, 2),
        sampleLinks: links.slice(0, 2)
      });

      // Get SVG dimensions
      const width = svgRef.current.clientWidth;
      const height = svgRef.current.clientHeight;
      const padding = 50; // Padding from edges

      // Create SVG elements
      const svg = d3.select(svgRef.current);
      const g = svg.append('g');

      // Apply zoom behavior
      svg.call(zoomRef.current);

      // Create force simulation with adjusted parameters
      const simulation = d3.forceSimulation<TokenNode>()
        .force('link', d3.forceLink<TokenNode, TokenLink>()
          .id(d => d.id)
          .distance(150)
          .strength(0.2))
        .force('charge', d3.forceManyBody()
          .strength(-400)
          .distanceMax(300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide(30))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1))
        // Add custom clustering force
        .force('cluster', alpha => {
          const strength = 0.2; // Adjust this value to control clustering strength
          const nodes = simulation.nodes();
          
          // Group nodes by value type
          const groups = new Map<string, TokenNode[]>();
          nodes.forEach(node => {
            const type = node.valueTypeCategory;
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
            const centroid = centroids.get(node.valueTypeCategory);
            if (centroid) {
              const dx = centroid.x - (node.x ?? 0);
              const dy = centroid.y - (node.y ?? 0);
              node.x = (node.x ?? 0) + dx * strength * alpha;
              node.y = (node.y ?? 0) + dy * strength * alpha;
            }
          });
        });

      // Store simulation reference
      simulationRef.current = simulation;

      // Create links
      const link = g.append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#4A5568')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.8);

      // Create nodes
      const node = g.append('g')
        .attr('class', 'nodes')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', 8)
        .attr('fill', d => valueTypeColors[d.valueTypeCategory] || '#A0AEC0')
        .attr('stroke', d => {
          const color = valueTypeColors[d.valueTypeCategory] || '#A0AEC0';
          return d3.color(color)?.darker(0.5).toString() || color;
        })
        .attr('stroke-width', 2)
        .call(d3.drag<SVGCircleElement, TokenNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      // Add labels
      const label = g.append('g')
        .attr('class', 'labels')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .text(d => d.name)
        .attr('font-size', 12)
        .attr('dx', 12)
        .attr('dy', 4)
        .attr('fill', '#2D3748')
        .attr('pointer-events', 'none');

      // Add links to simulation
      simulation.force<d3.ForceLink<TokenNode, TokenLink>>('link')?.links(links);

      // Update positions on simulation tick
      simulation.nodes(nodes).on('tick', () => {
        // Keep nodes within bounds
        nodes.forEach(node => {
          node.x = Math.max(padding, Math.min(width - padding, node.x ?? 0));
          node.y = Math.max(padding, Math.min(height - padding, node.y ?? 0));
        });

        // Update link positions
        link
          .attr('x1', d => d.source.x ?? 0)
          .attr('y1', d => d.source.y ?? 0)
          .attr('x2', d => d.target.x ?? 0)
          .attr('y2', d => d.target.y ?? 0);

        // Update node positions
        node
          .attr('cx', d => d.x ?? 0)
          .attr('cy', d => d.y ?? 0);

        // Update label positions
        label
          .attr('x', d => d.x ?? 0)
          .attr('y', d => d.y ?? 0);
      });

      // Initial zoom to fit all nodes
      const initialScale = 0.8;
      const initialTransform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(initialScale)
        .translate(-width / 2, -height / 2);
      
      svg.transition()
        .duration(750)
        .call(zoomRef.current.transform, initialTransform);

      // Log successful visualization creation
      console.log('Visualization created successfully');
    } catch (error) {
      console.error('Error in createVisualization:', error);
    }
  };

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      zoomRef.current.scaleBy(d3.select(svgRef.current), 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      zoomRef.current.scaleBy(d3.select(svgRef.current), 0.7);
    }
  };

  const handleReset = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  return (
    <Box>
      <HStack gap={2} mb={4}>
        <Button size="sm" onClick={handleZoomIn}>Zoom In</Button>
        <Button size="sm" onClick={handleZoomOut}>Zoom Out</Button>
        <Button size="sm" onClick={handleReset}>Reset</Button>
      </HStack>
      <Box
        borderWidth={1}
        borderRadius="md"
        overflow="hidden"
        bg="white"
      >
        <svg
          ref={svgRef}
          width="100%"
          height="600"
          style={{ background: '#F7FAFC' }}
        />
      </Box>
    </Box>
  );
};