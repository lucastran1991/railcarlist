'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { savePreferences } from '@/lib/auth';
import { useThemeStore } from '@/lib/useStyleTheme';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const themeId = useThemeStore(s => s.themeId);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = theme === 'dark';

  const handleToggle = () => {
    const newMode = isDark ? 'light' : 'dark';
    setTheme(newMode);
    savePreferences({ colorMode: newMode, theme: themeId });
  };

  return (
    <button
      onClick={handleToggle}
      className="w-9 h-9 flex items-center justify-center rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun size={16} className="text-[#F6AD55]" />
      ) : (
        <Moon size={16} className="text-[#454A5F]" />
      )}
    </button>
  );
}
