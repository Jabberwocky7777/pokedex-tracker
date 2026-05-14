/**
 * Gen 4 (DPP/HGSS) damage formula implementation.
 * Formula reference: Bulbapedia — Damage (Generation IV)
 */

import type { CalcPokemon, DamageResult, WeatherCondition, CalcMove } from "../types/battleTower";

// ─── Type effectiveness chart (Gen 4, 17 types) ──────────────────────────────

const TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel",
] as const;

type TypeName = typeof TYPES[number];

// Type effectiveness multipliers indexed as [attacking type][defending type]
// Using Bulbapedia Gen IV type chart
const TYPE_CHART: Record<string, Record<string, number>> = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, rock: 0.5, dragon: 0.5, grass: 2, ice: 2, bug: 2, steel: 2 },
  water:    { water: 0.5, grass: 0.5, dragon: 0.5, fire: 2, ground: 2, rock: 2 },
  electric: { electric: 0.5, grass: 0.5, dragon: 0.5, ground: 0, flying: 2, water: 2 },
  grass:    { fire: 0.5, grass: 0.5, poison: 0.5, flying: 0.5, bug: 0.5, dragon: 0.5, steel: 0.5, water: 2, ground: 2, rock: 2 },
  ice:      { water: 0.5, ice: 0.5, grass: 2, ground: 2, flying: 2, dragon: 2 },
  fighting: { normal: 2, ice: 2, rock: 2, dark: 2, steel: 2, poison: 0.5, bug: 0.5, psychic: 0.5, flying: 0.5, ghost: 0 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
  ground:   { poison: 2, rock: 2, steel: 2, electric: 2, fire: 2, grass: 0.5, bug: 0.5, flying: 0 },
  flying:   { grass: 2, fighting: 2, bug: 2, electric: 0.5, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, steel: 0.5, dark: 0 },
  bug:      { grass: 2, psychic: 2, dark: 2, fire: 0.5, fighting: 0.5, flying: 0.5, ghost: 0.5, steel: 0.5, poison: 0.5 },
  rock:     { fire: 2, ice: 2, flying: 2, bug: 2, fighting: 0.5, ground: 0.5, steel: 0.5 },
  ghost:    { ghost: 2, psychic: 2, normal: 0, dark: 0.5, steel: 0.5 },
  dragon:   { dragon: 2, steel: 0.5 },
  dark:     { ghost: 2, psychic: 2, dark: 0.5, fighting: 0.5, steel: 0.5 },
  steel:    { ice: 2, rock: 2, steel: 0.5, fire: 0.5, water: 0.5, electric: 0.5 },
};

export function typeEffectiveness(moveType: string, defenderTypes: string[]): number {
  let mult = 1;
  for (const dt of defenderTypes) {
    const row = TYPE_CHART[moveType.toLowerCase()];
    mult *= row?.[dt.toLowerCase()] ?? 1;
  }
  return mult;
}

// ─── Nature modifiers ─────────────────────────────────────────────────────────

const NATURE_MODS: Record<string, { plus: keyof CalcPokemon["stats"] | null; minus: keyof CalcPokemon["stats"] | null }> = {
  Hardy: { plus: null, minus: null },
  Lonely: { plus: "atk", minus: "def" },
  Brave: { plus: "atk", minus: "spe" },
  Adamant: { plus: "atk", minus: "spa" },
  Naughty: { plus: "atk", minus: "spd" },
  Bold: { plus: "def", minus: "atk" },
  Docile: { plus: null, minus: null },
  Relaxed: { plus: "def", minus: "spe" },
  Impish: { plus: "def", minus: "spa" },
  Lax: { plus: "def", minus: "spd" },
  Timid: { plus: "spe", minus: "atk" },
  Hasty: { plus: "spe", minus: "def" },
  Serious: { plus: null, minus: null },
  Jolly: { plus: "spe", minus: "spa" },
  Naive: { plus: "spe", minus: "spd" },
  Modest: { plus: "spa", minus: "atk" },
  Mild: { plus: "spa", minus: "def" },
  Quiet: { plus: "spa", minus: "spe" },
  Bashful: { plus: null, minus: null },
  Rash: { plus: "spa", minus: "spd" },
  Calm: { plus: "spd", minus: "atk" },
  Gentle: { plus: "spd", minus: "def" },
  Sassy: { plus: "spd", minus: "spe" },
  Careful: { plus: "spd", minus: "spa" },
  Quirky: { plus: null, minus: null },
};

// ─── Key ability effects ──────────────────────────────────────────────────────

export interface AbilityModifiers {
  /** True if this Pokémon is immune to the given move type */
  isImmune: (moveType: string) => boolean;
  /** Multiplier applied to damage received (e.g. Thick Fat 0.5 vs Fire/Ice) */
  defenseMult: (moveType: string) => number;
  /** Multiplier applied to attacker's Atk/SpA stat */
  attackerStatMult: () => number;
  /** True if no-damage from a non-super-effective move (Wonder Guard) */
  requiresSuperEffective: boolean;
  /** True if attacker's Atk is lowered when entering (Intimidate effect on opponent) */
  intimidatesOpponent: boolean;
  /** STAB override multiplier (Adaptability → 2 instead of 1.5) */
  stabMult: number | null;
  /** Auto weather set by this ability */
  autoWeather: WeatherCondition | null;
}

export function getAbilityModifiers(ability: string): AbilityModifiers {
  const a = ability.toLowerCase().replace(/[^a-z]/g, "");

  return {
    isImmune: (moveType: string) => {
      if (a === "levitate" && moveType.toLowerCase() === "ground") return true;
      return false;
    },
    defenseMult: (moveType: string) => {
      if (a === "thickfat") {
        const t = moveType.toLowerCase();
        if (t === "fire" || t === "ice") return 0.5;
      }
      return 1;
    },
    attackerStatMult: () => 1,
    requiresSuperEffective: a === "wonderguard",
    intimidatesOpponent: a === "intimidate",
    stabMult: a === "adaptability" ? 2 : null,
    autoWeather: a === "sandstream" ? "sand" : a === "snowwarning" ? "hail" : null,
  };
}

// ─── Item effects ─────────────────────────────────────────────────────────────

export interface ItemEffect {
  /** Short description shown in the UI, e.g. "Choice Band (+50% Atk)" */
  label: string;
  /** Multiplier applied to raw Atk before the formula (physical moves) */
  atkStatMult?: number;
  /** Multiplier applied to raw SpA before the formula (special moves) */
  spaStatMult?: number;
  /** Multiplier applied to final damage for physical moves */
  physDamageMult?: number;
  /** Multiplier applied to final damage for special moves */
  specDamageMult?: number;
  /** Multiplier applied to final damage for any damaging move */
  allDamageMult?: number;
  /** Multiplier applied after type effectiveness when hit is super-effective */
  superEffMult?: number;
  /** Type that this item boosts by ×1.2 (type-boosting hold items) */
  boostType?: string;
}

/** Items that boost one specific type by ×1.2 */
const TYPE_BOOST_ITEMS: Record<string, string> = {
  "silk scarf":     "normal",
  "charcoal":       "fire",
  "mystic water":   "water",
  "magnet":         "electric",
  "miracle seed":   "grass",
  "never-melt ice": "ice",
  "black belt":     "fighting",
  "poison barb":    "poison",
  "soft sand":      "ground",
  "sharp beak":     "flying",
  "twisted spoon":  "psychic",
  "silver powder":  "bug",
  "hard stone":     "rock",
  "spell tag":      "ghost",
  "dragon fang":    "dragon",
  "black glasses":  "dark",
  "metal coat":     "steel",
};

/** Returns the damage/stat effect for a held item. Returns an empty-label object if no effect. */
export function getItemEffect(item: string): ItemEffect {
  const i = item.toLowerCase().trim();
  if (i === "choice band")    return { label: "Choice Band (+50% Atk)",  atkStatMult: 1.5 };
  if (i === "choice specs")   return { label: "Choice Specs (+50% SpA)", spaStatMult: 1.5 };
  if (i === "choice scarf")   return { label: "Choice Scarf (+50% Spe)" }; // no damage effect
  if (i === "life orb")       return { label: "Life Orb (+30% dmg)",     allDamageMult: 1.3 };
  if (i === "expert belt")    return { label: "Expert Belt (+20% SE)",    superEffMult: 1.2 };
  if (i === "muscle band")    return { label: "Muscle Band (+10% phys)",  physDamageMult: 1.1 };
  if (i === "wise glasses")   return { label: "Wise Glasses (+10% spec)", specDamageMult: 1.1 };
  if (i === "thick club")     return { label: "Thick Club (×2 Atk)",      atkStatMult: 2.0 };
  if (i === "light ball")     return { label: "Light Ball (×2 Atk/SpA)",  atkStatMult: 2.0, spaStatMult: 2.0 };
  if (i === "soul dew")       return { label: "Soul Dew (+50% SpA)",      spaStatMult: 1.5 };
  const boostType = TYPE_BOOST_ITEMS[i];
  if (boostType) {
    const typeName = boostType.charAt(0).toUpperCase() + boostType.slice(1);
    return { label: `${item} (+20% ${typeName})`, boostType };
  }
  return { label: "" };
}

// ─── Main damage calculation ──────────────────────────────────────────────────

interface CalcInput {
  attacker: CalcPokemon;
  defender: CalcPokemon;
  move: CalcMove;
  weather: WeatherCondition;
  /** True if attacker has been intimidated (−1 Atk stage) */
  attackerIntimidated?: boolean;
  isCrit?: boolean;
  isSingles?: boolean;
  reflect?: boolean;
  lightScreen?: boolean;
}

function floorDiv(a: number, b: number) {
  return Math.floor(a / b);
}

/**
 * Returns all 16 damage rolls for the given calc input.
 * Roll values are rand multipliers 85..100 applied as floor((base * rand) / 100).
 */
export function calcDamageRolls(input: CalcInput): number[] {
  const { attacker, defender, move, weather, isCrit = false, isSingles = true, reflect = false, lightScreen = false } = input;

  if (move.category === "status" || move.power === 0) return Array(16).fill(0);

  const isPhysical = move.category === "physical";
  const defenderAbility = getAbilityModifiers(defender.ability);
  const attackerAbility = getAbilityModifiers(attacker.ability);

  // Immunity check
  const typeEff = typeEffectiveness(move.type, Array.from(defender.types));
  if (defenderAbility.isImmune(move.type) || typeEff === 0) return Array(16).fill(0);

  // Wonder Guard check
  if (defenderAbility.requiresSuperEffective && typeEff <= 1) return Array(16).fill(0);

  // Base stat selection
  let rawAtk = isPhysical ? attacker.stats.atk : attacker.stats.spa;
  const rawDef = isPhysical ? defender.stats.def : defender.stats.spd;

  // Item: Choice Band / Choice Specs / Thick Club / Light Ball — multiply stat before formula
  const itemEff = getItemEffect(attacker.item);
  if (isPhysical && itemEff.atkStatMult) rawAtk = Math.floor(rawAtk * itemEff.atkStatMult);
  if (!isPhysical && itemEff.spaStatMult) rawAtk = Math.floor(rawAtk * itemEff.spaStatMult);

  // Burn halves physical Atk
  if (isPhysical && attacker.status === "burn") rawAtk = floorDiv(rawAtk, 2);

  // Intimidate: −1 Atk stage = ×2/3
  if (isPhysical && input.attackerIntimidated) rawAtk = floorDiv(rawAtk * 2, 3);

  // Defensive screens (non-crit)
  let screenMult = 1;
  if (!isCrit) {
    if (isPhysical && reflect) screenMult = isSingles ? 0.5 : floorDiv(2, 3);
    if (!isPhysical && lightScreen) screenMult = isSingles ? 0.5 : floorDiv(2, 3);
  }

  // Attacker ability modifier to stat
  rawAtk = Math.floor(rawAtk * attackerAbility.attackerStatMult());

  // Step 1: Base damage
  const base = floorDiv(floorDiv(floorDiv(2 * attacker.level, 5) + 2, 1) * move.power * rawAtk, rawDef);
  const step1 = floorDiv(base, 50) + 2;

  // Step 2: Multi-target (irrelevant for singles)
  const targetsMult = isSingles ? 1 : 0.75;
  const step2 = Math.floor(step1 * targetsMult);

  // Step 3: Weather
  let weatherMult = 1;
  if (weather === "sun") {
    if (move.type.toLowerCase() === "fire") weatherMult = 1.5;
    if (move.type.toLowerCase() === "water") weatherMult = 0.5;
  } else if (weather === "rain") {
    if (move.type.toLowerCase() === "water") weatherMult = 1.5;
    if (move.type.toLowerCase() === "fire") weatherMult = 0.5;
  }
  const step3 = Math.floor(step2 * weatherMult);

  // Step 4: Crit (×2 in Gen 4, ignores screens)
  const step4 = isCrit ? Math.floor(step3 * 2) : step3;

  // STAB
  const attackerTypes = Array.from(attacker.types).map((t) => t.toLowerCase());
  const hasStab = attackerTypes.includes(move.type.toLowerCase());
  const stabMult = hasStab ? (attackerAbility.stabMult ?? 1.5) : 1;
  const step5 = Math.floor(step4 * stabMult);

  // Type effectiveness
  const step6 = Math.floor(step5 * typeEff);

  // Burn (already handled above via stat)
  // Ability defense modifier (Thick Fat etc.)
  const step7 = Math.floor(step6 * defenderAbility.defenseMult(move.type));

  // "Other" modifier: item damage multipliers (Gen 4 formula position — after type/ability, before screen)
  const isSuper = typeEff > 1;
  let itemDmgMult = 1.0;
  if (isSuper && itemEff.superEffMult)                                itemDmgMult *= itemEff.superEffMult;
  if (itemEff.boostType && itemEff.boostType === move.type.toLowerCase()) itemDmgMult *= 1.2;
  if (itemEff.allDamageMult)                                          itemDmgMult *= itemEff.allDamageMult;
  if (isPhysical && itemEff.physDamageMult)                           itemDmgMult *= itemEff.physDamageMult;
  if (!isPhysical && itemEff.specDamageMult)                          itemDmgMult *= itemEff.specDamageMult;
  const step7b = itemDmgMult !== 1.0 ? Math.floor(step7 * itemDmgMult) : step7;

  // Screen
  const step8 = Math.floor(step7b * screenMult);

  // Roll: 16 values from 85 to 100
  return Array.from({ length: 16 }, (_, i) => {
    const rand = 85 + i;
    return floorDiv(step8 * rand, 100);
  });
}

/**
 * Full damage result with KO probability analysis.
 */
export function calcDamage(input: CalcInput): DamageResult {
  const rolls = calcDamageRolls(input);
  const maxHp = input.defender.stats.hp;

  const min = Math.min(...rolls);
  const max = Math.max(...rolls);
  const minPercent = maxHp > 0 ? (min / maxHp) * 100 : 0;
  const maxPercent = maxHp > 0 ? (max / maxHp) * 100 : 0;

  // KO chance: fraction of rolls that OHKO
  const currentHp = input.defender.currentHp;
  const ohkoCount = rolls.filter((r) => r >= currentHp).length;
  const twohkoCount = rolls.filter((r) => r * 2 >= currentHp).length;

  let koChance: string;
  if (ohkoCount === 16) {
    koChance = "Guaranteed OHKO";
  } else if (ohkoCount > 0) {
    koChance = `${Math.round((ohkoCount / 16) * 100)}% chance to OHKO`;
  } else if (twohkoCount === 16) {
    koChance = "Guaranteed 2HKO";
  } else if (twohkoCount > 0) {
    koChance = `${Math.round((twohkoCount / 16) * 100)}% chance to 2HKO`;
  } else if (maxHp > 0 && max >= Math.ceil(currentHp / 3)) {
    koChance = "Possible 3HKO";
  } else {
    koChance = "Does not KO in 2";
  }

  return { min, max, minPercent, maxPercent, koChance, rolls };
}

// ─── Stat computation helpers ─────────────────────────────────────────────────

type StatKey4 = "hp" | "atk" | "def" | "spa" | "spd" | "spe";

/** Compute final stat from base stat + IV + EV + nature (Gen 4 formula) */
export function computeStat(
  statKey: StatKey4,
  base: number,
  iv: number,
  ev: number,
  nature: string,
  level: number
): number {
  const evBonus = Math.floor(ev / 4);
  if (statKey === "hp") {
    return Math.floor(((2 * base + iv + evBonus) * level) / 100) + level + 10;
  }
  const raw = Math.floor(((2 * base + iv + evBonus) * level) / 100) + 5;
  const natureMods = NATURE_MODS[nature];
  if (!natureMods) return raw;
  if (natureMods.plus === statKey) return Math.floor(raw * 1.1);
  if (natureMods.minus === statKey) return Math.floor(raw * 0.9);
  return raw;
}

export { TYPES, type TypeName };
