'use client';

import {
  CheckCircle, ArrowDown, ArrowUp, PauseCircle,
  Flame, AlertTriangle, AlertOctagon, Wrench,
} from 'lucide-react';
import { useSceneStore } from '@/lib/sceneStore';
import { TANK_STATUS_CONFIG, type TankStatus } from '@/lib/tankData';

const ICONS: Record<string, React.ReactNode> = {
  'check-circle': <CheckCircle size={10} />,
  'arrow-down': <ArrowDown size={10} />,
  'arrow-up': <ArrowUp size={10} />,
  'pause-circle': <PauseCircle size={10} />,
  'flame': <Flame size={10} />,
  'alert-triangle': <AlertTriangle size={10} />,
  'alert-octagon': <AlertOctagon size={10} />,
  'wrench': <Wrench size={10} />,
};

const PARTICLE_STATUSES = new Set(['heating', 'critical', 'receiving', 'discharging', 'warning']);
const PULSE_STATUSES = new Set(['warning', 'critical', 'heating', 'receiving', 'discharging']);

export default function StatusLegend() {
  const statusEffects = useSceneStore(s => s.statusEffects);

  if (!statusEffects) return null;

  return (
    <div className="fixed top-[52px] left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
      <div className="flex items-center gap-3 px-4 py-2 rounded-b-xl border border-t-0 border-border/30 bg-[hsl(var(--background)/0.85)] backdrop-blur-md shadow-lg">
        {(Object.entries(TANK_STATUS_CONFIG) as [TankStatus, typeof TANK_STATUS_CONFIG[TankStatus]][]).map(([key, cfg]) => {
          const hasPulse = PULSE_STATUSES.has(key);
          const hasParticle = PARTICLE_STATUSES.has(key);
          const hasGear = key === 'maintenance';
          return (
            <div key={key} className="flex items-center gap-1" title={`${cfg.label}${hasParticle ? ' (particles)' : ''}${hasGear ? ' (gear)' : ''}${hasPulse ? ' (pulse glow)' : ''}`}>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: cfg.color, boxShadow: hasPulse ? `0 0 5px ${cfg.color}` : 'none' }}
              />
              <span style={{ color: cfg.color }} className="shrink-0">{ICONS[cfg.icon]}</span>
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">{cfg.label}</span>
              {hasParticle && <span className="text-[8px] text-muted-foreground/40">✦</span>}
              {hasGear && <span className="text-[8px] text-muted-foreground/40">⚙</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
