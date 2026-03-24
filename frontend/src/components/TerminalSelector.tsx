'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTerminalStore } from '@/lib/terminalStore';

export default function TerminalSelector() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { terminals, activeTerminal, setActiveTerminal } = useTerminalStore();

  // Mark mounted to avoid SSR hydration mismatch
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Avoid hydration mismatch — render default until mounted
  const display = mounted ? activeTerminal : terminals[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 h-7 rounded-md border border-border/50 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-sm">{display.flag}</span>
        <span className="text-[12px] font-semibold text-foreground truncate max-w-[120px] sm:max-w-[160px]">{display.name}</span>
        <ChevronDown size={11} className={cn('text-foreground/40 transition-transform shrink-0', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute left-0 mt-3 w-[280px] dropdown-surface border border-border/50 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
          <div className="px-3 py-2 border-b border-border/50">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Select Terminal</p>
          </div>
          <div className="py-1 max-h-[320px] overflow-y-auto">
            {terminals.map((t) => (
              <button
                key={t.id}
                onClick={() => { setActiveTerminal(t.id); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left',
                  t.id === activeTerminal.id && 'bg-muted/30'
                )}
              >
                <span className="text-lg">{t.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-foreground">{t.name}</span>
                    {t.id === activeTerminal.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent,#5CE5A0)]" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="text-muted-foreground/60" />
                    <span className="text-[11px] text-muted-foreground">{t.location}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[11px] font-medium text-foreground/70">{t.tankCount} tanks</div>
                  <div className="text-[10px] text-muted-foreground">{t.capacity}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
