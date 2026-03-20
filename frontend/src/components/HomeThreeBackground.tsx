'use client';

import { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import {
  initTerminalScene,
  type TerminalSceneHandle,
} from '@/lib/three/terminalScene';

export type HomeThreeBackgroundProps = {
  onHandleReady?: (handle: TerminalSceneHandle | null) => void;
};

export default function HomeThreeBackground({ onHandleReady }: HomeThreeBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<TerminalSceneHandle | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const h = initTerminalScene(el);
    handleRef.current = h;
    onHandleReady?.(h);
    return () => {
      onHandleReady?.(null);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      ref={containerRef}
      position="absolute"
      inset={0}
      zIndex={0}
      pointerEvents="auto"
      overflow="hidden"
      aria-hidden
    />
  );
}
