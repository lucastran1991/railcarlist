'use client';

import dynamic from 'next/dynamic';

const TerminalCanvas = dynamic(
  () => import('@/components/scene/TerminalCanvas'),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-black/90" /> }
);
import type { TerminalCameraApi } from '@/lib/three/types';

export type HomeThreeBackgroundProps = {
  onCameraApiReady?: (api: TerminalCameraApi | null) => void;
};

export default function HomeThreeBackground({
  onCameraApiReady,
}: HomeThreeBackgroundProps) {
  return (
    <div className="absolute inset-0 z-0 pointer-events-auto overflow-hidden" aria-hidden>
      <TerminalCanvas onCameraApiReady={onCameraApiReady} />
    </div>
  );
}
