'use client';

import {
  ZoomIn, ZoomOut, RotateCcw, RotateCw,
  ChevronUp, ChevronDown, RefreshCw,
} from 'lucide-react';
import type { TerminalCameraApi } from '@/lib/three/types';
import { cn } from '@/lib/utils';

export default function TerminalSceneControls({ cameraApi }: { cameraApi: TerminalCameraApi | null }) {
  const btn = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <button
      aria-label={label}
      disabled={!cameraApi}
      onClick={onClick}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg border border-border text-foreground/70',
        'hover:bg-muted hover:border-[#5CE5A0]/50 hover:text-[#5CE5A0] disabled:opacity-30 disabled:cursor-not-allowed',
        'transition-colors'
      )}
    >
      {icon}
    </button>
  );

  return (
    <div className="hidden sm:block fixed left-3 top-[72px] z-20 w-[200px] p-3 rounded-xl glass border border-border shadow-ntx">
      <p className="text-xs font-bold uppercase tracking-wider mb-3 text-muted-foreground">
        Camera
      </p>
      <div className="flex flex-col gap-2">
        <div className="flex gap-1 justify-center">
          {btn('Zoom in', <ZoomIn size={16} />, () => cameraApi?.zoomIn())}
          {btn('Zoom out', <ZoomOut size={16} />, () => cameraApi?.zoomOut())}
        </div>
        <div className="flex gap-1 justify-center">
          {btn('Rotate left', <RotateCcw size={16} />, () => cameraApi?.rotateLeft())}
          {btn('Rotate right', <RotateCw size={16} />, () => cameraApi?.rotateRight())}
        </div>
        <div className="flex gap-1 justify-center">
          {btn('Tilt up', <ChevronUp size={16} />, () => cameraApi?.tiltUp())}
          {btn('Tilt down', <ChevronDown size={16} />, () => cameraApi?.tiltDown())}
        </div>
        <div className="flex gap-1 justify-center">
          {btn('Reset camera', <RefreshCw size={16} />, () => cameraApi?.reset())}
        </div>
      </div>
    </div>
  );
}
