import { createApiClient } from '@repo/api-client';
import { useAuthStore } from '../store/auth';

/**
 * Resolved at BUILD time by Vite, not at runtime — changing it needs a rebuild,
 * not just an env edit.
 *
 * The deployed API lives at peer-review.onrender.com. VITE_API_URL overrides it
 * (Vite reads the repo-root .env; see envDir in vite.config.ts), which is what
 * local dev uses to point at localhost.
 */
const PRODUCTION_API = 'https://peer-review.onrender.com';

const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const baseUrl = configured || (import.meta.env.DEV ? 'http://localhost:3001' : PRODUCTION_API);

if (import.meta.env.DEV) {
  // Cheap way to catch "why is dev hitting production?" before it wastes an hour.
  console.info(`[api] base URL: ${baseUrl}`);
}

export const api = createApiClient({
  baseUrl,
  getToken: () => useAuthStore.getState().token,
  // An expired or revoked token clears the session; the navigator then swaps
  // to the auth stack on its own because `token` drives which stack renders.
  onUnauthorized: () => {
    void useAuthStore.getState().signOut();
  },
});
