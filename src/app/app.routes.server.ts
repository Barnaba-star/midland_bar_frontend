import { RenderMode, ServerRoute } from '@angular/ssr';

// Only the two genuinely public pages are safe to prerender at build
// time: they show the same thing to everyone. Every other route
// (dashboard, pos/**, settings/**) renders role-gated UI driven by the
// JWT in the browser's localStorage — something that doesn't exist at
// build time. Prerendering those baked a "logged out, no role" version
// into the static HTML; hydration then had to reconcile that against
// the real client state, and role-gated buttons (e.g. the Sales page's
// "New Sale" / "Manage Sales" tabs) would stay missing until something
// else forced a fresh client-side render. Rendering them client-only
// avoids the mismatch entirely.
export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'login',
    renderMode: RenderMode.Prerender
  },
  {
    // The Android app download page - public, the same for everyone.
    path: 'app',
    renderMode: RenderMode.Prerender
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
