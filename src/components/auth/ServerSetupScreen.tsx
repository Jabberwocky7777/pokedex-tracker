import { useState } from "react";
import { setServerUrl } from "../../lib/sync";

interface Props {
  onSuccess: () => void;
}

export default function ServerSetupScreen({ onSuccess }: Props) {
  const [url, setUrl] = useState("http://");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      setError("URL must start with http:// or https://");
      return;
    }
    if (trimmed === "http://" || trimmed === "https://") {
      setError("Please enter your server's IP address and port.");
      return;
    }
    setServerUrl(trimmed);
    onSuccess();
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">

        {/* Logo + title */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-full bg-red-500 relative overflow-hidden border-4 border-gray-300 shadow-lg">
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gray-300" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-gray-300" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">Pokédex Tracker</h1>
            <p className="text-sm text-gray-400 mt-1">Connect to your server</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="server-url" className="block text-sm font-medium text-gray-300 mb-1.5">
              Server address
            </label>
            <input
              id="server-url"
              type="url"
              inputMode="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(""); }}
              placeholder="http://192.168.1.50:7777"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white
                placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500
                focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <p className="mt-2 text-xs text-gray-500">
              Your TrueNAS or home server IP and port, e.g.{" "}
              <span className="text-gray-400 font-mono">http://192.168.1.50:7777</span>
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-400" role="alert">{error}</p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold
              rounded-lg transition-colors min-h-[48px] mt-1"
          >
            Connect
          </button>
        </form>

      </div>
    </div>
  );
}
