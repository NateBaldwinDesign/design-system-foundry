/**
 * Circle Pack Component Stories
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CirclePack } from './CirclePack';
import type { CirclePackData } from '../../../services/visualizations/types/circle-pack-data';

const meta: Meta<typeof CirclePack> = {
  title: 'Visualizations/CirclePack',
  component: CirclePack,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Mock data for testing
const mockData: CirclePackData = {
  name: 'Design System',
  children: [
    {
      name: 'Core Data',
      type: 'core',
      value: 3,
      hasChildren: true,
      dataSource: 'core',
      children: [
        {
          name: 'Tokens',
          type: 'entity',
          entityType: 'tokens',
          value: 25,
          hasChildren: true,
          dataSource: 'core'
        },
        {
          name: 'Collections',
          type: 'entity',
          entityType: 'collections',
          value: 8,
          hasChildren: true,
          dataSource: 'core'
        },
        {
          name: 'Dimensions',
          type: 'entity',
          entityType: 'dimensions',
          value: 3,
          hasChildren: true,
          dataSource: 'core'
        }
      ]
    },
    {
      name: 'Platforms',
      type: 'platform',
      value: 2,
      hasChildren: true,
      dataSource: 'platform',
      children: [
        {
          name: 'Web',
          type: 'platform',
          platformId: 'web',
          value: 1,
          hasChildren: true,
          dataSource: 'platform'
        },
        {
          name: 'iOS',
          type: 'platform',
          platformId: 'ios',
          value: 1,
          hasChildren: true,
          dataSource: 'platform'
        }
      ]
    },
    {
      name: 'Themes',
      type: 'theme',
      value: 2,
      hasChildren: true,
      dataSource: 'theme',
      children: [
        {
          name: 'Light',
          type: 'theme',
          themeId: 'light',
          value: 1,
          hasChildren: true,
          dataSource: 'theme'
        },
        {
          name: 'Dark',
          type: 'theme',
          themeId: 'dark',
          value: 1,
          hasChildren: true,
          dataSource: 'theme'
        }
      ]
    }
  ],
  type: 'system',
  hasChildren: true
};

export const Default: Story = {
  args: {
    data: mockData,
    sizeEncoding: 'proportional',
    width: 800,
    height: 600,
    showLabels: true,
    showBreadcrumbs: true,
    interactive: true
  }
};

export const UniformSizing: Story = {
  args: {
    data: mockData,
    sizeEncoding: 'uniform',
    width: 800,
    height: 600,
    showLabels: true,
    showBreadcrumbs: true,
    interactive: true
  }
};

export const NoLabels: Story = {
  args: {
    data: mockData,
    sizeEncoding: 'proportional',
    width: 800,
    height: 600,
    showLabels: false,
    showBreadcrumbs: false,
    interactive: true
  }
};

export const SmallSize: Story = {
  args: {
    data: mockData,
    sizeEncoding: 'proportional',
    width: 400,
    height: 300,
    showLabels: true,
    showBreadcrumbs: true,
    interactive: true
  }
};

export const EmptyData: Story = {
  args: {
    data: {
      name: 'Empty System',
      children: [],
      type: 'system',
      hasChildren: false
    },
    sizeEncoding: 'proportional',
    width: 800,
    height: 600,
    showLabels: true,
    showBreadcrumbs: true,
    interactive: true
  }
};
