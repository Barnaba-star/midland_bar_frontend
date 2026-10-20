// Opened at Railway's own address (midlandbarfrontend-production.up.railway.app),
// talk to the backend at its Railway address too: the site keeps working when
// the baronixtz.com domain is down (it was held by Namecheap on 2026-10-21).
const onRailway = typeof location !== 'undefined' && location.hostname.endsWith('.up.railway.app');

export const environment = {
  production: true,
  // The bar's own domain for the backend (Railway service midland_bar_backend,
  // also reachable at midlandbarbackend-production.up.railway.app).
  baseApiUrl: onRailway ? 'https://midlandbarbackend-production.up.railway.app' : 'https://api.baronixtz.com'
};
