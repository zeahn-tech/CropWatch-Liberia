import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register CropWatch Service Worker and Background Sync
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered with scope:', registration.scope);
        // Register background sync if supported
        if ('sync' in registration) {
          navigator.serviceWorker.ready.then((readyReg) => {
            (readyReg as any).sync.register('sync-observations')
              .then(() => console.log('Background sync registered: sync-observations'))
              .catch((err: any) => console.warn('Background sync registration failed:', err));
          });
        }
      })
      .catch((err) => {
        console.error('SW registration failed:', err);
      });
  });
}
