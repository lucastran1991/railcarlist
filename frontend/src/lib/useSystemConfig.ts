'use client';

import { useEffect, useState } from 'react';

export interface SystemColors {
  accent: string;
  secondary: string;
  tertiary: string;
  hover: string;
  warning: string;
  danger: string;
  gradient: { from: string; to: string };
}

export interface SystemConfig {
  scene: {
    camera: {
      default: { angle: number; radius: number; height: number; x: number; y: number; z: number };
      limits: { radius_min: number; radius_max: number; height_min: number; height_max: number; angle_max: number };
      zoom: { min: number; max: number; speed: number };
      rotate: { speed: number; tilt_speed: number };
    };
    target: { x: number; y: number; z: number };
    auto_orbit: boolean;
  };
  color: SystemColors;
}

const DEFAULT_COLORS: SystemColors = {
  accent: '#5CE5A0',
  secondary: '#56CDE7',
  tertiary: '#4D65FF',
  hover: '#5DDFFF',
  warning: '#F6AD55',
  danger: '#E53E3E',
  gradient: { from: '#5CE5A0', to: '#56CDE7' },
};

let cachedConfig: SystemConfig | null = null;

function hexToHSL(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyColorsToCSS(colors: SystemColors) {
  const root = document.documentElement;
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-secondary', colors.secondary);
  root.style.setProperty('--color-tertiary', colors.tertiary);
  root.style.setProperty('--color-hover', colors.hover);
  root.style.setProperty('--color-warning', colors.warning);
  root.style.setProperty('--color-danger', colors.danger);
  root.style.setProperty('--color-gradient-from', colors.gradient.from);
  root.style.setProperty('--color-gradient-to', colors.gradient.to);
  // HSL versions for Tailwind/shadcn compatibility
  root.style.setProperty('--accent', hexToHSL(colors.accent));
  root.style.setProperty('--secondary-accent', hexToHSL(colors.secondary));
}

export function useSystemConfig(): SystemConfig | null {
  const [config, setConfig] = useState<SystemConfig | null>(cachedConfig);

  useEffect(() => {
    if (cachedConfig) {
      applyColorsToCSS(cachedConfig.color);
      return;
    }
    fetch('/system.cfg.json')
      .then((r) => r.json())
      .then((data: SystemConfig) => {
        if (!data.color) data.color = DEFAULT_COLORS;
        cachedConfig = data;
        setConfig(data);
        applyColorsToCSS(data.color);
      })
      .catch(() => {
        const fallback = { color: DEFAULT_COLORS } as SystemConfig;
        setConfig(fallback);
        applyColorsToCSS(DEFAULT_COLORS);
      });
  }, []);

  return config;
}

export function getColors(): SystemColors {
  return cachedConfig?.color ?? DEFAULT_COLORS;
}
