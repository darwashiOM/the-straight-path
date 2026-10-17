/**
 * Theme library — a tiny Zustand store and `useTheme` hook that manages the
 * color mode and keeps the `class="dark"` attribute on `<html>` in sync.
 *
 * The toggle offers two states, light and dark. `"system"` is only the
 * starting point for a visitor who has never chosen (and the legacy value
 * older visitors may still have stored): it follows `prefers-color-scheme`
 * and subscribes to its changes so the page flips live with the OS setting.
 * The store persists the user's choice to localStorage under `tsp:theme`.
 */
import { useEffect } from 'react';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'tsp:theme';

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // localStorage can throw in privacy modes — fall through.
  }
  return 'system';
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Compute the effective (resolved) color scheme given a mode. */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(mode);
  const root = document.documentElement;
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  root.style.colorScheme = resolved;
}

interface ThemeStore {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  cycle: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: readStoredTheme(),
  setMode: (mode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
    applyTheme(mode);
    set({ mode });
  },
  cycle: () => {
    // Two states only: flip whatever is on screen. A visitor who has never
    // chosen (mode "system") goes to the opposite of their OS theme.
    get().setMode(resolveTheme(get().mode) === 'dark' ? 'light' : 'dark');
  },
}));

// Apply the persisted theme immediately at module load so there is no FOUC
// on hydration. Safe to run on the server (guards inside applyTheme).
applyTheme(useThemeStore.getState().mode);

// When the mode is "system" we need to react to OS-level changes. Register
// once at module load and re-apply without touching the stored preference.
if (typeof window !== 'undefined' && window.matchMedia) {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (useThemeStore.getState().mode === 'system') applyTheme('system');
  };
  try {
    mql.addEventListener('change', onChange);
  } catch {
    // Safari < 14 fallback
    mql.addListener(onChange);
  }
}

/**
 * `useTheme` — subscribes a component to the theme store and returns the
 * current mode alongside helpers. Components that render theme-dependent UI
 * (the toggle button, its icon) should prefer this over `useThemeStore`
 * directly.
 */
export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const cycle = useThemeStore((s) => s.cycle);

  // Mount-time re-apply. Not strictly required (already applied at module
  // load) but makes the hook resilient to any late DOM mutations.
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  return {
    mode,
    resolved: resolveTheme(mode),
    setMode,
    cycle,
  } as const;
}
