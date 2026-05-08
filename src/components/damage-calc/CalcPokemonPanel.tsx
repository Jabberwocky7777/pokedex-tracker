import { useState, useMemo } from "react";
import { useBattleCalcStore } from "../../store/useBattleCalcStore";
import { useDesignerStore } from "../../store/useDesignerStore";
import { designerSlotToCalcPokemon } from "../../lib/calc-from-designer";
import type { Pokemon } from "../../types";
import type { CalcPokemon, DamageResult, StatusCondition } from "../../types/battleTower";
import { TYPE_BG_COLORS } from "../../lib/type-colors";

interface Props {
  slot: "slot1" | "slot2";
  allPokemon: Pokemon[];
  moveResults: DamageResult[];
  defenderHp: number;
  label: string;
}

const STATUS_OPTIONS: { value: StatusCondition; label: string }[] = [
  { value: "none", label: "Healthy" },
  { value: "burn", label: "Burn" },
  { value: "paralysis", label: "Paralysis" },
  { value: "poison", label: "Poison" },
  { value: "freeze", label: "Freeze" },
  { value: "sleep", label: "Sleep" },
];

const STAT_LABELS: Record<string, string> = {
  hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe",
};

export default function CalcPokemonPanel({ slot, allPokemon, moveResults, defenderHp, label }: Props) {
  const store = useBattleCalcStore();
  const { slots: designerSlots } = useDesignerStore();
  const pokemon: CalcPokemon | null = store[slot];

  const setter = slot === "slot1" ? store.setSlot1 : store.setSlot2;

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Filled designer slots for the dropdown
  const designerOptions = useMemo(
    () => designerSlots.filter((s) => s.pokemonId != null),
    [designerSlots]
  );

  function loadFromDesigner(slotIndex: number) {
    const slot = designerSlots[slotIndex];
    if (!slot) return;
    const calc = designerSlotToCalcPokemon(slot, allPokemon);
    if (calc) setter(calc);
  }

  // Search for custom Pokémon
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return allPokemon.filter((p) => p.displayName.toLowerCase().includes(q)).slice(0, 10);
  }, [searchQuery, allPokemon]);

  function loadCustomPokemon(p: Pokemon) {
    const baseStats = p.baseStats;
    if (!baseStats) return;
    const stats = {
      hp: baseStats.hp + 10 + 50 + 31,     // rough Lv50 with 31 IVs, 0 EVs
      atk: Math.floor(((2 * baseStats.atk + 31) * 50) / 100) + 5,
      def: Math.floor(((2 * baseStats.def + 31) * 50) / 100) + 5,
      spa: Math.floor(((2 * (baseStats.spAtk ?? 0) + 31) * 50) / 100) + 5,
      spd: Math.floor(((2 * (baseStats.spDef ?? 0) + 31) * 50) / 100) + 5,
      spe: Math.floor(((2 * baseStats.spe + 31) * 50) / 100) + 5,
    };
    const calc: CalcPokemon = {
      source: "custom",
      species: p.displayName,
      types: p.types as [string] | [string, string],
      level: 50,
      nature: "Hardy",
      ability: "",
      item: "",
      status: "none",
      stats,
      moves: [
        { name: "", power: 0, type: "normal", category: "physical" },
        { name: "", power: 0, type: "normal", category: "physical" },
        { name: "", power: 0, type: "normal", category: "physical" },
        { name: "", power: 0, type: "normal", category: "physical" },
      ],
      currentHp: stats.hp,
    };
    setter(calc);
    setShowSearch(false);
    setSearchQuery("");
  }

  function updateField(patch: Partial<CalcPokemon>) {
    if (!pokemon) return;
    setter({ ...pokemon, ...patch });
  }

  function updateMove(moveIdx: number, patch: Partial<CalcPokemon["moves"][0]>) {
    if (!pokemon) return;
    const moves = [...pokemon.moves];
    moves[moveIdx] = { ...moves[moveIdx], ...patch };
    setter({ ...pokemon, moves });
  }

  const spriteId = allPokemon.find(
    (p) => p.displayName.toLowerCase() === pokemon?.species.toLowerCase()
  )?.id;
  const spriteUrl = spriteId
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`
    : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</div>

      {/* Load from dropdown */}
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {/* Designer slots dropdown */}
          <select
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500"
            value=""
            onChange={(e) => {
              if (e.target.value !== "") loadFromDesigner(parseInt(e.target.value));
            }}
          >
            <option value="">Load from Designer…</option>
            {designerOptions.map((s) => {
              const p = allPokemon.find((ap) => ap.id === s.pokemonId);
              const label = s.nickname || p?.displayName || `Slot ${s.slotIndex + 1}`;
              return (
                <option key={s.slotIndex} value={s.slotIndex}>
                  {label} (slot {s.slotIndex + 1})
                </option>
              );
            })}
          </select>
          <button
            onClick={() => setShowSearch((v) => !v)}
            className="px-2 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          >
            Custom
          </button>
        </div>

        {/* Custom species search */}
        {showSearch && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search Pokémon…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-indigo-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none"
              autoFocus
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-0.5 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => loadCustomPokemon(p)}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  >
                    <img
                      src={p.spriteUrl}
                      alt=""
                      className="w-6 h-6 object-contain pixelated"
                    />
                    {p.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pokémon info */}
      {pokemon ? (
        <>
          {/* Species header */}
          <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-2">
            {spriteUrl && (
              <img src={spriteUrl} alt={pokemon.species} className="w-12 h-12 object-contain pixelated" />
            )}
            <div>
              <div className="text-white font-semibold">{pokemon.species}</div>
              <div className="flex gap-1 mt-0.5">
                {pokemon.types.map((t) => (
                  <span key={t} className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_BG_COLORS[t] ?? "bg-gray-700 text-gray-200"}`}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Nature / Ability / Item / Status — compact grid */}
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div>
              <div className="text-gray-500 mb-0.5">Nature</div>
              <input
                type="text"
                value={pokemon.nature}
                onChange={(e) => updateField({ nature: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <div className="text-gray-500 mb-0.5">Ability</div>
              <input
                type="text"
                value={pokemon.ability}
                onChange={(e) => updateField({ ability: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-indigo-500"
                placeholder="(none)"
              />
            </div>
            <div>
              <div className="text-gray-500 mb-0.5">Item</div>
              <input
                type="text"
                value={pokemon.item}
                onChange={(e) => updateField({ item: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-indigo-500"
                placeholder="(none)"
              />
            </div>
            <div>
              <div className="text-gray-500 mb-0.5">Status</div>
              <select
                value={pokemon.status}
                onChange={(e) => updateField({ status: e.target.value as StatusCondition })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 focus:outline-none focus:border-indigo-500"
              >
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats table */}
          <div>
            <div className="text-xs text-gray-500 mb-1">Stats (Lv {pokemon.level})</div>
            <div className="grid grid-cols-3 gap-x-2 gap-y-0.5 text-xs font-mono">
              {(Object.keys(STAT_LABELS) as Array<keyof typeof pokemon.stats>).map((key) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-500">{STAT_LABELS[key]}</span>
                  <span className="text-gray-200">{pokemon.stats[key]}</span>
                </div>
              ))}
            </div>

            {/* HP slider */}
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                <span>Current HP</span>
                <span>{pokemon.currentHp} / {pokemon.stats.hp}</span>
              </div>
              <input
                type="range"
                min={1}
                max={pokemon.stats.hp}
                value={pokemon.currentHp}
                onChange={(e) => updateField({ currentHp: parseInt(e.target.value) })}
                className="w-full accent-indigo-500"
              />
              <div className="h-2 rounded-full bg-gray-700 overflow-hidden mt-0.5">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(pokemon.currentHp / pokemon.stats.hp) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Moves + damage output */}
          <div className="space-y-1.5">
            <div className="text-xs text-gray-500">Moves</div>
            {pokemon.moves.map((move, i) => {
              const result = moveResults[i];
              const hasResult = result && (result.max > 0);
              return (
                <div key={i} className="bg-gray-800/50 rounded-lg p-2 space-y-1">
                  {/* Move name + category + type */}
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={move.name}
                      onChange={(e) => updateMove(i, { name: e.target.value })}
                      placeholder={`Move ${i + 1}`}
                      className="flex-1 bg-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <select
                      value={move.category}
                      onChange={(e) => updateMove(i, { category: e.target.value as "physical" | "special" | "status" })}
                      className="bg-gray-700 rounded px-1 py-1 text-xs text-gray-200 focus:outline-none"
                    >
                      <option value="physical">Phys</option>
                      <option value="special">Spec</option>
                      <option value="status">Status</option>
                    </select>
                  </div>

                  {/* Power + Type */}
                  <div className="flex gap-1 items-center">
                    <input
                      type="number"
                      min={0}
                      max={250}
                      value={move.power}
                      onChange={(e) => updateMove(i, { power: parseInt(e.target.value) || 0 })}
                      className="w-16 bg-gray-700 rounded px-2 py-0.5 text-xs text-gray-200 focus:outline-none"
                      placeholder="BP"
                    />
                    <input
                      type="text"
                      value={move.type}
                      onChange={(e) => updateMove(i, { type: e.target.value.toLowerCase() })}
                      placeholder="type"
                      className="w-20 bg-gray-700 rounded px-2 py-0.5 text-xs text-gray-200 focus:outline-none"
                    />
                    {defenderHp > 0 && hasResult && (
                      <div className="flex-1 text-right">
                        <span className="text-green-400 font-mono text-xs font-semibold">
                          {result.min}–{result.max}
                        </span>
                        <span className="text-gray-500 text-xs ml-1">
                          ({result.minPercent.toFixed(1)}–{result.maxPercent.toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* KO chance */}
                  {defenderHp > 0 && hasResult && (
                    <div className="text-xs text-indigo-300">{result.koChance}</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-600 gap-2">
          <span className="text-4xl">?</span>
          <span className="text-sm">No Pokémon loaded</span>
          <span className="text-xs text-gray-700">Load from Designer or use Custom search</span>
        </div>
      )}
    </div>
  );
}
