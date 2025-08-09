/**
 * Analysis result types for token dependency analysis
 * Compliant with schema.json and project rules
 */

export interface TokenDependencyAnalysisResult {
  tokenId: string;
  tokenName: string;
  dependencies: TokenDependency[];
  dependents: TokenDependent[];
  dependencyDepth: number;
  usageCount: number;
  hasCircularDependency: boolean;
  circularDependencyPaths?: string[][];
  blastRadius: BlastRadiusAnalysis;
}

export interface TokenDependency {
  tokenId: string;
  tokenName: string;
  dependencyType: 'direct' | 'indirect';
  path: string[]; // Chain of token IDs from source to target
  resolvedValueTypeId: string;
  platformSpecific?: boolean;
  themeSpecific?: boolean;
}

export interface TokenDependent {
  tokenId: string;
  tokenName: string;
  dependencyType: 'direct' | 'indirect';
  path: string[]; // Chain of token IDs from dependent back to source
  resolvedValueTypeId: string;
  platformSpecific?: boolean;
  themeSpecific?: boolean;
}

export interface BlastRadiusAnalysis {
  directlyAffected: string[]; // Token IDs that directly reference this token
  indirectlyAffected: string[]; // Token IDs that would be affected through dependency chain
  totalAffected: number;
  maxDepth: number; // Deepest level of impact
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
  affectedPlatforms: string[];
  affectedThemes: string[];
  affectedCollections: string[];
}

export interface CircularDependencyAnalysisResult {
  id: string;
  tokenIds: string[];
  dependencyChain: string[]; // Ordered chain showing the circular path
  severity: 'warning' | 'error';
  description: string;
  affectedPlatforms: string[];
  affectedThemes: string[];
  suggestedResolution?: string;
}

export interface DependencyDepthAnalysisResult {
  tokenId: string;
  tokenName: string;
  depth: number;
  dependencyChain: string[]; // From root to this token
  isLeaf: boolean; // Has no dependencies
  isRoot: boolean; // Not referenced by any other tokens
}

export interface GlobalDependencyAnalysis {
  totalTokens: number;
  totalDependencies: number;
  circularDependencies: CircularDependencyAnalysisResult[];
  maxDependencyDepth: number;
  averageDependencyDepth: number;
  isolatedTokens: string[]; // Tokens with no dependencies or dependents
  rootTokens: string[]; // Tokens not referenced by others
  leafTokens: string[]; // Tokens that don't reference others
  mostReferencedTokens: Array<{
    tokenId: string;
    tokenName: string;
    referenceCount: number;
  }>;
  deepestDependencyChains: Array<{
    chain: string[];
    depth: number;
  }>;
  complexityMetrics: {
    averageReferences: number;
    maxReferences: number;
    dependencyDistribution: Record<number, number>; // depth -> count
  };
  recommendations: AnalysisRecommendation[];
}

export interface AnalysisRecommendation {
  type: 'circular_dependency' | 'deep_nesting' | 'unused_token' | 'high_coupling' | 'architectural_debt';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  affectedTokens: string[];
  suggestedAction: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}

// Validation result for dependency analysis
export interface DependencyValidationResult {
  isValid: boolean;
  errors: DependencyValidationError[];
  warnings: DependencyValidationWarning[];
  circularDependencies: CircularDependencyAnalysisResult[];
  unresolvedReferences: UnresolvedReference[];
}

export interface DependencyValidationError {
  tokenId: string;
  tokenName: string;
  errorType: 'missing_reference' | 'invalid_reference' | 'circular_dependency' | 'type_mismatch';
  message: string;
  referencedTokenId?: string;
  path?: string[];
}

export interface DependencyValidationWarning {
  tokenId: string;
  tokenName: string;
  warningType: 'deep_nesting' | 'unused_token' | 'potential_circular' | 'performance_concern';
  message: string;
  details?: Record<string, unknown>;
}

export interface UnresolvedReference {
  tokenId: string;
  tokenName: string;
  referencedTokenId: string;
  modeId?: string;
  context: string;
}
