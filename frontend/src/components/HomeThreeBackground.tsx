'use client';

import TerminalCanvas from '@/components/scene/TerminalCanvas';
import type { CameraInfo, TerminalCameraApi, ClickedObject } from '@/lib/three/types';
import type { RaycastDebugInfo } from '@/components/scene/TerminalModel';

export type HomeThreeBackgroundProps = {
  onCameraApiReady?: (api: TerminalCameraApi | null) => void;
  onCameraChange?: (info: CameraInfo) => void;
  onSelectionChange?: (obj: ClickedObject | null) => void;
  onRaycastDebug?: (info: RaycastDebugInfo | null) => void;
};

export default function HomeThreeBackground({
  onCameraApiReady,
  onCameraChange,
  onSelectionChange,
  onRaycastDebug,
}: HomeThreeBackgroundProps) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden" aria-hidden>
      <TerminalCanvas
        onCameraApiReady={onCameraApiReady}
        onCameraChange={onCameraChange}
        onSelectionChange={onSelectionChange}
        onRaycastDebug={onRaycastDebug}
      />
    </div>
  );
}
