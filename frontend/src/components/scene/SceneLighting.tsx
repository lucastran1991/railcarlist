'use client';

import { useRef } from 'react';
import * as THREE from 'three';
import { Environment } from '@react-three/drei';

export default function SceneLighting() {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  return (
    <>
      {/* Exponential fog — natural atmospheric haze */}
      <fogExp2 attach="fog" args={[0xc8d8e8, 0.006]} />

      {/* Main sun light with shadows */}
      <directionalLight
        ref={dirLightRef}
        position={[-30, 50, 20]}
        intensity={3.0}
        color={0xfff5e0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={150}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      {/* Hemisphere — sky blue from above, warm ground bounce */}
      <hemisphereLight args={[0x88bbff, 0x886644, 0.8]} />

      {/* Ambient fill — soft overall illumination */}
      <ambientLight intensity={0.3} color={0xddeeff} />

      {/* Rim/back light — subtle edge definition */}
      <directionalLight position={[20, 20, -30]} intensity={0.5} color={0xaaccff} />

      {/* Self-hosted HDRI — background sky with clouds + PBR reflections */}
      <Environment
        files="/hdri/sunflowers_puresky_1k.exr"
        background
        backgroundBlurriness={0}
        backgroundRotation={[0.15, Math.PI, 0]}
        environmentIntensity={0.8}
      />
    </>
  );
}
