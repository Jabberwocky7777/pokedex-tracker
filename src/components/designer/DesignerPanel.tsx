import { useState } from "react";
import { ChevronDown, ClipboardCopy } from "lucide-react";
import StatBlock from "./StatBlock";
import MoveGrid from "./MoveGrid";
import IvSection from "./IvSection";
import EvTracker from "./EvTracker";
import { useDesignerStore } from "../../store/useDesignerStore";
import { STAT_KEYS } from "../../lib/iv-calc";
import type { DesignerSlot } from "../../store/useDesignerStore";
import type { StatKey } from "../../lib/iv-calc";
import type { Pokemon, MetaData } from "../../types";

interface Props {
  allPokemon: Pokemon[];
  meta?: MetaData;
  activeGeneration: number;
  slotIndex?: number;  // if provided, renders this slot instead of activeSlotIndex
  compact?: boolean;   // if true, Moves accordion starts collapsed
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

const SHOWDOWN_STAT: Record<StatKey, string> = {
  hp: "HP", atk: "Atk", def: "Def",
  spAtk: "SpA", spDef: "SpD", spe: "Spe",
};

function formatMoveName(name: string): string {
  return name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function DesignerPanel({ allPokemon, activeGeneration, slotIndex, compact }: Props) {
  const { slots, activeSlotIndex, updateSlot } = useDesignerStore();
  const effectiveIndex = slotIndex ?? activeSlotIndex;
  const slot: DesignerSlot | null = effectiveIndex != null ? slots[effectiveIndex] : null;

  const pokemonMap = new Map(allPokemon.map((p) => [p.id, p]));
  const pokemon = slot?.pokemonId != null ? pokemonMap.get(slot.pokemonId) ?? null : null;

  const [copied, setCopied] = useState(false);

  if (!slot || !pokemon) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm p-8 text-center">
        Select a slot above to start designing
      </div>
    );
  }

  function update(patch: Partial<DesignerSlot>) {
    if (effectiveIndex != null) updateSlot(effectiveIndex, patch);
  }

  function buildShowdownExport(): string {
    if (!slot || !pokemon) return "";
    const lines: string[] = [];

    // Header
    let header = slot.nickname || pokemon.displayName;
    if (slot.item) header += ` @ ${slot.item}`;
    lines.push(header);

    // Ability
    if (slot.ability) {
      const abilityObj = pokemon.abilities?.find((a) => a.name === slot.ability);
      lines.push(`Ability: ${abilityObj?.displayName ?? slot.ability}`);
    }

    // Level
    lines.push(`Level: ${slot.level}`);

    // EVs
    const evParts = STAT_KEYS
      .filter((k) => (slot.evAllocation[k] ?? 0) > 0)
      .map((k) => `${slot.evAllocation[k]} ${SHOWDOWN_STAT[k]}`);
    if (evParts.length > 0) lines.push(`EVs: ${evParts.join(" / ")}`);

    // Nature
    lines.push(`${slot.natureName} Nature`);

    // IVs (only non-31 confirmed)
    const ivParts = STAT_KEYS
      .filter((k) => slot.confirmedIVs[k] != null && slot.confirmedIVs[k] !== 31)
      .map((k) => `${slot.confirmedIVs[k]} ${SHOWDOWN_STAT[k]}`);
    if (ivParts.length > 0) lines.push(`IVs: ${ivParts.join(" / ")}`);

    // Moves
    for (const move of slot.selectedMoves) {
      if (move) lines.push(`- ${formatMoveName(move)}`);
    }

    return lines.join("\n");
  }

  function copyToShowdown() {
    const text = buildShowdownExport();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Nickname + Showdown export row */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-20 flex-shrink-0">Nickname</span>
        <input
          type="text"
          placeholder={pokemon.displayName}
          value={slot.nickname}
          onChange={(e) => update({ nickname: e.target.value })}
          className="flex-1 min-w-0 px-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={copyToShowdown}
          title="Copy to Pokémon Showdown"
          className={`flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 rounded border text-xs transition-colors ${
            copied
              ? "bg-emerald-800 border-emerald-600 text-emerald-300"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
          }`}
        >
          <ClipboardCopy size={13} />
          {copied ? "Copied ✓" : "Showdown"}
        </button>
      </div>

      <Accordion title="Stats">
        <StatBlock
          slot={slot}
          pokemon={pokemon}
          activeGeneration={activeGeneration}
          onUpdate={update}
        />
      </Accordion>

      <Accordion title="Moves" defaultOpen={!compact}>
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
