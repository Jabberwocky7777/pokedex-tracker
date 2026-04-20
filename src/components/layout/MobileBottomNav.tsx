import { LayoutGrid, BookOpen, Map, Calculator, Wand2 } from "lucide-react";
import { useSettingsStore } from "../../store/useSettingsStore";
import type { AppTab } from "../../types";

const TABS: { id: AppTab; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "tracker",    label: "Tracker",   Icon: LayoutGrid },
  { id: "pokedex",    label: "Pokédex",   Icon: BookOpen   },
  { id: "routes",     label: "Routes",    Icon: Map        },
  { id: "catch-calc", label: "Catch",     Icon: Calculator },
  { id: "designer",   label: "Designer",  Icon: Wand2      },
];

export default function MobileBottomNav() {
  const { activeTab, setActiveTab } = useSettingsStore();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden bg-gray-900/95 backdrop-blur border-t border-gray-800"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main navigation"
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center justify-center flex-1 py-2 gap-0.5 text-[10px] font-medium transition-colors
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
    </nav>
  );
}
