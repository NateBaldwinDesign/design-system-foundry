/**
 * Chord diagram specific data types
 * For analyzing token values across different mode combinations and platform overrides
 */

export interface ChordNode {
  id: string;
  name: string;
  type: 'mode' | 'platform' | 'token-value-group';
  modeId?: string;
  platformId?: string;
  tokenIds: string[];
  valueCount: number;
  color: string;
  conflicts: number; // Number of conflicting values with other nodes
}

export interface ChordLink {
  source: ChordNode;
  target: ChordNode;
  value: number; // Strength of relationship/flow
  conflictType: 'value-change' | 'platform-override' | 'mode-coupling' | 'value-conflict';
  tokenIds: string[]; // Tokens involved in this relationship
  examples: ChordLinkExample[];
}

export interface ChordLinkExample {
  tokenId: string;
  tokenName: string;
  sourceValue: any;
  targetValue: any;
  changeType: 'override' | 'transformation' | 'conflict';
}

export interface ChordDiagramData {
  nodes: ChordNode[];
  links: ChordLink[];
  matrix: number[][]; // Adjacency matrix for D3 chord layout
  modeAnalysis: ModeAnalysis;
  platformAnalysis: PlatformAnalysis;
  statistics: ChordStatistics;
}

export interface ModeAnalysis {
  totalModes: number;
  modeCouplings: ModeCoupling[];
  conflictMatrix: ModeConflictMatrix;
  mostVolatileTokens: VolatileToken[];
}

export interface ModeCoupling {
  modeIds: string[];
  modeNames: string[];
  couplingStrength: number; // 0-1, how often tokens change together
  sharedTokenIds: string[];
  couplingType: 'always-together' | 'inverse' | 'conditional';
}

export interface ModeConflictMatrix {
  modeIds: string[];
  conflicts: number[][]; // Matrix of conflict counts between modes
}

export interface VolatileToken {
  tokenId: string;
  tokenName: string;
  changeFrequency: number; // Percentage of mode combinations where value changes
  uniqueValues: number;
  mostCommonValue: any;
  platformOverrides: number;
}

export interface PlatformAnalysis {
  totalPlatforms: number;
  platformDeviations: PlatformDeviation[];
  overridePatterns: OverridePattern[];
  complexityScore: number; // Overall complexity metric
}

export interface PlatformDeviation {
  platformId: string;
  platformName: string;
  deviationScore: number; // How much this platform deviates from core
  affectedTokenIds: string[];
  uniqueOverrides: number;
  inheritedValues: number;
}

export interface OverridePattern {
  pattern: string;
  tokenIds: string[];
  frequency: number;
  complexity: 'low' | 'medium' | 'high';
  description: string;
}

export interface ChordStatistics {
  totalTokens: number;
  totalModes: number;
  totalPlatforms: number;
  totalConflicts: number;
  avgConflictsPerToken: number;
  maxConflictsPerToken: number;
  modeCouplingScore: number; // 0-1, overall coupling strength
  platformComplexityScore: number; // 0-1, platform override complexity
  recommendations: ChordRecommendation[];
}

export interface ChordRecommendation {
  type: 'mode-simplification' | 'platform-consolidation' | 'conflict-resolution' | 'coupling-reduction';
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  affectedItems: string[];
  estimatedImpact: 'low' | 'medium' | 'high';
  suggestedAction: string;
}

// Props interface for ChordDiagram component
export interface ChordDiagramProps {
  data: ChordDiagramData;
  onNodeClick?: (node: ChordNode) => void;
  onLinkClick?: (link: ChordLink) => void;
  onNodeHover?: (node: ChordNode | null) => void;
  highlightType?: 'mode-coupling' | 'platform-deviation' | 'conflicts' | null;
  showLabels?: boolean;
  showStatistics?: boolean;
  width?: number;
  height?: number;
  interactive?: boolean;
  filterOptions?: ChordFilterOptions;
}

export interface ChordFilterOptions {
  minConflictThreshold?: number;
  maxConflictThreshold?: number;
  showOnlyConflicts?: boolean;
  selectedModes?: string[];
  selectedPlatforms?: string[];
  conflictTypes?: Array<'value-change' | 'platform-override' | 'mode-coupling' | 'value-conflict'>;
}
