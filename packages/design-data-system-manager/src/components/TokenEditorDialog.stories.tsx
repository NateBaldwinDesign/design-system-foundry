import { Meta, StoryObj } from '@storybook/react';
import { TokenEditorDialog, ExtendedToken } from './TokenEditorDialog';
import type { Token, Dimension, Platform, TokenStatus, StandardValueType } from '@token-model/data-model';

const meta: Meta<typeof TokenEditorDialog> = {
  title: 'Components/TokenEditorDialog',
  component: TokenEditorDialog,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof TokenEditorDialog>;

// Sample data
const sampleDimensions: Dimension[] = [
  {
    id: 'theme',
    displayName: 'Theme',
    required: true,
    modes: [
      { id: 'light', name: 'Light', dimensionId: 'theme' },
      { id: 'dark', name: 'Dark', dimensionId: 'theme' }
    ],
    defaultMode: 'light'
  },
  {
    id: 'scale',
    displayName: 'Scale',
    required: false,
    modes: [
      { id: 'mobile', name: 'Mobile', dimensionId: 'scale' },
      { id: 'desktop', name: 'Desktop', dimensionId: 'scale' }
    ],
    defaultMode: 'mobile'
  }
];

const samplePlatforms: Platform[] = [
  { id: 'web', displayName: 'Web' },
  { id: 'ios', displayName: 'iOS' },
  { id: 'android', displayName: 'Android' }
];

const sampleTaxonomies = [
  {
    id: 'color-usage',
    name: 'Color Usage',
    description: 'How this color is used in the system',
    terms: [
      { id: 'background', name: 'Background', description: 'Used for background surfaces' },
      { id: 'text', name: 'Text', description: 'Used for text content' }
    ],
    resolvedValueTypeIds: ['color']
  },
  {
    id: 'spacing-usage',
    name: 'Spacing Usage',
    description: 'How this spacing is used in the system',
    terms: [
      { id: 'padding', name: 'Padding', description: 'Used for padding' },
      { id: 'margin', name: 'Margin', description: 'Used for margins' }
    ],
    resolvedValueTypeIds: ['spacing']
  }
];

const sampleResolvedValueTypes = [
  {
    id: 'color',
    displayName: 'Color',
    type: 'COLOR' as StandardValueType,
    description: 'A color value'
  },
  {
    id: 'spacing',
    displayName: 'Spacing',
    type: 'SPACING' as StandardValueType,
    description: 'A spacing value'
  }
];

// Sample token for stories
const sampleToken: ExtendedToken = {
  id: 'sample-token',
  displayName: 'Sample Token',
  description: 'A sample token for testing',
  resolvedValueTypeId: 'color',
  valuesByMode: [
    {
      modeIds: ['light'],
      value: { value: '#000000' }
    },
    {
      modeIds: ['dark'],
      value: { value: '#ffffff' }
    }
  ],
  taxonomies: [
    { taxonomyId: 'color', termId: 'primary' }
  ],
  status: 'stable',
  private: false,
  themeable: true,
  tokenCollectionId: 'colors',
  propertyTypes: [],
  codeSyntax: [],
  tokenTier: 'PRIMITIVE',
  generatedByAlgorithm: false
};

// Base story with common props
const baseProps = {
  dimensions: sampleDimensions,
  platforms: samplePlatforms,
  taxonomies: sampleTaxonomies,
  resolvedValueTypes: sampleResolvedValueTypes,
  open: true,
  onClose: () => console.log('Dialog closed'),
  onSave: (token: Token) => console.log('Token saved:', token),
  onViewClassifications: () => console.log('View classifications clicked')
};

// Create new token story
export const CreateNew: Story = {
  args: {
    ...baseProps,
    isNew: true,
    token: {
      id: '',
      displayName: '',
      description: '',
      resolvedValueTypeId: 'color',
      valuesByMode: [],
      taxonomies: [],
      status: '' as TokenStatus,
      private: false,
      themeable: false,
      tokenCollectionId: 'default',
      propertyTypes: [],
      codeSyntax: [],
      tokenTier: 'PRIMITIVE',
      generatedByAlgorithm: false
    },
    tokens: []
  }
};

// Edit existing token story
export const EditExisting: Story = {
  args: {
    ...baseProps,
    isNew: false,
    token: sampleToken,
    tokens: [sampleToken]
  }
};

// Token with multiple dimensions story
export const MultipleDimensions: Story = {
  args: {
    ...baseProps,
    isNew: false,
    token: {
      ...sampleToken,
      valuesByMode: [
        {
          modeIds: ['light', 'mobile'],
          value: { value: '#FFFFFF' }
        },
        {
          modeIds: ['light', 'desktop'],
          value: { value: '#F5F5F5' }
        },
        {
          modeIds: ['dark', 'mobile'],
          value: { value: '#000000' }
        },
        {
          modeIds: ['dark', 'desktop'],
          value: { value: '#121212' }
        }
      ]
    },
    tokens: [sampleToken]
  }
};

// Token with platform overrides story
export const WithPlatformOverrides: Story = {
  args: {
    ...baseProps,
    isNew: false,
    token: {
      ...sampleToken,
      valuesByMode: [
        {
          modeIds: ['light'],
          value: { value: '#FFFFFF' },
          platformOverrides: [
            { platformId: 'ios', value: '#F8F8F8' },
            { platformId: 'android', value: '#FAFAFA' }
          ]
        },
        {
          modeIds: ['dark'],
          value: { value: '#000000' },
          platformOverrides: [
            { platformId: 'ios', value: '#121212' },
            { platformId: 'android', value: '#1A1A1A' }
          ]
        }
      ]
    },
    tokens: [sampleToken]
  }
};

// Token with invalid taxonomies story
export const WithInvalidTaxonomies: Story = {
  args: {
    ...baseProps,
    isNew: false,
    token: {
      ...sampleToken,
      resolvedValueTypeId: 'spacing',
      taxonomies: [
        { taxonomyId: 'color-usage', termId: 'background' } // This will be invalid for spacing type
      ]
    },
    tokens: [sampleToken]
  }
}; 