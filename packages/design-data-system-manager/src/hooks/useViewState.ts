import { useState, useCallback } from 'react';

export type ViewId = 
  | 'dashboard'
  | 'tokens'
  | 'collections'
  | 'system-variables'
  | 'algorithms'
  | 'analysis'
  | 'dimensions'
  | 'classification'
  | 'value-types'
  | 'themes'
  | 'platforms'
  | 'figma-settings'
  | 'validation'
  | 'version-history'
  | 'access'
  | 'schemas'
  | 'system'
  | 'components';

export const useViewState = () => {
  const [currentView, setCurrentView] = useState<ViewId>('dashboard');

  const navigateToView = useCallback((viewId: ViewId) => {
    setCurrentView(viewId);
  }, []);

  return {
    currentView,
    navigateToView,
  };
}; 