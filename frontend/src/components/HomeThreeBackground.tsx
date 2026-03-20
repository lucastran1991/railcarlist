'use client';

import TerminalCanvas from '@/components/scene/TerminalCanvas';
import type { CameraInfo, ClickedObject, TerminalCameraApi } from '@/lib/three/types';

export type HomeThreeBackgroundProps = {
  onCameraApiReady?: (api: TerminalCameraApi | null) => void;
  onCameraChange?: (info: CameraInfo) => void;
  onObjectClick?: (obj: ClickedObject | null) => void;
};

export default function HomeThreeBackground({
  onCameraApiReady,
  onCameraChange,
  onObjectClick,
}: HomeThreeBackgroundProps) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden" aria-hidden>
      <TerminalCanvas
        onCameraApiReady={onCameraApiReady}
        onCameraChange={onCameraChange}
        onObjectClick={onObjectClick}
      />
    </div>
  );
}
