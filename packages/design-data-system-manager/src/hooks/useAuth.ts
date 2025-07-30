import { useMemo } from 'react';
import type { GitHubUser } from '../config/github';

interface UseAuthProps {
  githubUser: GitHubUser | null;
  isViewOnlyMode?: boolean;
  hasEditPermissions?: boolean;
}

export const useAuth = ({ githubUser, isViewOnlyMode = false, hasEditPermissions = false }: UseAuthProps) => {
  const isAuthenticated = useMemo(() => {
    return !!githubUser;
  }, [githubUser]);

  const canEdit = useMemo(() => {
    // User can edit if they are authenticated, not in view-only mode, and have edit permissions
    return isAuthenticated && !isViewOnlyMode && hasEditPermissions;
  }, [isAuthenticated, isViewOnlyMode, hasEditPermissions]);

  return {
    isAuthenticated,
    canEdit,
    githubUser,
    isViewOnlyMode,
    hasEditPermissions
  };
}; 