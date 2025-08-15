/**
 * Shared visualization component types
 * Common interfaces used across multiple visualization components
 */

export interface VisualizationToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onExport?: (format: 'png' | 'svg' | 'json') => void;
  onLayoutChange?: (layout: string) => void;
  availableLayouts?: string[];
  currentLayout?: string;
  showExport?: boolean;
  showLayoutSelector?: boolean;
}

export interface VisualizationLegendProps {
  items: LegendItem[];
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  orientation?: 'horizontal' | 'vertical';
}

export interface LegendItem {
  id: string;
  label: string;
  color: string;
  shape?: 'circle' | 'square' | 'line';
  count?: number;
  visible?: boolean;
  onClick?: (id: string) => void;
}

export interface VisualizationContainerProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  legend?: React.ReactNode;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  height?: number | string;
  width?: number | string;
}
