import { useState, useMemo } from "react";
import { X } from "lucide-react";
import { DAILY_EVENT_SECTIONS } from "../../data/daily-events";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useDexStore } from "../../store/useDexStore";
import type { Pokemon } from "../../types";

interface Props {
  allPokemon: Pokemon[];
}

export default function DailyChecklist({ allPokemon }: Props) {
  const activeGeneration = useSettingsStore((s) => s.activeGeneration);
  const setShowDailyPanel = useSettingsStore((s) => s.setShowDailyPanel);
  const caughtByGen = useDexStore((s) => s.caughtByGen);
  const toggleCaughtRaw = useDexStore((s) => s.toggleCaught);

  const caught = useMemo(() => caughtByGen[activeGeneration] ?? [], [caughtByGen, activeGeneration]);
  const toggleCaught = (id: number) => toggleCaughtRaw(id, activeGeneration);

  const pokemonMap = useMemo(() => new Map(allPokemon.map((p) => [p.id, p])), [allPokemon]);

  const sections = useMemo(
    () => DAILY_EVENT_SECTIONS.filter((s) => s.genIds.includes(activeGeneration)),
    [activeGeneration]
  );

  const [activeIdx, setActiveIdx] = useState(0);
  const [uncaughtOnly, setUncaughtOnly] = useState(true);

  const sectionIdx = Math.min(activeIdx, sections.length - 1);
  const section = sections[sectionIdx];

  if (sections.length === 0) {
    return (
      <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between text-sm text-gray-500">
        <span>No daily events tracked for this generation.</span>
        <button onClick={() => setShowDailyPanel(false)} className="p-1 hover:text-gray-300 transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  const items = section
    ? uncaughtOnly
      ? section.pokemon.filter((p) => !caught.includes(p.id))
      : section.pokemon
    : [];

  return (
    <div className="bg-gray-950 border-b border-gray-800 flex flex-col" style={{ maxHeight: "260px" }}>

      {/* Tab bar */}
      <div className="flex items-center border-b border-gray-800/60 overflow-x-auto [&::-webkit-scrollbar]:hidden flex-shrink-0">
        {sections.map((s, i) => {
          const uncaught = s.pokemon.filter((p) => !caught.includes(p.id)).length;
          const isActive = sectionIdx === i;
          return (
            <button
              key={s.id}
              onClick={() => setActiveIdx(i)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                isActive
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              {s.title}
              <span className="text-gray-600 font-normal">{s.games}</span>
              {uncaught > 0 && (
                <span className={`text-xs px-1.5 py-px rounded-full ${
                  isActive ? "bg-indigo-900/60 text-indigo-300" : "bg-gray-800 text-gray-400"
                }`}>
                  {uncaught}
                </span>
              )}
              {uncaught === 0 && (
                <span className="text-emerald-600 text-xs">✓</span>
              )}
            </button>
          );
        })}

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-3 px-3 flex-shrink-0">
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={uncaughtOnly}
              onChange={(e) => setUncaughtOnly(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 accent-indigo-500 cursor-pointer"
            />
            Uncaught only
          </label>
          <button
            onClick={() => setShowDailyPanel(false)}
            title="Close daily checklist"
            className="p-1 text-gray-600 hover:text-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* How-to tip */}
      {section && (
        <div className="px-4 py-1.5 text-xs text-gray-600 flex-shrink-0 border-b border-gray-800/40">
          {section.how}
        </div>
      )}

      {/* Pokémon list */}
      <div className="overflow-y-auto flex-1">
        {items.length === 0 ? (
          <div className="px-4 py-5 text-center text-sm text-gray-500">
            All caught! ✓
          </div>
        ) : (
          <div className="divide-y divide-gray-800/40">
            {items.map((dp) => {
              const pokemon = pokemonMap.get(dp.id);
              const isCaught = caught.includes(dp.id);
              return (
                <label
                  key={`${dp.id}-${dp.note ?? ""}`}
                  className={`flex items-center gap-3 px-4 py-1.5 cursor-pointer hover:bg-gray-800/40 transition-colors ${
                    isCaught ? "opacity-40" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isCaught}
                    onChange={() => toggleCaught(dp.id)}
                    className="flex-shrink-0 rounded border-gray-600 bg-gray-800 accent-indigo-500 cursor-pointer"
                  />
                  {pokemon && (
                    <img
                      src={pokemon.gen4Sprite ?? pokemon.spriteUrl}
                      alt=""
                      className="w-7 h-7 object-contain flex-shrink-0"
                      style={{ imageRendering: "pixelated" }}
                    />
                  )}
                  <span className={`text-sm font-medium flex-shrink-0 ${isCaught ? "line-through text-gray-500" : "text-gray-100"}`}>
                    {dp.name}
                  </span>
                  <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">{dp.location}</span>
                  {dp.games && (
                    <span className="text-xs text-gray-700 bg-gray-800 px-1.5 py-px rounded flex-shrink-0">
                      {dp.games}
                    </span>
                  )}
                  {dp.note && (
                    <span className="text-xs text-gray-600 flex-shrink-0 italic">{dp.note}</span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
