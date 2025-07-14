import type { BaseTransformerOptions } from './common';

/**
 * Figma variable types
 */
export type FigmaVariableType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN';

/**
 * Figma variable value - can be direct value or alias
 */
export type FigmaVariableValue = 
  | string 
  | number 
  | boolean 
  | { r: number; g: number; b: number; a?: number }
  | { type: 'VARIABLE_ALIAS'; id: string };

/**
 * Figma variable binding
 */
export interface FigmaVariableBinding {
  /** The ID of the bound variable */
  id: string;
  /** The type of binding */
  type: 'VARIABLE';
}

/**
 * Figma variable
 */
export interface FigmaVariable {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  id: string;
  name: string;
  description?: string;
  variableCollectionId: string;
  resolvedType: FigmaVariableType;
  scopes: string[];
  hiddenFromPublishing: boolean;
  codeSyntax?: Record<string, string>;
}

/**
 * Figma variable collection
 */
export interface FigmaVariableCollection {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  id: string;
  name: string;
  initialModeId: string;
  hiddenFromPublishing?: boolean;
  /** Modes within this collection */
  modes?: Record<string, { name: string; modeId: string }>;
}

/**
 * Figma file variables response
 */
export interface FigmaFileVariablesResponse {
  /** Variables in the file */
  variables: Record<string, FigmaVariable>;
  /** Variable collections in the file */
  variableCollections: Record<string, FigmaVariableCollection>;
  /** Variable modes in the file */
  variableModes?: Record<string, FigmaVariableMode>;
}

/**
 * Figma transformer options
 */
export interface FigmaTransformerOptions extends BaseTransformerOptions {
  /** Figma file key */
  fileKey: string;
  /** Personal access token for Figma API */
  accessToken: string;
  /** Whether to update existing variables (default: true) */
  updateExisting?: boolean;
  /** Existing Figma file data for determining CREATE vs UPDATE actions */
  existingFigmaData?: FigmaFileVariablesResponse;
  /** Mapping of temporary IDs to real Figma IDs from mappings/{fileKey}.json */
  tempToRealId?: Record<string, string>;
}

/**
 * Figma transformation result
 */
export interface FigmaTransformationResult {
  /** Created/updated variables */
  variables: FigmaVariable[];
  /** Created/updated collections */
  collections: FigmaVariableCollection[];
  /** Statistics about the transformation */
  stats: {
    /** Number of variables created */
    created: number;
    /** Number of variables updated */
    updated: number;
    /** Number of variables deleted */
    deleted: number;
    /** Number of collections created */
    collectionsCreated: number;
    /** Number of collections updated */
    collectionsUpdated: number;
  };
  variableModes: FigmaVariableMode[];
  variableModeValues: FigmaVariableModeValue[];
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Figma API error response
 */
export interface FigmaApiError {
  /** Error status */
  status: number;
  /** Error message */
  err: string;
}

/**
 * Figma API response for creating variables
 */
export interface FigmaCreateVariablesResponse {
  /** Created variables */
  variables: Record<string, FigmaVariable>;
  /** Created collections */
  variableCollections: Record<string, FigmaVariableCollection>;
  /** Mapping of temporary IDs to real Figma IDs */
  tempToRealId?: Record<string, string>;
}

export interface FigmaVariableMode {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  id: string;
  name: string;
  variableCollectionId: string;
}

export interface FigmaVariableModeValue {
  variableId: string;
  modeId: string;
  value: FigmaVariableValue;
} 