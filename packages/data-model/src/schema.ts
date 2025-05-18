import { z } from 'zod';

// Enums
export const DimensionType = z.enum([
  'COLOR_SCHEME',
  'CONTRAST',
  'DEVICE_TYPE',
  'BRAND',
  'THEME',
  'MOTION',
  'DENSITY'
]);

export const ResolvedValueType = z.enum([
  'COLOR',
  'DIMENSION',
  'FONT_FAMILY',
  'FONT_WEIGHT',
  'FONT_STYLE',
  'DURATION',
  'CUBIC_BEZIER',
  'BORDER_WIDTH',
  'CORNER_ROUNDING',
  'ELEVATION',
  'SHADOW',
  'OPACITY',
  'NUMBER'
]);

export const TokenStatus = z.enum([
  'experimental',
  'stable',
  'deprecated'
]);

export const FallbackStrategy = z.enum([
  'MOST_SPECIFIC_MATCH',
  'DIMENSION_PRIORITY',
  'NEAREST_PARENT',
  'DEFAULT_VALUE'
]);

// Base schemas
export const ColorValue = z.object({
  hex: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/),
  rgb: z.object({
    r: z.number().int().min(0).max(255),
    g: z.number().int().min(0).max(255),
    b: z.number().int().min(0).max(255),
    a: z.number().min(0).max(1).optional()
  }).optional()
});

export const DimensionValue = z.union([
  z.object({
    value: z.number(),
    unit: z.enum(['px', 'rem', '%', 'em', 'vh', 'vw', 'pt'])
  }),
  z.string().regex(/^[0-9]+(\.[0-9]+)?(px|rem|%|em|vh|vw|pt)$/)
]);

export const DurationValue = z.union([
  z.object({
    value: z.number().min(0),
    unit: z.enum(['ms', 's'])
  }),
  z.string().regex(/^[0-9]+(\.[0-9]+)?(ms|s)$/)
]);

export const CubicBezierValue = z.union([
  z.object({
    x1: z.number().min(0).max(1),
    y1: z.number(),
    x2: z.number().min(0).max(1),
    y2: z.number()
  }),
  z.string().regex(/^cubic-bezier\([0-9]*(\.[0-9]+)?, ?[0-9]*(\.[0-9]+)?, ?[0-9]*(\.[0-9]+)?, ?[0-9]*(\.[0-9]+)?\)$/)
]);

export const ShadowValue = z.union([
  z.object({
    offsetX: DimensionValue,
    offsetY: DimensionValue,
    blur: DimensionValue,
    spread: DimensionValue,
    color: ColorValue,
    inset: z.boolean().optional()
  }),
  z.array(z.object({
    offsetX: DimensionValue,
    offsetY: DimensionValue,
    blur: DimensionValue,
    spread: DimensionValue,
    color: ColorValue,
    inset: z.boolean().optional()
  })),
  z.string().regex(/^([0-9]+(\.[0-9]+)?(px|rem) [0-9]+(\.[0-9]+)?(px|rem) [0-9]+(\.[0-9]+)?(px|rem) [0-9]+(\.[0-9]+)?(px|rem) (#[A-Fa-f0-9]{6}|rgba?\([0-9]+, ?[0-9]+, ?[0-9]+(, ?[0-9]+(\.[0-9]+)?)?\))( inset)?)(, ?[0-9]+(\.[0-9]+)?(px|rem) [0-9]+(\.[0-9]+)?(px|rem) [0-9]+(\.[0-9]+)?(px|rem) [0-9]+(\.[0-9]+)?(px|rem) (#[A-Fa-f0-9]{6}|rgba?\([0-9]+, ?[0-9]+, ?[0-9]+(, ?[0-9]+(\.[0-9]+)?)?\))( inset)?)*$/)
]);

export const TypographyValue = z.object({
  fontFamily: z.string(),
  fontSize: DimensionValue,
  fontWeight: z.union([
    z.number().int().min(100).max(900).multipleOf(100),
    z.enum(['normal', 'bold', 'lighter', 'bolder'])
  ]),
  lineHeight: z.union([
    z.number(),
    DimensionValue
  ]).optional(),
  letterSpacing: DimensionValue.optional(),
  textDecoration: z.enum(['none', 'underline', 'line-through', 'overline']).optional(),
  textTransform: z.enum(['none', 'capitalize', 'uppercase', 'lowercase']).optional()
});

export const BorderValue = z.union([
  z.object({
    width: DimensionValue,
    style: z.enum(['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none']),
    color: ColorValue
  }),
  z.string().regex(/^[0-9]+(\.[0-9]+)?(px|rem) (solid|dashed|dotted|double|groove|ridge|inset|outset|none) (#[A-Fa-f0-9]{6}|rgba?\([0-9]+, ?[0-9]+, ?[0-9]+(, ?[0-9]+(\.[0-9]+)?)?\))$/)
]);

// Token value types
export const TokenValue = z.union([
  z.object({
    type: z.literal('COLOR'),
    value: z.string()
  }),
  z.object({
    type: z.literal('FLOAT'),
    value: z.number()
  }),
  z.object({
    type: z.literal('INTEGER'),
    value: z.number().int()
  }),
  z.object({
    type: z.literal('STRING'),
    value: z.string()
  }),
  z.object({
    type: z.literal('BOOLEAN'),
    value: z.boolean()
  }),
  z.object({
    type: z.literal('ALIAS'),
    tokenId: z.string().regex(/^[a-zA-Z0-9-_]+$/)
  })
]);

// Main schemas
export const Mode = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  name: z.string(),
  description: z.string().optional(),
  dimensionId: z.string().regex(/^[a-zA-Z0-9-_]+$/)
});

export const Dimension = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  type: DimensionType,
  displayName: z.string(),
  description: z.string().optional(),
  modes: z.array(Mode).min(1),
  required: z.boolean().default(false),
  defaultMode: z.string()
});

export const TokenCollection = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  name: z.string(),
  description: z.string().optional(),
  resolvedValueTypes: z.array(ResolvedValueType),
  private: z.boolean().default(false),
  defaultModeIds: z.array(z.string().regex(/^[a-zA-Z0-9-_]+$/)).optional(),
  modeResolutionStrategy: z.object({
    priorityByType: z.array(DimensionType),
    fallbackStrategy: FallbackStrategy
  }).optional()
});

export const PlatformOverride = z.object({
  platformId: z.string(),
  value: z.string(),
  metadata: z.record(z.any()).optional()
});

// Taxonomy term reference for tokens
export const TokenTaxonomyRef = z.object({
  taxonomyId: z.string(),
  termId: z.string()
});

export const Token = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  displayName: z.string(),
  description: z.string().optional(),
  tokenCollectionId: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  resolvedValueType: ResolvedValueType,
  private: z.boolean().default(false),
  themeable: z.boolean().default(false),
  status: TokenStatus.optional(),
  taxonomies: z.array(TokenTaxonomyRef),
  propertyTypes: z.array(z.string()),
  codeSyntax: z.record(z.string()),
  valuesByMode: z.array(
    z.object({
      modeIds: z.array(z.string()),
      value: TokenValue,
      metadata: z.record(z.any()).optional(),
      platformOverrides: z.array(PlatformOverride).optional()
    })
  ).describe(
    `If any entry in valuesByMode has modeIds: [], it must be the only entry in the array. ` +
    `Otherwise, all entries must have modeIds.length > 0. This enforces that a token can have either a single global value or multiple mode-specific values, but not both.`
  ).min(1)
});

export const TokenGroup = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  name: z.string(),
  description: z.string().optional(),
  tokenCollectionId: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  tokens: z.array(Token)
});

export const TokenVariant = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  name: z.string(),
  description: z.string().optional(),
  tokenCollectionId: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  tokens: z.array(Token)
});

export const Platform = z.object({
  id: z.string(),
  displayName: z.string()
});

// Theme schema
export const Theme = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  displayName: z.string(),
  description: z.string().optional(),
  isDefault: z.boolean()
});

// ThemeOverride schema
export const ThemeOverrideValue = z.object({
  type: z.enum(["COLOR", "FLOAT", "INTEGER", "STRING", "BOOLEAN", "ALIAS"]),
  value: z.union([z.string(), z.number(), z.boolean()]),
  tokenId: z.string().regex(/^[a-zA-Z0-9-_]+$/).optional()
});

export const ThemePlatformOverride = z.object({
  platformId: z.string(),
  value: ThemeOverrideValue
});

export const ThemeOverride = z.object({
  tokenId: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  value: ThemeOverrideValue,
  platformOverrides: z.array(ThemePlatformOverride).optional()
});

// ThemeOverrides object: { [themeId: string]: ThemeOverride[] }
export const ThemeOverrides = z.record(z.array(ThemeOverride));

// TaxonomyTerm schema
export const TaxonomyTerm = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional()
});

// Taxonomy schema
export const Taxonomy = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  terms: z.array(TaxonomyTerm)
});

// Version history types
export const MigrationStrategy = z.object({
  emptyModeIds: z.enum(['mapToDefaults', 'preserveEmpty', 'requireExplicit']),
  preserveOriginalValues: z.boolean()
});

export const VersionHistoryEntry = z.object({
  version: z.string(),
  dimensions: z.array(z.string().regex(/^[a-zA-Z0-9-_]+$/)),
  date: z.string(),
  migrationStrategy: MigrationStrategy.optional()
});

export const DimensionEvolutionRule = z.object({
  whenAdding: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  mapEmptyModeIdsTo: z.array(z.string().regex(/^[a-zA-Z0-9-_]+$/)),
  preserveDefaultValues: z.boolean().optional()
});

export const DimensionEvolution = z.object({
  rules: z.array(DimensionEvolutionRule)
});

// Update TokenSystem
export const TokenSystem = z.object({
  version: z.string(),
  versionHistory: z.array(VersionHistoryEntry),
  dimensionEvolution: DimensionEvolution.optional(),
  dimensions: z.array(Dimension),
  tokenCollections: z.array(TokenCollection),
  tokens: z.array(Token),
  tokenGroups: z.array(TokenGroup),
  tokenVariants: z.array(TokenVariant),
  platforms: z.array(Platform).optional(),
  themes: z.array(Theme),
  themeOverrides: ThemeOverrides,
  taxonomies: z.array(Taxonomy)
});

// Validation functions
export const validateTokenSystem = (data: unknown): TokenSystem => {
  return TokenSystem.parse(data);
};

export const validateToken = (data: unknown): Token => {
  return Token.parse(data);
};

export const validateTokenCollection = (data: unknown): TokenCollection => {
  return TokenCollection.parse(data);
};

export const validateDimension = (data: unknown): Dimension => {
  return Dimension.parse(data);
};

export const validateTokenValue = (data: unknown): TokenValue => {
  return TokenValue.parse(data);
};

export const validateColorValue = (data: unknown): ColorValue => {
  return ColorValue.parse(data);
};

export const validateDimensionValue = (data: unknown): DimensionValue => {
  return DimensionValue.parse(data);
};

export const validateDurationValue = (data: unknown): DurationValue => {
  return DurationValue.parse(data);
};

export const validateCubicBezierValue = (data: unknown): CubicBezierValue => {
  return CubicBezierValue.parse(data);
};

export const validateShadowValue = (data: unknown): ShadowValue => {
  return ShadowValue.parse(data);
};

export const validateTypographyValue = (data: unknown): TypographyValue => {
  return TypographyValue.parse(data);
};

export const validateBorderValue = (data: unknown): BorderValue => {
  return BorderValue.parse(data);
};

export const validateTheme = (data: unknown): Theme => {
  return Theme.parse(data);
};

export const validateThemeOverride = (data: unknown): ThemeOverride => {
  return ThemeOverride.parse(data);
};

export const validateThemeOverrides = (data: unknown): ThemeOverrides => {
  return ThemeOverrides.parse(data);
};

export const validateTaxonomy = (data: unknown): Taxonomy => {
  return Taxonomy.parse(data);
};

/**
 * Validates that each taxonomyId in a token's taxonomies exists in the top-level taxonomies array,
 * and that each termId exists in the referenced taxonomy.
 * Returns an array of errors (empty if valid).
 */
export function validateTokenTaxonomiesReferentialIntegrity(
  token: Token,
  allTaxonomies: Taxonomy[]
): string[] {
  const errors: string[] = [];
  for (const ref of token.taxonomies) {
    const taxonomy = allTaxonomies.find(t => t.id === ref.taxonomyId);
    if (!taxonomy) {
      errors.push(
        `Token '${token.id}' references missing taxonomyId '${ref.taxonomyId}'.`
      );
      continue;
    }
    const term = taxonomy.terms.find(term => term.id === ref.termId);
    if (!term) {
      errors.push(
        `Token '${token.id}' references missing termId '${ref.termId}' in taxonomy '${taxonomy.id}'.`
      );
    }
  }
  return errors;
}

export type DimensionType = z.infer<typeof DimensionType>;
export type ResolvedValueType = z.infer<typeof ResolvedValueType>;
export type TokenStatus = z.infer<typeof TokenStatus>;
export type FallbackStrategy = z.infer<typeof FallbackStrategy>;
export type ColorValue = z.infer<typeof ColorValue>;
export type DimensionValue = z.infer<typeof DimensionValue>;
export type DurationValue = z.infer<typeof DurationValue>;
export type CubicBezierValue = z.infer<typeof CubicBezierValue>;
export type ShadowValue = z.infer<typeof ShadowValue>;
export type TypographyValue = z.infer<typeof TypographyValue>;
export type BorderValue = z.infer<typeof BorderValue>;
export type TokenValue = z.infer<typeof TokenValue>;
export type Mode = z.infer<typeof Mode>;
export type Dimension = z.infer<typeof Dimension>;
export type TokenCollection = z.infer<typeof TokenCollection>;
export type Token = z.infer<typeof Token>;
export type TokenGroup = z.infer<typeof TokenGroup>;
export type TokenVariant = z.infer<typeof TokenVariant>;
export type Platform = z.infer<typeof Platform>;
export type PlatformOverride = z.infer<typeof PlatformOverride>;
export type Theme = z.infer<typeof Theme>;
export type ThemeOverride = z.infer<typeof ThemeOverride>;
export type ThemeOverrides = z.infer<typeof ThemeOverrides>;
export type TaxonomyTerm = z.infer<typeof TaxonomyTerm>;
export type Taxonomy = z.infer<typeof Taxonomy>;
export type TokenSystem = z.infer<typeof TokenSystem>;
export type TokenTaxonomyRef = z.infer<typeof TokenTaxonomyRef>;
export type MigrationStrategy = z.infer<typeof MigrationStrategy>;
export type VersionHistoryEntry = z.infer<typeof VersionHistoryEntry>;
export type DimensionEvolutionRule = z.infer<typeof DimensionEvolutionRule>;
export type DimensionEvolution = z.infer<typeof DimensionEvolution>; 