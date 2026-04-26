import type { VersionGroup } from "../../lib/move-fetch";

interface Props {
  activeVersionGroups: { id: VersionGroup; label: string }[];
  versionGroup: VersionGroup;
  setVersionGroup: (vg: VersionGroup) => void;
}

export default function VersionGroupTabs({ activeVersionGroups, versionGroup, setVersionGroup }: Props) {
  return (
    <div className="flex gap-1 flex-wrap">
      {activeVersionGroups.map((vg) => (
        <button
          key={vg.id}
          onClick={() => setVersionGroup(vg.id)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            versionGroup === vg.id
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
          }`}
        >
          {vg.label}
        </button>
      ))}
    </div>
  );
}
