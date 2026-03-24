'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bvh } from '@react-three/drei';
import * as THREE from 'three';
import TerminalModel from './TerminalModel';
import SceneLighting from './SceneLighting';
import TankLabels from './TankLabels';
import NativeOutline from './NativeOutline';
import CameraController, { type CameraControllerHandle } from './CameraController';
import type { SceneConfig, ClickedObject, TerminalCameraApi } from '@/lib/three/types';
import { loadSceneConfig, DEFAULT_CONFIG } from '@/lib/three/types';
import { useSceneStore } from '@/lib/sceneStore';


interface TerminalCanvasProps {
  onCameraApiReady?: (api: TerminalCameraApi | null) => void;
}

function SceneContent({ config, onCameraApiReady }: { config: SceneConfig } & TerminalCanvasProps) {
  const cameraRef = useRef<CameraControllerHandle>(null);

  useEffect(() => {
    if (cameraRef.current) onCameraApiReady?.(cameraRef.current.api);
    return () => onCameraApiReady?.(null);
  }, [onCameraApiReady]);

  const handleObjectClick = useCallback((obj: ClickedObject | null) => {
    useSceneStore.getState().select(obj);
  }, []);

  const handleMissed = useCallback(() => {
    useSceneStore.getState().select(null);
  }, []);

  return (
    <>
      <SceneLighting />
      <CameraController ref={cameraRef} config={config} />

      <Suspense fallback={null}>
        <Bvh firstHitOnly>
          <TerminalModel
            onObjectClick={handleObjectClick}
            onMissed={handleMissed}
            onRaycastDebug={(info) => useSceneStore.getState().setRaycastInfo(info)}
          />
        </Bvh>

        <TankLabels />
      </Suspense>

      <NativeOutline />
    </>
  );
}

export default function TerminalCanvas({ onCameraApiReady }: TerminalCanvasProps) {
  const [config, setConfig] = useState<SceneConfig>(DEFAULT_CONFIG);
  const statusEffects = useSceneStore(s => s.statusEffects);

  useEffect(() => { loadSceneConfig().then(setConfig); }, []);

  return (
    <Canvas
      shadows
      frameloop={statusEffects ? "always" : "demand"}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      camera={{ fov: 50, near: 0.1, far: 500 }}
      style={{ width: '100%', height: '100%', background: '#1a1a1a' }}
    >
      <color attach="background" args={['#1a1a1a']} />
      <SceneContent config={config} onCameraApiReady={onCameraApiReady} />
    </Canvas>
  );
}
