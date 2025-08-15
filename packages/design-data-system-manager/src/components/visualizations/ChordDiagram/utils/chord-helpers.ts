/**
 * Chord Diagram D3 Helper Functions
 * Utilities for creating chord diagrams showing mode and platform relationships
 */

import * as d3 from 'd3';
import type { ChordNode, ChordLink, ChordDiagramData } from '../../../../services/visualizations/types/chord-data';

/**
 * Create and configure a chord layout for the diagram
 */
export function createChordLayout(data: ChordDiagramData): d3.Chords {
  const chord = d3.chord()
    .padAngle(0.05)
    .sortSubgroups(d3.descending)
    .sortChords(d3.descending);

  return chord(data.matrix);
}

/**
 * Create arc generator for the outer ring
 */
export function createArcGenerator(innerRadius: number, outerRadius: number): d3.Arc<any, d3.ChordGroup> {
  return d3.arc<d3.ChordGroup>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);
}

/**
 * Create ribbon generator for the connections
 */
export function createRibbonGenerator(innerRadius: number): d3.RibbonGenerator {
  return d3.ribbon()
    .radius(innerRadius);
}

/**
 * Calculate optimal radius based on container size
 */
export function calculateRadius(width: number, height: number, padding: number = 40): {
  outerRadius: number;
  innerRadius: number;
} {
  const outerRadius = Math.min(width, height) * 0.4 - padding;
  const innerRadius = outerRadius - 30;
  
  return { outerRadius, innerRadius };
}

/**
 * Get color for node based on type and index
 */
export function getNodeColor(node: ChordNode, index: number): string {
  if (node.color) {
    return node.color;
  }

  // Fallback color schemes by type
  const colorSchemes = {
    mode: ['#3182CE', '#38A169', '#D69E2E', '#E53E3E', '#9F7AEA', '#00B5D8'],
    platform: ['#2B6CB0', '#2F855A', '#B7791F', '#C53030', '#805AD5', '#0987A0'],
    'token-value-group': ['#4A5568', '#718096', '#A0AEC0', '#CBD5E0']
  };

  const colors = colorSchemes[node.type] || colorSchemes['token-value-group'];
  return colors[index % colors.length];
}

/**
 * Get ribbon color based on relationship type
 */
export function getRibbonColor(link: ChordLink, opacity: number = 0.7): string {
  const baseColors = {
    'value-change': '#4299E1',
    'platform-override': '#ED8936',
    'mode-coupling': '#9F7AEA',
    'value-conflict': '#F56565'
  };

  const baseColor = baseColors[link.conflictType] || '#A0AEC0';
  const color = d3.color(baseColor);
  if (color) {
    color.opacity = opacity;
    return color.toString();
  }
  return baseColor;
}

/**
 * Calculate text anchor for labels based on angle
 */
export function getTextAnchor(angle: number): string {
  return angle > Math.PI ? 'end' : 'start';
}

/**
 * Calculate text rotation for labels
 */
export function getTextRotation(angle: number): number {
  return angle > Math.PI ? (angle - Math.PI) * 180 / Math.PI : angle * 180 / Math.PI;
}

/**
 * Format label text based on node type
 */
export function formatNodeLabel(node: ChordNode): string {
  const typePrefix = {
    mode: 'Mode: ',
    platform: 'Platform: ',
    'token-value-group': 'Group: '
  };

  return `${typePrefix[node.type] || ''}${node.name}`;
}

/**
 * Calculate label position outside the arc
 */
export function calculateLabelPosition(
  group: d3.ChordGroup, 
  outerRadius: number, 
  labelOffset: number = 10
): { x: number; y: number; angle: number } {
  const angle = (group.startAngle + group.endAngle) / 2;
  const radius = outerRadius + labelOffset;
  
  return {
    x: Math.cos(angle - Math.PI / 2) * radius,
    y: Math.sin(angle - Math.PI / 2) * radius,
    angle
  };
}

/**
 * Create tooltip content for nodes
 */
export function createNodeTooltip(node: ChordNode, group: d3.ChordGroup): string {
  const typeLabels = {
    mode: 'Mode',
    platform: 'Platform',
    'token-value-group': 'Token Group'
  };

  return `
    <div style="padding: 8px; background: white; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; max-width: 200px;">
      <strong>${node.name}</strong><br/>
      Type: ${typeLabels[node.type]}<br/>
      Tokens: ${node.tokenIds.length}<br/>
      Value Count: ${node.valueCount}<br/>
      Conflicts: ${node.conflicts}<br/>
      Arc Value: ${group.value.toFixed(1)}
    </div>
  `;
}

/**
 * Create tooltip content for ribbons
 */
export function createRibbonTooltip(link: ChordLink, chord: d3.Chord): string {
  const typeLabels = {
    'value-change': 'Value Change',
    'platform-override': 'Platform Override',
    'mode-coupling': 'Mode Coupling',
    'value-conflict': 'Value Conflict'
  };

  return `
    <div style="padding: 8px; background: white; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; max-width: 250px;">
      <strong>Relationship</strong><br/>
      Type: ${typeLabels[link.conflictType]}<br/>
      From: ${link.source.name}<br/>
      To: ${link.target.name}<br/>
      Strength: ${link.value.toFixed(1)}<br/>
      Affected Tokens: ${link.tokenIds.length}<br/>
      ${link.examples.length > 0 ? `<br/>Example: ${link.examples[0].tokenName}` : ''}
    </div>
  `;
}

/**
 * Highlight related arcs and ribbons
 */
export function highlightRelated(
  selectedIndex: number,
  arcSelection: d3.Selection<SVGPathElement, d3.ChordGroup, any, any>,
  ribbonSelection: d3.Selection<SVGPathElement, d3.Chord, any, any>,
  highlightColor: string = '#F59E0B',
  fadeOpacity: number = 0.1
): void {
  // Fade all elements first
  arcSelection.style('opacity', fadeOpacity);
  ribbonSelection.style('opacity', fadeOpacity);

  // Highlight the selected arc
  arcSelection
    .filter((d, i) => i === selectedIndex)
    .style('opacity', 1)
    .style('stroke', highlightColor)
    .style('stroke-width', 2);

  // Highlight related ribbons
  ribbonSelection
    .filter(d => d.source.index === selectedIndex || d.target.index === selectedIndex)
    .style('opacity', 0.8)
    .style('stroke', highlightColor)
    .style('stroke-width', 1);
}

/**
 * Clear all highlights
 */
export function clearHighlights(
  arcSelection: d3.Selection<SVGPathElement, d3.ChordGroup, any, any>,
  ribbonSelection: d3.Selection<SVGPathElement, d3.Chord, any, any>
): void {
  arcSelection
    .style('opacity', 1)
    .style('stroke', null)
    .style('stroke-width', null);

  ribbonSelection
    .style('opacity', 0.7)
    .style('stroke', null)
    .style('stroke-width', null);
}

/**
 * Filter chords based on minimum value threshold
 */
export function filterChordsByValue(chords: d3.Chord[], minValue: number): d3.Chord[] {
  return chords.filter(chord => chord.source.value >= minValue || chord.target.value >= minValue);
}

/**
 * Sort groups by value (descending)
 */
export function sortGroupsByValue(groups: d3.ChordGroup[]): d3.ChordGroup[] {
  return groups.sort((a, b) => b.value - a.value);
}

/**
 * Calculate statistics for the chord diagram
 */
export function calculateChordStatistics(chords: d3.Chord[]): {
  totalConnections: number;
  avgConnectionStrength: number;
  maxConnectionStrength: number;
  strongConnections: number;
} {
  if (chords.length === 0) {
    return {
      totalConnections: 0,
      avgConnectionStrength: 0,
      maxConnectionStrength: 0,
      strongConnections: 0
    };
  }

  const values = chords.map(c => c.source.value);
  const totalConnections = chords.length;
  const avgConnectionStrength = values.reduce((sum, val) => sum + val, 0) / totalConnections;
  const maxConnectionStrength = Math.max(...values);
  const strongConnections = values.filter(val => val > avgConnectionStrength * 1.5).length;

  return {
    totalConnections,
    avgConnectionStrength,
    maxConnectionStrength,
    strongConnections
  };
}

/**
 * Animate chord diagram entrance
 */
export function animateEntrance(
  arcSelection: d3.Selection<SVGPathElement, d3.ChordGroup, any, any>,
  ribbonSelection: d3.Selection<SVGPathElement, d3.Chord, any, any>,
  duration: number = 1000
): void {
  // Animate arcs
  arcSelection
    .style('opacity', 0)
    .transition()
    .duration(duration)
    .delay((d, i) => i * 50)
    .style('opacity', 1);

  // Animate ribbons with slight delay
  ribbonSelection
    .style('opacity', 0)
    .transition()
    .duration(duration)
    .delay((d, i) => 500 + i * 20)
    .style('opacity', 0.7);
}
