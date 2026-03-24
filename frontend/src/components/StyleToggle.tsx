'use client';

import { useState, useRef, useEffect } from 'react';
import { Palette, Square, Sparkles, Check } from 'lucide-react';
import { useStyleTheme, type StyleTheme } from '@/lib/useStyleTheme';
import { THEMES } from '@/lib/themes';
import { cn } from '@/lib/utils';

const STYLE_OPTIONS: { value: StyleTheme; label: string; icon: React.ReactNode }[] = [
  { value: 'default', label: 'Solid', icon: <Square size={12} /> },
  { value: 'glass', label: 'Glass', icon: <Sparkles size={12} /> },
];

export default function StyleToggle() {
  const { style, setStyle, themeId, setColorTheme, mounted } = useStyleTheme();
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
        title="Theme & Style"
      >
        <Palette size={16} className="text-foreground/70" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-popover shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Color Themes */}
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Color Theme</p>
          </div>
          <div className="p-2 grid grid-cols-2 gap-1.5">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setColorTheme(t.id)}
                className={cn(
                  'relative flex flex-col gap-1 p-2 rounded-lg border transition-all text-left',
                  t.id === themeId
                    ? 'border-[var(--color-accent,#5CE5A0)] bg-[var(--color-accent,#5CE5A0)]/5'
                    : 'border-border/50 hover:border-border hover:bg-muted/50'
                )}
              >
                {/* Preview swatches */}
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

          {/* Card Style */}
          <div className="px-3 py-2 border-t border-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Card Style</p>
          </div>
          <div className="p-2 flex gap-1.5">
            {STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStyle(opt.value)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium border transition-all',
                  opt.value === style
                    ? 'border-[var(--color-accent,#5CE5A0)] bg-[var(--color-accent,#5CE5A0)]/10 text-[var(--color-accent,#5CE5A0)]'
                    : 'border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
