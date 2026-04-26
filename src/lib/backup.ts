/**
 * Backup & restore utilities for the Pokédex Tracker.
 *
 * Covers:
 *   - Tracker: caught and pending Pokémon (useDexStore)
 *   - IV Checker: saved PC-box sessions (useIvStore)
 *
 * Backup format (version 1):
 * {
 *   "version": 1,
 *   "exportedAt": "<ISO string>",
 *   "tracker": { "caughtByGen": {...}, "pendingByGen": {...} },
 *   "ivChecker": { "savedSessions": [...] }
 * }
 */

import { useDexStore } from "../store/useDexStore";
import { useIvStore } from "../store/useIvStore";
import { useBoxSlotStore } from "../store/useBoxSlotStore";
import { useDesignerStore } from "../store/useDesignerStore";
import type { DesignerSlot } from "../store/useDesignerStore";
import type { Pokemon } from "../types";

const BACKUP_VERSION = 1;

export interface BackupData {
  version: number;
  exportedAt: string;
  tracker: {
    caughtByGen: Record<number, number[]>;
    pendingByGen: Record<number, number[]>;
  };
  ivChecker: {
    savedSessions: ReturnType<typeof useIvStore.getState>["savedSessions"];
  };
  boxSlots?: Record<number, Record<string, (number | null)[][]>>;
  designer?: DesignerSlot[];
}

// ─── Export ────────────────────────────────────────────────────────────────────

export function downloadBackup(): void {
  const { caughtByGen, pendingByGen } = useDexStore.getState();
  const { savedSessions } = useIvStore.getState();
  const { slotsByGen } = useBoxSlotStore.getState();

  const { slots: designerSlots } = useDesignerStore.getState();
  const data: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tracker: { caughtByGen, pendingByGen },
    ivChecker: { savedSessions },
    boxSlots: slotsByGen,
    designer: designerSlots,
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const a = document.createElement("a");
  a.href = url;
  a.download = `pokedex-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function triggerDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportFullJSON(): void {
  const { caughtByGen, pendingByGen } = useDexStore.getState();
  const { savedSessions } = useIvStore.getState();
  const { slotsByGen } = useBoxSlotStore.getState();
  const { slots: designerSlots } = useDesignerStore.getState();

  const data = {
    exportedAt: new Date().toISOString(),
    version: 2,
    tracker: { caughtByGen, pendingByGen },
    boxSlots: slotsByGen,
    designer: { slots: designerSlots },
    ivSessions: { savedSessions },
  };

  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(JSON.stringify(data, null, 2), `pokedex-export-${date}.json`, "application/json");
}

export function exportFullCSV(allPokemon: Pokemon[]): void {
  const { caughtByGen, pendingByGen } = useDexStore.getState();
  const { slotsByGen } = useBoxSlotStore.getState();

  const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));

  const gens = new Set([
    ...Object.keys(caughtByGen).map(Number),
    ...Object.keys(pendingByGen).map(Number),
  ]);

  const rows: string[] = [
    "dexNumber,name,gen,caught,pending,boxGame,boxNumber,boxSlot",
  ];

  for (const gen of gens) {
    const caught = new Set(caughtByGen[gen] ?? []);
    const pending = new Set(pendingByGen[gen] ?? []);
    const allIds = new Set([...caught, ...pending]);

    // Build box slot reverse map
    const slotMap = new Map<number, { game: string; box: number; slot: number }>();
    const genBoxes = slotsByGen[gen] ?? {};
    for (const [game, boxes] of Object.entries(genBoxes)) {
      boxes.forEach((box, boxIdx) => {
        box.forEach((id, slotIdx) => {
          if (id != null) slotMap.set(id, { game, box: boxIdx + 1, slot: slotIdx + 1 });
        });
      });
    }

    for (const id of allIds) {
      const p = pokemonMap.get(id);
      const name = p?.displayName ?? `#${id}`;
      const slotInfo = slotMap.get(id);
      rows.push(
        [
          id,
          `"${name}"`,
          gen,
          caught.has(id) ? 1 : 0,
          pending.has(id) ? 1 : 0,
          slotInfo ? `"${slotInfo.game}"` : "",
          slotInfo?.box ?? "",
          slotInfo?.slot ?? "",
        ].join(",")
      );
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  triggerDownload(rows.join("\n"), `pokedex-export-${date}.csv`, "text/csv");
}

// ─── Import / Restore ─────────────────────────────────────────────────────────

export type RestoreResult =
  | { ok: true }
  | { ok: false; error: string };

export function restoreBackup(file: File): Promise<RestoreResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);
        const validated = validateBackup(raw);
        if (!validated.ok) {
          resolve(validated);
          return;
        }

        const data = validated.data;

        // Restore tracker
        useDexStore.setState({
          caughtByGen: data.tracker.caughtByGen,
          pendingByGen: data.tracker.pendingByGen,
        });

        // Restore IV checker
        useIvStore.setState({ savedSessions: data.ivChecker.savedSessions });

        // Restore box slots (v2+)
        if (data.boxSlots) {
          useBoxSlotStore.getState().setSlotsByGen(data.boxSlots);
        }

        // Restore designer slots (v2+)
        if (Array.isArray(data.designer)) {
          useDesignerStore.getState().setSlots(
            data.designer as ReturnType<typeof useDesignerStore.getState>["slots"]
          );
        }

        resolve({ ok: true });
      } catch {
        resolve({ ok: false, error: "Could not parse backup file — is it valid JSON?" });
      }
    };
    reader.onerror = () => resolve({ ok: false, error: "Could not read the file." });
    reader.readAsText(file);
  });
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateBackup(
  raw: unknown
): { ok: true; data: BackupData } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Invalid backup file — expected a JSON object." };
  }

  const obj = raw as Record<string, unknown>;

  const SUPPORTED_VERSIONS = [1, 2];
  if (!SUPPORTED_VERSIONS.includes(obj.version as number)) {
    return {
      ok: false,
      error: `Unsupported backup version: ${obj.version}. Expected version 1 or 2.`,
    };
  }

  if (!isGenRecord(obj.tracker && (obj.tracker as Record<string, unknown>).caughtByGen)) {
    return { ok: false, error: "Invalid backup: tracker.caughtByGen is malformed." };
  }
  if (!isGenRecord(obj.tracker && (obj.tracker as Record<string, unknown>).pendingByGen)) {
    return { ok: false, error: "Invalid backup: tracker.pendingByGen is malformed." };
  }

  const iv = obj.ivChecker as Record<string, unknown> | null | undefined;
  if (!iv || !Array.isArray(iv.savedSessions)) {
    return { ok: false, error: "Invalid backup: ivChecker.savedSessions is missing." };
  }

  return { ok: true, data: raw as BackupData };
}

/** Returns true if value looks like Record<number, number[]> */
function isGenRecord(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  return Object.values(value as object).every(
    (v) => Array.isArray(v) && (v as unknown[]).every((n) => typeof n === "number")
  );
}
