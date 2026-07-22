import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { emitSessionActivity } from '../auth/sessionEvents';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      properties: [],
      propertyId: null,
      sessionStartedAt: null,
      /** Used for both login and switching the active property — both return the same shape. */
      setSession: (token, user, properties = [], propertyId = null) => {
        set({ token, user, properties, propertyId, sessionStartedAt: Date.now() });
        emitSessionActivity();
      },
      clearSession: () => set({ token: null, user: null, properties: [], propertyId: null, sessionStartedAt: null }),
    }),
    { name: 'hotel-auth' },
  ),
);
