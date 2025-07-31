import { useMemo } from 'react';
import type { GitHubUser } from '../config/github';
import type { DataSourceContext } from '../services/dataSourceManager';

interface UseAuthProps {
  githubUser: GitHubUser | null;
  isViewOnlyMode?: boolean;
  hasEditPermissions?: boolean;
  dataSourceContext?: DataSourceContext;
}

export const useAuth = ({ 
  githubUser, 
  isViewOnlyMode = false, 
  hasEditPermissions = false,
  dataSourceContext 
}: UseAuthProps) => {
  const isAuthenticated = useMemo(() => {
    return !!githubUser;
  }, [githubUser]);

  // Calculate edit permissions based on current data source context
  const canEditCore = useMemo(() => {
    if (!isAuthenticated || isViewOnlyMode) return false;
    return dataSourceContext?.permissions.core || false;
  }, [isAuthenticated, isViewOnlyMode, dataSourceContext?.permissions.core]);

  const canEditCurrentPlatform = useMemo(() => {
    if (!isAuthenticated || isViewOnlyMode) return false;
    if (!dataSourceContext?.currentPlatform || dataSourceContext.currentPlatform === 'none') return false;
    return dataSourceContext.permissions.platforms[dataSourceContext.currentPlatform] || false;
  }, [isAuthenticated, isViewOnlyMode, dataSourceContext?.currentPlatform, dataSourceContext?.permissions.platforms]);

  const canEditCurrentTheme = useMemo(() => {
    if (!isAuthenticated || isViewOnlyMode) return false;
    if (!dataSourceContext?.currentTheme || dataSourceContext.currentTheme === 'none') return false;
    return dataSourceContext.permissions.themes[dataSourceContext.currentTheme] || false;
  }, [isAuthenticated, isViewOnlyMode, dataSourceContext?.currentTheme, dataSourceContext?.permissions.themes]);

  // Overall canEdit based on current data source
  const canEdit = useMemo(() => {
    if (!isAuthenticated || isViewOnlyMode) return false;
    
    // If no data source context, fall back to general hasEditPermissions
    if (!dataSourceContext) return hasEditPermissions;
    
    // Check permissions based on current data source
    if (dataSourceContext.currentPlatform && dataSourceContext.currentPlatform !== 'none') {
      return canEditCurrentPlatform;
    }
    
    if (dataSourceContext.currentTheme && dataSourceContext.currentTheme !== 'none') {
      return canEditCurrentTheme;
    }
    
    // Default to core permissions
    return canEditCore;
  }, [isAuthenticated, isViewOnlyMode, hasEditPermissions, dataSourceContext, canEditCore, canEditCurrentPlatform, canEditCurrentTheme]);

  return {
    isAuthenticated,
    canEdit,
    canEditCore,
    canEditCurrentPlatform,
    canEditCurrentTheme,
    githubUser,
    isViewOnlyMode,
    hasEditPermissions
  };
}; 