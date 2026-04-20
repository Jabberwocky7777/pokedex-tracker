import { calcHPStat, calcStat, getNatureMultiplier } from "./iv-calc";
import type { StatKey, Nature } from "./iv-calc";
import type { BaseStats } from "../types";

export type { StatKey, Nature };

export function calcAllStats(
  baseStats: BaseStats,
  ivs: Record<StatKey, number>,
  evs: Record<StatKey, number>,
  nature: Nature,
  level: number
): Record<StatKey, number> {
  const statKeys: StatKey[] = ["hp", "atk", "def", "spAtk", "spDef", "spe"];
  const result = {} as Record<StatKey, number>;
  for (const stat of statKeys) {
    const base = baseStats[stat as keyof BaseStats];
    const iv = ivs[stat] ?? 0;
    const ev = evs[stat] ?? 0;
    if (stat === "hp") {
      result[stat] = calcHPStat(base, iv, ev, level);
    } else {
      result[stat] = calcStat(base, iv, ev, level, getNatureMultiplier(nature, stat));
    }
  }
  return result;
}
