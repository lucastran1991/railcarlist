'use client';

import type { CameraInfo } from '@/lib/three/terminalScene';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs text-white font-mono">{value}</span>
    </div>
  );
}

export default function CameraInfoPanel({ info }: { info: CameraInfo | null }) {
  if (!info) return null;

  return (
    <div className="fixed right-3 top-16 z-20 w-[180px] p-3 rounded-lg bg-black/50 backdrop-blur-[10px] border border-white/10 shadow-md pointer-events-auto">
      <p className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">
        Camera Info
      </p>
      <div className="flex flex-col gap-1">
        <Row label="Angle" value={`${info.angle}°`} />
        <Row label="Radius" value={`${info.radius}`} />
        <Row label="Height" value={`${info.height}`} />
        <div className="border-t border-white/10 my-1" />
        <Row label="X" value={`${info.x}`} />
        <Row label="Y" value={`${info.y}`} />
        <Row label="Z" value={`${info.z}`} />
      </div>
    </div>
  );
}
