import { useCallback, useMemo, useRef, useState } from "react";
import Header from "./Header";
import FilterSubbar from "./FilterSubbar";
import ViewportProgressBar from "./ViewportProgressBar";
import MobileBottomNav from "./MobileBottomNav";
import SyncToast from "./SyncToast";
import BoxView from "../box-view/BoxView";
import ListView from "../list-view/ListView";
import PcBoxLayout from "../pc-box/PcBoxLayout";
import DetailPanel from "../detail-panel/DetailPanel";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useDexStore } from "../../store/useDexStore";
import { usePokemonFilter } from "../../hooks/usePokemonFilter";
import { useProgress } from "../../hooks/useProgress";
import boxesData from "../../data/boxes.json";
import type { Pokemon, MetaData, DexBox } from "../../types";
import { exportFullJSON, exportFullCSV, restoreBackup } from "../../lib/backup";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import ShortcutModal from "../shared/ShortcutModal";

interface Props {
  allPokemon: Pokemon[];
  meta: MetaData;
  onLogout?: () => void;
}

const boxes = boxesData as DexBox[];

export default function Layout({ allPokemon, meta, onLogout }: Props) {
  const {
    viewMode,
    activeGames,
    activeGeneration,
    dexMode,
    selectedPokemonId,
    setSelectedPokemonId,
    availabilityMode,
    searchQuery,
    setActiveTab,
    setActiveRoute,
    setActivePokedexId,
  } = useSettingsStore();

  const caughtByGen = useDexStore((s) => s.caughtByGen);
  const pendingByGen = useDexStore((s) => s.pendingByGen);
  const toggleCaughtRaw = useDexStore((s) => s.toggleCaught);
  const togglePendingRaw = useDexStore((s) => s.togglePending);

  const caught = caughtByGen[activeGeneration] ?? [];
  const pending = pendingByGen[activeGeneration] ?? [];

  const toggleCaught = useCallback(
    (id: number) => toggleCaughtRaw(id, activeGeneration),
    [toggleCaughtRaw, activeGeneration]
  );
  const togglePending = useCallback(
    (id: number) => togglePendingRaw(id, activeGeneration),
    [togglePendingRaw, activeGeneration]
  );

  const filteredPokemon = usePokemonFilter(
    allPokemon,
    meta,
    activeGeneration,
    dexMode,
    activeGames,
    availabilityMode,
    searchQuery,
    caught
  );

  const { caught: caughtCount, total, percentage } = useProgress(filteredPokemon, caught);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  useKeyboardShortcuts(filteredPokemon, activeGeneration, () => setShortcutsOpen(true));

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const result = await restoreBackup(file);
    setImportMsg(result.ok ? "Backup restored!" : `Import failed: ${result.error}`);
    setTimeout(() => setImportMsg(null), 4000);
  }, []);

  const selectedPokemon = selectedPokemonId
    ? allPokemon.find((p) => p.id === selectedPokemonId) ?? null
    : null;

  const selectedFilteredPokemon = selectedPokemonId
    ? filteredPokemon.find((p) => p.id === selectedPokemonId) ?? null
    : null;

  const handleSelectPokemon = useCallback(
    (id: number) => {
      setSelectedPokemonId(selectedPokemonId === id ? null : id);
    },
    [selectedPokemonId, setSelectedPokemonId]
  );

  const handleClosePanel = useCallback(() => {
    setSelectedPokemonId(null);
  }, [setSelectedPokemonId]);

  const handleRouteClick = useCallback(
    (slug: string) => {
      setActiveTab("routes");
      setActiveRoute(slug);
      setSelectedPokemonId(null);
    },
    [setActiveTab, setActiveRoute, setSelectedPokemonId]
  );

  const handlePokedexClick = useCallback(() => {
    if (!selectedPokemonId) return;
    setActivePokedexId(selectedPokemonId);
    setActiveTab("pokedex");
    setSelectedPokemonId(null);
  }, [selectedPokemonId, setActivePokedexId, setActiveTab, setSelectedPokemonId]);

  const pokemonMap = useMemo(
    () => new Map(allPokemon.map((p) => [p.id, p])),
    [allPokemon]
  );

  const genMaxId = meta.generations.find((g) => g.id === activeGeneration)?.pokemonRange[1] ?? 493;
  const trimmedBoxes = useMemo(
    () => boxes.filter((b) => b.pokemonIds[0] <= genMaxId),
    [genMaxId]
  );

  const detailPanel = selectedPokemon ? (
    <DetailPanel
      pokemon={selectedPokemon}
      allPokemonMap={pokemonMap}
      isCaught={caught.includes(selectedPokemon.id)}
      isPending={pending.includes(selectedPokemon.id)}
      onToggleCaught={() => toggleCaught(selectedPokemon.id)}
      onTogglePending={() => togglePending(selectedPokemon.id)}
      onClose={handleClosePanel}
      exclusiveGames={selectedFilteredPokemon?.exclusiveGames ?? []}
      onRouteClick={handleRouteClick}
      onPokedexClick={handlePokedexClick}
    />
  ) : null;

  return (
    <>
      {/* 3px progress bar pinned to absolute top of viewport */}
      <ViewportProgressBar percentage={percentage} />

      <div className="flex flex-col h-full">
        <Header
          meta={meta}
          onLogout={onLogout}
          onExportJSON={exportFullJSON}
          onExportCSV={() => exportFullCSV(allPokemon)}
          onImport={handleImportClick}
        />
        {/* Hidden file input for backup import */}
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
        {/* Import result toast */}
        {importMsg && (
          <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full border text-sm font-medium shadow-lg backdrop-blur pointer-events-none ${
            importMsg.startsWith("Backup") ? "bg-gray-800/90 border-gray-700 text-emerald-300" : "bg-red-900/90 border-red-700 text-red-200"
          }`}>
            {importMsg}
          </div>
        )}

        {/* Filter sub-bar — sticky below top bar, tracker-specific */}
        <FilterSubbar meta={meta} caught={caughtCount} total={total} tab="tracker" />

        {/*
          Content row: fills remaining height.
          pb-[76px] on mobile leaves room for the bottom nav (60px + safe area).
        */}
        <div className="flex flex-1 overflow-hidden max-w-screen-2xl mx-auto w-full">
          <main className="flex-1 min-w-0 overflow-y-auto pb-[76px] md:pb-0">
            {viewMode === "box" ? (
              <BoxView
                filteredPokemon={filteredPokemon}
                pokemonMap={pokemonMap}
                boxes={trimmedBoxes}
                caughtIds={caught}
                pendingIds={pending}
                dexMode={dexMode}
                selectedPokemonId={selectedPokemonId}
                onSelectPokemon={handleSelectPokemon}
                onToggleCaught={toggleCaught}
                onTogglePending={togglePending}
              />
            ) : viewMode === "slots" ? (
              <PcBoxLayout allPokemon={allPokemon} meta={meta} />
            ) : (
              <ListView
                filteredPokemon={filteredPokemon}
                caughtIds={caught}
                pendingIds={pending}
                selectedPokemonId={selectedPokemonId}
                onSelectPokemon={handleSelectPokemon}
                onToggleCaught={toggleCaught}
                onTogglePending={togglePending}
              />
            )}
          </main>

          {/* Desktop sidebar */}
          {selectedPokemon && (
            <aside className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 bg-gray-900 border-l border-gray-800 overflow-y-auto shadow-2xl">
              {detailPanel}
            </aside>
          )}
        </div>

        {/* Mobile overlay detail panel */}
        {selectedPokemon && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={handleClosePanel}
            />
            <aside className="fixed right-0 top-0 h-full w-80 z-50 lg:hidden bg-gray-900 border-l border-gray-800 overflow-y-auto shadow-2xl">
              {detailPanel}
            </aside>
          </>
        )}

        {/* Mobile bottom nav */}
        <MobileBottomNav />

        {/* Sync state toast */}
        <SyncToast />
      </div>

      {shortcutsOpen && <ShortcutModal onClose={() => setShortcutsOpen(false)} />}
    </>
  );
}
