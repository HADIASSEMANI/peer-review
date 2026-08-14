import type { AuthResponse, PublicUser } from '@repo/types';
import { create } from 'zustand';
import { webStorage, type TokenStorage } from './storage';

const TOKEN_KEY = 'peer-review.token';
const USER_KEY = 'peer-review.user';
const LAST_ACTIVITY_KEY = 'peer-review.last_activity';

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AuthState {
  token: string | null;
  user: PublicUser | null;
  selectedOrg: string;
  lastActivity: number | null;
  /** False until the persisted session has been read back from storage. */
  hydrated: boolean;
  storage: TokenStorage;
  hydrate: () => Promise<void>;
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  recordActivity: () => void;
  setUser: (user: PublicUser) => void;
  setSelectedOrg: (org: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  selectedOrg: 'org1',
  lastActivity: null,
  hydrated: false,
  storage: webStorage,

  async hydrate() {
    const { storage } = get();
    const [token, rawUser, rawLastActivity] = await Promise.all([
      storage.get(TOKEN_KEY),
      storage.get(USER_KEY),
      storage.get(LAST_ACTIVITY_KEY),
    ]);
    let user: PublicUser | null = null;
    try {
      user = rawUser ? (JSON.parse(rawUser) as PublicUser) : null;
    } catch {
      user = null;
    }

    const lastActivity = rawLastActivity ? Number(rawLastActivity) : null;
    const isExpired = lastActivity ? Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS : false;

    if (token && isExpired) {
      // Inactivity timeout exceeded while away; clear session.
      await Promise.all([
        storage.remove(TOKEN_KEY),
        storage.remove(USER_KEY),
        storage.remove(LAST_ACTIVITY_KEY),
      ]);
      set({ token: null, user: null, lastActivity: null, hydrated: true });
      return;
    }

    const now = Date.now();
    if (token && user) {
      void storage.set(LAST_ACTIVITY_KEY, String(now));
      set({ token, user, lastActivity: now, hydrated: true });
    } else {
      set({ token, user, lastActivity: null, hydrated: true });
    }
  },

  async signIn(auth) {
    const { storage } = get();
    const now = Date.now();
    await Promise.all([
      storage.set(TOKEN_KEY, auth.accessToken),
      storage.set(USER_KEY, JSON.stringify(auth.user)),
      storage.set(LAST_ACTIVITY_KEY, String(now)),
    ]);
    set({ token: auth.accessToken, user: auth.user, lastActivity: now });
  },

  async signOut() {
    const { storage } = get();
    await Promise.all([
      storage.remove(TOKEN_KEY),
      storage.remove(USER_KEY),
      storage.remove(LAST_ACTIVITY_KEY),
    ]);
    set({ token: null, user: null, lastActivity: null });
  },

  recordActivity() {
    const now = Date.now();
    const { token, lastActivity, storage } = get();
    if (!token) return;

    if (!lastActivity || now - lastActivity >= 10_000) {
      void storage.set(LAST_ACTIVITY_KEY, String(now));
    }
    set({ lastActivity: now });
  },

  setUser(user) {
    set({ user });
    void get().storage.set(USER_KEY, JSON.stringify(user));
  },

  setSelectedOrg(selectedOrg) {
    set({ selectedOrg });
  },
}));

/** Non-reactive read, used by the API client's getToken hook. */
export const getAuthToken = (): string | null => useAuthStore.getState().token;
