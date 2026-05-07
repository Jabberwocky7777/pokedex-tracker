import { themes, DEFAULT_THEME } from '../themes';

let fontLink: HTMLLinkElement | null = null;

export function applyTheme(id: string) {
  const theme = themes.find(t => t.id === id) ?? themes.find(t => t.id === DEFAULT_THEME)!;

  // Set data-theme on <html>
  document.documentElement.dataset.theme = theme.id;

  // Keep .dark always active — all themes are dark-palette based
  document.documentElement.classList.add('dark');

  // Inject CSS variable overrides as a scoped <style> block
  const styleId = 'pdx-theme-vars';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  if (Object.keys(theme.vars).length > 0) {
    const vars = Object.entries(theme.vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');
    styleEl.textContent = `:root[data-theme="${theme.id}"] {\n${vars}\n}`;
  } else {
    styleEl.textContent = '';
  }

  // Swap font <link>
  if (fontLink) fontLink.remove();
  fontLink = null;
  if (theme.fonts) {
    fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = theme.fonts;
    document.head.appendChild(fontLink);
  }

  // Mirror to pdx-theme key so the FOUC prevention script in index.html can read it
  localStorage.setItem('pdx-theme', theme.id);
}
