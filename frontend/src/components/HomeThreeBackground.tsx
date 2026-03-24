'use client';

import dynamic from 'next/dynamic';
import { useSceneStore } from '@/lib/sceneStore';
import type { TerminalCameraApi } from '@/lib/three/types';

const TerminalCanvas = dynamic(
  () => import('@/components/scene/TerminalCanvas'),
  { ssr: false }
);

export type HomeThreeBackgroundProps = {
  onCameraApiReady?: (api: TerminalCameraApi | null) => void;
};

export default function HomeThreeBackground({
  onCameraApiReady,
}: HomeThreeBackgroundProps) {
  const sceneReady = useSceneStore(s => s.sceneReady);

  return (
    <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden" aria-hidden>
      {/* Spinner overlay — visible until scene fully loaded + shaders compiled */}
      {!sceneReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1a1a1a]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-[var(--color-accent,#5CE5A0)] rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Loading 3D scene...</span>
          </div>
        </div>
      )}
      <TerminalCanvas onCameraApiReady={onCameraApiReady} />
    </div>
  );
}
