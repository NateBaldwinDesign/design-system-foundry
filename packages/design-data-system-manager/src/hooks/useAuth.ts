import { useMemo } from 'react';
import type { GitHubUser } from '../config/github';

interface UseAuthProps {
  githubUser: GitHubUser | null;
  isViewOnlyMode?: boolean;
}

export const useAuth = ({ githubUser, isViewOnlyMode = false }: UseAuthProps) => {
  const isAuthenticated = useMemo(() => {
    return !!githubUser && !isViewOnlyMode;
  }, [githubUser, isViewOnlyMode]);

  const canEdit = useMemo(() => {
    return isAuthenticated;
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    canEdit,
    githubUser,
    isViewOnlyMode
  };
}; 