'use client';

import { useState, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import HomeThreeBackground from '@/components/HomeThreeBackground';
import TerminalSceneControls from '@/components/TerminalSceneControls';
import CameraInfoPanel from '@/components/CameraInfoPanel';
import ObjectPopup from '@/components/ObjectPopup';
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
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        zIndex={0}
        pointerEvents="auto"
        overflow="hidden"
        aria-hidden
      >
        <HomeThreeBackground onHandleReady={onHandleReady} />
      </Box>
      <TerminalSceneControls cameraApi={cameraApi} />
      <CameraInfoPanel info={cameraInfo} />
      <ObjectPopup obj={clickedObj} />
    </>
  );
}
