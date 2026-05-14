import { useSettingsStore } from "../../store/useSettingsStore";
import { GAME_LABELS, GAME_COLORS } from "../../types";
import type { GameVersion, MetaData } from "../../types";

interface Props {
  meta: MetaData;
}

export default function GameSelector({ meta }: Props) {
  const activeGames = useSettingsStore((s) => s.activeGames);
  const toggleActiveGame = useSettingsStore((s) => s.toggleActiveGame);
  const clearActiveGames = useSettingsStore((s) => s.clearActiveGames);
  const activeGeneration = useSettingsStore((s) => s.activeGeneration);

  const genMeta = meta.generations.find((g) => g.id === activeGeneration);
  if (!genMeta) return null;

  const games = genMeta.versions as GameVersion[];
  // Empty activeGames means "show all games" (no filter applied)
  const noneSelected = activeGames.length === 0;

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        onClick={clearActiveGames}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          noneSelected
            ? "bg-gray-600 text-white"
            : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
        }`}
      >
        All
      </button>
      {games.map((game) => {
        const isActive = activeGames.includes(game);
        const color = GAME_COLORS[game] ?? "#6b7280";
        return (
          <button
            key={game}
            onClick={() => toggleActiveGame(game)}
            style={isActive ? { backgroundColor: color, color: "#fff", boxShadow: `0 0 8px ${color}60` } : {}}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              isActive
                ? "ring-2 ring-white/20"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            }`}
          >
            {GAME_LABELS[game]}
          </button>
        );
      })}
    </div>
  );
}
