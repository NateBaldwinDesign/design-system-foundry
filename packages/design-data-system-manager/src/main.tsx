import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Provider } from './components/ui/provider';

// Add color mode change listener
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    console.log('System color scheme changed:', e.matches ? 'dark' : 'light');
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider>
      <App />
    </Provider>
  </React.StrictMode>
); 