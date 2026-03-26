'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { CameraControls as CameraControlsDrei } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import type { SceneConfig, TerminalCameraApi } from '@/lib/three/types';
import { useSceneStore } from '@/lib/sceneStore';

interface CameraControllerProps {
  config: SceneConfig;
}

export interface CameraControllerHandle {
  api: TerminalCameraApi;
}

const CameraController = forwardRef<CameraControllerHandle, CameraControllerProps>(
  ({ config }, ref) => {
    const controlsRef = useRef<CameraControlsImpl>(null);
    const sc = config.scene;
    const selectedObj = useSceneStore(s => s.selectedObj);

    // Limits
    const minDist = sc.camera.zoom?.min ?? sc.camera.limits.radius_min;
    const maxDist = sc.camera.zoom?.max ?? sc.camera.limits.radius_max;

    // Calculate default position
    const defaultPos = useMemo(() => {
      const def = sc.camera.default;
      if (def.x !== undefined && def.y !== undefined && def.z !== undefined) {
        return new THREE.Vector3(def.x, def.y, def.z);
      }
      const angle = def.angle * (Math.PI / 180);
      return new THREE.Vector3(
        sc.target.x + Math.sin(angle) * def.radius,
        def.height,
        sc.target.z + Math.cos(angle) * def.radius,
      );
    }, [sc]);

    const defaultTarget = useMemo(
      () => new THREE.Vector3(sc.target.x, sc.target.y, sc.target.z),
      [sc]
    );

    // Set initial position once controls are ready
    useEffect(() => {
      const c = controlsRef.current;
      if (!c) return;
      c.setLookAt(
        defaultPos.x, defaultPos.y, defaultPos.z,
        defaultTarget.x, defaultTarget.y, defaultTarget.z,
        false // no animation for initial setup
      );
      c.saveState(); // save as reset position
    }, [defaultPos, defaultTarget]);

    // Animate to selected object or reset
    useEffect(() => {
      const c = controlsRef.current;
      if (!c) return;

      if (selectedObj?.position) {
        const p = selectedObj.position;
        // Fly to a position offset from the object, respecting zoom limits
        const zoomDist = Math.max(minDist + 2, 7); // slightly above minDist
        const camPos = new THREE.Vector3(
          p.x + zoomDist * 0.7,
          Math.max(p.y + zoomDist * 0.6, minDist),
          p.z + zoomDist * 0.7
        );
        c.setLookAt(camPos.x, camPos.y, camPos.z, p.x, p.y, p.z, true);
      } else {
        // Reset to default
        c.reset(true);
      }
    }, [selectedObj]);

    // Report camera info to store (throttled)
    const lastReported = useRef({ angle: -999, radius: -999, height: -999 });

    useFrame(() => {
      const c = controlsRef.current;
      if (!c) return;

      const pos = c.camera.position;
      const target = new THREE.Vector3();
      c.getTarget(target);

      const dx = pos.x - target.x;
      const dz = pos.z - target.z;
      const radius = parseFloat(Math.sqrt(dx * dx + dz * dz).toFixed(1));
      const angle = parseFloat((Math.atan2(dx, dz) * (180 / Math.PI)).toFixed(1));
      const height = parseFloat(pos.y.toFixed(1));

      if (angle === lastReported.current.angle &&
          radius === lastReported.current.radius &&
          height === lastReported.current.height) return;

      lastReported.current = { angle, radius, height };
      useSceneStore.getState().setCameraInfo({
        angle, radius, height,
        x: parseFloat(pos.x.toFixed(1)),
        y: parseFloat(pos.y.toFixed(1)),
        z: parseFloat(pos.z.toFixed(1)),
      });
    });

    // Camera API for ScenePanel buttons
    useImperativeHandle(ref, () => ({
      api: {
        zoomIn: () => controlsRef.current?.dolly(3, true),
        zoomOut: () => controlsRef.current?.dolly(-3, true),
        rotateLeft: () => controlsRef.current?.rotate(Math.PI / 12, 0, true),
        rotateRight: () => controlsRef.current?.rotate(-Math.PI / 12, 0, true),
        tiltUp: () => controlsRef.current?.rotate(0, -Math.PI / 24, true),
        tiltDown: () => controlsRef.current?.rotate(0, Math.PI / 24, true),
        reset: () => controlsRef.current?.reset(true),
      },
    }), []);

    return (
      <CameraControlsDrei
        ref={controlsRef}
        makeDefault
        smoothTime={0.25}
        draggingSmoothTime={0.125}
        minDistance={minDist}
        maxDistance={maxDist}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.2}
        dollySpeed={sc.camera.zoom?.speed ?? 0.4}
      />
    );
  }
);

CameraController.displayName = 'CameraController';
export default CameraController;
