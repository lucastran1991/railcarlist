'use client';

import { useState, useCallback } from 'react';
import HomeThreeBackground from '@/components/HomeThreeBackground';
import TerminalSceneControls from '@/components/TerminalSceneControls';
import CameraInfoPanel from '@/components/CameraInfoPanel';
import HomeBottomCharts from '@/components/HomeBottomCharts';
import type { TerminalCameraApi, CameraInfo, ClickedObject } from '@/lib/three/types';

export default function HomeRouteScene() {
  const [cameraApi, setCameraApi] = useState<TerminalCameraApi | null>(null);
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);

  const onCameraApiReady = useCallback((api: TerminalCameraApi | null) => setCameraApi(api), []);
  const onCameraChange = useCallback((info: CameraInfo) => setCameraInfo(info), []);

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-auto overflow-hidden" aria-hidden>
        <HomeThreeBackground
          onCameraApiReady={onCameraApiReady}
          onCameraChange={onCameraChange}
        />
      </div>
      <TerminalSceneControls cameraApi={cameraApi} />
      <CameraInfoPanel info={cameraInfo} />
      <HomeBottomCharts />
    </>
  );
}
