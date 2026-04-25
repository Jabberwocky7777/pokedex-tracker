import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/shared/ErrorBoundary.tsx";

// Apply dark mode on initial load before React renders (avoids flash)
const settings = localStorage.getItem("pokedex-settings-v1");
let darkMode = true; // default dark
if (settings) {
  try {
    const parsed = JSON.parse(settings);
    if (parsed?.state?.darkMode === false) darkMode = false;
  } catch {
    // ignore malformed storage
  }
}
if (darkMode) {
  document.documentElement.classList.add("dark");
}

// Double-click any number input to select all — makes it easy to retype a value.
document.addEventListener("dblclick", (e) => {
  const el = e.target as HTMLElement;
  if (
    el instanceof HTMLInputElement &&
    (el.type === "number" || el.inputMode === "numeric")
  ) {
    el.select();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
