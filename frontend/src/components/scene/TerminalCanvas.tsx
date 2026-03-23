'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Outline } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import * as THREE from 'three';
import TerminalModel from './TerminalModel';
import SceneLighting from './SceneLighting';
import TankLabels from './TankLabels';
import CameraController, { type CameraControllerHandle } from './CameraController';
import type { SceneConfig, CameraInfo, ClickedObject, TerminalCameraApi } from '@/lib/three/types';
import type { RaycastDebugInfo } from './TerminalModel';
import { loadSceneConfig, DEFAULT_CONFIG } from '@/lib/three/types';


interface TerminalCanvasProps {
  onCameraApiReady?: (api: TerminalCameraApi | null) => void;
  onCameraChange?: (info: CameraInfo) => void;
  onSelectionChange?: (obj: ClickedObject | null) => void;
  onRaycastDebug?: (info: RaycastDebugInfo | null) => void;
  statusEffects?: boolean;
  externalSelectedObj?: ClickedObject | null;
}

function SceneContent({ config, onCameraApiReady, onCameraChange, onSelectionChange, onRaycastDebug, statusEffects = true, externalSelectedObj }: { config: SceneConfig } & TerminalCanvasProps) {
  const cameraRef = useRef<CameraControllerHandle>(null);
  const [selectedMesh, setSelectedMesh] = useState<THREE.Object3D | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<THREE.Vector3 | null>(null);
  const [clickedObj, setClickedObj] = useState<ClickedObject | null>(null);
  const [hoveredMesh, setHoveredMesh] = useState<THREE.Mesh | null>(null);

  const handleHover = useCallback((mesh: THREE.Mesh | null) => {
    setHoveredMesh(mesh);
  }, []);

  useEffect(() => {
    if (cameraRef.current) onCameraApiReady?.(cameraRef.current.api);
    return () => onCameraApiReady?.(null);
  }, [onCameraApiReady]);

  const deselect = useCallback(() => {
    setSelectedMesh(null);
    setSelectedTarget(null);
    setClickedObj(null);
  }, []);

  // Sync with parent: when parent clears selection (zoom out, close button), deselect here too
  useEffect(() => {
    if (externalSelectedObj === null && clickedObj !== null) {
      deselect();
    }
  }, [externalSelectedObj, clickedObj, deselect]);

  const handleObjectClick = useCallback((obj: ClickedObject | null, mesh: THREE.Object3D | null) => {
    if (obj && mesh) {
      setSelectedMesh(mesh);
      const box = new THREE.Box3().setFromObject(mesh);
      setSelectedTarget(box.getCenter(new THREE.Vector3()));
      setClickedObj(obj);
      onSelectionChange?.(obj);
    } else {
      deselect();
      onSelectionChange?.(null);
    }
  }, [deselect, onSelectionChange]);

  // Build outline selection — always keep EffectComposer mounted to avoid
  // black-screen on first select (shader compilation lag)
  const outlineSelection: THREE.Mesh[] = [];
  if (selectedMesh) outlineSelection.push(selectedMesh as THREE.Mesh);
  if (hoveredMesh && hoveredMesh !== selectedMesh) outlineSelection.push(hoveredMesh);

  return (
    <>
      <SceneLighting />
      <CameraController ref={cameraRef} config={config} selectedTarget={selectedTarget} onCameraChange={onCameraChange} />

      <TerminalModel selectedMesh={selectedMesh} hoveredMesh={hoveredMesh} onObjectClick={handleObjectClick} onMissed={deselect} onHover={handleHover} onRaycastDebug={onRaycastDebug} statusEffects={statusEffects} />

      <TankLabels selectedOsmId={clickedObj?.name ?? null} />

      <EffectComposer multisampling={2} autoClear={false}>
        <Outline
          selection={outlineSelection}
          visibleEdgeColor={0x5CE5A0}
          hiddenEdgeColor={0x5CE5A0}
          edgeStrength={300}
          width={2000}
          blur
          kernelSize={KernelSize.SMALL}
          xRay={false}
          pulseSpeed={0}
          blendFunction={BlendFunction.ALPHA}
        />
      </EffectComposer>
    </>
  );
}

export default function TerminalCanvas({ onCameraApiReady, onCameraChange, onSelectionChange, onRaycastDebug, statusEffects, externalSelectedObj }: TerminalCanvasProps) {
  const [config, setConfig] = useState<SceneConfig>(DEFAULT_CONFIG);

  useEffect(() => { loadSceneConfig().then(setConfig); }, []);

  return (
    <Canvas
      shadows
      frameloop="always"
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      camera={{ fov: 50, near: 0.1, far: 500 }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent config={config} onCameraApiReady={onCameraApiReady} onCameraChange={onCameraChange} onSelectionChange={onSelectionChange} onRaycastDebug={onRaycastDebug} statusEffects={statusEffects} externalSelectedObj={externalSelectedObj} />
    </Canvas>
  );
}
