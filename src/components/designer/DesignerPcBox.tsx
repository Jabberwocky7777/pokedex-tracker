import { useState } from "react";
import { Plus, X, Copy } from "lucide-react";
import { useDesignerStore } from "../../store/useDesignerStore";
import type { Pokemon } from "../../types";
import { getGenSprite } from "../../lib/pokemon-display";
import { NATURES } from "../../lib/iv-calc";

interface Props {
  allPokemon: Pokemon[];
  activeGeneration: number;
  onPickPokemon: (slotIndex: number) => void;
}

export default function DesignerPcBox({ allPokemon, activeGeneration, onPickPokemon }: Props) {
  const { slots, activeSlotIndex, setActiveSlot, clearSlot, duplicateSlot } = useDesignerStore();
  const [menuSlot, setMenuSlot] = useState<number | null>(null);

  const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));

  function handleContextMenu(e: React.MouseEvent, index: number) {
    e.preventDefault();
    setMenuSlot(index);
  }

  function handleDuplicate(fromIndex: number) {
    const emptyTarget = slots.findIndex((s, i) => i !== fromIndex && s.pokemonId === null);
    if (emptyTarget !== -1) duplicateSlot(fromIndex, emptyTarget);
    setMenuSlot(null);
  }

  return (
    <div className="bg-gray-900 border-b border-gray-800 p-3">
      <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 lg:grid-cols-[repeat(30,minmax(0,1fr))] gap-1 max-w-full overflow-x-auto">
        {slots.map((slot, index) => {
          const pokemon = slot.pokemonId != null ? pokemonMap.get(slot.pokemonId) : null;
          const nature = NATURES.find((n) => n.name === slot.natureName);
          const isActive = activeSlotIndex === index;

          if (!pokemon) {
            return (
              <button
                key={index}
                onClick={() => onPickPokemon(index)}
                className={`aspect-square flex items-center justify-center border-2 border-dashed rounded text-gray-600 hover:text-gray-400 hover:border-gray-500 transition-colors ${
                  isActive ? "border-indigo-500 bg-indigo-900/20" : "border-gray-700"
                }`}
                title={`Slot ${index + 1}`}
              >
                <Plus size={10} />
              </button>
            );
          }

          const sprite = getGenSprite(pokemon, activeGeneration);
          const hasPlusNature = nature?.plus != null;
          const hasMinusNature = nature?.minus != null;
          const isNeutral = !hasPlusNature && !hasMinusNature;

          return (
            <div
              key={index}
              className={`relative aspect-square flex flex-col items-center justify-center rounded cursor-pointer transition-colors border ${
                isActive
                  ? "border-indigo-500 bg-indigo-900/30"
                  : "border-transparent hover:border-gray-600 hover:bg-gray-800/50"
              }`}
              onClick={() => setActiveSlot(isActive ? null : index)}
              onContextMenu={(e) => handleContextMenu(e, index)}
              title={slot.nickname || pokemon.displayName}
            >
              {sprite && (
                <img src={sprite} alt="" className="w-6 h-6 object-contain pixelated" draggable={false} />
              )}
              {!isNeutral && (
                <span
                  className={`absolute top-0 right-0 w-1.5 h-1.5 rounded-full ${
                    hasPlusNature && !hasMinusNature ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
              )}

              {menuSlot === index && (
                <>
                  <div className="fixed inset-0 z-50" onClick={() => setMenuSlot(null)} />
                  <div className="absolute top-full left-0 z-50 mt-0.5 bg-gray-800 border border-gray-700 rounded shadow-xl text-xs min-w-[110px]">
                    <button
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-700 flex items-center gap-1.5 text-gray-200"
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(index); }}
                    >
                      <Copy size={11} /> Duplicate
                    </button>
                    <button
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-700 flex items-center gap-1.5 text-red-400"
                      onClick={(e) => { e.stopPropagation(); clearSlot(index); setMenuSlot(null); }}
                    >
                      <X size={11} /> Clear slot
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
