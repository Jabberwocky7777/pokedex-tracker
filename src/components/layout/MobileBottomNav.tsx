import { LayoutGrid, BookOpen, Map, Calculator, Wand2, Swords, Search, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { useSettingsStore } from "../../store/useSettingsStore";
import type { AppTab } from "../../types";

type TabDef = { id: AppTab; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> };

const TRACKER_TABS: TabDef[] = [
  { id: "tracker",    label: "Tracker",  Icon: LayoutGrid },
  { id: "pokedex",    label: "Pokédex",  Icon: BookOpen   },
  { id: "attackdex",  label: "Attacks",  Icon: Swords     },
  { id: "routes",     label: "Routes",   Icon: Map        },
  { id: "catch-calc", label: "Catch",    Icon: Calculator },
];

const FRONTIER_TABS: TabDef[] = [
  { id: "designer",       label: "Designer", Icon: Wand2   },
  { id: "trainer-lookup", label: "Trainer",  Icon: Search  },
  { id: "damage-calc",    label: "Damage",   Icon: Zap     },
];

export default function MobileBottomNav() {
  const activeTab = useSettingsStore((s) => s.activeTab);
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);
  const tabGroup = useSettingsStore((s) => s.tabGroup);
  const setTabGroup = useSettingsStore((s) => s.setTabGroup);
  const activeTabs = tabGroup === "tracker" ? TRACKER_TABS : FRONTIER_TABS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden bg-gray-900/95 backdrop-blur border-t border-gray-800"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main navigation"
    >
      {/* ← group toggle */}
      <button
        onClick={() => setTabGroup("tracker")}
        disabled={tabGroup === "tracker"}
        className={`flex flex-col items-center justify-center px-2 py-2 gap-0.5 text-xs transition-colors ${
          tabGroup === "tracker" ? "text-gray-700" : "text-gray-500 hover:text-gray-300"
        }`}
        aria-label="Switch to Tracker tabs"
      >
        <ChevronLeft size={18} />
      </button>

      {activeTabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 text-xs font-medium transition-colors
              ${isActive
                ? "text-white border-t-2 border-indigo-500 -mt-[2px]"
                : "text-gray-500 hover:text-gray-300 border-t-2 border-transparent -mt-[2px]"
              }`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        );
      })}

      {/* → group toggle */}
      <button
        onClick={() => setTabGroup("frontier")}
        disabled={tabGroup === "frontier"}
        className={`flex flex-col items-center justify-center px-2 py-2 gap-0.5 text-xs transition-colors ${
          tabGroup === "frontier" ? "text-gray-700" : "text-gray-500 hover:text-gray-300"
        }`}
        aria-label="Switch to Battle Frontier tabs"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
