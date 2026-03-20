'use client';

import { useRef, useMemo, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Select } from '@react-three/postprocessing';
import type { ClickedObject } from '@/lib/three/types';

// PBR materials
const tankMat = new THREE.MeshPhysicalMaterial({
  color: 0xdddddd, roughness: 0.25, metalness: 0.8,
  clearcoat: 0.3, clearcoatRoughness: 0.2, envMapIntensity: 1.0,
});
const buildingMat = new THREE.MeshPhysicalMaterial({
  color: 0xaabbcc, roughness: 0.5, metalness: 0.1, envMapIntensity: 0.5,
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
  matrix: THREE.Matrix4;
  verts: number;
  castShadow: boolean;
  receiveShadow: boolean;
  clickable: boolean;
}

interface TerminalModelProps {
  selectedMesh: THREE.Object3D | null;
  onObjectClick: (obj: ClickedObject | null, mesh: THREE.Object3D | null) => void;
  onMissed?: () => void;
}

export default function TerminalModel({ selectedMesh, onObjectClick, onMissed }: TerminalModelProps) {
  const { scene } = useGLTF('/models/terminal.glb');

  // Extract all meshes with their world transforms, pre-apply model centering/scaling
  const { meshes, groundMeshes } = useMemo(() => {
    const clone = scene.clone(true);

    const cube = clone.getObjectByName('Cube');
    if (cube) cube.removeFromParent();

    // Compute scale and offset
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxSpan = Math.max(size.x, size.z);
    const scale = 80 / maxSpan;

    clone.scale.setScalar(scale);
    clone.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(clone);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

    // Offset matrix
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

      const entry: ProcessedMesh = {
        name,
        geometry: obj.geometry,
        material: isGround ? (obj.material as THREE.Material) : (verts >= 70 ? tankMat.clone() : buildingMat.clone()),
        matrix: worldMatrix,
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

  const handleMeshClick = useCallback((e: ThreeEvent<MouseEvent>, entry: ProcessedMesh) => {
    e.stopPropagation();
    if (!entry.clickable) { onMissed?.(); return; }

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
    onMissed?.();
  }, [onMissed]);

  const selectedName = useMemo(() => {
    if (!selectedMesh) return null;
    return (selectedMesh as THREE.Mesh).name || selectedMesh.parent?.name || null;
  }, [selectedMesh]);

  return (
    <group>
      {/* Ground / satellite meshes — not selectable */}
      {groundMeshes.map((entry, i) => (
        <mesh
          key={`ground-${i}`}
          geometry={entry.geometry}
          material={entry.material}
          matrixAutoUpdate={false}
          matrix={entry.matrix}
          receiveShadow
          onClick={handleGroundClick}
        />
      ))}

      {/* Clickable buildings/tanks — wrapped in <Select> for postprocessing outline */}
      {meshes.map((entry, i) => {
        const isSelected = selectedName === entry.name;
        return (
          <Select key={`mesh-${i}`} enabled={isSelected}>
            <mesh
              name={entry.name}
              geometry={entry.geometry}
              material={entry.material}
              matrixAutoUpdate={false}
              matrix={entry.matrix}
              castShadow={entry.castShadow}
              receiveShadow={entry.receiveShadow}
              onClick={(e) => handleMeshClick(e, entry)}
            />
          </Select>
        );
      })}
    </group>
  );
}

useGLTF.preload('/models/terminal.glb');
