import type { TokenSystem } from '@token-model/data-model';

export type DataSourceType = 'core' | 'platform' | 'theme';

export interface RepositoryInfo {
  fullName: string;
  branch: string;
  filePath: string;
  fileType: 'schema' | 'platform-extension' | 'theme-override';
}

export interface SourceContext {
  sourceType: DataSourceType;
  sourceId: string | null;
  coreRepository: RepositoryInfo;
  sourceRepository: RepositoryInfo;
  lastLoadedAt: string;
  hasLocalChanges: boolean;
  editMode: {
    isActive: boolean;
    sourceType: 'core' | 'platform-extension' | 'theme-override';
    sourceId: string | null;
    targetRepository: RepositoryInfo | null;
  };
}

export interface Change {
  type: 'added' | 'modified' | 'deleted';
  path: string[];
  oldValue?: any;
  newValue?: any;
  entityType: 'token' | 'collection' | 'dimension' | 'platform' | 'theme';
  entityId: string;
}

export interface ChangeTracking {
  hasChanges: boolean;
  changeCount: number;
  changes: Change[];
  lastModified: string;
}

export interface DataValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DataLoadResult {
  success: boolean;
  data?: TokenSystem;
  error?: string;
  validationResult?: DataValidationResult;
}

export interface SourceSwitchResult {
  success: boolean;
  previousSource?: SourceContext;
  newSource?: SourceContext;
  error?: string;
  changesDiscarded?: boolean;
}

// Validation schemas for different data types
export const VALIDATION_SCHEMAS = {
  schema: 'schema.json',
  'platform-extension': 'platform-extension-schema.json',
  'theme-override': 'theme-overrides-schema.json'
} as const;

export type ValidationSchemaType = keyof typeof VALIDATION_SCHEMAS; 