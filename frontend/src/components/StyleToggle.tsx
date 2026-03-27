'use client';

import { useState, useEffect } from 'react';
import { Palette, Check, X } from 'lucide-react';
import { useStyleTheme } from '@/lib/useStyleTheme';
import { THEMES } from '@/lib/themes';
import { cn } from '@/lib/utils';

function hexLightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export default function StyleToggle() {
  const { themeId, setColorTheme, mounted } = useStyleTheme();
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!mounted) return null;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
        title="Color Theme"
      >
        <Palette size={16} className="text-foreground/70" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Right Sidebar */}
      <div className={cn(
        'fixed top-0 right-0 h-full w-80 z-50 border-l border-border/50 shadow-2xl transition-transform duration-300 ease-in-out',
        'bg-[hsl(var(--background))]',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-foreground/70" />
            <p className="text-sm font-bold text-foreground">Color Theme</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>

        {/* Current theme indicator */}
        <div className="px-5 py-3 border-b border-border/30">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Active</p>
          <p className="text-sm font-semibold text-foreground">
            {THEMES.find(t => t.id === themeId)?.name || 'Default'}
          </p>
        </div>

        {/* Theme grid */}
        <div className="p-4 grid grid-cols-2 gap-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {[...THEMES].sort((a, b) => hexLightness(b.preview.accent) - hexLightness(a.preview.accent)).map((t) => (
            <button
              key={t.id}
              onClick={() => setColorTheme(t.id)}
              className={cn(
                'relative flex flex-col gap-1.5 p-2.5 rounded-lg border transition-all text-left',
                t.id === themeId
                  ? 'border-[var(--color-accent,#5CE5A0)] bg-[var(--color-accent,#5CE5A0)]/5 ring-1 ring-[var(--color-accent,#5CE5A0)]/30'
                  : 'border-border/50 hover:border-border hover:bg-muted/50'
              )}
            >
              <div className="flex gap-1">
                <div className="w-6 h-6 rounded" style={{ background: t.preview.bg }} />
                <div className="w-6 h-6 rounded" style={{ background: t.preview.accent }} />
                <div className="w-6 h-6 rounded" style={{ background: t.preview.card }} />
                <div className="w-6 h-6 rounded border" style={{ background: t.preview.border, borderColor: t.preview.border }} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-foreground">{t.name}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{t.description}</p>
              </div>
              {t.id === themeId && (
                <div className="absolute top-2 right-2">
                  <Check size={12} className="text-[var(--color-accent,#5CE5A0)]" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
