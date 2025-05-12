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
  modes: z.array(Mode).min(1)
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

export const Token = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  displayName: z.string(),
  description: z.string().optional(),
  tokenCollectionId: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  resolvedValueType: ResolvedValueType,
  private: z.boolean().default(false),
  status: TokenStatus.optional(),
  taxonomies: z.record(z.string()),
  propertyTypes: z.array(z.string()),
  codeSyntax: z.record(z.string()),
  valuesByMode: z.array(z.object({
    modeIds: z.array(z.string().regex(/^[a-zA-Z0-9-_]+$/)),
    value: TokenValue,
    metadata: z.record(z.any()).optional()
  })).min(1)
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

export const TokenSystem = z.object({
  dimensions: z.array(Dimension),
  tokenCollections: z.array(TokenCollection),
  tokens: z.array(Token),
  tokenGroups: z.array(TokenGroup),
  tokenVariants: z.array(TokenVariant)
});

// Type exports
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
export type TokenSystem = z.infer<typeof TokenSystem>;

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