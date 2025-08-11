/**
 * Common visualization data types following the data visualization plan
 * Adheres to @project-rules.mdc and schema.json compliance
 */

export type VisualizationType = 'network' | 'chord' | 'hierarchical' | 'sankey' | 'heatmap' | 'timeline' | 'scatter';

export interface TransformOptions {
  filters?: FilterOptions;
  layout?: LayoutOptions;
  metadata?: Record<string, unknown>;
}

export interface FilterOptions {
  tokenTypes?: string[];
  collections?: string[];
  platforms?: string[];
  themes?: string[];
  resolvedValueTypes?: string[];
  includeAliases?: boolean;
  minDependencyDepth?: number;
  maxDependencyDepth?: number;
}

export interface LayoutOptions {
  type?: 'force' | 'hierarchical' | 'circular' | 'grid';
  spacing?: number;
  clustering?: boolean;
  animationDuration?: number;
}

export interface VisualizationMetadata {
  title?: string;
  description?: string;
  generatedAt: string;
  dataSource: 'merged' | 'platform' | 'theme' | 'core';
  schemaVersion: string;
  tokenCount: number;
  dependencyCount: number;
}

export interface DataTransformer<TInput = unknown, TOutput = unknown> {
  transformData(input: TInput, options?: TransformOptions): Promise<TOutput>;
  validateInput(input: TInput): boolean;
}

// Base visualization result interface
export interface VisualizationResult<TData = unknown> {
  data: TData;
  metadata: VisualizationMetadata;
  errors?: string[];
  warnings?: string[];
}

// Legend item interface for visualizations
export interface LegendItem {
  id: string;
  label: string;
  color: string;
  shape?: 'circle' | 'square' | 'line';
  count?: number;
  visible?: boolean;
  onClick?: (id: string) => void;
}
