'use client';

import { useEffect, useRef } from 'react';
import {
  initTerminalScene,
  loadSceneConfig,
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
    let disposed = false;

    loadSceneConfig().then((cfg) => {
      if (disposed) return;
      const h = initTerminalScene(el, cfg);
      handleRef.current = h;
      onHandleReady?.(h);
    });

    return () => {
      disposed = true;
      onHandleReady?.(null);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 pointer-events-auto overflow-hidden"
      aria-hidden
    />
  );
}
