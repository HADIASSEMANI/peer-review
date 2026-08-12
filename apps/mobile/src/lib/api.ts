import { createApiClient } from '@repo/api-client';
import { useAuthStore } from '../store/auth';

const baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

export const api = createApiClient({
  baseUrl,
  getToken: () => useAuthStore.getState().token,
  // An expired or revoked token clears the session; the navigator then swaps
  // to the auth stack on its own because `token` drives which stack renders.
  onUnauthorized: () => {
    void useAuthStore.getState().signOut();
  },
});
