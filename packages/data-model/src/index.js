export * from './schema';
// Re-export schemas for validation
export { StandardValueType as StandardValueTypeSchema, ResolvedValueType as ResolvedValueTypeSchema, TokenStatus as TokenStatusSchema, TokenTier as TokenTierSchema, FallbackStrategy as FallbackStrategySchema, TokenValue as TokenValueSchema, Mode as ModeSchema, Dimension as DimensionSchema, TokenCollection as TokenCollectionSchema, Token as TokenSchema, TokenGroup as TokenGroupSchema, TokenVariant as TokenVariantSchema, TokenSystem as TokenSystemSchema, Platform as PlatformSchema, Taxonomy as TaxonomySchema, TokenTaxonomyRef as TokenTaxonomyRefSchema } from './schema';
// Re-export Zod schemas
export { ColorValue as ColorValueSchema, DimensionValue as DimensionValueSchema, DurationValue as DurationValueSchema, CubicBezierValue as CubicBezierValueSchema, ShadowValue as ShadowValueSchema, TypographyValue as TypographyValueSchema, BorderValue as BorderValueSchema } from './schema';
/**
 * Validates that if any entry in valuesByMode has modeIds: [], it must be the only entry in the array.
 * Otherwise, all entries must have modeIds.length > 0.
 * Returns true if valid, or an error message string if invalid.
 */
export function validateTokenValuesByMode(valuesByMode) {
    if (!Array.isArray(valuesByMode) || valuesByMode.length === 0) {
        return 'valuesByMode must be a non-empty array.';
    }
    const hasGlobal = valuesByMode.some(v => Array.isArray(v.modeIds) && v.modeIds.length === 0);
    if (hasGlobal) {
        if (valuesByMode.length > 1) {
            return 'If a global value (modeIds: []) is defined, it must be the only entry in valuesByMode.';
        }
    }
    else {
        if (valuesByMode.some(v => !Array.isArray(v.modeIds) || v.modeIds.length === 0)) {
            return 'All entries in valuesByMode must have at least one modeId, unless a single global value is defined.';
        }
    }
    return true;
}
// Export example data
export const exampleData = {
    core: () => import('../examples/themed/core-data.json'),
    brandAOverrides: () => import('../examples/themed/brand-a-overrides.json'),
    brandBOverrides: () => import('../examples/themed/brand-b-overrides.json'),
    minimal: () => import('../examples/unthemed/example-minimal-data.json')
};
// Export algorithm data
export const algorithmData = {
    core: () => import('../examples/algorithms/core-algorithms.json').catch(() => null),
    minimal: () => import('../examples/algorithms/example-minimal-algorithms.json').catch(() => null)
};
