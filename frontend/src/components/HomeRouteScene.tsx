'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import HomeThreeBackground from '@/components/HomeThreeBackground';
import ScenePanel from '@/components/ScenePanel';
import TankDetailPanel from '@/components/TankDetailPanel';
import HomeBottomCharts from '@/components/HomeBottomCharts';
import type { TerminalCameraApi } from '@/lib/three/types';

export default function HomeRouteScene() {
  const [cameraApi, setCameraApi] = useState<TerminalCameraApi | null>(null);
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const onCameraApiReady = useCallback((api: TerminalCameraApi | null) => setCameraApi(api), []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { mousePos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-auto overflow-hidden" aria-hidden>
        <HomeThreeBackground onCameraApiReady={onCameraApiReady} />
      </div>
      <ScenePanel cameraApi={cameraApi} mousePos={mousePos} />
      <TankDetailPanel />
      <HomeBottomCharts />
    </>
  );
}
