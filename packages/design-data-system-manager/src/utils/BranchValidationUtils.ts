/**
 * GitHub branch naming validation utilities
 */

/**
 * Validates a GitHub branch name according to Git and GitHub rules
 * @param branchName - The branch name to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export const validateBranchName = (branchName: string): { isValid: boolean; error?: string } => {
  if (!branchName || branchName.trim() === '') {
    return { isValid: false, error: 'Branch name cannot be empty' };
  }

  const trimmedName = branchName.trim();

  // Check length
  if (trimmedName.length > 255) {
    return { isValid: false, error: 'Branch name cannot exceed 255 characters' };
  }

  // Check for invalid characters
  const invalidChars = /[~^:?*[\\]/;
  if (invalidChars.test(trimmedName)) {
    return { isValid: false, error: 'Branch name cannot contain ~, ^, :, ?, *, [, or \\' };
  }

  // Check for invalid patterns
  if (trimmedName.includes('..')) {
    return { isValid: false, error: 'Branch name cannot contain consecutive dots (..)' };
  }

  // Check for leading/trailing special characters
  if (trimmedName.startsWith('-') || trimmedName.startsWith('.')) {
    return { isValid: false, error: 'Branch name cannot start with - or .' };
  }

  if (trimmedName.endsWith('/') || trimmedName.endsWith('.')) {
    return { isValid: false, error: 'Branch name cannot end with / or .' };
  }

  // Check for control characters
  for (let i = 0; i < trimmedName.length; i++) {
    const charCode = trimmedName.charCodeAt(i);
    if ((charCode >= 0 && charCode <= 31) || charCode === 127) {
      return { isValid: false, error: 'Branch name cannot contain control characters' };
    }
  }

  // Check for spaces (GitHub allows but recommends against)
  if (trimmedName.includes(' ')) {
    return { isValid: false, error: 'Branch name cannot contain spaces' };
  }

  return { isValid: true };
};

/**
 * Generates a suggested branch name based on GitHub username and timestamp
 * @param githubUsername - The GitHub username
 * @returns Suggested branch name in format: {username}/design-update-{timestamp}
 */
export const generateSuggestedBranchName = (githubUsername: string): string => {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '-')
    .replace(/\..+/, '')
    .replace(/:/g, '-');
  
  return `${githubUsername}/design-update-${timestamp}`;
};

/**
 * Checks if a branch name is a main/master branch
 * @param branchName - The branch name to check
 * @returns True if it's a main branch
 */
export const isMainBranch = (branchName: string): boolean => {
  const mainBranches = ['main', 'master', 'trunk'];
  return mainBranches.includes(branchName.toLowerCase());
}; 