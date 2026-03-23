'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { SceneConfig, CameraInfo, TerminalCameraApi } from '@/lib/three/types';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useSceneStore } from '@/lib/sceneStore';

interface CameraControllerProps {
  config: SceneConfig;
  onCameraChange?: (info: CameraInfo) => void;
}

export interface CameraControllerHandle {
  api: TerminalCameraApi;
}

const CameraController = forwardRef<CameraControllerHandle, CameraControllerProps>(
  ({ config, onCameraChange }, ref) => {
    const controlsRef = useRef<OrbitControlsImpl>(null);
    const { camera } = useThree();
    const sc = config.scene;
    const savedState = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
    const animating = useRef(false);
    const animProgress = useRef(0);
    const animFrom = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
    const animTo = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });

    // Read selection from store and derive target
    const selectedObj = useSceneStore(s => s.selectedObj);
    const selectedTarget = useMemo(() => {
      if (!selectedObj?.position) return null;
      return new THREE.Vector3(selectedObj.position.x, selectedObj.position.y, selectedObj.position.z);
    }, [selectedObj]);

    // Set initial camera position
    useEffect(() => {
      const def = sc.camera.default;
      let x: number, y: number, z: number;
      if (def.x !== undefined && def.y !== undefined && def.z !== undefined) {
        x = def.x; y = def.y; z = def.z;
      } else {
        const angle = def.angle * (Math.PI / 180);
        x = sc.target.x + Math.sin(angle) * def.radius;
        y = def.height;
        z = sc.target.z + Math.cos(angle) * def.radius;
      }
      camera.position.set(x, y, z);
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
        const def = sc.camera.default;
        let defaultPos: THREE.Vector3;
        if (def.x !== undefined && def.y !== undefined && def.z !== undefined) {
          defaultPos = new THREE.Vector3(def.x, def.y, def.z);
        } else {
          const angle = def.angle * (Math.PI / 180);
          defaultPos = new THREE.Vector3(
            sc.target.x + Math.sin(angle) * def.radius,
            def.height,
            sc.target.z + Math.cos(angle) * def.radius,
          );
        }
        const defaultTarget = new THREE.Vector3(sc.target.x, sc.target.y, sc.target.z);
        animFrom.current = { pos: camera.position.clone(), target: controlsRef.current.target.clone() };
        animTo.current = { pos: defaultPos, target: defaultTarget };
        animProgress.current = 0;
        animating.current = true;
        savedState.current = null;
      }
    }, [selectedTarget, camera]);

    // Animation + camera info reporting (throttled to avoid re-render loops)
    const lastReported = useRef({ angle: -999, radius: -999, height: -999 });
    const onCameraChangeRef = useRef(onCameraChange);
    onCameraChangeRef.current = onCameraChange;

    useFrame((_, rawDelta) => {
      if (!controlsRef.current) return;

      if (animating.current) {
        // Clamp delta to 33ms (30fps min) to prevent jumps after idle frames
        const delta = Math.min(rawDelta, 0.033);
        animProgress.current = Math.min(1, animProgress.current + delta / 0.6);
        const t = animProgress.current < 0.5
          ? 2 * animProgress.current * animProgress.current
          : 1 - Math.pow(-2 * animProgress.current + 2, 2) / 2;

        camera.position.lerpVectors(animFrom.current.pos, animTo.current.pos, t);
        controlsRef.current.target.lerpVectors(animFrom.current.target, animTo.current.target, t);
        controlsRef.current.update();

        if (animProgress.current >= 1) {
          animating.current = false;
        }
        // Keep requesting frames until animation completes

      }

      // Report camera info only when values change (avoid infinite re-render)
      const cb = onCameraChangeRef.current;
      if (!cb) return;
      const target = controlsRef.current.target;
      const dx = camera.position.x - target.x;
      const dz = camera.position.z - target.z;
      const radius = parseFloat(Math.sqrt(dx * dx + dz * dz).toFixed(1));
      const angle = parseFloat((Math.atan2(dx, dz) * (180 / Math.PI)).toFixed(1));
      const height = parseFloat(camera.position.y.toFixed(1));

      if (angle === lastReported.current.angle && radius === lastReported.current.radius && height === lastReported.current.height) return;
      lastReported.current = { angle, radius, height };

      cb({
        angle,
        radius,
        height,
        x: parseFloat(camera.position.x.toFixed(1)),
        y: parseFloat(camera.position.y.toFixed(1)),
        z: parseFloat(camera.position.z.toFixed(1)),
      });
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
          const def = sc.camera.default;
          if (def.x !== undefined && def.y !== undefined && def.z !== undefined) {
            camera.position.set(def.x, def.y, def.z);
          } else {
            const angle = def.angle * (Math.PI / 180);
            camera.position.set(sc.target.x + Math.sin(angle) * def.radius, def.height, sc.target.z + Math.cos(angle) * def.radius);
          }
          if (controlsRef.current) { controlsRef.current.target.set(sc.target.x, sc.target.y, sc.target.z); controlsRef.current.update(); }
        },
      },
    }), [camera, sc, minDist, maxDist]);

    return (
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        zoomSpeed={sc.camera.zoom?.speed ?? 0.4}
        minDistance={minDist}
        maxDistance={maxDist}
        minPolarAngle={0.3}
        maxPolarAngle={Math.atan2(maxDist, sc.camera.limits.height_min)}
        enablePan={false}
      />
    );
  }
);

CameraController.displayName = 'CameraController';
export default CameraController;
