import { LayoutGrid, BookOpen, Map, Calculator, Wand2, LogOut, FileJson, FileSpreadsheet, Upload } from "lucide-react";
import GenerationSelector from "../controls/GenerationSelector";
import DarkModeToggle from "../controls/DarkModeToggle";
import SyncDot from "./SyncDot";
import { useSettingsStore } from "../../store/useSettingsStore";
import type { MetaData, AppTab } from "../../types";

interface Props {
  meta: MetaData;
  onLogout?: () => void;
  onExport?: () => void;
  onExportJSON?: () => void;
  onExportCSV?: () => void;
  onImport?: () => void;
}

const TABS: { id: AppTab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "tracker",    label: "Tracker",   Icon: LayoutGrid },
  { id: "pokedex",    label: "Pokédex",   Icon: BookOpen   },
  { id: "routes",     label: "Routes",    Icon: Map        },
  { id: "catch-calc", label: "Catch Calc",Icon: Calculator },
  { id: "designer",   label: "Designer",  Icon: Wand2      },
];

/** CSS-only PokéBall — no emoji, no image */
function PokeBall() {
  return (
    <div className="w-6 h-6 rounded-full bg-red-500 relative overflow-hidden border-2 border-gray-300 flex-shrink-0">
      <div className="absolute inset-x-0 top-1/2 h-[2px] -mt-[1px] bg-gray-300" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-gray-300" />
    </div>
  );
}

export default function Header({ meta, onLogout, onExport, onExportJSON, onExportCSV, onImport }: Props) {
  const { activeTab, setActiveTab } = useSettingsStore();
  const currentLabel = TABS.find((t) => t.id === activeTab)?.label ?? "Pokédex Tracker";

  return (
    <header className="sticky top-[3px] z-40 bg-gray-900/95 backdrop-blur border-b border-gray-800">

      {/* ── Mobile top bar (hidden on md+) ───────────────────────────── */}
      <div className="flex md:hidden items-center gap-2 px-3 min-h-[56px]">
        {/* Left: sync dot */}
        <SyncDot className="ml-0.5" />

        {/* Center: current page name */}
        <span className="flex-1 text-center text-sm font-semibold text-white truncate">
          {currentLabel}
        </span>

        {/* Right: gen selector + dark mode */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <GenerationSelector meta={meta} />
          <DarkModeToggle />
        </div>
      </div>

      {/* ── Desktop top bar (hidden below md) ───────────────────────── */}
      <div className="hidden md:flex items-center h-16 px-4 max-w-screen-2xl mx-auto">

        {/* Left zone: flex-1 keeps it equal-width to right zone so center nav stays truly centered */}
        <div className="flex items-center flex-1">
          <button
            onClick={() => setActiveTab("tracker")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Go to Tracker"
          >
            <PokeBall />
            <span className="text-sm font-bold text-white whitespace-nowrap tracking-tight">
              Pokédex Tracker
            </span>
          </button>
        </div>

        {/* Center zone: flex-shrink-0 so it never gets pushed around */}
        <nav className="flex items-center gap-1 flex-shrink-0" aria-label="Main navigation">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white text-gray-900"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Right zone: flex-1 + justify-end mirrors left zone width */}
        <div className="flex items-center gap-2 flex-1 justify-end ml-6">
          <GenerationSelector meta={meta} />
          <SyncDot />
          <DarkModeToggle />
          {(onExportJSON ?? onExport) && (
            <button
              onClick={onExportJSON ?? onExport}
              title="Export JSON"
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              <FileJson size={16} />
            </button>
          )}
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              title="Export CSV"
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              <FileSpreadsheet size={16} />
            </button>
          )}
          {onImport && (
            <button
              onClick={onImport}
              title="Import backup (JSON)"
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              <Upload size={16} />
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign out"
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>

    </header>
  );
}
