import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/app/App';
import { Providers } from '@/app/providers';
import { initTheme, bootstrapAuth } from '@/stores';
import { completeMagicLinkSignIn } from '@/services/auth.service';
import '@/styles/globals.css';

// Apply persisted theme before first paint to avoid a flash.
initTheme();

// Complete an email-link (magic link) sign-in if the user arrived via one,
// then hydrate the auth store from Firebase's persisted session before
// rendering, so guarded routes never render a permanent blank screen.
completeMagicLinkSignIn()
  .then(() => bootstrapAuth())
  .finally(() => {
  // Register the PWA service worker (auto-update; no-op if build lacks it).
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* offline support is progressive */
      });
    });
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Providers>
        <App />
      </Providers>
    </StrictMode>
  );
});