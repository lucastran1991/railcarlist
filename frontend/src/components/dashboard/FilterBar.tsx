'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Calendar, Clock, X } from 'lucide-react';
import type { QueryParams } from '@/lib/api-dashboard';

// --- Types ---

type Frequency = 'daily' | 'monthly' | 'quarterly' | 'yearly';
type TimePreset = 'today' | 'wtd' | 'mtd' | 'ytd' | 'last12m' | 'custom';

interface FilterBarProps {
  onChange: (params: QueryParams) => void;
}

// --- Helpers ---

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Annual' },
];

const TIME_PRESETS: { value: TimePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'wtd', label: 'Week to date' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'last12m', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom' },
];

function getDateRange(preset: TimePreset): { start: string; end: string } | null {
  const now = new Date();
  const end = now.toISOString().slice(0, 19);
  const fmt = (d: Date) => d.toISOString().slice(0, 19);

  switch (preset) {
    case 'today': {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      return { start: fmt(s), end };
    }
    case 'wtd': {
      const s = new Date(now); s.setDate(s.getDate() - s.getDay()); s.setHours(0, 0, 0, 0);
      return { start: fmt(s), end };
    }
    case 'mtd': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: fmt(s), end };
    }
    case 'ytd': {
      const s = new Date(now.getFullYear(), 0, 1);
      return { start: fmt(s), end };
    }
    case 'last12m': {
      const s = new Date(now); s.setMonth(s.getMonth() - 12);
      return { start: fmt(s), end };
    }
    case 'custom':
      return null;
  }
}

function buildParams(frequency: Frequency, timePreset: TimePreset, customFrom: string, customTo: string): QueryParams {
  const p: QueryParams = { aggregate: frequency };
  if (timePreset === 'custom') {
    if (customFrom) p.start = `${customFrom}T00:00:00`;
    if (customTo) p.end = `${customTo}T23:59:59`;
  } else {
    const range = getDateRange(timePreset);
    if (range) {
      p.start = range.start;
      p.end = range.end;
    }
  }
  return p;
}

// --- Dropdown component ---

function Dropdown<T extends string>({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm transition-colors"
      >
        {icon}
        <span className="text-muted-foreground text-xs">{label}:</span>
        <span className="text-foreground font-medium text-xs">{selected?.label}</span>
        <ChevronDown size={12} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-muted ${
                opt.value === value ? 'text-[var(--color-accent)] font-semibold bg-[var(--color-accent)]/5' : 'text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- FilterBar ---

export default function FilterBar({ onChange }: FilterBarProps) {
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [timePreset, setTimePreset] = useState<TimePreset>('mtd');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Use ref to avoid onChange identity causing re-render loops
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Fire on initial mount
  const initialFired = useRef(false);
  useEffect(() => {
    if (!initialFired.current) {
      initialFired.current = true;
      onChangeRef.current(buildParams('daily', 'mtd', '', ''));
    }
  }, []);

  const handleFrequencyChange = useCallback((v: Frequency) => {
    setFrequency(v);
    onChangeRef.current(buildParams(v, timePreset, customFrom, customTo));
  }, [timePreset, customFrom, customTo]);

  const handleTimePresetChange = useCallback((v: TimePreset) => {
    setTimePreset(v);
    onChangeRef.current(buildParams(frequency, v, customFrom, customTo));
  }, [frequency, customFrom, customTo]);

  const handleCustomFromChange = useCallback((val: string) => {
    setCustomFrom(val);
    onChangeRef.current(buildParams(frequency, 'custom', val, customTo));
  }, [frequency, customTo]);

  const handleCustomToChange = useCallback((val: string) => {
    setCustomTo(val);
    onChangeRef.current(buildParams(frequency, 'custom', customFrom, val));
  }, [frequency, customFrom]);

  const handleClearCustom = useCallback(() => {
    setCustomFrom('');
    setCustomTo('');
    onChangeRef.current(buildParams(frequency, 'custom', '', ''));
  }, [frequency]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dropdown
        label="Frequency"
        icon={<Clock size={13} className="text-muted-foreground" />}
        value={frequency}
        options={FREQUENCY_OPTIONS}
        onChange={handleFrequencyChange}
      />

      <Dropdown
        label="Time Range"
        icon={<Calendar size={13} className="text-muted-foreground" />}
        value={timePreset}
        options={TIME_PRESETS}
        onChange={handleTimePresetChange}
      />

      {timePreset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => handleCustomFromChange(e.target.value)}
            className="px-2 py-1 rounded-lg border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => handleCustomToChange(e.target.value)}
            className="px-2 py-1 rounded-lg border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          />
          {(customFrom || customTo) && (
            <button
              onClick={handleClearCustom}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
