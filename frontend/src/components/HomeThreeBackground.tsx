'use client';

import { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import {
  initHomeThree,
  type HomeThreeHandle,
  type HomeSceneCameraApi,
  type SnowThiccLevel,
  type WindMode,
} from '@/lib/three/homeScene';

export type HomeThreeBackgroundProps = {
  treeCount: number;
  snowThicc: SnowThiccLevel;
  isNight: boolean;
  windMode: WindMode;
  onCameraApiReady?: (api: HomeSceneCameraApi | null) => void;
};

export default function HomeThreeBackground({
  treeCount,
  snowThicc,
  isNight,
  windMode,
  onCameraApiReady,
}: HomeThreeBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HomeThreeHandle | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const h = initHomeThree(el, {
      treeCount,
      snowThicc,
      isNight,
      windMode,
    });
    handleRef.current = h;
    if (h) {
      onCameraApiReady?.({
        cameraZoomIn: () => h.cameraZoomIn(),
        cameraZoomOut: () => h.cameraZoomOut(),
        cameraRotateLeft: () => h.cameraRotateLeft(),
        cameraRotateRight: () => h.cameraRotateRight(),
        cameraReset: () => h.cameraReset(),
      });
    } else {
      onCameraApiReady?.(null);
    }
    return () => {
      onCameraApiReady?.(null);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; updates via setters below
  }, []);

  useEffect(() => {
    handleRef.current?.setTreeCount(treeCount);
  }, [treeCount]);

  useEffect(() => {
    handleRef.current?.setSnowThicc(snowThicc);
  }, [snowThicc]);

  useEffect(() => {
    handleRef.current?.setNightMode(isNight);
  }, [isNight]);

  useEffect(() => {
    handleRef.current?.setWindMode(windMode);
  }, [windMode]);

  return (
    <Box
      ref={containerRef}
      position="absolute"
      inset={0}
      zIndex={0}
      pointerEvents="none"
      overflow="hidden"
      aria-hidden
    />
  );
}
