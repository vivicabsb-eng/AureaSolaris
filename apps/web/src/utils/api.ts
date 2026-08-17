/**
 * Local service URL. A production bundle is served by FastAPI itself, so it
 * follows the page origin when the launcher chooses a free loopback port.
 * Vite development keeps the fixed sidecar port for the existing dev flow.
 */
const pageOrigin = typeof window !== 'undefined' && window.location.protocol.startsWith('http')
  ? window.location.origin
  : 'http://127.0.0.1:9876';

export const LOCAL_API_URL = import.meta.env.VITE_AUREA_API_URL
  || (!import.meta.env.DEV && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(pageOrigin)
    ? pageOrigin
    : 'http://127.0.0.1:9876');
