'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { EffectComposer, Outline } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import * as THREE from 'three';
import TerminalModel from './TerminalModel';
import SceneLighting from './SceneLighting';
import CameraController, { type CameraControllerHandle } from './CameraController';
import ObjectPopupContent from './ObjectPopupContent';
import type { SceneConfig, CameraInfo, ClickedObject, TerminalCameraApi } from '@/lib/three/types';
import { loadSceneConfig, DEFAULT_CONFIG } from '@/lib/three/types';

/** Drei Html popup attached to selected 3D object */
function ObjectPopup3D({ mesh, clickedObj }: { mesh: THREE.Object3D; clickedObj: ClickedObject }) {
  const box = new THREE.Box3().setFromObject(mesh);
  const top: [number, number, number] = [
    (box.min.x + box.max.x) / 2,
    box.max.y + 0.05,
    (box.min.z + box.max.z) / 2,
  ];

  return (
    <Html position={top} center zIndexRange={[30, 0]} style={{ pointerEvents: 'auto' }}>
      <ObjectPopupContent obj={clickedObj} />
    </Html>
  );
}

interface TerminalCanvasProps {
  onCameraApiReady?: (api: TerminalCameraApi | null) => void;
  onCameraChange?: (info: CameraInfo) => void;
}

function SceneContent({ config, onCameraApiReady, onCameraChange }: { config: SceneConfig } & TerminalCanvasProps) {
  const cameraRef = useRef<CameraControllerHandle>(null);
  const [selectedMesh, setSelectedMesh] = useState<THREE.Object3D | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<THREE.Vector3 | null>(null);
  const [clickedObj, setClickedObj] = useState<ClickedObject | null>(null);

  useEffect(() => {
    if (cameraRef.current) onCameraApiReady?.(cameraRef.current.api);
    return () => onCameraApiReady?.(null);
  }, [onCameraApiReady]);

  const deselect = useCallback(() => {
    setSelectedMesh(null);
    setSelectedTarget(null);
    setClickedObj(null);
  }, []);

  const handleObjectClick = useCallback((obj: ClickedObject | null, mesh: THREE.Object3D | null) => {
    if (obj && mesh) {
      setSelectedMesh(mesh);
      const box = new THREE.Box3().setFromObject(mesh);
      setSelectedTarget(box.getCenter(new THREE.Vector3()));
      setClickedObj(obj);
    } else {
      deselect();
    }
  }, [deselect]);

  // Collect selected mesh refs for Outline selection prop
  const selectedMeshRef = useRef<THREE.Mesh[]>([]);
  useEffect(() => {
    selectedMeshRef.current = selectedMesh ? [selectedMesh as THREE.Mesh] : [];
  }, [selectedMesh]);

  return (
    <>
      <SceneLighting />
      <CameraController ref={cameraRef} config={config} selectedTarget={selectedTarget} onCameraChange={onCameraChange} />

      <TerminalModel selectedMesh={selectedMesh} onObjectClick={handleObjectClick} onMissed={deselect} />

      {selectedMesh && clickedObj && <ObjectPopup3D mesh={selectedMesh} clickedObj={clickedObj} />}

      <EffectComposer multisampling={4} autoClear={false}>
        <Outline
          selection={selectedMeshRef.current}
          visibleEdgeColor={0x5CE5A0}
          hiddenEdgeColor={0x5CE5A0}
          edgeStrength={300}
          width={4500}
          blur
          kernelSize={KernelSize.MEDIUM}
          xRay={false}
          pulseSpeed={0}
          blendFunction={BlendFunction.ALPHA}
        />
      </EffectComposer>
    </>
  );
}

export default function TerminalCanvas({ onCameraApiReady, onCameraChange }: TerminalCanvasProps) {
  const [config, setConfig] = useState<SceneConfig>(DEFAULT_CONFIG);

  useEffect(() => { loadSceneConfig().then(setConfig); }, []);

  return (
    <Canvas
      shadows
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      camera={{ fov: 50, near: 0.1, far: 500 }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent config={config} onCameraApiReady={onCameraApiReady} onCameraChange={onCameraChange} />
    </Canvas>
  );
}
