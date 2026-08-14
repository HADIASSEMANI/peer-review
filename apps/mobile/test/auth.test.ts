import { Role } from '@repo/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { INACTIVITY_TIMEOUT_MS, useAuthStore } from '../src/store/auth';

const mockUser = {
  id: 'u1',
  email: 'student@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: Role.STUDENT,
  organizationId: 'org1',
  studentId: '12345',
  createdAt: new Date().toISOString(),
};

describe('useAuthStore session & inactivity timeout', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    await useAuthStore.getState().signOut();
  });

  it('sets token, user, and lastActivity on signIn', async () => {
    const now = Date.now();
    await useAuthStore.getState().signIn({
      accessToken: 'jwt-token-123',
      user: mockUser,
    });

    const state = useAuthStore.getState();
    expect(state.token).toBe('jwt-token-123');
    expect(state.user).toEqual(mockUser);
    expect(state.lastActivity).toBeGreaterThanOrEqual(now);
  });

  it('updates lastActivity when recordActivity is called', async () => {
    await useAuthStore.getState().signIn({
      accessToken: 'jwt-token-123',
      user: mockUser,
    });

    const initialActivity = useAuthStore.getState().lastActivity!;
    vi.useFakeTimers();
    vi.advanceTimersByTime(20_000);

    useAuthStore.getState().recordActivity();
    const updatedActivity = useAuthStore.getState().lastActivity!;

    expect(updatedActivity).toBeGreaterThan(initialActivity);
    vi.useRealTimers();
  });

  it('clears token, user, and lastActivity on signOut', async () => {
    await useAuthStore.getState().signIn({
      accessToken: 'jwt-token-123',
      user: mockUser,
    });

    await useAuthStore.getState().signOut();
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.lastActivity).toBeNull();
  });

  it('expires the session during hydrate if lastActivity is older than 30 minutes', async () => {
    const { storage } = useAuthStore.getState();
    const fortyMinutesAgo = Date.now() - (INACTIVITY_TIMEOUT_MS + 10 * 60 * 1000);

    await storage.set('peer-review.token', 'expired-token');
    await storage.set('peer-review.user', JSON.stringify(mockUser));
    await storage.set('peer-review.last_activity', String(fortyMinutesAgo));

    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.lastActivity).toBeNull();
    expect(state.hydrated).toBe(true);

    // Verify storage keys were cleaned up
    expect(await storage.get('peer-review.token')).toBeNull();
    expect(await storage.get('peer-review.user')).toBeNull();
    expect(await storage.get('peer-review.last_activity')).toBeNull();
  });

  it('restores session during hydrate if within 30 minutes window', async () => {
    const { storage } = useAuthStore.getState();
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    await storage.set('peer-review.token', 'valid-token');
    await storage.set('peer-review.user', JSON.stringify(mockUser));
    await storage.set('peer-review.last_activity', String(fiveMinutesAgo));

    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.token).toBe('valid-token');
    expect(state.user).toEqual(mockUser);
    expect(state.hydrated).toBe(true);
    expect(state.lastActivity).toBeGreaterThanOrEqual(fiveMinutesAgo);
  });
});
