'use client';

import { useState, useCallback } from 'react';
import { Box } from '@chakra-ui/react';
import HomeThreeBackground from '@/components/HomeThreeBackground';
import TerminalSceneControls from '@/components/TerminalSceneControls';
import CameraInfoPanel from '@/components/CameraInfoPanel';
import type { TerminalSceneHandle, TerminalCameraApi, CameraInfo } from '@/lib/three/terminalScene';

export default function HomeRouteScene() {
  const [cameraApi, setCameraApi] = useState<TerminalCameraApi | null>(null);
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);

  const onHandleReady = useCallback((handle: TerminalSceneHandle | null) => {
    setCameraApi(handle?.camera ?? null);
    if (handle) {
      handle.onCameraChange(setCameraInfo);
    } else {
      setCameraInfo(null);
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
    </>
  );
}
