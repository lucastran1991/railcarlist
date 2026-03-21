'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneConfig, CameraInfo, TerminalCameraApi } from '@/lib/three/types';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraControllerProps {
  config: SceneConfig;
  selectedTarget: THREE.Vector3 | null;
  onCameraChange?: (info: CameraInfo) => void;
}

export interface CameraControllerHandle {
  api: TerminalCameraApi;
}

const CameraController = forwardRef<CameraControllerHandle, CameraControllerProps>(
  ({ config, selectedTarget, onCameraChange }, ref) => {
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const { camera } = useThree();
    const sc = config.scene;
    const savedState = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
    const animating = useRef(false);
    const animProgress = useRef(0);
    const animFrom = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
    const animTo = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });

    // Set initial camera position
    useEffect(() => {
      const angle = sc.camera.default.angle * (Math.PI / 180);
      const radius = sc.camera.default.radius;
      const height = sc.camera.default.height;
      const x = sc.target.x + Math.sin(angle) * radius;
      const z = sc.target.z + Math.cos(angle) * radius;
      camera.position.set(x, height, z);
      if (controlsRef.current) {
        controlsRef.current.target.set(sc.target.x, sc.target.y, sc.target.z);
        controlsRef.current.update();
      }
    }, [camera, sc]);

    // Animate to selected object
    useEffect(() => {
      if (!controlsRef.current) return;

      if (selectedTarget) {
        // Save current state
        if (!savedState.current) {
          savedState.current = {
            pos: camera.position.clone(),
            target: controlsRef.current.target.clone(),
          };
        }
        // Animate to object
        animFrom.current = { pos: camera.position.clone(), target: controlsRef.current.target.clone() };
        const dir = new THREE.Vector3().subVectors(camera.position, controlsRef.current.target).normalize();
        const newPos = selectedTarget.clone().add(dir.multiplyScalar(15));
        newPos.y = Math.max(selectedTarget.y + 8, 12);
        animTo.current = { pos: newPos, target: selectedTarget.clone() };
        animProgress.current = 0;
        animating.current = true;
      } else if (savedState.current) {
        // Restore to default config position
        const angle = sc.camera.default.angle * (Math.PI / 180);
        const r = sc.camera.default.radius;
        const defaultPos = new THREE.Vector3(
          sc.target.x + Math.sin(angle) * r,
          sc.camera.default.height,
          sc.target.z + Math.cos(angle) * r,
        );
        const defaultTarget = new THREE.Vector3(sc.target.x, sc.target.y, sc.target.z);
        animFrom.current = { pos: camera.position.clone(), target: controlsRef.current.target.clone() };
        animTo.current = { pos: defaultPos, target: defaultTarget };
        animProgress.current = 0;
        animating.current = true;
        savedState.current = null;
      }
    }, [selectedTarget, camera]);

    // Animation + camera info reporting
    useFrame((_, delta) => {
      if (!controlsRef.current) return;

      if (animating.current) {
        animProgress.current = Math.min(1, animProgress.current + delta / 0.6);
        const t = animProgress.current < 0.5
          ? 2 * animProgress.current * animProgress.current
          : 1 - Math.pow(-2 * animProgress.current + 2, 2) / 2;

        camera.position.lerpVectors(animFrom.current.pos, animTo.current.pos, t);
        controlsRef.current.target.lerpVectors(animFrom.current.target, animTo.current.target, t);
        controlsRef.current.update();

        if (animProgress.current >= 1) animating.current = false;
      }

      // Report camera info
      if (onCameraChange) {
        const target = controlsRef.current.target;
        const dx = camera.position.x - target.x;
        const dz = camera.position.z - target.z;
        const radius = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz) * (180 / Math.PI);
        onCameraChange({
          angle: parseFloat(angle.toFixed(1)),
          radius: parseFloat(radius.toFixed(1)),
          height: parseFloat(camera.position.y.toFixed(1)),
          x: parseFloat(camera.position.x.toFixed(1)),
          y: parseFloat(camera.position.y.toFixed(1)),
          z: parseFloat(camera.position.z.toFixed(1)),
        });
      }
    });

    // Camera API
    const zoomStep = 0.9;
    const rotStep = 5 * (Math.PI / 180);
    const tiltStep = 2;
    const minDist = sc.camera.zoom?.min ?? sc.camera.limits.radius_min;
    const maxDist = sc.camera.zoom?.max ?? sc.camera.limits.radius_max;

    useImperativeHandle(ref, () => ({
      api: {
        zoomIn: () => { if (controlsRef.current) { const d = camera.position.distanceTo(controlsRef.current.target); const nd = Math.max(minDist, d * zoomStep); camera.position.lerpVectors(controlsRef.current.target, camera.position, nd / d); } },
        zoomOut: () => { if (controlsRef.current) { const d = camera.position.distanceTo(controlsRef.current.target); const nd = Math.min(maxDist, d / zoomStep); camera.position.lerpVectors(controlsRef.current.target, camera.position, nd / d); } },
        rotateLeft: () => { if (controlsRef.current) { const target = controlsRef.current.target; const offset = camera.position.clone().sub(target); offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotStep); camera.position.copy(target).add(offset); } },
        rotateRight: () => { if (controlsRef.current) { const target = controlsRef.current.target; const offset = camera.position.clone().sub(target); offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotStep); camera.position.copy(target).add(offset); } },
        tiltUp: () => { camera.position.y = Math.min(sc.camera.limits.height_max, camera.position.y + tiltStep); },
        tiltDown: () => { camera.position.y = Math.max(sc.camera.limits.height_min, camera.position.y - tiltStep); },
        reset: () => {
          const angle = sc.camera.default.angle * (Math.PI / 180);
          const r = sc.camera.default.radius;
          camera.position.set(sc.target.x + Math.sin(angle) * r, sc.camera.default.height, sc.target.z + Math.cos(angle) * r);
          if (controlsRef.current) { controlsRef.current.target.set(sc.target.x, sc.target.y, sc.target.z); controlsRef.current.update(); }
        },
      },
    }), [camera, sc, minDist, maxDist]);

    return (
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        minDistance={minDist}
        maxDistance={maxDist}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        enablePan={false}
      />
    );
  }
);

CameraController.displayName = 'CameraController';
export default CameraController;
