import { z } from 'zod';
export declare const StandardValueType: z.ZodEnum<["COLOR", "DIMENSION", "SPACING", "FONT_FAMILY", "FONT_WEIGHT", "FONT_SIZE", "LINE_HEIGHT", "LETTER_SPACING", "DURATION", "CUBIC_BEZIER", "BLUR", "SPREAD", "RADIUS"]>;
export type StandardValueType = z.infer<typeof StandardValueType>;
export declare const ValueTypeValidation: z.ZodObject<{
    pattern: z.ZodOptional<z.ZodString>;
    minimum: z.ZodOptional<z.ZodNumber>;
    maximum: z.ZodOptional<z.ZodNumber>;
    allowedValues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    minimum?: number | undefined;
    maximum?: number | undefined;
    pattern?: string | undefined;
    allowedValues?: string[] | undefined;
}, {
    minimum?: number | undefined;
    maximum?: number | undefined;
    pattern?: string | undefined;
    allowedValues?: string[] | undefined;
}>;
export type ValueTypeValidation = z.infer<typeof ValueTypeValidation>;
export declare const ResolvedValueType: z.ZodObject<{
    id: z.ZodString;
    displayName: z.ZodString;
    type: z.ZodOptional<z.ZodEnum<["COLOR", "DIMENSION", "SPACING", "FONT_FAMILY", "FONT_WEIGHT", "FONT_SIZE", "LINE_HEIGHT", "LETTER_SPACING", "DURATION", "CUBIC_BEZIER", "BLUR", "SPREAD", "RADIUS"]>>;
    description: z.ZodOptional<z.ZodString>;
    validation: z.ZodOptional<z.ZodObject<{
        pattern: z.ZodOptional<z.ZodString>;
        minimum: z.ZodOptional<z.ZodNumber>;
        maximum: z.ZodOptional<z.ZodNumber>;
        allowedValues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        minimum?: number | undefined;
        maximum?: number | undefined;
        pattern?: string | undefined;
        allowedValues?: string[] | undefined;
    }, {
        minimum?: number | undefined;
        maximum?: number | undefined;
        pattern?: string | undefined;
        allowedValues?: string[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    displayName: string;
    validation?: {
        minimum?: number | undefined;
        maximum?: number | undefined;
        pattern?: string | undefined;
        allowedValues?: string[] | undefined;
    } | undefined;
    type?: "COLOR" | "DIMENSION" | "SPACING" | "FONT_FAMILY" | "FONT_WEIGHT" | "FONT_SIZE" | "LINE_HEIGHT" | "LETTER_SPACING" | "DURATION" | "CUBIC_BEZIER" | "BLUR" | "SPREAD" | "RADIUS" | undefined;
    description?: string | undefined;
}, {
    id: string;
    displayName: string;
    validation?: {
        minimum?: number | undefined;
        maximum?: number | undefined;
        pattern?: string | undefined;
        allowedValues?: string[] | undefined;
    } | undefined;
    type?: "COLOR" | "DIMENSION" | "SPACING" | "FONT_FAMILY" | "FONT_WEIGHT" | "FONT_SIZE" | "LINE_HEIGHT" | "LETTER_SPACING" | "DURATION" | "CUBIC_BEZIER" | "BLUR" | "SPREAD" | "RADIUS" | undefined;
    description?: string | undefined;
}>;
export type ResolvedValueType = z.infer<typeof ResolvedValueType>;
export declare const TokenStatus: z.ZodEnum<["experimental", "stable", "deprecated"]>;
export declare const TokenTier: z.ZodEnum<["PRIMITIVE", "SEMANTIC", "COMPONENT"]>;
export declare const FallbackStrategy: z.ZodEnum<["MOST_SPECIFIC_MATCH", "DIMENSION_PRIORITY", "NEAREST_PARENT", "DEFAULT_VALUE"]>;
export declare const ColorValue: z.ZodObject<{
    hex: z.ZodString;
    rgb: z.ZodOptional<z.ZodObject<{
        r: z.ZodNumber;
        g: z.ZodNumber;
        b: z.ZodNumber;
        a: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    }, {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    hex: string;
    rgb?: {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    } | undefined;
}, {
    hex: string;
    rgb?: {
        r: number;
        g: number;
        b: number;
        a?: number | undefined;
    } | undefined;
}>;
export declare const DimensionValue: z.ZodUnion<[z.ZodObject<{
    value: z.ZodNumber;
    unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
}, "strip", z.ZodTypeAny, {
    value: number;
    unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
}, {
    value: number;
    unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
}>, z.ZodString]>;
export declare const DurationValue: z.ZodUnion<[z.ZodObject<{
    value: z.ZodNumber;
    unit: z.ZodEnum<["ms", "s"]>;
}, "strip", z.ZodTypeAny, {
    value: number;
    unit: "ms" | "s";
}, {
    value: number;
    unit: "ms" | "s";
}>, z.ZodString]>;
export declare const CubicBezierValue: z.ZodUnion<[z.ZodObject<{
    x1: z.ZodNumber;
    y1: z.ZodNumber;
    x2: z.ZodNumber;
    y2: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}, {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}>, z.ZodString]>;
export declare const ShadowValue: z.ZodUnion<[z.ZodObject<{
    offsetX: z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>;
    offsetY: z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>;
    blur: z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>;
    spread: z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>;
    color: z.ZodObject<{
        hex: z.ZodString;
        rgb: z.ZodOptional<z.ZodObject<{
            r: z.ZodNumber;
            g: z.ZodNumber;
            b: z.ZodNumber;
            a: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }, {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    }, {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    }>;
    inset: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    offsetX: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    offsetY: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    blur: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    spread: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    color: {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    };
    inset?: boolean | undefined;
}, {
    offsetX: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    offsetY: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    blur: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    spread: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    color: {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    };
    inset?: boolean | undefined;
}>, z.ZodArray<z.ZodObject<{
    offsetX: z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>;
    offsetY: z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>;
    blur: z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>;
    spread: z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>;
    color: z.ZodObject<{
        hex: z.ZodString;
        rgb: z.ZodOptional<z.ZodObject<{
            r: z.ZodNumber;
            g: z.ZodNumber;
            b: z.ZodNumber;
            a: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }, {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    }, {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    }>;
    inset: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    offsetX: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    offsetY: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    blur: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    spread: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    color: {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    };
    inset?: boolean | undefined;
}, {
    offsetX: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    offsetY: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    blur: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    spread: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    color: {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    };
    inset?: boolean | undefined;
}>, "many">, z.ZodString]>;
export declare const TypographyValue: z.ZodObject<{
    fontFamily: z.ZodString;
    fontSize: z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>;
    fontWeight: z.ZodUnion<[z.ZodNumber, z.ZodEnum<["normal", "bold", "lighter", "bolder"]>]>;
    lineHeight: z.ZodOptional<z.ZodUnion<[z.ZodNumber, z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>]>>;
    letterSpacing: z.ZodOptional<z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>>;
    textDecoration: z.ZodOptional<z.ZodEnum<["none", "underline", "line-through", "overline"]>>;
    textTransform: z.ZodOptional<z.ZodEnum<["none", "capitalize", "uppercase", "lowercase"]>>;
}, "strip", z.ZodTypeAny, {
    fontFamily: string;
    fontSize: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    fontWeight: number | "normal" | "bold" | "lighter" | "bolder";
    lineHeight?: string | number | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    } | undefined;
    letterSpacing?: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    } | undefined;
    textDecoration?: "none" | "underline" | "line-through" | "overline" | undefined;
    textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
}, {
    fontFamily: string;
    fontSize: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    fontWeight: number | "normal" | "bold" | "lighter" | "bolder";
    lineHeight?: string | number | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    } | undefined;
    letterSpacing?: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    } | undefined;
    textDecoration?: "none" | "underline" | "line-through" | "overline" | undefined;
    textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
}>;
export declare const BorderValue: z.ZodUnion<[z.ZodObject<{
    width: z.ZodUnion<[z.ZodObject<{
        value: z.ZodNumber;
        unit: z.ZodEnum<["px", "rem", "%", "em", "vh", "vw", "pt"]>;
    }, "strip", z.ZodTypeAny, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }, {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    }>, z.ZodString]>;
    style: z.ZodEnum<["solid", "dashed", "dotted", "double", "groove", "ridge", "inset", "outset", "none"]>;
    color: z.ZodObject<{
        hex: z.ZodString;
        rgb: z.ZodOptional<z.ZodObject<{
            r: z.ZodNumber;
            g: z.ZodNumber;
            b: z.ZodNumber;
            a: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }, {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    }, {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    color: {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    };
    width: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    style: "inset" | "none" | "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "outset";
}, {
    color: {
        hex: string;
        rgb?: {
            r: number;
            g: number;
            b: number;
            a?: number | undefined;
        } | undefined;
    };
    width: string | {
        value: number;
        unit: "px" | "rem" | "%" | "em" | "vh" | "vw" | "pt";
    };
    style: "inset" | "none" | "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "outset";
}>, z.ZodString]>;
export declare const TokenValue: z.ZodUnion<[z.ZodObject<{
    value: z.ZodAny;
}, "strip", z.ZodTypeAny, {
    value?: any;
}, {
    value?: any;
}>, z.ZodObject<{
    tokenId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tokenId: string;
}, {
    tokenId: string;
}>]>;
export type TokenValue = z.infer<typeof TokenValue>;
export declare const Mode: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    dimensionId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    dimensionId: string;
    description?: string | undefined;
}, {
    id: string;
    name: string;
    dimensionId: string;
    description?: string | undefined;
}>;
export declare const Dimension: z.ZodObject<{
    id: z.ZodString;
    displayName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    modes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        dimensionId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        dimensionId: string;
        description?: string | undefined;
    }, {
        id: string;
        name: string;
        dimensionId: string;
        description?: string | undefined;
    }>, "many">;
    required: z.ZodDefault<z.ZodBoolean>;
    defaultMode: z.ZodString;
    resolvedValueTypeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    displayName: string;
    modes: {
        id: string;
        name: string;
        dimensionId: string;
        description?: string | undefined;
    }[];
    required: boolean;
    defaultMode: string;
    description?: string | undefined;
    resolvedValueTypeIds?: string[] | undefined;
}, {
    id: string;
    displayName: string;
    modes: {
        id: string;
        name: string;
        dimensionId: string;
        description?: string | undefined;
    }[];
    defaultMode: string;
    description?: string | undefined;
    required?: boolean | undefined;
    resolvedValueTypeIds?: string[] | undefined;
}>;
export declare const TokenCollection: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    resolvedValueTypeIds: z.ZodArray<z.ZodString, "many">;
    private: z.ZodDefault<z.ZodBoolean>;
    defaultModeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    modeResolutionStrategy: z.ZodOptional<z.ZodObject<{
        priorityByType: z.ZodArray<z.ZodString, "many">;
        fallbackStrategy: z.ZodEnum<["MOST_SPECIFIC_MATCH", "DIMENSION_PRIORITY", "NEAREST_PARENT", "DEFAULT_VALUE"]>;
    }, "strip", z.ZodTypeAny, {
        priorityByType: string[];
        fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
    }, {
        priorityByType: string[];
        fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    resolvedValueTypeIds: string[];
    private: boolean;
    description?: string | undefined;
    defaultModeIds?: string[] | undefined;
    modeResolutionStrategy?: {
        priorityByType: string[];
        fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
    } | undefined;
}, {
    id: string;
    name: string;
    resolvedValueTypeIds: string[];
    description?: string | undefined;
    private?: boolean | undefined;
    defaultModeIds?: string[] | undefined;
    modeResolutionStrategy?: {
        priorityByType: string[];
        fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
    } | undefined;
}>;
export declare const PlatformOverride: z.ZodObject<{
    platformId: z.ZodString;
    value: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    value: string;
    platformId: string;
    metadata?: Record<string, any> | undefined;
}, {
    value: string;
    platformId: string;
    metadata?: Record<string, any> | undefined;
}>;
export declare const TokenTaxonomyRef: z.ZodObject<{
    taxonomyId: z.ZodString;
    termId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    taxonomyId: string;
    termId: string;
}, {
    taxonomyId: string;
    termId: string;
}>;
export declare const Token: z.ZodObject<{
    id: z.ZodString;
    displayName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    tokenCollectionId: z.ZodOptional<z.ZodString>;
    resolvedValueTypeId: z.ZodString;
    private: z.ZodDefault<z.ZodBoolean>;
    themeable: z.ZodDefault<z.ZodBoolean>;
    status: z.ZodOptional<z.ZodEnum<["experimental", "stable", "deprecated"]>>;
    tokenTier: z.ZodEnum<["PRIMITIVE", "SEMANTIC", "COMPONENT"]>;
    generatedByAlgorithm: z.ZodDefault<z.ZodBoolean>;
    algorithmId: z.ZodOptional<z.ZodString>;
    taxonomies: z.ZodArray<z.ZodObject<{
        taxonomyId: z.ZodString;
        termId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        taxonomyId: string;
        termId: string;
    }, {
        taxonomyId: string;
        termId: string;
    }>, "many">;
    propertyTypes: z.ZodArray<z.ZodString, "many">;
    codeSyntax: z.ZodArray<z.ZodObject<{
        platformId: z.ZodString;
        formattedName: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        platformId: string;
        formattedName: string;
    }, {
        platformId: string;
        formattedName: string;
    }>, "many">;
    valuesByMode: z.ZodArray<z.ZodObject<{
        modeIds: z.ZodArray<z.ZodString, "many">;
        value: z.ZodUnion<[z.ZodObject<{
            value: z.ZodAny;
        }, "strip", z.ZodTypeAny, {
            value?: any;
        }, {
            value?: any;
        }>, z.ZodObject<{
            tokenId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            tokenId: string;
        }, {
            tokenId: string;
        }>]>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        platformOverrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
            platformId: z.ZodString;
            value: z.ZodString;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            value: string;
            platformId: string;
            metadata?: Record<string, any> | undefined;
        }, {
            value: string;
            platformId: string;
            metadata?: Record<string, any> | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        value: {
            value?: any;
        } | {
            tokenId: string;
        };
        modeIds: string[];
        metadata?: Record<string, any> | undefined;
        platformOverrides?: {
            value: string;
            platformId: string;
            metadata?: Record<string, any> | undefined;
        }[] | undefined;
    }, {
        value: {
            value?: any;
        } | {
            tokenId: string;
        };
        modeIds: string[];
        metadata?: Record<string, any> | undefined;
        platformOverrides?: {
            value: string;
            platformId: string;
            metadata?: Record<string, any> | undefined;
        }[] | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    displayName: string;
    private: boolean;
    resolvedValueTypeId: string;
    themeable: boolean;
    tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
    generatedByAlgorithm: boolean;
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
        value: {
            value?: any;
        } | {
            tokenId: string;
        };
        modeIds: string[];
        metadata?: Record<string, any> | undefined;
        platformOverrides?: {
            value: string;
            platformId: string;
            metadata?: Record<string, any> | undefined;
        }[] | undefined;
    }[];
    status?: "experimental" | "stable" | "deprecated" | undefined;
    description?: string | undefined;
    tokenCollectionId?: string | undefined;
    algorithmId?: string | undefined;
}, {
    id: string;
    displayName: string;
    resolvedValueTypeId: string;
    tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
        value: {
            value?: any;
        } | {
            tokenId: string;
        };
        modeIds: string[];
        metadata?: Record<string, any> | undefined;
        platformOverrides?: {
            value: string;
            platformId: string;
            metadata?: Record<string, any> | undefined;
        }[] | undefined;
    }[];
    status?: "experimental" | "stable" | "deprecated" | undefined;
    description?: string | undefined;
    private?: boolean | undefined;
    tokenCollectionId?: string | undefined;
    themeable?: boolean | undefined;
    generatedByAlgorithm?: boolean | undefined;
    algorithmId?: string | undefined;
}>;
export declare const TokenGroup: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    tokenCollectionId: z.ZodString;
    tokens: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        tokenCollectionId: z.ZodOptional<z.ZodString>;
        resolvedValueTypeId: z.ZodString;
        private: z.ZodDefault<z.ZodBoolean>;
        themeable: z.ZodDefault<z.ZodBoolean>;
        status: z.ZodOptional<z.ZodEnum<["experimental", "stable", "deprecated"]>>;
        tokenTier: z.ZodEnum<["PRIMITIVE", "SEMANTIC", "COMPONENT"]>;
        generatedByAlgorithm: z.ZodDefault<z.ZodBoolean>;
        algorithmId: z.ZodOptional<z.ZodString>;
        taxonomies: z.ZodArray<z.ZodObject<{
            taxonomyId: z.ZodString;
            termId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            taxonomyId: string;
            termId: string;
        }, {
            taxonomyId: string;
            termId: string;
        }>, "many">;
        propertyTypes: z.ZodArray<z.ZodString, "many">;
        codeSyntax: z.ZodArray<z.ZodObject<{
            platformId: z.ZodString;
            formattedName: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            platformId: string;
            formattedName: string;
        }, {
            platformId: string;
            formattedName: string;
        }>, "many">;
        valuesByMode: z.ZodArray<z.ZodObject<{
            modeIds: z.ZodArray<z.ZodString, "many">;
            value: z.ZodUnion<[z.ZodObject<{
                value: z.ZodAny;
            }, "strip", z.ZodTypeAny, {
                value?: any;
            }, {
                value?: any;
            }>, z.ZodObject<{
                tokenId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                tokenId: string;
            }, {
                tokenId: string;
            }>]>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            platformOverrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
                platformId: z.ZodString;
                value: z.ZodString;
                metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "strip", z.ZodTypeAny, {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }, {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }, {
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        displayName: string;
        private: boolean;
        resolvedValueTypeId: string;
        themeable: boolean;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
        generatedByAlgorithm: boolean;
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        tokenCollectionId?: string | undefined;
        algorithmId?: string | undefined;
    }, {
        id: string;
        displayName: string;
        resolvedValueTypeId: string;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        private?: boolean | undefined;
        tokenCollectionId?: string | undefined;
        themeable?: boolean | undefined;
        generatedByAlgorithm?: boolean | undefined;
        algorithmId?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    tokenCollectionId: string;
    tokens: {
        id: string;
        displayName: string;
        private: boolean;
        resolvedValueTypeId: string;
        themeable: boolean;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
        generatedByAlgorithm: boolean;
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        tokenCollectionId?: string | undefined;
        algorithmId?: string | undefined;
    }[];
    description?: string | undefined;
}, {
    id: string;
    name: string;
    tokenCollectionId: string;
    tokens: {
        id: string;
        displayName: string;
        resolvedValueTypeId: string;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        private?: boolean | undefined;
        tokenCollectionId?: string | undefined;
        themeable?: boolean | undefined;
        generatedByAlgorithm?: boolean | undefined;
        algorithmId?: string | undefined;
    }[];
    description?: string | undefined;
}>;
export declare const TokenVariant: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    tokenCollectionId: z.ZodString;
    tokens: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        tokenCollectionId: z.ZodOptional<z.ZodString>;
        resolvedValueTypeId: z.ZodString;
        private: z.ZodDefault<z.ZodBoolean>;
        themeable: z.ZodDefault<z.ZodBoolean>;
        status: z.ZodOptional<z.ZodEnum<["experimental", "stable", "deprecated"]>>;
        tokenTier: z.ZodEnum<["PRIMITIVE", "SEMANTIC", "COMPONENT"]>;
        generatedByAlgorithm: z.ZodDefault<z.ZodBoolean>;
        algorithmId: z.ZodOptional<z.ZodString>;
        taxonomies: z.ZodArray<z.ZodObject<{
            taxonomyId: z.ZodString;
            termId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            taxonomyId: string;
            termId: string;
        }, {
            taxonomyId: string;
            termId: string;
        }>, "many">;
        propertyTypes: z.ZodArray<z.ZodString, "many">;
        codeSyntax: z.ZodArray<z.ZodObject<{
            platformId: z.ZodString;
            formattedName: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            platformId: string;
            formattedName: string;
        }, {
            platformId: string;
            formattedName: string;
        }>, "many">;
        valuesByMode: z.ZodArray<z.ZodObject<{
            modeIds: z.ZodArray<z.ZodString, "many">;
            value: z.ZodUnion<[z.ZodObject<{
                value: z.ZodAny;
            }, "strip", z.ZodTypeAny, {
                value?: any;
            }, {
                value?: any;
            }>, z.ZodObject<{
                tokenId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                tokenId: string;
            }, {
                tokenId: string;
            }>]>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            platformOverrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
                platformId: z.ZodString;
                value: z.ZodString;
                metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "strip", z.ZodTypeAny, {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }, {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }, {
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        displayName: string;
        private: boolean;
        resolvedValueTypeId: string;
        themeable: boolean;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
        generatedByAlgorithm: boolean;
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        tokenCollectionId?: string | undefined;
        algorithmId?: string | undefined;
    }, {
        id: string;
        displayName: string;
        resolvedValueTypeId: string;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        private?: boolean | undefined;
        tokenCollectionId?: string | undefined;
        themeable?: boolean | undefined;
        generatedByAlgorithm?: boolean | undefined;
        algorithmId?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    tokenCollectionId: string;
    tokens: {
        id: string;
        displayName: string;
        private: boolean;
        resolvedValueTypeId: string;
        themeable: boolean;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
        generatedByAlgorithm: boolean;
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        tokenCollectionId?: string | undefined;
        algorithmId?: string | undefined;
    }[];
    description?: string | undefined;
}, {
    id: string;
    name: string;
    tokenCollectionId: string;
    tokens: {
        id: string;
        displayName: string;
        resolvedValueTypeId: string;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        private?: boolean | undefined;
        tokenCollectionId?: string | undefined;
        themeable?: boolean | undefined;
        generatedByAlgorithm?: boolean | undefined;
        algorithmId?: string | undefined;
    }[];
    description?: string | undefined;
}>;
export declare const PlatformDelimiter: z.ZodEnum<["", "_", "-", ".", "/"]>;
export declare const Platform: z.ZodObject<{
    id: z.ZodString;
    displayName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    syntaxPatterns: z.ZodOptional<z.ZodObject<{
        prefix: z.ZodOptional<z.ZodString>;
        suffix: z.ZodOptional<z.ZodString>;
        delimiter: z.ZodOptional<z.ZodEnum<["", "_", "-", ".", "/"]>>;
        capitalization: z.ZodOptional<z.ZodEnum<["none", "uppercase", "lowercase", "capitalize"]>>;
        formatString: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        prefix?: string | undefined;
        suffix?: string | undefined;
        delimiter?: "" | "_" | "-" | "." | "/" | undefined;
        capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
        formatString?: string | undefined;
    }, {
        prefix?: string | undefined;
        suffix?: string | undefined;
        delimiter?: "" | "_" | "-" | "." | "/" | undefined;
        capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
        formatString?: string | undefined;
    }>>;
    valueFormatters: z.ZodOptional<z.ZodObject<{
        color: z.ZodOptional<z.ZodEnum<["hex", "rgb", "rgba", "hsl", "hsla"]>>;
        dimension: z.ZodOptional<z.ZodEnum<["px", "rem", "em", "pt", "dp", "sp"]>>;
        numberPrecision: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
        dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
        numberPrecision?: number | undefined;
    }, {
        color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
        dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
        numberPrecision?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    displayName: string;
    description?: string | undefined;
    syntaxPatterns?: {
        prefix?: string | undefined;
        suffix?: string | undefined;
        delimiter?: "" | "_" | "-" | "." | "/" | undefined;
        capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
        formatString?: string | undefined;
    } | undefined;
    valueFormatters?: {
        color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
        dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
        numberPrecision?: number | undefined;
    } | undefined;
}, {
    id: string;
    displayName: string;
    description?: string | undefined;
    syntaxPatterns?: {
        prefix?: string | undefined;
        suffix?: string | undefined;
        delimiter?: "" | "_" | "-" | "." | "/" | undefined;
        capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
        formatString?: string | undefined;
    } | undefined;
    valueFormatters?: {
        color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
        dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
        numberPrecision?: number | undefined;
    } | undefined;
}>;
export declare const Theme: z.ZodObject<{
    id: z.ZodString;
    displayName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    isDefault: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    id: string;
    displayName: string;
    isDefault: boolean;
    description?: string | undefined;
}, {
    id: string;
    displayName: string;
    isDefault: boolean;
    description?: string | undefined;
}>;
export declare const ThemeOverrideValue: z.ZodObject<{
    value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
    tokenId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string | number | boolean;
    tokenId?: string | undefined;
}, {
    value: string | number | boolean;
    tokenId?: string | undefined;
}>;
export declare const ThemePlatformOverride: z.ZodObject<{
    platformId: z.ZodString;
    value: z.ZodObject<{
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        tokenId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string | number | boolean;
        tokenId?: string | undefined;
    }, {
        value: string | number | boolean;
        tokenId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    value: {
        value: string | number | boolean;
        tokenId?: string | undefined;
    };
    platformId: string;
}, {
    value: {
        value: string | number | boolean;
        tokenId?: string | undefined;
    };
    platformId: string;
}>;
export declare const ThemeOverride: z.ZodObject<{
    tokenId: z.ZodString;
    value: z.ZodObject<{
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        tokenId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string | number | boolean;
        tokenId?: string | undefined;
    }, {
        value: string | number | boolean;
        tokenId?: string | undefined;
    }>;
    platformOverrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
        platformId: z.ZodString;
        value: z.ZodObject<{
            value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
            tokenId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            value: string | number | boolean;
            tokenId?: string | undefined;
        }, {
            value: string | number | boolean;
            tokenId?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        platformId: string;
    }, {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        platformId: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    value: {
        value: string | number | boolean;
        tokenId?: string | undefined;
    };
    tokenId: string;
    platformOverrides?: {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        platformId: string;
    }[] | undefined;
}, {
    value: {
        value: string | number | boolean;
        tokenId?: string | undefined;
    };
    tokenId: string;
    platformOverrides?: {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        platformId: string;
    }[] | undefined;
}>;
export declare const ThemeOverrides: z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
    tokenId: z.ZodString;
    value: z.ZodObject<{
        value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
        tokenId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string | number | boolean;
        tokenId?: string | undefined;
    }, {
        value: string | number | boolean;
        tokenId?: string | undefined;
    }>;
    platformOverrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
        platformId: z.ZodString;
        value: z.ZodObject<{
            value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
            tokenId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            value: string | number | boolean;
            tokenId?: string | undefined;
        }, {
            value: string | number | boolean;
            tokenId?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        platformId: string;
    }, {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        platformId: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    value: {
        value: string | number | boolean;
        tokenId?: string | undefined;
    };
    tokenId: string;
    platformOverrides?: {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        platformId: string;
    }[] | undefined;
}, {
    value: {
        value: string | number | boolean;
        tokenId?: string | undefined;
    };
    tokenId: string;
    platformOverrides?: {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        platformId: string;
    }[] | undefined;
}>, "many">>;
export declare const TaxonomyTerm: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    description?: string | undefined;
}, {
    id: string;
    name: string;
    description?: string | undefined;
}>;
export declare const Taxonomy: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    terms: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        description?: string | undefined;
    }, {
        id: string;
        name: string;
        description?: string | undefined;
    }>, "many">;
    resolvedValueTypeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    name: string;
    terms: {
        id: string;
        name: string;
        description?: string | undefined;
    }[];
    resolvedValueTypeIds?: string[] | undefined;
}, {
    id: string;
    description: string;
    name: string;
    terms: {
        id: string;
        name: string;
        description?: string | undefined;
    }[];
    resolvedValueTypeIds?: string[] | undefined;
}>;
export declare const MigrationStrategy: z.ZodObject<{
    emptyModeIds: z.ZodEnum<["mapToDefaults", "preserveEmpty", "requireExplicit"]>;
    preserveOriginalValues: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
    preserveOriginalValues: boolean;
}, {
    emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
    preserveOriginalValues: boolean;
}>;
export declare const VersionHistoryEntry: z.ZodObject<{
    version: z.ZodString;
    dimensions: z.ZodArray<z.ZodString, "many">;
    date: z.ZodString;
    migrationStrategy: z.ZodOptional<z.ZodObject<{
        emptyModeIds: z.ZodEnum<["mapToDefaults", "preserveEmpty", "requireExplicit"]>;
        preserveOriginalValues: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
        preserveOriginalValues: boolean;
    }, {
        emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
        preserveOriginalValues: boolean;
    }>>;
}, "strip", z.ZodTypeAny, {
    date: string;
    version: string;
    dimensions: string[];
    migrationStrategy?: {
        emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
        preserveOriginalValues: boolean;
    } | undefined;
}, {
    date: string;
    version: string;
    dimensions: string[];
    migrationStrategy?: {
        emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
        preserveOriginalValues: boolean;
    } | undefined;
}>;
export declare const DimensionEvolutionRule: z.ZodObject<{
    whenAdding: z.ZodString;
    mapEmptyModeIdsTo: z.ZodArray<z.ZodString, "many">;
    preserveDefaultValues: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    whenAdding: string;
    mapEmptyModeIdsTo: string[];
    preserveDefaultValues?: boolean | undefined;
}, {
    whenAdding: string;
    mapEmptyModeIdsTo: string[];
    preserveDefaultValues?: boolean | undefined;
}>;
export declare const DimensionEvolution: z.ZodObject<{
    rules: z.ZodArray<z.ZodObject<{
        whenAdding: z.ZodString;
        mapEmptyModeIdsTo: z.ZodArray<z.ZodString, "many">;
        preserveDefaultValues: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        whenAdding: string;
        mapEmptyModeIdsTo: string[];
        preserveDefaultValues?: boolean | undefined;
    }, {
        whenAdding: string;
        mapEmptyModeIdsTo: string[];
        preserveDefaultValues?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    rules: {
        whenAdding: string;
        mapEmptyModeIdsTo: string[];
        preserveDefaultValues?: boolean | undefined;
    }[];
}, {
    rules: {
        whenAdding: string;
        mapEmptyModeIdsTo: string[];
        preserveDefaultValues?: boolean | undefined;
    }[];
}>;
export declare const TokenSystem: z.ZodEffects<z.ZodObject<{
    systemName: z.ZodString;
    systemId: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    version: z.ZodString;
    versionHistory: z.ZodArray<z.ZodObject<{
        version: z.ZodString;
        dimensions: z.ZodArray<z.ZodString, "many">;
        date: z.ZodString;
        migrationStrategy: z.ZodOptional<z.ZodObject<{
            emptyModeIds: z.ZodEnum<["mapToDefaults", "preserveEmpty", "requireExplicit"]>;
            preserveOriginalValues: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
            preserveOriginalValues: boolean;
        }, {
            emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
            preserveOriginalValues: boolean;
        }>>;
    }, "strip", z.ZodTypeAny, {
        date: string;
        version: string;
        dimensions: string[];
        migrationStrategy?: {
            emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
            preserveOriginalValues: boolean;
        } | undefined;
    }, {
        date: string;
        version: string;
        dimensions: string[];
        migrationStrategy?: {
            emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
            preserveOriginalValues: boolean;
        } | undefined;
    }>, "many">;
    dimensionEvolution: z.ZodOptional<z.ZodObject<{
        rules: z.ZodArray<z.ZodObject<{
            whenAdding: z.ZodString;
            mapEmptyModeIdsTo: z.ZodArray<z.ZodString, "many">;
            preserveDefaultValues: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            whenAdding: string;
            mapEmptyModeIdsTo: string[];
            preserveDefaultValues?: boolean | undefined;
        }, {
            whenAdding: string;
            mapEmptyModeIdsTo: string[];
            preserveDefaultValues?: boolean | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        rules: {
            whenAdding: string;
            mapEmptyModeIdsTo: string[];
            preserveDefaultValues?: boolean | undefined;
        }[];
    }, {
        rules: {
            whenAdding: string;
            mapEmptyModeIdsTo: string[];
            preserveDefaultValues?: boolean | undefined;
        }[];
    }>>;
    dimensions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        modes: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            dimensionId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            dimensionId: string;
            description?: string | undefined;
        }, {
            id: string;
            name: string;
            dimensionId: string;
            description?: string | undefined;
        }>, "many">;
        required: z.ZodDefault<z.ZodBoolean>;
        defaultMode: z.ZodString;
        resolvedValueTypeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        displayName: string;
        modes: {
            id: string;
            name: string;
            dimensionId: string;
            description?: string | undefined;
        }[];
        required: boolean;
        defaultMode: string;
        description?: string | undefined;
        resolvedValueTypeIds?: string[] | undefined;
    }, {
        id: string;
        displayName: string;
        modes: {
            id: string;
            name: string;
            dimensionId: string;
            description?: string | undefined;
        }[];
        defaultMode: string;
        description?: string | undefined;
        required?: boolean | undefined;
        resolvedValueTypeIds?: string[] | undefined;
    }>, "many">;
    dimensionOrder: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    tokenCollections: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        resolvedValueTypeIds: z.ZodArray<z.ZodString, "many">;
        private: z.ZodDefault<z.ZodBoolean>;
        defaultModeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        modeResolutionStrategy: z.ZodOptional<z.ZodObject<{
            priorityByType: z.ZodArray<z.ZodString, "many">;
            fallbackStrategy: z.ZodEnum<["MOST_SPECIFIC_MATCH", "DIMENSION_PRIORITY", "NEAREST_PARENT", "DEFAULT_VALUE"]>;
        }, "strip", z.ZodTypeAny, {
            priorityByType: string[];
            fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
        }, {
            priorityByType: string[];
            fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        resolvedValueTypeIds: string[];
        private: boolean;
        description?: string | undefined;
        defaultModeIds?: string[] | undefined;
        modeResolutionStrategy?: {
            priorityByType: string[];
            fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
        } | undefined;
    }, {
        id: string;
        name: string;
        resolvedValueTypeIds: string[];
        description?: string | undefined;
        private?: boolean | undefined;
        defaultModeIds?: string[] | undefined;
        modeResolutionStrategy?: {
            priorityByType: string[];
            fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
        } | undefined;
    }>, "many">;
    tokens: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        tokenCollectionId: z.ZodOptional<z.ZodString>;
        resolvedValueTypeId: z.ZodString;
        private: z.ZodDefault<z.ZodBoolean>;
        themeable: z.ZodDefault<z.ZodBoolean>;
        status: z.ZodOptional<z.ZodEnum<["experimental", "stable", "deprecated"]>>;
        tokenTier: z.ZodEnum<["PRIMITIVE", "SEMANTIC", "COMPONENT"]>;
        generatedByAlgorithm: z.ZodDefault<z.ZodBoolean>;
        algorithmId: z.ZodOptional<z.ZodString>;
        taxonomies: z.ZodArray<z.ZodObject<{
            taxonomyId: z.ZodString;
            termId: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            taxonomyId: string;
            termId: string;
        }, {
            taxonomyId: string;
            termId: string;
        }>, "many">;
        propertyTypes: z.ZodArray<z.ZodString, "many">;
        codeSyntax: z.ZodArray<z.ZodObject<{
            platformId: z.ZodString;
            formattedName: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            platformId: string;
            formattedName: string;
        }, {
            platformId: string;
            formattedName: string;
        }>, "many">;
        valuesByMode: z.ZodArray<z.ZodObject<{
            modeIds: z.ZodArray<z.ZodString, "many">;
            value: z.ZodUnion<[z.ZodObject<{
                value: z.ZodAny;
            }, "strip", z.ZodTypeAny, {
                value?: any;
            }, {
                value?: any;
            }>, z.ZodObject<{
                tokenId: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                tokenId: string;
            }, {
                tokenId: string;
            }>]>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            platformOverrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
                platformId: z.ZodString;
                value: z.ZodString;
                metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
            }, "strip", z.ZodTypeAny, {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }, {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }, {
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        displayName: string;
        private: boolean;
        resolvedValueTypeId: string;
        themeable: boolean;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
        generatedByAlgorithm: boolean;
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        tokenCollectionId?: string | undefined;
        algorithmId?: string | undefined;
    }, {
        id: string;
        displayName: string;
        resolvedValueTypeId: string;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        private?: boolean | undefined;
        tokenCollectionId?: string | undefined;
        themeable?: boolean | undefined;
        generatedByAlgorithm?: boolean | undefined;
        algorithmId?: string | undefined;
    }>, "many">;
    platforms: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        syntaxPatterns: z.ZodOptional<z.ZodObject<{
            prefix: z.ZodOptional<z.ZodString>;
            suffix: z.ZodOptional<z.ZodString>;
            delimiter: z.ZodOptional<z.ZodEnum<["", "_", "-", ".", "/"]>>;
            capitalization: z.ZodOptional<z.ZodEnum<["none", "uppercase", "lowercase", "capitalize"]>>;
            formatString: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            prefix?: string | undefined;
            suffix?: string | undefined;
            delimiter?: "" | "_" | "-" | "." | "/" | undefined;
            capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
            formatString?: string | undefined;
        }, {
            prefix?: string | undefined;
            suffix?: string | undefined;
            delimiter?: "" | "_" | "-" | "." | "/" | undefined;
            capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
            formatString?: string | undefined;
        }>>;
        valueFormatters: z.ZodOptional<z.ZodObject<{
            color: z.ZodOptional<z.ZodEnum<["hex", "rgb", "rgba", "hsl", "hsla"]>>;
            dimension: z.ZodOptional<z.ZodEnum<["px", "rem", "em", "pt", "dp", "sp"]>>;
            numberPrecision: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
            dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
            numberPrecision?: number | undefined;
        }, {
            color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
            dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
            numberPrecision?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        displayName: string;
        description?: string | undefined;
        syntaxPatterns?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
            delimiter?: "" | "_" | "-" | "." | "/" | undefined;
            capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
            formatString?: string | undefined;
        } | undefined;
        valueFormatters?: {
            color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
            dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
            numberPrecision?: number | undefined;
        } | undefined;
    }, {
        id: string;
        displayName: string;
        description?: string | undefined;
        syntaxPatterns?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
            delimiter?: "" | "_" | "-" | "." | "/" | undefined;
            capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
            formatString?: string | undefined;
        } | undefined;
        valueFormatters?: {
            color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
            dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
            numberPrecision?: number | undefined;
        } | undefined;
    }>, "many">;
    themes: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        isDefault: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        id: string;
        displayName: string;
        isDefault: boolean;
        description?: string | undefined;
    }, {
        id: string;
        displayName: string;
        isDefault: boolean;
        description?: string | undefined;
    }>, "many">>;
    themeOverrides: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodObject<{
        tokenId: z.ZodString;
        value: z.ZodObject<{
            value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
            tokenId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            value: string | number | boolean;
            tokenId?: string | undefined;
        }, {
            value: string | number | boolean;
            tokenId?: string | undefined;
        }>;
        platformOverrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
            platformId: z.ZodString;
            value: z.ZodObject<{
                value: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean]>;
                tokenId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                value: string | number | boolean;
                tokenId?: string | undefined;
            }, {
                value: string | number | boolean;
                tokenId?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            value: {
                value: string | number | boolean;
                tokenId?: string | undefined;
            };
            platformId: string;
        }, {
            value: {
                value: string | number | boolean;
                tokenId?: string | undefined;
            };
            platformId: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        tokenId: string;
        platformOverrides?: {
            value: {
                value: string | number | boolean;
                tokenId?: string | undefined;
            };
            platformId: string;
        }[] | undefined;
    }, {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        tokenId: string;
        platformOverrides?: {
            value: {
                value: string | number | boolean;
                tokenId?: string | undefined;
            };
            platformId: string;
        }[] | undefined;
    }>, "many">>>;
    taxonomies: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodString;
        terms: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            description?: string | undefined;
        }, {
            id: string;
            name: string;
            description?: string | undefined;
        }>, "many">;
        resolvedValueTypeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        name: string;
        terms: {
            id: string;
            name: string;
            description?: string | undefined;
        }[];
        resolvedValueTypeIds?: string[] | undefined;
    }, {
        id: string;
        description: string;
        name: string;
        terms: {
            id: string;
            name: string;
            description?: string | undefined;
        }[];
        resolvedValueTypeIds?: string[] | undefined;
    }>, "many">;
    resolvedValueTypes: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        displayName: z.ZodString;
        type: z.ZodOptional<z.ZodEnum<["COLOR", "DIMENSION", "SPACING", "FONT_FAMILY", "FONT_WEIGHT", "FONT_SIZE", "LINE_HEIGHT", "LETTER_SPACING", "DURATION", "CUBIC_BEZIER", "BLUR", "SPREAD", "RADIUS"]>>;
        description: z.ZodOptional<z.ZodString>;
        validation: z.ZodOptional<z.ZodObject<{
            pattern: z.ZodOptional<z.ZodString>;
            minimum: z.ZodOptional<z.ZodNumber>;
            maximum: z.ZodOptional<z.ZodNumber>;
            allowedValues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            minimum?: number | undefined;
            maximum?: number | undefined;
            pattern?: string | undefined;
            allowedValues?: string[] | undefined;
        }, {
            minimum?: number | undefined;
            maximum?: number | undefined;
            pattern?: string | undefined;
            allowedValues?: string[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        displayName: string;
        validation?: {
            minimum?: number | undefined;
            maximum?: number | undefined;
            pattern?: string | undefined;
            allowedValues?: string[] | undefined;
        } | undefined;
        type?: "COLOR" | "DIMENSION" | "SPACING" | "FONT_FAMILY" | "FONT_WEIGHT" | "FONT_SIZE" | "LINE_HEIGHT" | "LETTER_SPACING" | "DURATION" | "CUBIC_BEZIER" | "BLUR" | "SPREAD" | "RADIUS" | undefined;
        description?: string | undefined;
    }, {
        id: string;
        displayName: string;
        validation?: {
            minimum?: number | undefined;
            maximum?: number | undefined;
            pattern?: string | undefined;
            allowedValues?: string[] | undefined;
        } | undefined;
        type?: "COLOR" | "DIMENSION" | "SPACING" | "FONT_FAMILY" | "FONT_WEIGHT" | "FONT_SIZE" | "LINE_HEIGHT" | "LETTER_SPACING" | "DURATION" | "CUBIC_BEZIER" | "BLUR" | "SPREAD" | "RADIUS" | undefined;
        description?: string | undefined;
    }>, "many">;
    extensions: z.ZodOptional<z.ZodObject<{
        tokenGroups: z.ZodOptional<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            description: z.ZodOptional<z.ZodString>;
            tokenCollectionId: z.ZodString;
            tokens: z.ZodArray<z.ZodObject<{
                id: z.ZodString;
                displayName: z.ZodString;
                description: z.ZodOptional<z.ZodString>;
                tokenCollectionId: z.ZodOptional<z.ZodString>;
                resolvedValueTypeId: z.ZodString;
                private: z.ZodDefault<z.ZodBoolean>;
                themeable: z.ZodDefault<z.ZodBoolean>;
                status: z.ZodOptional<z.ZodEnum<["experimental", "stable", "deprecated"]>>;
                tokenTier: z.ZodEnum<["PRIMITIVE", "SEMANTIC", "COMPONENT"]>;
                generatedByAlgorithm: z.ZodDefault<z.ZodBoolean>;
                algorithmId: z.ZodOptional<z.ZodString>;
                taxonomies: z.ZodArray<z.ZodObject<{
                    taxonomyId: z.ZodString;
                    termId: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    taxonomyId: string;
                    termId: string;
                }, {
                    taxonomyId: string;
                    termId: string;
                }>, "many">;
                propertyTypes: z.ZodArray<z.ZodString, "many">;
                codeSyntax: z.ZodArray<z.ZodObject<{
                    platformId: z.ZodString;
                    formattedName: z.ZodString;
                }, "strip", z.ZodTypeAny, {
                    platformId: string;
                    formattedName: string;
                }, {
                    platformId: string;
                    formattedName: string;
                }>, "many">;
                valuesByMode: z.ZodArray<z.ZodObject<{
                    modeIds: z.ZodArray<z.ZodString, "many">;
                    value: z.ZodUnion<[z.ZodObject<{
                        value: z.ZodAny;
                    }, "strip", z.ZodTypeAny, {
                        value?: any;
                    }, {
                        value?: any;
                    }>, z.ZodObject<{
                        tokenId: z.ZodString;
                    }, "strip", z.ZodTypeAny, {
                        tokenId: string;
                    }, {
                        tokenId: string;
                    }>]>;
                    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                    platformOverrides: z.ZodOptional<z.ZodArray<z.ZodObject<{
                        platformId: z.ZodString;
                        value: z.ZodString;
                        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
                    }, "strip", z.ZodTypeAny, {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }, {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }>, "many">>;
                }, "strip", z.ZodTypeAny, {
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }, {
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }>, "many">;
            }, "strip", z.ZodTypeAny, {
                id: string;
                displayName: string;
                private: boolean;
                resolvedValueTypeId: string;
                themeable: boolean;
                tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
                generatedByAlgorithm: boolean;
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
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }[];
                status?: "experimental" | "stable" | "deprecated" | undefined;
                description?: string | undefined;
                tokenCollectionId?: string | undefined;
                algorithmId?: string | undefined;
            }, {
                id: string;
                displayName: string;
                resolvedValueTypeId: string;
                tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }[];
                status?: "experimental" | "stable" | "deprecated" | undefined;
                description?: string | undefined;
                private?: boolean | undefined;
                tokenCollectionId?: string | undefined;
                themeable?: boolean | undefined;
                generatedByAlgorithm?: boolean | undefined;
                algorithmId?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            tokenCollectionId: string;
            tokens: {
                id: string;
                displayName: string;
                private: boolean;
                resolvedValueTypeId: string;
                themeable: boolean;
                tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
                generatedByAlgorithm: boolean;
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
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }[];
                status?: "experimental" | "stable" | "deprecated" | undefined;
                description?: string | undefined;
                tokenCollectionId?: string | undefined;
                algorithmId?: string | undefined;
            }[];
            description?: string | undefined;
        }, {
            id: string;
            name: string;
            tokenCollectionId: string;
            tokens: {
                id: string;
                displayName: string;
                resolvedValueTypeId: string;
                tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }[];
                status?: "experimental" | "stable" | "deprecated" | undefined;
                description?: string | undefined;
                private?: boolean | undefined;
                tokenCollectionId?: string | undefined;
                themeable?: boolean | undefined;
                generatedByAlgorithm?: boolean | undefined;
                algorithmId?: string | undefined;
            }[];
            description?: string | undefined;
        }>, "many">>;
        tokenVariants: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        tokenGroups?: {
            id: string;
            name: string;
            tokenCollectionId: string;
            tokens: {
                id: string;
                displayName: string;
                private: boolean;
                resolvedValueTypeId: string;
                themeable: boolean;
                tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
                generatedByAlgorithm: boolean;
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
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }[];
                status?: "experimental" | "stable" | "deprecated" | undefined;
                description?: string | undefined;
                tokenCollectionId?: string | undefined;
                algorithmId?: string | undefined;
            }[];
            description?: string | undefined;
        }[] | undefined;
        tokenVariants?: Record<string, any> | undefined;
    }, {
        tokenGroups?: {
            id: string;
            name: string;
            tokenCollectionId: string;
            tokens: {
                id: string;
                displayName: string;
                resolvedValueTypeId: string;
                tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }[];
                status?: "experimental" | "stable" | "deprecated" | undefined;
                description?: string | undefined;
                private?: boolean | undefined;
                tokenCollectionId?: string | undefined;
                themeable?: boolean | undefined;
                generatedByAlgorithm?: boolean | undefined;
                algorithmId?: string | undefined;
            }[];
            description?: string | undefined;
        }[] | undefined;
        tokenVariants?: Record<string, any> | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    taxonomies: {
        id: string;
        description: string;
        name: string;
        terms: {
            id: string;
            name: string;
            description?: string | undefined;
        }[];
        resolvedValueTypeIds?: string[] | undefined;
    }[];
    tokens: {
        id: string;
        displayName: string;
        private: boolean;
        resolvedValueTypeId: string;
        themeable: boolean;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
        generatedByAlgorithm: boolean;
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        tokenCollectionId?: string | undefined;
        algorithmId?: string | undefined;
    }[];
    version: string;
    dimensions: {
        id: string;
        displayName: string;
        modes: {
            id: string;
            name: string;
            dimensionId: string;
            description?: string | undefined;
        }[];
        required: boolean;
        defaultMode: string;
        description?: string | undefined;
        resolvedValueTypeIds?: string[] | undefined;
    }[];
    systemName: string;
    systemId: string;
    versionHistory: {
        date: string;
        version: string;
        dimensions: string[];
        migrationStrategy?: {
            emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
            preserveOriginalValues: boolean;
        } | undefined;
    }[];
    tokenCollections: {
        id: string;
        name: string;
        resolvedValueTypeIds: string[];
        private: boolean;
        description?: string | undefined;
        defaultModeIds?: string[] | undefined;
        modeResolutionStrategy?: {
            priorityByType: string[];
            fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
        } | undefined;
    }[];
    platforms: {
        id: string;
        displayName: string;
        description?: string | undefined;
        syntaxPatterns?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
            delimiter?: "" | "_" | "-" | "." | "/" | undefined;
            capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
            formatString?: string | undefined;
        } | undefined;
        valueFormatters?: {
            color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
            dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
            numberPrecision?: number | undefined;
        } | undefined;
    }[];
    resolvedValueTypes: {
        id: string;
        displayName: string;
        validation?: {
            minimum?: number | undefined;
            maximum?: number | undefined;
            pattern?: string | undefined;
            allowedValues?: string[] | undefined;
        } | undefined;
        type?: "COLOR" | "DIMENSION" | "SPACING" | "FONT_FAMILY" | "FONT_WEIGHT" | "FONT_SIZE" | "LINE_HEIGHT" | "LETTER_SPACING" | "DURATION" | "CUBIC_BEZIER" | "BLUR" | "SPREAD" | "RADIUS" | undefined;
        description?: string | undefined;
    }[];
    description?: string | undefined;
    dimensionEvolution?: {
        rules: {
            whenAdding: string;
            mapEmptyModeIdsTo: string[];
            preserveDefaultValues?: boolean | undefined;
        }[];
    } | undefined;
    dimensionOrder?: string[] | undefined;
    themes?: {
        id: string;
        displayName: string;
        isDefault: boolean;
        description?: string | undefined;
    }[] | undefined;
    themeOverrides?: Record<string, {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        tokenId: string;
        platformOverrides?: {
            value: {
                value: string | number | boolean;
                tokenId?: string | undefined;
            };
            platformId: string;
        }[] | undefined;
    }[]> | undefined;
    extensions?: {
        tokenGroups?: {
            id: string;
            name: string;
            tokenCollectionId: string;
            tokens: {
                id: string;
                displayName: string;
                private: boolean;
                resolvedValueTypeId: string;
                themeable: boolean;
                tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
                generatedByAlgorithm: boolean;
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
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }[];
                status?: "experimental" | "stable" | "deprecated" | undefined;
                description?: string | undefined;
                tokenCollectionId?: string | undefined;
                algorithmId?: string | undefined;
            }[];
            description?: string | undefined;
        }[] | undefined;
        tokenVariants?: Record<string, any> | undefined;
    } | undefined;
}, {
    taxonomies: {
        id: string;
        description: string;
        name: string;
        terms: {
            id: string;
            name: string;
            description?: string | undefined;
        }[];
        resolvedValueTypeIds?: string[] | undefined;
    }[];
    tokens: {
        id: string;
        displayName: string;
        resolvedValueTypeId: string;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        private?: boolean | undefined;
        tokenCollectionId?: string | undefined;
        themeable?: boolean | undefined;
        generatedByAlgorithm?: boolean | undefined;
        algorithmId?: string | undefined;
    }[];
    version: string;
    dimensions: {
        id: string;
        displayName: string;
        modes: {
            id: string;
            name: string;
            dimensionId: string;
            description?: string | undefined;
        }[];
        defaultMode: string;
        description?: string | undefined;
        required?: boolean | undefined;
        resolvedValueTypeIds?: string[] | undefined;
    }[];
    systemName: string;
    systemId: string;
    versionHistory: {
        date: string;
        version: string;
        dimensions: string[];
        migrationStrategy?: {
            emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
            preserveOriginalValues: boolean;
        } | undefined;
    }[];
    tokenCollections: {
        id: string;
        name: string;
        resolvedValueTypeIds: string[];
        description?: string | undefined;
        private?: boolean | undefined;
        defaultModeIds?: string[] | undefined;
        modeResolutionStrategy?: {
            priorityByType: string[];
            fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
        } | undefined;
    }[];
    platforms: {
        id: string;
        displayName: string;
        description?: string | undefined;
        syntaxPatterns?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
            delimiter?: "" | "_" | "-" | "." | "/" | undefined;
            capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
            formatString?: string | undefined;
        } | undefined;
        valueFormatters?: {
            color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
            dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
            numberPrecision?: number | undefined;
        } | undefined;
    }[];
    resolvedValueTypes: {
        id: string;
        displayName: string;
        validation?: {
            minimum?: number | undefined;
            maximum?: number | undefined;
            pattern?: string | undefined;
            allowedValues?: string[] | undefined;
        } | undefined;
        type?: "COLOR" | "DIMENSION" | "SPACING" | "FONT_FAMILY" | "FONT_WEIGHT" | "FONT_SIZE" | "LINE_HEIGHT" | "LETTER_SPACING" | "DURATION" | "CUBIC_BEZIER" | "BLUR" | "SPREAD" | "RADIUS" | undefined;
        description?: string | undefined;
    }[];
    description?: string | undefined;
    dimensionEvolution?: {
        rules: {
            whenAdding: string;
            mapEmptyModeIdsTo: string[];
            preserveDefaultValues?: boolean | undefined;
        }[];
    } | undefined;
    dimensionOrder?: string[] | undefined;
    themes?: {
        id: string;
        displayName: string;
        isDefault: boolean;
        description?: string | undefined;
    }[] | undefined;
    themeOverrides?: Record<string, {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        tokenId: string;
        platformOverrides?: {
            value: {
                value: string | number | boolean;
                tokenId?: string | undefined;
            };
            platformId: string;
        }[] | undefined;
    }[]> | undefined;
    extensions?: {
        tokenGroups?: {
            id: string;
            name: string;
            tokenCollectionId: string;
            tokens: {
                id: string;
                displayName: string;
                resolvedValueTypeId: string;
                tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }[];
                status?: "experimental" | "stable" | "deprecated" | undefined;
                description?: string | undefined;
                private?: boolean | undefined;
                tokenCollectionId?: string | undefined;
                themeable?: boolean | undefined;
                generatedByAlgorithm?: boolean | undefined;
                algorithmId?: string | undefined;
            }[];
            description?: string | undefined;
        }[] | undefined;
        tokenVariants?: Record<string, any> | undefined;
    } | undefined;
}>, {
    taxonomies: {
        id: string;
        description: string;
        name: string;
        terms: {
            id: string;
            name: string;
            description?: string | undefined;
        }[];
        resolvedValueTypeIds?: string[] | undefined;
    }[];
    tokens: {
        id: string;
        displayName: string;
        private: boolean;
        resolvedValueTypeId: string;
        themeable: boolean;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
        generatedByAlgorithm: boolean;
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        tokenCollectionId?: string | undefined;
        algorithmId?: string | undefined;
    }[];
    version: string;
    dimensions: {
        id: string;
        displayName: string;
        modes: {
            id: string;
            name: string;
            dimensionId: string;
            description?: string | undefined;
        }[];
        required: boolean;
        defaultMode: string;
        description?: string | undefined;
        resolvedValueTypeIds?: string[] | undefined;
    }[];
    systemName: string;
    systemId: string;
    versionHistory: {
        date: string;
        version: string;
        dimensions: string[];
        migrationStrategy?: {
            emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
            preserveOriginalValues: boolean;
        } | undefined;
    }[];
    tokenCollections: {
        id: string;
        name: string;
        resolvedValueTypeIds: string[];
        private: boolean;
        description?: string | undefined;
        defaultModeIds?: string[] | undefined;
        modeResolutionStrategy?: {
            priorityByType: string[];
            fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
        } | undefined;
    }[];
    platforms: {
        id: string;
        displayName: string;
        description?: string | undefined;
        syntaxPatterns?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
            delimiter?: "" | "_" | "-" | "." | "/" | undefined;
            capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
            formatString?: string | undefined;
        } | undefined;
        valueFormatters?: {
            color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
            dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
            numberPrecision?: number | undefined;
        } | undefined;
    }[];
    resolvedValueTypes: {
        id: string;
        displayName: string;
        validation?: {
            minimum?: number | undefined;
            maximum?: number | undefined;
            pattern?: string | undefined;
            allowedValues?: string[] | undefined;
        } | undefined;
        type?: "COLOR" | "DIMENSION" | "SPACING" | "FONT_FAMILY" | "FONT_WEIGHT" | "FONT_SIZE" | "LINE_HEIGHT" | "LETTER_SPACING" | "DURATION" | "CUBIC_BEZIER" | "BLUR" | "SPREAD" | "RADIUS" | undefined;
        description?: string | undefined;
    }[];
    description?: string | undefined;
    dimensionEvolution?: {
        rules: {
            whenAdding: string;
            mapEmptyModeIdsTo: string[];
            preserveDefaultValues?: boolean | undefined;
        }[];
    } | undefined;
    dimensionOrder?: string[] | undefined;
    themes?: {
        id: string;
        displayName: string;
        isDefault: boolean;
        description?: string | undefined;
    }[] | undefined;
    themeOverrides?: Record<string, {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        tokenId: string;
        platformOverrides?: {
            value: {
                value: string | number | boolean;
                tokenId?: string | undefined;
            };
            platformId: string;
        }[] | undefined;
    }[]> | undefined;
    extensions?: {
        tokenGroups?: {
            id: string;
            name: string;
            tokenCollectionId: string;
            tokens: {
                id: string;
                displayName: string;
                private: boolean;
                resolvedValueTypeId: string;
                themeable: boolean;
                tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
                generatedByAlgorithm: boolean;
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
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }[];
                status?: "experimental" | "stable" | "deprecated" | undefined;
                description?: string | undefined;
                tokenCollectionId?: string | undefined;
                algorithmId?: string | undefined;
            }[];
            description?: string | undefined;
        }[] | undefined;
        tokenVariants?: Record<string, any> | undefined;
    } | undefined;
}, {
    taxonomies: {
        id: string;
        description: string;
        name: string;
        terms: {
            id: string;
            name: string;
            description?: string | undefined;
        }[];
        resolvedValueTypeIds?: string[] | undefined;
    }[];
    tokens: {
        id: string;
        displayName: string;
        resolvedValueTypeId: string;
        tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
            value: {
                value?: any;
            } | {
                tokenId: string;
            };
            modeIds: string[];
            metadata?: Record<string, any> | undefined;
            platformOverrides?: {
                value: string;
                platformId: string;
                metadata?: Record<string, any> | undefined;
            }[] | undefined;
        }[];
        status?: "experimental" | "stable" | "deprecated" | undefined;
        description?: string | undefined;
        private?: boolean | undefined;
        tokenCollectionId?: string | undefined;
        themeable?: boolean | undefined;
        generatedByAlgorithm?: boolean | undefined;
        algorithmId?: string | undefined;
    }[];
    version: string;
    dimensions: {
        id: string;
        displayName: string;
        modes: {
            id: string;
            name: string;
            dimensionId: string;
            description?: string | undefined;
        }[];
        defaultMode: string;
        description?: string | undefined;
        required?: boolean | undefined;
        resolvedValueTypeIds?: string[] | undefined;
    }[];
    systemName: string;
    systemId: string;
    versionHistory: {
        date: string;
        version: string;
        dimensions: string[];
        migrationStrategy?: {
            emptyModeIds: "mapToDefaults" | "preserveEmpty" | "requireExplicit";
            preserveOriginalValues: boolean;
        } | undefined;
    }[];
    tokenCollections: {
        id: string;
        name: string;
        resolvedValueTypeIds: string[];
        description?: string | undefined;
        private?: boolean | undefined;
        defaultModeIds?: string[] | undefined;
        modeResolutionStrategy?: {
            priorityByType: string[];
            fallbackStrategy: "MOST_SPECIFIC_MATCH" | "DIMENSION_PRIORITY" | "NEAREST_PARENT" | "DEFAULT_VALUE";
        } | undefined;
    }[];
    platforms: {
        id: string;
        displayName: string;
        description?: string | undefined;
        syntaxPatterns?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
            delimiter?: "" | "_" | "-" | "." | "/" | undefined;
            capitalization?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined;
            formatString?: string | undefined;
        } | undefined;
        valueFormatters?: {
            color?: "hex" | "rgb" | "rgba" | "hsl" | "hsla" | undefined;
            dimension?: "px" | "rem" | "em" | "pt" | "dp" | "sp" | undefined;
            numberPrecision?: number | undefined;
        } | undefined;
    }[];
    resolvedValueTypes: {
        id: string;
        displayName: string;
        validation?: {
            minimum?: number | undefined;
            maximum?: number | undefined;
            pattern?: string | undefined;
            allowedValues?: string[] | undefined;
        } | undefined;
        type?: "COLOR" | "DIMENSION" | "SPACING" | "FONT_FAMILY" | "FONT_WEIGHT" | "FONT_SIZE" | "LINE_HEIGHT" | "LETTER_SPACING" | "DURATION" | "CUBIC_BEZIER" | "BLUR" | "SPREAD" | "RADIUS" | undefined;
        description?: string | undefined;
    }[];
    description?: string | undefined;
    dimensionEvolution?: {
        rules: {
            whenAdding: string;
            mapEmptyModeIdsTo: string[];
            preserveDefaultValues?: boolean | undefined;
        }[];
    } | undefined;
    dimensionOrder?: string[] | undefined;
    themes?: {
        id: string;
        displayName: string;
        isDefault: boolean;
        description?: string | undefined;
    }[] | undefined;
    themeOverrides?: Record<string, {
        value: {
            value: string | number | boolean;
            tokenId?: string | undefined;
        };
        tokenId: string;
        platformOverrides?: {
            value: {
                value: string | number | boolean;
                tokenId?: string | undefined;
            };
            platformId: string;
        }[] | undefined;
    }[]> | undefined;
    extensions?: {
        tokenGroups?: {
            id: string;
            name: string;
            tokenCollectionId: string;
            tokens: {
                id: string;
                displayName: string;
                resolvedValueTypeId: string;
                tokenTier: "PRIMITIVE" | "SEMANTIC" | "COMPONENT";
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
                    value: {
                        value?: any;
                    } | {
                        tokenId: string;
                    };
                    modeIds: string[];
                    metadata?: Record<string, any> | undefined;
                    platformOverrides?: {
                        value: string;
                        platformId: string;
                        metadata?: Record<string, any> | undefined;
                    }[] | undefined;
                }[];
                status?: "experimental" | "stable" | "deprecated" | undefined;
                description?: string | undefined;
                private?: boolean | undefined;
                tokenCollectionId?: string | undefined;
                themeable?: boolean | undefined;
                generatedByAlgorithm?: boolean | undefined;
                algorithmId?: string | undefined;
            }[];
            description?: string | undefined;
        }[] | undefined;
        tokenVariants?: Record<string, any> | undefined;
    } | undefined;
}>;
export declare const validateTokenSystem: (data: unknown) => TokenSystem;
export declare const validateResolvedValueType: (data: unknown) => ResolvedValueType;
export declare const validateToken: (data: unknown) => Token;
export declare const validateTokenCollection: (data: unknown) => TokenCollection;
export declare const validateDimension: (data: unknown) => Dimension;
export declare const validateTokenValue: (data: unknown) => TokenValue;
export declare const validateColorValue: (data: unknown) => ColorValue;
export declare const validateDimensionValue: (data: unknown) => DimensionValue;
export declare const validateDurationValue: (data: unknown) => DurationValue;
export declare const validateCubicBezierValue: (data: unknown) => CubicBezierValue;
export declare const validateShadowValue: (data: unknown) => ShadowValue;
export declare const validateTypographyValue: (data: unknown) => TypographyValue;
export declare const validateBorderValue: (data: unknown) => BorderValue;
export declare const validateTheme: (data: unknown) => Theme;
export declare const validateThemeOverride: (data: unknown) => ThemeOverride;
export declare const validateThemeOverrides: (data: unknown) => ThemeOverrides;
export declare const validateTaxonomy: (data: unknown) => Taxonomy;
/**
 * Validates that each taxonomyId in a token's taxonomies exists in the top-level taxonomies array,
 * and that each termId exists in the referenced taxonomy.
 * Returns an array of errors (empty if valid).
 */
export declare function validateTokenTaxonomiesReferentialIntegrity(token: Token, allTaxonomies: Taxonomy[]): string[];
export declare function validateTokenCollectionCompatibility(token: Token, collections: TokenCollection[]): string[];
export declare function findCompatibleCollection(token: Token, collections: TokenCollection[]): TokenCollection | undefined;
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
