'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Droplets, Gauge, Package, ExternalLink, Loader2, Building2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchTankByOsmId, isMappedTank, fmtVolume, fmtPercent, levelColor,
  PRODUCT_COLORS, osmToTankId, type TankLevelData,
} from '@/lib/tankData';
import { useSceneStore } from '@/lib/sceneStore';

function Stat({ icon: Icon, label, value, unit, color }: {
  icon: React.FC<{ size?: number; className?: string; color?: string }>; label: string; value: string; unit?: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={11} className="shrink-0" color={color ?? '#6b7280'} />
      <span className="text-[10px] text-white/50">{label}</span>
      <span className="text-xs text-white font-mono font-semibold ml-auto">{value}</span>
      {unit && <span className="text-[9px] text-white/40">{unit}</span>}
    </div>
  );
}

// Hide panel when camera zooms out beyond this distance
const ZOOM_OUT_THRESHOLD = 40;

export default function TankDetailPanel() {
  const selectedObj = useSceneStore(s => s.selectedObj);
  const cameraRadius = useSceneStore(s => s.cameraInfo?.radius);
  const deselect = useSceneStore(s => s.select);

  const [tank, setTank] = useState<TankLevelData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedObj) { setTank(null); return; }
    if (!isMappedTank(selectedObj.name)) { setTank(null); return; }
    setLoading(true);
    fetchTankByOsmId(selectedObj.name)
      .then(setTank)
      .catch(() => setTank(null))
      .finally(() => setLoading(false));
  }, [selectedObj]);

  // Auto-close when user zooms out — use ref to track threshold crossing
  const wasOverThreshold = useRef(false);
  useEffect(() => {
    if (cameraRadius && cameraRadius > ZOOM_OUT_THRESHOLD && !wasOverThreshold.current) {
      wasOverThreshold.current = true;
      deselect(null);
    } else if (cameraRadius && cameraRadius <= ZOOM_OUT_THRESHOLD) {
      wasOverThreshold.current = false;
    }
  }, [cameraRadius, deselect]);

  if (!selectedObj) return null;

  const tankId = osmToTankId(selectedObj.name);
  const mapped = isMappedTank(selectedObj.name);

  return (
    <div className="hidden sm:block fixed right-3 top-[72px] z-20 w-[260px] rounded-xl bg-black/75 backdrop-blur-sm border border-white/10 shadow-lg overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            tank ? 'bg-[var(--color-accent,#5CE5A0)]' : 'bg-white/30'
          )} />
          <span className="text-sm font-bold text-white">{tankId || selectedObj.name}</span>
          <span className="text-[10px] text-white/30 font-mono">{selectedObj.name}</span>
        </div>
        <button
          onClick={() => deselect(null)}
          className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Product badge */}
      {tank && (
        <div className="px-4 pb-2">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: (PRODUCT_COLORS[tank.product] ?? '#888') + '20',
              color: PRODUCT_COLORS[tank.product] ?? '#888',
            }}
          >
            {tank.product}
          </span>
        </div>
      )}

      <div className="border-t border-white/10" />

      {/* Content */}
      <div className="px-4 py-3">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={16} className="animate-spin text-white/40" />
          </div>
        )}

        {!loading && !mapped && (
          <div className="flex items-center gap-2 py-2">
            <Building2 size={14} className="text-white/30" />
            <span className="text-xs text-white/50">Building — no telemetry</span>
          </div>
        )}

        {!loading && mapped && !tank && (
          <span className="text-xs text-white/50">No data available</span>
        )}

        {!loading && tank && (
          <div className="flex flex-col gap-3">
            {/* Level bar */}
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-white/50">Level</span>
                <span className="text-sm font-bold" style={{ color: levelColor(tank.level) }}>
                  {fmtPercent(tank.level)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, tank.level)}%`,
                    backgroundColor: levelColor(tank.level),
                  }}
                />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 gap-1.5">
              <Stat icon={Droplets} label="Volume" value={fmtVolume(tank.volume)} unit="bbl" color={PRODUCT_COLORS[tank.product]} />
              <Stat icon={Package} label="Capacity" value={fmtVolume(tank.capacity)} unit="bbl" />
              <Stat icon={Gauge} label="Available" value={fmtVolume(tank.capacity - tank.volume)} unit="bbl" />
              <Stat icon={Gauge} label="Utilization" value={fmtPercent(tank.level)} />
            </div>

            {/* Details button */}
            <a
              href={`/tank/${tankId}`}
              className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[var(--color-accent,#5CE5A0)]/30 text-[var(--color-accent,#5CE5A0)] text-xs font-medium hover:bg-[var(--color-accent,#5CE5A0)]/10 transition-colors"
            >
              <ExternalLink size={12} />
              Details
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
