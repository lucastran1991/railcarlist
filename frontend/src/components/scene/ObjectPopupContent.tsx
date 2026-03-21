'use client';

import { useMemo } from 'react';
import {
  Thermometer, Activity, Zap, Wind, Droplets, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockBoilerData, fmtNum, MODES } from '@/lib/boilerData';
import type { ClickedObject } from '@/lib/three/types';

function Stat({ icon: Icon, label, value, unit, accent }: {
  icon: React.FC<{ size?: number; className?: string }>; label: string; value: string; unit?: string; accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={10} className={cn('shrink-0', accent ? 'text-orange-300' : 'text-gray-500')} />
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className={cn('text-[10px] font-mono ml-auto', accent ? 'text-orange-200 font-semibold' : 'text-gray-200')}>
        {value}{unit && <span className="text-gray-600 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

export default function ObjectPopupContent({ obj }: { obj: ClickedObject }) {
  const boiler = useMemo(() => mockBoilerData(obj.name), [obj.name]);
  const modeInfo = MODES[boiler.boilerMode] ?? MODES[0];
  const isActive = boiler.boilerMode === 1;

  return (
    <div
      className="w-[380px] animate-[popupIn_0.15s_ease-out]"
      style={{ transform: 'translateY(-100%)' }}
    >
      <div className="bg-gradient-to-b from-[rgba(18,22,32,0.95)] to-[rgba(12,15,24,0.97)] backdrop-blur-[24px] rounded-xl border border-white/10 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        {/* Accent bar */}
        <div className={cn('h-0.5', isActive
          ? 'bg-gradient-to-r from-green-500 via-teal-500 to-blue-500'
          : 'bg-gradient-to-r from-yellow-500 to-orange-500'
        )} />

        <div className="px-3 py-2.5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={cn('w-[6px] h-[6px] rounded-full', isActive ? 'bg-green-400 shadow-[0_0_6px_rgba(72,187,120,0.7)]' : 'bg-gray-500')} />
              <span className="text-xs font-bold text-white">{boiler.boilerId}</span>
              <span className="text-[9px] text-gray-600 font-mono">{obj.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-medium', obj.type === 'tank' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-orange-500/20 text-orange-400')}>
                {obj.type.toUpperCase()}
              </span>
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-medium', modeInfo.cls)}>
                {modeInfo.label}
              </span>
            </div>
          </div>

          {/* Two-column stats grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-white/5 pt-2">
            <Stat icon={Thermometer} label="PSI" value={fmtNum(boiler.currentPSI, 0)} unit="psi" accent={isActive} />
            <Stat icon={Zap} label="Firing" value={fmtNum(boiler.firingRate, 1)} unit="%" accent={isActive && boiler.firingRate > 50} />
            <Stat icon={Activity} label="Req" value={fmtNum(boiler.requestPSI, 0)} unit="psi" />
            <Stat icon={Wind} label="Steam" value={fmtNum(boiler.steamProduced, 1)} unit="lb/hr" />
            <Stat icon={Zap} label="Set" value={fmtNum(boiler.setpointPSI, 0)} unit="psi" />
            <Stat icon={Droplets} label="Gas" value={fmtNum(boiler.gasConsumed)} unit="cf" />
          </div>

          {/* Footer: diagnostic + details */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
            {boiler.diagnosticCode !== '0' ? (
              <div className="flex items-center gap-1">
                <AlertTriangle size={10} className="text-yellow-400" />
                <span className="text-[9px] text-yellow-400">Diag: {boiler.diagnosticCode}</span>
              </div>
            ) : (
              <div />
            )}
            <button
              onClick={() => { window.location.href = `/boiler/${obj.name}`; }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#5CE5A0]/20 text-[#5CE5A0] text-[10px] font-medium hover:bg-[#5CE5A0]/30 transition-colors"
            >
              <ExternalLink size={10} />
              Details
            </button>
          </div>
        </div>
      </div>
      {/* Arrow */}
      <div className="w-0 h-0 mx-auto border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[rgba(12,15,24,0.97)]" />
    </div>
  );
}
