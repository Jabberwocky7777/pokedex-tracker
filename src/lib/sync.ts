/**
 * Sync utilities for the Pokédex Tracker.
 *
 * Token management: the SYNC_TOKEN is stored in localStorage after login.
 * Sync transport: WebSocket via ws-sync.ts + useSyncEngine.ts.
 *
 * API contract (HTTP):
 *   POST /api/login  { username, password } → { ok, token }
 *   GET  /health                            → { ok, loginEnabled, syncEnabled }
 *
 * WebSocket:
 *   /api/ws?token=<token>  (see ws-sync.ts for message protocol)
 */

import { useDexStore } from "../store/useDexStore";
import { useIvStore } from "../store/useIvStore";
import { useBoxSlotStore } from "../store/useBoxSlotStore";
import { useDesignerStore } from "../store/useDesignerStore";
import type { BackupData } from "./backup";

const STORAGE_KEY = "pokedex_sync_token";

// ── Token management (called by LoginScreen / logout) ─────────────────────────

export function getToken(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasToken(): boolean {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

// ── Payload builder (shared by WS push and backup export) ────────────────────

export function buildPayload(): BackupData {
  const { caughtByGen, pendingByGen } = useDexStore.getState();
  const { savedSessions } = useIvStore.getState();
  const { slotsByGen } = useBoxSlotStore.getState();
  const { slots: designerSlots } = useDesignerStore.getState();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tracker: { caughtByGen, pendingByGen },
    ivChecker: { savedSessions },
    boxSlots: slotsByGen,
    designer: designerSlots,
  };
}
