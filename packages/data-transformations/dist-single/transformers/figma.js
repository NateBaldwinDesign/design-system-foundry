// Placeholder for Figma transformer implementation
// This will be fully implemented in Phase 2
import { AbstractBaseTransformer } from './base';
import { validateTokenSystem } from '../utils/validation';
import { generateUniqueId, getResolvedValueType, isHexColor } from '../utils/helpers';
import Color from 'colorjs.io';
/**
 * Figma transformer for converting token data to Figma Variables API format
 *
 * This transformer converts design tokens from the token-model schema
 * into the format required by Figma's Variables API.
 *
 * Strategy:
 * 1. CREATE COLLECTIONS FOR EACH DIMENSION, which support each mode and house tokens that have values for these modes
 * 2. ALIAS VARIABLES from tokens that reference another tokenId as its value (eg value: { tokenId: '' })
 * 3. CREATE MODELESS COLLECTIONS for each tokenCollection. These collections should have Variables that are all ALIASES that point to variables from the DIMENSION / MODE collections.
 */
export class FigmaTransformer extends AbstractBaseTransformer {
    constructor() {
        super(...arguments);
        this.id = 'figma-variables';
        this.displayName = 'Figma Variables';
        this.description = 'Transform design tokens to Figma Variables API format';
        this.version = '1.0.0';
        // Cache for token ID to Figma variable ID mapping
        this.tokenIdToFigmaIdMap = new Map();
    }
    async validateInput(input, options) {
        const errors = [];
        const warnings = [];
        // Use the comprehensive validation from utils
        const validation = validateTokenSystem(input);
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
        // Figma credentials are only required for publishing, not for export/transform
        if (options) {
            const missingFileKey = !options.fileKey;
            const missingAccessToken = !options.accessToken;
            if (missingFileKey || missingAccessToken) {
                warnings.push({
                    path: 'options',
                    message: 'Figma file key and access token are required for publishing, but optional for export generation',
                    code: 'MISSING_FIGMA_CREDENTIALS'
                });
            }
        }
        const result = {
            isValid: errors.length === 0,
            errors,
            warnings
        };
        return result;
    }
    async performTransform(input, options) {
        console.log('[FigmaTransformer] performTransform called with', input.tokens?.length, 'tokens');
        console.log('[FigmaTransformer] DEBUG TEST - This should appear in console');
        // Validate input first
        const validation = await this.validate(input, options);
        // Only fail if there are actual schema errors, not just warnings about credentials
        if (!validation.isValid) {
            return {
                variables: [],
                collections: [],
                variableModes: [],
                stats: {
                    created: 0,
                    updated: 0,
                    deleted: 0,
                    collectionsCreated: 0,
                    collectionsUpdated: 0
                },
                error: {
                    code: 'VALIDATION_FAILED',
                    message: 'Input validation failed',
                    details: { validationErrors: validation.errors }
                }
            };
        }
        // Build token ID to Figma variable ID mapping from existing data
        this.buildTokenIdMapping(input, options?.existingFigmaData);
        const collections = [];
        const allVariables = [];
        const stats = {
            created: 0,
            updated: 0,
            deleted: 0,
            collectionsCreated: 0,
            collectionsUpdated: 0
        };
        // Step 1: Create collections for each dimension with modes
        const dimensionCollections = this.createDimensionCollections(input, options?.existingFigmaData);
        collections.push(...dimensionCollections);
        stats.collectionsCreated += dimensionCollections.filter(c => c.action === 'CREATE').length;
        stats.collectionsUpdated += dimensionCollections.filter(c => c.action === 'UPDATE').length;
        // Step 2: Create variables for each dimension collection
        const { variables, modeValues } = this.createDimensionVariables(input, dimensionCollections, options?.existingFigmaData);
        allVariables.push(...variables);
        stats.created += variables.filter(v => v.action === 'CREATE').length;
        stats.updated += variables.filter(v => v.action === 'UPDATE').length;
        // Step 3: Create modeless collections for each token collection
        const modelessCollections = this.createModelessCollections(input, dimensionCollections, variables, options?.existingFigmaData);
        collections.push(...modelessCollections);
        stats.collectionsCreated += modelessCollections.filter(c => c.action === 'CREATE').length;
        stats.collectionsUpdated += modelessCollections.filter(c => c.action === 'UPDATE').length;
        // Step 4: Create alias variables for modeless collections
        const aliasVariables = this.createAliasVariables(input, modelessCollections, variables, options?.existingFigmaData);
        allVariables.push(...aliasVariables);
        stats.created += aliasVariables.filter(v => v.action === 'CREATE').length;
        stats.updated += aliasVariables.filter(v => v.action === 'UPDATE').length;
        // Step 5: Create modes for all collections
        const variableModes = this.createVariableModes(input, options?.existingFigmaData);
        stats.collectionsUpdated += variableModes.filter(m => m.action === 'UPDATE').length;
        // Step 6: Collect all mode values
        const allModeValues = [];
        allModeValues.push(...modeValues);
        return {
            variables: allVariables,
            collections,
            variableModes,
            variableModeValues: allModeValues,
            stats
        };
    }
    /**
     * Build mapping between token IDs and existing Figma variable IDs based on name matching
     * This is used to determine CREATE vs UPDATE actions and proper alias references
     */
    buildTokenIdMapping(tokenSystem, existingData) {
        this.tokenIdToFigmaIdMap.clear();
        if (!existingData?.variables)
            return;
        // For each token, try to find a matching Figma variable by name
        for (const token of tokenSystem.tokens || []) {
            const figmaCodeSyntax = this.getFigmaCodeSyntax(token);
            if (!figmaCodeSyntax)
                continue;
            // Look for exact name match in existing Figma variables
            const matchingVariable = Object.values(existingData.variables).find(variable => variable.name === figmaCodeSyntax.formattedName);
            if (matchingVariable) {
                this.tokenIdToFigmaIdMap.set(token.id, matchingVariable.id);
            }
        }
    }
    /**
     * Get the appropriate ID for a token - either existing Figma ID or token ID
     */
    getTokenFigmaId(tokenId) {
        return this.tokenIdToFigmaIdMap.get(tokenId) || tokenId;
    }
    /**
     * Determine if an item exists in the Figma file by matching name
     */
    findExistingItemByName(items, name) {
        if (!items)
            return undefined;
        return Object.values(items).find(item => item.name === name);
    }
    /**
     * Determine if a mode exists in the Figma file by matching name and collection
     */
    findExistingModeByName(existingData, modeName, collectionId) {
        if (!existingData?.variableCollections)
            return undefined;
        // For now, we'll assume modes are stored in the collection data
        // This may need adjustment based on actual Figma API structure
        const collection = existingData.variableCollections[collectionId];
        if (!collection)
            return undefined;
        // This is a simplified check - in practice, modes might be stored differently
        return undefined;
    }
    /**
     * Create collections for each dimension with modes
     */
    createDimensionCollections(tokenSystem, existingData) {
        const collections = [];
        for (const dimension of tokenSystem.dimensions || []) {
            // Check if collection already exists
            const existingCollection = this.findExistingItemByName(existingData?.variableCollections, dimension.displayName);
            const collection = {
                action: existingCollection ? 'UPDATE' : 'CREATE',
                id: existingCollection?.id || dimension.id,
                name: dimension.displayName,
                initialModeId: dimension.defaultMode
            };
            collections.push(collection);
        }
        return collections;
    }
    /**
     * Get Figma code syntax for a token
     */
    getFigmaCodeSyntax(token) {
        if (!token.codeSyntax || token.codeSyntax.length === 0) {
            return undefined;
        }
        // Look for Figma platform specifically
        const figmaSyntax = token.codeSyntax.find((s) => s.platformId === 'figma' || s.platformId === 'platform-figma');
        if (figmaSyntax) {
            return {
                platformId: figmaSyntax.platformId,
                formattedName: figmaSyntax.formattedName
            };
        }
        // Fallback to first available syntax
        return {
            platformId: token.codeSyntax[0].platformId,
            formattedName: token.codeSyntax[0].formattedName
        };
    }
    /**
     * Create variables for each dimension collection with proper daisy-chaining
     */
    createDimensionVariables(tokenSystem, dimensionCollections, existingData) {
        const variables = [];
        const modeValues = [];
        for (const token of tokenSystem.tokens || []) {
            // Get the Figma code syntax for this token
            const figmaCodeSyntax = this.getFigmaCodeSyntax(token);
            if (!figmaCodeSyntax) {
                continue; // Skip tokens without Figma code syntax
            }
            // Check if this token has mode-specific values or global values
            const hasModeSpecificValues = token.valuesByMode?.some((vbm) => vbm.modeIds.length > 0) || false;
            const hasGlobalValues = token.valuesByMode?.some((vbm) => vbm.modeIds.length === 0) || false;
            if (hasModeSpecificValues) {
                // Handle mode-specific tokens with daisy-chaining
                const tokenDimension = this.findTokenDimension(token, tokenSystem);
                if (!tokenDimension) {
                    continue;
                }
                // Check if dimension variable already exists
                const dimensionVariableName = `${figmaCodeSyntax.formattedName} (${tokenDimension.displayName})`;
                const existingDimensionVariable = this.findExistingItemByName(existingData?.variables, dimensionVariableName);
                // Create dimension variable (hidden from publishing)
                const dimensionVariableId = existingDimensionVariable?.id || generateUniqueId(`dimension-${token.id}`);
                let resolvedType;
                try {
                    console.log(`[FigmaTransformer] About to call mapToFigmaVariableType for token: ${token.id}`);
                    resolvedType = this.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem);
                    console.log(`[FigmaTransformer] mapToFigmaVariableType returned: ${resolvedType} for token: ${token.id}`);
                }
                catch (error) {
                    console.error(`[FigmaTransformer] Error in mapToFigmaVariableType for token ${token.id}:`, error);
                    resolvedType = 'STRING'; // Fallback
                }
                const dimensionVariable = {
                    action: existingDimensionVariable ? 'UPDATE' : 'CREATE',
                    id: dimensionVariableId,
                    name: dimensionVariableName,
                    variableCollectionId: tokenDimension.id,
                    resolvedType: resolvedType,
                    scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
                    hiddenFromPublishing: true
                };
                variables.push(dimensionVariable);
                // Create mode values for the dimension variable
                for (const valueByMode of token.valuesByMode || []) {
                    if (valueByMode.modeIds.length === 0)
                        continue; // Skip global values
                    for (const modeId of valueByMode.modeIds) {
                        let resolvedValue;
                        if ('tokenId' in valueByMode.value) {
                            // Handle alias values - use the mapped Figma ID if available
                            const referencedTokenId = valueByMode.value.tokenId;
                            const referencedFigmaId = this.getTokenFigmaId(referencedTokenId);
                            resolvedValue = {
                                type: 'VARIABLE_ALIAS',
                                id: referencedFigmaId
                            };
                        }
                        else {
                            resolvedValue = valueByMode.value.value;
                        }
                        const figmaValue = this.convertValueToFigmaFormat(resolvedValue, dimensionVariable.resolvedType);
                        modeValues.push({
                            variableId: dimensionVariableId,
                            modeId: modeId,
                            value: figmaValue
                        });
                    }
                }
                // Find the token collection this token belongs to
                const tokenCollection = this.findTokenCollection(token, tokenSystem);
                if (tokenCollection) {
                    // Check if token collection variable already exists
                    const existingTokenCollectionVariable = this.findExistingItemByName(existingData?.variables, figmaCodeSyntax.formattedName);
                    // Create token collection variable (public, aliases to dimension variable)
                    const tokenCollectionVariableId = existingTokenCollectionVariable?.id || this.getTokenFigmaId(token.id);
                    const tokenCollectionVariable = {
                        action: existingTokenCollectionVariable ? 'UPDATE' : 'CREATE',
                        id: tokenCollectionVariableId,
                        name: figmaCodeSyntax.formattedName,
                        variableCollectionId: tokenCollection.id,
                        resolvedType: this.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
                        scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
                        hiddenFromPublishing: token.private || false,
                        codeSyntax: this.extractCodeSyntax(token)
                    };
                    variables.push(tokenCollectionVariable);
                    // Create mode value for token collection variable (aliases to dimension variable)
                    const tokenCollectionModeId = `mode-${tokenCollection.id}`;
                    modeValues.push({
                        variableId: tokenCollectionVariableId,
                        modeId: tokenCollectionModeId,
                        value: {
                            type: 'VARIABLE_ALIAS',
                            id: dimensionVariableId
                        }
                    });
                }
            }
            else if (hasGlobalValues) {
                // Handle global tokens (only in token collections)
                const tokenCollection = this.findTokenCollection(token, tokenSystem);
                if (!tokenCollection) {
                    continue;
                }
                // Check if token collection variable already exists
                const existingTokenCollectionVariable = this.findExistingItemByName(existingData?.variables, figmaCodeSyntax.formattedName);
                // Create token collection variable (public, with direct value)
                const tokenCollectionVariableId = existingTokenCollectionVariable?.id || this.getTokenFigmaId(token.id);
                const tokenCollectionVariable = {
                    action: existingTokenCollectionVariable ? 'UPDATE' : 'CREATE',
                    id: tokenCollectionVariableId,
                    name: figmaCodeSyntax.formattedName,
                    variableCollectionId: tokenCollection.id,
                    resolvedType: this.mapToFigmaVariableType(token.resolvedValueTypeId, tokenSystem),
                    scopes: this.mapPropertyTypesToScopes(token.propertyTypes || []),
                    hiddenFromPublishing: token.private || false,
                    codeSyntax: this.extractCodeSyntax(token)
                };
                variables.push(tokenCollectionVariable);
                // Create mode value for token collection variable (direct value)
                const tokenCollectionModeId = `mode-${tokenCollection.id}`;
                const globalValueByMode = token.valuesByMode?.find((vbm) => vbm.modeIds.length === 0);
                if (globalValueByMode) {
                    let resolvedValue;
                    if ('tokenId' in globalValueByMode.value) {
                        // Handle alias values - use the mapped Figma ID if available
                        const referencedTokenId = globalValueByMode.value.tokenId;
                        const referencedFigmaId = this.getTokenFigmaId(referencedTokenId);
                        resolvedValue = {
                            type: 'VARIABLE_ALIAS',
                            id: referencedFigmaId
                        };
                    }
                    else {
                        resolvedValue = globalValueByMode.value.value;
                    }
                    const figmaValue = this.convertValueToFigmaFormat(resolvedValue, tokenCollectionVariable.resolvedType);
                    modeValues.push({
                        variableId: tokenCollectionVariableId,
                        modeId: tokenCollectionModeId,
                        value: figmaValue
                    });
                }
            }
        }
        return { variables, modeValues };
    }
    /**
     * Find which dimension a token belongs to based on its modeIds
     */
    findTokenDimension(token, tokenSystem) {
        for (const dimension of tokenSystem.dimensions || []) {
            for (const valueByMode of token.valuesByMode || []) {
                for (const modeId of valueByMode.modeIds) {
                    const mode = dimension.modes?.find((m) => m.id === modeId);
                    if (mode) {
                        return dimension;
                    }
                }
            }
        }
        return null;
    }
    /**
     * Find which token collection a token belongs to based on its resolvedValueTypeId
     */
    findTokenCollection(token, tokenSystem) {
        return tokenSystem.tokenCollections?.find((collection) => collection.resolvedValueTypeIds.includes(token.resolvedValueTypeId)) || null;
    }
    /**
     * Map property types to Figma scopes
     */
    mapPropertyTypesToScopes(propertyTypes) {
        if (propertyTypes.includes('ALL_PROPERTY_TYPES') || propertyTypes.length === 0) {
            return ['ALL_SCOPES'];
        }
        return propertyTypes;
    }
    /**
     * Extract code syntax for non-Figma platforms
     */
    extractCodeSyntax(token) {
        if (!token.codeSyntax || token.codeSyntax.length <= 1) {
            return undefined;
        }
        const otherPlatformSyntax = token.codeSyntax
            .filter((s) => s.platformId !== 'figma' && s.platformId !== 'platform-figma')
            .reduce((acc, syntax) => {
            // Map platform IDs to display names (you may need to adjust this mapping)
            const platformName = this.mapPlatformIdToName(syntax.platformId);
            acc[platformName] = syntax.formattedName;
            return acc;
        }, {});
        return Object.keys(otherPlatformSyntax).length > 0 ? otherPlatformSyntax : undefined;
    }
    /**
     * Map platform ID to display name
     */
    mapPlatformIdToName(platformId) {
        // This mapping should be based on the actual platform data
        const platformMap = {
            'css': 'CSS',
            'scss': 'SCSS',
            'sass': 'Sass',
            'less': 'Less',
            'js': 'JavaScript',
            'ts': 'TypeScript',
            'react': 'React',
            'vue': 'Vue',
            'angular': 'Angular',
            'ios': 'iOS',
            'android': 'Android',
            'flutter': 'Flutter',
            'swift': 'Swift',
            'kotlin': 'Kotlin'
        };
        return platformMap[platformId] || platformId;
    }
    /**
     * Create modeless collections for each token collection
     */
    createModelessCollections(tokenSystem, dimensionCollections, dimensionVariables, existingData) {
        const collections = [];
        for (const collection of tokenSystem.tokenCollections || []) {
            // Check if collection already exists
            const existingCollection = this.findExistingItemByName(existingData?.variableCollections, collection.name);
            const modelessCollection = {
                action: existingCollection ? 'UPDATE' : 'CREATE',
                id: existingCollection?.id || collection.id,
                name: collection.name,
                initialModeId: `mode-${collection.id}`
            };
            collections.push(modelessCollection);
        }
        return collections;
    }
    /**
     * Create alias variables for modeless collections
     */
    createAliasVariables(tokenSystem, modelessCollections, dimensionVariables, existingData) {
        // This method is not needed for the current Figma API structure
        // Alias handling is done in createDimensionVariables
        return [];
    }
    /**
     * Create modes for all collections
     */
    createVariableModes(tokenSystem, existingData) {
        const modes = [];
        // Create "Value" modes for token collections
        for (const collection of tokenSystem.tokenCollections || []) {
            const modeId = `mode-${collection.id}`;
            modes.push({
                action: 'UPDATE', // Initial modes always use UPDATE
                id: modeId,
                name: 'Value',
                variableCollectionId: collection.id
            });
        }
        // Create modes for dimensions
        for (const dimension of tokenSystem.dimensions || []) {
            for (const mode of dimension.modes || []) {
                const isDefaultMode = mode.id === dimension.defaultMode;
                modes.push({
                    action: isDefaultMode ? 'UPDATE' : 'CREATE', // Default mode uses UPDATE, others use CREATE
                    id: mode.id,
                    name: mode.name,
                    variableCollectionId: dimension.id
                });
            }
        }
        return modes;
    }
    /**
     * Map resolved value type to Figma variable type
     */
    mapToFigmaVariableType(resolvedValueTypeId, tokenSystem) {
        console.log(`[FigmaTransformer] mapToFigmaVariableType called with resolvedValueTypeId: "${resolvedValueTypeId}"`);
        console.log(`[FigmaTransformer] tokenSystem.resolvedValueTypes:`, tokenSystem.resolvedValueTypes);
        const resolvedValueType = getResolvedValueType(tokenSystem, resolvedValueTypeId);
        console.log(`[FigmaTransformer] getResolvedValueType result:`, resolvedValueType);
        if (!resolvedValueType) {
            console.log(`[FigmaTransformer] No resolvedValueType found, returning 'STRING'`);
            return 'STRING'; // Default fallback
        }
        // Map based on the id field (which is what we use in the schema)
        const type = resolvedValueType.id || resolvedValueType.type || resolvedValueType.displayName?.toLowerCase();
        console.log(`[FigmaTransformer] Mapping resolvedValueTypeId "${resolvedValueTypeId}" to Figma type:`, {
            resolvedValueType,
            type,
            result: type === 'color' ? 'COLOR' : type
        });
        switch (type) {
            case 'color':
                console.log(`[FigmaTransformer] Returning 'COLOR' for type: ${type}`);
                return 'COLOR';
            case 'spacing':
            case 'font-size':
            case 'line_height':
            case 'letter_spacing':
            case 'blur':
            case 'spread':
            case 'radius':
            case 'opacity':
                console.log(`[FigmaTransformer] Returning 'FLOAT' for type: ${type}`);
                return 'FLOAT';
            case 'font_family':
            case 'font_weight':
            case 'duration':
            case 'cubic_bezier':
            case 'shadow':
            case 'border':
            case 'z_index':
                console.log(`[FigmaTransformer] Returning 'STRING' for type: ${type}`);
                return 'STRING';
            default:
                console.log(`[FigmaTransformer] Returning 'STRING' (default) for type: ${type}`);
                return 'STRING';
        }
    }
    /**
     * Convert token value to Figma format
     */
    convertValueToFigmaFormat(value, figmaType) {
        console.log(`[FigmaTransformer] convertValueToFigmaFormat called with:`, {
            value,
            figmaType,
            valueType: typeof value
        });
        // Handle alias values directly
        if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
            const aliasValue = value;
            console.log(`[FigmaTransformer] Handling alias value:`, aliasValue);
            return {
                type: 'VARIABLE_ALIAS',
                id: aliasValue.id || aliasValue.variableId || ''
            };
        }
        switch (figmaType) {
            case 'COLOR':
                console.log(`[FigmaTransformer] Converting to COLOR format:`, value);
                return this.convertToFigmaColor(value);
            case 'FLOAT':
                console.log(`[FigmaTransformer] Converting to FLOAT format:`, value);
                return this.convertToFigmaFloat(value);
            case 'STRING':
                console.log(`[FigmaTransformer] Converting to STRING format:`, value);
                return this.convertToFigmaString(value);
            case 'BOOLEAN':
                console.log(`[FigmaTransformer] Converting to BOOLEAN format:`, value);
                return this.convertToFigmaBoolean(value);
            default:
                console.log(`[FigmaTransformer] Converting to default STRING format:`, value);
                return String(value);
        }
    }
    /**
     * Convert value to Figma color format using colorjs.io
     * Returns RGB object with optional alpha: { r: number, g: number, b: number, a?: number }
     */
    convertToFigmaColor(value) {
        try {
            if (typeof value === 'string') {
                // Check if it's a hex color
                if (isHexColor(value)) {
                    // Parse the hex color string using colorjs.io
                    const color = new Color(value);
                    const rgb = color.to('srgb');
                    // Convert to 0-255 range and round to integers
                    const result = {
                        r: Math.round(rgb.coords[0] * 255),
                        g: Math.round(rgb.coords[1] * 255),
                        b: Math.round(rgb.coords[2] * 255)
                    };
                    // Add alpha if not 1.0
                    if (rgb.alpha !== undefined && rgb.alpha !== 1) {
                        result.a = rgb.alpha;
                    }
                    console.log(`[FigmaTransformer] Color conversion: "${value}" ->`, result);
                    return result;
                }
                else {
                    // Try to parse other color formats
                    const color = new Color(value);
                    const rgb = color.to('srgb');
                    const result = {
                        r: Math.round(rgb.coords[0] * 255),
                        g: Math.round(rgb.coords[1] * 255),
                        b: Math.round(rgb.coords[2] * 255)
                    };
                    if (rgb.alpha !== undefined && rgb.alpha !== 1) {
                        result.a = rgb.alpha;
                    }
                    console.log(`[FigmaTransformer] Color conversion: "${value}" ->`, result);
                    return result;
                }
            }
            if (typeof value === 'object' && value !== null) {
                const colorObj = value;
                // If it's already an RGB object, return it with alpha
                if (colorObj.r !== undefined && colorObj.g !== undefined && colorObj.b !== undefined) {
                    const result = {
                        r: Math.round(colorObj.r),
                        g: Math.round(colorObj.g),
                        b: Math.round(colorObj.b)
                    };
                    // Add alpha if present
                    if (colorObj.a !== undefined) {
                        result.a = colorObj.a;
                    }
                    console.log(`[FigmaTransformer] RGB object conversion:`, colorObj, `->`, result);
                    return result;
                }
                // If it has hex property, convert it
                if (colorObj.hex) {
                    return this.convertToFigmaColor(colorObj.hex);
                }
                // If it has rgb property, convert it
                if (colorObj.rgb) {
                    const { r, g, b, a } = colorObj.rgb;
                    const result = {
                        r: Math.round(r),
                        g: Math.round(g),
                        b: Math.round(b)
                    };
                    if (a !== undefined) {
                        result.a = a;
                    }
                    console.log(`[FigmaTransformer] RGB property conversion:`, colorObj.rgb, `->`, result);
                    return result;
                }
            }
            // Default fallback
            console.log(`[FigmaTransformer] Color conversion fallback for:`, value, `-> {r: 0, g: 0, b: 0}`);
            return { r: 0, g: 0, b: 0 };
        }
        catch (error) {
            // If colorjs.io fails to parse the color, return default
            console.log(`[FigmaTransformer] Color conversion error for:`, value, `-> {r: 0, g: 0, b: 0}`, error);
            return { r: 0, g: 0, b: 0 };
        }
    }
    /**
     * Convert value to Figma float format
     */
    convertToFigmaFloat(value) {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            // Try to extract numeric value from dimension strings like "16px", "1.5rem"
            const match = value.match(/^([0-9]+(\.[0-9]+)?)/);
            if (match) {
                return parseFloat(match[1]);
            }
        }
        if (typeof value === 'object' && value !== null) {
            const dimObj = value;
            if (typeof dimObj.value === 'number') {
                return dimObj.value;
            }
        }
        return 0; // Default fallback
    }
    /**
     * Convert value to Figma string format
     */
    convertToFigmaString(value) {
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return String(value);
    }
    /**
     * Convert value to Figma boolean format
     */
    convertToFigmaBoolean(value) {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            return value.toLowerCase() === 'true';
        }
        if (typeof value === 'number') {
            return value !== 0;
        }
        return Boolean(value);
    }
    /**
     * Returns a placeholder value for an alias variable, based on the resolved value type
     */
    getAliasPlaceholderValue(tokenSystem, resolvedValueTypeId) {
        const figmaType = this.mapToFigmaVariableType(resolvedValueTypeId, tokenSystem);
        switch (figmaType) {
            case 'COLOR':
                return { r: 0, g: 0, b: 0 };
            case 'FLOAT':
                return 0;
            case 'BOOLEAN':
                return false;
            case 'STRING':
            default:
                return '';
        }
    }
    getSupportedInputTypes() {
        return ['TokenSystem'];
    }
    getSupportedOutputTypes() {
        return ['FigmaTransformationResult'];
    }
    getRequiredOptions() {
        // Only require credentials for publishing, not for export/preview
        return [];
    }
    getOptionalOptions() {
        return [
            'id',
            'metadata',
            'collectionName',
            'createNewCollection',
            'existingCollectionId',
            'updateExisting',
            'deleteUnused'
        ];
    }
}
