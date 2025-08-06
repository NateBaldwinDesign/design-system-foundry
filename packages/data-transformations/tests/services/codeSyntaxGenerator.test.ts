import { CodeSyntaxGenerator } from '../../src/services/codeSyntaxGenerator';
import type { Token, Platform, Taxonomy, PlatformExtension } from '@token-model/data-model';

describe('CodeSyntaxGenerator', () => {
  let generator: CodeSyntaxGenerator;
  let mockTokens: Token[];
  let mockPlatforms: Platform[];
  let mockTaxonomies: Taxonomy[];
  let mockPlatformExtensions: Map<string, PlatformExtension>;

  beforeEach(() => {
    // Setup mock data
    mockTokens = [
      {
        id: 'token-1',
        displayName: 'Primary Blue',
        resolvedValueTypeId: 'color',
        private: false,
        themeable: false,
        tokenTier: 'PRIMITIVE',
        generatedByAlgorithm: false,
        taxonomies: [
          { taxonomyId: 'taxonomy-1', termId: 'term-1' },
          { taxonomyId: 'taxonomy-2', termId: 'term-2' }
        ],
        propertyTypes: [],
        valuesByMode: [{ modeIds: [], value: { value: '#0066CC' } }]
      }
    ];

    mockPlatforms = [
      {
        id: 'platform-1',
        displayName: 'Web',
        figmaPlatformMapping: 'WEB'
      },
      {
        id: 'platform-2',
        displayName: 'iOS',
        figmaPlatformMapping: 'iOS'
      }
    ];

    mockTaxonomies = [
      {
        id: 'taxonomy-1',
        name: 'Color',
        description: 'Color taxonomy',
        terms: [{ id: 'term-1', name: 'Primary' }]
      },
      {
        id: 'taxonomy-2',
        name: 'Hue',
        description: 'Hue taxonomy',
        terms: [{ id: 'term-2', name: 'Blue' }]
      }
    ];

    mockPlatformExtensions = new Map([
      ['platform-1', {
        syntaxPatterns: {
          delimiter: '-',
          capitalization: 'lowercase',
          prefix: '--sp'
        }
      } as PlatformExtension],
      ['platform-2', {
        syntaxPatterns: {
          delimiter: '',
          capitalization: 'camel',
          prefix: 'sp'
        }
      } as PlatformExtension]
    ]);

    generator = new CodeSyntaxGenerator({
      tokens: mockTokens,
      platforms: mockPlatforms,
      taxonomies: mockTaxonomies,
      taxonomyOrder: ['taxonomy-1', 'taxonomy-2'],
      platformExtensions: mockPlatformExtensions
    });
  });

  describe('generateTokenCodeSyntax', () => {
    it('should generate code syntax for all platforms', () => {
      const result = generator.generateTokenCodeSyntax(mockTokens[0]);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        platformId: 'platform-1',
        formattedName: '--spprimary-blue'
      });
      expect(result[1]).toEqual({
        platformId: 'platform-2',
        formattedName: 'sppRIMARYBLUE'
      });
    });

    it('should fallback to display name when no taxonomies', () => {
      const tokenWithoutTaxonomies = {
        ...mockTokens[0],
        taxonomies: []
      };

      const result = generator.generateTokenCodeSyntax(tokenWithoutTaxonomies);
      
      expect(result[0].formattedName).toBe('--spprimary blue');
      expect(result[1].formattedName).toBe('sppRIMARY BLUE');
    });
  });

  describe('generateTokenCodeSyntaxForPlatform', () => {
    it('should generate code syntax for specific platform', () => {
      const result = generator.generateTokenCodeSyntaxForPlatform(mockTokens[0], 'platform-1');
      
      expect(result).toBe('--spprimary-blue');
    });

    it('should throw error for non-existent platform', () => {
      expect(() => {
        generator.generateTokenCodeSyntaxForPlatform(mockTokens[0], 'non-existent');
      }).toThrow('Platform extension not found for platform: non-existent');
    });
  });

  describe('generateAllTokensCodeSyntax', () => {
    it('should generate code syntax for all tokens across all platforms', () => {
      const result = generator.generateAllTokensCodeSyntax();
      
      expect(result.size).toBe(1);
      expect(result.get('token-1')).toHaveLength(2);
    });
  });

  describe('generateAllTokensCodeSyntaxForPlatform', () => {
    it('should generate code syntax for all tokens for specific platform', () => {
      const result = generator.generateAllTokensCodeSyntaxForPlatform('platform-1');
      
      expect(result.size).toBe(1);
      expect(result.get('token-1')).toBe('--spprimary-blue');
    });
  });

  describe('caching', () => {
    it('should cache results and return cached values', () => {
      // First call
      const result1 = generator.generateTokenCodeSyntaxForPlatform(mockTokens[0], 'platform-1');
      
      // Second call should use cache
      const result2 = generator.generateTokenCodeSyntaxForPlatform(mockTokens[0], 'platform-1');
      
      expect(result1).toBe(result2);
    });

    it('should clear cache when clearCache is called', () => {
      // Generate and cache
      generator.generateTokenCodeSyntaxForPlatform(mockTokens[0], 'platform-1');
      
      // Clear cache
      generator.clearCache();
      
      // Should regenerate (no cache hit)
      const result = generator.generateTokenCodeSyntaxForPlatform(mockTokens[0], 'platform-1');
      expect(result).toBe('--spprimary-blue');
    });
  });

  describe('formatting rules', () => {
    it('should apply uppercase capitalization', () => {
      const platformExtension = {
        syntaxPatterns: {
          delimiter: '_',
          capitalization: 'uppercase'
        }
      } as PlatformExtension;

      const testGenerator = new CodeSyntaxGenerator({
        tokens: mockTokens,
        platforms: mockPlatforms,
        taxonomies: mockTaxonomies,
        taxonomyOrder: ['taxonomy-1', 'taxonomy-2'],
        platformExtensions: new Map([['platform-1', platformExtension]])
      });

      const result = testGenerator.generateTokenCodeSyntaxForPlatform(mockTokens[0], 'platform-1');
      expect(result).toBe('PRIMARY_BLUE');
    });

    it('should apply prefix and suffix', () => {
      const platformExtension = {
        syntaxPatterns: {
          delimiter: '-',
          prefix: 'token-',
          suffix: '-color'
        }
      } as PlatformExtension;

      const testGenerator = new CodeSyntaxGenerator({
        tokens: mockTokens,
        platforms: mockPlatforms,
        taxonomies: mockTaxonomies,
        taxonomyOrder: ['taxonomy-1', 'taxonomy-2'],
        platformExtensions: new Map([['platform-1', platformExtension]])
      });

      const result = testGenerator.generateTokenCodeSyntaxForPlatform(mockTokens[0], 'platform-1');
      expect(result).toBe('token-Primary-Blue-color');
    });

    it('should apply format string', () => {
      const platformExtension = {
        syntaxPatterns: {
          delimiter: '-',
          formatString: 'var(--{name})'
        }
      } as PlatformExtension;

      const testGenerator = new CodeSyntaxGenerator({
        tokens: mockTokens,
        platforms: mockPlatforms,
        taxonomies: mockTaxonomies,
        taxonomyOrder: ['taxonomy-1', 'taxonomy-2'],
        platformExtensions: new Map([['platform-1', platformExtension]])
      });

      const result = testGenerator.generateTokenCodeSyntaxForPlatform(mockTokens[0], 'platform-1');
      expect(result).toBe('var(--Primary-Blue)');
    });
  });

  describe('taxonomy ordering', () => {
    it('should respect taxonomy order', () => {
      const tokenWithReorderedTaxonomies = {
        ...mockTokens[0],
        taxonomies: [
          { taxonomyId: 'taxonomy-2', termId: 'term-2' }, // Blue
          { taxonomyId: 'taxonomy-1', termId: 'term-1' }  // Primary
        ]
      };

      const result = generator.generateTokenCodeSyntaxForPlatform(tokenWithReorderedTaxonomies, 'platform-1');
      
      // Should still be "primary-blue" because taxonomyOrder is ['taxonomy-1', 'taxonomy-2']
      expect(result).toBe('--spprimary-blue');
    });

    it('should handle missing taxonomy terms gracefully', () => {
      const tokenWithMissingTaxonomy = {
        ...mockTokens[0],
        taxonomies: [
          { taxonomyId: 'taxonomy-1', termId: 'term-1' },
          { taxonomyId: 'non-existent', termId: 'term-2' }
        ]
      };

      const result = generator.generateTokenCodeSyntaxForPlatform(tokenWithMissingTaxonomy, 'platform-1');
      
      // Should only use the valid taxonomy
      expect(result).toBe('--spprimary');
    });
  });
}); 