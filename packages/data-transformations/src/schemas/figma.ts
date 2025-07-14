import { z } from 'zod';

/**
 * Zod schema for Figma variable types
 */
export const FigmaVariableTypeSchema = z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']);

/**
 * Zod schema for Figma variable values
 */
export const FigmaVariableValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean()
]);

/**
 * Zod schema for Figma variable binding
 */
export const FigmaVariableBindingSchema = z.object({
  id: z.string(),
  type: z.literal('VARIABLE')
});

/**
 * Zod schema for Figma variable
 */
export const FigmaVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: FigmaVariableTypeSchema,
  value: FigmaVariableValueSchema,
  description: z.string().optional(),
  hidden: z.boolean().optional(),
  boundVariables: z.record(z.string(), FigmaVariableBindingSchema).optional()
});

/**
 * Zod schema for Figma variable collection
 */
export const FigmaVariableCollectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  hidden: z.boolean().optional(),
  variables: z.array(FigmaVariableSchema)
});

/**
 * Zod schema for Figma file variables response
 */
export const FigmaFileVariablesResponseSchema = z.object({
  variables: z.record(z.string(), FigmaVariableSchema),
  variableCollections: z.record(z.string(), FigmaVariableCollectionSchema)
});

/**
 * Zod schema for Figma API error response
 */
export const FigmaApiErrorSchema = z.object({
  status: z.number(),
  err: z.string()
});

/**
 * Zod schema for Figma API response for creating variables
 */
export const FigmaCreateVariablesResponseSchema = z.object({
  variables: z.record(z.string(), FigmaVariableSchema),
  variableCollections: z.record(z.string(), FigmaVariableCollectionSchema)
});

/**
 * Zod schema for Figma transformer options
 */
export const FigmaTransformerOptionsSchema = z.object({
  id: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  fileKey: z.string(),
  accessToken: z.string(),
  updateExisting: z.boolean().optional(),
  existingFigmaData: z.any().optional(), // Using any for complex FigmaFileVariablesResponse type
  tempToRealId: z.record(z.string(), z.string()).optional()
});

/**
 * Zod schema for Figma transformation result
 */
export const FigmaTransformationResultSchema = z.object({
  variables: z.array(FigmaVariableSchema),
  collections: z.array(FigmaVariableCollectionSchema),
  stats: z.object({
    created: z.number(),
    updated: z.number(),
    deleted: z.number(),
    collectionsCreated: z.number(),
    collectionsUpdated: z.number()
  })
});

// Export types
export type FigmaVariableType = z.infer<typeof FigmaVariableTypeSchema>;
export type FigmaVariableValue = z.infer<typeof FigmaVariableValueSchema>;
export type FigmaVariableBinding = z.infer<typeof FigmaVariableBindingSchema>;
export type FigmaVariable = z.infer<typeof FigmaVariableSchema>;
export type FigmaVariableCollection = z.infer<typeof FigmaVariableCollectionSchema>;
export type FigmaFileVariablesResponse = z.infer<typeof FigmaFileVariablesResponseSchema>;
export type FigmaApiError = z.infer<typeof FigmaApiErrorSchema>;
export type FigmaCreateVariablesResponse = z.infer<typeof FigmaCreateVariablesResponseSchema>;
export type FigmaTransformerOptions = z.infer<typeof FigmaTransformerOptionsSchema>;
export type FigmaTransformationResult = z.infer<typeof FigmaTransformationResultSchema>; 