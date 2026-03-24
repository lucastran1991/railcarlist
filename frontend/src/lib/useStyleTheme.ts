'use client';

import { useState, useEffect, useCallback } from 'react';
import { applyTheme, reapplyTheme } from './themes';

export type StyleTheme = 'default' | 'glass';

const STYLE_KEY = 'vopak_style_theme';
const THEME_KEY = 'vopak_color_theme';

export function useStyleTheme() {
  const [style, setStyleState] = useState<StyleTheme>('default');
  const [themeId, setThemeIdState] = useState('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Restore style (glass/default)
    const storedStyle = localStorage.getItem(STYLE_KEY) as StyleTheme | null;
    const initialStyle = storedStyle === 'glass' ? 'glass' : 'default';
    setStyleState(initialStyle);
    document.documentElement.setAttribute('data-style', initialStyle);

    // Restore color theme
    const storedTheme = localStorage.getItem(THEME_KEY) || 'default';
    setThemeIdState(storedTheme);
    if (storedTheme !== 'default') {
      applyTheme(storedTheme);
    }

    setMounted(true);
  }, []);

  // Watch for dark/light mode changes to reapply theme variables
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

  const setStyle = useCallback((t: StyleTheme) => {
    setStyleState(t);
    localStorage.setItem(STYLE_KEY, t);
    document.documentElement.setAttribute('data-style', t);
  }, []);

  const setTheme = useCallback((id: string) => {
    setThemeIdState(id);
    localStorage.setItem(THEME_KEY, id);
    if (id === 'default') {
      // Clear inline styles to restore CSS defaults
      document.documentElement.style.cssText = '';
      document.documentElement.removeAttribute('data-theme');
    } else {
      applyTheme(id);
    }
  }, []);

  // Combined setter for backward compatibility
  const setStyleTheme = useCallback((t: StyleTheme) => setStyle(t), [setStyle]);

  return {
    // Style (glass/default)
    theme: style,
    setTheme: setStyleTheme,
    // Color theme
    themeId,
    setColorTheme: setTheme,
    // Glass shortcut
    style,
    setStyle,
    mounted,
  };
}
