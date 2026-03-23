'use client';

import dynamic from 'next/dynamic';

const TerminalCanvas = dynamic(
  () => import('@/components/scene/TerminalCanvas'),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-black/90" /> }
);
import type { CameraInfo, TerminalCameraApi, ClickedObject } from '@/lib/three/types';
import type { RaycastDebugInfo } from '@/components/scene/TerminalModel';

export type HomeThreeBackgroundProps = {
  onCameraApiReady?: (api: TerminalCameraApi | null) => void;
  onCameraChange?: (info: CameraInfo) => void;
  onSelectionChange?: (obj: ClickedObject | null) => void;
  onRaycastDebug?: (info: RaycastDebugInfo | null) => void;
  statusEffects?: boolean;
  selectedObj?: ClickedObject | null;
};

export default function HomeThreeBackground({
  onCameraApiReady,
  onCameraChange,
  onSelectionChange,
  onRaycastDebug,
  statusEffects,
  selectedObj,
}: HomeThreeBackgroundProps) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden" aria-hidden>
      <TerminalCanvas
        onCameraApiReady={onCameraApiReady}
        onCameraChange={onCameraChange}
        onSelectionChange={onSelectionChange}
        onRaycastDebug={onRaycastDebug}
        statusEffects={statusEffects}
        externalSelectedObj={selectedObj}
      />
    </div>
  );
}
