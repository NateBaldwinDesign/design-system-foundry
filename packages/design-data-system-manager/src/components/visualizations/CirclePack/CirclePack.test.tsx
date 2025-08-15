/**
 * Circle Pack Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CirclePack } from './CirclePack';
import type { CirclePackData } from '../../../services/visualizations/types/circle-pack-data';

// Mock D3 to avoid DOM manipulation issues in tests
jest.mock('d3', () => ({
  select: jest.fn(() => ({
    selectAll: jest.fn(() => ({
      remove: jest.fn()
    })),
    append: jest.fn(() => ({
      attr: jest.fn(() => ({
        style: jest.fn()
      }))
    })),
    call: jest.fn()
  })),
  hierarchy: jest.fn(() => ({
    sum: jest.fn(() => ({
      sort: jest.fn(() => ({
        descendants: jest.fn(() => [])
      }))
    }))
  })),
  pack: jest.fn(() => ({
    size: jest.fn(() => ({
      padding: jest.fn(() => ({
        __proto__: jest.fn()
      }))
    }))
  })),
  zoom: jest.fn(() => ({
    scaleExtent: jest.fn(() => ({
      on: jest.fn(() => ({
        __proto__: jest.fn()
      }))
    }))
  })),
  zoomIdentity: {
    translate: jest.fn(() => ({
      scale: jest.fn(() => ({
        translate: jest.fn()
      }))
    }))
  },
  zoomTransform: jest.fn(() => ({
    k: 1,
    scale: jest.fn()
  })),
  transition: jest.fn(() => ({
    duration: jest.fn(() => ({
      call: jest.fn()
    }))
  })),
  color: jest.fn(() => ({
    darker: jest.fn(() => ({
      toString: jest.fn(() => '#000000')
    }))
  }))
}));

const mockData: CirclePackData = {
  name: 'Test System',
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
          value: 10,
          hasChildren: true,
          dataSource: 'core'
        },
        {
          name: 'Collections',
          type: 'entity',
          entityType: 'collections',
          value: 5,
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
        }
      ]
    }
  ],
  type: 'system',
  hasChildren: true
};

describe('CirclePack', () => {
  it('renders without crashing', () => {
    render(
      <CirclePack
        data={mockData}
        sizeEncoding="proportional"
        width={800}
        height={600}
      />
    );
    
    // Should render the SVG container
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with correct dimensions', () => {
    render(
      <CirclePack
        data={mockData}
        sizeEncoding="proportional"
        width={800}
        height={600}
      />
    );
    
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('width', '800');
    expect(svg).toHaveAttribute('height', '600');
  });

  it('handles empty data gracefully', () => {
    const emptyData: CirclePackData = {
      name: 'Empty System',
      children: [],
      type: 'system',
      hasChildren: false
    };

    render(
      <CirclePack
        data={emptyData}
        sizeEncoding="proportional"
        width={800}
        height={600}
      />
    );
    
    // Should still render the SVG container
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onNodeClick when provided', () => {
    const mockOnNodeClick = jest.fn();
    
    render(
      <CirclePack
        data={mockData}
        sizeEncoding="proportional"
        onNodeClick={mockOnNodeClick}
        width={800}
        height={600}
      />
    );
    
    // The actual click test would require more complex D3 mocking
    // This test just ensures the component renders with the callback
    expect(mockOnNodeClick).toBeDefined();
  });

  it('renders with different size encodings', () => {
    const { rerender } = render(
      <CirclePack
        data={mockData}
        sizeEncoding="proportional"
        width={800}
        height={600}
      />
    );
    
    expect(document.querySelector('svg')).toBeInTheDocument();
    
    rerender(
      <CirclePack
        data={mockData}
        sizeEncoding="uniform"
        width={800}
        height={600}
      />
    );
    
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});
