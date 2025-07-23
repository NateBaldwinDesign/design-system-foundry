import { z } from 'zod';

// Standard value types
export const StandardValueType = z.enum([
  'COLOR',
  'DIMENSION',
  'SPACING',
  'FONT_FAMILY',
  'FONT_WEIGHT',
  'FONT_SIZE',
  'LINE_HEIGHT',
  'LETTER_SPACING',
  'DURATION',
  'CUBIC_BEZIER',
  'BLUR',
  'SPREAD',
  'RADIUS'
]);

export type StandardValueType = z.infer<typeof StandardValueType>;

// Value type validation rules
export const ValueTypeValidation = z.object({
  pattern: z.string().optional(),
  minimum: z.number().optional(),
  maximum: z.number().optional(),
  allowedValues: z.array(z.string()).optional()
});

export type ValueTypeValidation = z.infer<typeof ValueTypeValidation>;

// Resolved value type schema
export const ResolvedValueType = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  displayName: z.string(),
  type: StandardValueType.optional(),
  description: z.string().optional(),
  validation: ValueTypeValidation.optional()
});

export type ResolvedValueType = z.infer<typeof ResolvedValueType>;

// Enums
export const TokenStatus = z.enum([
  'experimental',
  'stable',
  'deprecated'
]);

export const TokenTier = z.enum([
  'PRIMITIVE',
  'SEMANTIC',
  'COMPONENT'
]);

export const PropertyType = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  displayName: z.string(),
  category: z.enum(['color', 'typography', 'spacing', 'dimension', 'effect', 'border', 'layout', 'animation']),
  compatibleValueTypes: z.array(z.string()),
  platformMappings: z.object({
    css: z.array(z.string()).optional(),
    figma: z.array(z.string()).optional(),
    ios: z.array(z.string()).optional(),
    android: z.array(z.string()).optional()
  }).optional(),
  defaultUnit: z.string().optional(),
  inheritance: z.boolean().default(false)
});

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
    value: z.any()
  }),
  z.object({
    tokenId: z.string().regex(/^[a-zA-Z0-9-_]+$/)
  })
]);

export type TokenValue = z.infer<typeof TokenValue>;

// Main schemas
export const Mode = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  name: z.string(),
  description: z.string().optional(),
  dimensionId: z.string().regex(/^[a-zA-Z0-9-_]+$/)
});

export const Dimension = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  displayName: z.string(),
  description: z.string().optional(),
  modes: z.array(Mode).min(1),
  required: z.boolean().default(false),
  defaultMode: z.string(),
  resolvedValueTypeIds: z.array(z.string()).optional()
});

export const TokenCollection = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  name: z.string(),
  description: z.string().optional(),
  resolvedValueTypeIds: z.array(z.string().regex(/^[a-zA-Z0-9-_]+$/)),
  private: z.boolean().default(false),
  defaultModeIds: z.array(z.string().regex(/^[a-zA-Z0-9-_]+$/)).optional(),
  modeResolutionStrategy: z.object({
    priorityByType: z.array(z.string()),
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
  tokenCollectionId: z.string().regex(/^[a-zA-Z0-9-_]+$/).optional(),
  resolvedValueTypeId: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  private: z.boolean().default(false),
  themeable: z.boolean().default(false),
  status: TokenStatus.optional(),
  tokenTier: TokenTier,
  generatedByAlgorithm: z.boolean().default(false),
  algorithmId: z.string().regex(/^[a-zA-Z0-9-_]+$/).optional(),
  taxonomies: z.array(TokenTaxonomyRef),
  propertyTypes: z.array(PropertyType),
  codeSyntax: z.array(z.object({
    platformId: z.string(),
    formattedName: z.string()
  })),
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

// Add enum for delimiter
export const PlatformDelimiter = z.enum(['', '_', '-', '.', '/']);

// Update Platform schema to include syntaxPatterns and extensionSource
export const Platform = z.object({
  id: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  syntaxPatterns: z.object({
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    delimiter: PlatformDelimiter.optional(),
    capitalization: z.enum(['none', 'camel', 'uppercase', 'lowercase', 'capitalize']).optional(),
    formatString: z.string().optional()
  }).optional(),
  valueFormatters: z.object({
    color: z.enum(['hex', 'rgb', 'rgba', 'hsl', 'hsla']).optional(),
    dimension: z.enum(['px', 'rem', 'em', 'pt', 'dp', 'sp']).optional(),
    numberPrecision: z.number().int().min(0).max(10).optional()
  }).optional(),
  extensionSource: z.object({
    repositoryUri: z.string(),
    filePath: z.string()
  }).optional()
}).refine((data) => {
  // Platforms can have either syntaxPatterns/valueFormatters OR extensionSource, but not both
  if (data.extensionSource) {
    return !data.syntaxPatterns && !data.valueFormatters;
  }
  return true;
}, {
  message: "Platforms can have either core patterns or extension source, but not both."
});

// Platform Extension Schema (for standalone platform extension files)
export const PlatformExtension = z.object({
  systemId: z.string(),
  platformId: z.string(),
  version: z.string(),
  figmaFileKey: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  metadata: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    maintainer: z.string().optional(),
    lastUpdated: z.string().optional(),
    repositoryVisibility: z.enum(['public', 'private']).optional()
  }).optional(),
  syntaxPatterns: z.object({
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    delimiter: PlatformDelimiter.optional(),
    capitalization: z.enum(['camel', 'uppercase', 'lowercase', 'capitalize']).optional(),
    formatString: z.string().optional()
  }).optional(),
  valueFormatters: z.object({
    color: z.enum(['hex', 'rgb', 'rgba', 'hsl', 'hsla']).optional(),
    dimension: z.enum(['px', 'rem', 'em', 'pt', 'dp', 'sp']).optional(),
    numberPrecision: z.number().int().min(0).max(10).optional()
  }).optional(),
  algorithmVariableOverrides: z.array(z.object({
    algorithmId: z.string(),
    variableId: z.string(),
    valuesByMode: z.array(z.object({
      modeIds: z.array(z.string()),
      value: z.union([z.string(), z.number(), z.boolean()])
    }))
  })).optional(),
  tokenOverrides: z.array(z.object({
    id: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    themeable: z.boolean().optional(),
    private: z.boolean().optional(),
    status: z.string().optional(),
    tokenTier: z.string().optional(),
    resolvedValueTypeId: z.string().optional(),
    generatedByAlgorithm: z.boolean().optional(),
    algorithmId: z.string().optional(),
    taxonomies: z.array(z.any()).optional(),
    propertyTypes: z.array(z.any()).optional(),
    codeSyntax: z.array(z.any()).optional(),
    valuesByMode: z.array(z.object({
      modeIds: z.array(z.string()),
      value: z.union([
        z.object({ value: z.any() }),
        z.object({ tokenId: z.string() })
      ]),
      metadata: z.any().optional()
    })),
    omit: z.boolean().optional()
  })).optional(),
  omittedModes: z.array(z.string()).optional(),
  omittedDimensions: z.array(z.string()).optional()
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
  terms: z.array(TaxonomyTerm),
  resolvedValueTypeIds: z.array(z.string()).optional()
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

// Update TokenSystem to require platforms and include platform extensions registry
export const TokenSystem = z.object({
  systemName: z.string(),
  systemId: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  description: z.string().optional(),
  figmaConfiguration: z.object({
    syntaxPatterns: z.object({
      prefix: z.string().optional(),
      suffix: z.string().optional(),
      delimiter: z.enum(['', '_', '-', '.', '/']).optional(),
      capitalization: z.enum(['camel', 'uppercase', 'lowercase', 'capitalize']).optional(),
      formatString: z.string().optional()
    }).optional(),
    fileKey: z.string()
  }).optional(),
  version: z.string(),
  versionHistory: z.array(VersionHistoryEntry),
  dimensionEvolution: DimensionEvolution.optional(),
  dimensions: z.array(Dimension),
  dimensionOrder: z.array(z.string().regex(/^[a-zA-Z0-9-_]+$/)).optional(),
  tokenCollections: z.array(TokenCollection),
  tokens: z.array(Token),
  platforms: z.array(Platform),
  platformExtensions: z.array(z.object({
    platformId: z.string(),
    repositoryUri: z.string(),
    filePath: z.string()
  })).optional(),
  themes: z.array(Theme).optional(),
  themeOverrides: ThemeOverrides.optional(),
  taxonomies: z.array(Taxonomy),
  standardPropertyTypes: z.array(PropertyType),
  propertyTypes: z.array(PropertyType),
  resolvedValueTypes: z.array(ResolvedValueType),
  extensions: z.object({
    tokenGroups: z.array(TokenGroup).optional(),
    tokenVariants: z.record(z.any()).optional()
  }).optional()
}).refine(
  (data) => {
    if (!data.dimensionOrder) return true;
    const dimensionIds = new Set(data.dimensions.map(d => d.id));
    return data.dimensionOrder.every(id => dimensionIds.has(id));
  },
  {
    message: "All dimensionOrder IDs must match existing dimension IDs",
    path: ["dimensionOrder"]
  }
);

// Validation functions
export const validateTokenSystem = (data: unknown): TokenSystem => {
  return TokenSystem.parse(data);
};

export const validateResolvedValueType = (data: unknown): ResolvedValueType => {
  return ResolvedValueType.parse(data);
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

export const validatePlatformExtension = (data: unknown): PlatformExtension => {
  return PlatformExtension.parse(data);
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

// Add new validation function for collection-type compatibility
export function validateTokenCollectionCompatibility(
  token: Token,
  collections: TokenCollection[]
): string[] {
  const errors: string[] = [];
  
  if (!token.tokenCollectionId) return errors;
  
  const collection = collections.find(c => c.id === token.tokenCollectionId);
  if (!collection) {
    errors.push(`Token '${token.id}' references non-existent collection '${token.tokenCollectionId}'`);
    return errors;
  }
  
  if (!collection.resolvedValueTypeIds.includes(token.resolvedValueTypeId)) {
    errors.push(
      `Token '${token.id}' has type '${token.resolvedValueTypeId}' which is not supported by collection '${collection.id}'`
    );
  }
  
  return errors;
}

// Add function to find compatible collection
export function findCompatibleCollection(
  token: Token,
  collections: TokenCollection[]
): TokenCollection | undefined {
  return collections.find(c => c.resolvedValueTypeIds.includes(token.resolvedValueTypeId));
}

// Add new type exports
export type TokenStatus = z.infer<typeof TokenStatus>;
export type FallbackStrategy = z.infer<typeof FallbackStrategy>;
export type ColorValue = z.infer<typeof ColorValue>;
export type DimensionValue = z.infer<typeof DimensionValue>;
export type DurationValue = z.infer<typeof DurationValue>;
export type CubicBezierValue = z.infer<typeof CubicBezierValue>;
export type ShadowValue = z.infer<typeof ShadowValue>;
export type TypographyValue = z.infer<typeof TypographyValue>;
export type BorderValue = z.infer<typeof BorderValue>;
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
export type TokenTier = z.infer<typeof TokenTier>;
export type PropertyType = z.infer<typeof PropertyType>;
export type PlatformExtension = z.infer<typeof PlatformExtension>;

// Figma Configuration type
export const FigmaConfiguration = z.object({
  syntaxPatterns: z.object({
    prefix: z.string().optional(),
    suffix: z.string().optional(),
    delimiter: z.enum(['', '_', '-', '.', '/']).optional(),
    capitalization: z.enum(['camel', 'uppercase', 'lowercase', 'capitalize']).optional(),
    formatString: z.string().optional()
  }).optional(),
  fileKey: z.string()
});

export type FigmaConfiguration = z.infer<typeof FigmaConfiguration>; 