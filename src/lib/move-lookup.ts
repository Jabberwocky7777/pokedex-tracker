/**
 * Converts move display names (Battle Tower / designer format) to PokéAPI slugs
 * and batch-fetches power / type / category for each move.
 *
 * Examples:
 *   "GrassWhistle"  → "grass-whistle"
 *   "ThunderPunch"  → "thunder-punch"
 *   "Hi Jump Kick"  → "hi-jump-kick"
 *   "Will-O-Wisp"   → "will-o-wisp"
 */

import { fetchMoveDetail } from "./move-fetch";
import type { CalcMove } from "../types/battleTower";

/** Convert a move display name to a PokéAPI slug. */
export function moveNameToSlug(name: string): string {
  return (
    name
      // camelCase → hyphenated  ("GrassWhistle" → "Grass-Whistle")
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      // Remove apostrophes  ("King's Rock" → "Kings Rock")
      .replace(/'/g, "")
      // Spaces → hyphens
      .replace(/\s+/g, "-")
      .toLowerCase()
      // Collapse consecutive hyphens
      .replace(/-+/g, "-")
      .trim()
  );
}

/** Try to fill in power/type/category for one move. Returns the move unchanged on failure. */
async function tryEnrichMove(move: CalcMove): Promise<CalcMove> {
  const name = move.name.trim();
  // Nothing to do if empty or already has real power data
  if (!name) return move;
  if (move.power > 0) return move;

  try {
    const slug = moveNameToSlug(name);
    const detail = await fetchMoveDetail(slug);
    return {
      ...move,
      power: detail.power ?? 0,
      type: detail.type,
      category: detail.category,
    };
  } catch {
    // Move not in PokéAPI (or network error) — leave as-is
    return move;
  }
}

/**
 * Enrich all moves in the array with power/type/category fetched from PokéAPI.
 * Already-enriched moves (power > 0) are skipped.
 * Silently skips moves that can't be resolved.
 */
export async function enrichCalcMoves(moves: CalcMove[]): Promise<CalcMove[]> {
  return Promise.all(moves.map(tryEnrichMove));
}
