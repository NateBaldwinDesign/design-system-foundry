/**
 * Visualization Toolbar Component
 * Reusable toolbar with common visualization controls
 * Uses Chakra UI components for consistency
 */

import React from 'react';
import {
  HStack,
  Button,
  Select,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton
} from '@chakra-ui/react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download,
  Layout
} from 'lucide-react';
import type { VisualizationToolbarProps } from './types';

export const VisualizationToolbar: React.FC<VisualizationToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onExport,
  onLayoutChange,
  availableLayouts = [],
  currentLayout,
  showExport = true,
  showLayoutSelector = true
}) => {
  return (
    <HStack spacing={2} mb={4}>
      {/* Zoom Controls */}
      <Tooltip label="Zoom In">
        <IconButton
          aria-label="Zoom In"
          icon={<ZoomIn size={16} />}
          size="sm"
          onClick={onZoomIn}
        />
      </Tooltip>

      <Tooltip label="Zoom Out">
        <IconButton
          aria-label="Zoom Out"
          icon={<ZoomOut size={16} />}
          size="sm"
          onClick={onZoomOut}
        />
      </Tooltip>

      <Tooltip label="Reset View">
        <IconButton
          aria-label="Reset View"
          icon={<RotateCcw size={16} />}
          size="sm"
          onClick={onReset}
        />
      </Tooltip>

      {/* Layout Selector */}
      {showLayoutSelector && availableLayouts.length > 0 && (
        <HStack spacing={2} ml={4}>
          <Layout size={16} />
          <Select
            size="sm"
            value={currentLayout}
            onChange={(e) => onLayoutChange?.(e.target.value)}
            width="120px"
          >
            {availableLayouts.map((layout) => (
              <option key={layout} value={layout}>
                {layout.charAt(0).toUpperCase() + layout.slice(1)}
              </option>
            ))}
          </Select>
        </HStack>
      )}

      {/* Export Controls */}
      {showExport && onExport && (
        <Menu>
          <Tooltip label="Export Visualization">
            <MenuButton
              as={IconButton}
              aria-label="Export"
              icon={<Download size={16} />}
              size="sm"
              ml={4}
            />
          </Tooltip>
          <MenuList>
            <MenuItem onClick={() => onExport('png')}>
              Export as PNG
            </MenuItem>
            <MenuItem onClick={() => onExport('svg')}>
              Export as SVG
            </MenuItem>
            <MenuItem onClick={() => onExport('json')}>
              Export Data (JSON)
            </MenuItem>
          </MenuList>
        </Menu>
      )}
    </HStack>
  );
};
