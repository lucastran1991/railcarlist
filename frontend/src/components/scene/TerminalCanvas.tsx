'use client';

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import TerminalModel from './TerminalModel';
import SceneLighting from './SceneLighting';
import GradientSky from './GradientSky';
import CameraController, { type CameraControllerHandle } from './CameraController';
import type { SceneConfig, CameraInfo, ClickedObject, TerminalCameraApi } from '@/lib/three/types';
import { loadSceneConfig, DEFAULT_CONFIG } from '@/lib/three/types';

/** Reprojects a 3D point to screen coordinates each frame */
function PopupProjector({
  target,
  clickedObj,
  onUpdate,
}: {
  target: THREE.Object3D | null;
  clickedObj: ClickedObject | null;
  onUpdate: (obj: ClickedObject) => void;
}) {
  const { camera, gl } = useThree();

  useFrame(() => {
    if (!target || !clickedObj) return;
    const box = new THREE.Box3().setFromObject(target);
    const top = new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2);
    const projected = top.clone().project(camera);
    const rect = gl.domElement.getBoundingClientRect();
    const sx = ((projected.x + 1) / 2) * rect.width + rect.left;
    const sy = ((-projected.y + 1) / 2) * rect.height + rect.top;

    if (Math.round(sx) !== clickedObj.screenX || Math.round(sy) !== clickedObj.screenY) {
      onUpdate({ ...clickedObj, screenX: Math.round(sx), screenY: Math.round(sy) });
    }
  });

  return null;
}

interface TerminalCanvasProps {
  onCameraApiReady?: (api: TerminalCameraApi | null) => void;
  onCameraChange?: (info: CameraInfo) => void;
  onObjectClick?: (obj: ClickedObject | null) => void;
}

function SceneContent({
  config,
  onCameraApiReady,
  onCameraChange,
  onObjectClick,
}: TerminalCanvasProps & { config: SceneConfig }) {
  const cameraRef = useRef<CameraControllerHandle>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedMesh, setSelectedMesh] = useState<THREE.Object3D | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<THREE.Vector3 | null>(null);
  const [clickedObj, setClickedObj] = useState<ClickedObject | null>(null);

  // Expose camera API
  useEffect(() => {
    if (cameraRef.current) onCameraApiReady?.(cameraRef.current.api);
    return () => onCameraApiReady?.(null);
  }, [onCameraApiReady]);

  const handleObjectClick = useCallback((obj: ClickedObject | null, mesh: THREE.Object3D | null) => {
    if (obj && mesh) {
      setSelectedName(obj.name);
      setSelectedMesh(mesh);
      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      setSelectedTarget(center);
      setClickedObj(obj);
      onObjectClick?.(obj);
    } else {
      setSelectedName(null);
      setSelectedMesh(null);
      setSelectedTarget(null);
      setClickedObj(null);
      onObjectClick?.(null);
    }
  }, [onObjectClick]);

  const handlePopupUpdate = useCallback((obj: ClickedObject) => {
    setClickedObj(obj);
    onObjectClick?.(obj);
  }, [onObjectClick]);

  return (
    <>
      <GradientSky />
      <SceneLighting />
      <fog attach="fog" args={[0x99bbdd, 50, 200]} />
      <CameraController
        ref={cameraRef}
        config={config}
        selectedTarget={selectedTarget}
        onCameraChange={onCameraChange}
      />
      <TerminalModel
        selectedName={selectedName}
        onObjectClick={handleObjectClick}
      />
      <PopupProjector
        target={selectedMesh}
        clickedObj={clickedObj}
        onUpdate={handlePopupUpdate}
      />
    </>
  );
}

export default function TerminalCanvas({ onCameraApiReady, onCameraChange, onObjectClick }: TerminalCanvasProps) {
  const [config, setConfig] = useState<SceneConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    loadSceneConfig().then(setConfig);
  }, []);

  return (
    <Canvas
      shadows
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
      }}
      camera={{ fov: 50, near: 0.1, far: 200 }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent
        config={config}
        onCameraApiReady={onCameraApiReady}
        onCameraChange={onCameraChange}
        onObjectClick={onObjectClick}
      />
    </Canvas>
  );
}
