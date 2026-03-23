'use client';

import { useState, useRef, useEffect } from 'react';
import { Layers, ChevronDown, Square, Sparkles } from 'lucide-react';
import { useStyleTheme, type StyleTheme } from '@/lib/useStyleTheme';
import { cn } from '@/lib/utils';

const OPTIONS: { value: StyleTheme; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'default', label: 'Default', icon: <Square size={14} />, desc: 'Solid cards' },
  { value: 'glass', label: 'Glass', icon: <Sparkles size={14} />, desc: 'Frosted blur' },
];

export default function StyleToggle() {
  const { theme, setTheme, mounted } = useStyleTheme();
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

  const current = OPTIONS.find(o => o.value === theme) ?? OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
        title={`Style: ${current.label}`}
      >
        <Layers size={16} className="text-foreground/70" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-popover shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Style Theme</p>
          </div>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setTheme(opt.value); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors',
                opt.value === theme
                  ? 'text-[var(--color-accent,#5CE5A0)] bg-[var(--color-accent,#5CE5A0)]/5 font-medium'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              {opt.icon}
              <div className="text-left">
                <p className="text-xs font-medium">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </div>
              {opt.value === theme && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--color-accent,#5CE5A0)]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
