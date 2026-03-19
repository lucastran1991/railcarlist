'use client';

import { useState } from 'react';
import { Box } from '@chakra-ui/react';
import HomeThreeBackground from '@/components/HomeThreeBackground';
import HomeSceneControls from '@/components/HomeSceneControls';
import type {
  HomeSceneCameraApi,
  SnowThiccLevel,
  WindMode,
} from '@/lib/three/homeScene';

/**
 * Renders only on "/". Unmounting disposes WebGL so other routes are unaffected.
 */
export default function HomeRouteScene() {
  const [treeCount, setTreeCount] = useState(6);
  const [snowThicc, setSnowThicc] = useState<SnowThiccLevel>(2);
  const [isNight, setIsNight] = useState(true);
  const [windMode, setWindMode] = useState<WindMode>('breezy');
  const [cameraApi, setCameraApi] = useState<HomeSceneCameraApi | null>(null);

  return (
    <>
      <Box
        position="fixed"
        top="64px"
        left={0}
        right={0}
        bottom={0}
        zIndex={0}
        pointerEvents="none"
        overflow="hidden"
        aria-hidden
      >
        <HomeThreeBackground
          treeCount={treeCount}
          snowThicc={snowThicc}
          isNight={isNight}
          windMode={windMode}
          onCameraApiReady={setCameraApi}
        />
      </Box>
      <HomeSceneControls
        treeCount={treeCount}
        onTreeCountChange={setTreeCount}
        snowThicc={snowThicc}
        onSnowThiccChange={setSnowThicc}
        isNight={isNight}
        onNightModeChange={setIsNight}
        windMode={windMode}
        onWindModeChange={setWindMode}
        cameraApi={cameraApi}
      />
    </>
  );
}
