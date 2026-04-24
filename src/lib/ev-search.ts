import type { StatKey } from "./iv-calc";
import { STAT_LABELS } from "./iv-calc";

export const STAT_KEYWORDS: Record<string, StatKey> = {
  hp: "hp", health: "hp",
  attack: "atk", atk: "atk",
  defense: "def", defence: "def", def: "def",
  "sp atk": "spAtk", spatk: "spAtk", "special attack": "spAtk", spa: "spAtk",
  "sp def": "spDef", spdef: "spDef", "special defense": "spDef", "special defence": "spDef", spd: "spDef",
  speed: "spe", spe: "spe",
};

export function detectStatKey(q: string): StatKey | null {
  return STAT_KEYWORDS[q.trim().toLowerCase()] ?? null;
}

// Convenience re-export so consumers can import both from the same module
export { STAT_LABELS as STAT_LABELS_SHORT };
