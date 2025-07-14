export * from './schema';
export type { StandardValueType, ResolvedValueType, TokenStatus, TokenTier, FallbackStrategy, ColorValue, DimensionValue, DurationValue, CubicBezierValue, ShadowValue, TypographyValue, BorderValue, TokenValue, Mode, Dimension, TokenCollection, Token, TokenGroup, TokenVariant, TokenSystem, Platform, Taxonomy, TaxonomyTerm, TokenTaxonomyRef } from './schema';
export { StandardValueType as StandardValueTypeSchema, ResolvedValueType as ResolvedValueTypeSchema, TokenStatus as TokenStatusSchema, TokenTier as TokenTierSchema, FallbackStrategy as FallbackStrategySchema, TokenValue as TokenValueSchema, Mode as ModeSchema, Dimension as DimensionSchema, TokenCollection as TokenCollectionSchema, Token as TokenSchema, TokenGroup as TokenGroupSchema, TokenVariant as TokenVariantSchema, TokenSystem as TokenSystemSchema, Platform as PlatformSchema, Taxonomy as TaxonomySchema, TokenTaxonomyRef as TokenTaxonomyRefSchema } from './schema';
export { ColorValue as ColorValueSchema, DimensionValue as DimensionValueSchema, DurationValue as DurationValueSchema, CubicBezierValue as CubicBezierValueSchema, ShadowValue as ShadowValueSchema, TypographyValue as TypographyValueSchema, BorderValue as BorderValueSchema } from './schema';
/**
 * Validates that if any entry in valuesByMode has modeIds: [], it must be the only entry in the array.
 * Otherwise, all entries must have modeIds.length > 0.
 * Returns true if valid, or an error message string if invalid.
 */
export declare function validateTokenValuesByMode(valuesByMode: {
    modeIds: string[];
    value: import('./schema').TokenValue;
}[]): true | string;
export declare const exampleData: {
    readonly core: () => Promise<{
        default: {
            version: string;
            description: string;
            systemName: string;
            systemId: string;
            tokenCollections: {
                id: string;
                name: string;
                resolvedValueTypeIds: string[];
                private: boolean;
                supportedDimensionIds: string[];
                defaultModeIds: string[];
                modeResolutionStrategy: {
                    priorityByType: string[];
                    fallbackStrategy: string;
                };
            }[];
            dimensions: {
                id: string;
                displayName: string;
                modes: {
                    id: string;
                    name: string;
                    dimensionId: string;
                }[];
                required: boolean;
                defaultMode: string;
                resolvedValueTypeIds: string[];
            }[];
            tokens: {
                id: string;
                displayName: string;
                description: string;
                tokenCollectionId: string;
                resolvedValueTypeId: string;
                private: boolean;
                status: string;
                tokenTier: string;
                themeable: boolean;
                taxonomies: {
                    taxonomyId: string;
                    termId: string;
                }[];
                propertyTypes: string[];
                codeSyntax: {
                    platformId: string;
                    formattedName: string;
                }[];
                valuesByMode: {
                    modeIds: never[];
                    value: {
                        value: string;
                    };
                }[];
            }[];
            platforms: {
                id: string;
                displayName: string;
                syntaxPatterns: {
                    prefix: string;
                    suffix: string;
                    delimiter: string;
                    capitalization: string;
                };
            }[];
            taxonomies: {
                id: string;
                name: string;
                description: string;
                terms: {
                    id: string;
                    name: string;
                    description: string;
                }[];
            }[];
            themes: ({
                id: string;
                displayName: string;
                platforms: string[];
                isDefault: boolean;
                overrideFileUri?: undefined;
            } | {
                id: string;
                displayName: string;
                platforms: string[];
                isDefault: boolean;
                overrideFileUri: string;
            })[];
            namingRules: {
                taxonomyOrder: string[];
            };
            resolvedValueTypes: ({
                id: string;
                displayName: string;
                type: string;
            } | {
                id: string;
                displayName: string;
                type?: undefined;
            })[];
            versionHistory: {
                version: string;
                dimensions: string[];
                date: string;
            }[];
        };
        version: string;
        description: string;
        systemName: string;
        systemId: string;
        tokenCollections: {
            id: string;
            name: string;
            resolvedValueTypeIds: string[];
            private: boolean;
            supportedDimensionIds: string[];
            defaultModeIds: string[];
            modeResolutionStrategy: {
                priorityByType: string[];
                fallbackStrategy: string;
            };
        }[];
        dimensions: {
            id: string;
            displayName: string;
            modes: {
                id: string;
                name: string;
                dimensionId: string;
            }[];
            required: boolean;
            defaultMode: string;
            resolvedValueTypeIds: string[];
        }[];
        tokens: {
            id: string;
            displayName: string;
            description: string;
            tokenCollectionId: string;
            resolvedValueTypeId: string;
            private: boolean;
            status: string;
            tokenTier: string;
            themeable: boolean;
            taxonomies: {
                taxonomyId: string;
                termId: string;
            }[];
            propertyTypes: string[];
            codeSyntax: {
                platformId: string;
                formattedName: string;
            }[];
            valuesByMode: {
                modeIds: never[];
                value: {
                    value: string;
                };
            }[];
        }[];
        platforms: {
            id: string;
            displayName: string;
            syntaxPatterns: {
                prefix: string;
                suffix: string;
                delimiter: string;
                capitalization: string;
            };
        }[];
        taxonomies: {
            id: string;
            name: string;
            description: string;
            terms: {
                id: string;
                name: string;
                description: string;
            }[];
        }[];
        themes: ({
            id: string;
            displayName: string;
            platforms: string[];
            isDefault: boolean;
            overrideFileUri?: undefined;
        } | {
            id: string;
            displayName: string;
            platforms: string[];
            isDefault: boolean;
            overrideFileUri: string;
        })[];
        namingRules: {
            taxonomyOrder: string[];
        };
        resolvedValueTypes: ({
            id: string;
            displayName: string;
            type: string;
        } | {
            id: string;
            displayName: string;
            type?: undefined;
        })[];
        versionHistory: {
            version: string;
            dimensions: string[];
            date: string;
        }[];
    }>;
    readonly brandAOverrides: () => Promise<{
        default: {
            themeId: string;
            systemId: string;
            tokenOverrides: {
                tokenId: string;
                valuesByMode: {
                    modeIds: never[];
                    value: {
                        type: string;
                        value: string;
                    };
                }[];
            }[];
        };
        themeId: string;
        systemId: string;
        tokenOverrides: {
            tokenId: string;
            valuesByMode: {
                modeIds: never[];
                value: {
                    type: string;
                    value: string;
                };
            }[];
        }[];
    }>;
    readonly brandBOverrides: () => Promise<{
        default: {
            themeId: string;
            systemId: string;
            tokenOverrides: {
                tokenId: string;
                valuesByMode: {
                    modeIds: never[];
                    value: {
                        type: string;
                        value: string;
                    };
                }[];
            }[];
        };
        themeId: string;
        systemId: string;
        tokenOverrides: {
            tokenId: string;
            valuesByMode: {
                modeIds: never[];
                value: {
                    type: string;
                    value: string;
                };
            }[];
        }[];
    }>;
    readonly minimal: () => Promise<{
        default: {
            systemName: string;
            systemId: string;
            description: string;
            version: string;
            versionHistory: {
                version: string;
                dimensions: string[];
                date: string;
            }[];
            tokenCollections: ({
                id: string;
                name: string;
                resolvedValueTypeIds: string[];
                private: boolean;
                description?: undefined;
            } | {
                name: string;
                description: string;
                resolvedValueTypeIds: string[];
                private: boolean;
                id: string;
            })[];
            dimensions: ({
                id: string;
                displayName: string;
                modes: {
                    id: string;
                    name: string;
                    dimensionId: string;
                }[];
                required: boolean;
                defaultMode: string;
                resolvedValueTypeIds: string[];
                description?: undefined;
            } | {
                id: string;
                displayName: string;
                description: string;
                modes: {
                    id: string;
                    name: string;
                    description: string;
                    dimensionId: string;
                }[];
                defaultMode: string;
                required: boolean;
                resolvedValueTypeIds: string[];
            })[];
            dimensionOrder: string[];
            tokens: ({
                id: string;
                displayName: string;
                description: string;
                resolvedValueTypeId: string;
                private: boolean;
                status: string;
                tokenTier: string;
                themeable: boolean;
                taxonomies: {
                    taxonomyId: string;
                    termId: string;
                }[];
                propertyTypes: string[];
                codeSyntax: {
                    platformId: string;
                    formattedName: string;
                }[];
                valuesByMode: {
                    modeIds: string[];
                    value: {
                        value: string;
                    };
                    platformOverrides: {
                        platformId: string;
                        value: string;
                        metadata: {
                            description: string;
                        };
                    }[];
                }[];
                generatedByAlgorithm?: undefined;
                algorithmId?: undefined;
            } | {
                id: string;
                displayName: string;
                description: string;
                resolvedValueTypeId: string;
                private: boolean;
                status: string;
                tokenTier: string;
                themeable: boolean;
                taxonomies: {
                    taxonomyId: string;
                    termId: string;
                }[];
                propertyTypes: string[];
                codeSyntax: {
                    platformId: string;
                    formattedName: string;
                }[];
                valuesByMode: ({
                    modeIds: string[];
                    value: {
                        tokenId: string;
                        value?: undefined;
                    };
                    platformOverrides: {
                        platformId: string;
                        value: string;
                    }[];
                } | {
                    modeIds: string[];
                    value: {
                        value: string;
                        tokenId?: undefined;
                    };
                    platformOverrides: {
                        platformId: string;
                        value: string;
                    }[];
                })[];
                generatedByAlgorithm?: undefined;
                algorithmId?: undefined;
            } | {
                id: string;
                displayName: string;
                description: string;
                resolvedValueTypeId: string;
                propertyTypes: never[];
                private: boolean;
                themeable: boolean;
                status: string;
                tokenTier: string;
                taxonomies: {
                    taxonomyId: string;
                    termId: string;
                }[];
                codeSyntax: {
                    platformId: string;
                    formattedName: string;
                }[];
                valuesByMode: {
                    modeIds: never[];
                    value: {
                        value: number;
                    };
                    platformOverrides: never[];
                }[];
                generatedByAlgorithm?: undefined;
                algorithmId?: undefined;
            } | {
                id: string;
                displayName: string;
                resolvedValueTypeId: string;
                description: string;
                private: boolean;
                status: string;
                themeable: boolean;
                tokenTier: string;
                generatedByAlgorithm: boolean;
                algorithmId: string;
                taxonomies: {
                    taxonomyId: string;
                    termId: string;
                }[];
                propertyTypes: never[];
                codeSyntax: never[];
                valuesByMode: {
                    modeIds: never[];
                    value: {
                        value: string;
                    };
                }[];
            })[];
            platforms: {
                id: string;
                displayName: string;
                syntaxPatterns: {
                    prefix: string;
                    suffix: string;
                    delimiter: string;
                    capitalization: string;
                    formatString: string;
                };
            }[];
            themes: {
                id: string;
                displayName: string;
                isDefault: boolean;
                description: string;
            }[];
            taxonomies: {
                id: string;
                name: string;
                description: string;
                terms: {
                    id: string;
                    name: string;
                    description: string;
                }[];
                resolvedValueTypeIds: string[];
            }[];
            resolvedValueTypes: ({
                id: string;
                displayName: string;
                type: string;
            } | {
                id: string;
                displayName: string;
                type?: undefined;
            })[];
            namingRules: {
                taxonomyOrder: string[];
            };
        };
        systemName: string;
        systemId: string;
        description: string;
        version: string;
        versionHistory: {
            version: string;
            dimensions: string[];
            date: string;
        }[];
        tokenCollections: ({
            id: string;
            name: string;
            resolvedValueTypeIds: string[];
            private: boolean;
            description?: undefined;
        } | {
            name: string;
            description: string;
            resolvedValueTypeIds: string[];
            private: boolean;
            id: string;
        })[];
        dimensions: ({
            id: string;
            displayName: string;
            modes: {
                id: string;
                name: string;
                dimensionId: string;
            }[];
            required: boolean;
            defaultMode: string;
            resolvedValueTypeIds: string[];
            description?: undefined;
        } | {
            id: string;
            displayName: string;
            description: string;
            modes: {
                id: string;
                name: string;
                description: string;
                dimensionId: string;
            }[];
            defaultMode: string;
            required: boolean;
            resolvedValueTypeIds: string[];
        })[];
        dimensionOrder: string[];
        tokens: ({
            id: string;
            displayName: string;
            description: string;
            resolvedValueTypeId: string;
            private: boolean;
            status: string;
            tokenTier: string;
            themeable: boolean;
            taxonomies: {
                taxonomyId: string;
                termId: string;
            }[];
            propertyTypes: string[];
            codeSyntax: {
                platformId: string;
                formattedName: string;
            }[];
            valuesByMode: {
                modeIds: string[];
                value: {
                    value: string;
                };
                platformOverrides: {
                    platformId: string;
                    value: string;
                    metadata: {
                        description: string;
                    };
                }[];
            }[];
            generatedByAlgorithm?: undefined;
            algorithmId?: undefined;
        } | {
            id: string;
            displayName: string;
            description: string;
            resolvedValueTypeId: string;
            private: boolean;
            status: string;
            tokenTier: string;
            themeable: boolean;
            taxonomies: {
                taxonomyId: string;
                termId: string;
            }[];
            propertyTypes: string[];
            codeSyntax: {
                platformId: string;
                formattedName: string;
            }[];
            valuesByMode: ({
                modeIds: string[];
                value: {
                    tokenId: string;
                    value?: undefined;
                };
                platformOverrides: {
                    platformId: string;
                    value: string;
                }[];
            } | {
                modeIds: string[];
                value: {
                    value: string;
                    tokenId?: undefined;
                };
                platformOverrides: {
                    platformId: string;
                    value: string;
                }[];
            })[];
            generatedByAlgorithm?: undefined;
            algorithmId?: undefined;
        } | {
            id: string;
            displayName: string;
            description: string;
            resolvedValueTypeId: string;
            propertyTypes: never[];
            private: boolean;
            themeable: boolean;
            status: string;
            tokenTier: string;
            taxonomies: {
                taxonomyId: string;
                termId: string;
            }[];
            codeSyntax: {
                platformId: string;
                formattedName: string;
            }[];
            valuesByMode: {
                modeIds: never[];
                value: {
                    value: number;
                };
                platformOverrides: never[];
            }[];
            generatedByAlgorithm?: undefined;
            algorithmId?: undefined;
        } | {
            id: string;
            displayName: string;
            resolvedValueTypeId: string;
            description: string;
            private: boolean;
            status: string;
            themeable: boolean;
            tokenTier: string;
            generatedByAlgorithm: boolean;
            algorithmId: string;
            taxonomies: {
                taxonomyId: string;
                termId: string;
            }[];
            propertyTypes: never[];
            codeSyntax: never[];
            valuesByMode: {
                modeIds: never[];
                value: {
                    value: string;
                };
            }[];
        })[];
        platforms: {
            id: string;
            displayName: string;
            syntaxPatterns: {
                prefix: string;
                suffix: string;
                delimiter: string;
                capitalization: string;
                formatString: string;
            };
        }[];
        themes: {
            id: string;
            displayName: string;
            isDefault: boolean;
            description: string;
        }[];
        taxonomies: {
            id: string;
            name: string;
            description: string;
            terms: {
                id: string;
                name: string;
                description: string;
            }[];
            resolvedValueTypeIds: string[];
        }[];
        resolvedValueTypes: ({
            id: string;
            displayName: string;
            type: string;
        } | {
            id: string;
            displayName: string;
            type?: undefined;
        })[];
        namingRules: {
            taxonomyOrder: string[];
        };
    }>;
};
export declare const algorithmData: {
    readonly core: () => Promise<{
        default: {
            schemaVersion: string;
            profile: string;
            metadata: {
                name: string;
                description: string;
                author: string;
                version: string;
            };
            config: {
                baseUnit: number;
                scaleFactor: number;
                precision: number;
            };
            algorithms: ({
                id: string;
                name: string;
                description: string;
                resolvedValueTypeId: string;
                variables: {
                    id: string;
                    name: string;
                    type: string;
                    defaultValue: string;
                }[];
                formulas: {
                    id: string;
                    name: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                variableName: string;
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            right: {
                                type: string;
                                functionName: string;
                                arguments: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                }[];
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                    };
                    description: string;
                    variableIds: string[];
                }[];
                conditions: never[];
                steps: {
                    type: string;
                    id: string;
                    name: string;
                }[];
            } | {
                id: string;
                name: string;
                description: string;
                resolvedValueTypeId: string;
                variables: {
                    id: string;
                    name: string;
                    type: string;
                    defaultValue: string;
                }[];
                formulas: {
                    id: string;
                    name: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            value: string;
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                    };
                    description: string;
                    variableIds: string[];
                }[];
                conditions: never[];
                steps: {
                    type: string;
                    id: string;
                    name: string;
                }[];
            })[];
            execution: {
                order: string[];
                parallel: boolean;
                onError: string;
            };
            integration: {
                targetSchema: string;
                outputFormat: string;
                mergeStrategy: string;
                validation: boolean;
            };
        };
        schemaVersion: string;
        profile: string;
        metadata: {
            name: string;
            description: string;
            author: string;
            version: string;
        };
        config: {
            baseUnit: number;
            scaleFactor: number;
            precision: number;
        };
        algorithms: ({
            id: string;
            name: string;
            description: string;
            resolvedValueTypeId: string;
            variables: {
                id: string;
                name: string;
                type: string;
                defaultValue: string;
            }[];
            formulas: {
                id: string;
                name: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        operator: string;
                        left: {
                            type: string;
                            variableName: string;
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                        right: {
                            type: string;
                            functionName: string;
                            arguments: {
                                type: string;
                                variableName: string;
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            }[];
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                    };
                };
                description: string;
                variableIds: string[];
            }[];
            conditions: never[];
            steps: {
                type: string;
                id: string;
                name: string;
            }[];
        } | {
            id: string;
            name: string;
            description: string;
            resolvedValueTypeId: string;
            variables: {
                id: string;
                name: string;
                type: string;
                defaultValue: string;
            }[];
            formulas: {
                id: string;
                name: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        value: string;
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                    };
                };
                description: string;
                variableIds: string[];
            }[];
            conditions: never[];
            steps: {
                type: string;
                id: string;
                name: string;
            }[];
        })[];
        execution: {
            order: string[];
            parallel: boolean;
            onError: string;
        };
        integration: {
            targetSchema: string;
            outputFormat: string;
            mergeStrategy: string;
            validation: boolean;
        };
    } | null>;
    readonly minimal: () => Promise<{
        default: {
            schemaVersion: string;
            profile: string;
            metadata: {
                name: string;
                description: string;
                version: string;
                author: string;
            };
            config: {
                systemVariables: {
                    id: string;
                    name: string;
                    type: string;
                    defaultValue: number;
                    description: string;
                    modeBased: boolean;
                    dimensionId: string;
                    valuesByMode: {
                        modeIds: string[];
                        value: number;
                    }[];
                }[];
                defaultBaseValue: number;
                defaultRatio: number;
                defaultSpacing: number;
                baseMultiplier: number;
                baseRatio: number;
                progressiveRatio: number;
                maxRatio: number;
            };
            algorithms: ({
                id: string;
                name: string;
                description: string;
                resolvedValueTypeId: string;
                variables: {
                    id: string;
                    name: string;
                    type: string;
                    defaultValue: string;
                    description: string;
                }[];
                formulas: ({
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                functionName: string;
                                arguments: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                }[];
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            right: {
                                type: string;
                                functionName: string;
                                arguments: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                }[];
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                            variableName?: undefined;
                            expression?: undefined;
                        };
                    };
                    variableIds: string[];
                } | {
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            variableName: string;
                            expression: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    operator: string;
                                    left: {
                                        type: string;
                                        value: number;
                                        functionName?: undefined;
                                        arguments?: undefined;
                                        metadata?: undefined;
                                        variableName?: undefined;
                                    };
                                    right: {
                                        type: string;
                                        value: number;
                                        functionName?: undefined;
                                        arguments?: undefined;
                                        metadata?: undefined;
                                        operator?: undefined;
                                        left?: undefined;
                                        right?: undefined;
                                        variableName?: undefined;
                                    };
                                    metadata?: undefined;
                                };
                                right: {
                                    type: string;
                                    variableName: string;
                                    operator?: undefined;
                                    left?: undefined;
                                    right?: undefined;
                                    metadata?: undefined;
                                };
                                metadata?: undefined;
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                            operator?: undefined;
                            left?: undefined;
                            right?: undefined;
                        };
                    };
                    variableIds: string[];
                } | {
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            variableName: string;
                            expression: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    operator: string;
                                    left: {
                                        type: string;
                                        functionName: string;
                                        arguments: {
                                            type: string;
                                            variableName: string;
                                            metadata: {
                                                astVersion: string;
                                                validationErrors: never[];
                                                complexity: string;
                                            };
                                        }[];
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                        value?: undefined;
                                        variableName?: undefined;
                                    };
                                    right: {
                                        type: string;
                                        functionName: string;
                                        arguments: {
                                            type: string;
                                            variableName: string;
                                            metadata: {
                                                astVersion: string;
                                                validationErrors: never[];
                                                complexity: string;
                                            };
                                        }[];
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                        value?: undefined;
                                        operator?: undefined;
                                        left?: undefined;
                                        right?: undefined;
                                        variableName?: undefined;
                                    };
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                };
                                right: {
                                    type: string;
                                    operator: string;
                                    left: {
                                        type: string;
                                        functionName: string;
                                        arguments: {
                                            type: string;
                                            variableName: string;
                                            metadata: {
                                                astVersion: string;
                                                validationErrors: never[];
                                                complexity: string;
                                            };
                                        }[];
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                        value?: undefined;
                                    };
                                    right: {
                                        type: string;
                                        functionName: string;
                                        arguments: {
                                            type: string;
                                            variableName: string;
                                            metadata: {
                                                astVersion: string;
                                                validationErrors: never[];
                                                complexity: string;
                                            };
                                        }[];
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                        variableName?: undefined;
                                    };
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    variableName?: undefined;
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                            operator?: undefined;
                            left?: undefined;
                            right?: undefined;
                        };
                    };
                    variableIds: string[];
                } | {
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            variableName: string;
                            expression: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    operator: string;
                                    left: {
                                        type: string;
                                        value: number;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                        functionName?: undefined;
                                        arguments?: undefined;
                                        variableName?: undefined;
                                    };
                                    right: {
                                        type: string;
                                        operator: string;
                                        left: {
                                            type: string;
                                            value: number;
                                            metadata: {
                                                astVersion: string;
                                                validationErrors: never[];
                                                complexity: string;
                                            };
                                        };
                                        right: {
                                            type: string;
                                            variableName: string;
                                            metadata: {
                                                astVersion: string;
                                                validationErrors: never[];
                                                complexity: string;
                                            };
                                        };
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                        value?: undefined;
                                        functionName?: undefined;
                                        arguments?: undefined;
                                        variableName?: undefined;
                                    };
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                };
                                right: {
                                    type: string;
                                    operator: string;
                                    left: {
                                        type: string;
                                        value: number;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                        functionName?: undefined;
                                        arguments?: undefined;
                                    };
                                    right: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                        functionName?: undefined;
                                        arguments?: undefined;
                                    };
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    variableName?: undefined;
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                            operator?: undefined;
                            left?: undefined;
                            right?: undefined;
                        };
                    };
                    variableIds: string[];
                } | {
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            variableName: string;
                            expression: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    operator: string;
                                    left: {
                                        type: string;
                                        variableName: string;
                                        value?: undefined;
                                        functionName?: undefined;
                                        arguments?: undefined;
                                        metadata?: undefined;
                                    };
                                    right: {
                                        type: string;
                                        variableName: string;
                                        value?: undefined;
                                        functionName?: undefined;
                                        arguments?: undefined;
                                        metadata?: undefined;
                                        operator?: undefined;
                                        left?: undefined;
                                        right?: undefined;
                                    };
                                    metadata?: undefined;
                                };
                                right: {
                                    type: string;
                                    variableName: string;
                                    operator?: undefined;
                                    left?: undefined;
                                    right?: undefined;
                                    metadata?: undefined;
                                };
                                metadata?: undefined;
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                            operator?: undefined;
                            left?: undefined;
                            right?: undefined;
                        };
                    };
                    variableIds: string[];
                })[];
                conditions: {
                    id: string;
                    name: string;
                    expression: string;
                    variableIds: string[];
                }[];
                steps: {
                    type: string;
                    id: string;
                    name: string;
                }[];
            } | {
                id: string;
                name: string;
                description: string;
                resolvedValueTypeId: string;
                variables: {
                    id: string;
                    name: string;
                    type: string;
                    defaultValue: string;
                    description: string;
                }[];
                formulas: ({
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            variableName: string;
                            expression: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    operator: string;
                                    left: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    };
                                    right: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    };
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    value?: undefined;
                                };
                                right: {
                                    type: string;
                                    operator: string;
                                    left: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                        value?: undefined;
                                    };
                                    right: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    };
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    functionName?: undefined;
                                    arguments?: undefined;
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                    };
                    variableIds: string[];
                } | {
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            variableName: string;
                            expression: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    value: number;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    operator?: undefined;
                                    left?: undefined;
                                    right?: undefined;
                                };
                                right: {
                                    type: string;
                                    operator: string;
                                    left: {
                                        type: string;
                                        value: number;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                        variableName?: undefined;
                                    };
                                    right: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    };
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    functionName?: undefined;
                                    arguments?: undefined;
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                    };
                    variableIds: never[];
                } | {
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            variableName: string;
                            expression: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    operator: string;
                                    left: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    };
                                    right: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    };
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    value?: undefined;
                                };
                                right: {
                                    type: string;
                                    functionName: string;
                                    arguments: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    }[];
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    operator?: undefined;
                                    left?: undefined;
                                    right?: undefined;
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                    };
                    variableIds: string[];
                })[];
                conditions: never[];
                steps: {
                    type: string;
                    id: string;
                    name: string;
                }[];
            } | {
                id: string;
                name: string;
                description: string;
                resolvedValueTypeId: string;
                variables: {
                    id: string;
                    name: string;
                    type: string;
                    defaultValue: string;
                    description: string;
                }[];
                formulas: {
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                variableName: string;
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            right: {
                                type: string;
                                functionName: string;
                                arguments: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                }[];
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                    };
                    variableIds: string[];
                }[];
                conditions: never[];
                steps: {
                    type: string;
                    id: string;
                    name: string;
                }[];
            } | {
                id: string;
                name: string;
                description: string;
                resolvedValueTypeId: string;
                variables: {
                    id: string;
                    name: string;
                    type: string;
                    defaultValue: string;
                    description: string;
                }[];
                formulas: ({
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            variableName: string;
                            expression: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    variableName: string;
                                };
                                right: {
                                    type: string;
                                    variableName: string;
                                };
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                            functionName?: undefined;
                            arguments?: undefined;
                            operator?: undefined;
                            left?: undefined;
                            right?: undefined;
                        };
                    };
                    variableIds: string[];
                } | {
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            functionName: string;
                            arguments: ({
                                type: string;
                                variableName: string;
                                expression: {
                                    type: string;
                                    variableName: string;
                                };
                            } | {
                                type: string;
                                variableName: string;
                                expression?: undefined;
                            })[];
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                            variableName?: undefined;
                            expression?: undefined;
                            operator?: undefined;
                            left?: undefined;
                            right?: undefined;
                        };
                    };
                    variableIds: never[];
                } | {
                    id: string;
                    name: string;
                    description: string;
                    expressions: {
                        latex: {
                            value: string;
                        };
                        javascript: {
                            value: string;
                            metadata: {
                                allowedOperations: string[];
                            };
                        };
                        ast: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                variableName: string;
                            };
                            right: {
                                type: string;
                                variableName: string;
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                            variableName?: undefined;
                            expression?: undefined;
                            functionName?: undefined;
                            arguments?: undefined;
                        };
                    };
                    variableIds: never[];
                })[];
                conditions: never[];
                steps: {
                    type: string;
                    id: string;
                    name: string;
                }[];
            })[];
            execution: {
                order: string[];
                parallel: boolean;
                onError: string;
            };
            integration: {
                targetSchema: string;
                outputFormat: string;
                mergeStrategy: string;
                validation: boolean;
            };
            examples: {
                name: string;
                description: string;
                useCase: string;
                config: {
                    baseMultiplier: number;
                    baseRatio: number;
                    progressiveRatio: number;
                    maxRatio: number;
                };
                algorithms: {
                    id: string;
                    variables: {
                        p: number[];
                        z: number[];
                        n: number;
                    };
                }[];
                expectedOutput: {
                    sizes: {
                        name: string;
                        value: number;
                        description: string;
                    }[];
                };
            }[];
        };
        schemaVersion: string;
        profile: string;
        metadata: {
            name: string;
            description: string;
            version: string;
            author: string;
        };
        config: {
            systemVariables: {
                id: string;
                name: string;
                type: string;
                defaultValue: number;
                description: string;
                modeBased: boolean;
                dimensionId: string;
                valuesByMode: {
                    modeIds: string[];
                    value: number;
                }[];
            }[];
            defaultBaseValue: number;
            defaultRatio: number;
            defaultSpacing: number;
            baseMultiplier: number;
            baseRatio: number;
            progressiveRatio: number;
            maxRatio: number;
        };
        algorithms: ({
            id: string;
            name: string;
            description: string;
            resolvedValueTypeId: string;
            variables: {
                id: string;
                name: string;
                type: string;
                defaultValue: string;
                description: string;
            }[];
            formulas: ({
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        operator: string;
                        left: {
                            type: string;
                            functionName: string;
                            arguments: {
                                type: string;
                                variableName: string;
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            }[];
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                        right: {
                            type: string;
                            functionName: string;
                            arguments: {
                                type: string;
                                variableName: string;
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            }[];
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                        variableName?: undefined;
                        expression?: undefined;
                    };
                };
                variableIds: string[];
            } | {
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        variableName: string;
                        expression: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    value: number;
                                    functionName?: undefined;
                                    arguments?: undefined;
                                    metadata?: undefined;
                                    variableName?: undefined;
                                };
                                right: {
                                    type: string;
                                    value: number;
                                    functionName?: undefined;
                                    arguments?: undefined;
                                    metadata?: undefined;
                                    operator?: undefined;
                                    left?: undefined;
                                    right?: undefined;
                                    variableName?: undefined;
                                };
                                metadata?: undefined;
                            };
                            right: {
                                type: string;
                                variableName: string;
                                operator?: undefined;
                                left?: undefined;
                                right?: undefined;
                                metadata?: undefined;
                            };
                            metadata?: undefined;
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                        operator?: undefined;
                        left?: undefined;
                        right?: undefined;
                    };
                };
                variableIds: string[];
            } | {
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        variableName: string;
                        expression: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    functionName: string;
                                    arguments: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    }[];
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    value?: undefined;
                                    variableName?: undefined;
                                };
                                right: {
                                    type: string;
                                    functionName: string;
                                    arguments: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    }[];
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    value?: undefined;
                                    operator?: undefined;
                                    left?: undefined;
                                    right?: undefined;
                                    variableName?: undefined;
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            right: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    functionName: string;
                                    arguments: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    }[];
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    value?: undefined;
                                };
                                right: {
                                    type: string;
                                    functionName: string;
                                    arguments: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    }[];
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    variableName?: undefined;
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                                variableName?: undefined;
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                        operator?: undefined;
                        left?: undefined;
                        right?: undefined;
                    };
                };
                variableIds: string[];
            } | {
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        variableName: string;
                        expression: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    value: number;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    functionName?: undefined;
                                    arguments?: undefined;
                                    variableName?: undefined;
                                };
                                right: {
                                    type: string;
                                    operator: string;
                                    left: {
                                        type: string;
                                        value: number;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    };
                                    right: {
                                        type: string;
                                        variableName: string;
                                        metadata: {
                                            astVersion: string;
                                            validationErrors: never[];
                                            complexity: string;
                                        };
                                    };
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    value?: undefined;
                                    functionName?: undefined;
                                    arguments?: undefined;
                                    variableName?: undefined;
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            };
                            right: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    value: number;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    functionName?: undefined;
                                    arguments?: undefined;
                                };
                                right: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    functionName?: undefined;
                                    arguments?: undefined;
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                                variableName?: undefined;
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                        operator?: undefined;
                        left?: undefined;
                        right?: undefined;
                    };
                };
                variableIds: string[];
            } | {
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        variableName: string;
                        expression: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    variableName: string;
                                    value?: undefined;
                                    functionName?: undefined;
                                    arguments?: undefined;
                                    metadata?: undefined;
                                };
                                right: {
                                    type: string;
                                    variableName: string;
                                    value?: undefined;
                                    functionName?: undefined;
                                    arguments?: undefined;
                                    metadata?: undefined;
                                    operator?: undefined;
                                    left?: undefined;
                                    right?: undefined;
                                };
                                metadata?: undefined;
                            };
                            right: {
                                type: string;
                                variableName: string;
                                operator?: undefined;
                                left?: undefined;
                                right?: undefined;
                                metadata?: undefined;
                            };
                            metadata?: undefined;
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                        operator?: undefined;
                        left?: undefined;
                        right?: undefined;
                    };
                };
                variableIds: string[];
            })[];
            conditions: {
                id: string;
                name: string;
                expression: string;
                variableIds: string[];
            }[];
            steps: {
                type: string;
                id: string;
                name: string;
            }[];
        } | {
            id: string;
            name: string;
            description: string;
            resolvedValueTypeId: string;
            variables: {
                id: string;
                name: string;
                type: string;
                defaultValue: string;
                description: string;
            }[];
            formulas: ({
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        variableName: string;
                        expression: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                };
                                right: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                                value?: undefined;
                            };
                            right: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    value?: undefined;
                                };
                                right: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                                functionName?: undefined;
                                arguments?: undefined;
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                    };
                };
                variableIds: string[];
            } | {
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        variableName: string;
                        expression: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                value: number;
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                                operator?: undefined;
                                left?: undefined;
                                right?: undefined;
                            };
                            right: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    value: number;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                    variableName?: undefined;
                                };
                                right: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                                functionName?: undefined;
                                arguments?: undefined;
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                    };
                };
                variableIds: never[];
            } | {
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        variableName: string;
                        expression: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                operator: string;
                                left: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                };
                                right: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                };
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                                value?: undefined;
                            };
                            right: {
                                type: string;
                                functionName: string;
                                arguments: {
                                    type: string;
                                    variableName: string;
                                    metadata: {
                                        astVersion: string;
                                        validationErrors: never[];
                                        complexity: string;
                                    };
                                }[];
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                                operator?: undefined;
                                left?: undefined;
                                right?: undefined;
                            };
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                    };
                };
                variableIds: string[];
            })[];
            conditions: never[];
            steps: {
                type: string;
                id: string;
                name: string;
            }[];
        } | {
            id: string;
            name: string;
            description: string;
            resolvedValueTypeId: string;
            variables: {
                id: string;
                name: string;
                type: string;
                defaultValue: string;
                description: string;
            }[];
            formulas: {
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        operator: string;
                        left: {
                            type: string;
                            variableName: string;
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                        right: {
                            type: string;
                            functionName: string;
                            arguments: {
                                type: string;
                                variableName: string;
                                metadata: {
                                    astVersion: string;
                                    validationErrors: never[];
                                    complexity: string;
                                };
                            }[];
                            metadata: {
                                astVersion: string;
                                validationErrors: never[];
                                complexity: string;
                            };
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                    };
                };
                variableIds: string[];
            }[];
            conditions: never[];
            steps: {
                type: string;
                id: string;
                name: string;
            }[];
        } | {
            id: string;
            name: string;
            description: string;
            resolvedValueTypeId: string;
            variables: {
                id: string;
                name: string;
                type: string;
                defaultValue: string;
                description: string;
            }[];
            formulas: ({
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        variableName: string;
                        expression: {
                            type: string;
                            operator: string;
                            left: {
                                type: string;
                                variableName: string;
                            };
                            right: {
                                type: string;
                                variableName: string;
                            };
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                        functionName?: undefined;
                        arguments?: undefined;
                        operator?: undefined;
                        left?: undefined;
                        right?: undefined;
                    };
                };
                variableIds: string[];
            } | {
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        functionName: string;
                        arguments: ({
                            type: string;
                            variableName: string;
                            expression: {
                                type: string;
                                variableName: string;
                            };
                        } | {
                            type: string;
                            variableName: string;
                            expression?: undefined;
                        })[];
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                        variableName?: undefined;
                        expression?: undefined;
                        operator?: undefined;
                        left?: undefined;
                        right?: undefined;
                    };
                };
                variableIds: never[];
            } | {
                id: string;
                name: string;
                description: string;
                expressions: {
                    latex: {
                        value: string;
                    };
                    javascript: {
                        value: string;
                        metadata: {
                            allowedOperations: string[];
                        };
                    };
                    ast: {
                        type: string;
                        operator: string;
                        left: {
                            type: string;
                            variableName: string;
                        };
                        right: {
                            type: string;
                            variableName: string;
                        };
                        metadata: {
                            astVersion: string;
                            validationErrors: never[];
                            complexity: string;
                        };
                        variableName?: undefined;
                        expression?: undefined;
                        functionName?: undefined;
                        arguments?: undefined;
                    };
                };
                variableIds: never[];
            })[];
            conditions: never[];
            steps: {
                type: string;
                id: string;
                name: string;
            }[];
        })[];
        execution: {
            order: string[];
            parallel: boolean;
            onError: string;
        };
        integration: {
            targetSchema: string;
            outputFormat: string;
            mergeStrategy: string;
            validation: boolean;
        };
        examples: {
            name: string;
            description: string;
            useCase: string;
            config: {
                baseMultiplier: number;
                baseRatio: number;
                progressiveRatio: number;
                maxRatio: number;
            };
            algorithms: {
                id: string;
                variables: {
                    p: number[];
                    z: number[];
                    n: number;
                };
            }[];
            expectedOutput: {
                sizes: {
                    name: string;
                    value: number;
                    description: string;
                }[];
            };
        }[];
    } | null>;
};
