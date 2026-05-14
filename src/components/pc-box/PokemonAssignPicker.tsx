import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { Pokemon } from "../../types";
import { getGenSprite } from "../../lib/pokemon-display";
import { formatDexNumber } from "../../lib/pokemon-display";

interface Props {
  allPokemon: Pokemon[];
  activeGeneration: number;
  alreadyAssigned: Set<number>;
  onSelect: (pokemonId: number) => void;
  onClose: () => void;
}

export default function PokemonAssignPicker({
  allPokemon,
  activeGeneration,
  alreadyAssigned,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const genRange = activeGeneration === 3 ? [1, 386] : [1, 493];

  const filtered = allPokemon
    .filter((p) => p.id >= genRange[0] && p.id <= genRange[1])
    .filter((p) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        p.displayName.toLowerCase().includes(q) ||
        String(p.id).includes(q) ||
        formatDexNumber(p.id).includes(q)
      );
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-sm flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">Assign Pokémon</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X size={16} />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-gray-700">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by name or number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          {filtered.map((p) => {
            const sprite = getGenSprite(p, activeGeneration);
            const already = alreadyAssigned.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => { onSelect(p.id); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800 transition-colors text-left"
              >
                {sprite && (
                  <img src={sprite} alt={p.displayName} className="w-8 h-8 object-contain pixelated flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-200">{p.displayName}</div>
                  <div className="text-xs text-gray-500">#{formatDexNumber(p.id)}</div>
                </div>
                {already && (
                  <span className="text-xs text-amber-400 flex-shrink-0">in box</span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No results</p>
          )}
        </div>
      </div>
    </div>
  );
}
