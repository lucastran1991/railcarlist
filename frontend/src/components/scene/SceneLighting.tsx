'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { useSceneStore } from '@/lib/sceneStore';

export default function SceneLighting() {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);
  const enableLighting = useSceneStore(s => s.enableLighting);

  return (
    <>
      {/* Exponential fog — natural atmospheric haze */}
      <fogExp2 attach="fog" args={[0xc8d8e8, 0.003]} />

      {enableLighting ? (
        <>
          {/* Main sun light */}
          <directionalLight
            ref={dirLightRef}
            position={[-30, 50, 20]}
            intensity={3.0}
            color={0xfff5e0}
            castShadow={false}
          />
          {/* Hemisphere — sky blue from above, warm ground bounce */}
          <hemisphereLight args={[0x88bbff, 0x886644, 0.8]} />
          {/* Ambient fill — soft overall illumination */}
          <ambientLight intensity={0.3} color={0xddeeff} />
          {/* Rim/back light — subtle edge definition */}
          <directionalLight position={[20, 20, -30]} intensity={0.5} color={0xaaccff} />
        </>
      ) : (
        /* Minimal flat lighting when disabled */
        <ambientLight intensity={1.5} color={0xffffff} />
      )}
    </>
  );
}
