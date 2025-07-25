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
// Value type validation rules
export const ValueTypeValidation = z.object({
    pattern: z.string().optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    allowedValues: z.array(z.string()).optional()
});
// Resolved value type schema
export const ResolvedValueType = z.object({
    id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
    displayName: z.string(),
    type: StandardValueType.optional(),
    description: z.string().optional(),
    validation: ValueTypeValidation.optional()
});
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
    propertyTypes: z.array(z.string()),
    codeSyntax: z.array(z.object({
        platformId: z.string(),
        formattedName: z.string()
    })),
    valuesByMode: z.array(z.object({
        modeIds: z.array(z.string()),
        value: TokenValue,
        metadata: z.record(z.any()).optional(),
        platformOverrides: z.array(PlatformOverride).optional()
    })).describe(`If any entry in valuesByMode has modeIds: [], it must be the only entry in the array. ` +
        `Otherwise, all entries must have modeIds.length > 0. This enforces that a token can have either a single global value or multiple mode-specific values, but not both.`).min(1)
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
// Update Platform schema to include syntaxPatterns
export const Platform = z.object({
    id: z.string(),
    displayName: z.string(),
    description: z.string().optional(),
    syntaxPatterns: z.object({
        prefix: z.string().optional(),
        suffix: z.string().optional(),
        delimiter: PlatformDelimiter.optional(),
        capitalization: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
        formatString: z.string().optional()
    }).optional(),
    valueFormatters: z.object({
        color: z.enum(['hex', 'rgb', 'rgba', 'hsl', 'hsla']).optional(),
        dimension: z.enum(['px', 'rem', 'em', 'pt', 'dp', 'sp']).optional(),
        numberPrecision: z.number().int().min(0).max(10).optional()
    }).optional()
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
// Update TokenSystem to require platforms
export const TokenSystem = z.object({
    systemName: z.string(),
    systemId: z.string().regex(/^[a-zA-Z0-9-_]+$/),
    description: z.string().optional(),
    version: z.string(),
    versionHistory: z.array(VersionHistoryEntry),
    dimensionEvolution: DimensionEvolution.optional(),
    dimensions: z.array(Dimension),
    dimensionOrder: z.array(z.string().regex(/^[a-zA-Z0-9-_]+$/)).optional(),
    tokenCollections: z.array(TokenCollection),
    tokens: z.array(Token),
    platforms: z.array(Platform),
    themes: z.array(Theme).optional(),
    themeOverrides: ThemeOverrides.optional(),
    taxonomies: z.array(Taxonomy),
    resolvedValueTypes: z.array(ResolvedValueType),
    extensions: z.object({
        tokenGroups: z.array(TokenGroup).optional(),
        tokenVariants: z.record(z.any()).optional()
    }).optional()
}).refine((data) => {
    if (!data.dimensionOrder)
        return true;
    const dimensionIds = new Set(data.dimensions.map(d => d.id));
    return data.dimensionOrder.every(id => dimensionIds.has(id));
}, {
    message: "All dimensionOrder IDs must match existing dimension IDs",
    path: ["dimensionOrder"]
});
// Validation functions
export const validateTokenSystem = (data) => {
    return TokenSystem.parse(data);
};
export const validateResolvedValueType = (data) => {
    return ResolvedValueType.parse(data);
};
export const validateToken = (data) => {
    return Token.parse(data);
};
export const validateTokenCollection = (data) => {
    return TokenCollection.parse(data);
};
export const validateDimension = (data) => {
    return Dimension.parse(data);
};
export const validateTokenValue = (data) => {
    return TokenValue.parse(data);
};
export const validateColorValue = (data) => {
    return ColorValue.parse(data);
};
export const validateDimensionValue = (data) => {
    return DimensionValue.parse(data);
};
export const validateDurationValue = (data) => {
    return DurationValue.parse(data);
};
export const validateCubicBezierValue = (data) => {
    return CubicBezierValue.parse(data);
};
export const validateShadowValue = (data) => {
    return ShadowValue.parse(data);
};
export const validateTypographyValue = (data) => {
    return TypographyValue.parse(data);
};
export const validateBorderValue = (data) => {
    return BorderValue.parse(data);
};
export const validateTheme = (data) => {
    return Theme.parse(data);
};
export const validateThemeOverride = (data) => {
    return ThemeOverride.parse(data);
};
export const validateThemeOverrides = (data) => {
    return ThemeOverrides.parse(data);
};
export const validateTaxonomy = (data) => {
    return Taxonomy.parse(data);
};
/**
 * Validates that each taxonomyId in a token's taxonomies exists in the top-level taxonomies array,
 * and that each termId exists in the referenced taxonomy.
 * Returns an array of errors (empty if valid).
 */
export function validateTokenTaxonomiesReferentialIntegrity(token, allTaxonomies) {
    const errors = [];
    for (const ref of token.taxonomies) {
        const taxonomy = allTaxonomies.find(t => t.id === ref.taxonomyId);
        if (!taxonomy) {
            errors.push(`Token '${token.id}' references missing taxonomyId '${ref.taxonomyId}'.`);
            continue;
        }
        const term = taxonomy.terms.find(term => term.id === ref.termId);
        if (!term) {
            errors.push(`Token '${token.id}' references missing termId '${ref.termId}' in taxonomy '${taxonomy.id}'.`);
        }
    }
    return errors;
}
// Add new validation function for collection-type compatibility
export function validateTokenCollectionCompatibility(token, collections) {
    const errors = [];
    if (!token.tokenCollectionId)
        return errors;
    const collection = collections.find(c => c.id === token.tokenCollectionId);
    if (!collection) {
        errors.push(`Token '${token.id}' references non-existent collection '${token.tokenCollectionId}'`);
        return errors;
    }
    if (!collection.resolvedValueTypeIds.includes(token.resolvedValueTypeId)) {
        errors.push(`Token '${token.id}' has type '${token.resolvedValueTypeId}' which is not supported by collection '${collection.id}'`);
    }
    return errors;
}
// Add function to find compatible collection
export function findCompatibleCollection(token, collections) {
    return collections.find(c => c.resolvedValueTypeIds.includes(token.resolvedValueTypeId));
}
