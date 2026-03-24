/**
 * Theme configuration system.
 * Each theme defines CSS variable overrides applied to :root via inline styles.
 * Dark/Light mode is handled separately by next-themes (.dark class).
 *
 * IMPORTANT: applyTheme() only sets/removes theme-specific properties.
 * It does NOT wipe root.style.cssText (which would kill useSystemConfig colors).
 */

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  preview: { bg: string; accent: string; card: string; border: string };
  light: Record<string, string>;
  dark: Record<string, string>;
  shared?: Record<string, string>;
}

// All CSS variable keys that themes may override — used for cleanup on theme switch
const THEME_VARS = [
  '--background', '--foreground', '--card', '--card-foreground',
  '--popover', '--popover-foreground', '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground', '--muted', '--muted-foreground',
  '--accent', '--accent-foreground', '--destructive', '--destructive-foreground',
  '--border', '--input', '--ring',
  '--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5',
  '--radius', '--shadow-card', '--shadow-card-hover', '--border-style',
  '--color-accent', '--color-secondary', '--color-tertiary', '--color-hover',
  '--color-warning', '--color-danger', '--color-gradient-from', '--color-gradient-to',
  '--gradient-text-from', '--gradient-text-to',
];

export const THEMES: ThemeConfig[] = [
  // ── Default (Vopak Terminal) ────────────────────────────────────
  {
    id: 'default',
    name: 'Terminal',
    description: 'Default Vopak terminal theme',
    preview: { bg: '#080A11', accent: '#5CE5A0', card: '#131620', border: '#2C2E39' },
    light: {},
    dark: {},
    // No shared — uses globals.css defaults + system.cfg.json colors
  },

  // ── Cyberpunk Neon ──────────────────────────────────────────────
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon glow, sharp edges, high contrast',
    preview: { bg: '#0a0014', accent: '#FF2D95', card: '#120025', border: '#FF2D95' },
    light: {
      '--background': '280 20% 95%',
      '--foreground': '280 30% 10%',
      '--card': '280 15% 98%',
      '--card-foreground': '280 30% 10%',
      '--popover': '280 15% 98%',
      '--popover-foreground': '280 30% 10%',
      '--primary': '330 100% 50%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '180 100% 40%',
      '--secondary-foreground': '0 0% 100%',
      '--muted': '280 10% 92%',
      '--muted-foreground': '280 10% 40%',
      '--accent': '280 60% 92%',
      '--accent-foreground': '280 30% 10%',
      '--destructive': '45 100% 50%',
      '--destructive-foreground': '0 0% 0%',
      '--border': '280 15% 85%',
      '--input': '280 15% 85%',
      '--ring': '330 100% 50%',
      '--chart-1': '330 100% 50%',
      '--chart-2': '180 100% 45%',
      '--chart-3': '270 80% 55%',
      '--chart-4': '45 100% 50%',
      '--chart-5': '200 100% 50%',
    },
    dark: {
      '--background': '270 40% 4%',
      '--foreground': '280 10% 95%',
      '--card': '270 35% 8%',
      '--card-foreground': '280 10% 95%',
      '--popover': '270 35% 8%',
      '--popover-foreground': '280 10% 95%',
      '--primary': '330 100% 55%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '180 100% 50%',
      '--secondary-foreground': '0 0% 0%',
      '--muted': '270 25% 12%',
      '--muted-foreground': '280 10% 55%',
      '--accent': '270 30% 15%',
      '--accent-foreground': '280 10% 95%',
      '--destructive': '45 100% 55%',
      '--destructive-foreground': '0 0% 0%',
      '--border': '270 30% 18%',
      '--input': '270 30% 18%',
      '--ring': '330 100% 55%',
      '--chart-1': '330 100% 60%',
      '--chart-2': '180 100% 50%',
      '--chart-3': '270 80% 60%',
      '--chart-4': '45 100% 55%',
      '--chart-5': '200 100% 55%',
    },
    shared: {
      '--radius': '0.25rem',
      '--color-accent': '#FF2D95',
      '--color-secondary': '#00F0FF',
      '--color-tertiary': '#B026FF',
      '--color-hover': '#00F0FF',
      '--color-warning': '#FFE600',
      '--color-danger': '#FF4444',
      '--color-gradient-from': '#FF2D95',
      '--color-gradient-to': '#00F0FF',
      '--gradient-text-from': '#FF2D95',
      '--gradient-text-to': '#00F0FF',
      '--shadow-card': '0 1px 4px rgba(255,45,149,0.08)',
      '--shadow-card-hover': '0 2px 8px rgba(255,45,149,0.15)',
    },
  },

  // ── Arctic Frost ────────────────────────────────────────────────
  {
    id: 'arctic',
    name: 'Arctic',
    description: 'Cool blue palette, soft & clean',
    preview: { bg: '#F0F4F8', accent: '#3B82F6', card: '#FFFFFF', border: '#CBD5E1' },
    light: {
      '--background': '210 25% 96%',
      '--foreground': '215 25% 12%',
      '--card': '0 0% 100%',
      '--card-foreground': '215 25% 12%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '215 25% 12%',
      '--primary': '217 91% 60%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '199 89% 48%',
      '--secondary-foreground': '0 0% 100%',
      '--muted': '210 20% 94%',
      '--muted-foreground': '215 15% 45%',
      '--accent': '210 20% 94%',
      '--accent-foreground': '215 25% 12%',
      '--destructive': '0 72% 51%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '214 15% 82%',
      '--input': '214 15% 82%',
      '--ring': '217 91% 60%',
      '--chart-1': '217 91% 60%',
      '--chart-2': '199 89% 48%',
      '--chart-3': '239 84% 67%',
      '--chart-4': '43 96% 56%',
      '--chart-5': '0 72% 51%',
    },
    dark: {
      '--background': '217 33% 6%',
      '--foreground': '210 20% 95%',
      '--card': '217 30% 10%',
      '--card-foreground': '210 20% 95%',
      '--popover': '217 30% 10%',
      '--popover-foreground': '210 20% 95%',
      '--primary': '217 91% 60%',
      '--primary-foreground': '0 0% 100%',
      '--secondary': '199 89% 48%',
      '--secondary-foreground': '0 0% 100%',
      '--muted': '217 25% 14%',
      '--muted-foreground': '215 15% 55%',
      '--accent': '217 25% 16%',
      '--accent-foreground': '210 20% 95%',
      '--destructive': '0 72% 51%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '217 20% 20%',
      '--input': '217 20% 20%',
      '--ring': '217 91% 60%',
      '--chart-1': '217 91% 65%',
      '--chart-2': '199 89% 55%',
      '--chart-3': '239 84% 70%',
      '--chart-4': '43 96% 60%',
      '--chart-5': '0 72% 56%',
    },
    shared: {
      '--radius': '1rem',
      '--color-accent': '#3B82F6',
      '--color-secondary': '#0EA5E9',
      '--color-tertiary': '#6366F1',
      '--color-hover': '#60A5FA',
      '--color-warning': '#F59E0B',
      '--color-danger': '#EF4444',
      '--color-gradient-from': '#3B82F6',
      '--color-gradient-to': '#06B6D4',
      '--gradient-text-from': '#93C5FD',
      '--gradient-text-to': '#67E8F9',
      '--shadow-card': '0 1px 3px rgba(0,0,0,0.05)',
      '--shadow-card-hover': '0 2px 8px rgba(59,130,246,0.1)',
    },
  },

  // ── Warm Industrial ─────────────────────────────────────────────
  {
    id: 'industrial',
    name: 'Industrial',
    description: 'Amber tones, earthy, rugged feel',
    preview: { bg: '#1C1917', accent: '#F59E0B', card: '#292524', border: '#44403C' },
    light: {
      '--background': '30 10% 94%',
      '--foreground': '24 10% 10%',
      '--card': '30 20% 99%',
      '--card-foreground': '24 10% 10%',
      '--popover': '30 20% 99%',
      '--popover-foreground': '24 10% 10%',
      '--primary': '38 92% 50%',
      '--primary-foreground': '0 0% 0%',
      '--secondary': '25 95% 53%',
      '--secondary-foreground': '0 0% 100%',
      '--muted': '30 10% 91%',
      '--muted-foreground': '24 6% 45%',
      '--accent': '30 15% 91%',
      '--accent-foreground': '24 10% 10%',
      '--destructive': '0 72% 51%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '24 6% 83%',
      '--input': '24 6% 83%',
      '--ring': '38 92% 50%',
      '--chart-1': '38 92% 50%',
      '--chart-2': '25 95% 53%',
      '--chart-3': '15 75% 45%',
      '--chart-4': '45 93% 47%',
      '--chart-5': '0 72% 51%',
    },
    dark: {
      '--background': '20 14% 7%',
      '--foreground': '30 10% 92%',
      '--card': '20 12% 10%',
      '--card-foreground': '30 10% 92%',
      '--popover': '20 12% 10%',
      '--popover-foreground': '30 10% 92%',
      '--primary': '38 92% 50%',
      '--primary-foreground': '0 0% 0%',
      '--secondary': '25 95% 53%',
      '--secondary-foreground': '0 0% 100%',
      '--muted': '20 10% 14%',
      '--muted-foreground': '24 6% 55%',
      '--accent': '20 12% 16%',
      '--accent-foreground': '30 10% 92%',
      '--destructive': '0 72% 51%',
      '--destructive-foreground': '0 0% 100%',
      '--border': '20 8% 22%',
      '--input': '20 8% 22%',
      '--ring': '38 92% 50%',
      '--chart-1': '38 92% 55%',
      '--chart-2': '25 95% 58%',
      '--chart-3': '15 75% 50%',
      '--chart-4': '45 93% 52%',
      '--chart-5': '0 72% 56%',
    },
    shared: {
      '--radius': '0.5rem',
      '--color-accent': '#F59E0B',
      '--color-secondary': '#F97316',
      '--color-tertiary': '#D97706',
      '--color-hover': '#FBBF24',
      '--color-warning': '#FB923C',
      '--color-danger': '#DC2626',
      '--color-gradient-from': '#F59E0B',
      '--color-gradient-to': '#F97316',
      '--gradient-text-from': '#FCD34D',
      '--gradient-text-to': '#FDBA74',
      '--shadow-card': '0 1px 3px rgba(0,0,0,0.08)',
      '--shadow-card-hover': '0 2px 8px rgba(245,158,11,0.12)',
    },
  },
];

// Track which properties were set by the last theme apply
let _appliedVars: string[] = [];

/**
 * Apply a theme's CSS variables to document root.
 * Only touches theme-specific vars — does NOT wipe other inline styles.
 */
export function applyTheme(themeId: string): void {
  const theme = THEMES.find(t => t.id === themeId);
  if (!theme) return;

  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const vars = isDark ? theme.dark : theme.light;

  // Remove previously applied theme vars (clean slate for new theme)
  for (const key of _appliedVars) {
    root.style.removeProperty(key);
  }
  _appliedVars = [];

  // Apply mode-specific variables
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
    _appliedVars.push(key);
  }

  // Apply shared variables
  if (theme.shared) {
    for (const [key, value] of Object.entries(theme.shared)) {
      root.style.setProperty(key, value);
      _appliedVars.push(key);
    }
  }

  root.setAttribute('data-theme', themeId);
}

/**
 * Remove all theme overrides — restore CSS defaults.
 */
export function clearTheme(): void {
  const root = document.documentElement;
  for (const key of _appliedVars) {
    root.style.removeProperty(key);
  }
  _appliedVars = [];
  root.removeAttribute('data-theme');
}

/**
 * Re-apply current theme (e.g. when dark/light mode changes).
 */
export function reapplyTheme(): void {
  const themeId = document.documentElement.getAttribute('data-theme') || 'default';
  if (themeId !== 'default') {
    applyTheme(themeId);
  }
}
