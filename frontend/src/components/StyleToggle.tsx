'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Palette, Check } from 'lucide-react';
import { useStyleTheme } from '@/lib/useStyleTheme';
import { THEMES, type ThemeConfig } from '@/lib/themes';
import { cn } from '@/lib/utils';

function hexLightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b; // perceived brightness
}

export default function StyleToggle() {
  const { themeId, setColorTheme, mounted } = useStyleTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!mounted) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
        title="Color Theme"
      >
        <Palette size={16} className="text-foreground/70" />
      </button>
      {open && (
        <div className="absolute right-0 mt-5 w-64 max-h-[420px] rounded-xl border border-border/50 dropdown-surface shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-3 py-2 border-b border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Color Theme</p>
          </div>
          <div className="p-2 grid grid-cols-2 gap-1.5 overflow-y-auto max-h-[360px]">
            {[...THEMES].sort((a, b) => hexLightness(b.preview.accent) - hexLightness(a.preview.accent)).map((t) => (
              <button
                key={t.id}
                onClick={() => { setColorTheme(t.id); setOpen(false); }}
                className={cn(
                  'relative flex flex-col gap-1 p-2 rounded-lg border transition-all text-left',
                  t.id === themeId
                    ? 'border-[var(--color-accent,#5CE5A0)] bg-[var(--color-accent,#5CE5A0)]/5'
                    : 'border-border/50 hover:border-border hover:bg-muted/50'
                )}
              >
                <div className="flex gap-0.5">
                  <div className="w-5 h-5 rounded" style={{ background: t.preview.bg }} />
                  <div className="w-5 h-5 rounded" style={{ background: t.preview.accent }} />
                  <div className="w-5 h-5 rounded" style={{ background: t.preview.card }} />
                  <div className="w-5 h-5 rounded border" style={{ background: t.preview.border, borderColor: t.preview.border }} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-foreground">{t.name}</p>
                  <p className="text-[8px] text-muted-foreground leading-tight">{t.description}</p>
                </div>
                {t.id === themeId && (
                  <div className="absolute top-1.5 right-1.5">
                    <Check size={10} className="text-[var(--color-accent,#5CE5A0)]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
