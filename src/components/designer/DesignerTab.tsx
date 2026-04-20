import { useState } from "react";
import DesignerPcBox from "./DesignerPcBox";
import DesignerPanel from "./DesignerPanel";
import DesignerPokemonPicker from "./DesignerPokemonPicker";
import Header from "../layout/Header";
import MobileBottomNav from "../layout/MobileBottomNav";
import SyncToast from "../layout/SyncToast";
import { useDesignerStore } from "../../store/useDesignerStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import type { Pokemon, MetaData } from "../../types";

interface Props {
  allPokemon: Pokemon[];
  meta: MetaData;
}

export default function DesignerTab({ allPokemon, meta }: Props) {
  const { activeGeneration } = useSettingsStore();
  const { updateSlot, setActiveSlot } = useDesignerStore();
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);

  function handlePickPokemon(slotIndex: number) {
    setPickerSlot(slotIndex);
    setActiveSlot(slotIndex);
  }

  function handleSelectPokemon(pokemonId: number, slotIndex: number) {
    updateSlot(slotIndex, { pokemonId });
    setActiveSlot(slotIndex);
  }

  return (
    <div className="flex flex-col h-full">
      <Header meta={meta} />

      {/* PC Box strip */}
      <DesignerPcBox
        allPokemon={allPokemon}
        activeGeneration={activeGeneration}
        onPickPokemon={handlePickPokemon}
      />

      {/* Panel area */}
      <div className="flex-1 overflow-y-auto pb-[76px] md:pb-0">
        <DesignerPanel
          allPokemon={allPokemon}
          meta={meta}
          activeGeneration={activeGeneration}
        />
      </div>

      <MobileBottomNav />
      <SyncToast />

      {pickerSlot !== null && (
        <DesignerPokemonPicker
          allPokemon={allPokemon}
          activeGeneration={activeGeneration}
          onSelect={(pokemonId) => handleSelectPokemon(pokemonId, pickerSlot)}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  );
}
