import { useState, useCallback, useEffect } from 'react';

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
  // Initialize from URL parameters
  const getInitialView = (): ViewId => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    
    // Validate view parameter against allowed values
    const validViews: ViewId[] = [
      'dashboard', 'tokens', 'collections', 'system-variables', 'algorithms', 
      'analysis', 'dimensions', 'classification', 'value-types', 'themes', 
      'platforms', 'figma-settings', 'validation', 'version-history', 
      'access', 'schemas', 'system', 'components'
    ];
    
    if (viewParam && validViews.includes(viewParam as ViewId)) {
      return viewParam as ViewId;
    }
    
    return 'dashboard'; // Default view
  };

  const [currentView, setCurrentView] = useState<ViewId>(getInitialView);

  const navigateToView = useCallback((viewId: ViewId) => {
    // Update URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set('view', viewId);
    
    // Clear tab parameter when switching views (tabs are view-specific)
    url.searchParams.delete('tab');
    
    // Update browser history without reloading
    window.history.replaceState({}, '', url.toString());
    
    // Update state
    setCurrentView(viewId);
  }, []);

  // Listen for URL changes (e.g., browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const newView = getInitialView();
      setCurrentView(newView);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    currentView,
    navigateToView,
  };
}; 