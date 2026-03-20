'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { Environment } from '@react-three/drei';

export default function SceneLighting() {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  return (
    <>
      {/* Main directional with shadows */}
      <directionalLight
        ref={dirLightRef}
        position={[-20, 40, 15]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={120}
        shadow-bias={-0.001}
        shadow-normalBias={0.02}
      />

      {/* Hemisphere ambient */}
      <hemisphereLight args={[0x88bbff, 0x556633, 1.0]} />

      {/* Fill light */}
      <directionalLight position={[15, 15, 20]} intensity={0.6} color={0xaaccff} />

      {/* Environment map for reflections */}
      <Environment preset="city" background={false} />
    </>
  );
}
