/**
 * Chart colors derived from the current theme's CSS variables.
 * Falls back to Terminal theme defaults if variables aren't set.
 *
 * Usage in components:
 *   import { useChartColors } from '@/lib/chartColors';
 *   const { colors, axis } = useChartColors();
 *   <Line stroke={colors[0]} />
 *
 * Or imperative:
 *   import { getChartColors } from '@/lib/chartColors';
 *   const colors = getChartColors();
 */

import { useMemo } from 'react';
import { useThemeStore } from './useStyleTheme';

function hslToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return '#888888';
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const DEFAULTS = ['#5CE5A0', '#56CDE7', '#F6AD55', '#E53E3E', '#4D65FF', '#319795', '#D53F8C', '#00B5D8'];

/**
 * Read chart colors from CSS variables (--chart-1..5) + accent/secondary.
 * Returns 8 hex colors for use in Recharts stroke/fill.
 */
export function getChartColors(): string[] {
  if (typeof window === 'undefined') return DEFAULTS;

  const style = getComputedStyle(document.documentElement);
  const fromVar = (name: string): string | null => {
    const val = style.getPropertyValue(name).trim();
    return val ? (val.startsWith('#') ? val : hslToHex(val)) : null;
  };

  return [
    fromVar('--chart-1') ?? DEFAULTS[0],
    fromVar('--chart-2') ?? DEFAULTS[1],
    fromVar('--chart-3') ?? DEFAULTS[2],
    fromVar('--chart-4') ?? DEFAULTS[3],
    fromVar('--chart-5') ?? DEFAULTS[4],
    // Extra 3 from accent colors for charts with >5 series
    fromVar('--color-accent') ?? DEFAULTS[5],
    fromVar('--color-secondary') ?? DEFAULTS[6],
    fromVar('--color-tertiary') ?? DEFAULTS[7],
  ];
}

/**
 * Get axis/grid colors matching current theme.
 */
export function getChartAxisColors(): { grid: string; axis: string; tick: string } {
  if (typeof window === 'undefined') return { grid: '#2C2E39', axis: '#2C2E39', tick: '#6B7280' };

  const style = getComputedStyle(document.documentElement);
  const borderHsl = style.getPropertyValue('--border').trim();
  const mutedFgHsl = style.getPropertyValue('--muted-foreground').trim();

  return {
    grid: borderHsl ? hslToHex(borderHsl) : '#2C2E39',
    axis: borderHsl ? hslToHex(borderHsl) : '#2C2E39',
    tick: mutedFgHsl ? hslToHex(mutedFgHsl) : '#6B7280',
  };
}

/**
 * React hook — re-reads chart colors when themeId changes in Zustand store.
 * Components using this will re-render on theme switch.
 */
export function useChartColors() {
  const themeId = useThemeStore(s => s.themeId);
  return useMemo(() => ({
    colors: getChartColors(),
    axis: getChartAxisColors(),
    themeId, // included so useMemo deps track changes
  }), [themeId]);
}
