import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Files whose name never changes but whose content does: the page shell, the
 * service worker and its manifest, the app manifest, translations, icons.
 * They must be checked on every visit - with "keep a year" a phone that had
 * the site once kept an old copy (2026-11-09: a scanned table QR opened the
 * old app, which did not know the customers' window, and showed the login).
 * Hashed bundles (main-ABC123.js) never change, so they keep the long cache.
 */
const ALWAYS_CHECK = /(^|\/)(index(\.csr)?\.html|ngsw\.json|ngsw-worker\.js|safety-worker\.js|worker-basic\.min\.js|manifest\.webmanifest|favicon[^/]*|baronix-b-[^/]*)$|\/assets\/i18n\//;

/**
 * The APKs moved to the backend (owner, 2026-11-13). Links people already
 * shared (/downloads/baronixtz-1.0.x.apk) go to the newest one there.
 */
app.get(/^\/downloads\/baronixtz-[\d.]+\.apk$/, (_req, res) => {
  res.redirect(302, 'https://api.baronixtz.com/public/app/latest/download');
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      if (ALWAYS_CHECK.test(path.replace(/\\/g, '/'))) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }),
);


app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
