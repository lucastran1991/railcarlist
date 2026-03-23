'use client';

import { useState, useEffect, useCallback } from 'react';

export type StyleTheme = 'default' | 'glass';

const STORAGE_KEY = 'vopak_style_theme';

export function useStyleTheme() {
  const [theme, setThemeState] = useState<StyleTheme>('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as StyleTheme | null;
    const initial = stored === 'glass' ? 'glass' : 'default';
    setThemeState(initial);
    document.documentElement.setAttribute('data-style', initial);
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: StyleTheme) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    document.documentElement.setAttribute('data-style', t);
  }, []);

  return { theme, setTheme, mounted };
}
