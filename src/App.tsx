import { useState, useEffect } from "react";
import { useSettingsStore } from "./store/useSettingsStore";
import Layout from "./components/layout/Layout";
import CatchCalculator from "./components/catch-calculator/CatchCalculator";
import DesignerTab from "./components/designer/DesignerTab";
import RouteInfo from "./components/route-info/RouteInfo";
import PokedexTab from "./components/pokedex/PokedexTab";
import AttackdexTab from "./components/attackdex/AttackdexTab";
import TrainerLookupTab from "./components/trainer-lookup/TrainerLookupTab";
import DamageCalcTab from "./components/damage-calc/DamageCalcTab";
import LoginScreen from "./components/auth/LoginScreen";
import NativeOnboardingScreen from "./components/auth/NativeOnboardingScreen";
import MobileBottomNav from "./components/layout/MobileBottomNav";
import SyncToast from "./components/layout/SyncToast";
import { useSyncEngine } from "./hooks/useSyncEngine";
import { hasToken, clearToken, hasServerUrl } from "./lib/sync";
import { Capacitor } from "@capacitor/core";
import metaData from "./data/meta.json";
import type { Pokemon, MetaData } from "./types";

const meta = metaData as MetaData;

// Renderless component — mounts sync behaviour (pull on load, push on change, 30s poll)
function SyncEngine() {
  useSyncEngine();
  return null;
}

function App() {
  const activeTab = useSettingsStore((s) => s.activeTab);
  const [allPokemon, setAllPokemon] = useState<Pokemon[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // On native: track whether both a server URL and an auth token are already stored.
  // If either is missing, show the combined onboarding screen.
  const isNative = Capacitor.isNativePlatform();
  const [hasServer, setHasServer] = useState(() => !isNative || hasServerUrl());
  // Auth state — initialize from localStorage so we don't flash the login screen on reload
  const [isAuthed, setIsAuthed] = useState(() => hasToken());

  useEffect(() => {
    setAllPokemon(null); // eslint-disable-line react-hooks/set-state-in-effect -- reset before re-fetch when retryKey changes
    setLoadError(false);
    fetch("/data/pokemon.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((pokemon) => setAllPokemon(pokemon as Pokemon[]))
      .catch(() => setLoadError(true));
  }, [retryKey]);

  function handleLogout() {
    clearToken();
    setIsAuthed(false);
  }

  // Native app: single combined onboarding when server URL or auth token is missing
  if (isNative && (!hasServer || !isAuthed)) {
    return (
      <NativeOnboardingScreen
        onSuccess={() => { setHasServer(true); setIsAuthed(true); }}
      />
    );
  }

  // Web: show login screen until the user has a sync token
  if (!isAuthed) {
    return <LoginScreen onSuccess={() => setIsAuthed(true)} />;
  }

  if (loadError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <span className="text-4xl">⚠️</span>
          <div>
            <p className="text-gray-200 font-semibold mb-1">Failed to load Pokédex data</p>
            <p className="text-sm text-gray-500">Could not fetch <code className="text-gray-400">/data/pokemon.json</code>.</p>
          </div>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="mt-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!allPokemon) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950 text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500 relative overflow-hidden border-2 border-gray-300 animate-pulse flex-shrink-0">
            <div className="absolute inset-x-0 top-1/2 h-px bg-gray-300" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border border-gray-300" />
          </div>
          <span className="text-sm">Loading Pokédex data…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-950 dark:bg-gray-950 text-gray-100 dark:text-gray-100">
      <SyncEngine />
      {activeTab === "tracker" && (
        <Layout allPokemon={allPokemon} meta={meta} onLogout={handleLogout} />
      )}
      {activeTab === "catch-calc" && (
        <CatchCalculator allPokemon={allPokemon} meta={meta} />
      )}
      {activeTab === "designer" && (
        <DesignerTab allPokemon={allPokemon} meta={meta} />
      )}
      {activeTab === "routes" && (
        <RouteInfo allPokemon={allPokemon} meta={meta} />
      )}
      {activeTab === "pokedex" && (
        <PokedexTab allPokemon={allPokemon} meta={meta} />
      )}
      {activeTab === "attackdex" && (
        <AttackdexTab allPokemon={allPokemon} meta={meta} />
      )}
      {activeTab === "trainer-lookup" && (
        <TrainerLookupTab allPokemon={allPokemon} meta={meta} />
      )}
      {activeTab === "damage-calc" && (
        <DamageCalcTab allPokemon={allPokemon} meta={meta} />
      )}
      {/* Global shell elements rendered for all non-tracker tabs.
          Layout already renders these for the tracker tab. */}
      {activeTab !== "tracker" && (
        <>
          <MobileBottomNav />
          <SyncToast />
        </>
      )}
    </div>
  );
}

export default App;
