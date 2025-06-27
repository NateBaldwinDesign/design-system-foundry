/**
 * Create a validation error
 */
export function createValidationError(path, message, code, context) {
    return {
        path,
        message,
        code,
        context
    };
}
/**
 * Create a validation warning
 */
export function createValidationWarning(path, message, code, context) {
    return {
        path,
        message,
        code,
        context
    };
}
/**
 * Create a validation result
 */
export function createValidationResult(isValid, errors = [], warnings = []) {
    return {
        isValid,
        errors,
        warnings
    };
}
/**
 * Validate that a token system has the required basic structure
 */
export function validateTokenSystemBasic(tokenSystem) {
    const errors = [];
    const warnings = [];
    // Check required top-level fields
    if (!tokenSystem.systemId) {
        errors.push(createValidationError('systemId', 'System ID is required', 'MISSING_SYSTEM_ID'));
    }
    if (!tokenSystem.systemName) {
        errors.push(createValidationError('systemName', 'System name is required', 'MISSING_SYSTEM_NAME'));
    }
    if (!tokenSystem.version) {
        errors.push(createValidationError('version', 'Version is required', 'MISSING_VERSION'));
    }
    // Check required arrays
    if (!tokenSystem.tokenCollections || tokenSystem.tokenCollections.length === 0) {
        errors.push(createValidationError('tokenCollections', 'At least one token collection is required', 'NO_TOKEN_COLLECTIONS'));
    }
    if (!tokenSystem.dimensions || tokenSystem.dimensions.length === 0) {
        errors.push(createValidationError('dimensions', 'At least one dimension is required', 'NO_DIMENSIONS'));
    }
    if (!tokenSystem.tokens || tokenSystem.tokens.length === 0) {
        errors.push(createValidationError('tokens', 'At least one token is required', 'NO_TOKENS'));
    }
    if (!tokenSystem.platforms || tokenSystem.platforms.length === 0) {
        errors.push(createValidationError('platforms', 'At least one platform is required', 'NO_PLATFORMS'));
    }
    if (!tokenSystem.resolvedValueTypes || tokenSystem.resolvedValueTypes.length === 0) {
        errors.push(createValidationError('resolvedValueTypes', 'At least one resolved value type is required', 'NO_RESOLVED_VALUE_TYPES'));
    }
    return createValidationResult(errors.length === 0, errors, warnings);
}
/**
 * Validate that all referenced IDs exist in their respective arrays
 */
export function validateReferentialIntegrity(tokenSystem) {
    const errors = [];
    const warnings = [];
    // Create lookup maps for efficient validation
    const resolvedValueTypeIds = new Set(tokenSystem.resolvedValueTypes?.map(vt => vt.id) || []);
    const collectionIds = new Set(tokenSystem.tokenCollections?.map(c => c.id) || []);
    const dimensionIds = new Set(tokenSystem.dimensions?.map(d => d.id) || []);
    const modeIds = new Set();
    const platformIds = new Set(tokenSystem.platforms?.map(p => p.id) || []);
    const taxonomyIds = new Set(tokenSystem.taxonomies?.map(t => t.id) || []);
    // Build mode IDs from dimensions
    tokenSystem.dimensions?.forEach(dimension => {
        dimension.modes?.forEach(mode => {
            modeIds.add(mode.id);
        });
    });
    // Validate token collections
    tokenSystem.tokenCollections?.forEach((collection, index) => {
        if (collection.resolvedValueTypeIds) {
            collection.resolvedValueTypeIds.forEach(typeId => {
                if (!resolvedValueTypeIds.has(typeId)) {
                    errors.push(createValidationError(`tokenCollections[${index}].resolvedValueTypeIds`, `Referenced resolved value type '${typeId}' does not exist`, 'INVALID_RESOLVED_VALUE_TYPE_REFERENCE', { collectionId: collection.id, referencedTypeId: typeId }));
                }
            });
        }
    });
    // Validate tokens
    tokenSystem.tokens?.forEach((token, index) => {
        // Validate resolvedValueTypeId
        if (token.resolvedValueTypeId && !resolvedValueTypeIds.has(token.resolvedValueTypeId)) {
            errors.push(createValidationError(`tokens[${index}].resolvedValueTypeId`, `Referenced resolved value type '${token.resolvedValueTypeId}' does not exist`, 'INVALID_RESOLVED_VALUE_TYPE_REFERENCE', { tokenId: token.id, referencedTypeId: token.resolvedValueTypeId }));
        }
        // Validate tokenCollectionId
        if (token.tokenCollectionId && !collectionIds.has(token.tokenCollectionId)) {
            errors.push(createValidationError(`tokens[${index}].tokenCollectionId`, `Referenced token collection '${token.tokenCollectionId}' does not exist`, 'INVALID_COLLECTION_REFERENCE', { tokenId: token.id, referencedCollectionId: token.tokenCollectionId }));
        }
        // Validate modeIds in valuesByMode
        token.valuesByMode?.forEach((valueByMode, valueIndex) => {
            valueByMode.modeIds?.forEach(modeId => {
                if (!modeIds.has(modeId)) {
                    errors.push(createValidationError(`tokens[${index}].valuesByMode[${valueIndex}].modeIds`, `Referenced mode '${modeId}' does not exist`, 'INVALID_MODE_REFERENCE', { tokenId: token.id, referencedModeId: modeId }));
                }
            });
        });
        // Validate platformIds in codeSyntax
        token.codeSyntax?.forEach((syntax, syntaxIndex) => {
            if (!platformIds.has(syntax.platformId)) {
                errors.push(createValidationError(`tokens[${index}].codeSyntax[${syntaxIndex}].platformId`, `Referenced platform '${syntax.platformId}' does not exist`, 'INVALID_PLATFORM_REFERENCE', { tokenId: token.id, referencedPlatformId: syntax.platformId }));
            }
        });
        // Validate taxonomy references
        token.taxonomies?.forEach((taxonomyRef, taxIndex) => {
            if (!taxonomyIds.has(taxonomyRef.taxonomyId)) {
                errors.push(createValidationError(`tokens[${index}].taxonomies[${taxIndex}].taxonomyId`, `Referenced taxonomy '${taxonomyRef.taxonomyId}' does not exist`, 'INVALID_TAXONOMY_REFERENCE', { tokenId: token.id, referencedTaxonomyId: taxonomyRef.taxonomyId }));
            }
        });
    });
    return createValidationResult(errors.length === 0, errors, warnings);
}
/**
 * Validate that all required fields are present and have valid values
 */
export function validateRequiredFields(tokenSystem) {
    const errors = [];
    const warnings = [];
    // Validate systemId pattern
    if (tokenSystem.systemId && !/^[a-zA-Z0-9-_]+$/.test(tokenSystem.systemId)) {
        errors.push(createValidationError('systemId', 'System ID must match pattern: ^[a-zA-Z0-9-_]+$', 'INVALID_SYSTEM_ID_PATTERN', { systemId: tokenSystem.systemId }));
    }
    // Validate version pattern
    if (tokenSystem.version && !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.test(tokenSystem.version)) {
        errors.push(createValidationError('version', 'Version must be a valid semantic version', 'INVALID_VERSION_FORMAT', { version: tokenSystem.version }));
    }
    return createValidationResult(errors.length === 0, errors, warnings);
}
/**
 * Comprehensive validation of a token system
 */
export function validateTokenSystem(tokenSystem) {
    const basicValidation = validateTokenSystemBasic(tokenSystem);
    const integrityValidation = validateReferentialIntegrity(tokenSystem);
    const fieldsValidation = validateRequiredFields(tokenSystem);
    const allErrors = [
        ...basicValidation.errors,
        ...integrityValidation.errors,
        ...fieldsValidation.errors
    ];
    const allWarnings = [
        ...basicValidation.warnings,
        ...integrityValidation.warnings,
        ...fieldsValidation.warnings
    ];
    return createValidationResult(allErrors.length === 0, allErrors, allWarnings);
}
