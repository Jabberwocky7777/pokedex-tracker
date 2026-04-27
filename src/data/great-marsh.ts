// Great Marsh daily Pokémon not tracked by PokéAPI (binoculars rotation mechanic).
// The main encounter data (safari method, walk, slot2) comes from pokemon.json.
// This file supplements with Pokémon that PokéAPI omits from its Great Marsh data.

export type MarshGame = "diamond" | "pearl" | "platinum";

export interface ExtraMarshPokemon {
  id: number;
  games: MarshGame[];
  /** Approximate encounter rate during daily rotation, as a percentage */
  chance: number;
}

// Verified missing from PokéAPI Great Marsh data:
export const GREAT_MARSH_EXTRA_DAILY: ExtraMarshPokemon[] = [
  { id: 115, games: ["diamond", "pearl"],              chance: 10 }, // Kangaskhan
  { id: 438, games: ["diamond", "pearl", "platinum"],  chance: 10 }, // Bonsly
  { id: 439, games: ["diamond", "pearl", "platinum"],  chance: 10 }, // Mime Jr.
  { id: 446, games: ["diamond", "pearl", "platinum"],  chance: 5  }, // Munchlax
];

// These Pokémon appear only in the Great Marsh via daily rotation (safari method,
// locationAreaSlug "great-marsh" with no area number) — they are NOT area-specific.
// Use this slug to detect the daily pool in encounter data.
export const GREAT_MARSH_DAILY_SLUG = "great-marsh";
export const GREAT_MARSH_AREA_SLUGS = [1, 2, 3, 4, 5, 6].map((n) => `great-marsh-area-${n}`);
export const GREAT_MARSH_ALL_SLUGS = [GREAT_MARSH_DAILY_SLUG, ...GREAT_MARSH_AREA_SLUGS];

export function isGreatMarshSlug(slug: string): boolean {
  return GREAT_MARSH_ALL_SLUGS.includes(slug);
}
