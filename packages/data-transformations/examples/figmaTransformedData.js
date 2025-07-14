{
    "variables": [
        // No dimensional values to this example; only one variable needed
        {
            "action": "CREATE",
            "id": "token-7777-7777-7777",
            "name": "Black",
            "variableCollectionId": "id-published-collection",
            "resolvedType": "COLOR",
            "scopes": [
                "ALL_SCOPES"
            ],
            "hiddenFromPublishing": true
        },
        // One dimension (two modes) means one intermediary with mode based values
        // Plus the non-intermediary variable for the token itself
        {
            "action": "CREATE",
            "id": "intermediary-token-8888-88888-88888-dimensionId-colorScheme", // id suffixed by dimensino id
            "name": "Blue/500 (Color Scheme)", // since only one dimension, name suffixed by dimension name only
            "variableCollectionId": "dimensionId-colorScheme",
            "resolvedType": "COLOR",
            "scopes": [
                "ALL_SCOPES"
            ],
            "hiddenFromPublishing": true
        },
        {
            "action": "CREATE",
            "id": "token-8888-88888-88888",
            "name": "Blue/500",
            "variableCollectionId": "id-published-collection",
            "resolvedType": "COLOR",
            "scopes": [
                "ALL_SCOPES"
            ],
            "hiddenFromPublishing": true
        },
        // Two dimensions (two modes in one, three in the other) means two SETS of intermediaries with mode based values
        // First set of intermediaries for the first dimension collection will have duplicates for each mode of the subsequent dimensions.
        // In this case, we need variables for regular, low, and high contrast, which will map to the modes of the next dimensions' intermediary.
        {
            "action": "CREATE",
            "id": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-low", // id suffixed by dimension id and mode id for specific permutation
            "name": "Text/Accent (Color Scheme - Low)", // Named by first dimension, with mode combination permutations of subsequent dimensions listed after
            "variableCollectionId": "dimensionId-colorScheme",
            "resolvedType": "COLOR",
            "scopes": [
                "ALL_SCOPES"
            ],
            "hiddenFromPublishing": true
        },
        {
            "action": "CREATE",
            "id": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-regular",
            "name": "Text/Accent (Color Scheme - Regular)", 
            "variableCollectionId": "dimensionId-colorScheme",
            "resolvedType": "COLOR",
            "scopes": [
                "ALL_SCOPES"
            ],
            "hiddenFromPublishing": true
        },
        {
            "action": "CREATE",
            "id": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-high",
            "name": "Text/Accent (Color Scheme - High)", 
            "variableCollectionId": "dimensionId-colorScheme",
            "resolvedType": "COLOR",
            "scopes": [
                "ALL_SCOPES"
            ],
            "hiddenFromPublishing": true
        },
        // Next set of dimensions' intermediary will only need one intermediary since the modes
        // are part of the collection and permutations are not needed.
        {
            "action": "CREATE",
            "id": "intermediary-token-9999-9999-9999-dimensionId-contrast", 
            "name": "Text/Accent (Contrast)", 
            "variableCollectionId": "dimensionId-contrast",
            "resolvedType": "COLOR",
            "scopes": [
                "ALL_SCOPES"
            ],
            "hiddenFromPublishing": true
        },
        // Finally, the non-intermediary variable for the token itself
        {
            "action": "CREATE",
            "id": "token-9999-9999-9999", 
            "name": "Text/Accent", 
            "variableCollectionId": "id-published-collection",
            "resolvedType": "COLOR",
            "scopes": [
                "ALL_SCOPES"
            ],
            "hiddenFromPublishing": true
        }
    ],
      "variableModeValues": [
        // Shown in a different order, here we can see the values per mode
        // Tokens with no intermediary will have a single value.
        {
            "variableId": "token-7777-7777-7777",
            "modeId": "id-published-collection-mode",
            "value": {
                "r": 0,
                "g": 0,
                "b": 0
            }
        },
        // While others will be aliased
        // Blue 500 example only needs one aliasing chain from the
        // published token/variable to the dimensional intermediary
        {
            "variableId": "token-8888-88888-88888",
            "modeId": "id-published-collection-mode",
            "value": {
                "type": "VARIABLE_ALIAS",
                "id": "intermediary-token-8888-88888-88888-dimensionId-colorScheme"
            }
        },
        {
            "variableId": "intermediary-token-8888-88888-88888-dimensionId-colorScheme",
            "modeId": "modeId-color-scheme-light",
            "value": {
                "r": 0.152,
                "g": 0.302,
                "b": 0.918
            }
        },
        {
            "variableId": "intermediary-token-8888-88888-88888-dimensionId-colorScheme",
            "modeId": "modeId-color-scheme-dark",
            "value": {
                "r": 0.412,
                "g": 0.584",
                "b": 0.996
            }
        },
        // Text Accent example has multiple intermediary values
        // First, published token/variable points to the reference variable (contrast dimension)
        {
            "variableId": "token-9999-9999-9999",
            "modeId": "id-published-collection-mode",
            "value": {
                "type": "VARIABLE_ALIAS",
                "id": "reference-token-9999-9999-9999-dimensionId-contrast"
            }
        },
        // Then, the reference variable with modes has values per mode pointing to
        // unique intermediaries from the color scheme collection.
        {
            "variableId": "reference-token-9999-9999-9999-dimensionId-contrast",
            "modeId": "modeId-contrast-low",
            "value": {
                "type": "VARIABLE_ALIAS",
                "id": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-low"
            }
        },
        {
            "variableId": "reference-token-9999-9999-9999-dimensionId-contrast",
            "modeId": "modeId-contrast-regular",
            "value": {
                "type": "VARIABLE_ALIAS",
                "id": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-regular"
            }
        },
        {
            "variableId": "reference-token-9999-9999-9999-dimensionId-contrast",
            "modeId": "modeId-contrast-high",
            "value": {
                "type": "VARIABLE_ALIAS",
                "id": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-high"
            }
        },
        // Finally, the last intermediary for color scheme has the permuted variables with their modes values
        {
            "variableId": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-low",
            "modeId": "modeId-color-scheme-light",
            "value": {
                "type": "VARIABLE_ALIAS",
                "id": "token-8888-88888-88888"
            }
        },
        {
            "variableId": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-low",
            "modeId": "modeId-color-scheme-dark",
            "value": {
                "type": "VARIABLE_ALIAS",
                "id": "token-8888-88888-88888"
            }
        },
        {
            "variableId": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-regular",
            "modeId": "modeId-color-scheme-light",
            "value": {
                "r": 0.298,
                "g": 0.435,
                "b": 0.996
            }
        },
        {
            "variableId": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-regular",
            "modeId": "modeId-color-scheme-dark",
            "value": {
                "r": 0.204,
                "g": 0.431,
                "b": 0.976
            }
        },
        {
            "variableId": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-high",
            "modeId": "modeId-color-scheme-light",
            "value": {
                "r": 0.035,
                "g": 0.184,
                "b": 0.800
            }
        },
        {
            "variableId": "intermediary-token-9999-9999-9999-dimensionId-colorScheme-modeId-contrast-high",
            "modeId": "modeId-color-scheme-dark",
            "value": {
                "r": 0.655",
                "g": 0.757",
                "b": 1.000"
            }
        }
    ]
}