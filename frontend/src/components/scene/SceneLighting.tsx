'use client';

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '@/lib/sceneStore';
import { useTerminalStore } from '@/lib/terminalStore';

// Per-terminal sun positions based on satellite shadow analysis
// Google imagery captured ~10AM-2PM: shadows point away from sun
const TERMINAL_LIGHTING: Record<string, { sun: [number, number, number]; rim: [number, number, number] }> = {
  // Savannah (32°N) — sun from south-southeast, shadows NNW
  'savannah':    { sun: [35, 50, 25],  rim: [-30, 15, -20] },
  // Los Angeles (33°N) — similar latitude, sun from SSE
  'los-angeles': { sun: [35, 50, 25],  rim: [-30, 15, -20] },
  // Tarragona (41°N) — higher latitude, sun more southerly + lower angle
  'tarragona':   { sun: [20, 45, 40],  rim: [-25, 15, -30] },
};

export default function SceneLighting() {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const enableLighting = useSceneStore(s => s.enableLighting);
  const activeTerminalId = useTerminalStore(s => s.activeTerminalId);

  const lighting = useMemo(() => {
    return TERMINAL_LIGHTING[activeTerminalId] || TERMINAL_LIGHTING['savannah'];
  }, [activeTerminalId]);

  return (
    <>
      {/* Exponential fog — fade distant objects into background color */}
      <fogExp2 attach="fog" args={[0x3a3a3a, 0.012]} />

      {enableLighting ? (
        <>
          {/* Main sun light — positioned to match satellite shadow direction */}
          <directionalLight
            ref={dirLightRef}
            position={lighting.sun}
            intensity={3.0}
            color={0xfff5e0}
            castShadow={false}
          />
          {/* Hemisphere — sky blue from above, warm ground bounce */}
          <hemisphereLight args={[0x88bbff, 0x886644, 0.8]} />
          {/* Ambient fill — soft overall illumination */}
          <ambientLight intensity={0.3} color={0xddeeff} />
          {/* Rim/back light — opposite of sun for edge definition */}
          <directionalLight position={lighting.rim} intensity={0.5} color={0xaaccff} />
        </>
      ) : (
        /* Minimal flat lighting when disabled */
        <ambientLight intensity={1.5} color={0xffffff} />
      )}
    </>
  );
}
