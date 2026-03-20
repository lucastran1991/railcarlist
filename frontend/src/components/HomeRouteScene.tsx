'use client';

import { useState, useCallback } from 'react';
import HomeThreeBackground from '@/components/HomeThreeBackground';
import TerminalSceneControls from '@/components/TerminalSceneControls';
import CameraInfoPanel from '@/components/CameraInfoPanel';
import ObjectPopup from '@/components/ObjectPopup';
import HomeBottomCharts from '@/components/HomeBottomCharts';
import type { TerminalSceneHandle, TerminalCameraApi, CameraInfo, ClickedObject } from '@/lib/three/terminalScene';

export default function HomeRouteScene() {
  const [cameraApi, setCameraApi] = useState<TerminalCameraApi | null>(null);
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);
  const [clickedObj, setClickedObj] = useState<ClickedObject | null>(null);

  const onHandleReady = useCallback((handle: TerminalSceneHandle | null) => {
    setCameraApi(handle?.camera ?? null);
    if (handle) {
      handle.onCameraChange(setCameraInfo);
      handle.onObjectClick(setClickedObj);
    } else {
      setCameraInfo(null);
      setClickedObj(null);
    }
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-0 pointer-events-auto overflow-hidden" aria-hidden>
        <HomeThreeBackground onHandleReady={onHandleReady} />
      </div>
      <TerminalSceneControls cameraApi={cameraApi} />
      <CameraInfoPanel info={cameraInfo} />
      <ObjectPopup obj={clickedObj} />
      <HomeBottomCharts />
    </>
  );
}
