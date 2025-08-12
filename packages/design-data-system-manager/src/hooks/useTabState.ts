import { useState, useCallback, useEffect } from 'react';

export const useTabState = (viewId: string, defaultTab: number = 0) => {
  // Initialize from URL parameters
  const getInitialTab = (): number => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const tabParam = urlParams.get('tab');
    
    // Only use tab parameter if we're on the correct view
    if (viewParam === viewId && tabParam) {
      const tabIndex = parseInt(tabParam, 10);
      if (!isNaN(tabIndex) && tabIndex >= 0) {
        return tabIndex;
      }
    }
    
    return defaultTab;
  };

  const [currentTab, setCurrentTab] = useState<number>(getInitialTab);

  const navigateToTab = useCallback((tabIndex: number) => {
    // Update URL parameter
    const url = new URL(window.location.href);
    url.searchParams.set('view', viewId);
    url.searchParams.set('tab', tabIndex.toString());
    
    // Update browser history without reloading
    window.history.replaceState({}, '', url.toString());
    
    // Update state
    setCurrentTab(tabIndex);
  }, [viewId]);

  // Listen for URL changes (e.g., browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialTab();
      setCurrentTab(newTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [viewId]);

  return {
    currentTab,
    navigateToTab,
  };
};
