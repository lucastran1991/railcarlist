'use client';

import { useState, useEffect } from 'react';
import {
  Droplets, Gauge, Package, ExternalLink, Loader2, Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchTankByOsmId, isMappedTank, fmtVolume, fmtPercent, levelColor,
  PRODUCT_COLORS, type TankLevelData,
} from '@/lib/tankData';
import type { ClickedObject } from '@/lib/three/types';

function Stat({ icon: Icon, label, value, unit, color }: {
  icon: React.FC<{ size?: number; className?: string; color?: string }>; label: string; value: string; unit?: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={10} className="shrink-0" color={color ?? '#6b7280'} />
      <span className="text-[10px] text-gray-500">{label}</span>
      <span className="text-[10px] font-mono ml-auto text-gray-200">
        {value}{unit && <span className="text-gray-600 ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

function LevelBar({ level, color }: { level: number; color: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, level)}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function ObjectPopupContent({ obj }: { obj: ClickedObject }) {
  const [tank, setTank] = useState<TankLevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const mapped = isMappedTank(obj.name);

  useEffect(() => {
    if (!mapped) { setLoading(false); return; }
    setLoading(true);
    fetchTankByOsmId(obj.name)
      .then(setTank)
      .catch(() => setTank(null))
      .finally(() => setLoading(false));
  }, [obj.name, mapped]);

  // Non-tank building — show simple info
  if (!mapped) {
    return (
      <div className="w-[260px] animate-[popupIn_0.15s_ease-out]" style={{ transform: 'translateY(-100%)' }}>
        <div className="bg-gradient-to-b from-[rgba(18,22,32,0.95)] to-[rgba(12,15,24,0.97)] backdrop-blur-[24px] rounded-xl border border-white/10 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <div className="h-0.5 bg-gradient-to-r from-gray-500 to-gray-600" />
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Building2 size={12} className="text-gray-400" />
              <span className="text-xs font-bold text-white">Building</span>
              <span className="text-[9px] text-gray-600 font-mono ml-auto">{obj.name}</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Structure — no telemetry data</p>
          </div>
        </div>
        <div className="w-0 h-0 mx-auto border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[rgba(12,15,24,0.97)]" />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="w-[300px] animate-[popupIn_0.15s_ease-out]" style={{ transform: 'translateY(-100%)' }}>
        <div className="bg-gradient-to-b from-[rgba(18,22,32,0.95)] to-[rgba(12,15,24,0.97)] backdrop-blur-[24px] rounded-xl border border-white/10 p-4 flex justify-center">
          <Loader2 size={16} className="animate-spin text-gray-400" />
        </div>
        <div className="w-0 h-0 mx-auto border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[rgba(12,15,24,0.97)]" />
      </div>
    );
  }

  if (!tank) {
    return (
      <div className="w-[260px] animate-[popupIn_0.15s_ease-out]" style={{ transform: 'translateY(-100%)' }}>
        <div className="bg-gradient-to-b from-[rgba(18,22,32,0.95)] to-[rgba(12,15,24,0.97)] backdrop-blur-[24px] rounded-xl border border-white/10 p-3">
          <span className="text-[10px] text-gray-400">Tank data unavailable</span>
        </div>
        <div className="w-0 h-0 mx-auto border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[rgba(12,15,24,0.97)]" />
      </div>
    );
  }

  const prodColor = PRODUCT_COLORS[tank.product] ?? '#888';
  const lvlColor = levelColor(tank.level);

  return (
    <div className="w-[340px] animate-[popupIn_0.15s_ease-out]" style={{ transform: 'translateY(-100%)' }}>
      <div className="bg-gradient-to-b from-[rgba(18,22,32,0.95)] to-[rgba(12,15,24,0.97)] backdrop-blur-[24px] rounded-xl border border-white/10 overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        {/* Accent bar — product color */}
        <div className="h-0.5" style={{ background: `linear-gradient(to right, ${prodColor}, ${prodColor}88)` }} />

        <div className="px-3 py-2.5">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-[6px] h-[6px] rounded-full shadow-[0_0_6px]" style={{ backgroundColor: prodColor, boxShadow: `0 0 6px ${prodColor}` }} />
              <span className="text-xs font-bold text-white">{tank.tank}</span>
              <span className="text-[9px] text-gray-600 font-mono">{obj.name}</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: `${prodColor}20`, color: prodColor }}>
              {tank.product}
            </span>
          </div>

          {/* Level bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-500">Level</span>
              <span className="text-xs font-bold" style={{ color: lvlColor }}>{fmtPercent(tank.level)}</span>
            </div>
            <LevelBar level={tank.level} color={lvlColor} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-white/5 pt-2">
            <Stat icon={Droplets} label="Volume" value={fmtVolume(tank.volume)} unit="bbl" color={prodColor} />
            <Stat icon={Package} label="Capacity" value={fmtVolume(tank.capacity)} unit="bbl" />
            <Stat icon={Gauge} label="Available" value={fmtVolume(tank.capacity - tank.volume)} unit="bbl" />
            <Stat icon={Gauge} label="Utilization" value={fmtPercent(tank.level)} color={lvlColor} />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end mt-2 pt-2 border-t border-white/5">
            <button
              onClick={() => { window.location.href = `/tank/${tank.tank}`; }}
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
