'use client';

import { useState, useEffect, useCallback } from 'react';
import { applyTheme, clearTheme, reapplyTheme } from './themes';

const THEME_KEY = 'vopak_color_theme';

export function useStyleTheme() {
  const [themeId, setThemeIdState] = useState('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) || 'default';
    setThemeIdState(storedTheme);
    if (storedTheme !== 'default') {
      applyTheme(storedTheme);
    }
    setMounted(true);
  }, []);

  // Re-apply theme when dark/light mode toggles
  useEffect(() => {
    if (!mounted) return;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          reapplyTheme();
        }
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [mounted]);

  const setColorTheme = useCallback((id: string) => {
    setThemeIdState(id);
    localStorage.setItem(THEME_KEY, id);
    if (id === 'default') {
      clearTheme();
    } else {
      applyTheme(id);
    }
  }, []);

  return { themeId, setColorTheme, mounted };
}
