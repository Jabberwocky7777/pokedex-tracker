import { useState } from "react";
import { ChevronDown } from "lucide-react";
import StatBlock from "./StatBlock";
import MoveGrid from "./MoveGrid";
import IvSection from "./IvSection";
import EvTracker from "./EvTracker";
import { useDesignerStore } from "../../store/useDesignerStore";
import type { DesignerSlot } from "../../store/useDesignerStore";
import type { Pokemon, MetaData } from "../../types";

interface Props {
  allPokemon: Pokemon[];
  meta?: MetaData;
  activeGeneration: number;
}

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Accordion({ title, children, defaultOpen = true }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/70 hover:bg-gray-800 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-200">{title}</span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

export default function DesignerPanel({ allPokemon, activeGeneration }: Props) {
  const { slots, activeSlotIndex, updateSlot } = useDesignerStore();
  const slot: DesignerSlot | null = activeSlotIndex != null ? slots[activeSlotIndex] : null;

  const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));
  const pokemon = slot?.pokemonId != null ? pokemonMap.get(slot.pokemonId) ?? null : null;

  if (!slot || !pokemon) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm p-8 text-center">
        Select a slot above to start designing
      </div>
    );
  }

  function update(patch: Partial<DesignerSlot>) {
    if (activeSlotIndex != null) updateSlot(activeSlotIndex, patch);
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Nickname input */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-20">Nickname</span>
        <input
          type="text"
          placeholder={pokemon.displayName}
          value={slot.nickname}
          onChange={(e) => update({ nickname: e.target.value })}
          className="flex-1 px-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <Accordion title="Stats">
        <StatBlock
          slot={slot}
          pokemon={pokemon}
          activeGeneration={activeGeneration}
          onUpdate={update}
        />
      </Accordion>

      <Accordion title="Moves">
        <MoveGrid
          slot={slot}
          pokemonId={pokemon.id}
          activeGeneration={activeGeneration}
          onUpdate={update}
        />
      </Accordion>

      <Accordion title="IV Checker">
        <IvSection slot={slot} pokemon={pokemon} onUpdate={update} />
      </Accordion>

      <Accordion title="EV Tracker">
        <EvTracker
          slot={slot}
          allPokemon={allPokemon}
          activeGeneration={activeGeneration}
          onUpdate={update}
        />
      </Accordion>
    </div>
  );
}
