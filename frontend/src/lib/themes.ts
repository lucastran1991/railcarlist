/**
 * Theme configuration system — 10 color palettes.
 * Each theme defines CSS variable overrides applied to :root via inline styles.
 * Dark/Light mode is handled separately by next-themes (.dark class).
 *
 * applyTheme() only sets/removes theme-specific properties.
 * It does NOT wipe root.style.cssText (preserves useSystemConfig colors).
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

// Helper to build a complete theme from minimal inputs
function t(
  id: string, name: string, description: string,
  preview: ThemeConfig['preview'],
  light: { bg: string; fg: string; card: string; muted: string; border: string },
  dark: { bg: string; fg: string; card: string; muted: string; border: string },
  accent: { primary: string; secondary: string; tertiary: string; hover: string; warning: string; danger: string; gradFrom: string; gradTo: string },
  charts: [string, string, string, string, string],
  radius: string,
): ThemeConfig {
  return {
    id, name, description, preview,
    light: {
      '--background': light.bg, '--foreground': light.fg,
      '--card': light.card, '--card-foreground': light.fg,
      '--popover': light.card, '--popover-foreground': light.fg,
      '--primary': light.fg, '--primary-foreground': light.bg,
      '--secondary': light.muted, '--secondary-foreground': light.fg,
      '--muted': light.muted, '--muted-foreground': `${light.fg.split(' ')[0]} 10% 45%`,
      '--accent': light.muted, '--accent-foreground': light.fg,
      '--destructive': '0 72% 51%', '--destructive-foreground': '0 0% 100%',
      '--border': light.border, '--input': light.border,
      '--ring': accent.primary.replace('#', '').length === 6 ? light.border : light.border,
      '--chart-1': charts[0], '--chart-2': charts[1], '--chart-3': charts[2], '--chart-4': charts[3], '--chart-5': charts[4],
    },
    dark: {
      '--background': dark.bg, '--foreground': dark.fg,
      '--card': dark.card, '--card-foreground': dark.fg,
      '--popover': dark.card, '--popover-foreground': dark.fg,
      '--primary': dark.fg, '--primary-foreground': dark.bg,
      '--secondary': dark.muted, '--secondary-foreground': dark.fg,
      '--muted': dark.muted, '--muted-foreground': `${dark.fg.split(' ')[0]} 10% 55%`,
      '--accent': dark.muted, '--accent-foreground': dark.fg,
      '--destructive': '0 72% 56%', '--destructive-foreground': '0 0% 100%',
      '--border': dark.border, '--input': dark.border,
      '--ring': dark.border,
      '--chart-1': charts[0], '--chart-2': charts[1], '--chart-3': charts[2], '--chart-4': charts[3], '--chart-5': charts[4],
    },
    shared: {
      '--radius': radius,
      '--color-accent': accent.primary, '--color-secondary': accent.secondary,
      '--color-tertiary': accent.tertiary, '--color-hover': accent.hover,
      '--color-warning': accent.warning, '--color-danger': accent.danger,
      '--color-gradient-from': accent.gradFrom, '--color-gradient-to': accent.gradTo,
      '--shadow-card': '0 1px 3px rgba(0,0,0,0.06)',
      '--shadow-card-hover': '0 2px 8px rgba(0,0,0,0.1)',
    },
  };
}

export const THEMES: ThemeConfig[] = [
  // ── 1. Terminal (Default — uses globals.css + system.cfg.json) ──
  {
    id: 'default',
    name: 'Terminal',
    description: 'Vopak green/cyan',
    preview: { bg: '#080A11', accent: '#5CE5A0', card: '#131620', border: '#2C2E39' },
    light: {}, dark: {},
  },

  // ── 2. Arctic Steel — Linear/Vercel inspired ──
  t('arctic-steel', 'Arctic Steel', 'Cool indigo mono',
    { bg: '#09090B', accent: '#6366F1', card: '#18181B', border: '#27272A' },
    { bg: '0 0% 98%', fg: '240 6% 10%', card: '0 0% 100%', muted: '240 5% 96%', border: '240 6% 90%' },
    { bg: '240 6% 4%', fg: '0 0% 98%', card: '240 4% 10%', muted: '240 4% 14%', border: '240 4% 18%' },
    { primary: '#6366F1', secondary: '#8B5CF6', tertiary: '#A78BFA', hover: '#818CF8', warning: '#F59E0B', danger: '#EF4444', gradFrom: '#6366F1', gradTo: '#8B5CF6' },
    ['239 84% 67%', '187 92% 53%', '38 92% 50%', '160 84% 39%', '349 89% 60%'],
    '0.375rem',
  ),

  // ── 3. Emerald Pulse — Supabase/Spotify inspired ──
  t('emerald', 'Emerald', 'Fresh green energy',
    { bg: '#0A0A0A', accent: '#10B981', card: '#141414', border: '#262626' },
    { bg: '150 10% 97%', fg: '150 10% 8%', card: '0 0% 100%', muted: '150 8% 95%', border: '150 6% 88%' },
    { bg: '0 0% 4%', fg: '150 5% 96%', card: '0 0% 8%', muted: '0 0% 12%', border: '0 0% 16%' },
    { primary: '#10B981', secondary: '#34D399', tertiary: '#6EE7B7', hover: '#34D399', warning: '#FBBF24', danger: '#F43F5E', gradFrom: '#10B981', gradTo: '#06B6D4' },
    ['160 84% 39%', '239 84% 67%', '38 92% 50%', '330 81% 60%', '217 91% 60%'],
    '0.5rem',
  ),

  // ── 4. Solar Flare — Warm orange energy ──
  t('solar', 'Solar Flare', 'Warm orange industrial',
    { bg: '#0C0A09', accent: '#F97316', card: '#1C1917', border: '#292524' },
    { bg: '20 6% 97%', fg: '24 10% 8%', card: '30 20% 99%', muted: '24 6% 94%', border: '24 6% 86%' },
    { bg: '20 14% 4%', fg: '30 10% 94%', card: '20 12% 8%', muted: '20 10% 12%', border: '20 8% 16%' },
    { primary: '#F97316', secondary: '#FB923C', tertiary: '#FDBA74', hover: '#FB923C', warning: '#EAB308', danger: '#DC2626', gradFrom: '#F97316', gradTo: '#EF4444' },
    ['25 95% 53%', '217 91% 60%', '160 84% 39%', '270 76% 65%', '349 89% 60%'],
    '0.5rem',
  ),

  // ── 5. Sapphire — GitHub/Discord classic blue ──
  t('sapphire', 'Sapphire', 'Deep blue classic',
    { bg: '#030712', accent: '#3B82F6', card: '#111827', border: '#1F2937' },
    { bg: '220 14% 97%', fg: '222 47% 11%', card: '0 0% 100%', muted: '220 14% 96%', border: '220 13% 88%' },
    { bg: '222 47% 3%', fg: '210 20% 96%', card: '222 35% 7%', muted: '222 25% 11%', border: '222 15% 16%' },
    { primary: '#3B82F6', secondary: '#60A5FA', tertiary: '#93C5FD', hover: '#60A5FA', warning: '#F59E0B', danger: '#EF4444', gradFrom: '#3B82F6', gradTo: '#2DD4BF' },
    ['217 91% 60%', '38 92% 50%', '160 84% 39%', '330 81% 60%', '258 90% 66%'],
    '0.75rem',
  ),

  // ── 6. Neon Cyber — Figma/gaming fuchsia+cyan ──
  t('neon', 'Neon Cyber', 'Vibrant fuchsia+cyan',
    { bg: '#0A0118', accent: '#D946EF', card: '#150A2E', border: '#2E1065' },
    { bg: '280 20% 97%', fg: '280 30% 8%', card: '280 15% 99%', muted: '280 12% 95%', border: '280 12% 88%' },
    { bg: '270 60% 4%', fg: '280 10% 96%', card: '270 45% 8%', muted: '270 30% 13%', border: '270 40% 16%' },
    { primary: '#D946EF', secondary: '#22D3EE', tertiary: '#A855F7', hover: '#E879F9', warning: '#FBBF24', danger: '#F43F5E', gradFrom: '#D946EF', gradTo: '#22D3EE' },
    ['292 91% 73%', '187 92% 53%', '25 95% 53%', '82 85% 55%', '349 89% 60%'],
    '0.75rem',
  ),

  // ── 7. Sandstone — Notion earth tones ──
  t('sandstone', 'Sandstone', 'Warm earth tones',
    { bg: '#0C0A09', accent: '#D97706', card: '#1C1917', border: '#44403C' },
    { bg: '30 10% 97%', fg: '24 10% 8%', card: '40 20% 98%', muted: '30 8% 94%', border: '24 6% 85%' },
    { bg: '20 14% 4%', fg: '30 10% 94%', card: '20 12% 8%', muted: '20 8% 13%', border: '20 6% 18%' },
    { primary: '#D97706', secondary: '#92400E', tertiary: '#B45309', hover: '#F59E0B', warning: '#CA8A04', danger: '#B91C1C', gradFrom: '#D97706', gradTo: '#B45309' },
    ['38 92% 50%', '173 80% 36%', '258 90% 66%', '0 72% 51%', '217 91% 60%'],
    '0.5rem',
  ),

  // ── 8. Rose Quartz — Soft pink premium ──
  t('rose', 'Rose Quartz', 'Soft rose premium',
    { bg: '#0F0708', accent: '#F43F5E', card: '#1A0F12', border: '#2D1B20' },
    { bg: '350 20% 97%', fg: '350 20% 8%', card: '0 0% 100%', muted: '350 15% 95%', border: '350 10% 87%' },
    { bg: '350 30% 4%', fg: '350 10% 96%', card: '350 20% 7%', muted: '350 15% 12%', border: '350 12% 17%' },
    { primary: '#F43F5E', secondary: '#FB7185', tertiary: '#FDA4AF', hover: '#FB7185', warning: '#F59E0B', danger: '#E11D48', gradFrom: '#F43F5E', gradTo: '#EC4899' },
    ['349 89% 60%', '258 90% 66%', '187 92% 53%', '38 92% 50%', '160 84% 39%'],
    '1rem',
  ),

  // ── 9. Ocean Teal — Industrial SCADA ──
  t('ocean', 'Ocean Teal', 'Calm teal jewel',
    { bg: '#042F2E', accent: '#0D9488', card: '#0A3D3C', border: '#134E4A' },
    { bg: '170 25% 97%', fg: '170 30% 8%', card: '0 0% 100%', muted: '170 15% 95%', border: '170 10% 86%' },
    { bg: '173 70% 9%', fg: '170 15% 95%', card: '173 60% 12%', muted: '173 40% 16%', border: '173 30% 20%' },
    { primary: '#0D9488', secondary: '#14B8A6', tertiary: '#2DD4BF', hover: '#14B8A6', warning: '#F59E0B', danger: '#EF4444', gradFrom: '#0D9488', gradTo: '#06B6D4' },
    ['173 80% 36%', '239 84% 67%', '25 95% 53%', '330 81% 60%', '82 85% 55%'],
    '0.375rem',
  ),

  // ── 10. Volt — Electric lime trend ──
  t('volt', 'Volt', 'Electric lime energy',
    { bg: '#0A0A0A', accent: '#84CC16', card: '#171717', border: '#262626' },
    { bg: '80 10% 97%', fg: '0 0% 8%', card: '0 0% 100%', muted: '80 8% 95%', border: '80 4% 88%' },
    { bg: '0 0% 4%', fg: '80 5% 96%', card: '0 0% 7%', muted: '0 0% 11%', border: '0 0% 16%' },
    { primary: '#84CC16', secondary: '#A3E635', tertiary: '#BEF264', hover: '#A3E635', warning: '#FBBF24', danger: '#EF4444', gradFrom: '#84CC16', gradTo: '#22D3EE' },
    ['82 85% 44%', '217 91% 60%', '349 89% 60%', '38 92% 50%', '270 76% 65%'],
    '0.25rem',
  ),

  // ── 11. Mechanical — Industrial SCADA steel blue ──
  t('mechanical', 'Mechanical', 'Industrial steel SCADA',
    { bg: '#2C5F72', accent: '#5B8FA8', card: '#FFFFFF', border: '#C5CAD0' },
    { bg: '210 10% 86%', fg: '210 15% 15%', card: '0 0% 100%', muted: '210 8% 93%', border: '210 6% 80%' },
    { bg: '200 40% 12%', fg: '200 10% 92%', card: '200 25% 17%', muted: '200 18% 22%', border: '200 14% 28%' },
    { primary: '#5B8FA8', secondary: '#7BA4B8', tertiary: '#9BBCCC', hover: '#7BA4B8', warning: '#E8A838', danger: '#D94F4F', gradFrom: '#5B8FA8', gradTo: '#2C5F72' },
    ['197 30% 50%', '38 78% 56%', '160 40% 45%', '350 60% 55%', '270 40% 55%'],
    '0.375rem',
  ),
];

// Track which properties were set by the last theme apply
let _appliedVars: string[] = [];

export function applyTheme(themeId: string): void {
  const theme = THEMES.find(t => t.id === themeId);
  if (!theme) return;

  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const vars = isDark ? theme.dark : theme.light;

  for (const key of _appliedVars) root.style.removeProperty(key);
  _appliedVars = [];

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
    _appliedVars.push(key);
  }
  if (theme.shared) {
    for (const [key, value] of Object.entries(theme.shared)) {
      root.style.setProperty(key, value);
      _appliedVars.push(key);
    }
  }
  root.setAttribute('data-theme', themeId);
}

export function clearTheme(): void {
  const root = document.documentElement;
  for (const key of _appliedVars) root.style.removeProperty(key);
  _appliedVars = [];
  root.removeAttribute('data-theme');
}

export function reapplyTheme(): void {
  const themeId = document.documentElement.getAttribute('data-theme') || 'default';
  if (themeId !== 'default') applyTheme(themeId);
}
