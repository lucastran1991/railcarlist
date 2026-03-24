'use client';

import { useState } from 'react';
import {
  ZoomIn, ZoomOut, RotateCcw, RotateCw,
  ChevronUp, ChevronDown, RefreshCw,
  PanelLeftClose, PanelLeftOpen, Activity,
} from 'lucide-react';
import type { TerminalCameraApi } from '@/lib/three/types';
import { osmToTankId } from '@/lib/tankData';
import { cn } from '@/lib/utils';
import { useSceneStore } from '@/lib/sceneStore';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[10px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-[10px] text-foreground font-mono truncate">{value}</span>
    </div>
  );
}

interface ScenePanelProps {
  cameraApi: TerminalCameraApi | null;
  mousePos: React.RefObject<{ x: number; y: number }>;
}

export default function ScenePanel({ cameraApi, mousePos }: ScenePanelProps) {
  const [expanded, setExpanded] = useState(false);

  const cameraInfo = useSceneStore(s => s.cameraInfo);
  const selectedObj = useSceneStore(s => s.selectedObj);
  const raycastInfo = useSceneStore(s => s.raycastInfo);
  const statusEffects = useSceneStore(s => s.statusEffects);
  const toggleStatusEffects = useSceneStore(s => s.toggleStatusEffects);

  const btn = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <button
      aria-label={label}
      disabled={!cameraApi}
      onClick={onClick}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-md border border-border/30 text-muted-foreground',
        'hover:bg-muted/50 hover:border-[var(--color-accent,#5CE5A0)]/50 hover:text-[var(--color-accent,#5CE5A0)]',
        'disabled:opacity-20 disabled:cursor-not-allowed transition-colors'
      )}
    >
      {icon}
    </button>
  );

  const tankId = selectedObj ? osmToTankId(selectedObj.name) : null;
  const mouse = mousePos.current;

  return (
    <div className="hidden sm:block fixed left-3 top-[72px] z-20">
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl dropdown-surface border border-border/30 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Expand panel"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {expanded && (
        <div className="w-[200px] rounded-xl dropdown-surface border border-border/30 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Scene Controls</p>
            <button
              onClick={() => setExpanded(false)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              aria-label="Collapse panel"
            >
              <PanelLeftClose size={13} />
            </button>
          </div>

          <div className="px-3 pb-2">
            <div className="flex gap-1 justify-center flex-wrap">
              {btn('Zoom in', <ZoomIn size={14} />, () => cameraApi?.zoomIn())}
              {btn('Zoom out', <ZoomOut size={14} />, () => cameraApi?.zoomOut())}
              {btn('Rotate left', <RotateCcw size={14} />, () => cameraApi?.rotateLeft())}
              {btn('Rotate right', <RotateCw size={14} />, () => cameraApi?.rotateRight())}
              {btn('Tilt up', <ChevronUp size={14} />, () => cameraApi?.tiltUp())}
              {btn('Tilt down', <ChevronDown size={14} />, () => cameraApi?.tiltDown())}
              {btn('Reset', <RefreshCw size={14} />, () => cameraApi?.reset())}
            </div>
          </div>

          <div className="border-t border-border/20" />

          <div className="px-3 py-2">
            <button
              onClick={toggleStatusEffects}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                statusEffects
                  ? 'bg-[var(--color-accent,#5CE5A0)]/15 text-[var(--color-accent,#5CE5A0)] border border-[var(--color-accent,#5CE5A0)]/30'
                  : 'bg-muted/30 text-muted-foreground border border-border/20 hover:bg-muted/50'
              )}
            >
              <Activity size={13} />
              <span>Status Effects</span>
              <span className={cn(
                'ml-auto text-[9px] font-bold uppercase',
                statusEffects ? 'text-[var(--color-accent,#5CE5A0)]' : 'text-muted-foreground/50'
              )}>
                {statusEffects ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          <div className="border-t border-border/20" />

          {cameraInfo && (
            <div className="px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Camera</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                <Row label="Angle" value={`${cameraInfo.angle}°`} />
                <Row label="Radius" value={`${cameraInfo.radius}`} />
                <Row label="Height" value={`${cameraInfo.height}`} />
                <Row label="X" value={`${cameraInfo.x}`} />
                <Row label="Y" value={`${cameraInfo.y}`} />
                <Row label="Z" value={`${cameraInfo.z}`} />
              </div>
            </div>
          )}

          <div className="border-t border-border/20" />

          <div className="px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Pointer</p>
            <div className="flex flex-col gap-0.5">
              <Row label="Screen" value={`${mouse?.x ?? 0}, ${mouse?.y ?? 0}`} />
              {raycastInfo ? (
                <>
                  <Row label="Target" value={raycastInfo.nearestTankId || raycastInfo.nearestName} />
                  <Row label="Type" value={raycastInfo.nearestType} />
                  <Row label="Dist" value={`${raycastInfo.nearestDist}`} />
                  <Row label="Hits" value={`${raycastInfo.totalIntersections}`} />
                </>
              ) : (
                <Row label="Target" value="—" />
              )}
            </div>
          </div>

          <div className="border-t border-border/20" />

          <div className="px-3 py-2 pb-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Selected</p>
            <div className="flex flex-col gap-0.5">
              {selectedObj ? (
                <>
                  <Row label="OSM" value={selectedObj.name} />
                  {tankId && <Row label="Tank" value={tankId} />}
                  <Row label="Type" value={selectedObj.type} />
                  <Row label="Pos" value={`${selectedObj.position.x}, ${selectedObj.position.y}, ${selectedObj.position.z}`} />
                </>
              ) : (
                <Row label="Status" value="None" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
