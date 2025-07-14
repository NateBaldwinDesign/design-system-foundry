/**
 * Generate a unique ID for a variable or collection
 */
export function generateUniqueId(prefix = 'var') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
}
/**
 * Sanitize a name for use as a variable name
 */
export function sanitizeVariableName(name) {
    return name
        .replace(/[^a-zA-Z0-9-_]/g, '_') // Replace invalid characters with underscore
        .replace(/^[0-9]/, '_$&') // Prefix with underscore if starts with number
        .replace(/_+/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
        .toLowerCase();
}
/**
 * Convert a token name to a variable name
 */
export function tokenToVariableName(token, platformId) {
    let name = token.displayName || token.id;
    // If platform-specific code syntax exists, use it
    if (platformId && token.codeSyntax) {
        const syntax = token.codeSyntax.find(s => s.platformId === platformId);
        if (syntax) {
            name = syntax.formattedName;
        }
    }
    return sanitizeVariableName(name);
}
/**
 * Get a resolved value type by ID
 */
export function getResolvedValueType(tokenSystem, typeId) {
    return tokenSystem.resolvedValueTypes?.find(vt => vt.id === typeId);
}
/**
 * Get a token by ID
 */
export function getToken(tokenSystem, tokenId) {
    return tokenSystem.tokens?.find(token => token.id === tokenId);
}
/**
 * Resolve a token value (handle aliases)
 */
export function resolveTokenValue(tokenSystem, token, modeIds) {
    // Find the value for the specified modes
    const valueByMode = token.valuesByMode?.find(vbm => {
        if (vbm.modeIds.length === 0)
            return true; // Global value
        return modeIds.every(modeId => vbm.modeIds.includes(modeId));
    });
    if (!valueByMode) {
        throw new Error(`No value found for token ${token.id} with modes ${modeIds.join(', ')}`);
    }
    // Check if this is an alias
    if ('tokenId' in valueByMode.value) {
        const referencedToken = getToken(tokenSystem, valueByMode.value.tokenId);
        if (!referencedToken) {
            throw new Error(`Referenced token ${valueByMode.value.tokenId} not found`);
        }
        // Recursively resolve the referenced token
        return resolveTokenValue(tokenSystem, referencedToken, modeIds);
    }
    // Return the direct value
    return valueByMode.value.value;
}
/**
 * Get all mode combinations from dimensions
 */
export function getAllModeCombinations(tokenSystem) {
    const dimensions = tokenSystem.dimensions || [];
    if (dimensions.length === 0) {
        return [[]]; // No dimensions means global values only
    }
    // Get all modes for each dimension
    const dimensionModes = dimensions.map(dimension => dimension.modes?.map(mode => mode.id) || []);
    // Generate all combinations
    function generateCombinations(arrays, index = 0) {
        if (index === arrays.length) {
            return [[]];
        }
        const currentArray = arrays[index];
        const remainingCombinations = generateCombinations(arrays, index + 1);
        const result = [];
        for (const item of currentArray) {
            for (const combination of remainingCombinations) {
                result.push([item, ...combination]);
            }
        }
        return result;
    }
    return generateCombinations(dimensionModes);
}
/**
 * Format a value for display
 */
export function formatValue(value, type) {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return value.toString();
    }
    if (typeof value === 'boolean') {
        return value.toString();
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}
/**
 * Deep clone an object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
}
/**
 * Merge two objects deeply
 */
export function deepMerge(target, source) {
    const result = deepClone(target);
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = result[key];
            if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) &&
                targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
                result[key] = deepMerge(targetValue, sourceValue);
            }
            else {
                result[key] = sourceValue;
            }
        }
    }
    return result;
}
/**
 * Check if two values are deeply equal
 */
export function deepEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
        return false;
    }
    if (Array.isArray(a) !== Array.isArray(b)) {
        return false;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) {
            return false;
        }
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
        return false;
    }
    for (const key of keysA) {
        if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
            return false;
        }
    }
    return true;
}
/**
 * Check if a string value is a valid hex color
 * Supports formats: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
 */
export function isHexColor(value) {
    if (typeof value !== 'string')
        return false;
    // Remove any leading/trailing whitespace
    const trimmed = value.trim();
    // Check for hex color patterns
    const hexPattern = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    return hexPattern.test(trimmed);
}
