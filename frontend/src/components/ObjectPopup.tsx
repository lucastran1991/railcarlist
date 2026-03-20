'use client';

import { useMemo } from 'react';
import {
  Thermometer, Activity, Zap, Wind, Droplets, AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClickedObject } from '@/lib/three/terminalScene';

interface BoilerData {
  boilerId: string;
  boilerMode: number;
  currentPSI: number;
  requestPSI: number;
  setpointPSI: number;
  firingRate: number;
  flameLevel: number;
  gasConsumed: number;
  steamProduced: number;
  diagnosticCode: string;
}

const MODES: Record<number, { label: string; cls: string }> = {
  0: { label: 'OFF', cls: 'bg-gray-500/20 text-gray-400' },
  1: { label: 'ACTIVE', cls: 'bg-green-500/20 text-green-400' },
  2: { label: 'STANDBY', cls: 'bg-yellow-500/20 text-yellow-400' },
  3: { label: 'ERROR', cls: 'bg-red-500/20 text-red-400' },
};

function mockBoilerData(name: string): BoilerData {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  const h = Math.abs(hash);
  const mode = h % 3 === 0 ? 1 : 2;
  const isActive = mode === 1;
  return {
    boilerId: `Boiler-${name.slice(-4)}`,
    boilerMode: mode,
    currentPSI: isActive ? 80 + (h % 50) : 0,
    requestPSI: 85 + (h % 10),
    setpointPSI: isActive ? 120 + (h % 15) : 0,
    firingRate: isActive ? 40 + (h % 55) : 0,
    flameLevel: isActive ? 1 + (h % 3) : 0,
    gasConsumed: 1e6 + (h % 9) * 2.3e7,
    steamProduced: isActive ? 100 + (h % 200) : 0,
    diagnosticCode: isActive ? '0' : String(h % 64),
  };
}

function fmtNum(n: number, d = 1): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return n.toFixed(d);
}

function Row({ icon: Icon, label, value, unit, accent }: {
  icon: React.ElementType; label: string; value: string; unit?: string; accent?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-3">
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon size={12} className={cn('shrink-0', accent ? 'text-orange-300' : 'text-gray-500')} />
        <span className="text-xs text-gray-400 whitespace-nowrap">{label}</span>
      </div>
      <span className={cn('text-xs font-mono whitespace-nowrap', accent ? 'text-orange-200 font-semibold' : 'text-gray-100')}>
        {value}
        {unit && <span className="text-gray-500 text-[10px] ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

export default function ObjectPopup({ obj }: { obj: ClickedObject | null }) {
  const boiler = useMemo(() => (obj ? mockBoilerData(obj.name) : null), [obj]);
  if (!obj || !boiler) return null;

  const modeInfo = MODES[boiler.boilerMode] ?? MODES[0];
  const isActive = boiler.boilerMode === 1;

  return (
    <div
      className="fixed z-30 pointer-events-none min-w-[260px] max-w-[300px] animate-[popupIn_0.2s_ease-out]"
      style={{
        left: `clamp(150px, ${obj.screenX}px, calc(100vw - 150px))`,
        top: `clamp(240px, ${obj.screenY}px, calc(100vh - 20px))`,
        transform: 'translate(-50%, -100%) translateY(-14px)',
      }}
    >
      <div className="bg-gradient-to-b from-[rgba(18,22,32,0.95)] to-[rgba(12,15,24,0.97)] backdrop-blur-[24px] rounded-xl border border-white/10 overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.04)_inset,0_0_20px_rgba(255,106,0,0.08)]">
        {/* Accent bar */}
        <div className={cn('h-0.5', isActive
          ? 'bg-gradient-to-r from-green-500 via-teal-500 to-blue-500'
          : 'bg-gradient-to-r from-yellow-500 to-orange-500'
        )} />

        <div className="px-4 py-3">
          <div className="flex flex-col gap-2.5">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className={cn('w-[7px] h-[7px] rounded-full', isActive ? 'bg-green-400 shadow-[0_0_8px_rgba(72,187,120,0.7)]' : 'bg-gray-500')} />
                <div>
                  <p className="text-sm font-bold text-white tracking-wide">{boiler.boilerId}</p>
                  <p className="text-[10px] text-gray-600 font-mono">{obj.name}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium', obj.type === 'tank' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-orange-500/20 text-orange-400')}>
                  {obj.type.toUpperCase()}
                </span>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium', modeInfo.cls)}>
                  {modeInfo.label}
                </span>
              </div>
            </div>

            <div className="border-t border-white/5" />

            <Row icon={Thermometer} label="Current" value={fmtNum(boiler.currentPSI, 0)} unit="psi" accent={isActive} />
            <Row icon={Activity} label="Request" value={fmtNum(boiler.requestPSI, 0)} unit="psi" />
            <Row icon={Zap} label="Setpoint" value={fmtNum(boiler.setpointPSI, 0)} unit="psi" />

            <div className="border-t border-white/5" />

            <Row icon={Zap} label="Firing" value={fmtNum(boiler.firingRate, 1)} unit="%" accent={isActive && boiler.firingRate > 50} />
            <Row icon={Wind} label="Steam" value={fmtNum(boiler.steamProduced, 1)} unit="lb/hr" />
            <Row icon={Droplets} label="Gas" value={fmtNum(boiler.gasConsumed)} unit="cf" />

            {boiler.diagnosticCode !== '0' && (
              <>
                <div className="border-t border-white/5" />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-yellow-400" />
                    <span className="text-[10px] text-yellow-400 font-medium">Diagnostic</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-yellow-500/30 text-yellow-400">
                    {boiler.diagnosticCode}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Arrow */}
      <div className="w-0 h-0 mx-auto border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[rgba(12,15,24,0.97)]" />
    </div>
  );
}
