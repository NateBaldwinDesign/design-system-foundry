/**
 * Enhanced error messages for different edit sources
 * Used throughout the data source management system
 */

export const ERROR_MESSAGES = {
  'theme-not-themeable': 'Token "{tokenId}" is not themeable and cannot be edited in theme mode',
  'platform-override-required': 'Editing "{tokenId}" in platform mode will create a platform override',
  'theme-override-required': 'Editing "{tokenId}" in theme mode will create a theme override',
  'schema-validation-failed': 'Data does not conform to {schemaType} schema: {errors}',
  'permission-denied': 'You do not have write access to {repositoryName}',
  'override-creation-failed': 'Failed to create override for token "{tokenId}": {error}',
  'invalid-edit-source': 'Cannot edit {sourceType} data in current context',
  'source-switch-warning': 'You have {changeCount} unsaved changes. Switching sources will reset to main branch and discard changes. Continue?',
  'branch-reset-failed': 'Failed to reset to main branch for {sourceType}: {error}',
  'edit-mode-exit-failed': 'Failed to exit edit mode: {error}',
  'validation-errors': 'Validation errors found: {errors}',
  'token-not-found': 'Token "{tokenId}" not found in core data',
  'platform-id-required': 'Platform ID required for platform extension data',
  'theme-id-required': 'Theme ID required for theme override data',
  'unknown-source-type': 'Unknown source type: {sourceType}',
  'override-validation-failed': 'Override validation failed: {errors}',
  'edit-permission-required': 'Edit permissions required to modify {sourceType} data'
} as const;

export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;

/**
 * Format error message with parameters
 */
export function formatErrorMessage(
  key: ErrorMessageKey, 
  params: Record<string, string | number>
): string {
  let message = ERROR_MESSAGES[key];
  
  // Replace parameters in the message
  for (const [param, value] of Object.entries(params)) {
    message = message.replace(new RegExp(`{${param}}`, 'g'), String(value));
  }
  
  return message;
}

/**
 * Get error message for specific edit source validation
 */
export function getEditSourceErrorMessage(
  sourceType: 'core' | 'platform-extension' | 'theme-override',
  tokenId?: string,
  additionalParams: Record<string, string | number> = {}
): string {
  const params = { sourceType, tokenId: tokenId || 'unknown', ...additionalParams };
  
  switch (sourceType) {
    case 'theme-override':
      if (tokenId) {
        return formatErrorMessage('theme-override-required', params);
      }
      return formatErrorMessage('invalid-edit-source', params);
    case 'platform-extension':
      if (tokenId) {
        return formatErrorMessage('platform-override-required', params);
      }
      return formatErrorMessage('invalid-edit-source', params);
    case 'core':
      return formatErrorMessage('invalid-edit-source', params);
    default:
      return formatErrorMessage('unknown-source-type', params);
  }
}

/**
 * Get validation error message
 */
export function getValidationErrorMessage(
  schemaType: string,
  errors: string[]
): string {
  return formatErrorMessage('schema-validation-failed', {
    schemaType,
    errors: errors.join(', ')
  });
}

/**
 * Get permission error message
 */
export function getPermissionErrorMessage(repositoryName: string): string {
  return formatErrorMessage('permission-denied', { repositoryName });
}

/**
 * Get source switch warning message
 */
export function getSourceSwitchWarningMessage(changeCount: number): string {
  return formatErrorMessage('source-switch-warning', { changeCount });
} 