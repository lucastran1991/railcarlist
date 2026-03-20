'use client';

import TerminalCanvas from '@/components/scene/TerminalCanvas';
import type { CameraInfo, TerminalCameraApi } from '@/lib/three/types';

export type HomeThreeBackgroundProps = {
  onCameraApiReady?: (api: TerminalCameraApi | null) => void;
  onCameraChange?: (info: CameraInfo) => void;
};

export default function HomeThreeBackground({
  onCameraApiReady,
  onCameraChange,
}: HomeThreeBackgroundProps) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden" aria-hidden>
      <TerminalCanvas
        onCameraApiReady={onCameraApiReady}
        onCameraChange={onCameraChange}
      />
    </div>
  );
}
