import type { AuthResponse, PublicUser } from '@repo/types';
import { create } from 'zustand';
import { webStorage, type TokenStorage } from './storage';

const TOKEN_KEY = 'peer-review.token';
const USER_KEY = 'peer-review.user';

interface AuthState {
  token: string | null;
  user: PublicUser | null;
  selectedOrg: string;
  /** False until the persisted session has been read back from storage. */
  hydrated: boolean;
  storage: TokenStorage;
  hydrate: () => Promise<void>;
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: PublicUser) => void;
  setSelectedOrg: (org: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  selectedOrg: 'org1',
  hydrated: false,
  storage: webStorage,

  async hydrate() {
    const { storage } = get();
    const [token, rawUser] = await Promise.all([storage.get(TOKEN_KEY), storage.get(USER_KEY)]);
    let user: PublicUser | null = null;
    try {
      user = rawUser ? (JSON.parse(rawUser) as PublicUser) : null;
    } catch {
      user = null;
    }
    set({ token, user, hydrated: true });
  },

  async signIn(auth) {
    const { storage } = get();
    await Promise.all([
      storage.set(TOKEN_KEY, auth.accessToken),
      storage.set(USER_KEY, JSON.stringify(auth.user)),
    ]);
    set({ token: auth.accessToken, user: auth.user });
  },

  async signOut() {
    const { storage } = get();
    await Promise.all([storage.remove(TOKEN_KEY), storage.remove(USER_KEY)]);
    set({ token: null, user: null });
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
