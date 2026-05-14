import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import GameSelector from "../controls/GameSelector";
import DexModeSelector from "../controls/DexModeSelector";
import ViewToggle from "../controls/ViewToggle";
import AvailabilityFilter from "../controls/AvailabilityFilter";
import SearchBar from "../controls/SearchBar";
import { useSettingsStore } from "../../store/useSettingsStore";
import type { MetaData } from "../../types";

interface Props {
  meta: MetaData;
  caught: number;
  total: number;
  tab: "tracker" | "routes";
}

/**
 * Sticky filter sub-bar rendered below the top bar.
 * Tracker tab: desktop = single row, mobile = 3 stacked rows.
 * Routes tab: single GameSelector row.
 */
export default function FilterSubbar({ meta, caught, total, tab }: Props) {
  const searchRef = useRef<HTMLDivElement>(null);
  const viewMode = useSettingsStore((s) => s.viewMode);
  const setViewMode = useSettingsStore((s) => s.setViewMode);
  const toggleDaily = () => setViewMode(viewMode === "daily" ? "box" : "daily");

  if (tab === "routes") {
    return (
      <div className="sticky top-[calc(44px+env(safe-area-inset-top,0px))] md:top-[64px] z-30 bg-gray-900/95 backdrop-blur border-b border-gray-800">
        <div className="max-w-screen-2xl mx-auto overflow-x-auto [&::-webkit-scrollbar]:hidden -mx-0 px-4 py-2">
          <GameSelector meta={meta} />
        </div>
      </div>
    );
  }

  // Tracker tab
  return (
    <div className="sticky top-[calc(44px+env(safe-area-inset-top,0px))] md:top-[64px] z-30 bg-gray-900/95 backdrop-blur border-b border-gray-800">

      {/* ── Desktop: single row ───────────────────────────────────────── */}
      <div className="hidden md:flex max-w-screen-2xl mx-auto px-4 py-2 items-center gap-2 flex-wrap">
        <DexModeSelector meta={meta} />
        <div className="w-px h-5 bg-gray-700 flex-shrink-0" />
        <GameSelector meta={meta} />
        <div className="w-px h-5 bg-gray-700 flex-shrink-0" />
        <AvailabilityFilter />
        <div className="w-px h-5 bg-gray-700 flex-shrink-0" />
        <SearchBar />
        <div className="w-px h-5 bg-gray-700 flex-shrink-0" />
        <ViewToggle />
        {tab === "tracker" && (
          <>
            <div className="w-px h-5 bg-gray-700 flex-shrink-0" />
            <button
              onClick={toggleDaily}
              title="Daily events checklist"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-all flex-shrink-0 ${
                viewMode === "daily"
                  ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/50"
                  : "bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200 hover:bg-gray-700"
              }`}
            >
              <CalendarDays size={14} />
              Daily
            </button>
          </>
        )}
        <span className="ml-auto text-xs text-gray-500 tabular-nums flex-shrink-0">
          {caught} / {total}
        </span>
      </div>

      {/* ── Mobile: 2 rows ────────────────────────────────────────────── */}
      <div className="flex flex-col md:hidden divide-y divide-gray-800/60">

        {/* Row 1: Search bar — full width, most-used control */}
        <div className="px-3 py-1.5 flex items-center gap-2">
          <SearchBar compact />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ViewToggle />
            {tab === "tracker" && (
              <button
                onClick={toggleDaily}
                title="Daily events checklist"
                className={`p-1.5 rounded-md border text-xs transition-all ${
                  viewMode === "daily"
                    ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/50"
                    : "bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200"
                }`}
              >
                <CalendarDays size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: All filter chips in one swipeable strip */}
        <div
          ref={searchRef}
          className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto scrollbar-none"
        >
          <DexModeSelector meta={meta} />
          <div className="w-px h-4 bg-gray-700 flex-shrink-0" />
          <GameSelector meta={meta} />
          <div className="w-px h-4 bg-gray-700 flex-shrink-0" />
          <AvailabilityFilter />
        </div>
      </div>

    </div>
  );
}
