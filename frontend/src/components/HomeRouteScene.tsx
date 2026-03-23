'use client';

import { useState, useCallback, useEffect } from 'react';
import HomeThreeBackground from '@/components/HomeThreeBackground';
import ScenePanel from '@/components/ScenePanel';
import TankDetailPanel from '@/components/TankDetailPanel';
import HomeBottomCharts from '@/components/HomeBottomCharts';
import type { TerminalCameraApi, CameraInfo, ClickedObject } from '@/lib/three/types';
import type { RaycastDebugInfo } from '@/components/scene/TerminalModel';

export default function HomeRouteScene() {
  const [cameraApi, setCameraApi] = useState<TerminalCameraApi | null>(null);
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);
  const [selectedObj, setSelectedObj] = useState<ClickedObject | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [raycastInfo, setRaycastInfo] = useState<RaycastDebugInfo | null>(null);

  const onCameraApiReady = useCallback((api: TerminalCameraApi | null) => setCameraApi(api), []);
  const onCameraChange = useCallback((info: CameraInfo) => setCameraInfo(info), []);
  const onSelectionChange = useCallback((obj: ClickedObject | null) => setSelectedObj(obj), []);
  const onRaycastDebug = useCallback((info: RaycastDebugInfo | null) => setRaycastInfo(info), []);

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-auto overflow-hidden" aria-hidden>
        <HomeThreeBackground
          onCameraApiReady={onCameraApiReady}
          onCameraChange={onCameraChange}
          onSelectionChange={onSelectionChange}
          onRaycastDebug={onRaycastDebug}
        />
      </div>
      <ScenePanel
        cameraApi={cameraApi}
        cameraInfo={cameraInfo}
        mousePos={mousePos}
        selectedObj={selectedObj}
        raycastInfo={raycastInfo}
      />
      <TankDetailPanel selectedObj={selectedObj} onClose={() => setSelectedObj(null)} />
      <HomeBottomCharts />
    </>
  );
}
