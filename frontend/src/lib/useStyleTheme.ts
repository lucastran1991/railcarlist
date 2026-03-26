'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { applyTheme, clearTheme, reapplyTheme } from './themes';
import { savePreferences } from './auth';

const THEME_KEY = 'vopak_color_theme';

interface ThemeStore {
  themeId: string;
  mounted: boolean;
  setColorTheme: (id: string) => void;
  _init: () => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  themeId: 'default',
  mounted: false,
  setColorTheme: (id: string) => {
    set({ themeId: id });
    localStorage.setItem(THEME_KEY, id);
    if (id === 'default') {
      clearTheme();
    } else {
      applyTheme(id);
    }
    // Persist to server
    const colorMode = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    savePreferences({ colorMode, theme: id });
  },
  _init: () => {
    const stored = localStorage.getItem(THEME_KEY) || 'default';
    set({ themeId: stored, mounted: true });
    if (stored !== 'default') {
      applyTheme(stored);
    }
  },
}));

/**
 * Hook to initialize theme on mount + watch dark/light mode changes.
 * Call once in Providers.tsx.
 */
export function useThemeInit() {
  const _init = useThemeStore(s => s._init);
  const mounted = useThemeStore(s => s.mounted);

  useEffect(() => {
    _init();
  }, [_init]);

  useEffect(() => {
    if (!mounted) return;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') reapplyTheme();
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [mounted]);
}

/**
 * Convenience hook — same API as before for backward compat.
 */
export function useStyleTheme() {
  const themeId = useThemeStore(s => s.themeId);
  const setColorTheme = useThemeStore(s => s.setColorTheme);
  const mounted = useThemeStore(s => s.mounted);
  return { themeId, setColorTheme, mounted };
}
