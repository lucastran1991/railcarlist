'use client';

import type { CameraInfo } from '@/lib/three/types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs text-[#454A5F]">{label}</span>
      <span className="text-xs text-[#F5F5F7] font-mono">{value}</span>
    </div>
  );
}

export default function CameraInfoPanel({ info }: { info: CameraInfo | null }) {
  if (!info) return null;

  return (
    <div className="hidden sm:block fixed right-3 top-16 z-20 w-[180px] p-3 rounded-xl glass border border-[#2C2E39] shadow-[0_4px_32px_rgba(0,0,0,0.8)] pointer-events-auto">
      <p className="text-xs font-bold uppercase tracking-wider mb-2 text-[#454A5F]">
        Camera Info
      </p>
      <div className="flex flex-col gap-1">
        <Row label="Angle" value={`${info.angle}°`} />
        <Row label="Radius" value={`${info.radius}`} />
        <Row label="Height" value={`${info.height}`} />
        <div className="border-t border-[#2C2E39] my-1" />
        <Row label="X" value={`${info.x}`} />
        <Row label="Y" value={`${info.y}`} />
        <Row label="Z" value={`${info.z}`} />
      </div>
    </div>
  );
}
