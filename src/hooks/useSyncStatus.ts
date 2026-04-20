import { create } from "zustand";

interface SyncStatus {
  syncing: boolean;
  lastSynced: Date | null;
  error: string | null;
  forcePush: (() => void) | null;
  setSyncing: (v: boolean) => void;
  setLastSynced: (d: Date) => void;
  setError: (e: string | null) => void;
  setForcePush: (fn: (() => void) | null) => void;
}

/** Non-persisted store for sync UI state. Consumed by SyncDot and useSyncEngine. */
export const useSyncStatus = create<SyncStatus>()((set) => ({
  syncing: false,
  lastSynced: null,
  error: null,
  forcePush: null,
  setSyncing: (syncing) => set({ syncing }),
  setLastSynced: (lastSynced) => set({ lastSynced, syncing: false, error: null }),
  setError: (error) => set({ error, syncing: false }),
  setForcePush: (fn) => set({ forcePush: fn }),
}));
