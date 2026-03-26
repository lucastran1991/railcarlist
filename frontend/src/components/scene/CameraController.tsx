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

// Pre-allocated vectors to avoid GC pressure in useFrame
const _arcPos = new THREE.Vector3();
const _arcTarget = new THREE.Vector3();
const _camTarget = new THREE.Vector3();

const ARC_DURATION = 0.9; // seconds
const MAX_LIFT = 15;      // max arc height

const CameraController = forwardRef<CameraControllerHandle, CameraControllerProps>(
  ({ config }, ref) => {
    const controlsRef = useRef<CameraControlsImpl>(null);
    const sc = config.scene;
    const selectedObj = useSceneStore(s => s.selectedObj);

    // Arc animation state (refs to avoid re-renders)
    const arcRef = useRef<{
      active: boolean;
      curve: THREE.QuadraticBezierCurve3 | null;
      targetLookAt: THREE.Vector3;
      startLookAt: THREE.Vector3;
      progress: number;
      duration: number;
      safetyTimeout: ReturnType<typeof setTimeout> | null;
    }>({
      active: false,
      curve: null,
      targetLookAt: new THREE.Vector3(),
      startLookAt: new THREE.Vector3(),
      progress: 0,
      duration: ARC_DURATION,
      safetyTimeout: null,
    });

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

    // Start arc animation to selected object, or reset on deselect
    useEffect(() => {
      const c = controlsRef.current;
      if (!c) return;
      const arc = arcRef.current;

      // Cancel any in-progress arc
      if (arc.safetyTimeout) clearTimeout(arc.safetyTimeout);
      arc.active = false;
      arc.progress = 0;

      if (selectedObj?.position) {
        const p = selectedObj.position;
        const targetCamPos = new THREE.Vector3(p.x + 10, Math.max(p.y + 8, 12), p.z + 10);
        const targetLookAt = new THREE.Vector3(p.x, p.y, p.z);

        // Current camera state
        const startPos = c.camera.position.clone();
        const startLookAt = new THREE.Vector3();
        c.getTarget(startLookAt);

        // Subtle arc — slight lift then swoop down to target
        const midPoint = startPos.clone().lerp(targetCamPos, 0.4);
        midPoint.y = startPos.y * 0.95 + 2; // gentle lift + smooth descent

        // Build quadratic bezier curve
        arc.curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, targetCamPos);
        arc.targetLookAt.copy(targetLookAt);
        arc.startLookAt.copy(startLookAt);
        arc.progress = 0;
        arc.duration = ARC_DURATION;
        arc.active = true;

        // Disable user interaction during arc
        c.enabled = false;

        // Safety timeout — re-enable controls even if animation gets stuck
        arc.safetyTimeout = setTimeout(() => {
          if (controlsRef.current) controlsRef.current.enabled = true;
          arc.active = false;
        }, (ARC_DURATION + 0.3) * 1000);

      } else {
        // Deselect — straight line reset (no arc needed)
        c.enabled = true;
        c.reset(true);
      }
    }, [selectedObj]);

    // Arc animation loop + camera info reporting
    const lastReported = useRef({ angle: -999, radius: -999, height: -999 });

    useFrame((_, rawDelta) => {
      const c = controlsRef.current;
      if (!c) return;

      const delta = Math.min(rawDelta, 0.033); // clamp for tab-switch safety
      const arc = arcRef.current;

      // Animate arc if active
      if (arc.active && arc.curve) {
        arc.progress += delta / arc.duration;

        if (arc.progress >= 1) {
          // Animation complete — snap to final position
          arc.progress = 1;
          arc.active = false;

          const finalPos = arc.curve.getPointAt(1);
          c.setLookAt(
            finalPos.x, finalPos.y, finalPos.z,
            arc.targetLookAt.x, arc.targetLookAt.y, arc.targetLookAt.z,
            false
          );
          c.enabled = true;

          if (arc.safetyTimeout) {
            clearTimeout(arc.safetyTimeout);
            arc.safetyTimeout = null;
          }
        } else {
          // Ease-in-out cubic for smooth feel
          const t = arc.progress;
          const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

          // Interpolate position along curve
          arc.curve.getPointAt(eased, _arcPos);

          // Interpolate lookAt from start to target
          _arcTarget.lerpVectors(arc.startLookAt, arc.targetLookAt, eased);

          c.setLookAt(
            _arcPos.x, _arcPos.y, _arcPos.z,
            _arcTarget.x, _arcTarget.y, _arcTarget.z,
            false // no CameraControls internal animation — we drive it
          );
        }
      }

      // Report camera info to store (throttled)
      const pos = c.camera.position;
      c.getTarget(_camTarget);

      const dx = pos.x - _camTarget.x;
      const dz = pos.z - _camTarget.z;
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
