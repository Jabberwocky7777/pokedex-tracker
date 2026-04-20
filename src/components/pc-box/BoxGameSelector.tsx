import { GAME_LABELS } from "../../types";
import type { GameVersion } from "../../types";

interface Props {
  games: GameVersion[];
  selectedGame: GameVersion;
  onSelect: (game: GameVersion) => void;
}

export default function BoxGameSelector({ games, selectedGame, onSelect }: Props) {
  return (
    <div className="flex gap-1 flex-wrap">
      {games.map((game) => (
        <button
          key={game}
          onClick={() => onSelect(game)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            selectedGame === game
              ? "bg-white text-gray-900"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
          }`}
        >
          {GAME_LABELS[game]}
        </button>
      ))}
    </div>
  );
}
