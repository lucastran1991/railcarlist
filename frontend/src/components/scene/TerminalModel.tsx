'use client';

import { useMemo, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, useCursor } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import type { ClickedObject } from '@/lib/three/types';
import { osmToTankId } from '@/lib/tankData';

// PBR materials (StandardMaterial — no clearcoat overhead)
const tankMat = new THREE.MeshStandardMaterial({
  color: 0xdddddd, roughness: 0.3, metalness: 0.7, envMapIntensity: 1.0,
});
const buildingMat = new THREE.MeshStandardMaterial({
  color: 0xaabbcc, roughness: 0.6, metalness: 0.1, envMapIntensity: 0.5,
});

function isClickableNode(name: string, verts: number): boolean {
  if (name.includes('GOOGLE_SAT') || name.includes('EXPORT_GOOGLE')) return false;
  if (name === 'Cube') return false;
  return verts > 4;
}

function getObjectType(verts: number): 'tank' | 'building' {
  return verts >= 70 ? 'tank' : 'building';
}

interface ProcessedMesh {
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  position: [number, number, number];
  rotation: [number, number, number, string];
  scale: [number, number, number];
  verts: number;
  castShadow: boolean;
  receiveShadow: boolean;
  clickable: boolean;
}

export interface RaycastDebugInfo {
  nearestName: string;
  nearestTankId: string;
  nearestType: string;
  nearestDist: number;
  totalIntersections: number;
}

interface TerminalModelProps {
  selectedMesh: THREE.Object3D | null;
  hoveredMesh: THREE.Mesh | null;
  onObjectClick: (obj: ClickedObject | null, mesh: THREE.Object3D | null) => void;
  onMissed?: () => void;
  onHover?: (mesh: THREE.Mesh | null) => void;
  onRaycastDebug?: (info: RaycastDebugInfo | null) => void;
}

export default function TerminalModel({ selectedMesh, hoveredMesh, onObjectClick, onMissed, onHover, onRaycastDebug }: TerminalModelProps) {
  const { scene } = useGLTF('/models/terminal.glb');

  // Cursor: pointer when hovering clickable object
  useCursor(!!hoveredMesh, 'pointer', 'default');

  // Extract all meshes with their world transforms, pre-apply model centering/scaling
  const { meshes, groundMeshes } = useMemo(() => {
    const clone = scene.clone(true);

    const cube = clone.getObjectByName('Cube');
    if (cube) cube.removeFromParent();

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxSpan = Math.max(size.x, size.z);
    const scale = 80 / maxSpan;

    clone.scale.setScalar(scale);
    clone.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(clone);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

    const offsetMatrix = new THREE.Matrix4().makeTranslation(-scaledCenter.x, 0, -scaledCenter.z);

    const meshes: ProcessedMesh[] = [];
    const groundMeshes: ProcessedMesh[] = [];

    clone.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const name = obj.name || obj.parent?.name || '';
      if (name === 'Cube') return;

      const worldMatrix = new THREE.Matrix4().multiplyMatrices(offsetMatrix, obj.matrixWorld);
      const verts = obj.geometry?.attributes?.position?.count || 0;
      const isGround = name.includes('GOOGLE_SAT') || name.includes('EXPORT_GOOGLE');

      // Decompose matrix into position/rotation/scale for proper raycasting
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      worldMatrix.decompose(pos, quat, scl);
      const euler = new THREE.Euler().setFromQuaternion(quat);

      const entry: ProcessedMesh = {
        name,
        geometry: obj.geometry,
        material: isGround ? (obj.material as THREE.Material) : (verts >= 70 ? tankMat.clone() : buildingMat.clone()),
        position: [pos.x, pos.y, pos.z],
        rotation: [euler.x, euler.y, euler.z, euler.order],
        scale: [scl.x, scl.y, scl.z],
        verts,
        castShadow: !isGround,
        receiveShadow: true,
        clickable: isClickableNode(name, verts),
      };

      if (isGround) groundMeshes.push(entry);
      else meshes.push(entry);
    });

    return { meshes, groundMeshes };
  }, [scene]);

  // Track nearest clickable on pointer move for debug panel
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!onRaycastDebug) return;
    const clickable = e.intersections.filter(i => {
      const n = i.object.name || i.object.parent?.name || '';
      const v = (i.object as THREE.Mesh).geometry?.attributes?.position?.count || 0;
      return isClickableNode(n, v);
    });
    if (clickable.length > 0) {
      const nearest = clickable[0];
      const n = nearest.object.name || nearest.object.parent?.name || '';
      const v = (nearest.object as THREE.Mesh).geometry?.attributes?.position?.count || 0;
      onRaycastDebug({
        nearestName: n,
        nearestTankId: osmToTankId(n) || 'N/A',
        nearestType: getObjectType(v),
        nearestDist: parseFloat(nearest.distance.toFixed(2)),
        totalIntersections: clickable.length,
      });
    } else {
      onRaycastDebug(null);
    }
  }, [onRaycastDebug]);

  const handleMeshClick = useCallback((e: ThreeEvent<MouseEvent>, entry: ProcessedMesh) => {
    // stopPropagation prevents this click from reaching meshes behind
    e.stopPropagation();
    if (!entry.clickable) { onMissed?.(); return; }

    // Trust R3F's event target — e.object is the mesh the user clicked on.
    // Don't second-guess with e.intersections (that caused wrong-tank-select
    // when raycast distance differed from visual foreground order).
    const mesh = e.object as THREE.Mesh;
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());

    onObjectClick({
      name: entry.name,
      type: getObjectType(entry.verts),
      verts: entry.verts,
      position: { x: parseFloat(center.x.toFixed(1)), y: parseFloat(center.y.toFixed(1)), z: parseFloat(center.z.toFixed(1)) },
      screenX: 0,
      screenY: 0,
    }, mesh);
  }, [onObjectClick, onMissed]);

  const handleGroundClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    console.log('[DESELECT] ground click, calling onMissed');
    onHover?.(null);
    onMissed?.();
  }, [onMissed, onHover]);

  // Debounced hover: onPointerOut sets a 50ms timer to clear.
  // If onPointerOver fires on the same mesh before timeout, cancel the clear.
  // This eliminates BVH phantom out→over flicker on the same object.
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoveredNameRef = useRef<string | null>(null);

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>, entry: ProcessedMesh) => {
    e.stopPropagation();
    if (!entry.clickable) return;
    const mesh = e.object as THREE.Mesh;
    // Cancel pending clear if re-entering same or new mesh
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    hoveredNameRef.current = entry.name;
    onHover?.(mesh);
  }, [onHover]);

  const handlePointerOut = useCallback(() => {
    // Delay clear by 50ms — if pointer re-enters same mesh, the Over cancels this
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      hoveredNameRef.current = null;
      onHover?.(null);
      hoverTimerRef.current = null;
    }, 50);
  }, [onHover]);

  return (
    <group onPointerMove={handlePointerMove}>
        {groundMeshes.map((entry, i) => (
          <mesh
            key={`ground-${i}`}
            geometry={entry.geometry}
            material={entry.material}
            position={entry.position}
            rotation={[entry.rotation[0], entry.rotation[1], entry.rotation[2], entry.rotation[3] as THREE.EulerOrder]}
            scale={entry.scale}
            receiveShadow
            onClick={handleGroundClick}
          />
        ))}

        {meshes.map((entry, i) => (
          <mesh
            key={`mesh-${i}`}
            name={entry.name}
            geometry={entry.geometry}
            material={entry.material}
            position={entry.position}
            rotation={[entry.rotation[0], entry.rotation[1], entry.rotation[2], entry.rotation[3] as THREE.EulerOrder]}
            scale={entry.scale}
            castShadow={entry.castShadow}
            receiveShadow={entry.receiveShadow}
            onClick={(e) => handleMeshClick(e, entry)}
          />
        ))}
    </group>
  );
}

useGLTF.preload('/models/terminal.glb');
