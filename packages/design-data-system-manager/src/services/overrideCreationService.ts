import type { ExtendedToken, TokenValue, ValueByMode } from '../components/TokenEditorDialog';
import type { DataSourceContext } from './dataSourceManager';

export interface OverrideCreationResult {
  success: boolean;
  overrideData: Record<string, unknown> | null;
  error?: string;
  changes: {
    tokenId: string;
    changedFields: string[];
    originalValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
  };
}

export class OverrideCreationService {
  /**
   * Create platform extension override when editing a token
   */
  static createPlatformOverride(
    token: ExtendedToken,
    originalToken: ExtendedToken | null,
    platformId: string
  ): OverrideCreationResult {
    try {
      const changes = this.detectChanges(token, originalToken);
      
      if (changes.changedFields.length === 0) {
        return {
          success: true,
          overrideData: null,
          changes
        };
      }

      // Create platform extension override structure
      const overrideData = {
        systemId: 'design-system', // This should come from context
        platformId: platformId,
        version: '1.0.0',
        figmaFileKey: `platform-${platformId}-key`,
        tokenOverrides: [
          {
            id: token.id,
            ...this.extractChangedFields(token, changes.changedFields)
          }
        ]
      };

      return {
        success: true,
        overrideData,
        changes
      };
    } catch (error) {
      return {
        success: false,
        overrideData: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        changes: {
          tokenId: token.id,
          changedFields: [],
          originalValues: {},
          newValues: {}
        }
      };
    }
  }

  /**
   * Create theme override when editing a token
   */
  static createThemeOverride(
    token: ExtendedToken,
    originalToken: ExtendedToken | null,
    themeId: string
  ): OverrideCreationResult {
    try {
      // Check if token is themeable
      if (!token.themeable) {
        return {
          success: false,
          overrideData: null,
          error: `Token "${token.id}" is not themeable and cannot be edited in theme mode`,
          changes: {
            tokenId: token.id,
            changedFields: [],
            originalValues: {},
            newValues: {}
          }
        };
      }

      const changes = this.detectChanges(token, originalToken);
      
      if (changes.changedFields.length === 0) {
        return {
          success: true,
          overrideData: null,
          changes
        };
      }

      // Create theme override structure
      const overrideData = {
        systemId: 'design-system', // This should come from context
        themeId: themeId,
        figmaFileKey: `theme-${themeId}-key`,
        tokenOverrides: [
          {
            tokenId: token.id,
            valuesByMode: this.extractChangedValuesByMode(token, originalToken)
          }
        ]
      };

      return {
        success: true,
        overrideData,
        changes
      };
    } catch (error) {
      return {
        success: false,
        overrideData: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        changes: {
          tokenId: token.id,
          changedFields: [],
          originalValues: {},
          newValues: {}
        }
      };
    }
  }

  /**
   * Detect what fields have changed between original and modified token
   */
  private static detectChanges(
    modifiedToken: ExtendedToken,
    originalToken: ExtendedToken | null
  ): {
    tokenId: string;
    changedFields: string[];
    originalValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
  } {
    if (!originalToken) {
      // New token - all fields are changes
      return {
        tokenId: modifiedToken.id,
        changedFields: Object.keys(modifiedToken).filter(key => 
          key !== 'id' && modifiedToken[key as keyof ExtendedToken] !== undefined
        ),
        originalValues: {},
        newValues: modifiedToken
      };
    }

    const changedFields: string[] = [];
    const originalValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    // Compare each field
    const fieldsToCompare = [
      'displayName',
      'description',
      'themeable',
      'private',
      'status',
      'tokenTier',
      'resolvedValueTypeId',
      'generatedByAlgorithm',
      'algorithmId',
      'valuesByMode'
    ] as const;

    for (const field of fieldsToCompare) {
      const originalValue = originalToken[field];
      const newValue = modifiedToken[field];

      if (this.hasValueChanged(originalValue, newValue)) {
        changedFields.push(field);
        originalValues[field] = originalValue;
        newValues[field] = newValue;
      }
    }

    return {
      tokenId: modifiedToken.id,
      changedFields,
      originalValues,
      newValues
    };
  }

  /**
   * Check if a value has changed
   */
  private static hasValueChanged(original: unknown, modified: unknown): boolean {
    if (original === modified) return false;
    if (original === undefined && modified !== undefined) return true;
    if (original !== undefined && modified === undefined) return true;
    
    // Deep comparison for objects
    if (typeof original === 'object' && typeof modified === 'object') {
      return JSON.stringify(original) !== JSON.stringify(modified);
    }
    
    return original !== modified;
  }

  /**
   * Extract only the changed fields from a token
   */
  private static extractChangedFields(
    token: ExtendedToken,
    changedFields: string[]
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    for (const field of changedFields) {
      if (field === 'valuesByMode') {
        // Handle valuesByMode specially - only include changed values
        result[field] = this.extractChangedValuesByMode(token, null);
      } else {
        result[field] = token[field as keyof ExtendedToken];
      }
    }
    
    return result;
  }

  /**
   * Extract only the changed values from valuesByMode
   */
  private static extractChangedValuesByMode(
    modifiedToken: ExtendedToken,
    originalToken: ExtendedToken | null
  ): ValueByMode[] {
    if (!originalToken) {
      // New token - include all valuesByMode
      return modifiedToken.valuesByMode || [];
    }

    const result: ValueByMode[] = [];
    const originalValuesByMode = originalToken.valuesByMode || [];

    for (const modifiedValue of modifiedToken.valuesByMode || []) {
      const originalValue = originalValuesByMode.find(ov => 
        JSON.stringify(ov.modeIds.sort()) === JSON.stringify(modifiedValue.modeIds.sort())
      );

      if (!originalValue || this.hasValueByModeChanged(originalValue, modifiedValue)) {
        // Only include the changed value
        result.push({
          modeIds: modifiedValue.modeIds,
          value: modifiedValue.value,
          metadata: modifiedValue.metadata
        });
      }
    }

    return result;
  }

  /**
   * Check if a ValueByMode has changed
   */
  private static hasValueByModeChanged(original: ValueByMode, modified: ValueByMode): boolean {
    // Compare values
    if (JSON.stringify(original.value) !== JSON.stringify(modified.value)) {
      return true;
    }

    // Compare metadata
    if (JSON.stringify(original.metadata) !== JSON.stringify(modified.metadata)) {
      return true;
    }

    return false;
  }

  /**
   * Create override based on current edit context
   */
  static createOverrideForContext(
    token: ExtendedToken,
    originalToken: ExtendedToken | null,
    dataSourceContext: DataSourceContext
  ): OverrideCreationResult {
    const { sourceType, sourceId } = dataSourceContext.editMode;

    if (!sourceId) {
      return {
        success: false,
        overrideData: null,
        error: 'No source ID specified for override creation',
        changes: {
          tokenId: token.id,
          changedFields: [],
          originalValues: {},
          newValues: {}
        }
      };
    }

    switch (sourceType) {
      case 'platform-extension':
        return this.createPlatformOverride(token, originalToken, sourceId);
      case 'theme-override':
        return this.createThemeOverride(token, originalToken, sourceId);
      case 'core':
        return {
          success: true,
          overrideData: null,
          changes: {
            tokenId: token.id,
            changedFields: [],
            originalValues: {},
            newValues: {}
          }
        };
      default:
        return {
          success: false,
          overrideData: null,
          error: `Unknown source type: ${sourceType}`,
          changes: {
            tokenId: token.id,
            changedFields: [],
            originalValues: {},
            newValues: {}
          }
        };
    }
  }
} 